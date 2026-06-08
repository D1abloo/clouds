import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core'
import { DatePipe } from '@angular/common'
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
  ADMIN_ROLES_ACCENT,
  ADMIN_ROLES_ACCENT_BORDER,
  ADMIN_ROLES_ACCENT_LIGHT,
  adminRelativeTime,
  downloadBlob,
} from './admin.config'
import {
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  ADMIN_ROLE_ASSIGNMENTS,
  adminRolesUserDistribution,
  adminPermissionCategoryMix,
  permissionDonutSegments,
  type AdminRoleRow,
  type AdminRoleAssignmentRow,
} from './admin-roles.demo'
import { AdminRoleDetailDialogComponent } from './admin-role-detail-dialog.component'
import { AdminRoleAssignmentEditDialogComponent } from './admin-role-assignment-edit-dialog.component'
import { ProConfigGateComponent } from '../../shared/components/pro-config-gate/pro-config-gate.component'

type RoleTab = 'roles' | 'permissions' | 'assignments'

@Component({
  selector: 'app-admin-roles-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
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
    <app-pro-config-gate module="Roles">
    <div class="page-container rol-page animate-fade-in">
      <app-page-header
        title="Roles"
        description="Define roles RBAC, matriz de permisos y asignaciones por usuario y ámbito."
        icon="manage_accounts"
        [actions]="headerActions"
        (actionClick)="handleHeader($event)"
      />

      <section class="rol-intro">
        <div class="rol-intro__main">
          <span class="rol-intro__eyebrow">Administración · RBAC</span>
          <h2 class="rol-intro__title">Control de acceso basado en roles</h2>
          <p class="rol-intro__desc">
            Los roles del sistema no se pueden eliminar. Edita asignaciones para cambiar el rol de cada usuario
            con distinto ámbito (global, proyecto o tenant).
          </p>
        </div>
        <ul class="rol-intro__uses">
          <li><mat-icon>verified_user</mat-icon><span>Principio de mínimo privilegio</span></li>
          <li><mat-icon>grid_on</mat-icon><span>Matriz de permisos por recurso</span></li>
          <li><mat-icon>assignment_ind</mat-icon><span>Editar rol por usuario desde Asignaciones</span></li>
        </ul>
      </section>

      <section class="rol-charts">
        <article class="rol-chart-panel">
          <h3><mat-icon>bar_chart</mat-icon> Usuarios por rol</h3>
          <div class="rol-bars">
            @for (r of roleDistribution(); track r.role) {
              <div class="rol-bar">
                <header>
                  <span>{{ r.role }}</span>
                  <strong>{{ r.count }}</strong>
                </header>
                <div class="rol-bar__track" aria-hidden="true">
                  <span [style.width.%]="roleBarPct(r.count)" [style.background]="r.color"></span>
                </div>
              </div>
            }
          </div>
        </article>
        <article class="rol-chart-panel rol-chart-panel--donut">
          <h3><mat-icon>pie_chart</mat-icon> Permisos por categoría</h3>
          <div class="rol-donut-wrap">
            <div class="rol-donut">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" stroke-width="12" />
                @for (seg of permDonutSegments(); track seg.color) {
                  <circle cx="60" cy="60" r="48" fill="none" [attr.stroke]="seg.color" stroke-width="12" [attr.stroke-dasharray]="seg.dash + ' 302'" [attr.stroke-dashoffset]="seg.offset" stroke-linecap="round" transform="rotate(-90 60 60)" />
                }
              </svg>
              <div class="rol-donut__center"><strong>{{ ADMIN_PERMISSIONS.length }}</strong><span>permisos</span></div>
            </div>
            <ul class="rol-legend">
              @for (s of permMix(); track s.label) {
                <li><i [style.background]="s.color"></i>{{ s.label }}<strong>{{ s.count }}</strong><em>{{ s.pct }}%</em></li>
              }
            </ul>
          </div>
        </article>
      </section>

      <div class="rol-bar">
        <nav class="rol-tabs" role="tablist" aria-label="Vistas de roles">
          @for (tab of tabs; track tab.id) {
            <button type="button" role="tab" class="rol-tabs__tab" [class.rol-tabs__tab--on]="view() === tab.id" [attr.aria-selected]="view() === tab.id" (click)="view.set(tab.id)">
              <mat-icon>{{ tab.icon }}</mat-icon>{{ tab.label }}
              <span class="rol-tabs__count">{{ tabCount(tab.id) }}</span>
            </button>
          }
        </nav>
        @if (view() !== 'permissions') {
          <label class="rol-search">
            <mat-icon>search</mat-icon>
            <input type="search" [formControl]="searchControl" placeholder="Buscar rol, usuario…" aria-label="Buscar roles" />
          </label>
        }
      </div>

      <div class="table-card rol-content">
        @switch (view()) {
          @case ('roles') {
            @if (filteredRoles().length === 0) {
              <app-empty-state title="Sin roles" icon="manage_accounts" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover" aria-label="Roles">
                  <thead><tr><th>Rol</th><th>Slug</th><th>Usuarios</th><th>Permisos</th><th>Tipo</th><th>Estado</th><th></th></tr></thead>
                  <tbody>
                    @for (row of filteredRoles(); track row.id) {
                      <tr class="rol-row" (click)="openRoleDetail(row)">
                        <td><strong>{{ row.name }}</strong><p class="rol-desc">{{ row.description }}</p></td>
                        <td><code class="rol-slug">{{ row.slug }}</code></td>
                        <td><span class="rol-count">{{ liveUserCount(row.name) }}</span></td>
                        <td>{{ row.permissionsCount }}</td>
                        <td><span class="rol-type" [class.rol-type--sys]="row.builtin">{{ row.builtin ? 'Sistema' : 'Custom' }}</span></td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td (click)="$event.stopPropagation()">
                          <button mat-icon-button type="button" [matMenuTriggerFor]="roleMenu" aria-label="Acciones" (click)="selectedRole.set(row)"><mat-icon>more_vert</mat-icon></button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
          @case ('permissions') {
            <div class="rol-perm-intro">
              <p>Matriz RBAC — indica qué roles tienen acceso a cada recurso y acción.</p>
            </div>
            <div class="data-table-wrap rol-perm-wrap">
              <table class="premium-table rol-perm-table" aria-label="Matriz de permisos">
                <thead>
                  <tr>
                    <th>Recurso</th><th>Acción</th><th>Descripción</th>
                    <th>Super Admin</th><th>Admin</th><th>Operator</th><th>Viewer</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of ADMIN_PERMISSIONS; track p.id) {
                    <tr>
                      <td><code>{{ p.resource }}</code></td>
                      <td><code>{{ p.action }}</code></td>
                      <td class="rol-perm-desc">{{ p.description }}</td>
                      <td class="perm-cell" [class.perm-cell--on]="p.superAdmin">{{ p.superAdmin ? '✓' : '—' }}</td>
                      <td class="perm-cell" [class.perm-cell--on]="p.admin">{{ p.admin ? '✓' : '—' }}</td>
                      <td class="perm-cell" [class.perm-cell--on]="p.operator">{{ p.operator ? '✓' : '—' }}</td>
                      <td class="perm-cell" [class.perm-cell--on]="p.viewer">{{ p.viewer ? '✓' : '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @case ('assignments') {
            @if (filteredAssignments().length === 0) {
              <app-empty-state title="Sin asignaciones" icon="assignment_ind" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover" aria-label="Asignaciones de roles">
                  <thead>
                    <tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Ámbito</th><th>Departamento</th><th>Asignado</th><th>Estado</th><th></th></tr>
                  </thead>
                  <tbody>
                    @for (row of filteredAssignments(); track row.id) {
                      <tr class="rol-row" (click)="openEditAssignment(row)">
                        <td><strong>{{ row.userName }}</strong></td>
                        <td>{{ row.user }}</td>
                        <td><span class="rol-role-chip">{{ row.role }}</span></td>
                        <td>{{ row.scope }}</td>
                        <td>{{ row.department }}</td>
                        <td>{{ row.assignedAt | date:'dd MMM yyyy' }}</td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td (click)="$event.stopPropagation()">
                          <button mat-icon-button type="button" [matMenuTriggerFor]="assignMenu" aria-label="Acciones" (click)="selectedAssignment.set(row)"><mat-icon>more_vert</mat-icon></button>
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

    <mat-menu #roleMenu="matMenu" class="rol-context-menu">
      <div class="rol-menu-header" mat-menu-item disabled>
        <strong>{{ selectedRole()?.name }}</strong>
        <span>{{ selectedRole()?.slug }}</span>
      </div>
      <button mat-menu-item type="button" (click)="openRoleDetail(selectedRole()!)">
        <mat-icon>visibility</mat-icon><span>Ver detalle<em>Usuarios, permisos y gráficos</em></span>
      </button>
      <button mat-menu-item type="button" (click)="openAssignDialog(selectedRole()?.name)">
        <mat-icon>person_add</mat-icon><span>Asignar usuario<em>Añadir miembro a este rol</em></span>
      </button>
    </mat-menu>

    <mat-menu #assignMenu="matMenu" class="rol-context-menu">
      <div class="rol-menu-header" mat-menu-item disabled>
        <strong>{{ selectedAssignment()?.userName }}</strong>
        <span>{{ selectedAssignment()?.role }}</span>
      </div>
      <button mat-menu-item type="button" (click)="openEditAssignment(selectedAssignment()!)">
        <mat-icon>edit</mat-icon><span>Cambiar rol<em>Modificar rol RBAC y ámbito</em></span>
      </button>
      <button mat-menu-item type="button" (click)="runAssignRow('revoke', 'Revocar asignación')">
        <mat-icon>remove_circle</mat-icon><span>Revocar<em>Elimina acceso del usuario</em></span>
      </button>
    </mat-menu>
    </app-pro-config-gate>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .rol-page { display: flex; flex-direction: column; gap: 0.75rem; overflow-y: auto; scrollbar-width: thin; --page-accent: ${ADMIN_ROLES_ACCENT}; padding-bottom: 0.5rem; }
    .rol-page ::ng-deep .page-action-btn--primary { background: ${ADMIN_ROLES_ACCENT}; border-color: #4338ca; &:hover:not(:disabled) { background: #4338ca; } }
    .rol-intro { display: flex; flex-wrap: wrap; gap: 1rem; padding: 0.85rem 1.1rem; border-radius: 12px; border: 1px solid ${ADMIN_ROLES_ACCENT_BORDER}; background: ${ADMIN_ROLES_ACCENT_LIGHT}; }
    .rol-intro__eyebrow { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: ${ADMIN_ROLES_ACCENT}; }
    .rol-intro__title { margin: 0.2rem 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
    .rol-intro__desc { margin: 0; max-width: 40rem; font-size: 0.72rem; color: #64748b; line-height: 1.6; }
    .rol-intro__uses { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; flex: 1; min-width: 220px; }
    .rol-intro__uses li { display: flex; align-items: flex-start; gap: 0.4rem; font-size: 0.68rem; color: #475569; }
    .rol-intro__uses mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: ${ADMIN_ROLES_ACCENT}; flex-shrink: 0; }
    .rol-charts { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 0.55rem; }
    .rol-chart-panel { padding: 0.7rem 0.85rem; border-radius: 12px; border: 1px solid ${ADMIN_ROLES_ACCENT_BORDER}; background: ${ADMIN_ROLES_ACCENT_LIGHT}; h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.55rem; font-size: 0.72rem; font-weight: 700; color: ${ADMIN_ROLES_ACCENT}; mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; } } }
    .rol-bars { display: flex; flex-direction: column; gap: 0.42rem; }
    .rol-bar header { display: flex; justify-content: space-between; font-size: 0.66rem; margin-bottom: 0.2rem; span { color: #475569; font-weight: 600; } strong { color: #0f172a; } }
    .rol-bar__track { height: 8px; border-radius: 999px; background: #e0e7ff; overflow: hidden; span { display: block; height: 100%; border-radius: inherit; min-width: 4px; transition: width 0.3s ease; } }
    .rol-donut-wrap { display: flex; gap: 0.75rem; align-items: center; }
    .rol-donut { position: relative; width: 96px; height: 96px; flex-shrink: 0; svg { width: 100%; height: 100%; } }
    .rol-donut__center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; strong { font-size: 0.95rem; font-weight: 800; color: ${ADMIN_ROLES_ACCENT}; } span { font-size: 0.5rem; color: #94a3b8; text-transform: uppercase; } }
    .rol-legend { list-style: none; margin: 0; padding: 0; flex: 1; display: flex; flex-direction: column; gap: 0.3rem; li { display: flex; align-items: center; gap: 0.32rem; font-size: 0.64rem; color: #475569; i { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; } strong { margin-left: auto; font-size: 0.68rem; } em { font-style: normal; font-size: 0.58rem; color: #94a3b8; min-width: 2rem; text-align: right; } } }
    .rol-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.55rem; margin-top: 0.15rem; }
    .rol-tabs { display: flex; flex-wrap: wrap; gap: 0.22rem; padding: 0.22rem; border-radius: 10px; background: ${ADMIN_ROLES_ACCENT_LIGHT}; }
    .rol-tabs__tab { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.38rem 0.65rem; border: none; border-radius: 8px; background: transparent; font: inherit; font-size: 0.68rem; font-weight: 600; color: #4338ca; cursor: pointer; }
    .rol-tabs__tab--on { background: #fff; color: ${ADMIN_ROLES_ACCENT}; box-shadow: 0 1px 2px rgb(79 70 229 / 0.08); }
    .rol-tabs__tab mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    .rol-tabs__count { font-size: 0.58rem; font-weight: 700; padding: 0.05rem 0.35rem; border-radius: 999px; background: ${ADMIN_ROLES_ACCENT_BORDER}; color: ${ADMIN_ROLES_ACCENT}; }
    .rol-search { display: flex; align-items: center; gap: 0.4rem; flex: 1; max-width: 20rem; padding: 0.4rem 0.6rem; border-radius: 9px; border: 1px solid ${ADMIN_ROLES_ACCENT_BORDER}; margin-left: auto; background: #fff; }
    .rol-search input { flex: 1; border: none; background: transparent; font: inherit; font-size: 0.72rem; outline: none; }
    .rol-search mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: #94a3b8; }
    .rol-content { overflow: auto; padding: 0.25rem 0; }
    .rol-perm-intro { padding: 0.75rem 1rem 0.35rem; p { margin: 0; font-size: 0.72rem; color: #64748b; } }
    .rol-perm-wrap { padding: 0 0.5rem 0.5rem; }
    .rol-perm-table { font-size: 0.74rem; th, td { padding: 0.45rem 0.6rem; } }
    .rol-perm-desc { max-width: 280px; font-size: 0.72rem; color: #64748b; }
    .rol-row { cursor: pointer; }
    .rol-desc { margin: 0.18rem 0 0; font-size: 0.66rem; color: #64748b; font-weight: 400; max-width: 300px; line-height: 1.45; }
    .rol-slug { font-size: 0.68rem; padding: 0.1rem 0.35rem; border-radius: 4px; background: color-mix(in srgb, ${ADMIN_ROLES_ACCENT} 10%, transparent); }
    .rol-count { font-weight: 700; color: ${ADMIN_ROLES_ACCENT}; }
    .rol-type { font-size: 0.62rem; font-weight: 600; padding: 0.08rem 0.38rem; border-radius: 999px; background: #fef3c7; color: #b45309; &--sys { background: ${ADMIN_ROLES_ACCENT_LIGHT}; color: ${ADMIN_ROLES_ACCENT}; border: 1px solid ${ADMIN_ROLES_ACCENT_BORDER}; } }
    .rol-role-chip { font-size: 0.66rem; font-weight: 600; padding: 0.1rem 0.42rem; border-radius: 999px; background: ${ADMIN_ROLES_ACCENT_LIGHT}; color: ${ADMIN_ROLES_ACCENT}; border: 1px solid ${ADMIN_ROLES_ACCENT_BORDER}; white-space: nowrap; }
    .perm-cell { text-align: center; font-weight: 600; color: #cbd5e1; &--on { color: ${ADMIN_ROLES_ACCENT}; font-weight: 800; } }
    ::ng-deep .rol-context-menu .rol-menu-header { opacity: 1 !important; height: auto !important; line-height: 1.35 !important; padding: 0.55rem 1rem 0.35rem !important; cursor: default !important; strong { display: block; font-size: 0.78rem; color: #0f172a; } span { display: block; font-size: 0.64rem; color: #64748b; font-weight: 400; } }
    ::ng-deep .rol-context-menu .mat-mdc-menu-item span { display: flex; flex-direction: column; line-height: 1.35; em { font-style: normal; font-size: 0.58rem; color: #94a3b8; font-weight: 400; margin-top: 0.08rem; } }
    @media (max-width: 900px) { .rol-charts { grid-template-columns: 1fr; } .rol-bar { flex-direction: column; align-items: stretch; } .rol-search { max-width: none; margin-left: 0; } }
  `,
})
export class AdminRolesPageComponent {
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly ADMIN_PERMISSIONS = ADMIN_PERMISSIONS
  readonly assignments = signal<AdminRoleAssignmentRow[]>([...ADMIN_ROLE_ASSIGNMENTS])
  readonly selectedRole = signal<AdminRoleRow | null>(null)
  readonly selectedAssignment = signal<AdminRoleAssignmentRow | null>(null)
  readonly view = signal<RoleTab>('roles')

  readonly headerActions: PageHeaderAction[] = [
    { label: 'Asignar rol', icon: 'assignment_ind', primary: true },
    { label: 'Crear rol', icon: 'add' },
    { label: 'Exportar matriz', icon: 'download' },
  ]

  readonly tabs = [
    { id: 'roles' as const, label: 'Roles', icon: 'manage_accounts' },
    { id: 'permissions' as const, label: 'Permisos', icon: 'grid_on' },
    { id: 'assignments' as const, label: 'Asignaciones', icon: 'assignment_ind' },
  ]

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(startWith(''), debounceTime(200)), { initialValue: '' })

  readonly roleDistribution = computed(() => adminRolesUserDistribution(this.assignments()))
  readonly permMix = computed(() => adminPermissionCategoryMix())
  readonly permDonutSegments = computed(() => permissionDonutSegments(this.permMix()))
  readonly maxRoleCount = computed(() => Math.max(...this.roleDistribution().map((r) => r.count), 1))

  readonly filteredRoles = computed(() => this.filterRoles(ADMIN_ROLES))
  readonly filteredAssignments = computed(() => this.filterAssignments(this.assignments()))

  relativeTime = adminRelativeTime
  roleBarPct = (count: number): number => Math.round((count / this.maxRoleCount()) * 100)

  liveUserCount = (roleName: string): number =>
    this.assignments().filter((a) => a.role === roleName && a.status === 'running').length

  tabCount = (id: RoleTab): number => {
    switch (id) {
      case 'roles': return ADMIN_ROLES.length
      case 'permissions': return ADMIN_PERMISSIONS.length
      case 'assignments': return this.assignments().filter((a) => a.status === 'running').length
    }
  }

  private filterRoles(rows: AdminRoleRow[]): AdminRoleRow[] {
    const q = this.searchTerm().trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
  }

  private filterAssignments(rows: AdminRoleAssignmentRow[]): AdminRoleAssignmentRow[] {
    const q = this.searchTerm().trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.user.toLowerCase().includes(q) || r.userName.toLowerCase().includes(q) || r.role.toLowerCase().includes(q) || r.scope.toLowerCase().includes(q) || r.department.toLowerCase().includes(q))
  }

  private updateAssignment = (updated: AdminRoleAssignmentRow): void => {
    this.assignments.update((list) => {
      const idx = list.findIndex((a) => a.id === updated.id)
      if (idx >= 0) {
        const next = [...list]
        next[idx] = updated
        return next
      }
      return [...list, updated]
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Exportar matriz') { this.handleExport(); return }
    if (label === 'Asignar rol') { this.openAssignDialog(); return }
    this.actions.runPageAction('roles', 'create', label, { area: 'admin' })
  }

  handleExport = (): void => {
    const header = 'resource,action,super_admin,admin,operator,viewer\n'
    const body = ADMIN_PERMISSIONS.map((p) => `${p.resource},${p.action},${p.superAdmin},${p.admin},${p.operator},${p.viewer}`).join('\n')
    downloadBlob(header + body, `permisos-rbac-${Date.now()}.csv`, 'text/csv')
    this.toast.success(`Exportados ${ADMIN_PERMISSIONS.length} permisos (CSV)`)
  }

  openRoleDetail = (row: AdminRoleRow): void => {
    this.dialog.open(AdminRoleDetailDialogComponent, {
      width: 'min(860px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '92vh',
      panelClass: 'admin-role-detail-dialog-panel',
      data: {
        role: row,
        assignments: this.assignments(),
        onAssignmentUpdated: (a: AdminRoleAssignmentRow) => this.updateAssignment(a),
      },
    })
  }

  openAssignDialog = (defaultRole?: string): void => {
    const ref = this.dialog.open(AdminRoleAssignmentEditDialogComponent, {
      width: 'min(780px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '92vh',
      panelClass: 'admin-role-assignment-dialog-panel',
      data: { mode: 'assign' as const, defaultRole },
    })
    ref.afterClosed().subscribe((result) => {
      if (result?.saved && result.assignment) {
        this.updateAssignment(result.assignment)
        this.view.set('assignments')
      }
    })
  }

  openEditAssignment = (row: AdminRoleAssignmentRow): void => {
    if (row.status === 'stopped') {
      this.toast.info('Usuario suspendido — reactiva antes de cambiar rol')
      return
    }
    const ref = this.dialog.open(AdminRoleAssignmentEditDialogComponent, {
      width: 'min(780px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '92vh',
      panelClass: 'admin-role-assignment-dialog-panel',
      data: { mode: 'edit' as const, assignment: row },
    })
    ref.afterClosed().subscribe((result) => {
      if (result?.saved && result.assignment) this.updateAssignment(result.assignment)
    })
  }

  runAssignRow = (actionId: string, label: string): void => {
    const row = this.selectedAssignment()
    if (!row) return
    if (actionId === 'revoke') {
      this.assignments.update((list) => list.map((a) => (a.id === row.id ? { ...a, status: 'stopped' } : a)))
      this.toast.warning(`Asignación revocada: ${row.userName}`)
    }
    this.actions.runRowAction('roles', actionId, row as unknown as Record<string, unknown>, 'Asignaciones', label)
  }
}
