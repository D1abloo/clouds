import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { ToastService } from '../../core/services/toast.service'
import { ADMIN_USERS_ACCENT, ADMIN_USERS_ACCENT_BORDER, ADMIN_USERS_ACCENT_LIGHT, adminRelativeTime } from './admin.config'
import type { AdminUserProfile, AdminUserSessionRow } from './admin-users.types'

export type AdminUserActionMode = 'reset-mfa' | 'suspend'

export interface AdminUserActionData {
  user: AdminUserProfile
  mode: AdminUserActionMode
}

@Component({
  selector: 'app-admin-user-action-dialog',
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
  ],
  template: `
    <article class="uact" [attr.data-mode]="data.mode">
      <header class="uact__head">
        <div class="uact__icon-wrap">
          <mat-icon>{{ data.mode === 'reset-mfa' ? 'lock_reset' : 'block' }}</mat-icon>
        </div>
        <div>
          <span class="uact__label">{{ data.mode === 'reset-mfa' ? 'Seguridad · MFA' : 'Acceso · Suspensión' }}</span>
          <h2>{{ title }}</h2>
          <p>{{ subtitle }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content class="uact__body">
        <section class="uact__target">
          <span class="uact__target-avatar">{{ initials }}</span>
          <div>
            <strong>{{ data.user.name }}</strong>
            <span>{{ data.user.email }}</span>
            <em>{{ data.user.role }} · {{ data.user.department }}</em>
          </div>
        </section>

        @if (data.mode === 'reset-mfa') {
          <dl class="uact__facts">
            <div><dt>Método actual</dt><dd>{{ data.user.mfaMethod ?? 'No configurado' }}</dd></div>
            <div><dt>Sesiones activas</dt><dd>{{ sessions.length }}</dd></div>
            <div><dt>Último acceso</dt><dd>{{ data.user.lastLogin === '—' ? '—' : relativeTime(data.user.lastLogin) }}</dd></div>
            <div><dt>Score de riesgo</dt><dd [attr.data-risk]="data.user.riskLevel">{{ data.user.riskScore }}/100</dd></div>
          </dl>
          <aside class="uact__warn uact__warn--info">
            <mat-icon>info</mat-icon>
            <div>
              <strong>Qué ocurre al resetear MFA</strong>
              <p>Se invalidan los factores TOTP/WebAuthn registrados. El usuario deberá configurar MFA de nuevo en el próximo inicio de sesión. Las sesiones web permanecen activas hasta revocarlas manualmente.</p>
            </div>
          </aside>
          @if (sessions.length) {
            <section class="uact__sessions">
              <h3>Sesiones que conservarán acceso</h3>
              <ul>
                @for (s of sessions; track s.id) {
                  <li><mat-icon>devices</mat-icon><span>{{ s.device }}</span><em>{{ s.ip }} · {{ s.location }}</em></li>
                }
              </ul>
            </section>
          }
        }

        @if (data.mode === 'suspend') {
          <dl class="uact__facts">
            <div><dt>Logins (30 d)</dt><dd>{{ data.user.loginCount30d }}</dd></div>
            <div><dt>Fallos (24 h)</dt><dd>{{ data.user.failedLogins24h }}</dd></div>
            <div><dt>Tokens API</dt><dd>{{ data.user.apiTokensCount }}</dd></div>
            <div><dt>MFA</dt><dd>{{ data.user.mfa ? 'Activo' : 'No configurado' }}</dd></div>
          </dl>
          <aside class="uact__warn uact__warn--danger">
            <mat-icon>warning</mat-icon>
            <div>
              <strong>Efecto inmediato</strong>
              <p>El usuario no podrá iniciar sesión ni usar tokens API asociados. Las sesiones activas se revocarán en ~30 segundos. Esta acción queda registrada en auditoría.</p>
            </div>
          </aside>
          <mat-form-field appearance="outline" class="uact__field">
            <mat-label>Motivo de suspensión</mat-label>
            <mat-select [formControl]="reasonControl">
              @for (r of suspendReasons; track r) {
                <mat-option [value]="r">{{ r }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="uact__field">
            <mat-label>Notas adicionales (opcional)</mat-label>
            <textarea matInput [formControl]="notesControl" rows="2" placeholder="Contexto para el equipo de seguridad…"></textarea>
          </mat-form-field>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="start" class="uact__actions">
        <button
          type="button"
          class="page-action-btn"
          [class.page-action-btn--primary]="data.mode === 'reset-mfa'"
          [class.uact__btn-danger]="data.mode === 'suspend'"
          [disabled]="data.mode === 'suspend' && reasonControl.invalid"
          (click)="handleConfirm()"
        >
          <mat-icon>{{ data.mode === 'reset-mfa' ? 'lock_reset' : 'block' }}</mat-icon>
          {{ confirmLabel }}
        </button>
        <button type="button" class="page-action-btn" mat-dialog-close>Cancelar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .uact { width: 100%; color: #0f172a; }
    .uact__head { display: grid; grid-template-columns: auto 1fr auto; gap: 0.65rem; align-items: flex-start; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .uact__icon-wrap { display: flex; align-items: center; justify-content: center; width: 2.2rem; height: 2.2rem; border-radius: 10px; background: ${ADMIN_USERS_ACCENT_LIGHT}; border: 1px solid ${ADMIN_USERS_ACCENT_BORDER}; }
    .uact[data-mode='suspend'] .uact__icon-wrap { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
    .uact[data-mode='reset-mfa'] .uact__icon-wrap { color: ${ADMIN_USERS_ACCENT}; }
    .uact__icon-wrap mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    .uact__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .uact__head h2 { margin: 0.15rem 0 0; font-size: 0.98rem; font-weight: 700; }
    .uact__head p { margin: 0.2rem 0 0; font-size: 0.7rem; color: #64748b; line-height: 1.5; max-width: 28rem; }
    .uact__body { padding-top: 0.75rem !important; display: flex; flex-direction: column; gap: 0.75rem; max-height: min(62vh, 520px); }
    .uact__target { display: flex; gap: 0.6rem; align-items: center; padding: 0.55rem 0.65rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; }
    .uact__target-avatar { display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: 8px; background: ${ADMIN_USERS_ACCENT}; color: #fff; font-size: 0.72rem; font-weight: 800; flex-shrink: 0; }
    .uact__target strong { display: block; font-size: 0.82rem; }
    .uact__target span { display: block; font-size: 0.68rem; color: #64748b; }
    .uact__target em { display: block; font-size: 0.62rem; color: #94a3b8; font-style: normal; margin-top: 0.1rem; }
    .uact__facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem 1rem; margin: 0; }
    .uact__facts dt { font-size: 0.56rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
    .uact__facts dd { margin: 0.08rem 0 0; font-size: 0.78rem; font-weight: 600; &[data-risk='high'] { color: #dc2626; } &[data-risk='medium'] { color: #d97706; } &[data-risk='low'] { color: #15803d; } }
    .uact__warn { display: flex; gap: 0.5rem; padding: 0.6rem 0.7rem; border-radius: 10px; }
    .uact__warn mat-icon { flex-shrink: 0; font-size: 1rem; width: 1rem; height: 1rem; margin-top: 0.05rem; }
    .uact__warn strong { display: block; font-size: 0.72rem; margin-bottom: 0.2rem; }
    .uact__warn p { margin: 0; font-size: 0.68rem; line-height: 1.55; color: #475569; }
    .uact__warn--info { background: ${ADMIN_USERS_ACCENT_LIGHT}; border: 1px solid ${ADMIN_USERS_ACCENT_BORDER}; mat-icon { color: ${ADMIN_USERS_ACCENT}; } }
    .uact__warn--danger { background: #fef2f2; border: 1px solid #fecaca; mat-icon { color: #dc2626; } strong { color: #991b1b; } }
    .uact__sessions h3 { margin: 0 0 0.35rem; font-size: 0.68rem; font-weight: 700; color: #475569; }
    .uact__sessions ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
    .uact__sessions li { display: flex; align-items: center; gap: 0.35rem; font-size: 0.68rem; color: #475569; mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: #94a3b8; } em { margin-left: auto; font-style: normal; color: #94a3b8; font-size: 0.62rem; } }
    .uact__field { width: 100%; }
    .uact__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; padding-top: 0.65rem; border-top: 1px solid #e2e8f0; }
    .page-action-btn--primary { background: ${ADMIN_USERS_ACCENT}; border-color: #1d4ed8; }
    .uact__btn-danger { background: #dc2626 !important; border-color: #b91c1c !important; color: #fff !important; &:hover:not(:disabled) { background: #b91c1c !important; } }
  `,
})
export class AdminUserActionDialogComponent {
  readonly data = inject<AdminUserActionData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<AdminUserActionDialogComponent>)
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)

  relativeTime = adminRelativeTime
  readonly sessions: AdminUserSessionRow[] = []
  readonly suspendReasons = [
    'Política de seguridad',
    'Baja del empleado',
    'Cuenta comprometida',
    'Inactividad prolongada',
    'Violación de políticas',
  ]
  readonly reasonControl = new FormControl(this.suspendReasons[0], { nonNullable: true, validators: Validators.required })
  readonly notesControl = new FormControl('', { nonNullable: true })

  get title(): string {
    return this.data.mode === 'reset-mfa' ? 'Resetear autenticación MFA' : 'Suspender cuenta de usuario'
  }

  get subtitle(): string {
    return this.data.mode === 'reset-mfa'
      ? 'Elimina los factores de segundo factor y obliga a reconfigurarlos.'
      : 'Bloquea el acceso inmediato a la plataforma y revoca sesiones activas.'
  }

  get confirmLabel(): string {
    return this.data.mode === 'reset-mfa' ? 'Confirmar reset MFA' : 'Confirmar suspensión'
  }

  get initials(): string {
    const parts = this.data.user.name.split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return this.data.user.name.slice(0, 2).toUpperCase()
  }

  handleConfirm = (): void => {
    const actionId = this.data.mode === 'reset-mfa' ? 'reset-mfa' : 'suspend'
    const label = this.confirmLabel
    const payload = {
      ...this.data.user,
      reason: this.reasonControl.value,
      notes: this.notesControl.value,
    }
    this.actions.runRowAction('users', actionId, payload as unknown as Record<string, unknown>, undefined, label)
    if (this.data.mode === 'reset-mfa') {
      this.toast.success(`MFA reseteado para ${this.data.user.email}`)
    } else {
      this.toast.warning(`Usuario suspendido: ${this.data.user.email}`)
    }
    this.dialogRef.close({ action: actionId, id: this.data.user.id })
  }
}
