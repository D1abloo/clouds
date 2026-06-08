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
  ADMIN_TOKENS_ACCENT,
  ADMIN_TOKENS_ACCENT_BORDER,
  ADMIN_TOKENS_ACCENT_LIGHT,
  adminRelativeTime,
  adminScopeLabel,
  downloadBlob,
} from './admin.config'
import {
  API_TOKENS_ACTIVE,
  API_TOKENS_AUDIT,
  API_TOKENS_EXPIRING,
  API_TOKENS_REVOKED,
  API_TOKEN_SCOPES,
  API_TOKEN_ROTATION_POLICIES,
  type ApiTokenRow,
} from './admin-api-tokens.demo'
import { AdminApiTokenDetailDialogComponent } from './admin-api-token-detail-dialog.component'
import { ProConfigGateComponent } from '../../shared/components/pro-config-gate/pro-config-gate.component'
import { AdminApiTokenAuditDetailDialogComponent } from './admin-api-token-audit-detail-dialog.component'
import {
  AdminApiTokenAuditActionDialogComponent,
  type ApiTokenAuditActionMode,
} from './admin-api-token-audit-action-dialog.component'
import {
  AdminApiTokenActionDialogComponent,
  type ApiTokenActionMode,
} from './admin-api-token-action-dialog.component'

type TokenTab = 'active' | 'expiring' | 'revoked' | 'audit' | 'scopes' | 'policies'

