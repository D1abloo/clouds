import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  computed,
} from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { CloudCatalogCacheService } from '../../core/services/cloud-catalog-cache.service'
import { CopilotApiService } from '../../core/services/copilot-api.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { ToastService } from '../../core/services/toast.service'
import type { CloudAccount, CloudProvider } from '../../core/models/api.models'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import type { CloudSlug } from '../cloud/cloud-provider.data'
import { cloudLaunchOptions, defaultZonesForRegion } from '../cloud/cloud-launch-options.util'
import { cloudLaunchTheme } from '../cloud/cloud-launch-theme.util'
import { imageOsLabel, imageOsLogoSrc, isCloudImageAvailable, isValidAwsAmiId, sanitizeAmiId } from '../cloud/cloud-image-os.util'
import { AWS_IMAGE_SECTIONS, sectionCount, type AwsImageSectionId } from '../cloud/cloud-ami-sections.util'
import { instancePriceLabels } from '../cloud/cloud-instance-pricing.util'

type WizardStep = 1 | 2 | 3 | 4 | 5

type CloudImageRow = { id: string; name: string; os?: string; architecture?: string; status?: string; category?: string }
type CatalogRow = {
  id: string
  name: string
  vcpus?: number
  memoryGb?: number
  pricePerHour?: number
  pricePerMinute?: number
}

const PROVIDERS: { id: CloudProvider; label: string; logo: NavLogoKey; slug: CloudSlug }[] = [
  { id: 'AWS', label: 'Amazon Web Services', logo: 'aws', slug: 'aws' },
  { id: 'GCP', label: 'Google Cloud Platform', logo: 'gcp', slug: 'gcp' },
  { id: 'AZURE', label: 'Microsoft Azure', logo: 'azure', slug: 'azure' },
]

const providerSlug = (p: CloudProvider): CloudSlug =>
  PROVIDERS.find((x) => x.id === p)?.slug ?? 'aws'

@Component({
  selector: 'app-ai-infra-studio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    BrandLogoComponent,
  ],
  templateUrl: './ai-infra-studio.component.html',
  styleUrl: './ai-infra-studio.component.scss',
})
export class AiInfraStudioComponent implements OnInit, OnDestroy {
  private readonly cloud = inject(CloudAccountsService)
  private readonly catalogCache = inject(CloudCatalogCacheService)
  private readonly copilot = inject(CopilotApiService)
  private readonly realtime = inject(RealtimeService)
  private readonly toast = inject(ToastService)
  private readonly destroyRef = inject(DestroyRef)

  readonly providers = PROVIDERS
  readonly stepLabels = [
    { n: 1 as WizardStep, label: 'Cuenta', icon: 'corporate_fare' },
    { n: 2 as WizardStep, label: 'Región', icon: 'public' },
    { n: 3 as WizardStep, label: 'Compute', icon: 'memory' },
    { n: 4 as WizardStep, label: 'Imagen', icon: 'image' },
    { n: 5 as WizardStep, label: 'Lanzar', icon: 'rocket_launch' },
  ]

  readonly step = signal<WizardStep>(1)
  readonly provider = signal<CloudProvider>('AWS')
  readonly selectedAccountId = signal('')
  readonly region = signal('')
  readonly availabilityZone = signal('')
  readonly instanceType = signal('')
  readonly imageId = signal('')
  readonly instanceName = signal(`ai-studio-${Date.now().toString(36).slice(-6)}`)
  readonly subnetId = signal('')
  readonly securityGroupId = signal('')

  readonly regions = signal<{ id: string; name: string }[]>([])
  readonly accounts = signal<CloudAccount[]>([])
  readonly images = signal<CloudImageRow[]>([])
  readonly types = signal<CatalogRow[]>([])
  readonly networks = signal<{ id: string; name: string }[]>([])
  readonly securityGroups = signal<{ id: string; name: string }[]>([])
  readonly keyPairs = signal<{ id: string; name: string }[]>([])
  readonly typeSearch = signal('')

  readonly catalogLoading = signal(false)
  readonly launching = signal(false)
  readonly launchPercent = signal(0)
  readonly launchStep = signal('')
  readonly launchDone = signal(false)
  readonly launchError = signal('')
  readonly launchedInstanceId = signal('')

