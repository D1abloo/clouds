import { Component, inject, signal, computed, DestroyRef } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { CloudProvider } from '../../../core/models/api.models'
import { CloudAccountsService } from '../../../core/services/cloud-accounts.service'
import { TerraformService } from '../../../core/services/terraform.service'
import { ToastService } from '../../../core/services/toast.service'
import { ENVIRONMENT_OPTIONS, LaunchCloudProvider, PROVIDER_LAUNCH_META, WIZARD_STEPS } from '../terraform-launch.config'
import { CloudAccountSelectorComponent } from './cloud-account-selector.component'
import { RegionSelectorComponent } from './region-selector.component'
import { InstanceTemplateSelectorComponent } from './instance-template-selector.component'
import { ProviderSpecificOptionsComponent } from './provider-specific-options.component'
import { CostEstimateCardComponent, CostEstimate } from './cost-estimate-card.component'
import { TerraformPlanViewerComponent } from './terraform-plan-viewer.component'
import { TerraformLogsViewerComponent } from './terraform-logs-viewer.component'

@Component({
  selector: 'app-launch-instance-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    CloudAccountSelectorComponent,
    RegionSelectorComponent,
    InstanceTemplateSelectorComponent,
    ProviderSpecificOptionsComponent,
    CostEstimateCardComponent,
    TerraformPlanViewerComponent,
    TerraformLogsViewerComponent,
  ],
  template: `
    <div class="launch-modal">
      <header class="launch-modal__header">
        <div>
          <h2>Launch instance with Terraform</h2>
          <p>Multi-cloud provisioning wizard — plan before apply</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Close"><mat-icon>close</mat-icon></button>
      </header>

      <nav class="wizard-steps" aria-label="Wizard progress">
        @for (s of steps; track s.id) {
          <button
            type="button"
            class="wizard-step"
            [class.active]="step() === s.id"
            [class.done]="step() > s.id"
            (click)="goToStep(s.id)"
          >
            <span class="wizard-step__icon"><mat-icon>{{ s.icon }}</mat-icon></span>
            <span class="wizard-step__label">{{ s.label }}</span>
          </button>
        }
      </nav>

      <mat-dialog-content class="launch-modal__body">
        @if (step() === 0) {
          <div class="provider-grid animate-fade-in">
            @for (p of providers; track p.id) {
              <button
                type="button"
                class="provider-card"
                [class.selected]="provider() === p.id"
                [style.--accent]="p.accent"
                (click)="selectProvider(p.id)"
              >
                <mat-icon>{{ p.icon }}</mat-icon>
                <strong>{{ p.label }}</strong>
                <span>{{ p.subtitle }}</span>
              </button>
            }
          </div>
        }

        @if (step() === 1) {
          <div class="form-section animate-fade-in" [formGroup]="form">
            <app-instance-template-selector
              [providerFilter]="provider()"
              (templateSelected)="applyTemplate($event)"
            />
            <app-cloud-account-selector [provider]="provider()" formControlName="accountId" />
            <div class="field-row">
              <app-region-selector [accountId]="form.value.accountId ?? ''" formControlName="region" />
              @if (provider() === 'GCP') {
                <mat-form-field appearance="outline"><mat-label>Zone</mat-label><input matInput formControlName="zone" /></mat-form-field>
              }
              @if (provider() === 'AZURE') {
                <mat-form-field appearance="outline"><mat-label>Resource Group</mat-label><input matInput formControlName="resourceGroup" /></mat-form-field>
              }
            </div>
            <mat-form-field appearance="outline" class="full"><mat-label>{{ networkLabel() }}</mat-label>
              <mat-select formControlName="networkId">
                @for (n of networks(); track n.id) { <mat-option [value]="n.id">{{ n.name ?? n.id }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full"><mat-label>Subnet</mat-label>
              <mat-select formControlName="subnetId">
                @for (n of networks(); track n.id) { <mat-option [value]="n.id">{{ n.name ?? n.id }}</mat-option> }
              </mat-select>
            </mat-form-field>
          </div>
        }

        @if (step() === 2) {
          <div class="form-section animate-fade-in" [formGroup]="form">
            <div class="field-row">
              <mat-form-field appearance="outline"><mat-label>Instance name</mat-label><input matInput formControlName="name" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Count</mat-label><input matInput type="number" formControlName="count" min="1" max="20" /></mat-form-field>
            </div>
            <div class="field-row">
              <mat-form-field appearance="outline"><mat-label>{{ instanceTypeLabel() }}</mat-label>
                <mat-select formControlName="instanceType">
                  @for (t of instanceTypes(); track t.id) { <mat-option [value]="t.id">{{ t.name ?? t.id }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>{{ imageLabel() }}</mat-label>
                <mat-select formControlName="imageId">
                  @for (img of images(); track img.id) { <mat-option [value]="img.id">{{ img.name ?? img.id }}</mat-option> }
                </mat-select>
              </mat-form-field>
            </div>
            <div class="field-row">
              <mat-form-field appearance="outline"><mat-label>vCPU</mat-label><input matInput type="number" formControlName="cpu" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>RAM (GB)</mat-label><input matInput type="number" formControlName="ramGb" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Disk (GB)</mat-label><input matInput type="number" formControlName="diskGb" /></mat-form-field>
            </div>
            <div class="field-row">
              <mat-form-field appearance="outline"><mat-label>Disk type</mat-label>
                <mat-select formControlName="diskType"><mat-option value="gp3">gp3 / pd-ssd</mat-option><mat-option value="gp2">gp2</mat-option><mat-option value="Premium_LRS">Premium_LRS</mat-option></mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Environment</mat-label>
                <mat-select formControlName="environment">
                  @for (e of environments; track e) { <mat-option [value]="e">{{ e }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Internal project</mat-label><input matInput formControlName="internalProject" /></mat-form-field>
            </div>
            <div class="field-row">
              <mat-form-field appearance="outline"><mat-label>SSH user</mat-label><input matInput formControlName="sshUser" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>SSH key name</mat-label><input matInput formControlName="sshKey" /></mat-form-field>
            </div>
            <mat-form-field appearance="outline" class="full"><mat-label>Startup script (optional)</mat-label><textarea matInput rows="2" formControlName="startupScript"></textarea></mat-form-field>
          </div>
        }

        @if (step() === 3) {
          <app-provider-specific-options
            [provider]="provider()"
            [form]="providerForm"
            [accountId]="form.value.accountId ?? ''"
            [region]="form.value.region ?? ''"
          />
        }

        @if (step() === 4) {
          <div class="plan-step animate-fade-in">
            <div class="pipeline">
              @for (p of pipeline(); track p.id) {
                <div class="pipeline__step" [class.done]="p.done" [class.active]="p.active">
                  <mat-icon>{{ p.done ? 'check_circle' : p.icon }}</mat-icon>
                  <span>{{ p.label }}</span>
                </div>
              }
            </div>
            <app-cost-estimate-card [estimate]="estimate()" />
            <app-terraform-plan-viewer
              [planOutput]="planOutput()"
              [runId]="runId() ?? ''"
              [resources]="planResources()"
            />
            <app-terraform-logs-viewer [logs]="logs()" [streaming]="applying() || planning()" />
          </div>
        }
      </mat-dialog-content>

      <footer class="launch-modal__footer">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <div class="footer-actions">
          @if (step() > 0) {
            <button mat-stroked-button type="button" (click)="prevStep()"><mat-icon>arrow_back</mat-icon> Back</button>
          }
          @if (step() < 4) {
            <button mat-flat-button color="primary" type="button" [disabled]="!canNext()" (click)="nextStep()">
              Continue <mat-icon>arrow_forward</mat-icon>
            </button>
          }
          @if (step() === 4) {
            <button mat-stroked-button type="button" [disabled]="estimating()" (click)="handleEstimate()">
              @if (estimating()) { <mat-spinner diameter="18" /> } @else { Calculate cost }
            </button>
            <button mat-stroked-button type="button" [disabled]="planning()" (click)="handlePlan()">
              @if (planning()) { <mat-spinner diameter="18" /> } @else { Generate plan }
            </button>
            <button mat-stroked-button type="button" [disabled]="!planOutput()" (click)="viewPlanOnly()">View plan</button>
            <button mat-stroked-button type="button" [disabled]="!runId()" (click)="handleViewLogs()">View logs</button>
            <button mat-flat-button color="primary" type="button" [disabled]="!canApply()" (click)="handleApply()">
              @if (applying()) { <mat-spinner diameter="18" /> } @else { Confirm apply }
            </button>
          }
          <button mat-stroked-button type="button" (click)="handleSaveTemplate()">Save as template</button>
        </div>
      </footer>
    </div>
  `,
  styles: `
    .launch-modal { min-width: min(920px, 95vw); max-height: 90vh; display: flex; flex-direction: column; }
    .launch-modal__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.5rem 0;
      h2 { margin: 0; font-size: 1.35rem; font-weight: 700; }
      p { margin: 0.25rem 0 0; color: var(--app-text-muted); font-size: 0.85rem; }
    }
    .wizard-steps {
      display: flex;
      gap: 0.35rem;
      padding: 1rem 1.5rem;
      overflow-x: auto;
    }
    .wizard-step {
      flex: 1;
      min-width: 100px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      padding: 0.65rem;
      border: none;
      border-radius: var(--app-radius-md);
      background: var(--app-surface);
      cursor: pointer;
      transition: all 0.25s ease;
      &__icon {
        width: 36px; height: 36px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background: var(--app-elevated);
        box-shadow: var(--app-shadow-xs);
      }
      &__label { font-size: 0.7rem; color: var(--app-text-muted); text-align: center; }
      &.active {
        background: color-mix(in srgb, var(--app-accent) 10%, var(--app-card));
        .wizard-step__icon { background: var(--app-accent); color: #fff; }
        .wizard-step__label { color: inherit; font-weight: 600; }
      }
      &.done .wizard-step__icon { background: #22c55e; color: #fff; }
    }
    .launch-modal__body { flex: 1; overflow-y: auto; padding: 0 1.5rem !important; min-height: 360px; }
    .launch-modal__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 1rem 1.5rem 1.25rem;
      border-top: 1px solid var(--app-divider);
    }
    .footer-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .provider-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .provider-card {
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.35rem;
      padding: 1.5rem 1rem; border: none; border-radius: var(--app-radius-lg);
      background: var(--app-elevated); box-shadow: var(--app-shadow-sm);
      cursor: pointer; transition: all 0.25s ease;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: var(--accent); }
      strong { font-size: 0.95rem; }
      span { font-size: 0.75rem; color: var(--app-text-muted); }
      &:hover { transform: translateY(-3px); box-shadow: var(--app-shadow-md); }
      &.selected { outline: 2px solid var(--accent); background: color-mix(in srgb, var(--accent) 8%, var(--app-card)); }
    }
    .form-section, .plan-step { display: flex; flex-direction: column; gap: 0.75rem; }
    .field-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; }
    .full { width: 100%; }
    .pipeline {
      display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;
      &__step {
        display: flex; align-items: center; gap: 0.35rem;
        padding: 0.4rem 0.75rem; border-radius: 999px;
        font-size: 0.72rem; background: var(--app-surface);
        &.active { background: color-mix(in srgb, var(--app-accent) 15%, transparent); }
        &.done mat-icon { color: #22c55e; }
        mat-icon { font-size: 16px; width: 16px; height: 16px; }
      }
    }
    @media (max-width: 768px) {
      .provider-grid { grid-template-columns: 1fr; }
      .launch-modal { min-width: 95vw; }
    }
  `,
})
export class LaunchInstanceModalComponent {
  private readonly fb = inject(FormBuilder)
  private readonly terraform = inject(TerraformService)
  private readonly accounts = inject(CloudAccountsService)
  private readonly toast = inject(ToastService)
  private readonly dialogRef = inject(MatDialogRef<LaunchInstanceModalComponent>)
  private readonly destroyRef = inject(DestroyRef)

