import { NgTemplateOutlet, SlicePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import {
  CloudAccountsService,
  type LaunchPreflightCheck,
  type LaunchPreflightResult,
} from '../../core/services/cloud-accounts.service'
import { CloudCatalogCacheService } from '../../core/services/cloud-catalog-cache.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { ToastService } from '../../core/services/toast.service'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { CloudLaunchInfraPreviewComponent } from './cloud-launch-infra-preview.component'
import { CloudLaunchProgressComponent, type CloudLaunchProgressState } from './cloud-launch-progress.component'
import { cloudLaunchOptions, type CloudLaunchStepId } from './cloud-launch-options.util'
import { cloudLaunchTheme } from './cloud-launch-theme.util'
import type { CloudProvider } from '../../core/models/api.models'
import type { CloudSlug } from './cloud-provider.data'
import { imageOsLabel, imageOsLogoSrc, isCloudImageAvailable, isValidAwsAmiId, sanitizeAmiId } from './cloud-image-os.util'
import { AWS_IMAGE_SECTIONS, sectionCount, type AwsImageSectionId } from './cloud-ami-sections.util'
import { instancePriceLabels } from './cloud-instance-pricing.util'

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
  region?: string
  os?: string
  architecture?: string
  status?: string
  category?: string
}

type CatalogRow = {
  id: string
  name: string
  vcpus?: number
  memoryGb?: number
  pricePerHour?: number
  pricePerMinute?: number
}