  copilotPrompt = ''
  readonly copilotMessages = signal<{ role: 'user' | 'assistant'; text: string }[]>([
    {
      role: 'assistant',
      text: 'Soy tu copiloto de infraestructura. Te guío paso a paso: elige cuenta conectada, región válida del proveedor, tipo e imagen del catálogo operativo, y lanzamos con seguimiento en tiempo real.',
    },
  ])

  readonly slug = computed(() => providerSlug(this.provider()))
  readonly theme = computed(() => cloudLaunchTheme(this.slug()))
  readonly launchOptions = computed(() => cloudLaunchOptions(this.slug()))
  readonly zoneOptions = computed(() => defaultZonesForRegion(this.slug(), this.region()))
  readonly selectedAccount = computed(() => this.accounts().find((a) => a.id === this.selectedAccountId()))
  readonly selectedImage = computed(() => this.images().find((i) => i.id === this.imageId()))
  readonly selectedType = computed(() => this.types().find((t) => t.id === this.instanceType()))
  readonly progressPct = computed(() => Math.round((this.step() / 5) * 100))
  readonly estimatedMonthly = computed(() => {
    const t = this.selectedType()
    if (!t) return '—'
    return this.typePriceDetail(t).monthly.replace('~', '')
  })
  readonly hasAccount = computed(() => !!this.selectedAccountId())

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

  readonly imageSection = signal<AwsImageSectionId>('quick_start')
  readonly keyPair = signal('')

  readonly awsImageSections = computed(() =>
    AWS_IMAGE_SECTIONS.filter((s) => s.id === 'all' || sectionCount(this.images(), s.id) > 0),
  )

  readonly filteredStudioImages = computed(() => {
    let list = this.images()
    if (this.provider() === 'AWS' && this.imageSection() !== 'all') {
      list = list.filter((i) => i.category === this.imageSection())
    }
    return list
  })

  sectionCount = sectionCount

  private progressHandler = (payload: unknown): void => {
    const p = payload as { accountId?: string; percent?: number; step?: string; log?: string; status?: string }
    const accId = this.selectedAccountId()
    if (p.accountId && accId && p.accountId !== accId) return
    if (p.percent != null) this.launchPercent.set(p.percent)
    if (p.step) this.launchStep.set(p.log ? `${p.step} — ${p.log}` : p.step)
    if (p.status === 'success') {
      this.launching.set(false)
      this.launchDone.set(true)
      this.launchError.set('')
      this.toast.success('Instancia provisionada correctamente')
    }
    if (p.status === 'error') {
      this.launching.set(false)
      this.launchError.set(p.log ?? 'Error durante el provisionamiento')
      this.toast.error('Error en el lanzamiento')
    }
  }

  ngOnInit(): void {
    this.realtime.connect()
    this.realtime.on('instance.launch.progress', this.progressHandler)
    this.destroyRef.onDestroy(() => this.realtime.off('instance.launch.progress', this.progressHandler))
    this.loadAccounts()
  }

  ngOnDestroy(): void {
    this.realtime.off('instance.launch.progress', this.progressHandler)
  }

  selectProvider = (id: CloudProvider): void => {
    this.provider.set(id)
    this.step.set(1)
    this.launchDone.set(false)
    this.launchError.set('')
    this.loadAccounts()
  }