  readonly steps = WIZARD_STEPS
  readonly providers = Object.values(PROVIDER_LAUNCH_META)
  readonly environments = ENVIRONMENT_OPTIONS

  readonly step = signal(0)
  readonly provider = signal<LaunchCloudProvider>('AWS')
  readonly networks = signal<{ id: string; name?: string }[]>([])
  readonly instanceTypes = signal<{ id: string; name?: string }[]>([])
  readonly images = signal<{ id: string; name?: string }[]>([])
  readonly estimate = signal<CostEstimate>({})
  readonly planOutput = signal('')
  readonly planResources = signal<{ type: string; name: string; change: string }[]>([])
  readonly runId = signal<string | null>(null)
  readonly logs = signal('')
  readonly planViewed = signal(false)
  readonly estimating = signal(false)
  readonly planning = signal(false)
  readonly applying = signal(false)

  form = this.fb.group({
    accountId: ['', Validators.required],
    region: ['', Validators.required],
    zone: [''],
    resourceGroup: [''],
    networkId: [''],
    subnetId: [''],
    name: ['tf-web-server', Validators.required],
    count: [1, [Validators.required, Validators.min(1)]],
    instanceType: ['', Validators.required],
    imageId: ['', Validators.required],
    cpu: [2],
    ramGb: [4],
    diskGb: [30],
    diskType: ['gp3'],
    environment: ['dev'],
    internalProject: ['default'],
    sshUser: ['ubuntu'],
    sshKey: [''],
    startupScript: [''],
  })

