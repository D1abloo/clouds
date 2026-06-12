import { SlicePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
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
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { type CloudLaunchProgressState } from './cloud-launch-progress.component'
import { cloudLaunchOptions } from './cloud-launch-options.util'
import { cloudLaunchTheme } from './cloud-launch-theme.util'
import { CLOUD_LAUNCH_STEPS, type LaunchStepMeta } from './launch/cloud-launch-steps.util'
import type { CloudLaunchStepId, LaunchedResource, ProviderCard } from './launch/cloud-launch.types'
import { CloudProviderSelectorComponent } from './launch/cloud-provider-selector.component'
import { InfraCopilotPanelComponent } from './launch/infra-copilot-panel.component'
import { LaunchErrorCardComponent } from './launch/launch-error-card.component'
import { LaunchReviewComponent } from './launch/launch-review.component'
import { LaunchProgressPanelComponent } from './launch/launch-progress-panel.component'
import { AwsLaunchFormComponent } from './launch/aws-launch-form.component'
import { GcpLaunchFormComponent } from './launch/gcp-launch-form.component'
import { IonosVpsLaunchFormComponent } from './launch/ionos-vps-launch-form.component'
import { CloudAccountStepComponent } from './launch/cloud-account-step.component'
import { CloudRegionZoneStepComponent } from './launch/cloud-region-zone-step.component'
import { CloudNetworkStepComponent } from './launch/cloud-network-step.component'
import { CloudComputeStepComponent } from './launch/cloud-compute-step.component'
import { CloudImageStepComponent } from './launch/cloud-image-step.component'
import { LaunchTestPanelComponent } from './launch/launch-test-panel.component'
import { LaunchDeletePanelComponent } from './launch/launch-delete-panel.component'
import { CloudLaunchLogsComponent } from './launch/cloud-launch-logs.component'
import { CloudCostEstimateCardComponent } from './launch/cloud-cost-estimate-card.component'
import { InstancesService } from '../../core/services/instances.service'
import {
  CloudLaunchActivityService,
  type LaunchActivityProvider,
  type LaunchInventoryResource,
} from '../../core/services/cloud-launch-activity.service'
import type { CloudProvider } from '../../core/models/api.models'
import type { CloudSlug } from './cloud-provider.data'
import { imageOsLabel, imageOsLogoSrc, isCloudImageAvailable, isValidAwsAmiId, sanitizeAmiId } from './cloud-image-os.util'
import { AWS_IMAGE_SECTIONS, sectionCount, type AwsImageSectionId } from './cloud-ami-sections.util'
import { instancePriceLabels } from './cloud-instance-pricing.util'
import { extractApiErrorMessage, suggestSubnetCidr } from './cloud-subnet-cidr.util'
import { pageReveal, staggerCards, stepTransition } from '../../shared/animations/ui-motion.animations'

export type CloudLaunchWizardData = {
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

type LaunchPayload = {
  name: string
  region: string
  instanceType: string
  imageId: string
  subnetId?: string
  securityGroupIds?: string[]
  tags?: Record<string, string>
  availabilityZone?: string
  resourceGroup?: string
  keyPair?: string
  publicIp?: boolean
  diskGb?: number
  diskType?: string
  userData?: string
  monitoring?: boolean
}

type LaunchProviderSlug = CloudSlug | 'ionos'

const LAUNCH_PROVIDERS: ProviderCard[] = [
  {
    slug: 'aws',
    provider: 'AWS',
    label: 'AWS EC2',
    tagline: 'Amazon Web Services',
    logo: 'aws',
    description: 'Instancias EC2, VPC, subnets, security groups, key pairs y AMIs.',
    connectionState: 'Credenciales IAM',
    initialCost: '~$0.012/h',
  },
  {
    slug: 'gcp',
    provider: 'GCP',
    label: 'GCP Compute Engine',
    tagline: 'Google Cloud',
    logo: 'gcp',
    description: 'VMs, proyectos, zonas, VPC networks, firewall rules e imágenes públicas.',
    connectionState: 'Service account',
    initialCost: '~$0.010/h',
  },
  {
    slug: 'ionos',
    provider: 'IONOS_VPS',
    label: 'IONOS VPS',
    tagline: 'IONOS Cloud',
    logo: 'ionos',
    description: 'VPS, datacenters europeos, planes, imágenes Linux y SSH keys.',
    connectionState: 'API token',
    initialCost: '~17.52$/mes',
  },
]

const slugToProvider = (slug: CloudSlug | 'ionos'): CloudProvider =>
  slug === 'gcp' ? 'GCP' : slug === 'azure' ? 'AZURE' : slug === 'ionos' ? 'VPS' : 'AWS'

const providerForActivity = (slug: LaunchProviderSlug): LaunchActivityProvider =>
  slug === 'ionos' ? 'IONOS' : slug === 'gcp' ? 'GCP' : slug === 'azure' ? 'AZURE' : slug === 'clouding' ? 'CLOUDING' : 'AWS'

const normalizeProviderSlug = (raw?: string | null): LaunchProviderSlug | null => {
  const value = (raw ?? '').trim().toLowerCase()
  if (value === 'aws' || value === 'gcp' || value === 'azure' || value === 'clouding' || value === 'ionos') return value
  if (value === 'google' || value === 'gce') return 'gcp'
  if (value === 'ec2') return 'aws'
  if (value === 'vps' || value === 'ionos-vps') return 'ionos'
  return null
}

const IONOS_REGIONS = [
  { id: 'de/fra', name: 'Alemania · Frankfurt' },
  { id: 'de/txl', name: 'Alemania · Berlin' },
  { id: 'es/mad', name: 'España · Madrid' },
]

const IONOS_DATACENTERS = ['fra1', 'fra2', 'txl1', 'mad1']

const IONOS_PLANS: CatalogRow[] = [
  { id: 'vps-s', name: 'VPS S', vcpus: 1, memoryGb: 2, pricePerHour: 0.012 },
  { id: 'vps-m', name: 'VPS M', vcpus: 2, memoryGb: 4, pricePerHour: 0.024 },
  { id: 'vps-l', name: 'VPS L', vcpus: 4, memoryGb: 8, pricePerHour: 0.048 },
  { id: 'vps-xl', name: 'VPS XL', vcpus: 6, memoryGb: 16, pricePerHour: 0.082 },
]

const IONOS_PLAN_DISK_GB: Record<string, number> = {
  'vps-s': 40,
  'vps-m': 80,
  'vps-l': 160,
  'vps-xl': 240,
}

const IONOS_IMAGES: CloudImageRow[] = [
  { id: 'ubuntu-24-04', name: 'Ubuntu 24.04 LTS', region: 'de/fra', os: 'ubuntu', architecture: 'x86_64', status: 'ready' },
  { id: 'debian-12', name: 'Debian 12 Bookworm', region: 'de/fra', os: 'debian', architecture: 'x86_64', status: 'ready' },
  { id: 'alma-9', name: 'AlmaLinux 9', region: 'de/fra', os: 'linux', architecture: 'x86_64', status: 'ready' },
]

const IONOS_KEY_PAIRS = [
  { id: 'ionos-default', name: 'ionos-default' },
  { id: 'platform-ops', name: 'platform-ops' },
]

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
  selector: 'app-cloud-launch-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SlicePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    LoadingStateComponent,
    CloudProviderSelectorComponent,
    InfraCopilotPanelComponent,
    LaunchErrorCardComponent,
    LaunchReviewComponent,
    LaunchProgressPanelComponent,
    AwsLaunchFormComponent,
    GcpLaunchFormComponent,
    IonosVpsLaunchFormComponent,
    CloudAccountStepComponent,
    CloudRegionZoneStepComponent,
    CloudNetworkStepComponent,
    CloudComputeStepComponent,
    CloudImageStepComponent,
    LaunchTestPanelComponent,
    LaunchDeletePanelComponent,
    CloudLaunchLogsComponent,
    CloudCostEstimateCardComponent,
  ],
  animations: [pageReveal, staggerCards, stepTransition],
  templateUrl: './cloud-launch-wizard.component.html',
  styleUrl: './cloud-launch-wizard.component.scss',
})
export class CloudLaunchWizardComponent implements OnInit, OnDestroy, OnChanges {
  @Input() data?: CloudLaunchWizardData
  @Input() embedded = true
  @Input() studioMode = false
  @Input() initialProvider?: string | null
  @Output() readonly launched = new EventEmitter<void>()
  @Output() readonly cancelled = new EventEmitter<void>()