type NetworkRow = {
  id: string
  name: string
  type?: string
  cidr?: string
  availabilityZone?: string
  vpcId?: string
  mapPublicIpOnLaunch?: boolean
  isDefaultForAz?: boolean
}

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
    SlicePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
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
  readonly catalogLoading = signal(false)
  readonly accountLoading = signal(true)
  readonly azLoading = signal(false)
  readonly preflightLoading = signal(false)
  readonly creatingSubnet = signal(false)
  readonly showCreateSubnet = signal(false)
  readonly launchProgress = signal<CloudLaunchProgressState | null>(null)
  readonly activeStep = signal<CloudLaunchStepId>('account')
  readonly imageSearch = signal('')
  readonly typeSearch = signal('')
  readonly imageSection = signal<AwsImageSectionId>('quick_start')
  readonly imageOsTab = signal<'all' | 'debian' | 'ubuntu' | 'windows' | 'linux'>('all')

  readonly regions = signal<{ id: string; name: string }[]>([])
  readonly availabilityZones = signal<string[]>([])
  readonly images = signal<CloudImageRow[]>([])
  readonly types = signal<CatalogRow[]>([])
  readonly allNetworks = signal<NetworkRow[]>([])
  readonly securityGroups = signal<{ id: string; name: string; vpcId?: string }[]>([])
  readonly keyPairs = signal<{ id: string; name: string }[]>([])
  readonly accountValid = signal<boolean | null>(null)
  readonly accountMessage = signal('')
  readonly accountPermissions = signal<string[]>([])
  readonly preflight = signal<LaunchPreflightResult | null>(null)

  readonly theme = computed(() => cloudLaunchTheme(this.data.slug))
  readonly options = computed(() => cloudLaunchOptions(this.data.slug))
  readonly stepIndex = computed(() => this.options().steps.findIndex((s) => s.id === this.activeStep()))
  readonly progressPct = computed(() => {
    const steps = this.options().steps.length
    return steps ? Math.round(((this.stepIndex() + 1) / steps) * 100) : 0
  })

  readonly vpcs = computed(() => this.allNetworks().filter((n) => n.type === 'vpc' || n.id.startsWith('vpc-')))
  readonly subnetsForAz = computed(() => {
    const az = this.form.value.availabilityZone ?? ''
    return this.allNetworks().filter(
      (n) => (n.type === 'subnet' || n.id.startsWith('subnet-')) && n.availabilityZone === az,
    )
  })

  readonly subnetIssue = computed(() => {
    if (this.data.slug !== 'aws') return null
    const az = this.form.value.availabilityZone ?? ''
    const subnetId = this.form.value.subnetId ?? ''
    const inAz = this.subnetsForAz()
    if (!az) return null
    if (subnetId && inAz.some((s) => s.id === subnetId)) return null
    if (!inAz.length) {
      return {
        level: 'error' as const,
        title: `Sin subnets en ${az}`,
        message: `No hay subnets en la zona ${az}. Cambia de zona, selecciona otra subnet o crea una nueva.`,
        suggestions: ['Cambiar a otra zona de disponibilidad', 'Crear subnet en la VPC seleccionada', 'Elegir otra región'],
      }
    }
    const hasDefault = inAz.some((s) => s.isDefaultForAz)
    if (!hasDefault && !subnetId) {
      return {
        level: 'warning' as const,
        title: `Sin subnet por defecto en ${az}`,
        message: `AWS no tiene subnet por defecto en ${az}. Debes seleccionar una subnet explícitamente para evitar el error al lanzar.`,
        suggestions: ['Seleccionar una subnet de la lista', 'Crear una nueva subnet con IP pública', 'Cambiar a otra zona'],
      }
    }
    return null
  })

  readonly canLaunch = computed(() => {
    const pf = this.preflight()
    if (this.preflightLoading()) return false
    if (pf) return pf.valid
    return this.form.valid && this.subnetIssue()?.level !== 'error'
  })

  readonly awsImageSections = computed(() => {
    if (this.data.slug !== 'aws') return []
    const imgs = this.images()
    return AWS_IMAGE_SECTIONS.filter((s) => s.id === 'all' || sectionCount(imgs, s.id) > 0)
  })

  readonly gcpImageTabs = computed(() => {
    if (this.data.slug !== 'gcp') return []
    return [
      { id: 'all' as const, label: 'Todas' },
      { id: 'debian' as const, label: 'Debian' },
      { id: 'ubuntu' as const, label: 'Ubuntu' },
      { id: 'windows' as const, label: 'Windows' },
    ]
  })

  readonly azureImageTabs = computed(() => {
    if (this.data.slug !== 'azure') return []
    return [
      { id: 'all' as const, label: 'Todas' },
      { id: 'windows' as const, label: 'Windows Server' },
      { id: 'linux' as const, label: 'Linux' },
    ]
  })

  readonly filteredTypes = computed(() => {
    const q = this.typeSearch().trim().toLowerCase()
    const list = this.types()
    if (!q) return list
    return list.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        String(t.vcpus ?? '').includes(q) ||
        String(t.memoryGb ?? '').includes(q),
    )
  })

  readonly filteredImages = computed(() => {
    const q = this.imageSearch().trim().toLowerCase()
    let list = this.images()

    if (this.data.slug === 'aws') {
      const section = this.imageSection()
      if (section !== 'all') list = list.filter((i) => i.category === section)
    } else {
      const tab = this.imageOsTab()
      if (tab !== 'all') {
        list = list.filter((i) => {
          const name = i.name.toLowerCase()
          const os = (i.os ?? '').toLowerCase()
          if (tab === 'ubuntu') return name.includes('ubuntu') || os.includes('ubuntu')
          if (tab === 'windows') return os.includes('windows') || name.includes('windows')
          if (tab === 'debian') return name.includes('debian') || os.includes('debian')
          if (tab === 'linux') return !os.includes('windows') && !name.includes('windows')
          return true
        })
      }
    }

    if (!q) return list
    return list.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.os ?? '').toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q),
    )
  })

  readonly selectedImage = computed(() => this.images().find((i) => i.id === this.form.value.imageId))

  readonly reviewRows = computed(() => {
    const v = this.form.getRawValue()
    const rl = this.options().reviewLabels
    const yesNo = this.data.slug === 'aws' || this.data.slug === 'azure' ? 'Yes' : 'Sí'
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
      { label: rl.publicIp, value: v.publicIp ? yesNo : 'No', mono: false },
      { label: rl.keyPair, value: v.keyPair || '—', mono: false },
      { label: rl.disk, value: `${v.diskGb ?? '—'} GB · ${v.diskType ?? '—'}`, mono: false },
      { label: rl.monitoring, value: v.monitoring ? monOn : monOff, mono: false },
    ]
    if (rl.vpc) rows.splice(5, 0, { label: rl.vpc, value: this.vpcLabel(), mono: false })
    if (this.options().resourceGroups?.length && rl.resourceGroup) {
      rows.splice(6, 0, { label: rl.resourceGroup, value: v.resourceGroup || '—', mono: false })
    }
    if (v.tags?.trim()) rows.push({ label: rl.tags, value: v.tags.trim(), mono: true })
    return rows
  })

  form = this.fb.group({
    name: ['', Validators.required],
    region: [this.data.defaultRegion ?? '', Validators.required],
    availabilityZone: ['', Validators.required],
    vpcId: [''],
    resourceGroup: [''],
    instanceType: ['', Validators.required],
    imageId: ['', Validators.required],
    subnetId: [''],
    securityGroupId: [''],
    publicIp: [true],
    keyPair: [''],
    diskGb: [30, [Validators.required, Validators.min(8)]],
    diskType: ['', Validators.required],
    tags: [''],
    userData: [''],
    monitoring: [true],
    newSubnetCidr: ['10.0.1.0/24'],
    newSubnetName: [''],
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
    const opts = cloudLaunchOptions(this.data.slug)
    this.form.patchValue({
      diskGb: opts.defaultVolumeGb,
      diskType: opts.defaultVolumeType,
      resourceGroup: opts.resourceGroups?.[0] ?? '',
    })

    this.realtime.connect()
    this.realtime.on('instance.launch.progress', this.progressHandler)
    this.loadAccountValidation()
    this.loadRegions()
  }

  ngOnDestroy(): void {
    this.realtime.off('instance.launch.progress', this.progressHandler)
  }

  loadAccountValidation = (): void => {
    this.accountLoading.set(true)
    this.accounts.validate(this.data.accountId).subscribe({
      next: (res) => {
        this.accountValid.set(res.valid)
        this.accountMessage.set(res.message ?? (res.valid ? 'Conexión válida' : 'Error de conexión'))
        this.accountPermissions.set(res.permissions ?? this.options().permissionLabels)
        this.accountLoading.set(false)
      },
      error: () => {
        this.accountValid.set(false)
        this.accountMessage.set('No se pudo validar la cuenta')
        this.accountPermissions.set(this.options().permissionLabels)
        this.accountLoading.set(false)
      },
    })
  }

  loadRegions = (): void => {
    const provider = this.data.provider
    const accountId = this.data.accountId
    this.catalogCache.fetch(`regions:${provider}:${accountId}`, () => this.accounts.regions(accountId)).subscribe({
      next: (r) => {
        this.regions.set(r)
        if (r.length && !this.form.value.region) this.form.patchValue({ region: r[0].id })
        this.onRegionChange()
      },
      error: () => this.onRegionChange(),
    })
  }

  loadAvailabilityZones = (): void => {
    const region = this.form.value.region ?? ''
    if (!region) return
    this.azLoading.set(true)
    this.accounts.availabilityZones(this.data.accountId, region).subscribe({
      next: (zones) => {
        this.availabilityZones.set(zones)
        const current = this.form.value.availabilityZone
        if (!current || !zones.includes(current)) {
          this.form.patchValue({ availabilityZone: zones[0] ?? '' })
        }
        this.onAzChange()
        this.azLoading.set(false)
      },
      error: () => {
        this.availabilityZones.set([])
        this.azLoading.set(false)
      },
    })
  }

  onRegionChange = (): void => {
    const region = this.form.value.region ?? ''
    this.catalogCache.invalidatePrefix(`images:${this.data.provider}:${this.data.accountId}`)
    this.catalogCache.invalidatePrefix(`types:${this.data.provider}:${this.data.accountId}`)
    this.catalogCache.invalidatePrefix(`networks:${this.data.provider}:${this.data.accountId}`)
    this.catalogCache.invalidatePrefix(`keypairs:${this.data.provider}:${this.data.accountId}`)
    this.form.patchValue({ imageId: '', subnetId: '', securityGroupId: '', vpcId: '' })
    this.imageSection.set('quick_start')
    this.preflight.set(null)
    this.loadAvailabilityZones()
    this.loadCatalog()
  }

  onAzChange = (): void => {
    const az = this.form.value.availabilityZone ?? ''
    const subnets = this.subnetsForAz()
    const defaultSubnet = subnets.find((s) => s.isDefaultForAz) ?? subnets[0]
    this.form.patchValue({
      subnetId: defaultSubnet?.id ?? '',
      vpcId: defaultSubnet?.vpcId ?? this.form.value.vpcId ?? this.vpcs()[0]?.id ?? '',
    })
    this.preflight.set(null)
  }

  onVpcChange = (): void => {
    const vpcId = this.form.value.vpcId ?? ''
    const az = this.form.value.availabilityZone ?? ''
    const subnet = this.subnetsForAz().find((s) => s.vpcId === vpcId)
    if (subnet) this.form.patchValue({ subnetId: subnet.id })
    else if (az) this.form.patchValue({ subnetId: '' })
    this.preflight.set(null)
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
          const list = (imgs as CloudImageRow[])
            .map((i) => ({ ...i, id: sanitizeAmiId(i.id) }))
            .filter(
              (i) =>
                i.id &&
                isCloudImageAvailable(i.status) &&
                (this.data.slug !== 'aws' || isValidAwsAmiId(i.id)),
            )
          this.images.set(list)
          const pick = this.pickImageForRegion(list)
          if (!this.form.value.imageId) this.form.patchValue({ imageId: pick })
          if (list.some((i) => i.category === 'quick_start')) this.imageSection.set('quick_start')
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
          const raw = (n as NetworkRow[]) ?? []
          this.allNetworks.set(raw)
          const vpcs = raw.filter((x) => x.type === 'vpc' || x.id.startsWith('vpc-'))
          if (!this.form.value.vpcId && vpcs[0]) this.form.patchValue({ vpcId: vpcs[0].id })
          this.onAzChange()
          done()
        },
        error: () => {
          this.allNetworks.set([])
          done()
        },
      })

    this.catalogCache
      .fetch(`sgs:${provider}:${accountId}:${regionKey}`, () => this.accounts.securityGroups(accountId, region))
      .subscribe({
        next: (sg) => {
          const list = (sg as { id: string; name: string; vpcId?: string }[]) ?? []
          this.securityGroups.set(list)
          if (!this.form.value.securityGroupId && list[0]) this.form.patchValue({ securityGroupId: list[0].id })
          done()
        },
        error: () => {
          this.securityGroups.set([])
          done()
        },
      })

    this.catalogCache
      .fetch(`keypairs:${provider}:${accountId}:${regionKey}`, () => this.accounts.keyPairs(accountId, region))
      .subscribe({
        next: (rows) => {
          const list = (rows as { id: string; name: string }[]) ?? []
          this.keyPairs.set(list)
          if (!this.form.value.keyPair && list[0]) this.form.patchValue({ keyPair: list[0].name })
        },
        error: () => this.keyPairs.set([]),
      })
  }

  runPreflight = (): void => {
    const payload = this.buildLaunchPayload()
    if (!payload) return
    this.preflightLoading.set(true)
    this.accounts.validateLaunch(this.data.accountId, payload).subscribe({
      next: (res) => {
        this.preflight.set(res)
        this.preflightLoading.set(false)
      },
      error: () => {
        this.preflight.set({ valid: false, checks: [{ id: 'api', level: 'error', message: 'Error al validar preflight' }] })
        this.preflightLoading.set(false)
      },
    })
  }

  handleCreateSubnet = (): void => {
    const region = this.form.value.region ?? ''
    const vpcId = this.form.value.vpcId ?? ''
    const az = this.form.value.availabilityZone ?? ''
    const cidr = this.form.value.newSubnetCidr ?? '10.0.1.0/24'
    const name = this.form.value.newSubnetName?.trim() || `subnet-${az}`
    if (!region || !vpcId || !az) {
      this.toast.error('Selecciona región, VPC y zona antes de crear la subnet')
      return
    }
    this.creatingSubnet.set(true)
    this.accounts
      .createSubnet(this.data.accountId, {
        region,
        vpcId,
        availabilityZone: az,
        cidrBlock: cidr,
        name,
        mapPublicIpOnLaunch: this.form.value.publicIp ?? true,
      })
      .subscribe({
        next: (subnet) => {
          const row = subnet as NetworkRow
          this.allNetworks.update((list) => [...list, row])
          this.form.patchValue({ subnetId: row.id, vpcId: row.vpcId ?? vpcId })
          this.showCreateSubnet.set(false)
          this.creatingSubnet.set(false)
          this.toast.success(`Subnet ${row.name ?? row.id} creada`)
          this.runPreflight()
        },
        error: (err: HttpErrorResponse) => {
          const msg = err.error?.message ?? err.message ?? 'No se pudo crear la subnet'
          this.toast.error(msg)
          this.creatingSubnet.set(false)
        },
      })
  }

  private buildLaunchPayload = () => {
    const v = this.form.getRawValue()
    const imageId = sanitizeAmiId(v.imageId ?? '')
    if (!v.name || !v.region || !v.instanceType || !imageId) return null
    const sgIds = v.securityGroupId ? [v.securityGroupId] : undefined
    return {
      name: v.name,
      region: v.region,
      instanceType: v.instanceType,
      imageId,
      subnetId: v.subnetId || undefined,
      securityGroupIds: sgIds,
      tags: parseTagsRecord(v.tags ?? ''),
      availabilityZone: v.availabilityZone || undefined,
      resourceGroup: v.resourceGroup || undefined,
      keyPair: v.keyPair || undefined,
      publicIp: v.publicIp ?? undefined,
      diskGb: v.diskGb ?? undefined,
      diskType: v.diskType || undefined,
      userData: v.userData?.trim() || undefined,
      monitoring: v.monitoring ?? undefined,
    }
  }

  private pickImageForRegion = (list: CloudImageRow[]): string => {
    const current = sanitizeAmiId(this.form.value.imageId ?? '')
    if (current && list.some((i) => i.id === current)) return current
    const pre = this.data.preselectedImageId ? sanitizeAmiId(this.data.preselectedImageId) : ''
    if (pre && list.some((i) => i.id === pre)) return pre
    const quick = list.find((i) => i.category === 'quick_start')
    return quick?.id ?? list[0]?.id ?? ''
  }

  selectImageSection = (id: AwsImageSectionId): void => {
    this.imageSection.set(id)
  }

  selectImage = (img: CloudImageRow): void => {
    this.form.patchValue({ imageId: sanitizeAmiId(img.id) })
    this.preflight.set(null)
  }

  selectType = (id: string): void => {
    this.form.patchValue({ instanceType: id })
    this.preflight.set(null)
  }

  goToStep = (id: CloudLaunchStepId): void => {
    if (this.launching()) return
    this.activeStep.set(id)
    if (id === 'review') this.runPreflight()
  }

  canAdvance = (): boolean => {
    const step = this.activeStep()
    const v = this.form.getRawValue()
    if (step === 'account') return this.accountValid() === true
    if (step === 'region') {
      const regionOk = !!v.region && !!v.availabilityZone
      const subnetOk = this.data.slug !== 'aws' || !!v.subnetId || !this.subnetIssue()
      return regionOk && subnetOk && this.subnetIssue()?.level !== 'error'
    }
    if (step === 'compute') return !!v.instanceType && !!v.name?.trim() && !!v.diskType && (v.diskGb ?? 0) >= 8
    if (step === 'image') return !!v.imageId && this.images().length > 0
    return true
  }

  handleNext = (): void => {
    if (!this.canAdvance()) return
    const steps = this.options().steps
    const idx = this.stepIndex()
    if (idx < steps.length - 1) {
      const next = steps[idx + 1].id
      this.activeStep.set(next)
      if (next === 'review') this.runPreflight()
    }
  }

  handleBack = (): void => {
    const steps = this.options().steps
    const idx = this.stepIndex()
    if (idx > 0) this.activeStep.set(steps[idx - 1].id)
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

  onTypeSearch = (ev: Event): void => {
    this.typeSearch.set((ev.target as HTMLInputElement).value)
  }

  imageLogo = (img: CloudImageRow): string => imageOsLogoSrc(img)
  imageVendor = (img: CloudImageRow): string => imageOsLabel(img)
  priceLocale = (): 'es' | 'en' => (this.data.slug === 'aws' || this.data.slug === 'azure' ? 'en' : 'es')
  typePriceDetail = (t: CatalogRow): { hourly: string; minute: string; monthly: string } =>
    instancePriceLabels(t, this.priceLocale())
  shortId = (id: string): string => (id.length > 28 ? `${id.slice(0, 24)}…` : id)

  networkLabel = (): string => {
    const id = this.form.value.subnetId
    return this.allNetworks().find((n) => n.id === id)?.name ?? id ?? '—'
  }

  vpcLabel = (): string => {
    const id = this.form.value.vpcId
    return this.vpcs().find((v) => v.id === id)?.name ?? id ?? '—'
  }

  sgLabel = (): string =>
    this.securityGroups().find((s) => s.id === this.form.value.securityGroupId)?.name ?? 'default'

  typeSpecs = (): string => {
    const t = this.types().find((x) => x.id === this.form.value.instanceType)
    if (!t?.vcpus) return this.form.value.instanceType ?? '—'
    return `${t.vcpus} vCPU · ${t.memoryGb ?? '?'} GB RAM`
  }

  typeMonthlyCost = (t: CatalogRow): string => this.typePriceDetail(t).monthly

  costHint = (): string => {
    const t = this.types().find((x) => x.id === this.form.value.instanceType)
    if (!t) return '—'
    const p = this.typePriceDetail(t)
    return `${p.hourly} · ${p.minute}`
  }

  sectionCount = sectionCount

  checkIcon = (c: LaunchPreflightCheck): string => {
    if (c.level === 'ok') return 'check_circle'
    if (c.level === 'warning') return 'warning'
    return 'error'
  }

  handleLaunch = (): void => {
    const payload = this.buildLaunchPayload()
    if (!payload || !this.canLaunch()) return
    this.launching.set(true)
    this.launchProgress.set({
      percent: 5,
      step: 'Validando configuración…',
      status: 'running',
      instanceName: payload.name,
      provider: this.data.provider,
      region: payload.region,
    })

    this.accounts.launch(this.data.accountId, payload).subscribe({
      next: () => {
        if (!this.launchProgress()?.status || this.launchProgress()?.status === 'running') {
          this.launching.set(false)
          this.toast.success(`Instancia ${payload.name} provisionada`)
          this.catalogCache.invalidatePrefix(`images:${this.data.provider}:${this.data.accountId}`)
          this.dialogRef.close({ launched: true })
        }
      },
      error: (err: HttpErrorResponse) => {
        const msg =
          (typeof err.error === 'string' ? err.error : err.error?.message) ??
          err.message ??
          'No se pudo lanzar la instancia'
        this.launching.set(false)
        this.launchProgress.set({
          percent: 100,
          step: msg,
          status: 'error',
          instanceName: payload.name,
          provider: this.data.provider,
        })
        this.toast.error(msg)
      },
    })
  }
}
