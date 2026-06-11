import { NgTemplateOutlet } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { CloudCatalogCacheService } from '../../core/services/cloud-catalog-cache.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { ToastService } from '../../core/services/toast.service'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { CloudLaunchInfraPreviewComponent } from './cloud-launch-infra-preview.component'
import { CloudLaunchProgressComponent, type CloudLaunchProgressState } from './cloud-launch-progress.component'
import {
  cloudLaunchOptions,
  type CloudLaunchStepId,
} from './cloud-launch-options.util'
import { cloudLaunchTheme } from './cloud-launch-theme.util'
import type { CloudProvider } from '../../core/models/api.models'
import type { CloudSlug } from './cloud-provider.data'

export type CloudLaunchDialogData = {
  accountId: string
  accountName: string
  provider: CloudProvider
  slug: CloudSlug
  defaultRegion?: string
  preselectedImageId?: string
}

type CloudImageRow = {
  id: string
  name: string
  os?: string
  architecture?: string
  status?: string
}

type CatalogRow = { id: string; name: string; vcpus?: number; memoryGb?: number; pricePerHour?: number }

const parseTagsRecord = (raw: string): Record<string, string> | undefined => {
  const parts = raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  if (!parts.length) return undefined
  const out: Record<string, string> = {}
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq > 0) out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
    else out[part] = part
  }
  return Object.keys(out).length ? out : undefined
}

@Component({
  selector: 'app-cloud-launch-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    BrandLogoComponent,
    CloudLaunchProgressComponent,
    CloudLaunchInfraPreviewComponent,
    LoadingStateComponent,
  ],
  templateUrl: './cloud-launch-dialog.component.html',
  styleUrl: './cloud-launch-dialog.component.scss',
})
export class CloudLaunchDialogComponent implements OnInit, OnDestroy {
  readonly data = inject<CloudLaunchDialogData>(MAT_DIALOG_DATA)
  readonly dialogRef = inject(MatDialogRef<CloudLaunchDialogComponent>)
  private readonly fb = inject(FormBuilder)
  private readonly accounts = inject(CloudAccountsService)
  private readonly catalogCache = inject(CloudCatalogCacheService)
  private readonly toast = inject(ToastService)
  private readonly realtime = inject(RealtimeService)

  readonly launching = signal(false)
  readonly catalogLoading = signal(true)
  readonly launchProgress = signal<CloudLaunchProgressState | null>(null)
  readonly activeStep = signal<CloudLaunchStepId>('image')
  readonly imageSearch = signal('')
  readonly imageOsTab = signal<'all' | 'amazon' | 'ubuntu' | 'windows' | 'redhat'>('all')
  readonly regions = signal<{ id: string; name: string }[]>([])
  readonly images = signal<CloudImageRow[]>([])
  readonly types = signal<CatalogRow[]>([])
  readonly networks = signal<{ id: string; name: string; type?: string }[]>([])
  readonly securityGroups = signal<{ id: string; name: string }[]>([])

  readonly theme = computed(() => cloudLaunchTheme(this.data.slug))
  readonly options = computed(() => cloudLaunchOptions(this.data.slug, this.form.value.region ?? ''))
  readonly stepIndex = computed(() => this.options().steps.findIndex((s) => s.id === this.activeStep()))
  readonly progressPct = computed(() => {
    const steps = this.options().steps.length
    return steps ? Math.round(((this.stepIndex() + 1) / steps) * 100) : 0
  })

  readonly imageOsTabs = computed(() => {
    if (this.data.slug !== 'aws') return []
    return [
      { id: 'all' as const, label: 'Todas' },
      { id: 'amazon' as const, label: 'Amazon Linux' },
      { id: 'ubuntu' as const, label: 'Ubuntu' },
      { id: 'windows' as const, label: 'Windows' },
      { id: 'redhat' as const, label: 'Red Hat' },
    ]
  })

