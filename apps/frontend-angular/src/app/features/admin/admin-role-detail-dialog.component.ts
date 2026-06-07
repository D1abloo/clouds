import { DatePipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
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
  ADMIN_PERMISSIONS,
  getAssignmentsForRole,
  permissionDonutSegments,
  adminPermissionCategoryMix,
  type AdminRoleRow,
  type AdminRoleAssignmentRow,
} from './admin-roles.demo'
import { AdminRoleAssignmentEditDialogComponent } from './admin-role-assignment-edit-dialog.component'

export interface AdminRoleDetailData {
  role: AdminRoleRow
  assignments: AdminRoleAssignmentRow[]
  onAssignmentUpdated?: (assignment: AdminRoleAssignmentRow) => void
}

type DetailTab = 'overview' | 'users' | 'permissions'

@Component({
  selector: 'app-admin-role-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="rdet">
      <header class="rdet__head">
        <div class="rdet__identity">
          <span class="rdet__icon"><mat-icon>{{ data.role.builtin ? 'verified' : 'tune' }}</mat-icon></span>
          <div>
            <span class="rdet__label">Rol · {{ data.role.slug }}</span>
            <h2>{{ data.role.name }}</h2>
            <p>{{ data.role.description }}</p>
          </div>
        </div>
        <div class="rdet__head-meta">
          <app-status-badge [value]="data.role.status" />
          @if (data.role.builtin) {
            <span class="rdet__badge rdet__badge--sys"><mat-icon>verified</mat-icon> Sistema</span>
          } @else {
            <span class="rdet__badge rdet__badge--custom">Personalizado</span>
          }
          <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
        </div>
      </header>

      <div class="rdet__stats">
        <article><mat-icon>groups</mat-icon><div><span>Usuarios</span><strong>{{ roleUsers().length }}</strong></div></article>
        <article><mat-icon>policy</mat-icon><div><span>Permisos</span><strong>{{ data.role.permissionsCount }}</strong></div></article>
        <article><mat-icon>grid_on</mat-icon><div><span>Recursos</span><strong>{{ rolePermissions().length }}</strong></div></article>
        <article><mat-icon>update</mat-icon><div><span>Actualizado</span><strong>{{ data.role.updated | date: 'dd MMM' }}</strong></div></article>
      </div>

      <nav class="rdet__tabs" role="tablist">
        @for (tab of tabs; track tab.id) {
          <button type="button" role="tab" class="rdet__tab" [class.rdet__tab--on]="view() === tab.id" (click)="view.set(tab.id)">
            <mat-icon>{{ tab.icon }}</mat-icon>{{ tab.label }}
            @if (tab.id === 'users') { <span class="rdet__count">{{ roleUsers().length }}</span> }
          </button>
        }
      </nav>

      <mat-dialog-content class="rdet__body">
        @switch (view()) {
          @case ('overview') {
            <div class="rdet__split">
              <section class="rdet__panel">
                <h3><mat-icon>info</mat-icon> Información</h3>
                <dl class="rdet__grid">
                  <div><dt>Slug</dt><dd><code>{{ data.role.slug }}</code></dd></div>
                  <div><dt>Tipo</dt><dd>{{ data.role.builtin ? 'Rol de sistema' : 'Personalizado' }}</dd></div>
                  <div><dt>Creado</dt><dd>{{ data.role.created | date: 'dd MMM yyyy' }}</dd></div>
                  <div><dt>Actualizado</dt><dd>{{ data.role.updated | date: 'dd MMM yyyy' }}</dd></div>
                </dl>
                <aside class="rdet__hint">
                  <mat-icon>policy</mat-icon>
                  <p>Asigna el rol con el menor privilegio necesario. Revisa asignaciones trimestralmente.</p>
                </aside>
              </section>
              <section class="rdet__panel">
                <h3><mat-icon>pie_chart</mat-icon> Permisos por categoría</h3>
                <div class="rdet__donut-row">
                  <div class="rdet__donut">
                    <svg viewBox="0 0 120 120" aria-hidden="true">
                      <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" stroke-width="12" />
                      @for (seg of donutSegments(); track seg.color) {
                        <circle cx="60" cy="60" r="48" fill="none" [attr.stroke]="seg.color" stroke-width="12" [attr.stroke-dasharray]="seg.dash + ' 302'" [attr.stroke-dashoffset]="seg.offset" stroke-linecap="round" transform="rotate(-90 60 60)" />
                      }
                    </svg>
                    <div class="rdet__donut-center"><strong>{{ rolePermissions().length }}</strong><span>permisos</span></div>
                  </div>
                  <ul class="rdet__legend">
                    @for (s of permMix(); track s.label) {
                      <li><i [style.background]="s.color"></i>{{ s.label }}<strong>{{ s.count }}</strong></li>
                    }
                  </ul>
                </div>
              </section>
            </div>
          }
          @case ('users') {
            <section class="rdet__panel rdet__panel--wide">
              <header class="rdet__panel-head">
                <h3><mat-icon>groups</mat-icon> Usuarios con este rol</h3>
                <button type="button" class="page-action-btn page-action-btn--primary" (click)="openAssignForRole()">
                  <mat-icon>person_add</mat-icon> Asignar usuario
                </button>
              </header>
              @if (roleUsers().length === 0) {
                <p class="rdet__empty">Ningún usuario activo con este rol.</p>
              } @else {
                <div class="rdet__user-list">
                  @for (u of roleUsers(); track u.id) {
                    <article class="rdet__user-card">
                      <span class="rdet__user-avatar">{{ userInitials(u.userName) }}</span>
                      <div class="rdet__user-info">
                        <strong>{{ u.userName }}</strong>
                        <span>{{ u.user }}</span>
                        <em>{{ u.department }} · {{ u.scope }}</em>
                      </div>
                      <div class="rdet__user-meta">
                        @if (u.mfa) { <span class="rdet__mfa"><mat-icon>verified_user</mat-icon> MFA</span> }
                        @if (u.lastLogin) { <span class="rdet__last">{{ relativeTime(u.lastLogin) }}</span> }
                      </div>
                      <button type="button" class="page-action-btn" (click)="openEditAssignment(u)" [attr.aria-label]="'Editar rol de ' + u.userName">
                        <mat-icon>edit</mat-icon> Cambiar rol
                      </button>
                    </article>
                  }
                </div>
              }
            </section>
          }
          @case ('permissions') {
            <section class="rdet__panel rdet__panel--wide">
              <h3><mat-icon>grid_on</mat-icon> Permisos efectivos</h3>
              <table class="rdet__table" aria-label="Permisos del rol">
                <thead><tr><th>Recurso</th><th>Acción</th><th>Descripción</th><th></th></tr></thead>
                <tbody>
                  @for (p of rolePermissions(); track p.id) {
                    <tr>
                      <td><code>{{ p.resource }}</code></td>
                      <td><code>{{ p.action }}</code></td>
                      <td>{{ p.description }}</td>
                      <td class="rdet__check"><mat-icon>check_circle</mat-icon></td>
                    </tr>
                  }
                </tbody>
              </table>
            </section>
          }
        }
      </mat-dialog-content>

      <mat-dialog-actions align="start" class="rdet__actions">
        <button type="button" class="page-action-btn page-action-btn--primary" (click)="handleAction('edit', 'Editar rol')">
          <mat-icon>edit</mat-icon> Editar rol
        </button>
        <button type="button" class="page-action-btn" (click)="handleAction('clone', 'Clonar rol')">
          <mat-icon>content_copy</mat-icon> Clonar
        </button>
        @if (!data.role.builtin) {
          <button type="button" class="page-action-btn" (click)="handleAction('delete', 'Eliminar rol')">
            <mat-icon>delete</mat-icon> Eliminar
          </button>
        }
        <button type="button" class="page-action-btn" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    :host { display: block; }
    .rdet { width: 100%; color: #0f172a; padding: 1.1rem 1.3rem 1.15rem; box-sizing: border-box; }
    .rdet__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.85rem; padding: 0.8rem 0.95rem; margin-bottom: 0.75rem; border-radius: 12px; border: 1px solid ${ADMIN_ROLES_ACCENT_BORDER}; background: linear-gradient(135deg, ${ADMIN_ROLES_ACCENT_LIGHT}, #fff); }
    .rdet__identity { display: flex; gap: 0.65rem; min-width: 0; flex: 1; }
    .rdet__icon { display: flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border-radius: 11px; background: ${ADMIN_ROLES_ACCENT}; color: #fff; flex-shrink: 0; mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; } }
    .rdet__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .rdet__head h2 { margin: 0.12rem 0 0; font-size: 1.05rem; font-weight: 700; }
    .rdet__head p { margin: 0.18rem 0 0; font-size: 0.7rem; color: #64748b; line-height: 1.5; max-width: 36rem; }
    .rdet__head-meta { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
    .rdet__badge { display: inline-flex; align-items: center; gap: 0.18rem; font-size: 0.6rem; font-weight: 600; padding: 0.1rem 0.42rem; border-radius: 999px; &--sys { color: ${ADMIN_ROLES_ACCENT}; background: #fff; border: 1px solid ${ADMIN_ROLES_ACCENT_BORDER}; mat-icon { font-size: 0.78rem; width: 0.78rem; height: 0.78rem; } } &--custom { background: #fef3c7; color: #b45309; } }
    .rdet__stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.45rem; margin-bottom: 0.65rem; article { display: flex; gap: 0.4rem; padding: 0.55rem 0.65rem; border-radius: 10px; border: 1px solid ${ADMIN_ROLES_ACCENT_BORDER}; background: ${ADMIN_ROLES_ACCENT_LIGHT}; mat-icon { color: ${ADMIN_ROLES_ACCENT}; font-size: 1rem; width: 1rem; height: 1rem; } span { display: block; font-size: 0.54rem; text-transform: uppercase; color: #94a3b8; font-weight: 650; } strong { font-size: 0.88rem; font-weight: 700; } } }
    .rdet__tabs { display: flex; flex-wrap: wrap; gap: 0.18rem; padding: 0.18rem; border-radius: 10px; background: ${ADMIN_ROLES_ACCENT_LIGHT}; margin-bottom: 0.55rem; }
    .rdet__tab { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.32rem 0.55rem; border: none; border-radius: 8px; background: transparent; font: inherit; font-size: 0.66rem; font-weight: 600; color: #4338ca; cursor: pointer; &--on { background: #fff; color: ${ADMIN_ROLES_ACCENT}; box-shadow: 0 1px 2px rgb(79 70 229 / 0.08); } mat-icon { font-size: 0.88rem; width: 0.88rem; height: 0.88rem; } }
    .rdet__count { font-size: 0.56rem; font-weight: 700; padding: 0.04rem 0.32rem; border-radius: 999px; background: ${ADMIN_ROLES_ACCENT_BORDER}; color: ${ADMIN_ROLES_ACCENT}; }
    .rdet__body { padding: 0 !important; max-height: min(50vh, 400px); overflow-y: auto; scrollbar-width: thin; }
    .rdet__split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.65rem; }
    .rdet__panel { padding: 0.7rem 0.85rem; border-radius: 11px; border: 1px solid #e2e8f0; background: #fafbfc; &--wide { grid-column: 1 / -1; } h3 { display: flex; align-items: center; gap: 0.32rem; margin: 0 0 0.5rem; font-size: 0.72rem; font-weight: 700; color: ${ADMIN_ROLES_ACCENT}; mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; } } }
    .rdet__panel-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.55rem; h3 { margin: 0; } }
    .rdet__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.42rem 0.75rem; dt { font-size: 0.56rem; text-transform: uppercase; color: #94a3b8; font-weight: 650; } dd { margin: 0.06rem 0 0; font-size: 0.76rem; } code { font-size: 0.68rem; } }
    .rdet__hint { display: flex; gap: 0.45rem; margin-top: 0.55rem; padding: 0.55rem 0.65rem; border-radius: 9px; border: 1px dashed ${ADMIN_ROLES_ACCENT_BORDER}; background: #fff; mat-icon { color: ${ADMIN_ROLES_ACCENT}; font-size: 0.95rem; width: 0.95rem; height: 0.95rem; flex-shrink: 0; } p { margin: 0; font-size: 0.64rem; color: #475569; line-height: 1.5; } }
    .rdet__donut-row { display: flex; gap: 0.65rem; align-items: center; }
    .rdet__donut { position: relative; width: 88px; height: 88px; flex-shrink: 0; svg { width: 100%; height: 100%; } }
    .rdet__donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; strong { font-size: 0.82rem; font-weight: 800; } span { font-size: 0.48rem; color: #94a3b8; text-transform: uppercase; } }
    .rdet__legend { list-style: none; margin: 0; padding: 0; flex: 1; display: flex; flex-direction: column; gap: 0.28rem; li { display: flex; align-items: center; gap: 0.3rem; font-size: 0.64rem; color: #475569; i { width: 8px; height: 8px; border-radius: 50%; } strong { margin-left: auto; font-size: 0.68rem; } } }
    .rdet__user-list { display: flex; flex-direction: column; gap: 0.45rem; }
    .rdet__user-card { display: grid; grid-template-columns: auto 1fr auto auto; gap: 0.55rem 0.75rem; align-items: center; padding: 0.6rem 0.7rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; }
    .rdet__user-avatar { display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: 8px; background: ${ADMIN_ROLES_ACCENT}; color: #fff; font-size: 0.7rem; font-weight: 800; }
    .rdet__user-info strong { display: block; font-size: 0.76rem; } .rdet__user-info span { display: block; font-size: 0.64rem; color: #64748b; } .rdet__user-info em { display: block; font-size: 0.58rem; color: #94a3b8; font-style: normal; margin-top: 0.08rem; }
    .rdet__user-meta { display: flex; flex-direction: column; gap: 0.15rem; align-items: flex-end; font-size: 0.58rem; color: #64748b; }
    .rdet__mfa { display: inline-flex; align-items: center; gap: 0.12rem; color: #15803d; mat-icon { font-size: 0.78rem; width: 0.78rem; height: 0.78rem; } }
    .rdet__table { width: 100%; border-collapse: collapse; font-size: 0.72rem; th, td { padding: 0.4rem 0.5rem; text-align: left; border-bottom: 1px solid #e2e8f0; } th { font-size: 0.56rem; text-transform: uppercase; color: #94a3b8; } code { font-size: 0.66rem; } }
    .rdet__check mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #15803d; }
    .rdet__empty { margin: 0; font-size: 0.72rem; color: #94a3b8; }
    .rdet__actions { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.75rem 0 0; margin: 0.75rem 0 0; border-top: 1px solid #e2e8f0; min-height: unset; }
    .page-action-btn--primary { background: ${ADMIN_ROLES_ACCENT}; border-color: #4338ca; }
    @media (max-width: 760px) { .rdet { padding: 1rem; } .rdet__stats, .rdet__split { grid-template-columns: 1fr; } .rdet__user-card { grid-template-columns: auto 1fr; } }
  `,
})
export class AdminRoleDetailDialogComponent {
  readonly data = inject<AdminRoleDetailData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<AdminRoleDetailDialogComponent>)
  private readonly dialog = inject(MatDialog)
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)

  relativeTime = adminRelativeTime
  readonly view = signal<DetailTab>('overview')

  readonly tabs = [
    { id: 'overview' as const, label: 'Resumen', icon: 'dashboard' },
    { id: 'users' as const, label: 'Usuarios', icon: 'groups' },
    { id: 'permissions' as const, label: 'Permisos', icon: 'grid_on' },
  ]

  readonly roleUsers = computed(() => getAssignmentsForRole(this.data.role.name, this.data.assignments))
  readonly permMix = computed(() => adminPermissionCategoryMix())
  readonly donutSegments = computed(() => permissionDonutSegments(this.permMix()))

  readonly rolePermissions = computed(() => {
    const slug = this.data.role.slug
    const key = slug === 'super_admin' ? 'superAdmin' : slug === 'finance_viewer' || slug === 'partner_readonly' ? 'viewer' : slug as 'admin' | 'operator' | 'viewer'
    if (slug === 'finance_viewer') return ADMIN_PERMISSIONS.filter((p) => p.resource.includes('billing') || p.action === 'read')
    if (slug === 'partner_readonly') return ADMIN_PERMISSIONS.filter((p) => p.action === 'read' && !p.resource.startsWith('users') && !p.resource.startsWith('settings'))
    if (key === 'superAdmin') return ADMIN_PERMISSIONS
    return ADMIN_PERMISSIONS.filter((p) => p[key as keyof typeof p] === true)
  })

  userInitials = (name: string): string => {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  openEditAssignment = (assignment: AdminRoleAssignmentRow): void => {
    const ref = this.dialog.open(AdminRoleAssignmentEditDialogComponent, {
      width: 'min(780px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '92vh',
      panelClass: 'admin-role-assignment-dialog-panel',
      data: { mode: 'edit' as const, assignment },
    })
    ref.afterClosed().subscribe((result) => {
      if (result?.saved && result.assignment) {
        this.data.onAssignmentUpdated?.(result.assignment)
        this.toast.success(`Rol actualizado para ${result.assignment.userName}`)
      }
    })
  }

  openAssignForRole = (): void => {
    const ref = this.dialog.open(AdminRoleAssignmentEditDialogComponent, {
      width: 'min(780px, 94vw)',
      maxWidth: '94vw',
      panelClass: 'admin-role-assignment-dialog-panel',
      data: { mode: 'assign' as const, defaultRole: this.data.role.name },
    })
    ref.afterClosed().subscribe((result) => {
      if (result?.saved && result.assignment) {
        this.data.onAssignmentUpdated?.(result.assignment)
      }
    })
  }

  handleAction = (actionId: string, label: string): void => {
    this.actions.runRowAction('roles', actionId, this.data.role as unknown as Record<string, unknown>, undefined, label)
    this.dialogRef.close({ action: actionId, id: this.data.role.id })
  }
}
