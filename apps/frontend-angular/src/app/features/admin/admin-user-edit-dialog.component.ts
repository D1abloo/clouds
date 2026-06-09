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
  ADMIN_USERS_ACCENT,
  ADMIN_USERS_ACCENT_BORDER,
  ADMIN_USERS_ACCENT_LIGHT,
  adminRelativeTime,
} from './admin.config'
import type { AdminUserProfile } from './admin-users.types'

export interface AdminUserEditData {
  user: AdminUserProfile
}

@Component({
  selector: 'app-admin-user-edit-dialog',
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
    <article class="ued">
      <header class="ued__head">
        <div class="ued__identity">
          <span class="ued__avatar">{{ initials }}</span>
          <div class="ued__identity-text">
            <span class="ued__label">Editar usuario · {{ data.user.id }}</span>
            <h2>{{ data.user.name }}</h2>
            <p>{{ data.user.email }}</p>
          </div>
        </div>
        <div class="ued__head-badges">
          <app-status-badge [value]="data.user.status" />
          <span class="ued__role-chip">{{ data.user.role }}</span>
          <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
        </div>
      </header>

      <form [formGroup]="form" (ngSubmit)="handleSubmit()">
        <mat-dialog-content class="ued__body">
          <div class="ued__layout">
            <div class="ued__main">
              <section class="ued__section">
                <header class="ued__section-head">
                  <mat-icon>person</mat-icon>
                  <div>
                    <h3>Perfil</h3>
                    <p>Datos de contacto y organización del usuario</p>
                  </div>
                </header>
                <div class="ued__grid">
                  <mat-form-field appearance="outline" class="ued__field" subscriptSizing="dynamic">
                    <mat-label>Nombre completo</mat-label>
                    <input matInput formControlName="name" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="ued__field" subscriptSizing="dynamic">
                    <mat-label>Correo electrónico</mat-label>
                    <input matInput formControlName="email" type="email" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="ued__field" subscriptSizing="dynamic">
                    <mat-label>Cargo</mat-label>
                    <input matInput formControlName="title" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="ued__field" subscriptSizing="dynamic">
                    <mat-label>Teléfono</mat-label>
                    <input matInput formControlName="phone" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="ued__field" subscriptSizing="dynamic">
                    <mat-label>Departamento</mat-label>
                    <input matInput formControlName="department" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="ued__field" subscriptSizing="dynamic">
                    <mat-label>Ubicación</mat-label>
                    <input matInput formControlName="location" />
                  </mat-form-field>
                </div>
              </section>

              <section class="ued__section">
                <header class="ued__section-head">
                  <mat-icon>admin_panel_settings</mat-icon>
                  <div>
                    <h3>Acceso y permisos</h3>
                    <p>Rol RBAC, zona horaria y políticas de seguridad</p>
                  </div>
                </header>
                <div class="ued__grid ued__grid--access">
                  <mat-form-field appearance="outline" class="ued__field" subscriptSizing="dynamic">
                    <mat-label>Rol RBAC</mat-label>
                    <mat-select formControlName="role">
                      @for (r of roles; track r) {
                        <mat-option [value]="r">{{ r }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="ued__field" subscriptSizing="dynamic">
                    <mat-label>Zona horaria</mat-label>
                    <mat-select formControlName="timezone">
                      @for (tz of timezones; track tz) {
                        <mat-option [value]="tz">{{ tz }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                </div>
                <div class="ued__toggles">
                  <label class="ued__toggle-card">
                    <mat-slide-toggle formControlName="mfaRequired" aria-label="Exigir MFA" />
                    <div>
                      <strong>Exigir MFA</strong>
                      <span>Obliga a configurar segundo factor en el próximo acceso</span>
                    </div>
                  </label>
                  <label class="ued__toggle-card">
                    <mat-slide-toggle formControlName="notifyChanges" aria-label="Notificar cambios" />
                    <div>
                      <strong>Notificar por email</strong>
                      <span>Envía resumen de cambios al usuario afectado</span>
                    </div>
                  </label>
                </div>
              </section>
            </div>

            <aside class="ued__aside">
              <section class="ued__meta">
                <h4>Estado actual</h4>
                <dl>
                  <div><dt>ID</dt><dd class="mono">{{ data.user.id }}</dd></div>
                  <div><dt>MFA</dt><dd>{{ data.user.mfa ? data.user.mfaMethod : 'No configurado' }}</dd></div>
                  <div><dt>Último acceso</dt><dd>{{ data.user.lastLogin === '—' ? '—' : relativeTime(data.user.lastLogin) }}</dd></div>
                  <div><dt>Creado</dt><dd>{{ data.user.created | date: 'dd MMM yyyy' }}</dd></div>
                  <div><dt>Sesiones</dt><dd>{{ data.user.sessions ?? 0 }}</dd></div>
                  <div><dt>Riesgo</dt><dd [attr.data-risk]="data.user.riskLevel">{{ data.user.riskScore }}/100</dd></div>
                </dl>
              </section>
              <section class="ued__perms-preview">
                <h4>Permisos del rol</h4>
                <ul>
                  @for (p of data.user.permissions.slice(0, 5); track p) {
                    <li><mat-icon>check_circle</mat-icon><code>{{ p }}</code></li>
                  }
                  @if (data.user.permissions.length > 5) {
                    <li class="ued__more">+{{ data.user.permissions.length - 5 }} permisos más</li>
                  }
                </ul>
              </section>
              <aside class="ued__hint">
                <mat-icon>info</mat-icon>
                <p>
                  Los cambios de rol entran en vigor de inmediato. Las sesiones activas conservan permisos
                  hasta la renovación del token (~15 min).
                </p>
              </aside>
            </aside>
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="start" class="ued__actions">
          <button type="submit" class="page-action-btn page-action-btn--primary" [disabled]="form.invalid">
            <mat-icon>save</mat-icon> Guardar cambios
          </button>
          <button type="button" class="page-action-btn" mat-dialog-close>Cancelar</button>
        </mat-dialog-actions>
      </form>
    </article>
  `,
  styles: `
    :host { display: block; max-height: inherit; }
    .ued {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 100%;
      max-height: min(92vh, 900px);
      color: #0f172a;
      padding: 1.15rem 1.35rem 1.25rem;
      box-sizing: border-box;
      overflow: hidden;
    }
    .ued form {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .ued__head {
      display: flex;
      flex-shrink: 0;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      padding: 0.85rem 1rem;
      margin: 0 0 1rem;
      border-radius: 12px;
      border: 1px solid ${ADMIN_USERS_ACCENT_BORDER};
      background: linear-gradient(135deg, ${ADMIN_USERS_ACCENT_LIGHT} 0%, #fff 100%);
    }
    .ued__identity { display: flex; gap: 0.75rem; align-items: center; min-width: 0; flex: 1; }
    .ued__avatar {
      display: flex; align-items: center; justify-content: center;
      width: 2.75rem; height: 2.75rem; border-radius: 12px;
      background: linear-gradient(135deg, ${ADMIN_USERS_ACCENT}, #1d4ed8);
      color: #fff; font-size: 0.9rem; font-weight: 800; flex-shrink: 0;
      box-shadow: 0 4px 12px rgb(37 99 235 / 0.25);
    }
    .ued__identity-text { min-width: 0; }
    .ued__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
    .ued__head h2 { margin: 0.18rem 0 0; font-size: 1.05rem; font-weight: 700; line-height: 1.25; }
    .ued__head p { margin: 0.22rem 0 0; font-size: 0.72rem; color: #64748b; }
    .ued__head-badges { display: flex; align-items: center; gap: 0.45rem; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
    .ued__role-chip {
      font-size: 0.64rem; font-weight: 700; padding: 0.12rem 0.5rem; border-radius: 999px;
      background: #fff; border: 1px solid ${ADMIN_USERS_ACCENT_BORDER}; color: ${ADMIN_USERS_ACCENT};
    }
    .ued__body {
      flex: 1;
      min-height: 0;
      padding: 0 !important;
      margin: 0 !important;
      max-height: none;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 transparent;
      -webkit-overflow-scrolling: touch;
    }
    .ued__body::-webkit-scrollbar { width: 6px; }
    .ued__body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
    .ued__layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(220px, 260px);
      gap: 1rem;
      align-items: start;
    }
    .ued__main { display: flex; flex-direction: column; gap: 0.85rem; min-width: 0; }
    .ued__section {
      padding: 0.85rem 1rem 1rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #fafbfc;
    }
    .ued__section-head {
      display: flex; align-items: flex-start; gap: 0.55rem;
      margin-bottom: 0.75rem; padding-bottom: 0.65rem; border-bottom: 1px solid #e2e8f0;
      mat-icon { font-size: 1.15rem; width: 1.15rem; height: 1.15rem; color: ${ADMIN_USERS_ACCENT}; margin-top: 0.05rem; }
      h3 { margin: 0; font-size: 0.82rem; font-weight: 700; color: #0f172a; }
      p { margin: 0.15rem 0 0; font-size: 0.66rem; color: #64748b; line-height: 1.45; }
    }
    .ued__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.55rem 0.85rem;
    }
    .ued__grid--access { max-width: 100%; }
    .ued__field { width: 100%; margin: 0; }
    .ued__toggles { display: flex; flex-direction: column; gap: 0.55rem; margin-top: 0.75rem; }
    .ued__toggle-card {
      display: flex; align-items: flex-start; gap: 0.65rem;
      padding: 0.65rem 0.75rem; border-radius: 10px;
      border: 1px solid #e2e8f0; background: #fff; cursor: pointer;
      strong { display: block; font-size: 0.74rem; font-weight: 700; color: #0f172a; }
      span { display: block; font-size: 0.64rem; color: #64748b; line-height: 1.45; margin-top: 0.12rem; }
    }
    .ued__aside { display: flex; flex-direction: column; gap: 0.65rem; min-width: 0; }
    .ued__meta, .ued__perms-preview {
      padding: 0.75rem 0.85rem; border-radius: 11px;
      border: 1px solid ${ADMIN_USERS_ACCENT_BORDER}; background: ${ADMIN_USERS_ACCENT_LIGHT};
      h4 { margin: 0 0 0.5rem; font-size: 0.64rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: ${ADMIN_USERS_ACCENT}; }
    }
    .ued__meta dl { display: flex; flex-direction: column; gap: 0.42rem; margin: 0; }
    .ued__meta dt { font-size: 0.56rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
    .ued__meta dd { margin: 0.06rem 0 0; font-size: 0.74rem; font-weight: 500; &[data-risk='high'] { color: #dc2626; font-weight: 700; } &[data-risk='medium'] { color: #d97706; } &[data-risk='low'] { color: #15803d; } }
    .ued__perms-preview ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.28rem; }
    .ued__perms-preview li { display: flex; align-items: center; gap: 0.28rem; font-size: 0.66rem; mat-icon { font-size: 0.82rem; width: 0.82rem; height: 0.82rem; color: #15803d; } code { font-size: 0.62rem; } &.ued__more { color: #64748b; padding-left: 1.1rem; font-size: 0.62rem; } }
    .ued__hint {
      display: flex; gap: 0.5rem; padding: 0.65rem 0.75rem; border-radius: 10px;
      border: 1px dashed ${ADMIN_USERS_ACCENT_BORDER}; background: #fff;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: ${ADMIN_USERS_ACCENT}; flex-shrink: 0; margin-top: 0.05rem; }
      p { margin: 0; font-size: 0.64rem; color: #475569; line-height: 1.55; }
    }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
    .ued__actions {
      display: flex; flex-wrap: wrap; gap: 0.45rem;
      flex-shrink: 0;
      padding: 1rem 0 0; margin: 1rem 0 0;
      border-top: 1px solid #e2e8f0; min-height: unset;
    }
    .page-action-btn--primary { background: ${ADMIN_USERS_ACCENT}; border-color: #1d4ed8; }
    @media (max-width: 780px) {
      .ued { padding: 1rem; }
      .ued__layout { grid-template-columns: 1fr; }
      .ued__grid { grid-template-columns: 1fr; }
      .ued__head { flex-direction: column; }
      .ued__head-badges { width: 100%; justify-content: space-between; }
    }
  `,
})
export class AdminUserEditDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AdminUserEditDialogComponent>)
  readonly data = inject<AdminUserEditData>(MAT_DIALOG_DATA)
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)

  relativeTime = adminRelativeTime
  readonly roles = ['Super Admin', 'Admin', 'Operator', 'Viewer', 'Service Account']
  readonly timezones = ['Europe/Madrid (UTC+1)', 'Europe/London (UTC+0)', 'America/New_York (UTC-5)', 'UTC']

  readonly form = new FormGroup({
    name: new FormControl(this.data.user.name, { nonNullable: true, validators: Validators.required }),
    email: new FormControl(this.data.user.email, { nonNullable: true, validators: [Validators.required, Validators.email] }),
    title: new FormControl(this.data.user.title, { nonNullable: true }),
    phone: new FormControl(this.data.user.phone, { nonNullable: true }),
    department: new FormControl(this.data.user.department, { nonNullable: true }),
    location: new FormControl(this.data.user.location, { nonNullable: true }),
    role: new FormControl(this.data.user.role, { nonNullable: true, validators: Validators.required }),
    timezone: new FormControl(this.data.user.timezone, { nonNullable: true }),
    mfaRequired: new FormControl(!this.data.user.mfa, { nonNullable: true }),
    notifyChanges: new FormControl(true, { nonNullable: true }),
  })

  get initials(): string {
    const parts = this.data.user.name.split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return this.data.user.name.slice(0, 2).toUpperCase()
  }

  handleSubmit = (): void => {
    if (this.form.invalid) return
    const v = this.form.getRawValue()
    this.actions.runRowAction('users', 'edit', { ...this.data.user, ...v } as unknown as Record<string, unknown>, undefined, 'Editar usuario')
    this.toast.success(`Usuario actualizado: ${v.email}`)
    this.dialogRef.close({ saved: true, ...v })
  }
}