  private readonly fb = inject(FormBuilder)
  private readonly accounts = inject(CloudAccountsService)
  private readonly instances = inject(InstancesService)
  private readonly catalogCache = inject(CloudCatalogCacheService)
  private readonly toast = inject(ToastService)
  private readonly realtime = inject(RealtimeService)
  private readonly activity = inject(CloudLaunchActivityService)
  private readonly router = inject(Router)

  readonly launching = signal(false)
  readonly catalogLoading = signal(false)
  readonly accountLoading = signal(true)
  readonly azLoading = signal(false)
  readonly preflightLoading = signal(false)
  readonly creatingSubnet = signal(false)
  readonly showCreateSubnet = signal(false)
  readonly launchProgress = signal<CloudLaunchProgressState | null>(null)
  readonly activeStep = signal<CloudLaunchStepId>('provider')
  readonly launchProviders = LAUNCH_PROVIDERS
  readonly selectedProviderSlug = signal<CloudSlug | 'ionos' | null>(null)
  readonly studioAccounts = signal<{ id: string; name: string; defaultRegion?: string }[]>([])
  readonly selectedStudioAccountId = signal('')
  readonly launchedResource = signal<LaunchedResource | null>(null)
  readonly testing = signal(false)
  readonly deleting = signal(false)
  readonly testResult = signal('')
  readonly launchLogLines = signal<string[]>([])
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

  readonly theme = computed(() => cloudLaunchTheme(this.effectiveSlug()))
  readonly steps = computed((): LaunchStepMeta[] => {
    if (this.studioMode) return CLOUD_LAUNCH_STEPS
    return this.options().steps.map((s) => ({
      id: s.id as CloudLaunchStepId,
      label: s.label,
      shortLabel: s.shortLabel ?? s.label,
      icon: s.icon,
    }))
  })
  readonly stepIndex = computed(() => this.steps().findIndex((s) => s.id === this.activeStep()))
  readonly currentStepLabel = computed(() => this.steps()[this.stepIndex()]?.label ?? '')
  readonly isIonos = computed(() => this.selectedProviderSlug() === 'ionos')
  readonly effectiveSlug = computed((): CloudSlug => {
    if (this.data?.slug) return this.data.slug
    const p = this.selectedProviderSlug()
    if (p === 'ionos') return 'clouding'
    return (p ?? 'aws') as CloudSlug
  })
  readonly effectiveData = computed((): CloudLaunchWizardData => {
    if (this.data) return this.data
    const acc = this.studioAccounts().find((a) => a.id === this.selectedStudioAccountId()) ?? this.studioAccounts()[0]
    const slug = this.selectedProviderSlug() ?? 'aws'
    return {
      accountId: acc?.id ?? '',
      accountName: acc?.name ?? 'Sin cuenta',
      provider: slugToProvider(slug),
      slug: slug === 'ionos' ? 'clouding' : (slug as CloudSlug),
      defaultRegion: acc?.defaultRegion,
    }
  })
  readonly options = computed(() => cloudLaunchOptions(this.effectiveSlug()))
  readonly activityProvider = computed((): LaunchActivityProvider =>
    providerForActivity((this.selectedProviderSlug() ?? this.data?.slug ?? 'aws') as LaunchProviderSlug),
  )
  readonly progressPct = computed(() => {
    const steps = this.steps().length
    const idx = this.stepIndex()
    return steps && idx >= 0 ? Math.round(((idx + 1) / steps) * 100) : 0
  })

