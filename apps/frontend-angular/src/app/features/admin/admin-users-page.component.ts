import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { toSignal } from '@angular/core/rxjs-interop'
import { debounceTime, startWith } from 'rxjs'
import { PageHeaderComponent, type PageHeaderAction } from '../../shared/components/page-header/page-header.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { ToastService } from '../../core/services/toast.service'
import {
  ADMIN_USERS_ACCENT,
  ADMIN_USERS_ACCENT_BORDER,
  ADMIN_USERS_ACCENT_LIGHT,
  adminRelativeTime,
  downloadBlob,
} from './admin.config'
import {
  ADMIN_USERS_ACTIVE,
  ADMIN_USERS_INVITED,
  ADMIN_USERS_SUSPENDED,
  ADMIN_USERS_AUDIT,
  ADMIN_USERS_SSO,
  ADMIN_USERS_SESSIONS,
  adminUsersRoleDistribution,
  adminUsersMfaDonut,
  enrichUserProfile,
  type AdminUserRow,
  type AdminUserAuditRow,
  type AdminUserSsoRow,
  type AdminUserSessionRow,
} from './admin-users.demo'
import { AdminUserDetailDialogComponent } from './admin-user-detail-dialog.component'
import { AdminUserInviteDialogComponent } from './admin-user-invite-dialog.component'
import { AdminUserEditDialogComponent } from './admin-user-edit-dialog.component'
import { AdminUserActionDialogComponent } from './admin-user-action-dialog.component'
import { ProConfigGateComponent } from '../../shared/components/pro-config-gate/pro-config-gate.component'