  providerForm = this.fb.group({
    keyPair: [''],
    securityGroupId: [''],
    subnetId: [''],
    iamProfile: [''],
    availabilityZone: [''],
    ebsSize: [30],
    ebsType: ['gp3'],
    publicIp: [true],
    userData: [''],
    tags: [''],
    projectId: [''],
    zone: [''],
    diskGb: [30],
    diskType: ['pd-ssd'],
    firewallTags: [''],
    serviceAccount: [''],
    scopes: ['cloud-platform'],
    startupScript: [''],
    labels: [''],
    subscriptionId: [''],
    resourceGroup: [''],
    location: [''],
    imagePublisher: ['Canonical'],
    imageOffer: ['0001-com-ubuntu-server-jammy'],
    imageSku: ['22_04-lts-gen2'],
    adminUsername: ['azureuser'],
    sshPublicKey: [''],
  })

  pipeline = computed(() => {
    const hasEstimate = Boolean(this.estimate().monthly)
    const hasPlan = Boolean(this.planOutput())
    const hasApply = this.logs().includes('Apply complete')
    return [
      { id: 'vars', label: 'Variables', icon: 'code', done: true, active: this.step() === 4 && !hasEstimate },
      { id: 'init', label: 'terraform init', icon: 'play_arrow', done: hasEstimate, active: hasEstimate && !hasPlan },
      { id: 'plan', label: 'terraform plan', icon: 'description', done: hasPlan, active: hasPlan && !hasApply },
      { id: 'apply', label: 'terraform apply', icon: 'rocket_launch', done: hasApply, active: this.applying() },
    ]
  })

