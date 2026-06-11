import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { toSignal } from '@angular/core/rxjs-interop'
import { startWith } from 'rxjs'
import { InfrastructureActionService } from './infrastructure-action.service'
import { ToastService } from '../../core/services/toast.service'
import { ProModeService } from '../../core/services/pro-mode.service'

export interface VpsAddDialogData {
  existingNames?: string[]
}

export interface VpsAddDialogResult {
  name: string
  host: string
  port: number
  user: string
  authMethod: 'public-key' | 'agent' | 'password'
  sshKeyName: string
  provider: string
  location: string
  environment: 'prod' | 'staging' | 'dev'
  os: string
  description: string
  tags: string[]
  bastionHost: string
  discoverDocker: boolean
  discoverKubernetes: boolean
  runPortScan: boolean
  collectMetrics: boolean
  enableAudit: boolean
  testConnectionFirst: boolean
}

const autoNameFromHost = (hostname: string): string =>
  `vps-${hostname.trim().replace(/[^a-zA-Z0-9.]/g, '-').replace(/\./g, '-')}`

@Component({
  selector: 'app-vps-add-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="vps-add-dialog">
      <header class="vps-add-dialog__head">
        <div>
          <h2 mat-dialog-title>Añadir servidor VPS</h2>
          <p class="vps-add-dialog__sub">Conexión SSH directa · detección automática de SO tras guardar</p>
        </div>
      </header>

      <mat-dialog-content>
        <div class="vps-add-grid">
          <mat-form-field appearance="outline" class="full">
            <mat-label>IP pública / hostname</mat-label>
            <input matInput [formControl]="host" placeholder="203.0.113.10" />
            @if (hostError()) {
              <mat-error>{{ hostError() }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Puerto SSH</mat-label>
            <input matInput type="number" [formControl]="port" placeholder="22" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Usuario SSH</mat-label>
            <input matInput [formControl]="user" placeholder="root" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Contraseña SSH</mat-label>
            <input matInput type="password" [formControl]="password" autocomplete="new-password" />
            @if (password.touched && password.hasError('required')) {
              <mat-error>La contraseña es obligatoria</mat-error>
            }
          </mat-form-field>
        </div>

        <p class="vps-add-preview">
          <mat-icon>dns</mat-icon>
          Nombre automático: <strong class="mono">{{ previewName() }}</strong>
        </p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button color="primary" type="button" [disabled]="!canSubmit()" (click)="handleSubmit()">
          Añadir host
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .vps-add-dialog__head { padding-right: 0.5rem; }
    .vps-add-dialog__sub {
      margin: 0.15rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
    }
    .vps-add-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem 0.65rem;
    }
    .full { grid-column: 1 / -1; width: 100%; }
    @media (max-width: 480px) {
      .vps-add-grid { grid-template-columns: 1fr; }
    }
    .vps-add-preview {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0.75rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      strong { color: var(--app-text); }
    }
    .mono { font-family: ui-monospace, monospace; }
  `,
})
export class VpsAddDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<VpsAddDialogComponent, VpsAddDialogResult | undefined>)
  private readonly infraActions = inject(InfrastructureActionService)
  private readonly toast = inject(ToastService)
  private readonly pro = inject(ProModeService)
  readonly data = inject<VpsAddDialogData>(MAT_DIALOG_DATA, { optional: true })

  readonly host = new FormControl('203.0.113.10', { nonNullable: true, validators: [Validators.required] })
  readonly port = new FormControl(22, { nonNullable: true, validators: [Validators.min(1), Validators.max(65535)] })
  readonly user = new FormControl('root', { nonNullable: true, validators: [Validators.required] })
  readonly password = new FormControl('', { nonNullable: true, validators: [Validators.required] })

  private readonly hostVal = toSignal(this.host.valueChanges.pipe(startWith(this.host.value)), { initialValue: this.host.value })

  readonly previewName = computed(() => autoNameFromHost(this.hostVal()))

  readonly canSubmit = computed(
    () => this.host.valid && this.port.valid && this.user.valid && this.password.valid,
  )

  hostError = (): string | null => {
    if (!this.host.touched && !this.host.dirty) return null
    if (this.host.hasError('required')) return 'IP o hostname requerido'
    return null
  }

  handleSubmit = (): void => {
    if (!this.canSubmit()) return
    this.dialogRef.close(this.buildResult())
  }

  private buildResult = (): VpsAddDialogResult => ({
    name: this.previewName(),
    host: this.host.value.trim(),
    port: this.port.value,
    user: this.user.value.trim(),
    authMethod: 'password',
    sshKeyName: '',
    provider: 'Bare metal',
    location: '—',
    environment: 'prod',
    os: 'Linux',
    description: '',
    tags: [],
    bastionHost: '',
    discoverDocker: true,
    discoverKubernetes: false,
    runPortScan: true,
    collectMetrics: true,
    enableAudit: true,
    testConnectionFirst: false,
  })
}
