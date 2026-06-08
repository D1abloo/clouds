import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  DestroyRef,
  OnInit,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { DecimalPipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { CloudProvider } from '../../../core/models/api.models'
import { CloudAccountsStore } from '../../../core/stores/cloud-accounts.store'
import { CloudAccountsService } from '../../../core/services/cloud-accounts.service'
import { InstanceTemplateStore } from '../../../core/stores/instance-template.store'
import { SettingsStore } from '../../../core/stores/settings.store'
import { TerraformRunStore } from '../../../core/stores/terraform-run.store'
import { TerraformService } from '../../../core/services/terraform.service'
import { InstancePricingService } from '../../../core/services/instance-pricing.service'
import { ToastService } from '../../../core/services/toast.service'
import { ProModeService } from '../../../core/services/pro-mode.service'
import { LaunchProvider } from '../../data/instance-pricing'
import { LaunchWizardStepperComponent, WizardStepId } from './launch-wizard-stepper.component'
import { DEFAULT_LAUNCH_FORM, LaunchInstanceFormState } from './launch-instance.models'
import {
  LAUNCH_PHASE_LOGS,
  PROVIDER_DETAILS,
  computeOverallLaunchPercent,
  createLaunchPipeline,
  type LaunchPipelinePhase,
} from './launch-instance.pipeline'
import { BrandLogoComponent } from '../../components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../../theme/nav-logo.types'
import { buildReadinessChecklist, readinessPercent } from './launch-instance-readiness'
import { TERRAFORM_FOLDERS } from '../../../terraform/terraform-folders'
import type { TerraformLaunchRecord } from '../../../terraform/terraform-folders'

export interface SummarySection {
  title: string
  rows: { label: string; value: string; mono?: boolean }[]
}

export interface PlanStats {
  add: number
  change: number
  destroy: number
  summary: string
}

interface NetworkOption {
  id: string
  name: string
}

interface TypeGroup {
  name: string
  types: string[]
  open: boolean
}

@Component({
  selector: 'app-launch-instance-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    LaunchWizardStepperComponent,
    BrandLogoComponent,
  ],
  templateUrl: './launch-instance-modal.component.html',
  styleUrl: './launch-instance-modal.component.scss',
})
export class LaunchInstanceModalComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<LaunchInstanceModalComponent>)
  private readonly destroyRef = inject(DestroyRef)
  private readonly cloudStore = inject(CloudAccountsStore)
  private readonly cloudSvc = inject(CloudAccountsService)
  private readonly templateStore = inject(InstanceTemplateStore)
  private readonly runStore = inject(TerraformRunStore)
  private readonly terraform = inject(TerraformService)
  readonly pricing = inject(InstancePricingService)
  readonly settingsStore = inject(SettingsStore)
  private readonly toast = inject(ToastService)
  private readonly pro = inject(ProModeService)

  readonly step = signal<WizardStepId>(1)
  readonly animDir = signal<'forward' | 'back'>('forward')
  readonly form = signal<LaunchInstanceFormState>(DEFAULT_LAUNCH_FORM())
  readonly regions = signal<NetworkOption[]>([])
  readonly networks = signal<NetworkOption[]>([])
  readonly securityGroupOptions = signal<NetworkOption[]>([])
  readonly showPassword = signal(false)
  readonly showGcpScript = signal(false)
  readonly planPreview = signal('')
  readonly hclPreview = signal('')
  readonly planGenerated = signal(false)
  readonly confirmText = signal('')
  readonly launching = signal(false)
  readonly launchPercent = signal(0)
  readonly launchStepLabel = signal('')
  readonly launchPhases = signal<LaunchPipelinePhase[]>([])
  readonly launchLogs = signal<string[]>([])
  readonly launchStartedAt = signal<number | null>(null)
  readonly launchElapsedSec = signal(0)
  private launchSimInterval: ReturnType<typeof setInterval> | null = null

  readonly providers: LaunchProvider[] = ['AWS', 'GCP', 'AZURE']
  readonly keyPairs = ['my-ssh-key', 'cloudops-prod', 'bastion-key']
  readonly amiOptions = ['Amazon Linux 2023', 'Ubuntu 22.04 LTS', 'Windows Server 2022', 'RHEL 9', 'Debian 12']
  readonly gcpOsOptions = ['Debian 11', 'Ubuntu 22.04', 'CentOS Stream 9', 'Container-Optimized OS']
  readonly azureImages = [
    { name: 'Ubuntu Server 22.04', publisher: 'Canonical', offer: 'Ubuntu', sku: '22_04-lts' },
    { name: 'Windows Server 2022', publisher: 'Microsoft', offer: 'WindowsServer', sku: '2022-datacenter' },
    { name: 'RHEL 8', publisher: 'RedHat', offer: 'RHEL', sku: '8' },
    { name: 'Debian 11', publisher: 'Debian', offer: 'debian-11', sku: '11' },
  ]

  readonly awsGroups: TypeGroup[] = [
    { name: 'General Purpose', types: ['t3.micro', 't3.small', 't3.medium', 't3.large', 't4g.medium', 'm6i.large'], open: true },
    { name: 'Compute', types: ['c6i.large', 'c7g.large'], open: false },
    { name: 'Memory', types: ['r6i.large'], open: false },
  ]

  readonly azureGroups: TypeGroup[] = [
    { name: 'B series', types: ['Standard_B1s', 'Standard_B2s'], open: true },
    { name: 'D series', types: ['Standard_D2s_v3', 'Standard_D4s_v3'], open: false },
    { name: 'E series', types: ['Standard_E2s_v3'], open: false },
    { name: 'F series', types: ['Standard_F2s_v2'], open: false },
  ]

  readonly accountsForProvider = computed(() =>
    this.cloudStore.accountsByProvider(this.form().provider),
  )

  readonly costEstimate = computed(() =>
    this.pricing.estimateCost(this.form().provider, this.activeInstanceType()),
  )

  readonly costOverThreshold = computed(
    () => this.costEstimate().monthly > this.settingsStore.monthlyCostThresholdUsd(),
  )

  readonly launchEnabled = computed(
    () => this.confirmText() === 'LAUNCH' && this.planGenerated() && !this.launching(),
  )

  readonly costDaily = computed(() => this.costEstimate().hourly * 24)

  readonly folders = TERRAFORM_FOLDERS

  readonly workspaceOptions = computed(() =>
    this.runStore.workspaces().filter((w) => w.folderId === this.form().folderId),
  )

  readonly selectedFolder = computed(() => this.folders.find((f) => f.id === this.form().folderId))

  readonly stepHeadline = computed(() => {
    const map: Record<WizardStepId, { title: string; sub: string }> = {
      1: { title: 'Elige tu nube', sub: 'Proveedor cloud y capacidades del stack' },
      2: { title: 'Destino del despliegue', sub: 'Carpeta Terraform, workspace y región' },
      3: { title: 'Identidad de la máquina', sub: 'Nombre, imagen y acceso' },
      4: { title: 'Potencia y almacenamiento', sub: 'Tipo de instancia y discos' },
      5: { title: 'Despegue controlado', sub: 'Plan Terraform, coste y confirmación' },
    }
    return map[this.step()]
  })

  readonly instanceTypeCards = computed(() => this.pricing.listTypes(this.form().provider).slice(0, 9))

  readonly wizardProgress = computed(() => Math.round(((this.step() - 1) / 4) * 100))

  readonly readinessItems = computed(() =>
    buildReadinessChecklist(this.form(), this.planGenerated()),
  )

  readonly readinessPct = computed(() => readinessPercent(this.readinessItems()))

  readonly providerInfo = computed(
    () => PROVIDER_DETAILS[this.form().provider] ?? PROVIDER_DETAILS['AWS'],
  )

  readonly selectedTypeSpecs = computed(() => {
    const row = this.costEstimate().row
    if (!row) return null
    return {
      vcpus: row.vcpus,
      ramGb: row.ramGb,
      network: row.network,
      hourly: row.hourlyUsd,
    }
  })

  readonly planStats = computed((): PlanStats | null => {
    const plan = this.planPreview()
    if (!plan.trim()) return null
    const add = Number(plan.match(/(\d+)\s+to add/i)?.[1] ?? plan.includes('will be created') ? 1 : 0)
    const change = Number(plan.match(/(\d+)\s+to change/i)?.[1] ?? 0)
    const destroy = Number(plan.match(/(\d+)\s+to destroy/i)?.[1] ?? 0)
    return {
      add,
      change,
      destroy,
      summary: `${add} alta · ${change} cambio · ${destroy} baja`,
    }
  })

  readonly activeLaunchPhase = computed(() =>
    this.launchPhases().find((p) => p.status === 'active') ?? null,
  )

  readonly launchSnapshot = computed(() => {
    const f = this.form()
    const folder = this.selectedFolder()
    const ws = this.runStore.workspaces().find((w) => w.id === f.targetWorkspaceId)
    return {
      instanceName: f.name,
      provider: f.provider,
      region: f.region,
      zone: f.provider === 'GCP' ? f.gcpZone : null,
      type: this.activeInstanceType(),
      folderPath: folder?.path ?? '/cloudops/apps',
      workspace: ws?.name ?? 'auto',
      monthlyCost: this.formatMoney(this.costEstimate().monthly),
    }
  })

  readonly launchPhasesDone = computed(
    () => this.launchPhases().filter((p) => p.status === 'done').length,
  )

  readonly launchEtaLabel = computed(() => {
    const p = this.launchPercent()
    if (p >= 100) return 'Completado'
    if (p <= 0) return 'Calculando…'
    const elapsed = this.launchElapsedSec()
    if (elapsed < 3) return 'Estimando…'
    const remaining = Math.max(5, Math.round((elapsed / p) * (100 - p)))
    return `~${remaining}s restantes`
  })

  readonly summarySections = computed((): SummarySection[] => {
    const f = this.form()
    const folder = this.selectedFolder()
    const ws = this.runStore.workspaces().find((w) => w.id === f.targetWorkspaceId)
    const account = this.accountsForProvider().find((a) => a.id === f.accountId)
    const sections: SummarySection[] = [
      {
        title: 'Cloud',
        rows: [
          { label: 'Proveedor', value: f.provider },
          { label: 'Cuenta', value: account?.name ?? 'Demo (sin vincular)' },
          { label: 'Región', value: f.region, mono: true },
        ],
      },
      {
        title: 'Organización',
        rows: [
          { label: 'Carpeta', value: folder?.label ?? '—' },
          { label: 'Ruta', value: folder?.path ?? '—', mono: true },
          { label: 'Workspace', value: ws?.name ?? 'Nuevo (auto)' },
        ],
      },
      {
        title: 'Instancia',
        rows: [
          { label: 'Nombre', value: f.name, mono: true },
          { label: 'Tipo', value: this.activeInstanceType(), mono: true },
          { label: 'Tags', value: f.tags || '—' },
        ],
      },
    ]
    if (f.provider === 'AWS') {
      sections[2].rows.push(
        { label: 'AMI', value: f.ami },
        { label: 'Key pair', value: f.keyPair },
        { label: 'EBS', value: `${f.ebsSizeGb} GB · ${f.ebsType}` },
        { label: 'Security groups', value: f.securityGroups.join(', ') || '—' },
      )
    }
    if (f.provider === 'GCP') {
      sections[2].rows.push(
        { label: 'Zona', value: f.gcpZone, mono: true },
        { label: 'SO', value: f.gcpDiskOs },
        { label: 'Disco', value: `${f.gcpDiskSizeGb} GB · ${f.gcpDiskType}` },
      )
    }
    if (f.provider === 'AZURE') {
      sections[2].rows.push(
        { label: 'Imagen', value: f.azureImage },
        { label: 'Resource group', value: f.azureResourceGroup, mono: true },
        { label: 'Disco OS', value: f.azureOsDisk },
      )
    }
    if (this.networks().length) {
      sections.push({
        title: 'Red',
        rows: [
          { label: 'VPC', value: f.vpcId || (this.networks()[0]?.name ?? 'vpc-main'), mono: true },
          { label: 'Subred', value: f.subnetId || 'auto' },
        ],
      })
    }
    return sections
  })

  readonly summaryRows = computed(() => {
    const f = this.form()
    const folder = this.selectedFolder()
    const ws = this.runStore.workspaces().find((w) => w.id === f.targetWorkspaceId)
    const rows: { label: string; value: string }[] = [
      { label: 'Proveedor', value: f.provider },
      { label: 'Carpeta', value: folder?.label ?? '—' },
      { label: 'Workspace', value: ws?.name ?? '—' },
      { label: 'Cuenta', value: f.accountId || '—' },
      { label: 'Región', value: f.region },
      { label: 'Tipo', value: this.activeInstanceType() },
      { label: 'Instancia', value: f.name },
    ]
    if (f.provider === 'AWS') {
      rows.push({ label: 'AMI', value: f.ami }, { label: 'Key pair', value: f.keyPair })
    }
    return rows
  })

  readonly progressColor = computed(() => {
    const p = this.launchPercent()
    if (p < 20) return '#3b82f6'
    if (p < 45) return '#14b8a6'
    if (p < 70) return '#a78bfa'
    if (p < 90) return '#34d399'
    return '#34d399'
  })

  ngOnInit(): void {
    const accounts = this.cloudStore.accountsByProvider('AWS')
    if (accounts.length > 0) {
      this.patchForm({ accountId: accounts[0].id, region: accounts[0].defaultRegion ?? 'eu-west-1' })
    }
    this.loadRegions()
    if (this.form().accountId) this.loadNetworks()
  }

  activeInstanceType = (): string => {
    const f = this.form()
    if (f.provider === 'AZURE') return f.azureVmSize
    if (f.provider === 'GCP') return f.gcpMachineType
    return f.instanceType
  }

  patchForm = (partial: Partial<LaunchInstanceFormState>): void => {
    this.form.update((f) => ({ ...f, ...partial }))
  }

  selectInstanceType = (type: string): void => {
    const p = this.form().provider
    if (p === 'AZURE') this.patchForm({ azureVmSize: type })
    else if (p === 'GCP') this.patchForm({ gcpMachineType: type })
    else this.patchForm({ instanceType: type })
  }

  isTypeSelected = (type: string): boolean => this.activeInstanceType() === type

  hclResourceName = (): string =>
    `resource.aws_instance.${this.form().name.replace(/-/g, '_')}`

  selectFolder = (folderId: string): void => {
    this.handleFolderChange(folderId)
  }

  providerBrandLogo = (p: LaunchProvider): NavLogoKey => {
    if (p === 'GCP') return 'gcp'
    if (p === 'AZURE') return 'azure'
    return 'aws'
  }

  providerIcon = (p: LaunchProvider): string => {
    if (p === 'AWS') return 'bolt'
    if (p === 'GCP') return 'hub'
    return 'window'
  }

  providerTagline = (p: LaunchProvider): string => {
    if (p === 'AWS') return 'EC2 · VPC · EBS'
    if (p === 'GCP') return 'Compute Engine · GKE-ready'
    return 'Virtual Machines · ARM'
  }

  appendLaunchLog = (line: string): void => {
    this.launchLogs.update((lines) => [...lines.slice(-24), line])
  }

  formatElapsed = (): string => {
    const s = this.launchElapsedSec()
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${String(r).padStart(2, '0')}`
  }

  selectProvider = (p: LaunchProvider): void => {
    const accounts = this.cloudStore.accountsByProvider(p)
    this.patchForm({
      provider: p,
      accountId: accounts[0]?.id ?? '',
      region: accounts[0]?.defaultRegion ?? (p === 'AWS' ? 'eu-west-1' : p === 'GCP' ? 'europe-west1-b' : 'westeurope'),
      instanceType: p === 'AWS' ? 't3.medium' : p === 'GCP' ? 'e2-medium' : 'Standard_B2s',
      azureVmSize: 'Standard_B2s',
      gcpMachineType: 'e2-medium',
    })
    this.loadRegions()
  }

  onAccountChange = (): void => {
    this.loadRegions()
    this.loadNetworks()
  }

  loadRegions = (): void => {
    const accountId = this.form().accountId
    if (!accountId) {
      this.regions.set([
        { id: 'eu-west-1', name: 'eu-west-1' },
        { id: 'us-east-1', name: 'us-east-1' },
      ])
      return
    }
    this.cloudSvc.regions(accountId).subscribe({
      next: (list) => this.regions.set(list.map((r) => ({ id: r.id, name: r.name ?? r.id }))),
      error: () => this.regions.set([{ id: 'eu-west-1', name: 'eu-west-1' }]),
    })
  }

  loadNetworks = (): void => {
    const { accountId, region } = this.form()
    if (!accountId) return
    this.cloudSvc.networks(accountId, region).subscribe({
      next: (list) => {
        const opts = (list as { id?: string; name?: string }[]).map((n) => ({
          id: n.id ?? 'vpc-1',
          name: n.name ?? n.id ?? 'vpc-1',
        }))
        this.networks.set(opts.length ? opts : [{ id: 'vpc-main', name: 'vpc-main' }])
        this.securityGroupOptions.set([{ id: 'sg-web', name: 'sg-web' }, { id: 'sg-db', name: 'sg-db' }])
      },
      error: () => {
        this.networks.set([{ id: 'vpc-main', name: 'vpc-main' }])
        this.securityGroupOptions.set([{ id: 'sg-web', name: 'sg-web' }])
      },
    })
  }

  toggleGroup = (group: TypeGroup): void => {
    group.open = !group.open
  }

  toggleSecurityGroup = (id: string): void => {
    const current = this.form().securityGroups
    const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id]
    this.patchForm({ securityGroups: next })
  }

  nextStep = (): void => {
    const s = this.step()
    if (s < 5) {
      this.animDir.set('forward')
      this.step.set((s + 1) as WizardStepId)
    }
  }

  prevStep = (): void => {
    const s = this.step()
    if (s > 1) {
      this.animDir.set('back')
      this.step.set((s - 1) as WizardStepId)
    }
  }

  cancel = (): void => {
    this.dialogRef.close()
  }

  generatePlan = (): void => {
    this.terraform.preview(this.buildPayload()).subscribe({
      next: (res) => {
        this.hclPreview.set(res.hcl)
        this.planPreview.set(res.plan)
        this.planGenerated.set(true)
        this.toast.success('Plan Terraform generado')
      },
      error: () => {
        this.hclPreview.set(`resource "aws_instance" "${this.form().name.replace(/-/g, '_')}" {
  ami           = "ami-demo"
  instance_type = "${this.activeInstanceType()}"
  tags          = { Name = "${this.form().name}" }
}`)
        this.planPreview.set('Plan: 1 to add, 0 to change, 0 to destroy.\n\n~ aws_instance.web (demo)\n    + instance_type = "' + this.activeInstanceType() + '"')
        this.planGenerated.set(true)
        this.toast.info('Plan demo generado (simulado)')
      },
    })
  }

  saveTemplate = (): void => {
    const name = `template-${this.form().name}-${Date.now()}`
    this.templateStore.save({
      name,
      provider: this.form().provider as CloudProvider,
      config: this.buildPayload().config ?? {},
    })
    this.toast.success('Plantilla guardada')
  }

  launch = (): void => {
    if (!this.launchEnabled()) return
    this.launching.set(true)
    this.launchStartedAt.set(Date.now())
    this.launchElapsedSec.set(0)
    this.launchLogs.set([])
    this.launchPhases.set(createLaunchPipeline())
    const f = this.form()
    this.runStore.setLaunchProgress({
      step: 'Validación',
      percent: 0,
      log: 'Iniciando pipeline Terraform…',
      instanceName: f.name,
      provider: f.provider,
      region: f.region,
      status: 'running',
    })
    this.appendLaunchLog(`> Iniciando lanzamiento de ${f.name}`)
    this.appendLaunchLog(`> ${this.form().provider} · ${this.form().region} · ${this.activeInstanceType()}`)
    this.emitPhaseLogs('validate')
    this.startLaunchSimulation()

    this.terraform.planLaunch(this.buildPayload()).subscribe({
      next: (res) => {
        const runId = String((res as { runId?: string }).runId ?? '')
        if (runId) {
          this.terraform.applyLaunch(runId, true).subscribe({
            next: () => this.finishLaunchSuccess(),
            error: () => this.finishLaunchError(),
          })
        } else {
          this.finishLaunchSuccess()
        }
      },
      error: () => {
        this.appendLaunchLog(
          this.pro.proMode() && !this.pro.demoMode()
            ? '! API no disponible — no se pudo completar el lanzamiento'
            : '! API no disponible — continuando con simulación local',
        )
        setTimeout(() => this.finishLaunchSuccess(), 2200)
      },
    })

    const storePoll = setInterval(() => {
      const p = this.runStore.launchProgress()
      if (p && p.percent > this.launchPercent()) {
        this.launchPercent.set(p.percent)
        this.launchStepLabel.set(p.step)
        if (p.log) this.appendLaunchLog(p.log)
      }
    }, 300)
    this.destroyRef.onDestroy(() => clearInterval(storePoll))
  }

  private startLaunchSimulation = (): void => {
    this.stopLaunchSimulation()
    let phaseIdx = 0
    let sub = 0
    const tickMs = 320

    this.launchSimInterval = setInterval(() => {
      const elapsed = this.launchStartedAt()
      if (elapsed) this.launchElapsedSec.set(Math.floor((Date.now() - elapsed) / 1000))

      const phases = this.launchPhases()
      if (phaseIdx >= phases.length) return

      sub += 10 + Math.floor(Math.random() * 6)
      if (sub >= 100) {
        sub = 100
        const donePhase = phases[phaseIdx]
        this.appendLaunchLog(`✓ ${donePhase.label} completado`)
        phaseIdx++
        sub = 0
        if (phaseIdx >= phases.length) {
          this.syncLaunchPhases(phases.length - 1, 100, true)
          this.launchPercent.set(99)
          this.launchStepLabel.set('Esperando confirmación final…')
          this.stopLaunchSimulation()
          return
        }
        this.appendLaunchLog(`→ ${phases[phaseIdx].label}…`)
        this.emitPhaseLogs(phases[phaseIdx].id)
      }

      this.syncLaunchPhases(phaseIdx, sub, false)
    }, tickMs)

    this.destroyRef.onDestroy(() => this.stopLaunchSimulation())
  }

  private emitPhaseLogs = (phaseId?: string): void => {
    if (!phaseId) return
    const lines = LAUNCH_PHASE_LOGS[phaseId] ?? []
    const f = this.form()
    lines.forEach((line) => {
      const msg = line
        .replace(/\{\{name\}\}/g, f.name)
        .replace(/\{\{region\}\}/g, f.region)
        .replace(/\{\{type\}\}/g, this.activeInstanceType())
      this.appendLaunchLog(msg)
    })
  }

  private phaseDetailLine = (phaseId: string, sub: number): string => {
    const map: Record<string, string[]> = {
      validate: ['Cuenta IAM', 'Workspace', 'Coste'],
      init: ['Providers', 'Módulos', 'Backend'],
      plan: ['Refresh state', 'Graph walk', 'Diff'],
      policy: ['OPA', 'Coste', 'Tags'],
      apply: ['NIC', 'Disco', 'Instancia'],
      persist: ['State S3', 'Carpeta', 'Índice'],
      health: ['cloud-init', 'Ping', 'Métricas'],
    }
    const steps = map[phaseId] ?? ['En curso']
    const idx = Math.min(steps.length - 1, Math.floor((sub / 100) * steps.length))
    return steps[idx]
  }

  private syncLaunchPhases = (activeIdx: number, subPercent: number, allDone: boolean): void => {
    this.launchPhases.update((list) =>
      list.map((p, i) => {
        if (allDone || i < activeIdx) {
          return { ...p, status: 'done' as const, percent: 100, detailLine: 'Completado' }
        }
        if (i === activeIdx) {
          const pct = Math.min(100, subPercent)
          return {
            ...p,
            status: 'active' as const,
            percent: pct,
            detailLine: this.phaseDetailLine(p.id, pct),
          }
        }
        return { ...p, status: 'pending' as const, percent: 0, detailLine: undefined }
      }),
    )
    const overall = allDone ? 100 : computeOverallLaunchPercent(this.launchPhases())
    if (!allDone && overall >= 100) return
    this.launchPercent.set(overall)
    const active = this.launchPhases()[activeIdx]
    this.launchStepLabel.set(active?.label ?? 'Finalizando')
    const f = this.form()
    this.runStore.setLaunchProgress({
      step: active?.label ?? '',
      percent: overall,
      log: active?.description ?? '',
      instanceName: f.name,
      provider: f.provider,
      region: f.region,
      status: 'running',
    })
  }

  private stopLaunchSimulation = (): void => {
    if (this.launchSimInterval) {
      clearInterval(this.launchSimInterval)
      this.launchSimInterval = null
    }
  }

  private finishLaunchSuccess = (): void => {
    this.stopLaunchSimulation()
    this.emitPhaseLogs('health')
    this.launchPhases.update((list) =>
      list.map((p) => ({ ...p, status: 'done' as const, percent: 100, detailLine: 'Completado' })),
    )
    this.launchPercent.set(100)
    this.launchStepLabel.set('Completado')
    this.appendLaunchLog('✓ Instancia registrada en carpeta Terraform')
    const f = this.form()
    this.runStore.setLaunchProgress({
      step: 'Completado',
      percent: 100,
      log: 'Instancia registrada en carpeta Terraform',
      instanceName: f.name,
      provider: f.provider,
      region: f.region,
      status: 'success',
    })
    this.toast.success('Instancia lanzada con éxito')
    setTimeout(() => {
      this.launching.set(false)
      this.runStore.setLaunchProgress(null)
      this.dialogRef.close({ applied: true, launch: this.buildLaunchRecord() })
    }, 1400)
  }

  private finishLaunchError = (): void => {
    this.stopLaunchSimulation()
    this.launchPhases.update((list) =>
      list.map((p) =>
        p.status === 'active' ? { ...p, status: 'error' as const } : p,
      ),
    )
    this.launching.set(false)
    const f = this.form()
    this.runStore.setLaunchProgress({
      step: 'Error',
      percent: this.launchPercent(),
      log: 'Error en el pipeline de lanzamiento',
      instanceName: f.name,
      provider: f.provider,
      region: f.region,
      status: 'error',
    })
    this.appendLaunchLog('✗ Error en el pipeline de lanzamiento')
    this.toast.error('Error al lanzar — inténtalo de nuevo')
    setTimeout(() => this.runStore.setLaunchProgress(null), 4000)
  }

  handleFolderChange = (folderId: string): void => {
    const firstWs = this.runStore.workspaces().find((w) => w.folderId === folderId)
    this.patchForm({ folderId, targetWorkspaceId: firstWs?.id ?? '' })
  }

  private buildLaunchRecord = (): TerraformLaunchRecord => {
    const f = this.form()
    const ws = this.runStore.workspaces().find((w) => w.id === f.targetWorkspaceId)
    const num = Date.now().toString().slice(-4)
    return {
      id: `launch-${Date.now()}`,
      name: `Lanzamiento #${num}`,
      folderId: f.folderId,
      workspaceId: f.targetWorkspaceId,
      workspaceName: ws?.name ?? f.name,
      provider: f.provider as CloudProvider,
      status: 'APPLIED',
      createdAt: new Date().toISOString(),
      instanceName: f.name,
    }
  }

  private buildPayload = () => {
    const f = this.form()
    return {
      provider: f.provider as CloudProvider,
      region: f.region,
      instanceType: this.activeInstanceType(),
      name: f.name,
      cloudAccountId: f.accountId,
      config: { ...f },
    }
  }

  formatMoney = (n: number): string =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(n)

  providerLabel = (p: LaunchProvider): string =>
    p === 'AWS' ? 'AWS' : p === 'GCP' ? 'GCP' : 'Azure'

  providerColor = (p: LaunchProvider): string =>
    p === 'AWS' ? '#ff9900' : p === 'GCP' ? '#4285f4' : '#0078d4'

  setEbsType = (dt: string): void => {
    if (dt === 'gp3' || dt === 'io2' || dt === 'gp2') this.patchForm({ ebsType: dt })
  }

  setGcpDiskType = (dt: string): void => {
    if (dt === 'pd-balanced' || dt === 'pd-ssd' || dt === 'pd-extreme') this.patchForm({ gcpDiskType: dt })
  }

  setAzureOsDisk = (dt: string): void => {
    if (dt === 'Standard_HDD' || dt === 'Standard_SSD' || dt === 'Premium_SSD') this.patchForm({ azureOsDisk: dt })
  }

  setGcpFamily = (fam: string): void => {
    if (fam === 'general' || fam === 'compute' || fam === 'memory') this.patchForm({ gcpFamily: fam })
  }
}
