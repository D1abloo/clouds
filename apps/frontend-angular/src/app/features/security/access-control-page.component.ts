import { DatePipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import { SECURITY_ACCENT, SECURITY_ACCENT_BORDER, SECURITY_ACCENT_LIGHT, SECURITY_ACTION_BTN, SECURITY_ACTION_BTN_ICON, SECURITY_ACTION_BTN_PRIMARY, SECURITY_ACTION_BTN_SM } from './security.config'
import {
  defaultAccessViolations,
  defaultAssignments,
  defaultCloudPermissions,
  defaultIamPolicies,
  defaultSshAccess,
  type AccessAssignment,
} from './access-control.demo'
import { AccessGrantDialogComponent } from './access-grant-dialog.component'
import { AccessDetailDialogComponent } from './access-detail-dialog.component'

type AccessTab = 'assignments' | 'iam' | 'ssh' | 'cloud' | 'violations'

@Component({
  selector: 'app-access-control-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, MatButtonModule, MatIconModule, MatMenuModule, MatDialogModule, StatusBadgeComponent],
  template: `
    <div class="page-container access-page animate-fade-in">
      <section class="access-intro">
        <div class="access-intro__main">
          <span class="access-intro__eyebrow">Seguridad · Acceso</span>
          <h2 class="access-intro__title">Control de acceso</h2>
          <p class="access-intro__desc">
            Gestiona asignaciones de roles, políticas IAM, acceso SSH y permisos cloud.
            Revisa violaciones y exporta la matriz de accesos.
          </p>
        </div>
        <div class="access-intro__actions">
          <button type="button" class="access-btn access-btn--primary" (click)="openGrantDialog()"><mat-icon>person_add</mat-icon> Conceder acceso</button>
          <button type="button" class="access-btn" (click)="handleReviewPolicies()"><mat-icon>policy</mat-icon> Revisar políticas</button>
          <button type="button" class="access-btn" (click)="handleExportMatrix()"><mat-icon>download</mat-icon> Exportar matriz</button>
        </div>
      </section>

      <div class="access-bar">
        <nav class="access-tabs" role="tablist">
          @for (tab of tabs; track tab.id) {
            <button type="button" role="tab" class="access-tabs__tab" [class.access-tabs__tab--on]="view() === tab.id" (click)="view.set(tab.id)">
              <mat-icon>{{ tab.icon }}</mat-icon>{{ tab.label }}
            </button>
          }
        </nav>
        @if (view() === 'assignments') {
          <label class="access-search"><mat-icon>search</mat-icon><input type="search" [formControl]="searchControl" placeholder="Usuario o rol…" aria-label="Buscar" /></label>
        }
      </div>

      <div class="access-content">
        @switch (view()) {
          @case ('assignments') {
            <table class="access-table" aria-label="Asignaciones">
              <thead><tr><th>Usuario</th><th>Rol</th><th>Ámbito</th><th>MFA</th><th>Estado</th><th>Concedido</th><th></th></tr></thead>
              <tbody>
                @for (row of filteredAssignments(); track row.id) {
                  <tr>
                    <td>{{ row.user }}</td><td>{{ row.role }}</td><td>{{ row.scope }}</td>
                    <td>{{ row.mfa ? 'Sí' : 'No' }}</td><td><app-status-badge [value]="row.status" /></td>
                    <td>{{ row.grantedAt | date: 'dd MMM yyyy' }}</td>
                    <td class="access-table__actions">
                      <button type="button" class="access-icon-btn" [matMenuTriggerFor]="asgMenu" (click)="activeAssignment.set(row)" aria-label="Acciones"><mat-icon>more_vert</mat-icon></button>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="7" class="access-empty">Sin asignaciones.</td></tr> }
              </tbody>
            </table>
          }
          @case ('iam') {
            <table class="access-table" aria-label="Políticas IAM">
              <thead><tr><th>Política</th><th>Recursos</th><th>Permisos</th><th>Última revisión</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                @for (row of iamPolicies(); track row.id) {
                  <tr>
                    <td class="mono">{{ row.name }}</td><td>{{ row.resources }}</td><td>{{ row.permissions }}</td>
                    <td>{{ row.lastReview | date: 'dd MMM yyyy' }}</td><td><app-status-badge [value]="row.status" /></td>
                    <td><button type="button" class="access-btn access-btn--sm" (click)="handleReviewPolicy(row.name)">Revisar</button></td>
                  </tr>
                }
              </tbody>
            </table>
          }
          @case ('ssh') {
            <table class="access-table" aria-label="Acceso SSH">
              <thead><tr><th>Usuario</th><th>Host</th><th>Clave</th><th>Método</th><th>Último login</th><th>Estado</th></tr></thead>
              <tbody>
                @for (row of sshAccess(); track row.id) {
                  <tr>
                    <td>{{ row.user }}</td><td class="mono">{{ row.host }}</td><td>{{ row.key }}</td>
                    <td>{{ row.method }}</td><td>{{ row.lastLogin | date: 'dd MMM HH:mm' }}</td><td><app-status-badge [value]="row.status" /></td>
                  </tr>
                }
              </tbody>
            </table>
          }
          @case ('cloud') {
            <table class="access-table" aria-label="Permisos cloud">
              <thead><tr><th>Principal</th><th>Proveedor</th><th>Servicio</th><th>Acciones</th><th>Estado</th></tr></thead>
              <tbody>
                @for (row of cloudPermissions(); track row.id) {
                  <tr>
                    <td class="mono">{{ row.principal }}</td><td>{{ row.provider }}</td><td>{{ row.service }}</td>
                    <td class="mono">{{ row.actions }}</td><td><app-status-badge [value]="row.status" /></td>
                  </tr>
                }
              </tbody>
            </table>
          }
          @case ('violations') {
            <table class="access-table" aria-label="Violaciones">
              <thead><tr><th>Usuario</th><th>Violación</th><th>Recurso</th><th>Severidad</th><th>Detectado</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                @for (row of violations(); track row.id) {
                  <tr>
                    <td>{{ row.user }}</td><td>{{ row.violation }}</td><td>{{ row.resource }}</td>
                    <td><span class="access-sev" [attr.data-sev]="row.severity">{{ row.severity }}</span></td>
                    <td>{{ row.detectedAt | date: 'dd MMM HH:mm' }}</td><td><app-status-badge [value]="row.status" /></td>
                    <td><button type="button" class="access-btn access-btn--sm" (click)="handleResolveViolation(row.user)">Resolver</button></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        }
      </div>

      <mat-menu #asgMenu="matMenu">
        <button mat-menu-item type="button" (click)="openAssignmentDetail(activeAssignment()!)"><mat-icon>visibility</mat-icon> Ver detalle</button>
        <button mat-menu-item type="button" (click)="handleRevoke(activeAssignment()!)"><mat-icon>person_remove</mat-icon> Revocar</button>
      </mat-menu>
    </div>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .access-page { display: flex; flex-direction: column; gap: 0.45rem; overflow-y: auto; scrollbar-width: thin; color: #0f172a; font-size: 0.78rem; }
    .access-intro { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem; }
    .access-intro__eyebrow { font-size: 0.54rem; font-weight: 700; text-transform: uppercase; color: ${SECURITY_ACCENT}; }
    .access-intro__title { margin: 0.15rem 0; font-size: 0.95rem; font-weight: 700; }
    .access-intro__desc { margin: 0; max-width: 38rem; font-size: 0.68rem; color: #64748b; line-height: 1.5; }
    .access-intro__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: flex-start; height: fit-content; padding: 0; }
    .access-btn { ${SECURITY_ACTION_BTN} }
    .access-btn mat-icon { ${SECURITY_ACTION_BTN_ICON} }
    .access-btn--primary { ${SECURITY_ACTION_BTN_PRIMARY} }
    .access-btn--sm { ${SECURITY_ACTION_BTN_SM} }
    .access-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; }
    .access-tabs { display: flex; flex-wrap: wrap; gap: 0.15rem; padding: 0.15rem; border-radius: 8px; background: ${SECURITY_ACCENT_LIGHT}; }
    .access-tabs__tab { display: inline-flex; align-items: center; gap: 0.22rem; padding: 0.25rem 0.45rem; border: none; border-radius: 6px; background: transparent; font: inherit; font-size: 0.62rem; font-weight: 600; color: #4338ca; cursor: pointer; }
    .access-tabs__tab mat-icon { font-size: 0.8rem; width: 0.8rem; height: 0.8rem; }
    .access-tabs__tab--on { background: #fff; color: ${SECURITY_ACCENT}; box-shadow: 0 1px 2px rgb(79 70 229 / 0.08); }
    .access-search { display: flex; align-items: center; gap: 0.28rem; flex: 1; max-width: 14rem; padding: 0.28rem 0.45rem; border-radius: 7px; border: 1px solid ${SECURITY_ACCENT_BORDER}; margin-left: auto; }
    .access-search mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: #94a3b8; }
    .access-search input { flex: 1; border: none; background: transparent; font: inherit; font-size: 0.66rem; outline: none; }
    .access-content { border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; overflow: auto; }
    .access-table { width: 100%; border-collapse: collapse; font-size: 0.68rem; }
    .access-table th { text-align: left; padding: 0.35rem 0.5rem; font-size: 0.54rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; background: #f8fafc; }
    .access-table td { padding: 0.35rem 0.5rem; border-bottom: 1px solid #f1f5f9; }
    .access-empty { text-align: center; color: #94a3b8; padding: 1rem !important; font-size: 0.68rem; }
    .access-icon-btn { border: none; background: transparent; cursor: pointer; color: #64748b; }
    .access-icon-btn mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .access-sev { font-size: 0.58rem; font-weight: 700; text-transform: uppercase;
      &[data-sev='critical'] { color: #b91c1c; }
      &[data-sev='warning'] { color: #b45309; }
    }
    .mono { font-family: ui-monospace, monospace; font-size: 0.64rem; }
  `,
})
export class AccessControlPageComponent {
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly view = signal<AccessTab>('assignments')
  readonly assignments = signal(defaultAssignments())
  readonly iamPolicies = signal(defaultIamPolicies())
  readonly sshAccess = signal(defaultSshAccess())
  readonly cloudPermissions = signal(defaultCloudPermissions())
  readonly violations = signal(defaultAccessViolations())
  readonly activeAssignment = signal<AccessAssignment | null>(null)

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')), { initialValue: '' })

  readonly tabs = [
    { id: 'assignments' as const, label: 'Asignaciones', icon: 'group' },
    { id: 'iam' as const, label: 'Políticas IAM', icon: 'policy' },
    { id: 'ssh' as const, label: 'Acceso SSH', icon: 'terminal' },
    { id: 'cloud' as const, label: 'Permisos cloud', icon: 'cloud' },
    { id: 'violations' as const, label: 'Violaciones', icon: 'gpp_bad' },
  ]

  filteredAssignments = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.assignments().filter((a) => !term || `${a.user} ${a.role} ${a.scope}`.toLowerCase().includes(term))
  })

  openGrantDialog = (): void => {
    const ref = this.dialog.open(AccessGrantDialogComponent, { width: 'min(420px, 94vw)' })
    ref.afterClosed().subscribe((assignment: AccessAssignment | undefined) => {
      if (!assignment) return
      this.assignments.update((rows) => [assignment, ...rows])
      this.toast.success(`Acceso concedido a ${assignment.user}`)
    })
  }

  openAssignmentDetail = (row: AccessAssignment): void => {
    this.dialog.open(AccessDetailDialogComponent, { width: 'min(480px, 94vw)', data: { assignment: row } })
  }

  handleRevoke = (row: AccessAssignment): void => {
    this.assignments.update((rows) => rows.filter((a) => a.id !== row.id))
    this.toast.info(`Acceso revocado: ${row.user}`)
  }

  handleReviewPolicies = (): void => {
    this.view.set('iam')
    this.toast.info('Revisión de políticas IAM iniciada')
  }

  handleReviewPolicy = (name: string): void => this.toast.info(`Revisando política: ${name}`)

  handleExportMatrix = (): void => this.toast.success('Matriz de accesos exportada (CSV)')

  handleResolveViolation = (user: string): void => {
    this.violations.update((rows) => rows.filter((v) => v.user !== user))
    this.toast.success(`Violación resuelta: ${user}`)
  }
}