type UserTab = 'active' | 'invited' | 'suspended' | 'audit' | 'sso' | 'sessions'

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    ProConfigGateComponent,
  ],
  template: `
    <app-pro-config-gate module="Usuarios">
    <div class="page-container usr-page animate-fade-in">
      <app-page-header
        title="Usuarios"
        description="Gestiona cuentas, invitaciones, SSO y sesiones activas de la organización CloudOps."
        icon="groups"
        [actions]="headerActions"
        (actionClick)="handleHeader($event)"
      />

      <section class="usr-intro">
        <div class="usr-intro__main">
          <span class="usr-intro__eyebrow">Administración · Identidad</span>
          <h2 class="usr-intro__title">Directorio de usuarios</h2>
          <p class="usr-intro__desc">
            Invita miembros del equipo, asigna roles RBAC y audita accesos. Las cuentas de servicio
            se gestionan con tokens API dedicados.
          </p>
        </div>
        <ul class="usr-intro__uses">
          <li><mat-icon>person_add</mat-icon><span>Invitaciones con enlace de activación</span></li>
          <li><mat-icon>key</mat-icon><span>SSO con Okta, Azure AD y SAML</span></li>
          <li><mat-icon>history</mat-icon><span>Auditoría de login y cambios de rol</span></li>
        </ul>
      </section>

      <section class="usr-charts">
        <article class="usr-chart-panel">
          <h3><mat-icon>bar_chart</mat-icon> Usuarios por rol</h3>
          <div class="usr-role-bars">
            @for (r of roleDistribution(); track r.role) {
              <div class="usr-role-bar">
                <header><span>{{ r.role }}</span><strong>{{ r.count }}</strong></header>
                <div class="usr-role-bar__track" aria-hidden="true">
                  <span [style.width.%]="roleBarPct(r.count)" [style.background]="r.color"></span>
                </div>
              </div>
            }
          </div>
        </article>
        <article class="usr-chart-panel usr-chart-panel--donut">
          <h3><mat-icon>verified_user</mat-icon> Cobertura MFA</h3>
          <div class="usr-mfa-donut">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" stroke-width="12" />
              @for (seg of mfaDonutSegments(); track seg.color) {
                <circle
                  cx="60" cy="60" r="48" fill="none"
                  [attr.stroke]="seg.color" stroke-width="12"
                  [attr.stroke-dasharray]="seg.dash + ' 302'"
                  [attr.stroke-dashoffset]="seg.offset"
                  stroke-linecap="round"
                  transform="rotate(-90 60 60)"
                />
              }
            </svg>
            <div class="usr-mfa-donut__center"><strong>{{ mfaDonut().pct }}%</strong><span>con MFA</span></div>
          </div>
          <ul class="usr-mfa-legend">
            @for (s of mfaDonut().segments; track s.label) {
              <li><i [style.background]="s.color"></i>{{ s.label }}<strong>{{ s.count }}</strong><em>{{ s.pct }}%</em></li>
            }
          </ul>
        </article>
      </section>

      <div class="usr-bar">
        <nav class="usr-tabs" role="tablist" aria-label="Vistas de usuarios">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              class="usr-tabs__tab"
              [class.usr-tabs__tab--on]="view() === tab.id"
              [attr.aria-selected]="view() === tab.id"
              (click)="view.set(tab.id)"
            >
              <mat-icon>{{ tab.icon }}</mat-icon>
              {{ tab.label }}
              <span class="usr-tabs__count">{{ tabCount(tab.id) }}</span>
            </button>
          }
        </nav>
        <label class="usr-search">
          <mat-icon>search</mat-icon>
          <input type="search" [formControl]="searchControl" placeholder="Buscar email, nombre, rol…" aria-label="Buscar usuarios" />
        </label>
      </div>

      <div class="table-card usr-content">
        @switch (view()) {
          @case ('active') {
            @if (filteredActive().length === 0) {
              <app-empty-state title="Sin usuarios activos" icon="person_off" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover" aria-label="Usuarios activos">
                  <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Departamento</th><th>MFA</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead>
                  <tbody>
                    @for (row of filteredActive(); track row.id) {
                      <tr class="usr-row" (click)="openUserDetail(row)">
                        <td><strong>{{ row.name }}</strong></td>
                        <td>{{ row.email }}</td>
                        <td><span class="usr-role">{{ row.role }}</span></td>
                        <td>{{ row.department }}</td>
                        <td>@if (row.mfa) { <mat-icon class="usr-mfa-icon">verified_user</mat-icon> } @else { — }</td>
                        <td>{{ row.lastLogin === '—' ? '—' : relativeTime(row.lastLogin) }}</td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td (click)="$event.stopPropagation()">
                          <button mat-icon-button type="button" [matMenuTriggerFor]="userMenu" aria-label="Acciones" (click)="selectedUser.set(row)">
                            <mat-icon>more_vert</mat-icon>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
          @case ('invited') {
            @if (filteredInvited().length === 0) {
              <app-empty-state title="Sin invitaciones pendientes" icon="mail" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover" aria-label="Usuarios invitados">
                  <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Departamento</th><th>Invitado</th><th>Estado</th><th></th></tr></thead>
                  <tbody>
                    @for (row of filteredInvited(); track row.id) {
                      <tr class="usr-row" (click)="openUserDetail(row)">
                        <td><strong>{{ row.name }}</strong></td>
                        <td>{{ row.email }}</td>
                        <td><span class="usr-role">{{ row.role }}</span></td>
                        <td>{{ row.department }}</td>
                        <td>{{ relativeTime(row.created) }}</td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td (click)="$event.stopPropagation()">
                          <button mat-icon-button type="button" [matMenuTriggerFor]="userMenu" aria-label="Acciones" (click)="selectedUser.set(row)">
                            <mat-icon>more_vert</mat-icon>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
          @case ('suspended') {
            @if (filteredSuspended().length === 0) {
              <app-empty-state title="Sin usuarios suspendidos" icon="block" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover" aria-label="Usuarios suspendidos">
                  <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Departamento</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead>
                  <tbody>
                    @for (row of filteredSuspended(); track row.id) {
                      <tr class="usr-row" (click)="openUserDetail(row)">
                        <td><strong>{{ row.name }}</strong></td>
                        <td>{{ row.email }}</td>
                        <td><span class="usr-role">{{ row.role }}</span></td>
                        <td>{{ row.department }}</td>
                        <td>{{ relativeTime(row.lastLogin) }}</td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td (click)="$event.stopPropagation()">
                          <button mat-icon-button type="button" [matMenuTriggerFor]="userMenu" aria-label="Acciones" (click)="selectedUser.set(row)">
                            <mat-icon>more_vert</mat-icon>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
          @case ('audit') {
            @if (filteredAudit().length === 0) {
              <app-empty-state title="Sin eventos" icon="receipt_long" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover" aria-label="Auditoría de usuarios">
                  <thead><tr><th>Usuario</th><th>Acción</th><th>Recurso</th><th>IP</th><th>Estado</th><th>Hace</th><th></th></tr></thead>
                  <tbody>
                    @for (row of filteredAudit(); track row.id) {
                      <tr>
                        <td>{{ row.user }}</td>
                        <td><code>{{ row.action }}</code></td>
                        <td>{{ row.resource }}</td>
                        <td>{{ row.ip }}</td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td>{{ relativeTime(row.at) }}</td>
                        <td (click)="$event.stopPropagation()">
                          <button mat-icon-button type="button" [matMenuTriggerFor]="auditMenu" aria-label="Acciones" (click)="selectedAudit.set(row)">
                            <mat-icon>more_vert</mat-icon>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
          @case ('sso') {
            @if (filteredSso().length === 0) {
              <app-empty-state title="Sin mapeos SSO" icon="key" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover" aria-label="Mapeos SSO">
                  <thead><tr><th>Email</th><th>Proveedor</th><th>ID externo</th><th>Rol mapeado</th><th>Última sync</th><th>Estado</th></tr></thead>
                  <tbody>
                    @for (row of filteredSso(); track row.id) {
                      <tr>
                        <td><strong>{{ row.email }}</strong></td>
                        <td>{{ row.provider }}</td>
                        <td class="mono">{{ row.externalId }}</td>
                        <td>{{ row.mappedRole }}</td>
                        <td>{{ relativeTime(row.lastSync) }}</td>
                        <td><app-status-badge [value]="row.status" /></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
          @case ('sessions') {
            @if (filteredSessions().length === 0) {
              <app-empty-state title="Sin sesiones activas" icon="devices" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover" aria-label="Sesiones activas">
                  <thead><tr><th>Usuario</th><th>Dispositivo</th><th>IP</th><th>Ubicación</th><th>Última actividad</th><th>Estado</th><th></th></tr></thead>
                  <tbody>
                    @for (row of filteredSessions(); track row.id) {
                      <tr>
                        <td>{{ row.user }}</td>
                        <td>{{ row.device }}</td>
                        <td>{{ row.ip }}</td>
                        <td>{{ row.location }}</td>
                        <td>{{ relativeTime(row.lastActive) }}</td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td (click)="$event.stopPropagation()">
                          <button mat-icon-button type="button" [matMenuTriggerFor]="sessionMenu" aria-label="Acciones" (click)="selectedSession.set(row)">
                            <mat-icon>more_vert</mat-icon>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        }
      </div>
    </div>

    <mat-menu #userMenu="matMenu" class="usr-context-menu">
      <div class="usr-menu-header" mat-menu-item disabled>
        <strong>{{ selectedUser()?.name }}</strong>
        <span>{{ selectedUser()?.email }}</span>
      </div>
      <button mat-menu-item type="button" (click)="openUserDetail(selectedUser()!)">
        <mat-icon>visibility</mat-icon>
        <span>Ver detalle<em>Ficha completa, gráficos y auditoría</em></span>
      </button>
      <button mat-menu-item type="button" (click)="openUserEdit(selectedUser()!)">
        <mat-icon>edit</mat-icon>
        <span>Editar<em>Perfil, rol y departamento</em></span>
      </button>
      @if (selectedUser()?.mfa && selectedUser()?.status === 'running') {
        <button mat-menu-item type="button" (click)="openUserAction('reset-mfa')">
          <mat-icon>lock_reset</mat-icon>
          <span>Resetear MFA<em>Invalida TOTP/WebAuthn registrados</em></span>
        </button>
      }
      @if (selectedUser()?.status === 'running') {
        <button mat-menu-item type="button" (click)="openUserAction('suspend')">
          <mat-icon>block</mat-icon>
          <span>Suspender<em>Bloquea acceso y revoca sesiones</em></span>
        </button>
      }
    </mat-menu>

    <mat-menu #auditMenu="matMenu">
      <button mat-menu-item type="button" (click)="runAuditRow('detail', 'Ver evento')"><mat-icon>visibility</mat-icon> Ver detalle</button>
      <button mat-menu-item type="button" (click)="runAuditRow('export', 'Exportar evento')"><mat-icon>download</mat-icon> Exportar</button>
    </mat-menu>

    <mat-menu #sessionMenu="matMenu">
      <button mat-menu-item type="button" (click)="runSessionRow('revoke', 'Revocar sesión')"><mat-icon>logout</mat-icon> Revocar sesión</button>
    </mat-menu>
    </app-pro-config-gate>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .usr-page { display: flex; flex-direction: column; gap: 0.65rem; overflow-y: auto; scrollbar-width: thin; --page-accent: ${ADMIN_USERS_ACCENT}; }
    .usr-page ::ng-deep .page-action-btn--primary { background: ${ADMIN_USERS_ACCENT}; border-color: #1d4ed8; &:hover:not(:disabled) { background: #1d4ed8; } }
    .usr-intro { display: flex; flex-wrap: wrap; gap: 1rem; padding: 0.75rem 1rem; border-radius: var(--app-radius-md, 10px); border: 1px solid ${ADMIN_USERS_ACCENT_BORDER}; background: ${ADMIN_USERS_ACCENT_LIGHT}; }
    .usr-intro__eyebrow { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: ${ADMIN_USERS_ACCENT}; }
    .usr-intro__title { margin: 0.2rem 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
    .usr-intro__desc { margin: 0; max-width: 38rem; font-size: 0.72rem; color: #64748b; line-height: 1.55; }
    .usr-intro__uses { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 220px; }
    .usr-intro__uses li { display: flex; align-items: flex-start; gap: 0.35rem; font-size: 0.68rem; color: #475569; }
    .usr-intro__uses mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: ${ADMIN_USERS_ACCENT}; flex-shrink: 0; }
    .usr-charts { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 0.5rem; }
    .usr-chart-panel { padding: 0.65rem 0.75rem; border-radius: 11px; border: 1px solid ${ADMIN_USERS_ACCENT_BORDER}; background: ${ADMIN_USERS_ACCENT_LIGHT}; h3 { display: flex; align-items: center; gap: 0.32rem; margin: 0 0 0.5rem; font-size: 0.72rem; font-weight: 700; color: ${ADMIN_USERS_ACCENT}; mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; } } &--donut { display: flex; flex-direction: column; } }
    .usr-role-bars { display: flex; flex-direction: column; gap: 0.38rem; }
    .usr-role-bar header { display: flex; justify-content: space-between; font-size: 0.66rem; margin-bottom: 0.18rem; span { color: #475569; font-weight: 600; } strong { color: #0f172a; } }
    .usr-role-bar__track { height: 7px; border-radius: 999px; background: #dbeafe; overflow: hidden; span { display: block; height: 100%; border-radius: inherit; min-width: 4px; transition: width 0.3s ease; } }
    .usr-mfa-donut { position: relative; width: 96px; height: 96px; margin: 0 auto 0.45rem; svg { width: 100%; height: 100%; } }
    .usr-mfa-donut__center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; strong { font-size: 0.95rem; font-weight: 800; color: #15803d; } span { font-size: 0.5rem; color: #94a3b8; text-transform: uppercase; } }
    .usr-mfa-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.28rem; li { display: flex; align-items: center; gap: 0.32rem; font-size: 0.64rem; color: #475569; i { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; } strong { margin-left: auto; font-size: 0.68rem; } em { font-style: normal; font-size: 0.6rem; color: #94a3b8; min-width: 2rem; text-align: right; } } }
    ::ng-deep .usr-context-menu .usr-menu-header { opacity: 1 !important; height: auto !important; line-height: 1.35 !important; padding: 0.55rem 1rem 0.35rem !important; cursor: default !important; strong { display: block; font-size: 0.78rem; color: #0f172a; } span { display: block; font-size: 0.64rem; color: #64748b; font-weight: 400; } }
    ::ng-deep .usr-context-menu .mat-mdc-menu-item span { display: flex; flex-direction: column; line-height: 1.35; em { font-style: normal; font-size: 0.58rem; color: #94a3b8; font-weight: 400; margin-top: 0.08rem; } }
    .usr-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .usr-tabs { display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.2rem; border-radius: 10px; background: ${ADMIN_USERS_ACCENT_LIGHT}; }
    .usr-tabs__tab { display: inline-flex; align-items: center; gap: 0.28rem; padding: 0.35rem 0.6rem; border: none; border-radius: 8px; background: transparent; font: inherit; font-size: 0.68rem; font-weight: 600; color: #1d4ed8; cursor: pointer; }
    .usr-tabs__tab--on { background: #fff; color: ${ADMIN_USERS_ACCENT}; box-shadow: 0 1px 2px rgb(37 99 235 / 0.08); }
    .usr-tabs__tab mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    .usr-tabs__count { font-size: 0.58rem; font-weight: 700; padding: 0.05rem 0.35rem; border-radius: 999px; background: ${ADMIN_USERS_ACCENT_BORDER}; color: ${ADMIN_USERS_ACCENT}; }
    .usr-search { display: flex; align-items: center; gap: 0.35rem; flex: 1; max-width: 18rem; padding: 0.35rem 0.55rem; border-radius: 9px; border: 1px solid ${ADMIN_USERS_ACCENT_BORDER}; margin-left: auto; background: #fff; }
    .usr-search input { flex: 1; border: none; background: transparent; font: inherit; font-size: 0.72rem; outline: none; }
    .usr-search mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: #94a3b8; }
    .usr-content { overflow: auto; }
    .usr-row { cursor: pointer; }
    .usr-role { font-size: 0.68rem; font-weight: 600; padding: 0.08rem 0.35rem; border-radius: 999px; background: ${ADMIN_USERS_ACCENT_LIGHT}; color: ${ADMIN_USERS_ACCENT}; }
    .usr-mfa-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #15803d; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.78rem; }
    @media (max-width: 900px) {
      .usr-charts { grid-template-columns: 1fr; }
    }
  `,
})
export class AdminUsersPageComponent {
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly selectedUser = signal<AdminUserRow | null>(null)
  readonly selectedAudit = signal<AdminUserAuditRow | null>(null)
  readonly selectedSession = signal<AdminUserSessionRow | null>(null)
  readonly view = signal<UserTab>('active')