@Component({
  selector: 'app-admin-api-tokens-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ProConfigGateComponent,
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
  ],
  template: `
    <app-pro-config-gate module="Tokens API">
    <div class="page-container tok-page animate-fade-in">
      <app-page-header
        title="Tokens API"
        description="Claves Bearer para autenticar integraciones, CI/CD y scripts contra la API de CloudOps."
        icon="vpn_key"
        [actions]="headerActions"
        (actionClick)="handleHeader($event)"
      />

      <section class="tok-intro">
        <div class="tok-intro__main">
          <span class="tok-intro__eyebrow">Administración · Autenticación</span>
          <h2 class="tok-intro__title">Gestión de tokens API</h2>
          <p class="tok-intro__desc">
            Emite tokens con alcances mínimos, rota periódicamente y audita cada llamada autenticada.
            Los tokens se envían en <code>Authorization: Bearer &lt;token&gt;</code> — nunca en URLs ni logs.
          </p>
        </div>
        <ul class="tok-intro__uses">
          <li><mat-icon>build</mat-icon><span>Integraciones CI/CD (Jenkins, Terraform, scripts)</span></li>
          <li><mat-icon>monitoring</mat-icon><span>Exportadores de métricas y monitorización</span></li>
          <li><mat-icon>handshake</mat-icon><span>Partners con acceso readonly acotado</span></li>
        </ul>
      </section>

      <div class="tok-bar">
        <nav class="tok-tabs" role="tablist" aria-label="Vistas de tokens API">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              class="tok-tabs__tab"
              [class.tok-tabs__tab--on]="view() === tab.id"
              [attr.aria-selected]="view() === tab.id"
              (click)="view.set(tab.id)"
            >
              <mat-icon>{{ tab.icon }}</mat-icon>
              {{ tab.label }}
              <span class="tok-tabs__count">{{ tabCount(tab.id) }}</span>
            </button>
          }
        </nav>
        @if (view() !== 'scopes' && view() !== 'policies') {
          <label class="tok-search">
            <mat-icon>search</mat-icon>
            <input type="search" [formControl]="searchControl" placeholder="Buscar token, owner, alcance…" aria-label="Buscar tokens" />
          </label>
        }
      </div>

      <div class="table-card tok-content">
        @switch (view()) {
          @case ('active') {
            @if (filteredActive().length === 0) {
              <app-empty-state title="Sin tokens activos" description="Crea un token con alcances mínimos necesarios." icon="vpn_key" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover" aria-label="Tokens activos">
                  <thead>
                    <tr>
                      <th>Nombre</th><th>Prefijo</th><th>Alcances</th><th>Propietario</th>
                      <th>Entorno</th><th>Último uso</th><th>Estado</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of filteredActive(); track row.id) {
                      <tr class="tok-row" (click)="openTokenDetail(row)">
                        <td><strong>{{ row.name }}</strong></td>
                        <td><span class="token-prefix">{{ row.prefix }}</span></td>
                        <td class="scopes-cell">{{ scopeLabel(row.scope) }}</td>
                        <td>{{ row.owner }}</td>
                        <td><span class="tok-env" [attr.data-env]="row.environment">{{ row.environment ?? '—' }}</span></td>
                        <td>{{ relativeTime(row.lastUsed) }}</td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td (click)="$event.stopPropagation()">
                          <button mat-icon-button type="button" [matMenuTriggerFor]="tokenMenu" aria-label="Acciones" (click)="selectedRow.set(row)">
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
          @case ('expiring') {
            @if (filteredExpiring().length === 0) {
              <app-empty-state title="Ningún token próximo a caducar" icon="event" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover" aria-label="Tokens por expirar">
                  <thead>
                    <tr><th>Nombre</th><th>Prefijo</th><th>Expira</th><th>Propietario</th><th>Estado</th><th></th></tr>
                  </thead>
                  <tbody>
                    @for (row of filteredExpiring(); track row.id) {
                      <tr class="tok-row" (click)="openTokenDetail(row)">
                        <td><strong>{{ row.name }}</strong></td>
                        <td><span class="token-prefix">{{ row.prefix }}</span></td>
                        <td>{{ row.expires | date:'mediumDate' }}</td>
                        <td>{{ row.owner }}</td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td (click)="$event.stopPropagation()">
                          <button mat-icon-button type="button" [matMenuTriggerFor]="tokenMenu" aria-label="Acciones" (click)="selectedRow.set(row)">
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
          @case ('revoked') {
            @if (filteredRevoked().length === 0) {
              <app-empty-state title="Sin revocaciones recientes" icon="history" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover" aria-label="Tokens revocados">
                  <thead>
                    <tr><th>Nombre</th><th>Revocado por</th><th>Motivo</th><th>Fecha</th><th></th></tr>
                  </thead>
                  <tbody>
                    @for (row of filteredRevoked(); track row.id) {
                      <tr class="tok-row" (click)="openTokenDetail(row)">
                        <td><strong>{{ row.name }}</strong></td>
                        <td>{{ row.revokedBy }}</td>
                        <td>{{ row.reason }}</td>
                        <td>{{ row.revokedAt | date:'short' }}</td>
                        <td (click)="$event.stopPropagation()">
                          <button mat-icon-button type="button" [matMenuTriggerFor]="tokenMenu" aria-label="Acciones" (click)="selectedRow.set(row)">
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
              <app-empty-state title="Sin llamadas registradas" description="Las peticiones autenticadas aparecerán aquí." icon="receipt_long" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover" aria-label="Auditoría de uso">
                  <thead>
                    <tr><th>Token</th><th>Método</th><th>Endpoint</th><th>IP</th><th>Estado</th><th>Hace</th><th></th></tr>
                  </thead>
                  <tbody>
                    @for (row of filteredAudit(); track row.id) {
                      <tr class="tok-row" (click)="openAuditDetail(row)">
                        <td><span class="token-prefix">{{ row.prefix }}</span> {{ row.name }}</td>
                        <td><code class="method-chip">{{ row.method }}</code></td>
                        <td class="mono">{{ row.endpoint }}</td>
                        <td>{{ row.ip }}</td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td>{{ relativeTime(row.lastUsed) }}</td>
                        <td (click)="$event.stopPropagation()">
                          <button mat-icon-button type="button" [matMenuTriggerFor]="auditMenu" aria-label="Acciones" (click)="selectedRow.set(row)">
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
          @case ('scopes') {
            <div class="tok-config-intro">
              <p>Referencia de permisos al emitir un token. Asigna solo los alcances estrictamente necesarios.</p>
            </div>
            <div class="tok-scopes-wrap">
              <table class="premium-table tok-scopes-table" aria-label="Alcances API">
                <thead><tr><th class="tok-col-scope">Alcance</th><th class="tok-col-desc">Descripción</th><th class="tok-col-action"></th></tr></thead>
                <tbody>
                  @for (s of scopes; track s.scope) {
                    <tr>
                      <td class="tok-col-scope"><code class="tok-scope-code">{{ s.scope }}</code></td>
                      <td class="tok-col-desc">{{ s.description }}</td>
                      <td class="tok-col-action">
                        <button type="button" class="page-action-btn page-action-btn--sm" (click)="handleCopyScope(s.scope)">
                          <mat-icon>content_copy</mat-icon> Copiar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @case ('policies') {
            <div class="tok-config-intro">
              <p>Políticas de rotación automática. Revisa intervalos y tokens afectados antes de aplicar cambios.</p>
            </div>
            <div class="tok-policies">
              @for (pol of rotationPolicies; track pol.id) {
                <article class="tok-policy">
                  <header>
                    <div class="tok-policy__title">
                      <h3>{{ pol.name }}</h3>
                      <span class="tok-policy__scope">{{ pol.scope }}</span>
                    </div>
                    <app-status-badge [value]="pol.status" />
                  </header>
                  <p>{{ pol.description }}</p>
                  <dl class="tok-policy__stats">
                    <div><dt>Intervalo</dt><dd>{{ pol.intervalDays }} días</dd></div>
                    <div><dt>Tokens</dt><dd>{{ pol.tokensCount }}</dd></div>
                    <div><dt>Última ejecución</dt><dd>{{ pol.lastRun | date:'dd MMM yyyy' }}</dd></div>
                    <div><dt>Próxima</dt><dd>{{ pol.nextRun | date:'dd MMM yyyy' }}</dd></div>
                  </dl>
                  <button type="button" class="page-action-btn page-action-btn--primary page-action-btn--sm" (click)="handlePolicyReview(pol.name)">
                    <mat-icon>policy</mat-icon> Revisar política
                  </button>
                </article>
              }
            </div>
          }
        }
      </div>
    </div>

    <mat-menu #tokenMenu="matMenu" class="tok-context-menu">
      <div class="tok-menu-header" mat-menu-item disabled>
        <strong>{{ selectedRow()?.name }}</strong>
        <span class="mono">{{ selectedRow()?.prefix }}</span>
      </div>
      <button mat-menu-item type="button" (click)="openTokenDetail(selectedRow()!)">
        <mat-icon>visibility</mat-icon>
        <span>Ver detalle<em>Ficha completa, uso y seguridad</em></span>
      </button>
      <button mat-menu-item type="button" (click)="openTokenAction('rotate')">
        <mat-icon>autorenew</mat-icon>
        <span>Rotar<em>Nuevo secreto con ventana de gracia opcional</em></span>
      </button>
      <button mat-menu-item type="button" (click)="openTokenAction('copy')">
        <mat-icon>content_copy</mat-icon>
        <span>Copiar prefijo<em>Identificador parcial para logs</em></span>
      </button>
      @if (selectedRow()?.status !== 'stopped') {
        <button mat-menu-item type="button" (click)="openTokenAction('revoke')">
          <mat-icon>block</mat-icon>
          <span>Revocar<em>Invalida el token de forma permanente</em></span>
        </button>
      }
    </mat-menu>

    <mat-menu #auditMenu="matMenu" class="tok-context-menu">
      <div class="tok-menu-header" mat-menu-item disabled>
        <strong>{{ selectedRow()?.method }} {{ selectedRow()?.endpoint }}</strong>
        <span>{{ selectedRow()?.name }} · {{ selectedRow()?.ip }}</span>
      </div>
      <button mat-menu-item type="button" (click)="openAuditDetail(selectedRow()!)">
        <mat-icon>visibility</mat-icon>
        <span>Ver detalle<em>Resumen, petición y análisis de seguridad</em></span>
      </button>
      <button mat-menu-item type="button" (click)="openAuditAction('block-ip')">
        <mat-icon>shield</mat-icon>
        <span>Bloquear IP<em>Impide peticiones desde el origen</em></span>
      </button>
      <button mat-menu-item type="button" (click)="openAuditAction('copy-endpoint')">
        <mat-icon>content_copy</mat-icon>
        <span>Copiar endpoint<em>Método y ruta para logs</em></span>
      </button>
    </mat-menu>
    </app-pro-config-gate>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .tok-page { display: flex; flex-direction: column; gap: 0.65rem; overflow-y: auto; scrollbar-width: thin; --page-accent: ${ADMIN_TOKENS_ACCENT}; }
    .tok-page ::ng-deep .page-action-btn--primary { background: ${ADMIN_TOKENS_ACCENT}; border-color: #6d28d9; &:hover:not(:disabled) { background: #6d28d9; border-color: #5b21b6; } }
    .tok-intro { display: flex; flex-wrap: wrap; gap: 1rem; padding: 0.75rem 1rem; border-radius: var(--app-radius-md, 10px); border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; }
    .tok-intro__eyebrow { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: ${ADMIN_TOKENS_ACCENT}; }
    .tok-intro__title { margin: 0.2rem 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
    .tok-intro__desc { margin: 0; max-width: 38rem; font-size: 0.72rem; color: #64748b; line-height: 1.55; }
    .tok-intro__desc code { font-size: 0.68rem; }
    .tok-intro__uses { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 220px; }
    .tok-intro__uses li { display: flex; align-items: flex-start; gap: 0.35rem; font-size: 0.68rem; color: #475569; }
    .tok-intro__uses mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: ${ADMIN_TOKENS_ACCENT}; flex-shrink: 0; margin-top: 0.05rem; }
    .tok-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .tok-tabs { display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.2rem; border-radius: 10px; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; }
    .tok-tabs__tab { display: inline-flex; align-items: center; gap: 0.28rem; padding: 0.35rem 0.6rem; border: none; border-radius: 8px; background: transparent; font: inherit; font-size: 0.68rem; font-weight: 600; color: #6d28d9; cursor: pointer; }
    .tok-tabs__tab--on { background: #fff; color: ${ADMIN_TOKENS_ACCENT}; box-shadow: 0 1px 2px rgb(124 58 237 / 0.08); }
    .tok-tabs__tab mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    .tok-tabs__count { font-size: 0.58rem; font-weight: 700; padding: 0.05rem 0.35rem; border-radius: 999px; background: ${ADMIN_TOKENS_ACCENT_BORDER}; color: ${ADMIN_TOKENS_ACCENT}; }
    .tok-search { display: flex; align-items: center; gap: 0.35rem; flex: 1; max-width: 18rem; padding: 0.35rem 0.55rem; border-radius: 9px; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; margin-left: auto; background: #fff; }
    .tok-search input { flex: 1; border: none; background: transparent; font: inherit; font-size: 0.72rem; outline: none; }
    .tok-search mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: #94a3b8; }
    .tok-content { overflow: auto; padding: 0.15rem 0; }
    .tok-config-intro { padding: 0.85rem 1.1rem 0.5rem; p { margin: 0; font-size: 0.72rem; color: #64748b; line-height: 1.55; max-width: 42rem; } }
    .tok-scopes-wrap { padding: 0 0.85rem 0.85rem; overflow-x: auto; }
    .tok-scopes-table { width: 100%; min-width: 520px; table-layout: fixed; th, td { padding: 0.55rem 0.75rem; vertical-align: middle; } }
    .tok-col-scope { width: 11.5rem; min-width: 11.5rem; }
    .tok-col-desc { width: auto; min-width: 12rem; }
    .tok-col-action { width: 7.5rem; min-width: 7.5rem; text-align: right; white-space: nowrap; }
    .tok-scope-code { display: inline-block; font-size: 0.68rem; padding: 0.15rem 0.4rem; border-radius: 6px; background: color-mix(in srgb, ${ADMIN_TOKENS_ACCENT} 10%, transparent); border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; color: ${ADMIN_TOKENS_ACCENT}; word-break: break-all; max-width: 100%; }
    .tok-row { cursor: pointer; }
    .token-prefix { font-family: ui-monospace, monospace; font-size: 0.78rem; padding: 0.15rem 0.4rem; border-radius: 4px; background: color-mix(in srgb, ${ADMIN_TOKENS_ACCENT} 12%, transparent); white-space: nowrap; }
    .scopes-cell { min-width: 10rem; max-width: 16rem; font-size: 0.78rem; line-height: 1.45; word-wrap: break-word; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.78rem; word-break: break-word; }
    .method-chip { font-size: 0.75rem; padding: 0.1rem 0.35rem; border-radius: 4px; background: var(--app-surface-elevated, #f1f5f9); }
    .tok-env { font-size: 0.62rem; font-weight: 700; padding: 0.1rem 0.35rem; border-radius: 999px; background: #f1f5f9; white-space: nowrap; &[data-env='production'] { background: #dcfce7; color: #15803d; } &[data-env='staging'] { background: #fef3c7; color: #b45309; } }
    .tok-policies { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 0.75rem; padding: 0 1rem 1rem; }
    .tok-policy { padding: 0.85rem 1rem; border-radius: 12px; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
    .tok-policy header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.65rem; }
    .tok-policy__title { min-width: 0; flex: 1; }
    .tok-policy h3 { margin: 0; font-size: 0.82rem; font-weight: 700; line-height: 1.35; }
    .tok-policy__scope { display: block; font-size: 0.64rem; color: #64748b; margin-top: 0.2rem; line-height: 1.45; word-break: break-word; }
    .tok-policy p { margin: 0; font-size: 0.68rem; color: #64748b; line-height: 1.55; }
    .tok-policy__stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem 0.85rem; margin: 0; font-size: 0.66rem; dt { color: #94a3b8; font-size: 0.56rem; text-transform: uppercase; font-weight: 650; } dd { margin: 0.06rem 0 0; font-weight: 600; font-size: 0.74rem; } }
    .data-table-wrap { padding: 0 0.5rem 0.5rem; }
    ::ng-deep .tok-context-menu .tok-menu-header { opacity: 1 !important; height: auto !important; line-height: 1.35 !important; padding: 0.55rem 1rem 0.35rem !important; cursor: default !important; strong { display: block; font-size: 0.78rem; color: #0f172a; } span { display: block; font-size: 0.64rem; color: #64748b; font-weight: 400; } }
    ::ng-deep .tok-context-menu .mat-mdc-menu-item span { display: flex; flex-direction: column; line-height: 1.35; em { font-style: normal; font-size: 0.58rem; color: #94a3b8; font-weight: 400; margin-top: 0.08rem; } }
  `,
})
export class AdminApiTokensPageComponent {
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly selectedRow = signal<ApiTokenRow | null>(null)
  readonly view = signal<TokenTab>('active')