  readonly filteredImages = computed(() => {
    const q = this.imageSearch().trim().toLowerCase()
    const tab = this.imageOsTab()
    let list = this.images()
    if (tab !== 'all') {
      list = list.filter((i) => {
        const name = i.name.toLowerCase()
        const os = (i.os ?? '').toLowerCase()
        if (tab === 'amazon') return name.includes('amazon linux') || name.includes('al2') || name.includes('al2023')
        if (tab === 'ubuntu') return name.includes('ubuntu') || os.includes('ubuntu')
        if (tab === 'windows') return os.includes('windows') || name.includes('windows')
        if (tab === 'redhat') return name.includes('red hat') || name.includes('rhel') || name.includes('rocky') || name.includes('alma')
        return true
      })
    }
    if (!q) return list
    return list.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.os ?? '').toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q),
    )
  })

  selectImageOsTab = (tab: 'all' | 'amazon' | 'ubuntu' | 'windows' | 'redhat'): void => {
    this.imageOsTab.set(tab)
  }

  readonly selectedImage = computed(() => this.images().find((i) => i.id === this.form.value.imageId))

  readonly reviewRows = computed(() => {
    const v = this.form.getRawValue()
    const rl = this.options().reviewLabels
    const yesNo = this.data.slug === 'aws' || this.data.slug === 'azure' ? 'Yes' : 'Sí'
    const noLabel = this.data.slug === 'aws' || this.data.slug === 'azure' ? 'No' : 'No'
    const monOn = this.data.slug === 'aws' ? 'Enabled' : this.data.slug === 'azure' ? 'Enabled' : 'Activada'
    const monOff = this.data.slug === 'aws' ? 'Disabled' : this.data.slug === 'azure' ? 'Disabled' : 'Desactivada'

    const rows = [
      { label: rl.name, value: v.name || '—', mono: false },
      { label: rl.image, value: this.selectedImage()?.name ?? v.imageId ?? '—', mono: false },
      { label: rl.type, value: v.instanceType || '—', mono: true },
      { label: rl.region, value: v.region || '—', mono: false },
      { label: rl.zone, value: v.availabilityZone || '—', mono: false },
      { label: rl.subnet, value: this.networkLabel(), mono: false },
      { label: this.theme().sgLabel, value: this.sgLabel(), mono: false },
      { label: rl.publicIp, value: v.publicIp ? yesNo : noLabel, mono: false },
      { label: rl.keyPair, value: v.keyPair || '—', mono: false },
      { label: rl.disk, value: `${v.diskGb ?? '—'} GB · ${v.diskType ?? '—'}`, mono: false },
      { label: rl.monitoring, value: v.monitoring ? monOn : monOff, mono: false },
    ]
    if (this.options().resourceGroups?.length && rl.resourceGroup) {
      rows.splice(5, 0, { label: rl.resourceGroup, value: v.resourceGroup || '—', mono: false })
    }
    if (v.tags?.trim()) rows.push({ label: rl.tags, value: v.tags.trim(), mono: true })
    return rows
  })

  form = this.fb.group({
    name: ['', Validators.required],
    region: [this.data.defaultRegion ?? '', Validators.required],
    availabilityZone: ['', Validators.required],
    resourceGroup: [''],
    instanceType: ['', Validators.required],
    imageId: ['', Validators.required],
    subnetId: [''],
    securityGroupId: [''],
    publicIp: [true],
    keyPair: ['', Validators.required],
    diskGb: [30, [Validators.required, Validators.min(8)]],
    diskType: ['', Validators.required],
    tags: [''],
    userData: [''],
    monitoring: [true],
  })

  private progressHandler = (payload: unknown): void => {
    const p = payload as {
      accountId?: string
      percent?: number
      step?: string
      log?: string
      status?: string
    }
    if (p.accountId && p.accountId !== this.data.accountId) return
    const status = (p.status as CloudLaunchProgressState['status']) ?? 'running'
    this.launchProgress.set({
      percent: p.percent ?? 0,
      step: p.step ?? '',
      log: p.log,
      status,
      instanceName: this.form.value.name ?? undefined,
      provider: this.data.provider,
      region: this.form.value.region ?? undefined,
    })
    if (status === 'success') {
      this.launching.set(false)
      this.toast.success('Instancia provisionada correctamente')
      this.catalogCache.invalidatePrefix(`images:${this.data.provider}:${this.data.accountId}`)
      setTimeout(() => this.dialogRef.close({ launched: true }), 900)
    }
    if (status === 'error') {
      this.launching.set(false)
      this.toast.error('No se pudo lanzar la instancia')
    }
  }

  ngOnInit(): void {
    const opts = cloudLaunchOptions(this.data.slug, this.data.defaultRegion ?? '')
    this.form.patchValue({
      diskGb: opts.defaultVolumeGb,
      diskType: opts.defaultVolumeType,
      keyPair: opts.keyPairs[0] ?? '',
      availabilityZone: opts.zones[0] ?? '',
      resourceGroup: opts.resourceGroups?.[0] ?? '',
    })

    this.realtime.connect()
    this.realtime.on('instance.launch.progress', this.progressHandler)

    const provider = this.data.provider
    const accountId = this.data.accountId
    this.catalogCache.fetch(`regions:${provider}:${accountId}`, () => this.accounts.regions(accountId)).subscribe({
      next: (r) => {
        this.regions.set(r)
        if (r.length && !this.form.value.region) this.form.patchValue({ region: r[0].id })
        this.loadCatalog()
      },
      error: () => this.loadCatalog(),
    })
  }

  ngOnDestroy(): void {
    this.realtime.off('instance.launch.progress', this.progressHandler)
  }

  imageBadgeLabel = (): string => {
    if (this.data.slug === 'aws') return 'Available'
    if (this.data.slug === 'azure') return 'Available'
    if (this.data.slug === 'gcp') return 'Ready'
    return 'Operativa'
  }

  onImageSearch = (ev: Event): void => {
    this.imageSearch.set((ev.target as HTMLInputElement).value)
  }

  onRegionChange = (): void => {
    const region = this.form.value.region ?? ''
    const opts = cloudLaunchOptions(this.data.slug, region)
    this.form.patchValue({
      availabilityZone: opts.zones[0] ?? '',
    })
    this.loadCatalog()
  }

  loadCatalog = (): void => {
    const region = this.form.value.region || undefined
    const provider = this.data.provider
    const accountId = this.data.accountId
    const regionKey = region || 'default'
    this.catalogLoading.set(true)

    let pending = 4
    const done = (): void => {
      pending -= 1
      if (pending <= 0) this.catalogLoading.set(false)
    }

    this.catalogCache
      .fetch(`images:${provider}:${accountId}:${regionKey}`, () => this.accounts.images(accountId, region))
      .subscribe({
        next: (imgs) => {
          const list = (imgs as CloudImageRow[]).filter((i) => i.id && (i.status ?? 'available') === 'available')
          this.images.set(list)
          const pre = this.data.preselectedImageId
          const pick = pre && list.find((i) => i.id === pre) ? pre : this.form.value.imageId || list[0]?.id
          if (pick) this.form.patchValue({ imageId: pick })
          done()
        },
        error: () => {
          this.images.set([])
          done()
        },
      })

    this.catalogCache
      .fetch(`types:${provider}:${accountId}:${regionKey}`, () => this.accounts.instanceTypes(accountId, region))
      .subscribe({
        next: (t) => {
          const list = t as CatalogRow[]
          this.types.set(list)
          if (!this.form.value.instanceType && list[0]) this.form.patchValue({ instanceType: list[0].id })
          done()
        },
        error: () => {
          this.types.set([])
          done()
        },
      })

    this.catalogCache
      .fetch(`networks:${provider}:${accountId}:${regionKey}`, () => this.accounts.networks(accountId, region))
      .subscribe({
        next: (n) => {
          const list = (n as { id: string; name: string; type?: string }[]) ?? []
          this.networks.set(list)
          if (!this.form.value.subnetId && list[0]) this.form.patchValue({ subnetId: list[0].id })
          done()
        },
        error: () => {
          this.networks.set([])
          done()
        },
      })

    this.catalogCache
      .fetch(`sgs:${provider}:${accountId}:${regionKey}`, () => this.accounts.securityGroups(accountId, region))
      .subscribe({
        next: (sg) => {
          const list = (sg as { id: string; name: string }[]) ?? []
          this.securityGroups.set(list)
          if (!this.form.value.securityGroupId && list[0]) this.form.patchValue({ securityGroupId: list[0].id })
          done()
        },
        error: () => {
          this.securityGroups.set([])
          done()
        },
      })
  }

  selectImage = (img: CloudImageRow): void => {
    this.form.patchValue({ imageId: img.id })
  }

  selectType = (id: string): void => {
    this.form.patchValue({ instanceType: id })
  }

  goToStep = (id: CloudLaunchStepId): void => {
    if (this.launching()) return
    this.activeStep.set(id)
  }

  canAdvance = (): boolean => {
    const step = this.activeStep()
    const v = this.form.getRawValue()
    if (step === 'image') return !!v.imageId && this.images().length > 0
    if (step === 'compute') return !!v.instanceType && !!v.name?.trim()
    if (step === 'network') return !!v.region && !!v.availabilityZone
    if (step === 'storage') return !!v.keyPair && !!v.diskType && (v.diskGb ?? 0) >= 8
    return true
  }

  handleNext = (): void => {
    if (!this.canAdvance()) return
    const steps = this.options().steps
    const idx = this.stepIndex()
    if (idx < steps.length - 1) this.activeStep.set(steps[idx + 1].id)
  }

  handleBack = (): void => {
    const steps = this.options().steps
    const idx = this.stepIndex()
    if (idx > 0) this.activeStep.set(steps[idx - 1].id)
  }

  osIcon = (img: CloudImageRow): string => {
    const n = (img.name + (img.os ?? '')).toLowerCase()
    if (n.includes('windows')) return '🪟'
    if (n.includes('ubuntu')) return '🟠'
    if (n.includes('debian')) return '🔴'
    if (n.includes('amazon') || n.includes('al202')) return '🟧'
    return '🐧'
  }

  shortId = (id: string): string => (id.length > 28 ? `${id.slice(0, 24)}…` : id)

  networkLabel = (): string => {
    const id = this.form.value.subnetId
    return this.networks().find((n) => n.id === id)?.name ?? 'VPC principal'
  }

  sgLabel = (): string =>
    this.securityGroups().find((s) => s.id === this.form.value.securityGroupId)?.name ?? 'default'

  typeSpecs = (): string => {
    const t = this.types().find((x) => x.id === this.form.value.instanceType)
    if (!t?.vcpus) return this.form.value.instanceType ?? '—'
    return `${t.vcpus} vCPU · ${t.memoryGb ?? '?'} GB RAM`
  }

  typeMonthlyCost = (t: CatalogRow): string => {
    const hourly = t.pricePerHour ?? 0.05
    return `~$${(hourly * 730).toFixed(0)}/mes`
  }

  costHint = (): string => {
    const t = this.types().find((x) => x.id === this.form.value.instanceType)
    const hourly = t?.pricePerHour ?? 0.05
    return `$${(hourly * 730).toFixed(0)}`
  }

  handleLaunch = (): void => {
    if (this.form.invalid) return
    this.launching.set(true)
    const v = this.form.getRawValue()
    this.launchProgress.set({
      percent: 5,
      step: 'Validando configuración…',
      status: 'running',
      instanceName: v.name ?? undefined,
      provider: this.data.provider,
      region: v.region ?? undefined,
    })

    const tags = parseTagsRecord(v.tags ?? '')
    const sgIds = v.securityGroupId ? [v.securityGroupId] : undefined

    this.accounts
      .launch(this.data.accountId, {
        name: v.name ?? '',
        region: v.region ?? '',
        instanceType: v.instanceType ?? '',
        imageId: v.imageId ?? '',
        subnetId: v.subnetId || undefined,
        securityGroupIds: sgIds,
        tags,
        availabilityZone: v.availabilityZone || undefined,
        resourceGroup: v.resourceGroup || undefined,
        keyPair: v.keyPair || undefined,
        publicIp: v.publicIp ?? undefined,
        diskGb: v.diskGb ?? undefined,
        diskType: v.diskType || undefined,
        userData: v.userData?.trim() || undefined,
        monitoring: v.monitoring ?? undefined,
      })
      .subscribe({
        next: () => {
          if (!this.launchProgress()?.status || this.launchProgress()?.status === 'running') {
            this.launching.set(false)
            this.toast.success(`Instancia ${v.name} provisionada`)
            this.catalogCache.invalidatePrefix(`images:${this.data.provider}:${this.data.accountId}`)
            this.dialogRef.close({ launched: true })
          }
        },
        error: () => {
          this.launching.set(false)
          this.launchProgress.set({
            percent: 100,
            step: 'Error al provisionar',
            status: 'error',
            instanceName: v.name ?? undefined,
            provider: this.data.provider,
          })
          this.toast.error('No se pudo lanzar la instancia')
        },
      })
  }
}
