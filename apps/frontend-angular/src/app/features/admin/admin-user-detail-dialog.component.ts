import { DatePipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { ToastService } from '../../core/services/toast.service'
import {
  ADMIN_USERS_ACCENT,
  ADMIN_USERS_ACCENT_BORDER,
  ADMIN_USERS_ACCENT_LIGHT,
  adminRelativeTime,
} from './admin.config'
import {
  activityDonutSegments,
  enrichUserProfile,
  getUserAudit,
  getUserSessions,
  getUserSso,
  sparkPath,
  type AdminUserProfile,
  type AdminUserRow,
} from './admin-users.demo'
import { AdminUserEditDialogComponent } from './admin-user-edit-dialog.component'
import { AdminUserActionDialogComponent } from './admin-user-action-dialog.component'

export interface AdminUserDetailData {
  user: AdminUserRow
}

type DetailTab = 'overview' | 'security' | 'activity' | 'permissions'

@Component({
  selector: 'app-admin-user-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="udet">
      <header class="udet__head">
        <div class="udet__identity">
          <span class="udet__avatar">{{ initials }}</span>
          <div class="udet__identity-text">
            <span class="udet__label">Usuario · {{ profile().id }}</span>
            <h2>{{ profile().name }}</h2>
            <p>{{ profile().email }} · {{ profile().title }}</p>
          </div>
        </div>
        <div class="udet__head-meta">
          <span class="udet__risk" [attr.data-level]="profile().riskLevel">
            <mat-icon>{{ profile().riskLevel === 'high' ? 'warning' : profile().riskLevel === 'medium' ? 'info' : 'verified_user' }}</mat-icon>
            Riesgo {{ profile().riskScore }}/100
          </span>
          <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
        </div>
      </header>

      <div class="udet__badges">
        <app-status-badge [value]="profile().status" />
        <span class="udet__role">{{ profile().role }}</span>
        @if (profile().mfa) {
          <span class="udet__mfa"><mat-icon>verified_user</mat-icon> MFA · {{ profile().mfaMethod }}</span>
        } @else {
          <span class="udet__mfa udet__mfa--off"><mat-icon>gpp_bad</mat-icon> Sin MFA</span>
        }
        @if (profile().ssoProvider) {
          <span class="udet__sso"><mat-icon>key</mat-icon> {{ profile().ssoProvider }}</span>
        }
        @for (g of profile().groups; track g) {
          <span class="udet__group">{{ g }}</span>
        }
      </div>

      <nav class="udet__tabs" role="tablist" aria-label="Secciones del usuario">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            role="tab"
            class="udet__tab"
            [class.udet__tab--on]="view() === tab.id"
            [attr.aria-selected]="view() === tab.id"
            (click)="view.set(tab.id)"
          >
            <mat-icon>{{ tab.icon }}</mat-icon>{{ tab.label }}
          </button>
        }
      </nav>

      <mat-dialog-content class="udet__body">
        @switch (view()) {
          @case ('overview') {
            <div class="udet__split">
              <section class="udet__panel">
                <h3><mat-icon>badge</mat-icon> Información general</h3>
                <dl class="udet__grid udet__grid--3">
                  <div><dt>Departamento</dt><dd>{{ profile().department }}</dd></div>
                  <div><dt>Ubicación</dt><dd>{{ profile().location }}</dd></div>
                  <div><dt>Zona horaria</dt><dd>{{ profile().timezone }}</dd></div>
                  <div><dt>Teléfono</dt><dd>{{ profile().phone }}</dd></div>
                  <div><dt>Último acceso</dt><dd>{{ profile().lastLogin === '—' ? '—' : relativeTime(profile().lastLogin) }}</dd></div>
                  <div><dt>Creado</dt><dd>{{ profile().created | date: 'dd MMM yyyy' }}</dd></div>
                  <div><dt>Logins (30 d)</dt><dd>{{ profile().loginCount30d }}</dd></div>
                  <div><dt>Sesiones activas</dt><dd>{{ profile().sessions ?? sessions().length }}</dd></div>
                  <div><dt>Tokens API</dt><dd>{{ profile().apiTokensCount }}</dd></div>
                  @if (profile().invitedBy) {
                    <div><dt>Invitado por</dt><dd>{{ profile().invitedBy }}</dd></div>
                  }
                  @if (profile().suspendedAt) {
                    <div><dt>Suspendido</dt><dd>{{ profile().suspendedAt | date: 'dd MMM yyyy' }}</dd></div>
                    <div class="udet__full"><dt>Motivo</dt><dd>{{ profile().suspendReason }}</dd></div>
                  }
                </dl>
              </section>
              <section class="udet__panel udet__panel--charts">
                <h3><mat-icon>show_chart</mat-icon> Actividad de acceso (7 d)</h3>
                <div class="udet__spark-wrap">
                  <svg viewBox="0 0 140 36" preserveAspectRatio="none" aria-hidden="true">
                    <path [attr.d]="loginSparkPath()" fill="none" stroke="${ADMIN_USERS_ACCENT}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <div class="udet__spark-labels">
                    <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
                  </div>
                </div>
                <h3 class="udet__subhead"><mat-icon>pie_chart</mat-icon> Canal de acceso</h3>
                <div class="udet__donut-row">
                  <div class="udet__donut">
                    <svg viewBox="0 0 120 120" aria-hidden="true">
                      <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" stroke-width="12" />
                      @for (seg of donutSegments(); track seg.color) {
                        <circle cx="60" cy="60" r="48" fill="none" [attr.stroke]="seg.color" stroke-width="12" [attr.stroke-dasharray]="seg.dash + ' 302'" [attr.stroke-dashoffset]="seg.offset" stroke-linecap="round" transform="rotate(-90 60 60)" />
                      }
                    </svg>
                    <div class="udet__donut-center"><strong>{{ profile().loginCount30d }}</strong><span>logins</span></div>
                  </div>
                  <ul class="udet__legend">
                    @for (slice of profile().activityMix; track slice.label) {
                      <li><i [style.background]="slice.color"></i>{{ slice.label }}<strong>{{ slice.pct }}%</strong></li>
                    }
                  </ul>
                </div>
              </section>
            </div>
          }
          @case ('security') {
            <div class="udet__split">
              <section class="udet__panel">
                <h3><mat-icon>shield</mat-icon> Postura de seguridad</h3>
                <dl class="udet__grid">
                  <div><dt>MFA</dt><dd>{{ profile().mfa ? profile().mfaMethod : 'No configurado' }}</dd></div>
                  <div><dt>Último cambio contraseña</dt><dd>{{ profile().lastPasswordChange | date: 'dd MMM yyyy' }}</dd></div>
                  <div><dt>Fallos login (24 h)</dt><dd [class.udet__warn-val]="profile().failedLogins24h > 2">{{ profile().failedLogins24h }}</dd></div>
                  <div><dt>Score de riesgo</dt><dd [attr.data-risk]="profile().riskLevel">{{ profile().riskScore }}/100</dd></div>
                </dl>
                @if (sso()) {
                  <div class="udet__sso-card">
                    <h4>SSO · {{ sso()!.provider }}</h4>
                    <dl>
                      <div><dt>ID externo</dt><dd class="mono">{{ sso()!.externalId }}</dd></div>
                      <div><dt>Rol mapeado</dt><dd>{{ sso()!.mappedRole }}</dd></div>
                      <div><dt>Última sync</dt><dd>{{ relativeTime(sso()!.lastSync) }}</dd></div>
                    </dl>
                  </div>
                }
              </section>
              <section class="udet__panel">
                <h3><mat-icon>devices</mat-icon> Sesiones activas ({{ sessions().length }})</h3>
                @if (sessions().length === 0) {
                  <p class="udet__empty">Sin sesiones activas registradas.</p>
                } @else {
                  <ul class="udet__session-list">
                    @for (s of sessions(); track s.id) {
                      <li>
                        <mat-icon>computer</mat-icon>
                        <div>
                          <strong>{{ s.device }}</strong>
                          <span>{{ s.ip }} · {{ s.location }}</span>
                          <em>Activa {{ relativeTime(s.lastActive) }}</em>
                        </div>
                        <app-status-badge [value]="s.status" />
                      </li>
                    }
                  </ul>
                }
              </section>
            </div>
          }
          @case ('activity') {
            <section class="udet__panel udet__panel--wide">
              <h3><mat-icon>history</mat-icon> Eventos recientes de auditoría</h3>
              @if (audit().length === 0) {
                <p class="udet__empty">Sin eventos de auditoría para este usuario.</p>
              } @else {
                <table class="udet__table" aria-label="Auditoría del usuario">
                  <thead><tr><th>Acción</th><th>Recurso</th><th>IP</th><th>Estado</th><th>Cuándo</th></tr></thead>
                  <tbody>
                    @for (e of audit(); track e.id) {
                      <tr>
                        <td><code>{{ e.action }}</code></td>
                        <td>{{ e.resource }}</td>
                        <td class="mono">{{ e.ip }}</td>
                        <td><app-status-badge [value]="e.status" /></td>
                        <td>{{ relativeTime(e.at) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </section>
          }
          @case ('permissions') {
            <div class="udet__split">
              <section class="udet__panel">
                <h3><mat-icon>policy</mat-icon> Permisos efectivos ({{ profile().permissions.length }})</h3>
                <ul class="udet__perm-list">
                  @for (p of profile().permissions; track p) {
                    <li><mat-icon>check_circle</mat-icon><code>{{ p }}</code></li>
                  }
                </ul>
              </section>
              <section class="udet__panel">
                <h3><mat-icon>insights</mat-icon> Distribución por módulo</h3>
                <div class="udet__perm-bars">
                  @for (bar of permissionBars(); track bar.label) {
                    <article>
                      <header><span>{{ bar.label }}</span><strong>{{ bar.count }}</strong></header>
                      <div class="udet__bar" aria-hidden="true"><span [style.width.%]="bar.pct"></span></div>
                    </article>
                  }
                </div>
              </section>
            </div>
          }
        }
      </mat-dialog-content>

      <section class="udet__actions-panel">
        <h3>Acciones administrativas</h3>
        <div class="udet__action-cards">
          <button type="button" class="udet__action-card" (click)="openEdit()">
            <mat-icon>edit</mat-icon>
            <div><strong>Editar usuario</strong><span>Perfil, rol, departamento y preferencias de acceso</span></div>
          </button>
          @if (profile().status === 'running' && profile().mfa) {
            <button type="button" class="udet__action-card" (click)="openAction('reset-mfa')">
              <mat-icon>lock_reset</mat-icon>
              <div><strong>Resetear MFA</strong><span>Invalida TOTP/WebAuthn; requiere reconfiguración</span></div>
            </button>
          }
          @if (profile().status === 'running') {
            <button type="button" class="udet__action-card udet__action-card--danger" (click)="openAction('suspend')">
              <mat-icon>block</mat-icon>
              <div><strong>Suspender cuenta</strong><span>Revoca sesiones y bloquea acceso inmediato</span></div>
            </button>
          }
          @if (profile().status === 'pending') {
            <button type="button" class="udet__action-card udet__action-card--primary" (click)="handleAction('resend', 'Reenviar invitación')">
              <mat-icon>mail</mat-icon>
              <div><strong>Reenviar invitación</strong><span>Envía nuevo enlace de activación (válido 72 h)</span></div>
            </button>
          }
          @if (profile().status === 'stopped') {
            <button type="button" class="udet__action-card udet__action-card--primary" (click)="handleAction('reactivate', 'Reactivar usuario')">
              <mat-icon>check_circle</mat-icon>
              <div><strong>Reactivar cuenta</strong><span>Restaura acceso con el rol y permisos previos</span></div>
            </button>
          }
        </div>
      </section>

      <mat-dialog-actions align="start" class="udet__footer">
        <button type="button" class="page-action-btn" (click)="handleExport()">
          <mat-icon>download</mat-icon> Exportar ficha
        </button>
        <button type="button" class="page-action-btn" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .udet { width: 100%; color: #0f172a; }
    .udet__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; padding-bottom: 0.65rem; border-bottom: 1px solid #e2e8f0; }
    .udet__identity { display: flex; gap: 0.65rem; align-items: flex-start; min-width: 0; flex: 1; }
    .udet__avatar { display: flex; align-items: center; justify-content: center; width: 2.6rem; height: 2.6rem; border-radius: 12px; background: linear-gradient(135deg, ${ADMIN_USERS_ACCENT}, #1d4ed8); color: #fff; font-size: 0.88rem; font-weight: 800; flex-shrink: 0; }
    .udet__identity-text { min-width: 0; }
    .udet__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .udet__head h2 { margin: 0.12rem 0 0; font-size: 1.08rem; font-weight: 700; }
    .udet__head p { margin: 0.18rem 0 0; font-size: 0.72rem; color: #64748b; }
    .udet__head-meta { display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0; }
    .udet__risk { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.62rem; font-weight: 700; padding: 0.18rem 0.45rem; border-radius: 999px; &[data-level='low'] { background: #dcfce7; color: #15803d; } &[data-level='medium'] { background: #fef3c7; color: #b45309; } &[data-level='high'] { background: #fee2e2; color: #dc2626; } mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; } }
    .udet__badges { display: flex; flex-wrap: wrap; gap: 0.32rem; align-items: center; padding: 0.55rem 0 0.45rem; }
    .udet__role { font-size: 0.66rem; font-weight: 700; padding: 0.1rem 0.45rem; border-radius: 999px; background: ${ADMIN_USERS_ACCENT_LIGHT}; border: 1px solid ${ADMIN_USERS_ACCENT_BORDER}; color: ${ADMIN_USERS_ACCENT}; }
    .udet__mfa { display: inline-flex; align-items: center; gap: 0.18rem; font-size: 0.6rem; font-weight: 600; color: #15803d; &--off { color: #b45309; } mat-icon { font-size: 0.82rem; width: 0.82rem; height: 0.82rem; } }
    .udet__sso, .udet__group { display: inline-flex; align-items: center; gap: 0.15rem; font-size: 0.6rem; font-weight: 600; padding: 0.08rem 0.38rem; border-radius: 999px; background: #f1f5f9; color: #475569; mat-icon { font-size: 0.78rem; width: 0.78rem; height: 0.78rem; } }
    .udet__tabs { display: flex; flex-wrap: wrap; gap: 0.18rem; padding: 0.18rem; border-radius: 10px; background: ${ADMIN_USERS_ACCENT_LIGHT}; margin-bottom: 0.5rem; }
    .udet__tab { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.32rem 0.55rem; border: none; border-radius: 8px; background: transparent; font: inherit; font-size: 0.66rem; font-weight: 600; color: #1d4ed8; cursor: pointer; }
    .udet__tab--on { background: #fff; color: ${ADMIN_USERS_ACCENT}; box-shadow: 0 1px 2px rgb(37 99 235 / 0.08); }
    .udet__tab mat-icon { font-size: 0.88rem; width: 0.88rem; height: 0.88rem; }
    .udet__body { padding: 0 !important; max-height: min(52vh, 420px); overflow-y: auto; scrollbar-width: thin; }
    .udet__split { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr); gap: 0.65rem; }
    .udet__panel { padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #fafbfc; &--wide { grid-column: 1 / -1; } &--charts { display: flex; flex-direction: column; gap: 0.45rem; } }
    .udet__panel h3, .udet__subhead { display: flex; align-items: center; gap: 0.32rem; margin: 0 0 0.45rem; font-size: 0.72rem; font-weight: 700; color: ${ADMIN_USERS_ACCENT}; }
    .udet__subhead { margin-top: 0.35rem; }
    .udet__panel h3 mat-icon, .udet__subhead mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    .udet__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.42rem 0.85rem; margin: 0; &--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    .udet__grid dt { font-size: 0.56rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
    .udet__grid dd { margin: 0.08rem 0 0; font-size: 0.76rem; font-weight: 500; &[data-risk='high'] { color: #dc2626; font-weight: 700; } &[data-risk='medium'] { color: #d97706; } &[data-risk='low'] { color: #15803d; } }
    .udet__full { grid-column: 1 / -1; }
    .udet__warn-val { color: #dc2626 !important; font-weight: 700 !important; }
    .udet__spark-wrap svg { width: 100%; height: 40px; display: block; }
    .udet__spark-labels { display: flex; justify-content: space-between; font-size: 0.52rem; color: #94a3b8; margin-top: 0.15rem; }
    .udet__donut-row { display: flex; gap: 0.65rem; align-items: center; }
    .udet__donut { position: relative; width: 88px; height: 88px; flex-shrink: 0; svg { width: 100%; height: 100%; } }
    .udet__donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; strong { font-size: 0.82rem; font-weight: 800; } span { font-size: 0.48rem; color: #94a3b8; text-transform: uppercase; } }
    .udet__legend { list-style: none; margin: 0; padding: 0; flex: 1; display: flex; flex-direction: column; gap: 0.28rem; li { display: flex; align-items: center; gap: 0.32rem; font-size: 0.64rem; color: #475569; i { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; } strong { margin-left: auto; font-size: 0.68rem; color: #0f172a; } } }
    .udet__sso-card { margin-top: 0.55rem; padding: 0.5rem 0.6rem; border-radius: 8px; border: 1px solid ${ADMIN_USERS_ACCENT_BORDER}; background: #fff; h4 { margin: 0 0 0.35rem; font-size: 0.68rem; font-weight: 700; } dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.35rem; margin: 0; dt { font-size: 0.54rem; color: #94a3b8; text-transform: uppercase; } dd { margin: 0.05rem 0 0; font-size: 0.72rem; } } }
    .udet__session-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; li { display: flex; align-items: flex-start; gap: 0.4rem; padding: 0.4rem 0.45rem; border-radius: 8px; background: #fff; border: 1px solid #e2e8f0; mat-icon { color: #94a3b8; font-size: 1rem; width: 1rem; height: 1rem; margin-top: 0.1rem; } strong { display: block; font-size: 0.72rem; } span { display: block; font-size: 0.62rem; color: #64748b; } em { display: block; font-size: 0.58rem; color: #94a3b8; font-style: normal; margin-top: 0.08rem; } } }
    .udet__table { width: 100%; border-collapse: collapse; font-size: 0.72rem; th, td { padding: 0.38rem 0.45rem; text-align: left; border-bottom: 1px solid #e2e8f0; } th { font-size: 0.56rem; text-transform: uppercase; color: #94a3b8; font-weight: 650; } code { font-size: 0.68rem; } }
    .udet__perm-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.28rem; max-height: 220px; overflow-y: auto; li { display: flex; align-items: center; gap: 0.32rem; font-size: 0.7rem; mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: #15803d; } code { font-size: 0.68rem; } } }
    .udet__perm-bars { display: flex; flex-direction: column; gap: 0.45rem; article header { display: flex; justify-content: space-between; font-size: 0.66rem; margin-bottom: 0.2rem; span { color: #64748b; } strong { color: #0f172a; } } }
    .udet__bar { height: 6px; border-radius: 999px; background: #e2e8f0; overflow: hidden; span { display: block; height: 100%; border-radius: inherit; background: ${ADMIN_USERS_ACCENT}; } }
    .udet__empty { margin: 0; font-size: 0.72rem; color: #94a3b8; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
    .udet__actions-panel { margin-top: 0.55rem; padding-top: 0.55rem; border-top: 1px solid #e2e8f0; h3 { margin: 0 0 0.4rem; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.04em; } }
    .udet__action-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.4rem; }
    .udet__action-card { display: flex; align-items: flex-start; gap: 0.45rem; padding: 0.55rem 0.65rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; text-align: left; font: inherit; transition: border-color 0.15s, box-shadow 0.15s; &:hover { border-color: ${ADMIN_USERS_ACCENT_BORDER}; box-shadow: 0 2px 8px rgb(37 99 235 / 0.08); } mat-icon { color: ${ADMIN_USERS_ACCENT}; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; margin-top: 0.05rem; } strong { display: block; font-size: 0.74rem; color: #0f172a; } span { display: block; font-size: 0.62rem; color: #64748b; line-height: 1.45; margin-top: 0.12rem; } &--danger { border-color: #fecaca; mat-icon { color: #dc2626; } &:hover { border-color: #f87171; } } &--primary { border-color: ${ADMIN_USERS_ACCENT_BORDER}; background: ${ADMIN_USERS_ACCENT_LIGHT}; } }
    .udet__footer { display: flex; flex-wrap: wrap; gap: 0.35rem; padding-top: 0.55rem; margin: 0; min-height: unset; }
    @media (max-width: 760px) {
      .udet__split { grid-template-columns: 1fr; }
      .udet__grid--3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .udet__action-cards { grid-template-columns: 1fr; }
    }
  `,
})
export class AdminUserDetailDialogComponent {
  readonly data = inject<AdminUserDetailData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<AdminUserDetailDialogComponent>)
  private readonly dialog = inject(MatDialog)
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)

  relativeTime = adminRelativeTime
  readonly view = signal<DetailTab>('overview')

  readonly tabs = [
    { id: 'overview' as const, label: 'Resumen', icon: 'dashboard' },
    { id: 'security' as const, label: 'Seguridad', icon: 'shield' },
    { id: 'activity' as const, label: 'Actividad', icon: 'history' },
    { id: 'permissions' as const, label: 'Permisos', icon: 'policy' },
  ]

  readonly profile = computed(() => enrichUserProfile(this.data.user))
  readonly sessions = computed(() => getUserSessions(this.profile().email))
  readonly audit = computed(() => getUserAudit(this.profile().email))
  readonly sso = computed(() => getUserSso(this.profile().email))
  readonly donutSegments = computed(() => activityDonutSegments(this.profile().activityMix))

  readonly permissionBars = computed(() => {
    const perms = this.profile().permissions
    const modules = [
      { label: 'Cloud', match: (p: string) => p.startsWith('cloud') },
      { label: 'VPS / Infra', match: (p: string) => p.startsWith('vps') },
      { label: 'Terraform', match: (p: string) => p.startsWith('terraform') },
      { label: 'Jenkins / CI', match: (p: string) => p.startsWith('jenkins') },
      { label: 'Admin / Users', match: (p: string) => p.startsWith('admin') || p.startsWith('users') || p.startsWith('audit') },
      { label: 'API / Otros', match: (p: string) => p.startsWith('api') || p.startsWith('metrics') || p.startsWith('webhooks') || p.startsWith('dashboard') || p.startsWith('logs') },
    ]
    const counts = modules.map((m) => ({
      label: m.label,
      count: perms.filter(m.match).length,
    }))
    const max = Math.max(...counts.map((c) => c.count), 1)
    return counts.filter((c) => c.count > 0).map((c) => ({ ...c, pct: Math.round((c.count / max) * 100) }))
  })

  get initials(): string {
    const parts = this.profile().name.split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return this.profile().name.slice(0, 2).toUpperCase()
  }

  loginSparkPath = (): string => sparkPath(this.profile().loginSpark)

  openEdit = (): void => {
    this.dialog.open(AdminUserEditDialogComponent, {
      width: 'min(820px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '92vh',
      panelClass: 'admin-user-edit-dialog-panel',
      data: { user: this.profile() },
    })
  }

  openAction = (mode: 'reset-mfa' | 'suspend'): void => {
    const ref = this.dialog.open(AdminUserActionDialogComponent, {
      width: 'min(560px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '90vh',
      panelClass: 'admin-user-action-dialog-panel',
      data: { user: this.profile(), mode },
    })
    ref.afterClosed().subscribe((result) => {
      if (result?.action) this.dialogRef.close(result)
    })
  }

  handleAction = (actionId: string, label: string): void => {
    this.actions.runRowAction('users', actionId, this.profile() as unknown as Record<string, unknown>, undefined, label)
    this.toast.info(`${label}: ${this.profile().email}`)
    this.dialogRef.close({ action: actionId, id: this.profile().id })
  }

  handleExport = (): void => {
    const p = this.profile()
    const content = [
      `Ficha de usuario — ${p.name}`,
      `ID: ${p.id}`,
      `Email: ${p.email}`,
      `Rol: ${p.role}`,
      `Departamento: ${p.department}`,
      `Estado: ${p.status}`,
      `MFA: ${p.mfa ? p.mfaMethod : 'No'}`,
      `Riesgo: ${p.riskScore}/100`,
      `Permisos: ${p.permissions.join(', ')}`,
    ].join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usuario-${p.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
    this.toast.success('Ficha exportada')
  }
}