  readonly headerActions: PageHeaderAction[] = [
    { label: 'Emitir token', icon: 'add', primary: true },
    { label: 'Política de rotación', icon: 'policy' },
    { label: 'Exportar auditoría', icon: 'download' },
  ]

  readonly scopes = API_TOKEN_SCOPES
  readonly rotationPolicies = API_TOKEN_ROTATION_POLICIES

  readonly tabs = [
    { id: 'active' as const, label: 'Activos', icon: 'vpn_key' },
    { id: 'expiring' as const, label: 'Por expirar', icon: 'schedule' },
    { id: 'revoked' as const, label: 'Revocados', icon: 'block' },
    { id: 'audit' as const, label: 'Auditoría', icon: 'receipt_long' },
    { id: 'scopes' as const, label: 'Alcances', icon: 'list' },
    { id: 'policies' as const, label: 'Políticas', icon: 'policy' },
  ]

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(startWith(''), debounceTime(200)),
    { initialValue: '' },
  )

  readonly filteredActive = computed(() => this.filterRows(API_TOKENS_ACTIVE))
  readonly filteredExpiring = computed(() => this.filterRows(API_TOKENS_EXPIRING))
  readonly filteredRevoked = computed(() => this.filterRows(API_TOKENS_REVOKED))
  readonly filteredAudit = computed(() => this.filterRows(API_TOKENS_AUDIT))

  scopeLabel = adminScopeLabel
  relativeTime = adminRelativeTime

  tabCount = (id: TokenTab): number => {
    switch (id) {
      case 'active': return API_TOKENS_ACTIVE.length
      case 'expiring': return API_TOKENS_EXPIRING.length
      case 'revoked': return API_TOKENS_REVOKED.length
      case 'audit': return API_TOKENS_AUDIT.length
      case 'scopes': return API_TOKEN_SCOPES.length
      case 'policies': return API_TOKEN_ROTATION_POLICIES.length
    }
  }

  private filterRows(rows: ApiTokenRow[]): ApiTokenRow[] {
    const q = this.searchTerm().trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.scope.toLowerCase().includes(q) ||
        r.prefix.toLowerCase().includes(q) ||
        (r.endpoint?.toLowerCase().includes(q) ?? false),
    )
  }

  handleHeader = (label: string): void => {
    if (label === 'Exportar auditoría') {
      this.handleExportAudit()
      return
    }
    if (label === 'Política de rotación') {
      this.view.set('policies')
      this.toast.info('Mostrando políticas de rotación')
      return
    }
    const actionId = label === 'Emitir token' ? 'create' : 'review'
    this.actions.runPageAction('api-tokens', actionId, label, { area: 'admin' })
  }

  handleExportAudit = (): void => {
    const rows = API_TOKENS_AUDIT
    const header = 'id,token,method,endpoint,ip,status,timestamp\n'
    const body = rows.map((r) =>
      `${r.id},${r.name},${r.method},${r.endpoint},${r.ip},${r.status},${r.lastUsed}`,
    ).join('\n')
    downloadBlob(header + body, `api-tokens-audit-${Date.now()}.csv`, 'text/csv')
    this.toast.success(`Exportadas ${rows.length} llamadas (CSV)`)
  }

  handleCopyScope = (scope: string): void => {
    void navigator.clipboard.writeText(scope).then(
      () => this.toast.success(`Alcance copiado: ${scope}`),
      () => this.toast.info(scope),
    )
  }

  handlePolicyReview = (name: string): void => {
    this.actions.runPageAction('api-tokens', 'review', `Revisar: ${name}`, { area: 'admin' })
  }

  openTokenDetail = (row: ApiTokenRow): void => {
    const ref = this.dialog.open(AdminApiTokenDetailDialogComponent, {
      width: 'min(820px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '92vh',
      panelClass: 'admin-token-dialog-panel',
      data: { token: row },
    })
    ref.afterClosed().subscribe((result) => {
      if (result?.action === 'revoke') this.toast.info(`Token revocado: ${row.name}`)
      if (result?.action === 'rotate') this.toast.success(`Rotación iniciada: ${row.name}`)
    })
  }

  openAuditDetail = (row: ApiTokenRow): void => {
    this.dialog.open(AdminApiTokenAuditDetailDialogComponent, {
      width: 'min(820px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '92vh',
      panelClass: 'admin-token-audit-dialog-panel',
      data: { entry: row },
    })
  }

  openAuditAction = (mode: ApiTokenAuditActionMode): void => {
    const row = this.selectedRow()
    if (!row) return
    this.dialog.open(AdminApiTokenAuditActionDialogComponent, {
      width: 'min(560px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'admin-token-audit-action-dialog-panel',
      data: { entry: row, mode },
    })
  }

  openTokenAction = (mode: ApiTokenActionMode): void => {
    const row = this.selectedRow()
    if (!row) return
    this.dialog.open(AdminApiTokenActionDialogComponent, {
      width: 'min(560px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'admin-token-action-dialog-panel',
      data: { token: row, mode },
    })
  }

  runRow = (actionId: string, label: string): void => {
    const row = this.selectedRow()
    if (!row) return
    if (actionId === 'detail') {
      if (row.endpoint) this.openAuditDetail(row)
      else this.openTokenDetail(row)
      return
    }
    if (actionId === 'rotate' || actionId === 'copy' || actionId === 'revoke') {
      this.openTokenAction(actionId as ApiTokenActionMode)
      return
    }
    if (actionId === 'block-ip' || actionId === 'copy-endpoint') {
      this.openAuditAction(actionId as ApiTokenAuditActionMode)
      return
    }
    this.actions.runRowAction('api-tokens', actionId, row as unknown as Record<string, unknown>, undefined, label)
  }
}