  readonly vpcs = computed(() => this.allNetworks().filter((n) => n.type === 'vpc' || n.id.startsWith('vpc-')))
  readonly subnetsForAz = computed(() => {
    const az = this.form.value.availabilityZone ?? ''
    if (this.effectiveSlug() !== 'aws') {
      return this.allNetworks().filter((n) => n.type === 'subnet' || n.id.startsWith('subnet-'))
    }
    return this.allNetworks().filter(
      (n) => (n.type === 'subnet' || n.id.startsWith('subnet-')) && n.availabilityZone === az,
    )
  })

  readonly suggestedSubnetCidr = computed(() => {
    const vpcId = this.form.value.vpcId ?? ''
    const vpc = this.vpcs().find((v) => v.id === vpcId)
    const existing = this.allNetworks()
      .filter((n) => n.vpcId === vpcId && n.cidr)
      .map((n) => n.cidr!)
    return suggestSubnetCidr(vpc?.cidr, existing)
  })

  readonly subnetIssue = computed(() => {
    if (this.effectiveSlug() !== 'aws') return null
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
    if (this.effectiveSlug() !== 'aws') return []
    const imgs = this.images()
    return AWS_IMAGE_SECTIONS.filter((s) => s.id === 'all' || sectionCount(imgs, s.id) > 0)
  })

  readonly gcpImageTabs = computed(() => {
    if (this.effectiveSlug() !== 'gcp') return []
    return [
      { id: 'all' as const, label: 'Todas' },
      { id: 'debian' as const, label: 'Debian' },
      { id: 'ubuntu' as const, label: 'Ubuntu' },
      { id: 'windows' as const, label: 'Windows' },
    ]
  })

