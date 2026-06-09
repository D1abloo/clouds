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
  defaultRotationPolicies,
  defaultRotations,
  defaultSecretAudit,
  defaultSecrets,
  SECRET_TYPE_LABELS,
  type RotationPolicy,
  type SecretAuditEntry,
  type SecretRecord,
  type SecretRotation,
} from './secrets-manager.data'
import { SecretDetailDialogComponent } from './secret-detail-dialog.component'
import { SecretAddDialogComponent } from './secret-add-dialog.component'
import { SecretPolicyDetailDialogComponent } from './secret-policy-detail-dialog.component'
import { ProConfigGateComponent } from '../../shared/components/pro-config-gate/pro-config-gate.component'

type SecretTab = 'secrets' | 'rotation' | 'audit' | 'policies'

@Component({
  selector: 'app-secrets-manager-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, MatButtonModule, MatIconModule, MatMenuModule, MatDialogModule, StatusBadgeComponent, ProConfigGateComponent],
  template: `
    <app-pro-config-gate module="Gestor de secretos">
    <div class="page-container secret-page animate-fade-in">
      <section class="secret-intro">
        <div class="secret-intro__main">
          <span class="secret-intro__eyebrow">Seguridad · Secretos</span>
          <h2 class="secret-intro__title">Gestor de secretos</h2>
          <p class="secret-intro__desc">
            Centraliza claves SSH, credenciales cloud, tokens API y referencias Vault con rotación
            automatizada, políticas de cumplimiento y trazabilidad completa de accesos.
          </p>
        </div>
        <div class="secret-intro__actions">
          <button type="button" class="secret-btn secret-btn--primary" (click)="openAddDialog()">
            <mat-icon>add</mat-icon> Añadir secreto
          </button>
          <button type="button" class="secret-btn" (click)="handleRotateSelected()">
            <mat-icon>sync</mat-icon> Rotar seleccionados
          </button>
          <button type="button" class="secret-btn" (click)="view.set('audit')">
            <mat-icon>history</mat-icon> Ver auditoría
          </button>
        </div>
      </section>

      <div class="secret-bar">
        <nav class="secret-tabs" role="tablist">
          @for (tab of tabs; track tab.id) {
            <button type="button" role="tab" class="secret-tabs__tab" [class.secret-tabs__tab--on]="view() === tab.id" (click)="view.set(tab.id)">
              <mat-icon>{{ tab.icon }}</mat-icon>{{ tab.label }}
            </button>
          }
        </nav>
        @if (view() === 'secrets') {
          <label class="secret-search">
            <mat-icon>search</mat-icon>
            <input type="search" [formControl]="searchControl" placeholder="Nombre o referencia…" aria-label="Buscar secretos" />
          </label>
          <select class="secret-filter" [formControl]="typeControl" aria-label="Filtrar tipo">
            <option value="">Todos los tipos</option>
            @for (t of typeOptions; track t) { <option [value]="t">{{ typeLabel(t) }}</option> }
          </select>
        }
      </div>

      <div class="secret-table-wrap">
        @switch (view()) {
          @case ('secrets') {
            <table class="secret-table" aria-label="Secretos">
              <thead><tr><th></th><th>Nombre</th><th>Tipo</th><th>Referencia</th><th>Expira</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                @for (row of filteredSecrets(); track row.id) {
                  <tr (click)="openDetail(row)" class="secret-table__row">
                    <td (click)="$event.stopPropagation()"><input type="checkbox" [checked]="selectedIds().has(row.id)" (change)="toggleSelect(row.id)" aria-label="Seleccionar" /></td>
                    <td><strong>{{ row.name }}</strong></td>
                    <td>{{ typeLabel(row.type) }}</td>
                    <td class="mono">{{ row.reference }}</td>
                    <td>{{ row.expires }}</td>
                    <td><app-status-badge [value]="row.status" /></td>
                    <td class="secret-table__actions" (click)="$event.stopPropagation()">
                      <button type="button" class="secret-icon-btn" [matMenuTriggerFor]="secMenu" (click)="activeSecret.set(row)" aria-label="Acciones"><mat-icon>more_vert</mat-icon></button>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="7" class="secret-empty">Sin secretos.</td></tr> }
              </tbody>
            </table>
          }
          @case ('rotation') {
            <ul class="secret-rot-list">
              @for (row of rotations(); track row.id) {
                <li class="secret-rot">
                  <div class="secret-rot__main">
                    <header>
                      <strong>{{ row.secret }}</strong>
                      <app-status-badge [value]="row.status" />
                    </header>
                    <p>{{ row.method }}</p>
                    <dl>
                      <div><dt>Política</dt><dd>{{ row.policy }}</dd></div>
                      <div><dt>Ventana</dt><dd>{{ row.window }}</dd></div>
                      <div><dt>Última rotación</dt><dd>{{ row.lastRotated | date: 'dd MMM yyyy' }}</dd></div>
                      <div><dt>Próxima</dt><dd>{{ row.nextRotation }}</dd></div>
                      <div><dt>Auto</dt><dd>{{ row.autoRotate ? 'Sí' : 'No' }}</dd></div>
                      <div><dt>Afectados</dt><dd>{{ row.secretsAffected }}</dd></div>
                    </dl>
                  </div>
                  <button type="button" class="secret-btn secret-btn--primary secret-btn--sm" (click)="handleRotateOne(row)">
                    <mat-icon>sync</mat-icon> Rotar
                  </button>
                </li>
              }
            </ul>
          }
          @case ('audit') {
            <table class="secret-table" aria-label="Auditoría secretos">
              <thead><tr><th>Acción</th><th>Secreto</th><th>Usuario</th><th>IP</th><th>Cuándo</th></tr></thead>
              <tbody>
                @for (row of auditLog(); track row.id) {
                  <tr>
                    <td><span class="secret-action" [attr.data-action]="row.action">{{ row.action }}</span></td>
                    <td class="mono">{{ row.secret }}</td>
                    <td>{{ row.user }}</td>
                    <td class="mono">{{ row.ip }}</td>
                    <td>{{ row.at | date: 'dd MMM HH:mm' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
          @case ('policies') {
            <div class="secret-policies">
              @for (pol of policies(); track pol.id) {
                <article class="secret-policy">
                  <header>
                    <div>
                      <h3>{{ pol.name }}</h3>
                      <span class="secret-policy__scope">{{ pol.scope }}</span>
                    </div>
                    <app-status-badge [value]="pol.status" />
                  </header>
                  <p>{{ pol.description }}</p>
                  <dl>
                    <div><dt>Intervalo</dt><dd>{{ pol.intervalDays }} días</dd></div>
                    <div><dt>Secretos</dt><dd>{{ pol.secretsCount }}</dd></div>
                    <div><dt>Última ejecución</dt><dd>{{ pol.lastRun | date: 'dd MMM yyyy' }}</dd></div>
                    <div><dt>Próxima</dt><dd>{{ pol.nextRun | date: 'dd MMM yyyy' }}</dd></div>
                  </dl>
                  <ul class="secret-policy__rules">
                    @for (rule of pol.rules.slice(0, 2); track rule) { <li>{{ rule }}</li> }
                  </ul>
                  <div class="secret-policy__actions">
                    <button type="button" class="secret-btn secret-btn--primary secret-btn--sm" (click)="openPolicyDetail(pol)">
                      <mat-icon>visibility</mat-icon> Ver detalle
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        }
      </div>

      <mat-menu #secMenu="matMenu">
        <button mat-menu-item type="button" (click)="openDetail(activeSecret()!)"><mat-icon>visibility</mat-icon> Ver detalle</button>
        <button mat-menu-item type="button" (click)="handleRotateSecret(activeSecret()!)"><mat-icon>sync</mat-icon> Rotar</button>
        <button mat-menu-item type="button" (click)="handleRevoke(activeSecret()!)"><mat-icon>delete</mat-icon> Revocar</button>
      </mat-menu>
    </div>
    </app-pro-config-gate>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .secret-page { display: flex; flex-direction: column; gap: 0.65rem; overflow-y: auto; scrollbar-width: thin; color: #0f172a; font-size: 0.8125rem; }
    .secret-intro { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem; }
    .secret-intro__eyebrow { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: ${SECURITY_ACCENT}; }
    .secret-intro__title { margin: 0.2rem 0; font-size: 1.05rem; font-weight: 700; }
    .secret-intro__desc { margin: 0; max-width: 40rem; font-size: 0.72rem; color: #64748b; line-height: 1.55; }
    .secret-intro__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: flex-start; height: fit-content; padding: 0; }
    .secret-btn { ${SECURITY_ACTION_BTN} }
    .secret-btn mat-icon { ${SECURITY_ACTION_BTN_ICON} }
    .secret-btn--primary { ${SECURITY_ACTION_BTN_PRIMARY} }
    .secret-btn--sm { ${SECURITY_ACTION_BTN_SM} }
    .secret-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .secret-tabs { display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.2rem; border-radius: 10px; background: ${SECURITY_ACCENT_LIGHT}; }
    .secret-tabs__tab { display: inline-flex; align-items: center; gap: 0.28rem; padding: 0.35rem 0.6rem; border: none; border-radius: 8px; background: transparent; font: inherit; font-size: 0.68rem; font-weight: 600; color: #4338ca; cursor: pointer; }
    .secret-tabs__tab--on { background: #fff; color: ${SECURITY_ACCENT}; box-shadow: 0 1px 2px rgb(79 70 229 / 0.08); }
    .secret-search { display: flex; align-items: center; gap: 0.35rem; flex: 1; max-width: 16rem; padding: 0.35rem 0.55rem; border-radius: 9px; border: 1px solid ${SECURITY_ACCENT_BORDER}; margin-left: auto; }
    .secret-search input { flex: 1; border: none; background: transparent; font: inherit; font-size: 0.72rem; outline: none; }
    .secret-filter { padding: 0.35rem 0.5rem; border-radius: 9px; border: 1px solid ${SECURITY_ACCENT_BORDER}; font: inherit; font-size: 0.68rem; }
    .secret-table-wrap { border-radius: 11px; border: 1px solid #e2e8f0; background: #fff; overflow: auto; }
    .secret-table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
    .secret-table th { text-align: left; padding: 0.5rem 0.65rem; font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; background: #f8fafc; }
    .secret-table td { padding: 0.5rem 0.65rem; border-bottom: 1px solid #f1f5f9; }
    .secret-table__row { cursor: pointer; }
    .secret-table__row:hover td { background: ${SECURITY_ACCENT_LIGHT}; }
    .secret-empty { text-align: center; color: #94a3b8; padding: 1.5rem !important; }
    .secret-icon-btn { border: none; background: transparent; cursor: pointer; color: #64748b; }
    .secret-action { font-weight: 700; font-size: 0.62rem; &[data-action='DELETE'] { color: #b91c1c; } &[data-action='ROTATE'] { color: #059669; } }
    .secret-rot-list { list-style: none; margin: 0; padding: 0.65rem; display: flex; flex-direction: column; gap: 0.45rem; }
    .secret-rot {
      display: grid; grid-template-columns: 1fr auto; gap: 0.65rem; align-items: start;
      padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid ${SECURITY_ACCENT_BORDER}; background: ${SECURITY_ACCENT_LIGHT};
    }
    .secret-rot header { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
    .secret-rot header strong { font-size: 0.82rem; }
    .secret-rot p { margin: 0 0 0.4rem; font-size: 0.68rem; color: #64748b; line-height: 1.45; }
    .secret-rot dl { display: flex; flex-wrap: wrap; gap: 0.65rem 1rem; margin: 0; font-size: 0.66rem; dt { color: #94a3b8; } dd { margin: 0; font-weight: 600; } }
    .secret-policies { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.5rem; padding: 0.65rem; }
    .secret-policy { padding: 0.75rem; border-radius: 10px; border: 1px solid ${SECURITY_ACCENT_BORDER}; background: ${SECURITY_ACCENT_LIGHT}; display: flex; flex-direction: column; gap: 0.35rem; }
    .secret-policy header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
    .secret-policy h3 { margin: 0; font-size: 0.82rem; }
    .secret-policy__scope { display: block; font-size: 0.62rem; color: #64748b; margin-top: 0.1rem; }
    .secret-policy p { margin: 0; font-size: 0.68rem; color: #64748b; line-height: 1.45; }
    .secret-policy dl { display: flex; flex-wrap: wrap; gap: 0.65rem 1rem; margin: 0; font-size: 0.66rem; dt { color: #94a3b8; } dd { margin: 0; font-weight: 600; } }
    .secret-policy__rules { margin: 0; padding-left: 1rem; font-size: 0.64rem; color: #475569; line-height: 1.45; }
    .secret-policy__actions { margin-top: 0.25rem; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
  `,
})
export class SecretsManagerPageComponent {
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly view = signal<SecretTab>('secrets')
  readonly secrets = signal(defaultSecrets())
  readonly rotations = signal(defaultRotations())
  readonly auditLog = signal(defaultSecretAudit())
  readonly policies = signal(defaultRotationPolicies())
  readonly selectedIds = signal(new Set<string>())
  readonly activeSecret = signal<SecretRecord | null>(null)

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly typeControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')), { initialValue: '' })
  private readonly typeFilter = toSignal(this.typeControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  readonly tabs = [
    { id: 'secrets' as const, label: 'Secretos', icon: 'vpn_key' },
    { id: 'rotation' as const, label: 'Rotación', icon: 'sync' },
    { id: 'audit' as const, label: 'Auditoría secretos', icon: 'history' },
    { id: 'policies' as const, label: 'Políticas rotación', icon: 'policy' },
  ]

  readonly typeOptions = ['ssh', 'cloud', 'api', 'vault', 'db'] as const
  typeLabel = (t: string): string => SECRET_TYPE_LABELS[t as keyof typeof SECRET_TYPE_LABELS] ?? t

  filteredSecrets = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const type = this.typeFilter()
    return this.secrets().filter((s) => {
      if (type && s.type !== type) return false
      if (!term) return true
      return `${s.name} ${s.reference}`.toLowerCase().includes(term)
    })
  })

  toggleSelect = (id: string): void => {
    this.selectedIds.update((set) => {
      const next = new Set(set)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  openAddDialog = (): void => {
    const ref = this.dialog.open(SecretAddDialogComponent, {
      width: 'min(720px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'sec-secret-dialog-panel',
    })
    ref.afterClosed().subscribe((secret: SecretRecord | undefined) => {
      if (!secret) return
      this.secrets.update((rows) => [secret, ...rows])
      this.auditLog.update((rows) => [{
        id: `aud-${Date.now()}`,
        action: 'CREATE',
        secret: secret.name,
        user: 'admin@cloudops',
        at: new Date().toISOString(),
        ip: '203.0.113.10',
      }, ...rows])
      this.toast.success(`Secreto creado: ${secret.name}`)
    })
  }

  openDetail = (row: SecretRecord): void => {
    const ref = this.dialog.open(SecretDetailDialogComponent, {
      width: 'min(720px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'sec-secret-dialog-panel',
      data: { secret: row },
    })
    ref.afterClosed().subscribe((result) => {
      if (result?.rotated) {
        this.secrets.update((rows) => rows.map((s) => (s.id === result.id ? { ...s, status: 'running', lastRotated: new Date().toISOString() } : s)))
      }
    })
  }

  openPolicyDetail = (policy: RotationPolicy): void => {
    this.dialog.open(SecretPolicyDetailDialogComponent, {
      width: 'min(680px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '90vh',
      panelClass: 'sec-secret-policy-dialog-panel',
      data: { policy },
    })
  }

  handleRotateSecret = (row: SecretRecord): void => {
    this.toast.success(`Rotación iniciada: ${row.name}`)
    this.secrets.update((rows) => rows.map((s) => (s.id === row.id ? { ...s, status: 'running' } : s)))
  }

  handleRotateOne = (row: SecretRotation): void => {
    this.toast.success(`Rotación programada: ${row.secret}`)
    this.rotations.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, status: 'running' } : r)))
  }

  handleRotateSelected = (): void => {
    const ids = this.selectedIds()
    if (!ids.size) {
      this.toast.warning('Selecciona al menos un secreto')
      return
    }
    this.secrets.update((rows) => rows.map((s) => (ids.has(s.id) ? { ...s, status: 'running' } : s)))
    this.toast.success(`Rotación masiva de ${ids.size} secreto(s)`)
    this.selectedIds.set(new Set())
  }

  handleRevoke = (row: SecretRecord): void => {
    this.secrets.update((rows) => rows.filter((s) => s.id !== row.id))
    this.auditLog.update((rows) => [{
      id: `aud-${Date.now()}`,
      action: 'DELETE',
      secret: row.name,
      user: 'admin@cloudops',
      at: new Date().toISOString(),
      ip: '203.0.113.10',
    }, ...rows])
    this.toast.info(`Secreto revocado: ${row.name}`)
  }
}
