import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { ToastService } from '../../core/services/toast.service'
import {
  ADMIN_ROLES_ACCENT,
  ADMIN_ROLES_ACCENT_BORDER,
  ADMIN_ROLES_ACCENT_LIGHT,
  adminRelativeTime,
} from './admin.config'
import {
  ADMIN_ROLE_NAMES,
  ADMIN_ROLE_SCOPES,
  ASSIGNABLE_USERS,
  type AdminRoleAssignmentRow,
} from './admin-roles.demo'

export type RoleAssignmentDialogMode = 'edit' | 'assign'

export interface AdminRoleAssignmentEditData {
  mode: RoleAssignmentDialogMode
  assignment?: AdminRoleAssignmentRow
  defaultRole?: string
}

@Component({
  selector: 'app-admin-role-assignment-edit-dialog',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    StatusBadgeComponent,
  ],
  template: `
    <article class="rae">
      <header class="rae__head">
        <div class="rae__icon"><mat-icon>{{ isEdit ? 'edit' : 'assignment_ind' }}</mat-icon></div>
        <div class="rae__head-text">
          <span class="rae__label">{{ isEdit ? 'Asignaciones · Editar rol' : 'Asignaciones · Nuevo' }}</span>
          <h2>{{ isEdit ? 'Cambiar rol de usuario' : 'Asignar rol a usuario' }}</h2>
          <p>{{ isEdit ? 'Modifica el rol RBAC y el ámbito de acceso del usuario seleccionado.' : 'Selecciona usuario, rol y ámbito para conceder acceso.' }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>

      <form [formGroup]="form" (ngSubmit)="handleSubmit()">
        <mat-dialog-content class="rae__body">
          @if (isEdit && data.assignment) {
            <section class="rae__current">
              <span class="rae__avatar">{{ initials }}</span>
              <div>
                <strong>{{ data.assignment.userName }}</strong>
                <span>{{ data.assignment.user }}</span>
                <div class="rae__current-meta">
                  <app-status-badge [value]="data.assignment.status" />
                  <em>{{ data.assignment.department }}</em>
                </div>
              </div>
            </section>
          }

          <div class="rae__layout">
            <section class="rae__section">
              <h3><mat-icon>person</mat-icon> Usuario</h3>
              @if (isEdit) {
                <mat-form-field appearance="outline" class="rae__field" subscriptSizing="dynamic">
                  <mat-label>Email (solo lectura)</mat-label>
                  <input matInput [value]="data.assignment!.user" readonly />
                </mat-form-field>
              } @else {
                <mat-form-field appearance="outline" class="rae__field" subscriptSizing="dynamic">
                  <mat-label>Usuario</mat-label>
                  <mat-select formControlName="userEmail">
                    @for (u of assignableUsers; track u.email) {
                      <mat-option [value]="u.email">{{ u.name }} · {{ u.email }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }

              <h3><mat-icon>admin_panel_settings</mat-icon> Rol y ámbito</h3>
              <div class="rae__grid">
                <mat-form-field appearance="outline" class="rae__field" subscriptSizing="dynamic">
                  <mat-label>Rol RBAC</mat-label>
                  <mat-select formControlName="role">
                    @for (r of roleNames; track r) {
                      <mat-option [value]="r">{{ r }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="rae__field" subscriptSizing="dynamic">
                  <mat-label>Ámbito</mat-label>
                  <mat-select formControlName="scope">
                    @for (s of scopes; track s) {
                      <mat-option [value]="s">{{ s }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              @if (isEdit) {
                <div class="rae__change-preview">
                  <div class="rae__change-from">
                    <span>Rol actual</span>
                    <strong>{{ data.assignment!.role }}</strong>
                  </div>
                  <mat-icon>arrow_forward</mat-icon>
                  <div class="rae__change-to">
                    <span>Nuevo rol</span>
                    <strong>{{ form.controls.role.value }}</strong>
                  </div>
                </div>
              }

              <label class="rae__toggle">
                <mat-slide-toggle formControlName="notifyUser" aria-label="Notificar usuario" />
                <div>
                  <strong>Notificar al usuario</strong>
                  <span>Envía email con el resumen del cambio de permisos</span>
                </div>
              </label>
            </section>

            <aside class="rae__aside">
              <section class="rae__meta">
                <h4>Impacto del cambio</h4>
                <ul>
                  <li><mat-icon>schedule</mat-icon> Efectivo en ~15 min (renovación de sesión)</li>
                  <li><mat-icon>receipt_long</mat-icon> Queda registrado en auditoría RBAC</li>
                  <li><mat-icon>shield</mat-icon> Revisa MFA si elevas privilegios</li>
                </ul>
              </section>
              @if (isEdit && data.assignment?.lastLogin) {
                <section class="rae__meta">
                  <h4>Actividad</h4>
                  <dl>
                    <div><dt>Último acceso</dt><dd>{{ relativeTime(data.assignment!.lastLogin!) }}</dd></div>
                    <div><dt>Asignado por</dt><dd>{{ data.assignment!.assignedBy }}</dd></div>
                    <div><dt>Desde</dt><dd>{{ data.assignment!.assignedAt | date: 'dd MMM yyyy' }}</dd></div>
                    <div><dt>MFA</dt><dd>{{ data.assignment!.mfa ? 'Activo' : 'No configurado' }}</dd></div>
                  </dl>
                </section>
              }
            </aside>
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="start" class="rae__actions">
          <button type="submit" class="page-action-btn page-action-btn--primary" [disabled]="form.invalid">
            <mat-icon>{{ isEdit ? 'save' : 'assignment_ind' }}</mat-icon>
            {{ isEdit ? 'Guardar cambio de rol' : 'Asignar rol' }}
          </button>
          <button type="button" class="page-action-btn" mat-dialog-close>Cancelar</button>
        </mat-dialog-actions>
      </form>
    </article>
  `,
  styles: `
    :host { display: block; }
    .rae { width: 100%; color: #0f172a; padding: 1.1rem 1.3rem 1.2rem; box-sizing: border-box; }
    .rae__head { display: grid; grid-template-columns: auto 1fr auto; gap: 0.65rem; align-items: flex-start; padding: 0.8rem 0.95rem; margin-bottom: 0.85rem; border-radius: 12px; border: 1px solid ${ADMIN_ROLES_ACCENT_BORDER}; background: linear-gradient(135deg, ${ADMIN_ROLES_ACCENT_LIGHT}, #fff); }
    .rae__icon { display: flex; align-items: center; justify-content: center; width: 2.2rem; height: 2.2rem; border-radius: 10px; background: #fff; border: 1px solid ${ADMIN_ROLES_ACCENT_BORDER}; color: ${ADMIN_ROLES_ACCENT}; mat-icon { font-size: 1.15rem; width: 1.15rem; height: 1.15rem; } }
    .rae__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
    .rae__head h2 { margin: 0.15rem 0 0; font-size: 1rem; font-weight: 700; }
    .rae__head p { margin: 0.2rem 0 0; font-size: 0.68rem; color: #64748b; line-height: 1.5; max-width: 32rem; }
    .rae__body { padding: 0 !important; max-height: min(62vh, 520px); overflow-y: auto; scrollbar-width: thin; }
    .rae__current { display: flex; gap: 0.65rem; align-items: center; padding: 0.65rem 0.75rem; margin-bottom: 0.75rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; }
    .rae__avatar { display: flex; align-items: center; justify-content: center; width: 2.4rem; height: 2.4rem; border-radius: 10px; background: ${ADMIN_ROLES_ACCENT}; color: #fff; font-size: 0.82rem; font-weight: 800; flex-shrink: 0; }
    .rae__current strong { display: block; font-size: 0.82rem; }
    .rae__current span { display: block; font-size: 0.66rem; color: #64748b; }
    .rae__current-meta { display: flex; align-items: center; gap: 0.45rem; margin-top: 0.25rem; em { font-style: normal; font-size: 0.62rem; color: #94a3b8; } }
    .rae__layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(200px, 240px); gap: 0.85rem; align-items: start; }
    .rae__section { padding: 0.75rem 0.9rem; border-radius: 11px; border: 1px solid #e2e8f0; background: #fafbfc; }
    .rae__section h3 { display: flex; align-items: center; gap: 0.32rem; margin: 0 0 0.5rem; font-size: 0.72rem; font-weight: 700; color: ${ADMIN_ROLES_ACCENT}; &:not(:first-child) { margin-top: 0.75rem; } mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; } }
    .rae__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 0.75rem; }
    .rae__field { width: 100%; }
    .rae__change-preview { display: flex; align-items: center; gap: 0.55rem; margin: 0.65rem 0; padding: 0.55rem 0.65rem; border-radius: 9px; background: ${ADMIN_ROLES_ACCENT_LIGHT}; border: 1px solid ${ADMIN_ROLES_ACCENT_BORDER}; mat-icon { color: ${ADMIN_ROLES_ACCENT}; font-size: 1rem; width: 1rem; height: 1rem; } span { display: block; font-size: 0.56rem; text-transform: uppercase; color: #94a3b8; font-weight: 650; } strong { display: block; font-size: 0.76rem; margin-top: 0.06rem; } }
    .rae__toggle { display: flex; align-items: flex-start; gap: 0.6rem; margin-top: 0.65rem; padding: 0.6rem 0.65rem; border-radius: 9px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; strong { display: block; font-size: 0.72rem; } span { display: block; font-size: 0.62rem; color: #64748b; margin-top: 0.1rem; line-height: 1.45; } }
    .rae__aside { display: flex; flex-direction: column; gap: 0.55rem; }
    .rae__meta { padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid ${ADMIN_ROLES_ACCENT_BORDER}; background: ${ADMIN_ROLES_ACCENT_LIGHT}; h4 { margin: 0 0 0.45rem; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: ${ADMIN_ROLES_ACCENT}; } ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.32rem; li { display: flex; align-items: flex-start; gap: 0.32rem; font-size: 0.64rem; color: #475569; line-height: 1.45; mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: ${ADMIN_ROLES_ACCENT}; flex-shrink: 0; margin-top: 0.05rem; } } } dl { display: flex; flex-direction: column; gap: 0.35rem; margin: 0; dt { font-size: 0.54rem; text-transform: uppercase; color: #94a3b8; font-weight: 650; } dd { margin: 0.05rem 0 0; font-size: 0.72rem; font-weight: 500; } } }
    .rae__actions { display: flex; flex-wrap: wrap; gap: 0.45rem; padding: 0.85rem 0 0; margin: 0.85rem 0 0; border-top: 1px solid #e2e8f0; min-height: unset; }
    .page-action-btn--primary { background: ${ADMIN_ROLES_ACCENT}; border-color: #4338ca; }
    @media (max-width: 720px) { .rae { padding: 1rem; } .rae__layout, .rae__grid { grid-template-columns: 1fr; } }
  `,
})
export class AdminRoleAssignmentEditDialogComponent {
  readonly data = inject<AdminRoleAssignmentEditData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<AdminRoleAssignmentEditDialogComponent>)
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)

  relativeTime = adminRelativeTime
  readonly roleNames = ADMIN_ROLE_NAMES
  readonly scopes = ADMIN_ROLE_SCOPES
  readonly assignableUsers = ASSIGNABLE_USERS

  readonly isEdit = this.data.mode === 'edit'

  readonly form = new FormGroup({
    userEmail: new FormControl(this.data.assignment?.user ?? ASSIGNABLE_USERS[0]?.email ?? '', {
      nonNullable: true,
      validators: Validators.required,
    }),
    role: new FormControl(this.data.assignment?.role ?? this.data.defaultRole ?? 'Operator', {
      nonNullable: true,
      validators: Validators.required,
    }),
    scope: new FormControl(this.data.assignment?.scope ?? 'Global', { nonNullable: true, validators: Validators.required }),
    notifyUser: new FormControl(true, { nonNullable: true }),
  })

  get initials(): string {
    const name = this.data.assignment?.userName ?? ''
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase() || '?'
  }

  handleSubmit = (): void => {
    if (this.form.invalid) return
    const v = this.form.getRawValue()
    const selectedUser = ASSIGNABLE_USERS.find((u) => u.email === v.userEmail)
    const payload: AdminRoleAssignmentRow = this.isEdit && this.data.assignment
      ? { ...this.data.assignment, role: v.role, scope: v.scope }
      : {
          id: `as-${Date.now()}`,
          user: v.userEmail,
          userName: selectedUser?.name ?? v.userEmail,
          department: selectedUser?.department ?? '—',
          role: v.role,
          scope: v.scope,
          assignedBy: 'admin@cloudops.local',
          assignedAt: new Date().toISOString(),
          status: 'running',
          mfa: false,
        }

    const actionId = this.isEdit ? 'edit-assignment' : 'assign'
    this.actions.runRowAction('roles', actionId, payload as unknown as Record<string, unknown>, 'Asignaciones', this.isEdit ? 'Cambiar rol' : 'Asignar rol')
    this.toast.success(this.isEdit ? `Rol actualizado: ${payload.user} → ${v.role}` : `Rol asignado a ${payload.user}`)
    this.dialogRef.close({ saved: true, assignment: payload })
  }
}