  networkLabel = () => PROVIDER_LAUNCH_META[this.provider()].networkLabel
  instanceTypeLabel = () => PROVIDER_LAUNCH_META[this.provider()].instanceTypeLabel
  imageLabel = () => PROVIDER_LAUNCH_META[this.provider()].imageLabel

  constructor() {
    this.form.get('accountId')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadCatalog())
    this.form.get('region')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadCatalog())
  }

  selectProvider = (p: LaunchCloudProvider): void => {
    this.provider.set(p)
    this.form.patchValue({ region: PROVIDER_LAUNCH_META[p].defaultRegion })
  }

  goToStep = (n: number): void => {
    if (n <= this.step() || this.canNext()) this.step.set(n)
  }

  canNext = (): boolean => {
    const s = this.step()
    if (s === 0) return true
    if (s === 1) return Boolean(this.form.value.accountId && this.form.value.region)
    if (s === 2) return this.form.valid
    if (s === 3) return true
    return false
  }

  nextStep = (): void => {
    if (this.step() === 1) this.loadCatalog()
    if (this.canNext() && this.step() < 4) this.step.update((v) => v + 1)
    if (this.step() === 4) this.handleEstimate()
  }

  prevStep = (): void => this.step.update((v) => Math.max(0, v - 1))

  loadCatalog = (): void => {
    const accountId = this.form.value.accountId
    const region = this.form.value.region || undefined
    if (!accountId) return
    this.accounts.networks(accountId, region).subscribe({
      next: (rows) => this.networks.set(rows as { id: string; name?: string }[]),
    })
    this.accounts.instanceTypes(accountId, region).subscribe({
      next: (rows) => {
        this.instanceTypes.set(rows as { id: string; name?: string }[])
        if (rows[0]) this.form.patchValue({ instanceType: (rows[0] as { id: string }).id })
      },
    })
    this.accounts.images(accountId, region).subscribe({
      next: (rows) => {
        this.images.set(rows as { id: string; name?: string }[])
        if (rows[0]) this.form.patchValue({ imageId: (rows[0] as { id: string }).id })
      },
    })
  }

  applyTemplate = (tpl: { config?: Record<string, unknown> }): void => {
    const cfg = tpl.config ?? {}
    this.form.patchValue(cfg as Record<string, unknown>)
  }

  buildPayload = () => ({
    provider: this.provider(),
    region: this.form.value.region ?? '',
    instanceType: this.form.value.instanceType ?? '',
    name: this.form.value.name ?? '',
    cloudAccountId: this.form.value.accountId ?? undefined,
    config: {
      ...this.form.getRawValue(),
      ...this.providerForm.getRawValue(),
      provider: this.provider(),
      count: this.form.value.count,
    },
  })

  handleEstimate = (): void => {
    this.estimating.set(true)
    this.terraform.estimateLaunch(this.buildPayload()).subscribe({
      next: (res) => {
        this.estimating.set(false)
        const hourly = Number(res['estimatedHourlyUsd'] ?? 0)
        const monthly = Number(res['estimatedMonthlyUsd'] ?? 0)
        const disk = (Number(this.form.value.diskGb) || 30) * 0.08
        this.estimate.set({ hourly, monthly, daily: hourly * 24, disk, total: monthly + disk, currency: 'USD' })
        const resources = res['resources'] as { type: string; name: string; change: string }[] | undefined
        if (resources) this.planResources.set(resources)
        this.logs.set('Generated Terraform variables…\nterraform init -backend=false\nInitializing provider plugins…')
      },
      error: () => {
        this.estimating.set(false)
        this.estimate.set({ hourly: 0.08, monthly: 58.4, disk: 2.4, total: 60.8 })
        this.toast.error('Estimate failed — showing demo values')
      },
    })
  }

  handlePlan = (): void => {
    this.planning.set(true)
    this.logs.update((l) => l + '\nterraform plan -out=tfplan\n')
    this.terraform.planLaunch(this.buildPayload()).subscribe({
      next: (res) => {
        this.planning.set(false)
        this.runId.set(String(res['runId'] ?? ''))
        const output = String(res['planOutput'] ?? 'Plan: 1 to add, 0 to change, 0 to destroy')
        this.planOutput.set(output)
        this.planViewed.set(true)
        const est = res['estimate'] as Record<string, unknown> | undefined
        if (est?.['resources']) this.planResources.set(est['resources'] as { type: string; name: string; change: string }[])
        this.logs.update((l) => l + output + '\nPlan saved to tfplan')
        this.toast.success('Plan generated — review before apply')
      },
      error: () => {
        this.planning.set(false)
        this.toast.error('Plan failed')
      },
    })
  }

  viewPlanOnly = (): void => {
    this.planViewed.set(true)
  }

  canApply = (): boolean => this.planViewed() && Boolean(this.runId()) && !this.applying() && !this.planning()

  handleApply = (): void => {
    const id = this.runId()
    if (!id) {
      this.toast.error('Generate a plan first')
      return
    }
    this.applying.set(true)
    this.logs.update((l) => l + '\nterraform apply tfplan\n')
    this.terraform.applyLaunch(id, true).subscribe({
      next: (res) => {
        this.applying.set(false)
        this.logs.update((l) => l + String(res['message'] ?? 'Apply complete! Resources: 1 added.\n'))
        this.toast.success('Apply completed — syncing inventory')
        this.dialogRef.close({ applied: true })
      },
      error: () => {
        this.applying.set(false)
        this.toast.error('Apply failed')
      },
    })
  }

  handleViewLogs = (): void => {
    const id = this.runId()
    if (!id) return
    this.terraform.logs(id).subscribe({
      next: (data) => {
        const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
        this.logs.set(text)
      },
    })
  }

  handleSaveTemplate = (): void => {
    const name = `${this.form.value.name}-template`
    this.terraform.saveTemplate(name, this.provider(), this.buildPayload().config).subscribe({
      next: () => this.toast.success(`Template "${name}" saved`),
      error: () => this.toast.error('Could not save template'),
    })
  }
}