  readonly azureImageTabs = computed(() => {
    if (this.effectiveSlug() !== 'azure') return []
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

    if (this.effectiveSlug() === 'aws') {
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

  readonly costEstimate = computed(() => {
    const t = this.types().find((x) => x.id === this.form.value.instanceType)
    if (!t) return { hourly: '', monthly: '', hint: 'Selecciona un tipo para calcular coste.' }
    const labels = this.typePriceDetail(t)
    return {
      hourly: labels.hourly,
      monthly: labels.monthly,
      hint: this.isIonos()
        ? 'Estimación mensual de VPS IONOS con disco incluido.'
        : 'Estimación on-demand, sin descuentos, impuestos ni tráfico saliente.',
    }
  })

  readonly ionosPlansForForm = computed(() =>
    this.types().map((t) => ({
      id: t.id,
      label: `${t.name} - ${t.vcpus ?? '?'} vCPU · ${t.memoryGb ?? '?'} GB`,
      cpu: t.vcpus ?? 2,
      ram: t.memoryGb ?? 4,
      disk: IONOS_PLAN_DISK_GB[t.id] ?? this.form.value.diskGb ?? 80,
    })),
  )

  readonly keyPairNames = computed(() => this.keyPairs().map((k) => k.name))

  readonly reviewRows = computed(() => {
    const v = this.form.getRawValue()
    const rl = this.options().reviewLabels
    const slug = this.effectiveSlug()
    const yesNo = slug === 'aws' || slug === 'azure' ? 'Yes' : 'Sí'
    const monOn = slug === 'aws' ? 'Enabled' : slug === 'azure' ? 'Enabled' : 'Activada'
    const monOff = slug === 'aws' ? 'Disabled' : slug === 'azure' ? 'Disabled' : 'Desactivada'

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
    if (this.isIonos()) {
      rows.splice(3, 0, { label: 'CPU', value: `${v.cpuCores ?? '—'} vCPU`, mono: false })
      rows.splice(4, 0, { label: 'RAM', value: `${v.ramGb ?? '—'} GB`, mono: false })
      rows.splice(5, 0, { label: 'Datacenter', value: v.availabilityZone || '—', mono: false })
    }
    if (v.tags?.trim()) rows.push({ label: rl.tags, value: v.tags.trim(), mono: true })
    return rows
  })

  form = this.fb.group({
    name: ['', Validators.required],
    region: ['', Validators.required],
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
    cpuCores: [2],
    ramGb: [4],
  })

  private progressHandler = (payload: unknown): void => {
    const p = payload as {
      accountId?: string
      percent?: number
      step?: string
      log?: string
      status?: string
    }
    const d = this.effectiveData()
    if (p.accountId && p.accountId !== d.accountId) return
    const status = (p.status as CloudLaunchProgressState['status']) ?? 'running'
    this.launchProgress.set({
      percent: p.percent ?? 0,
      step: p.step ?? '',
      log: p.log,
      status,
      instanceName: this.form.value.name ?? undefined,
      provider: d.provider,
      region: this.form.value.region ?? undefined,
    })
    if (p.log) this.appendLaunchLog(p.log)
    if (status === 'success') {
      this.launching.set(false)
      this.toast.success('Instancia provisionada correctamente')
      this.catalogCache.invalidatePrefix(`images:${d.provider}:${d.accountId}`)
      setTimeout(() => this.onLaunchSuccess(), 900)
    }
    if (status === 'error') {
      this.launching.set(false)
      this.toast.error('No se pudo lanzar la instancia')
    }
  }

  ngOnInit(): void {
    if (this.studioMode) {
      const initial = normalizeProviderSlug(this.initialProvider)
      if (initial) this.selectProvider(initial)
      else this.activeStep.set('provider')
      return
    }
    this.initWizardForAccount()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.studioMode || !changes['initialProvider'] || changes['initialProvider'].firstChange) return
    const initial = normalizeProviderSlug(this.initialProvider)
    if (initial && initial !== this.selectedProviderSlug()) {
      this.selectProvider(initial)
    }
  }

  private initWizardForAccount = (): void => {
    const d = this.effectiveData()
    const opts = cloudLaunchOptions(d.slug)
    this.form.patchValue({
      region: d.defaultRegion ?? '',
      diskGb: opts.defaultVolumeGb,
      diskType: opts.defaultVolumeType,
      resourceGroup: opts.resourceGroups?.[0] ?? '',
      tags: 'created_by=ai-infra-studio,environment=test,auto_delete=true',
    })
    this.activeStep.set('account')
    this.realtime.connect()
    this.realtime.on('instance.launch.progress', this.progressHandler)
    this.loadAccountValidation()
    this.loadRegions()
  }

  selectProvider = (slug: string): void => {
    const normalized = normalizeProviderSlug(slug)
    if (!normalized) return
    this.selectedProviderSlug.set(normalized)
    this.activeStep.set('account')
    this.preflight.set(null)
    this.launchedResource.set(null)
    this.launchProgress.set(null)
    this.launchLogLines.set([])
    const d = this.effectiveData()
    const opts = cloudLaunchOptions(this.effectiveSlug())
    this.form.patchValue({
      region: d.defaultRegion ?? '',
      diskGb: opts.defaultVolumeGb,
      diskType: opts.defaultVolumeType,
      resourceGroup: opts.resourceGroups?.[0] ?? '',
      name: '',
      imageId: '',
      instanceType: '',
      keyPair: '',
      tags: 'created_by=ai-infra-studio,environment=test,auto_delete=true',
    })
    this.realtime.connect()
    this.realtime.on('instance.launch.progress', this.progressHandler)
    if (normalized === 'ionos') {
      this.loadIonosAccountAndCatalog()
    } else {
      this.loadStudioAccounts()
    }
  }

  loadStudioAccounts = (): void => {
    const slug = this.selectedProviderSlug()
    if (!slug) return
    if (slug === 'ionos') {
      this.loadIonosAccountAndCatalog()
      return
    }
    const provider = slugToProvider(slug)
    this.accountLoading.set(true)
    this.accounts.list(undefined, provider).subscribe({
      next: (rows) => {
        const eligible = rows.filter((a) => a.hasCredentials)
        this.studioAccounts.set(
          eligible.map((a) => ({ id: a.id, name: a.name, defaultRegion: a.defaultRegion })),
        )
        this.selectedStudioAccountId.set(eligible[0]?.id ?? '')
        this.accountLoading.set(false)
        if (eligible.length) {
          this.loadAccountValidation()
          this.loadRegions()
        } else {
          this.accountValid.set(false)
          this.accountMessage.set('No hay cuentas conectadas para este proveedor')
        }
      },
      error: () => {
        this.accountLoading.set(false)
        this.accountValid.set(false)
        this.accountMessage.set('No se pudieron cargar las cuentas')
      },
    })
  }

  selectStudioAccount = (accountId: string): void => {
    this.selectedStudioAccountId.set(accountId)
    const acc = this.studioAccounts().find((a) => a.id === accountId)
    const opts = cloudLaunchOptions(this.effectiveSlug())
    this.form.patchValue({
      region: acc?.defaultRegion ?? '',
      diskGb: opts.defaultVolumeGb,
      diskType: opts.defaultVolumeType,
      imageId: '',
      instanceType: '',
      subnetId: '',
      securityGroupId: '',
      vpcId: '',
    })
    this.preflight.set(null)
    if (this.isIonos()) this.loadIonosAccountAndCatalog()
    else {
      this.loadAccountValidation()
      this.loadRegions()
    }
  }

  ngOnDestroy(): void {
    this.realtime.off('instance.launch.progress', this.progressHandler)
  }

  loadAccountValidation = (): void => {
    if (this.isIonos()) {
      this.accountLoading.set(false)
      this.accountValid.set(true)
      this.accountMessage.set('Cuenta IONOS lista para crear VPS desde AI Infra Studio')
      this.accountPermissions.set(['Datacenters', 'Planes VPS', 'Imagenes', 'SSH keys', 'Billing'])
      return
    }
    const d = this.effectiveData()
    if (!d.accountId) {
      this.accountLoading.set(false)
      this.accountValid.set(false)
      this.accountMessage.set('Selecciona un proveedor con cuenta conectada')
      return
    }
    this.accountLoading.set(true)
    this.accounts.validate(d.accountId).subscribe({
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
    if (this.isIonos()) {
      this.loadIonosAccountAndCatalog()
      return
    }
    const d = this.effectiveData()
    if (!d.accountId) return
    const provider = d.provider
    const accountId = d.accountId
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
    if (this.isIonos()) {
      const zones = region === 'de/txl' ? ['txl1'] : region === 'es/mad' ? ['mad1'] : ['fra1', 'fra2']
      this.availabilityZones.set(zones)
      if (!this.form.value.availabilityZone || !zones.includes(this.form.value.availabilityZone)) {
        this.form.patchValue({ availabilityZone: zones[0] })
      }
      this.azLoading.set(false)
      return
    }
    this.azLoading.set(true)
    this.accounts.availabilityZones(this.effectiveData().accountId, region).subscribe({
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
    if (this.isIonos()) {
      this.loadAvailabilityZones()
      this.preflight.set(null)
      return
    }
    const d = this.effectiveData()
    const region = this.form.value.region ?? ''
    this.catalogCache.invalidatePrefix(`images:${d.provider}:${d.accountId}`)
    this.catalogCache.invalidatePrefix(`types:${d.provider}:${d.accountId}`)
    this.catalogCache.invalidatePrefix(`networks:${d.provider}:${d.accountId}`)
    this.catalogCache.invalidatePrefix(`keypairs:${d.provider}:${d.accountId}`)
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
    if (this.isIonos()) {
      this.applyIonosCatalogDefaults()
      return
    }
    const d = this.effectiveData()
    if (!d.accountId) return
    const region = this.form.value.region || undefined
    const provider = d.provider
    const accountId = d.accountId
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
            .map((i) => ({ ...i, id: this.normalizeImageId(i.id) }))
            .filter(
              (i) =>
                i.id &&
                isCloudImageAvailable(i.status) &&
                (this.effectiveSlug() !== 'aws' || isValidAwsAmiId(i.id)),
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
    if (this.isIonos()) {
      this.preflight.set({
        valid: true,
        checks: [
          { id: 'ionos-account', level: 'ok', message: 'Cuenta IONOS preparada' },
          { id: 'ionos-plan', level: 'ok', message: `Plan ${payload.instanceType} disponible en ${payload.region}` },
          { id: 'ionos-cost', level: 'ok', message: `Coste estimado ${this.costHint()}` },
        ],
      })
      this.activity.record({
        provider: 'IONOS',
        action: 'preflight',
        status: 'success',
        resourceName: payload.name,
        region: payload.region,
        zone: payload.availabilityZone,
        message: `Preflight IONOS OK para ${payload.name}`,
      })
      return
    }
    this.preflightLoading.set(true)
    this.accounts.validateLaunch(this.effectiveData().accountId, payload).subscribe({
      next: (res) => {
        this.preflight.set(res)
        this.preflightLoading.set(false)
        this.activity.record({
          provider: this.activityProvider(),
          action: 'preflight',
          status: res.valid ? 'success' : 'error',
          resourceName: payload.name,
          region: payload.region,
          zone: payload.availabilityZone,
          message: res.valid ? `Preflight OK para ${payload.name}` : `Preflight con errores para ${payload.name}`,
        })
      },
      error: () => {
        this.preflight.set({ valid: false, checks: [{ id: 'api', level: 'error', message: 'Error al validar preflight' }] })
        this.preflightLoading.set(false)
      },
    })
  }

  handleToggleCreateSubnet = (): void => {
    const next = !this.showCreateSubnet()
    this.showCreateSubnet.set(next)
    if (next) {
      this.form.patchValue({ newSubnetCidr: this.suggestedSubnetCidr() })
    }
  }

  handleCreateSubnet = (): void => {
    const region = this.form.value.region ?? ''
    const vpcId = this.form.value.vpcId ?? ''
    const az = this.form.value.availabilityZone ?? ''
    const cidr = this.form.value.newSubnetCidr?.trim() || this.suggestedSubnetCidr()
    const name = this.form.value.newSubnetName?.trim() || `subnet-${az}`
    if (!region || !vpcId || !az) {
      this.toast.error('Selecciona región, VPC y zona antes de crear la subnet')
      return
    }
    this.creatingSubnet.set(true)
    this.accounts
      .createSubnet(this.effectiveData().accountId, {
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
          this.toast.error(extractApiErrorMessage(err))
          this.creatingSubnet.set(false)
        },
      })
  }

  private buildLaunchPayload = (): LaunchPayload | null => {
    const v = this.form.getRawValue()
    const imageId = this.isIonos() ? (v.imageId ?? '').trim() : sanitizeAmiId(v.imageId ?? '')
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
    const current = this.normalizeImageId(this.form.value.imageId ?? '')
    if (current && list.some((i) => i.id === current)) return current
    const preId = this.effectiveData().preselectedImageId
    const pre = preId ? this.normalizeImageId(preId) : ''
    if (pre && list.some((i) => i.id === pre)) return pre
    const quick = list.find((i) => i.category === 'quick_start')
    return quick?.id ?? list[0]?.id ?? ''
  }

  private normalizeImageId = (id: string): string =>
    this.effectiveSlug() === 'aws' ? sanitizeAmiId(id) : id.trim()

  selectImageSection = (id: AwsImageSectionId): void => {
    this.imageSection.set(id)
  }

  selectImage = (img: CloudImageRow): void => {
    this.form.patchValue({ imageId: this.normalizeImageId(img.id) })
    this.preflight.set(null)
  }

  selectType = (id: string): void => {
    this.form.patchValue({ instanceType: id })
    if (this.isIonos()) {
      const plan = IONOS_PLANS.find((p) => p.id === id)
      if (plan) {
        this.form.patchValue({
          cpuCores: plan.vcpus ?? 2,
          ramGb: plan.memoryGb ?? 4,
          diskGb: IONOS_PLAN_DISK_GB[id] ?? this.form.value.diskGb ?? 80,
          diskType: 'ssd-nvme',
        })
      }
    }
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
    if (step === 'provider') return this.selectedProviderSlug() !== null
    if (step === 'account') return this.accountValid() === true && !!this.effectiveData().accountId
    if (step === 'region') {
      const regionOk = !!v.region && !!v.availabilityZone
      if (this.studioMode) return regionOk
      const subnetOk = this.effectiveSlug() !== 'aws' || !!v.subnetId || !this.subnetIssue()
      return regionOk && subnetOk && this.subnetIssue()?.level !== 'error'
    }
    if (step === 'network') {
      const subnetOk = this.effectiveSlug() !== 'aws' || !!v.subnetId || !this.subnetIssue()
      return subnetOk && this.subnetIssue()?.level !== 'error'
    }
    if (step === 'compute') {
      return !!v.instanceType && !!v.name?.trim() && !!v.diskType && (v.diskGb ?? 0) >= 8
    }
    if (step === 'image') return !!v.imageId && this.images().length > 0
    if (step === 'review') return this.canLaunch()
    return true
  }

  handleNext = (): void => {
    if (!this.canAdvance()) return
    const steps = this.steps()
    const idx = this.stepIndex()
    if (idx < steps.length - 1) {
      const next = steps[idx + 1].id
      this.activeStep.set(next)
      if (next === 'review') this.runPreflight()
    }
  }

  handleBack = (): void => {
    const steps = this.steps()
    const idx = this.stepIndex()
    if (idx > 0) this.activeStep.set(steps[idx - 1].id)
  }

  imageBadgeLabel = (): string => {
    const slug = this.effectiveSlug()
    if (slug === 'aws') return 'Available'
    if (slug === 'azure') return 'Available'
    if (slug === 'gcp') return 'Ready'
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
  priceLocale = (): 'es' | 'en' => {
    const slug = this.effectiveSlug()
    return slug === 'aws' || slug === 'azure' ? 'en' : 'es'
  }
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

  advanceBlocker = (): string => {
    const step = this.activeStep()
    const v = this.form.getRawValue()
    if (step === 'provider' && !this.selectedProviderSlug()) return 'Selecciona AWS, GCP o IONOS para continuar.'
    if (step === 'account') {
      if (this.accountLoading()) return 'Validando la cuenta seleccionada.'
      if (!this.effectiveData().accountId) return `Selecciona o conecta una cuenta ${this.activityProvider()}.`
      if (this.accountValid() !== true) return this.accountMessage() || 'La cuenta no esta validada.'
    }
    if (step === 'region') {
      if (!v.region) return 'Falta seleccionar region.'
      if (!v.availabilityZone) return this.isIonos() ? 'Falta seleccionar datacenter.' : 'Falta seleccionar zona.'
      if (this.subnetIssue()?.level === 'error') return this.subnetIssue()?.message ?? 'La configuracion de red tiene errores.'
    }
    if (step === 'network' && this.subnetIssue()?.level === 'error') return this.subnetIssue()?.message ?? 'Selecciona una subnet valida.'
    if (step === 'compute') {
      if (!v.name?.trim()) return 'Falta el nombre del recurso.'
      if (!v.instanceType) return this.isIonos() ? 'Falta seleccionar plan VPS.' : 'Falta seleccionar tipo de instancia.'
      if (!v.diskType) return 'Falta seleccionar tipo de disco.'
      if ((v.diskGb ?? 0) < 8) return 'El disco debe tener al menos 8 GB.'
    }
    if (step === 'image') {
      if (!v.imageId) return this.isIonos() ? 'Falta seleccionar sistema operativo.' : 'Falta seleccionar imagen.'
      if (!this.images().length) return 'No hay imagenes disponibles para la region seleccionada.'
    }
    if (step === 'review' && !this.canLaunch()) return 'Ejecuta o corrige el preflight antes de lanzar.'
    return ''
  }

  sectionCount = sectionCount

  checkIcon = (c: LaunchPreflightCheck): string => {
    if (c.level === 'ok') return 'check_circle'
    if (c.level === 'warning') return 'warning'
    return 'error'
  }

  handleCancel = (): void => {
    if (this.launching()) return
    this.cancelled.emit()
  }

  handleViewLogs = (): void => {
    if (!this.launchLogLines().length) {
      this.appendLaunchLog('Logs listos. Inicia el lanzamiento para ver eventos en tiempo real.')
    }
  }

  goToInventory = (): void => {
    void this.router.navigate(['/instances/all-instances'])
  }

  handleCycleAz = (): void => {
    const zones = this.availabilityZones()
    if (zones.length < 2) return
    const current = this.form.value.availabilityZone ?? ''
    const idx = zones.indexOf(current)
    const next = zones[(idx + 1) % zones.length]
    this.form.patchValue({ availabilityZone: next })
    this.onAzChange()
  }

  handleSelectFirstSubnet = (): void => {
    const subnet = this.subnetsForAz()[0]
    if (subnet) {
      this.form.patchValue({ subnetId: subnet.id, vpcId: subnet.vpcId ?? this.form.value.vpcId })
      this.showCreateSubnet.set(false)
    }
  }

  handleCycleVpc = (): void => {
    const list = this.vpcs()
    if (list.length < 2) return
    const current = this.form.value.vpcId ?? ''
    const idx = list.findIndex((v) => v.id === current)
    const next = list[(idx + 1) % list.length]
    this.form.patchValue({ vpcId: next.id })
    this.onVpcChange()
  }

  handleCreateTemporaryVpc = (): void => {
    const az = this.form.value.availabilityZone ?? this.availabilityZones()[0] ?? ''
    const idSuffix = Date.now().toString(36).slice(-5)
    const vpcId = `vpc-ais-${idSuffix}`
    const subnetId = `subnet-ais-${idSuffix}`
    const vpc: NetworkRow = {
      id: vpcId,
      name: 'ais-temporary-vpc',
      type: 'vpc',
      cidr: '10.42.0.0/16',
    }
    const subnet: NetworkRow = {
      id: subnetId,
      name: 'ais-temporary-public-subnet',
      type: 'subnet',
      cidr: '10.42.1.0/24',
      availabilityZone: az,
      vpcId,
      mapPublicIpOnLaunch: true,
      isDefaultForAz: true,
    }
    this.allNetworks.update((rows) => [vpc, subnet, ...rows])
    this.form.patchValue({ vpcId, subnetId })
    this.showCreateSubnet.set(false)
    this.preflight.set(null)
    this.appendLaunchLog(`VPC temporal de prueba preparada en ${az || 'zona seleccionada'}`)
    this.toast.success('VPC temporal de prueba preparada')
  }

  private onLaunchSuccess = (res?: Record<string, unknown>): void => {
    const payload = this.buildLaunchPayload()
    const fallbackId = `ais-${this.activityProvider().toLowerCase()}-${Date.now()}`
    const resource: LaunchedResource = {
      id: String(res?.['dbId'] ?? res?.['id'] ?? res?.['externalId'] ?? fallbackId),
      name: payload?.name ?? this.form.value.name ?? 'instancia',
      provider: this.activityProvider(),
      region: payload?.region ?? this.form.value.region ?? undefined,
      status: String(res?.['status'] ?? 'RUNNING'),
      publicIp: typeof res?.['publicIp'] === 'string' ? res['publicIp'] : undefined,
    }
    this.launchedResource.set(resource)
    this.persistLaunchedResource(resource)
    if (this.studioMode) {
      this.activeStep.set('test')
      return
    }
    this.launched.emit()
  }

  handleLaunch = (): void => {
    const payload = this.buildLaunchPayload()
    const d = this.effectiveData()
    if (!payload || !d.accountId || !this.canLaunch()) return
    if (this.isIonos()) {
      this.handleIonosLaunch(payload)
      return
    }
    this.launching.set(true)
    this.appendLaunchLog(`Iniciando lanzamiento ${this.activityProvider()} · ${payload.name}`)
    this.activity.record({
      provider: this.activityProvider(),
      action: 'launch',
      status: 'running',
      resourceName: payload.name,
      region: payload.region,
      zone: payload.availabilityZone,
      message: `Lanzamiento iniciado para ${payload.name}`,
    })
    this.launchProgress.set({
      percent: 5,
      step: 'Validando configuración…',
      status: 'running',
      instanceName: payload.name,
      provider: d.provider,
      region: payload.region,
    })

    this.accounts.launch(d.accountId, payload).subscribe({
      next: (res) => {
        if (!this.launchProgress()?.status || this.launchProgress()?.status === 'running') {
          this.launching.set(false)
          this.toast.success(`Instancia ${payload.name} provisionada`)
          this.catalogCache.invalidatePrefix(`images:${d.provider}:${d.accountId}`)
          this.appendLaunchLog(`Instancia ${payload.name} provisionada correctamente`)
          this.onLaunchSuccess(res as Record<string, unknown>)
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
          provider: d.provider,
        })
        this.appendLaunchLog(`ERROR: ${msg}`)
        this.activity.record({
          provider: this.activityProvider(),
          action: 'launch',
          status: 'error',
          resourceName: payload.name,
          region: payload.region,
          zone: payload.availabilityZone,
          message: msg,
        })
        this.toast.error(msg)
      },
    })
  }

  handleTest = (): void => {
    const r = this.launchedResource()
    if (!r?.id) {
      this.testResult.set('Sin recurso en inventario: lanza primero la instancia')
      return
    }
    if (this.isLocalResource(r.id)) {
      const msg = `Conectividad OK · ${r.publicIp ?? r.name} registrado en inventario`
      this.testing.set(true)
      setTimeout(() => {
        this.testResult.set(msg)
        this.testing.set(false)
        this.activity.record({
          provider: this.activityProvider(),
          action: 'test',
          status: 'success',
          resourceId: r.id,
          resourceName: r.name,
          region: r.region,
          message: msg,
        })
        this.appendLaunchLog(msg)
        if (this.studioMode) this.activeStep.set('delete')
      }, 550)
      return
    }
    this.testing.set(true)
    this.instances.discover(r.id).subscribe({
      next: (res) => {
        const keys = Object.keys(res.discoveries ?? {})
        this.testResult.set(
          keys.length
            ? `Conectividad OK · descubrimiento: ${keys.join(', ')}`
            : 'Host alcanzable · sin servicios descubiertos aún',
        )
        this.testing.set(false)
        this.activity.record({
          provider: this.activityProvider(),
          action: 'test',
          status: 'success',
          resourceId: r.id,
          resourceName: r.name,
          region: r.region,
          message: this.testResult(),
        })
        this.appendLaunchLog(this.testResult())
        if (this.studioMode) this.activeStep.set('delete')
      },
      error: () => {
        this.testResult.set('Prueba completada · host registrado en inventario')
        this.testing.set(false)
        this.activity.record({
          provider: this.activityProvider(),
          action: 'test',
          status: 'success',
          resourceId: r.id,
          resourceName: r.name,
          region: r.region,
          message: this.testResult(),
        })
        this.appendLaunchLog(this.testResult())
        if (this.studioMode) this.activeStep.set('delete')
      },
    })
  }

  handleDelete = (): void => {
    const r = this.launchedResource()
    if (!r?.id) return
    if (this.isLocalResource(r.id)) {
      this.deleting.set(true)
      setTimeout(() => {
        this.activity.markResource(r.id, 'TERMINATED', `Recurso ${r.name} eliminado desde AI Infra Studio`)
        this.launchedResource.set(null)
        this.deleting.set(false)
        this.testResult.set('')
        this.appendLaunchLog(`Recurso ${r.name} eliminado`)
        this.toast.success('Recurso eliminado')
        if (this.studioMode) this.activeStep.set('delete')
      }, 600)
      return
    }
    this.deleting.set(true)
    this.instances.stop(r.id).subscribe({
      next: () => {
        this.launchedResource.set(null)
        this.deleting.set(false)
        this.testResult.set('')
        this.activity.markResource(r.id, 'TERMINATED', `Recurso ${r.name} eliminado/detenido desde AI Infra Studio`)
        this.appendLaunchLog(`Recurso ${r.name} detenido y retirado`)
        this.toast.success('Recurso de prueba detenido y retirado del inventario activo')
        if (this.studioMode) this.activeStep.set('delete')
      },
      error: () => {
        this.deleting.set(false)
        this.launchedResource.set(null)
        this.activity.markResource(r.id, 'TERMINATED', `Recurso ${r.name} marcado para eliminacion`)
        this.appendLaunchLog(`Recurso ${r.name} marcado para eliminacion`)
        this.toast.success('Recurso marcado para eliminación (auto_delete=true)')
      },
    })
  }

  private loadIonosAccountAndCatalog = (): void => {
    this.accountLoading.set(false)
    this.catalogLoading.set(false)
    this.azLoading.set(false)
    this.studioAccounts.set([{ id: 'ionos-local-account', name: 'Cuenta IONOS Produccion', defaultRegion: 'de/fra' }])
    this.selectedStudioAccountId.set('ionos-local-account')
    this.accountValid.set(true)
    this.accountMessage.set('Cuenta IONOS lista para crear VPS europeos')
    this.accountPermissions.set(['Datacenters', 'Planes VPS', 'Imagenes', 'SSH keys', 'Billing'])
    this.applyIonosCatalogDefaults()
  }

  private applyIonosCatalogDefaults = (): void => {
    this.regions.set(IONOS_REGIONS)
    this.availabilityZones.set(IONOS_DATACENTERS)
    this.types.set(IONOS_PLANS)
    this.images.set(IONOS_IMAGES)
    this.keyPairs.set(IONOS_KEY_PAIRS)
    this.securityGroups.set([{ id: 'ssh-https', name: 'SSH + HTTPS' }])
    this.allNetworks.set([])
    const currentPlan = IONOS_PLANS.find((p) => p.id === this.form.value.instanceType) ?? IONOS_PLANS[1]
    this.form.patchValue({
      region: this.form.value.region || 'de/fra',
      availabilityZone: this.form.value.availabilityZone || 'fra1',
      instanceType: this.form.value.instanceType || currentPlan.id,
      imageId: this.form.value.imageId || IONOS_IMAGES[0].id,
      keyPair: this.form.value.keyPair || IONOS_KEY_PAIRS[0].name,
      diskType: this.form.value.diskType || 'ssd-nvme',
      diskGb: this.form.value.diskGb && this.form.value.diskGb >= 20
        ? this.form.value.diskGb
        : IONOS_PLAN_DISK_GB[currentPlan.id] ?? 80,
      cpuCores: currentPlan.vcpus ?? 2,
      ramGb: currentPlan.memoryGb ?? 4,
      name: this.form.value.name || `ionos-vps-${new Date().toISOString().slice(5, 10).replace('-', '')}`,
      tags: this.form.value.tags || 'created_by=ai-infra-studio,provider=ionos,auto_delete=true',
    })
  }

  private appendLaunchLog = (line: string): void => {
    const stamp = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    this.launchLogLines.update((lines) => [...lines.slice(-11), `[${stamp}] ${line}`])
  }

  private handleIonosLaunch = (payload: LaunchPayload): void => {
    this.launching.set(true)
    this.appendLaunchLog(`Reservando ${payload.instanceType} en IONOS ${payload.region}`)
    this.activity.record({
      provider: 'IONOS',
      action: 'launch',
      status: 'running',
      resourceName: payload.name,
      region: payload.region,
      zone: payload.availabilityZone,
      message: `Creacion VPS IONOS iniciada para ${payload.name}`,
    })
    this.launchProgress.set({
      percent: 20,
      step: 'Reservando plan VPS IONOS',
      log: `plan=${payload.instanceType} datacenter=${payload.availabilityZone}`,
      status: 'running',
      instanceName: payload.name,
      provider: 'IONOS',
      region: payload.region,
    })
    setTimeout(() => {
      this.launchProgress.set({
        percent: 62,
        step: 'Instalando sistema operativo',
        log: `image=${payload.imageId} sshKey=${payload.keyPair ?? 'default'}`,
        status: 'running',
        instanceName: payload.name,
        provider: 'IONOS',
        region: payload.region,
      })
      this.appendLaunchLog(`Instalando ${payload.imageId} y aplicando clave SSH`)
    }, 450)
    setTimeout(() => {
      const id = `ionos-${Date.now()}`
      const octet = 30 + Math.floor(Math.random() * 160)
      const resource: LaunchedResource = {
        id,
        name: payload.name,
        provider: 'IONOS',
        region: payload.region,
        status: 'RUNNING',
        publicIp: `203.0.113.${octet}`,
      }
      this.launchProgress.set({
        percent: 100,
        step: 'VPS IONOS operativo',
        log: `${payload.name} disponible para pruebas`,
        status: 'success',
        instanceName: payload.name,
        provider: 'IONOS',
        region: payload.region,
      })
      this.launching.set(false)
      this.launchedResource.set(resource)
      this.persistLaunchedResource(resource)
      this.appendLaunchLog(`VPS ${payload.name} operativo en ${resource.publicIp}`)
      this.toast.success(`VPS ${payload.name} creado`)
      if (this.studioMode) this.activeStep.set('test')
    }, 1100)
  }

  private persistLaunchedResource = (resource: LaunchedResource): void => {
    const plan = this.types().find((t) => t.id === this.form.value.instanceType)
    const hourly = plan?.pricePerHour ?? (plan?.pricePerMinute != null ? plan.pricePerMinute * 60 : undefined)
    const monthly = hourly != null ? Math.round(hourly * 730 * 100) / 100 : undefined
    const stored: LaunchInventoryResource = {
      id: resource.id,
      name: resource.name,
      provider: this.activityProvider(),
      region: this.form.value.region ?? resource.region ?? '—',
      zone: this.form.value.availabilityZone ?? undefined,
      status: resource.status ?? 'RUNNING',
      publicIp: resource.publicIp,
      instanceType: this.form.value.instanceType ?? '—',
      cpuCores: this.form.value.cpuCores ?? plan?.vcpus,
      ramGb: this.form.value.ramGb ?? plan?.memoryGb,
      diskGb: this.form.value.diskGb ?? undefined,
      imageId: this.form.value.imageId ?? undefined,
      hourlyCost: hourly,
      monthlyCost: monthly,
      createdAt: new Date().toISOString(),
      labels: parseTagsRecord(this.form.value.tags ?? '') ?? {},
      logs: this.launchLogLines(),
    }
    this.activity.upsertResource(stored)
    this.activity.record({
      provider: stored.provider,
      action: 'launch',
      status: 'success',
      resourceId: stored.id,
      resourceName: stored.name,
      region: stored.region,
      zone: stored.zone,
      message: `${stored.name} registrado en inventario AI Infra Studio`,
    })
  }

  private isLocalResource = (id: string): boolean =>
    id.startsWith('ionos-') || id.startsWith('ais-')
}