  readonly headerActions: PageHeaderAction[] = [
    { label: 'Invitar usuario', icon: 'person_add', primary: true },
    { label: 'Sincronizar SSO', icon: 'sync' },
    { label: 'Exportar CSV', icon: 'download' },
  ]

  readonly tabs = [
    { id: 'active' as const, label: 'Activos', icon: 'person' },
    { id: 'invited' as const, label: 'Invitados', icon: 'mail' },
    { id: 'suspended' as const, label: 'Suspendidos', icon: 'block' },
    { id: 'audit' as const, label: 'Auditoría', icon: 'receipt_long' },
    { id: 'sso' as const, label: 'SSO', icon: 'key' },
    { id: 'sessions' as const, label: 'Sesiones', icon: 'devices' },
  ]

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(startWith(''), debounceTime(200)),
    { initialValue: '' },
  )

  readonly filteredActive = computed(() => this.filterUsers(ADMIN_USERS_ACTIVE))
  readonly filteredInvited = computed(() => this.filterUsers(ADMIN_USERS_INVITED))
  readonly filteredSuspended = computed(() => this.filterUsers(ADMIN_USERS_SUSPENDED))
  readonly filteredAudit = computed(() => this.filterAudit(ADMIN_USERS_AUDIT))
  readonly filteredSso = computed(() => this.filterSso(ADMIN_USERS_SSO))
  readonly filteredSessions = computed(() => this.filterSessions(ADMIN_USERS_SESSIONS))

  readonly roleDistribution = computed(() => adminUsersRoleDistribution())
  readonly mfaDonut = computed(() => adminUsersMfaDonut())
  readonly mfaDonutSegments = computed(() => {
    const d = this.mfaDonut()
    const circumference = 302
    let offset = 0
    return d.segments.map((s) => {
      const dash = (s.pct / 100) * circumference
      const seg = { color: s.color, dash, offset: -offset }
      offset += dash
      return seg
    })
  })

  readonly maxRoleCount = computed(() => Math.max(...this.roleDistribution().map((r) => r.count), 1))

  relativeTime = adminRelativeTime

  roleBarPct = (count: number): number => Math.round((count / this.maxRoleCount()) * 100)

  tabCount = (id: UserTab): number => {
    switch (id) {
      case 'active': return ADMIN_USERS_ACTIVE.length
      case 'invited': return ADMIN_USERS_INVITED.length
      case 'suspended': return ADMIN_USERS_SUSPENDED.length
      case 'audit': return ADMIN_USERS_AUDIT.length
      case 'sso': return ADMIN_USERS_SSO.length
      case 'sessions': return ADMIN_USERS_SESSIONS.length
    }
  }

  private filterUsers(rows: AdminUserRow[]): AdminUserRow[] {
    const q = this.searchTerm().trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q),
    )
  }

  private filterAudit(rows: AdminUserAuditRow[]): AdminUserAuditRow[] {
    const q = this.searchTerm().trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.user.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        r.resource.toLowerCase().includes(q),
    )
  }

  private filterSso(rows: AdminUserSsoRow[]): AdminUserSsoRow[] {
    const q = this.searchTerm().trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q) ||
        r.mappedRole.toLowerCase().includes(q),
    )
  }

  private filterSessions(rows: AdminUserSessionRow[]): AdminUserSessionRow[] {
    const q = this.searchTerm().trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.user.toLowerCase().includes(q) ||
        r.device.toLowerCase().includes(q) ||
        r.ip.includes(q),
    )
  }

  handleHeader = (label: string): void => {
    if (label === 'Exportar CSV') {
      this.handleExport()
      return
    }
    if (label === 'Invitar usuario') {
      this.openInvite()
      return
    }
    this.actions.runPageAction('users', label === 'Sincronizar SSO' ? 'sso-sync' : 'create', label, { area: 'admin' })
    if (label === 'Sincronizar SSO') this.toast.info('Sincronización SSO iniciada (demo)')
  }

  handleExport = (): void => {
    const rows = [...ADMIN_USERS_ACTIVE, ...ADMIN_USERS_INVITED, ...ADMIN_USERS_SUSPENDED]
    const header = 'id,email,name,role,department,status,lastLogin\n'
    const body = rows.map((r) =>
      `${r.id},${r.email},${r.name},${r.role},${r.department},${r.status},${r.lastLogin}`,
    ).join('\n')
    downloadBlob(header + body, `usuarios-${Date.now()}.csv`, 'text/csv')
    this.toast.success(`Exportados ${rows.length} usuarios (CSV)`)
  }

  openInvite = (): void => {
    this.dialog.open(AdminUserInviteDialogComponent, {
      width: 'min(480px, 96vw)',
      maxWidth: '96vw',
      panelClass: 'admin-user-invite-dialog-panel',
    })
  }

  openUserDetail = (row: AdminUserRow): void => {
    const ref = this.dialog.open(AdminUserDetailDialogComponent, {
      width: 'min(860px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'admin-user-detail-dialog-panel',
      data: { user: row },
    })
    ref.afterClosed().subscribe((result) => {
      if (result?.action) this.toast.info(`Acción completada: ${result.action}`)
    })
  }

  openUserEdit = (row: AdminUserRow): void => {
    this.dialog.open(AdminUserEditDialogComponent, {
      width: 'min(820px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '92vh',
      panelClass: 'admin-user-edit-dialog-panel',
      data: { user: enrichUserProfile(row) },
    })
  }

  openUserAction = (mode: 'reset-mfa' | 'suspend'): void => {
    const row = this.selectedUser()
    if (!row) return
    this.dialog.open(AdminUserActionDialogComponent, {
      width: 'min(560px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '90vh',
      panelClass: 'admin-user-action-dialog-panel',
      data: { user: enrichUserProfile(row), mode },
    })
  }

  runUserRow = (actionId: string, label: string): void => {
    const row = this.selectedUser()
    if (!row) return
    this.actions.runRowAction('users', actionId, row as unknown as Record<string, unknown>, undefined, label)
  }

  runAuditRow = (actionId: string, label: string): void => {
    const row = this.selectedAudit()
    if (!row) return
    this.actions.runRowAction('users', actionId, row as unknown as Record<string, unknown>, 'Auditoría', label)
  }

  runSessionRow = (actionId: string, label: string): void => {
    const row = this.selectedSession()
    if (!row) return
    this.actions.runRowAction('users', actionId, row as unknown as Record<string, unknown>, 'Sesiones', label)
    this.toast.success(`Sesión revocada: ${row.user}`)
  }
}
