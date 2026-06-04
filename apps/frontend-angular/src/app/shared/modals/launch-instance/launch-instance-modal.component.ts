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
import { LaunchProvider } from '../../data/instance-pricing'
import { LaunchWizardStepperComponent, WizardStepId } from './launch-wizard-stepper.component'
import { DEFAULT_LAUNCH_FORM, LaunchInstanceFormState } from './launch-instance.models'

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
  readonly confirmText = signal('')
  readonly launching = signal(false)
  readonly launchPercent = signal(0)
  readonly launchStepLabel = signal('')
  readonly selectedProviderAnim = signal<LaunchProvider | null>(null)

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

  readonly launchEnabled = computed(() => this.confirmText() === 'LAUNCH')

  readonly summaryRows = computed(() => {
    const f = this.form()
    const rows: { label: string; value: string }[] = [
      { label: 'Provider', value: f.provider },
      { label: 'Account', value: f.accountId || '—' },
      { label: 'Region', value: f.region },
      { label: 'Instance type', value: this.activeInstanceType() },
      { label: 'Name', value: f.name },
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

  selectProvider = (p: LaunchProvider): void => {
    this.selectedProviderAnim.set(p)
    setTimeout(() => this.selectedProviderAnim.set(null), 200)
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
    if (s < 4) {
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
      },
      error: () => {
        this.hclPreview.set('module "web_instance" { source = "../../modules/aws/instance" }')
        this.planPreview.set('Plan: 1 to add, 0 to change, 0 to destroy.')
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
    this.toast.success('Template saved')
  }

  launch = (): void => {
    if (!this.launchEnabled()) return
    this.launching.set(true)
    this.launchPercent.set(5)
    this.launchStepLabel.set('Initializing')
    this.terraform.planLaunch(this.buildPayload()).subscribe({
      next: (res) => {
        const runId = String((res as { runId?: string }).runId ?? '')
        if (runId) {
          this.terraform.applyLaunch(runId, true).subscribe({
            next: () => {
              this.launchPercent.set(100)
              this.launchStepLabel.set('Done')
              this.toast.success('Instance launched')
              this.dialogRef.close({ applied: true })
            },
            error: () => this.finishLaunchError(),
          })
        } else {
          this.launchPercent.set(100)
          this.dialogRef.close({ applied: true })
        }
      },
      error: () => this.finishLaunchError(),
    })
    this.runStore.launchProgress
    // progress via store subscription
    const sub = () => {
      const p = this.runStore.launchProgress()
      if (p) {
        this.launchPercent.set(p.percent)
        this.launchStepLabel.set(p.step)
      }
    }
    const id = setInterval(() => {
      const p = this.runStore.launchProgress()
      if (p) {
        this.launchPercent.set(p.percent)
        this.launchStepLabel.set(p.step)
      }
    }, 300)
    this.destroyRef.onDestroy(() => clearInterval(id))
  }

  private finishLaunchError = (): void => {
    this.launching.set(false)
    this.toast.error('Launch failed — try again')
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
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

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