  loadAccounts = (): void => {
    this.cloud
      .list(undefined, this.provider())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (accs) => {
          this.accounts.set(accs)
          const first = accs[0]
          if (first) {
            this.selectedAccountId.set(first.id)
            if (first.defaultRegion) this.region.set(first.defaultRegion)
            this.loadRegions(first.id)
          } else {
            this.selectedAccountId.set('')
            this.regions.set([])
          }
        },
      })
  }

  onAccountChange = (accountId: string): void => {
    this.selectedAccountId.set(accountId)
    const acc = this.accounts().find((a) => a.id === accountId)
    if (acc?.defaultRegion) this.region.set(acc.defaultRegion)
    this.loadRegions(accountId)
    this.loadCatalog()
  }

  loadRegions = (accountId: string): void => {
    this.cloud
      .regions(accountId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.regions.set(r)
          if (r.length && !r.some((x) => x.id === this.region())) {
            this.region.set(r[0].id)
          }
          const zones = defaultZonesForRegion(this.slug(), this.region())
          this.availabilityZone.set(zones[0] ?? '')
          if (this.step() >= 3) this.loadCatalog()
        },
      })
  }

  onRegionChange = (regionId: string): void => {
    this.region.set(regionId)
    const zones = defaultZonesForRegion(this.slug(), regionId)
    this.availabilityZone.set(zones[0] ?? '')
    this.catalogCache.invalidatePrefix(`images:${this.provider()}:${this.selectedAccountId()}`)
    this.imageId.set('')
    this.imageSection.set('quick_start')
    this.loadCatalog()
  }

  loadCatalog = (): void => {
    const accountId = this.selectedAccountId()
    const region = this.region()
    if (!accountId || !region) return

    const provider = this.provider()
    const regionKey = region || 'default'
    this.catalogLoading.set(true)

    let pending = 5
    const done = (): void => {
      pending -= 1
      if (pending <= 0) this.catalogLoading.set(false)
    }

    this.catalogCache
      .fetch(`images:${provider}:${accountId}:${regionKey}`, () => this.cloud.images(accountId, region))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (imgs) => {
          const list = (imgs as CloudImageRow[])
            .map((i) => ({ ...i, id: sanitizeAmiId(i.id) }))
            .filter(
              (i) => i.id && isCloudImageAvailable(i.status) && (provider !== 'AWS' || isValidAwsAmiId(i.id)),
            )
          this.images.set(list)
          const current = sanitizeAmiId(this.imageId())
          const pick =
            current && list.some((i) => i.id === current)
              ? current
              : (list.find((i) => i.category === 'quick_start')?.id ?? list[0]?.id ?? '')
          this.imageId.set(pick)
          done()
        },
        error: () => {
          this.images.set([])
          done()
        },
      })

    this.catalogCache
      .fetch(`types:${provider}:${accountId}:${regionKey}`, () => this.cloud.instanceTypes(accountId, region))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (t) => {
          const list = t as CatalogRow[]
          this.types.set(list)
          if (list[0] && !list.some((x) => x.id === this.instanceType())) this.instanceType.set(list[0].id)
          done()
        },
        error: () => {
          this.types.set([])
          done()
        },
      })

    this.catalogCache
      .fetch(`networks:${provider}:${accountId}:${regionKey}`, () => this.cloud.networks(accountId, region))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (n) => {
          const list = (n as { id: string; name: string }[]) ?? []
          this.networks.set(list)
          if (list[0]) this.subnetId.set(list[0].id)
          done()
        },
        error: () => {
          this.networks.set([])
          done()
        },
      })

    this.catalogCache
      .fetch(`sgs:${provider}:${accountId}:${regionKey}`, () => this.cloud.securityGroups(accountId, region))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sg) => {
          const list = (sg as { id: string; name: string }[]) ?? []
          this.securityGroups.set(list)
          if (list[0]) this.securityGroupId.set(list[0].id)
          done()
        },
        error: () => {
          this.securityGroups.set([])
          done()
        },
      })

    this.catalogCache
      .fetch(`keypairs:${provider}:${accountId}:${regionKey}`, () => this.cloud.keyPairs(accountId, region))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          const list = (rows as { id: string; name: string }[]) ?? []
          this.keyPairs.set(list)
          if (list[0] && !this.keyPair()) this.keyPair.set(list[0].name)
          done()
        },
        error: () => {
          this.keyPairs.set([])
          done()
        },
      })
  }

  canNext = (): boolean => {
    if (!this.hasAccount()) return false
    const s = this.step()
    if (s === 1) return !!this.provider() && !!this.selectedAccountId()
    if (s === 2) return !!this.region()
    if (s === 3) return !!this.instanceType() && this.types().length > 0
    if (s === 4) {
      const keyOk = this.keyPairs().length === 0 || !!this.keyPair().trim()
      return keyOk && !!this.imageId() && !!this.instanceName().trim() && this.images().length > 0
    }
    return true
  }

  goToStep = (n: WizardStep): void => {
    if (this.launching()) return
    if (this.step() > n) this.step.set(n)
  }

  askCopilot = (text: string): void => {
    this.copilotPrompt = text
    this.handleCopilot(new Event('submit'))
  }

  next = (): void => {
    if (!this.canNext()) return
    const s = this.step()
    if (s === 1 || s === 2) this.loadCatalog()
    if (s < 5) this.step.update((n) => (n + 1) as WizardStep)
  }

  prev = (): void => {
    if (this.step() > 1) this.step.update((n) => (n - 1) as WizardStep)
  }

  priceLocale = (): 'es' | 'en' => (this.provider() === 'AWS' || this.provider() === 'AZURE' ? 'en' : 'es')

  typePriceDetail = (t: CatalogRow) => instancePriceLabels(t, this.priceLocale())

  typeMonthly = (t: CatalogRow): string => this.typePriceDetail(t).monthly

  imageLogo = (img: CloudImageRow): string => imageOsLogoSrc(img)

  imageVendor = (img: CloudImageRow): string => imageOsLabel(img)

  parseLaunchError = (err: HttpErrorResponse): string => {
    const body = err.error as { message?: string | string[] } | undefined
    if (Array.isArray(body?.message)) return body.message.join(', ')
    if (typeof body?.message === 'string') return body.message
    if (err.status === 0) return 'Sin conexión con la API'
    return `Error HTTP ${err.status}`
  }

  handleLaunch = (): void => {
    const accId = this.selectedAccountId()
    if (!accId) {
      const msg = 'Conecta una cuenta cloud en Integraciones antes de lanzar'
      this.launchError.set(msg)
      this.toast.error(msg)
      return
    }

    if (!this.imageId() || !this.instanceType()) {
      this.launchError.set('Selecciona imagen y tipo del catálogo operativo')
      this.toast.error('Catálogo incompleto — vuelve a los pasos anteriores')
      return
    }

    this.launching.set(true)
    this.launchDone.set(false)
    this.launchError.set('')
    this.launchPercent.set(5)
    this.launchStep.set('Validando configuración…')

    const sgIds = this.securityGroupId() ? [this.securityGroupId()] : undefined
    const opts = this.launchOptions()

    this.cloud
      .launch(accId, {
        name: this.instanceName().trim(),
        region: this.region(),
        instanceType: this.instanceType(),
        imageId: sanitizeAmiId(this.imageId()),
        subnetId: this.subnetId() || undefined,
        securityGroupIds: sgIds,
        availabilityZone: this.availabilityZone() || defaultZonesForRegion(this.slug(), this.region())[0],
        publicIp: true,
        keyPair: this.keyPair().trim() || undefined,
        diskGb: opts.defaultVolumeGb,
        diskType: opts.defaultVolumeType,
        monitoring: true,
        tags: { Environment: 'ai-studio', ManagedBy: 'spendlyx' },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const row = res as { id?: string; externalId?: string; dbId?: string }
          const id = row.dbId ?? row.id ?? row.externalId ?? ''
          if (id) this.launchedInstanceId.set(id)
          if (!this.launchDone()) {
            this.launchStep.set('Provisionando recursos en la nube…')
          }
        },
        error: (err: HttpErrorResponse) => {
          this.launching.set(false)
          const msg = this.parseLaunchError(err)
          this.launchError.set(msg)
          this.toast.error(msg)
        },
      })
  }

  handleCopilot = (e: Event): void => {
    e.preventDefault()
    const msg = this.copilotPrompt.trim()
    if (!msg) return
    this.copilotMessages.update((m) => [...m, { role: 'user', text: msg }])
    this.copilotPrompt = ''
    this.copilot
      .chat(msg)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.copilotMessages.update((m) => [...m, { role: 'assistant', text: res.message }]),
        error: () =>
          this.copilotMessages.update((m) => [
            ...m,
            { role: 'assistant', text: 'Copilot no disponible. Usa el asistente manual con catálogo operativo.' },
          ]),
      })
  }
}
