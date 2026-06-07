import { Component, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { ToastService } from '../../core/services/toast.service'
import {
  ADMIN_USERS_ACCENT,
  ADMIN_USERS_ACCENT_BORDER,
  ADMIN_USERS_ACCENT_LIGHT,
} from './admin.config'

export interface AdminUserInviteData {
  defaultRole?: string
}

@Component({
  selector: 'app-admin-user-invite-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <article class="inv">
      <header class="inv__head">
        <div>
          <span class="inv__label">Usuarios · Invitación</span>
          <h2>Invitar usuario</h2>
          <p>Se enviará un enlace de activación por correo con el rol seleccionado.</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <form [formGroup]="form" (ngSubmit)="handleSubmit()">
        <mat-dialog-content class="inv__body">
          <mat-form-field appearance="outline" class="inv__field">
            <mat-label>Correo electrónico</mat-label>
            <input matInput formControlName="email" type="email" placeholder="usuario@empresa.com" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="inv__field">
            <mat-label>Nombre (opcional)</mat-label>
            <input matInput formControlName="name" placeholder="Nombre completo" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="inv__field">
            <mat-label>Rol</mat-label>
            <mat-select formControlName="role">
              @for (r of roles; track r) {
                <mat-option [value]="r">{{ r }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="inv__field">
            <mat-label>Departamento</mat-label>
            <input matInput formControlName="department" placeholder="Operaciones, Ingeniería…" />
          </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions align="start" class="inv__actions">
          <button type="submit" class="page-action-btn page-action-btn--primary" [disabled]="form.invalid">
            <mat-icon>send</mat-icon> Enviar invitación
          </button>
          <button type="button" class="page-action-btn" mat-dialog-close>Cancelar</button>
        </mat-dialog-actions>
      </form>
    </article>
  `,
  styles: `
    .inv { width: 100%; color: #0f172a; }
    .inv__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .inv__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .inv__head h2 { margin: 0.2rem 0 0; font-size: 1.05rem; font-weight: 700; }
    .inv__head p { margin: 0.25rem 0 0; font-size: 0.72rem; color: #64748b; }
    .inv__body { display: flex; flex-direction: column; gap: 0.35rem; padding-top: 0.75rem !important; }
    .inv__field { width: 100%; }
    .inv__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; padding-top: 0.65rem; border-top: 1px solid #e2e8f0; }
    .page-action-btn--primary { background: ${ADMIN_USERS_ACCENT}; border-color: #1d4ed8; }
  `,
})
export class AdminUserInviteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AdminUserInviteDialogComponent>)
  private readonly data = inject<AdminUserInviteData>(MAT_DIALOG_DATA, { optional: true })
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)

  readonly roles = ['Super Admin', 'Admin', 'Operator', 'Viewer', 'Service Account']

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    name: new FormControl('', { nonNullable: true }),
    role: new FormControl(this.data?.defaultRole ?? 'Operator', { nonNullable: true, validators: Validators.required }),
    department: new FormControl('', { nonNullable: true }),
  })

  handleSubmit = (): void => {
    if (this.form.invalid) return
    const v = this.form.getRawValue()
    this.actions.runPageAction('users', 'invite', `Invitar: ${v.email}`, { area: 'admin' })
    this.toast.success(`Invitación enviada a ${v.email} (${v.role})`)
    this.dialogRef.close({ invited: true, ...v })
  }
}
