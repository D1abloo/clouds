import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { VpsService } from '../../core/services/vps.service'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { ToastService } from '../../core/services/toast.service'
import {
  VpsRuntimeProbeDialogComponent,
  type VpsRuntimeProbeDialogData,
} from './vps-runtime-probe.dialog'
import { MatDialog } from '@angular/material/dialog'

const autoNameFromHost = (hostname: string): string =>
  `vps-${hostname.trim().replace(/[^a-zA-Z0-9.]/g, '-').replace(/\./g, '-')}`

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
    MatIconModule,
    MatProgressSpinnerModule,
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

      @if (step() === 'connection') {
        <form [formGroup]="form" class="vps-form" aria-labelledby="vps-credentials-title">
          <h2 id="vps-credentials-title" class="vps-form__title">Datos de conexión SSH</h2>
          <p class="vps-form__intro">
            Solo necesitas servidor, usuario y contraseña. Spendlyx usará SSH por contraseña en el puerto 22.
          </p>

          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="full">
            <mat-label>IP pública / hostname *</mat-label>
            <input matInput formControlName="hostname" placeholder="203.0.113.10" autocomplete="off" />
            <mat-hint>Dirección IPv4 accesible desde Spendlyx</mat-hint>
            @if (form.controls.hostname.touched && form.controls.hostname.hasError('required')) {
              <mat-error>IP o hostname requerido</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Usuario SSH *</mat-label>
            <input matInput formControlName="username" placeholder="root" autocomplete="username" />
            <mat-hint>Usuario con acceso SSH</mat-hint>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="full">
            <mat-label>Contraseña SSH *</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="new-password" />
            <mat-hint>Se almacena cifrada en la bóveda</mat-hint>
            @if (form.controls.password.touched && form.controls.password.hasError('required')) {
              <mat-error>La contraseña es obligatoria</mat-error>
            }
          </mat-form-field>
        </form>
      }

      @if (step() === 'finish') {
        <section class="vps-finish">
          <mat-icon>check_circle</mat-icon>
          <h3>Listo para guardar</h3>
          <p><strong>{{ serverName() }}</strong> · {{ form.value.username }}&#64;{{ form.value.hostname }}</p>
          <p class="vps-finish__hint">Tras guardar se validará SSH, aparecerá en Tablero y en Servidores.</p>
        </section>
      }

      <footer class="vps-wizard-page__actions">
        <button mat-button type="button" routerLink="/settings/integrations">Cancelar</button>
        @if (step() === 'finish') {
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
    .vps-wizard-page { max-width: 620px; margin: 0 auto; padding: 1rem 1.25rem 2rem; }
    .vps-wizard-page__crumb a { display: inline-flex; align-items: center; gap: 0.35rem; color: var(--app-text-muted); text-decoration: none; margin-bottom: 1rem; }
    .vps-wizard-page__head { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.25rem; }
    .vps-wizard-page__head h1 { margin: 0; font-size: 1.35rem; }
    .vps-wizard-page__head p { margin: 0.35rem 0 0; color: var(--app-text-muted); font-size: 0.88rem; }
    .vps-wizard-page__steps { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .vps-step { display: flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.65rem; border: 1px solid var(--app-border-subtle); border-radius: 8px; font-size: 0.78rem; }
    .vps-step--active { border-color: var(--app-accent); background: color-mix(in srgb, var(--app-accent) 8%, transparent); }
    .vps-step__num { width: 1.25rem; height: 1.25rem; border-radius: 50%; background: var(--app-border-subtle); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; }
    .vps-form { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    .vps-form .full { grid-column: 1 / -1; }
    .vps-form__title { margin: 0; grid-column: 1 / -1; font-size: 1.1rem; }
    .vps-form__intro { margin: 0 0 0.25rem; grid-column: 1 / -1; font-size: 0.82rem; color: var(--app-text-muted); }
    .vps-finish { text-align: center; padding: 1.5rem 0; }
    .vps-finish mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--status-running); }
    .vps-finish__hint { font-size: 0.78rem; color: var(--app-text-muted); margin-top: 0.5rem; }
    .vps-wizard-page__actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; flex-wrap: wrap; }
  `,
})
export class VpsConnectionWizardPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder)
  private readonly vps = inject(VpsService)
  private readonly accounts = inject(CloudAccountsService)
  private readonly dialog = inject(MatDialog)
  private readonly toast = inject(ToastService)
  private readonly router = inject(Router)

  readonly steps = [
    { id: 'connection', label: 'Conexión' },
    { id: 'finish', label: 'Guardar' },
  ] as const

  readonly step = signal<'connection' | 'finish'>('connection')
  readonly saving = signal(false)
  private projectId = ''

  readonly stepIndex = () => this.steps.findIndex((s) => s.id === this.step())

  form = this.fb.nonNullable.group({
    hostname: ['', Validators.required],
    username: ['root', Validators.required],
    password: ['', Validators.required],
  })

  readonly serverName = signal('vps-nuevo')

  ngOnInit(): void {
    this.accounts.defaultProject().subscribe({
      next: (p) => { this.projectId = p.id },
      error: () => {},
    })
    this.form.controls.hostname.valueChanges.subscribe((host) => {
      if (host?.trim()) this.serverName.set(autoNameFromHost(host))
    })
  }

  handleBack = (): void => {
    if (this.step() === 'finish') this.step.set('connection')
  }

  handleNext = (): void => {
    if (this.form.invalid) {
      this.form.markAllAsTouched()
      this.toast.error('Completa los campos obligatorios')
      return
    }
    const host = this.form.getRawValue().hostname
    this.serverName.set(autoNameFromHost(host))
    this.step.set('finish')
  }

  handleSave = (): void => {
    const v = this.form.getRawValue()
    const name = this.serverName()
    if (!this.projectId) {
      this.toast.error('No se pudo resolver el proyecto')
      return
    }
    this.saving.set(true)

    const saveWithMetadata = (osName: string, osFamily: 'linux' | 'windows'): void => {
      this.vps
        .create({
          projectId: this.projectId,
          name,
          host: v.hostname,
          hostname: v.hostname,
          port: 22,
          username: v.username,
          password: v.password,
          metadata: {
            provider: 'Bare metal',
            os: osName,
            osFamily,
            environment: 'prod',
            authMethod: 'password',
            connectionMethod: 'ssh',
          },
        } as never)
        .subscribe({
          next: (created) => {
            this.saving.set(false)
            this.toast.success(`Servidor ${name} registrado · SO: ${osName}`)
            this.openRuntimeProbeDialog(created.id, name, v.hostname)
          },
          error: (err) => {
            this.saving.set(false)
            this.toast.error(err?.error?.message ?? 'No se pudo guardar el servidor')
          },
        })
    }

    this.vps
      .detectOsPreview({ hostname: v.hostname, port: 22, username: v.username })
      .subscribe({
        next: (os) => saveWithMetadata(os.osName, os.osFamily),
        error: () => saveWithMetadata('Linux', 'linux'),
      })
  }

  private openRuntimeProbeDialog = (vpsId: string, hostName: string, hostIp: string): void => {
    const data: VpsRuntimeProbeDialogData = { vpsId, hostName, hostIp }
    this.dialog
      .open(VpsRuntimeProbeDialogComponent, {
        width: '640px',
        maxWidth: '96vw',
        data,
        disableClose: false,
      })
      .afterClosed()
      .subscribe(() => {
        void this.router.navigateByUrl('/vps/hetzner/servers')
      })
  }
}
