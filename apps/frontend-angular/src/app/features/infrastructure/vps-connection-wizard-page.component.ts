import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { VpsService } from '../../core/services/vps.service'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { ToastService } from '../../core/services/toast.service'
import { ApiClientService } from '../../core/services/api-client.service'

type VpsConnectionMethod = 'ssh' | 'agent' | 'manual'

@Component({
  selector: 'app-vps-connection-wizard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    BrandLogoComponent,
  ],
  template: `
    <div class="vps-wizard-page">
      <nav class="vps-wizard-page__crumb">
        <a routerLink="/settings/integrations"><mat-icon>arrow_back</mat-icon> Integraciones</a>
      </nav>

      <header class="vps-wizard-page__head">
        <app-brand-logo logo="hetzner" size="lg" />
        <div>
          <h1>Conectar servidor VPS / Bare Metal</h1>
          <p>SSH agentless · inventario unificado · sin redirecciones externas</p>
        </div>
      </header>

      <nav class="vps-wizard-page__steps" aria-label="Pasos">
        @for (s of steps; track s.id; let i = $index) {
          <span class="vps-step" [class.vps-step--active]="step() === s.id" [class.vps-step--done]="stepIndex() > i">
            <span class="vps-step__num">{{ i + 1 }}</span>{{ s.label }}
          </span>
        }
      </nav>

      @if (step() === 'method') {
        <section class="vps-method-grid">
          @for (m of methods; track m.id) {
            <button
              type="button"
              class="vps-method-card"
              [class.vps-method-card--selected]="connectionMethod() === m.id"
              (click)="selectMethod(m.id, m.comingSoon)"
            >
              <mat-icon>{{ m.icon }}</mat-icon>
              <div>
                <strong>{{ m.label }}</strong>
                @if (m.recommended) { <em>Recomendado</em> }
                <p>{{ m.description }}</p>
              </div>
            </button>
          }
        </section>
      }

      @if (step() === 'credentials') {
        <form [formGroup]="form" class="vps-form">
          <mat-form-field appearance="outline">
            <mat-label>Nombre del servidor</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Proveedor</mat-label>
            <mat-select formControlName="provider">
              <mat-option value="Hetzner">Hetzner</mat-option>
              <mat-option value="DigitalOcean">DigitalOcean</mat-option>
              <mat-option value="OVH">OVH</mat-option>
              <mat-option value="Linode">Linode</mat-option>
              <mat-option value="Bare metal">Bare metal</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>IP / hostname</mat-label>
            <input matInput formControlName="hostname" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Puerto SSH</mat-label>
            <input matInput type="number" formControlName="port" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Usuario SSH</mat-label>
            <input matInput formControlName="username" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Sistema operativo</mat-label>
            <mat-select formControlName="os">
              <mat-option value="Ubuntu 22.04 LTS">Ubuntu 22.04 LTS</mat-option>
              <mat-option value="Ubuntu 24.04 LTS">Ubuntu 24.04 LTS</mat-option>
              <mat-option value="Debian 12">Debian 12</mat-option>
              <mat-option value="Rocky Linux 9">Rocky Linux 9</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Entorno</mat-label>
            <mat-select formControlName="environment">
              <mat-option value="prod">Producción</mat-option>
              <mat-option value="staging">Staging</mat-option>
              <mat-option value="dev">Desarrollo</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Región / datacenter</mat-label>
            <input matInput formControlName="region" placeholder="fra1" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Tags (separados por coma)</mat-label>
            <input matInput formControlName="tags" />
          </mat-form-field>
        </form>
      }

      @if (step() === 'validate') {
        <section class="vps-validate">
          <p>Comprobamos conectividad SSH antes de registrar el host.</p>
          <button mat-flat-button color="primary" type="button" [disabled]="validating()" (click)="handleValidate()">
            @if (validating()) { <mat-spinner diameter="18" /> } @else { <mat-icon>verified</mat-icon> }
            Probar conexión
          </button>
          @if (validationMsg()) {
            <p class="vps-validate__msg">{{ validationMsg() }}</p>
          }
        </section>
      }

      @if (step() === 'finish') {
        <section class="vps-finish">
          <mat-icon>check_circle</mat-icon>
          <h3>Servidor listo para guardar</h3>
          <p>{{ form.value.name }} · {{ form.value.hostname }}:{{ form.value.port }}</p>
        </section>
      }

      <footer class="vps-wizard-page__actions">
        <button mat-button type="button" routerLink="/settings/integrations">Cancelar</button>
        @if (step() !== 'method') {
          <button mat-stroked-button type="button" (click)="handleBack()"><mat-icon>arrow_back</mat-icon> Atrás</button>
        }
        @if (step() !== 'finish') {
          <button mat-flat-button color="primary" type="button" (click)="handleNext()">Siguiente</button>
        } @else {
          <button mat-flat-button color="primary" type="button" [disabled]="saving()" (click)="handleSave()">
            @if (saving()) { <mat-spinner diameter="18" /> } @else { <mat-icon>save</mat-icon> }
            Guardar servidor
          </button>
        }
      </footer>
    </div>
  `,
  styles: `
    .vps-wizard-page { max-width: 820px; margin: 0 auto; padding: 1rem 1.25rem 2rem; }
    .vps-wizard-page__crumb a { display: inline-flex; align-items: center; gap: 0.35rem; color: var(--app-text-muted); text-decoration: none; margin-bottom: 1rem; }
    .vps-wizard-page__head { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.25rem; }
    .vps-wizard-page__head h1 { margin: 0; font-size: 1.35rem; }
    .vps-wizard-page__head p { margin: 0.35rem 0 0; color: var(--app-text-muted); font-size: 0.88rem; }
    .vps-wizard-page__steps { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .vps-step { display: flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.65rem; border: 1px solid var(--app-border-subtle); border-radius: 8px; font-size: 0.78rem; }
    .vps-step--active { border-color: var(--app-accent); background: color-mix(in srgb, var(--app-accent) 8%, transparent); }
    .vps-step__num { width: 1.25rem; height: 1.25rem; border-radius: 50%; background: var(--app-border-subtle); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; }
    .vps-method-grid { display: grid; gap: 0.65rem; }
    .vps-method-card { display: flex; gap: 0.75rem; text-align: left; padding: 0.85rem; border: 1px solid var(--app-border-subtle); border-radius: 8px; background: var(--app-surface); cursor: pointer; }
    .vps-method-card--selected { border-color: var(--app-accent); }
    .vps-form { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    .vps-form .full { grid-column: 1 / -1; }
    .vps-validate, .vps-finish { text-align: center; padding: 1.5rem 0; }
    .vps-finish mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--status-running); }
    .vps-wizard-page__actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; flex-wrap: wrap; }
  `,
})
export class VpsConnectionWizardPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder)
  private readonly vps = inject(VpsService)
  private readonly accounts = inject(CloudAccountsService)
  private readonly api = inject(ApiClientService)
  private readonly toast = inject(ToastService)
  private readonly router = inject(Router)

  readonly steps = [
    { id: 'method', label: 'Método' },
    { id: 'credentials', label: 'Datos' },
    { id: 'validate', label: 'Validación' },
    { id: 'finish', label: 'Finalizar' },
  ] as const

  readonly methods = [
    { id: 'ssh' as const, label: 'SSH (recomendado)', description: 'Conexión directa con clave pública', icon: 'terminal', recommended: true },
    { id: 'agent' as const, label: 'Agente Spendlyx', description: 'Binario ligero en el host', icon: 'smart_toy', comingSoon: true },
    { id: 'manual' as const, label: 'Registro manual', description: 'Alta sin prueba de conexión', icon: 'edit_note' },
  ]

  readonly step = signal<'method' | 'credentials' | 'validate' | 'finish'>('method')
  readonly connectionMethod = signal<VpsConnectionMethod>('ssh')
  readonly validating = signal(false)
  readonly saving = signal(false)
  readonly validationOk = signal(false)
  readonly validationMsg = signal('')
  private projectId = ''

  readonly stepIndex = () => this.steps.findIndex((s) => s.id === this.step())

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    provider: ['Hetzner', Validators.required],
    hostname: ['', Validators.required],
    port: [22, Validators.required],
    username: ['root', Validators.required],
    os: ['Ubuntu 22.04 LTS'],
    environment: ['prod'],
    region: [''],
    tags: [''],
  })

  ngOnInit(): void {
    this.accounts.defaultProject().subscribe({
      next: (p) => { this.projectId = p.id },
      error: () => {},
    })
  }

  selectMethod = (id: VpsConnectionMethod, comingSoon?: boolean): void => {
    if (comingSoon) {
      this.toast.info('Próximamente')
      return
    }
    this.connectionMethod.set(id)
    this.validationOk.set(false)
    this.validationMsg.set('')
  }

  handleBack = (): void => {
    const order = ['method', 'credentials', 'validate', 'finish'] as const
    const idx = order.indexOf(this.step())
    if (idx > 0) this.step.set(order[idx - 1])
  }

  handleNext = (): void => {
    if (this.step() === 'method') {
      this.step.set('credentials')
      return
    }
    if (this.step() === 'credentials') {
      if (this.form.invalid) {
        this.form.markAllAsTouched()
        this.toast.error('Completa los campos obligatorios')
        return
      }
      this.step.set('validate')
      return
    }
    if (this.step() === 'validate') {
      if (!this.validationOk() && this.connectionMethod() !== 'manual') {
        this.toast.error('Valida la conexión SSH antes de continuar')
        return
      }
      this.step.set('finish')
    }
  }

  handleValidate = (): void => {
    if (this.form.invalid) {
      this.form.markAllAsTouched()
      return
    }
    const v = this.form.getRawValue()
    this.validating.set(true)
    this.api
      .post<{ valid: boolean; message?: string }>('vps/validate-preview', {
        projectId: this.projectId,
        name: v.name,
        hostname: v.hostname,
        port: v.port,
        username: v.username,
      })
      .subscribe({
        next: (r) => {
          this.validating.set(false)
          this.validationOk.set(r.valid)
          this.validationMsg.set(r.message ?? (r.valid ? 'Conexión SSH válida' : 'No se pudo conectar'))
          if (r.valid) this.toast.success('Conexión validada')
          else this.toast.error(r.message ?? 'Validación fallida')
        },
        error: (err) => {
          this.validating.set(false)
          this.validationOk.set(false)
          this.validationMsg.set(err?.error?.message ?? 'Error al validar')
          this.toast.error(this.validationMsg())
        },
      })
  }

  handleSave = (): void => {
    const v = this.form.getRawValue()
    if (!this.projectId) {
      this.toast.error('No se pudo resolver el proyecto')
      return
    }
    this.saving.set(true)
    const tags = v.tags.split(',').map((t) => t.trim()).filter(Boolean)
    this.vps
      .create({
        projectId: this.projectId,
        name: v.name,
        host: v.hostname,
        hostname: v.hostname,
        port: v.port,
        username: v.username,
        metadata: {
          provider: v.provider,
          os: v.os,
          environment: v.environment,
          region: v.region,
          tags,
          connectionMethod: this.connectionMethod(),
        },
      } as never)
      .subscribe({
        next: () => {
          this.saving.set(false)
          this.toast.success('Servidor registrado correctamente')
          void this.router.navigateByUrl('/vps/digitalocean/accounts')
        },
        error: (err) => {
          this.saving.set(false)
          this.toast.error(err?.error?.message ?? 'No se pudo guardar el servidor')
        },
      })
  }
}
