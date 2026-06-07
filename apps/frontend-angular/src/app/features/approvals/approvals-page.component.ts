import { DatePipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { debounceTime } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { ToastService } from '../../core/services/toast.service'
import { ApprovalsService } from '../approvals/approvals.service'
import { defaultServiceCatalogTemplates } from '../service-catalog/service-catalog.demo'
import { ApprovalsDetailPanelComponent } from './approvals-detail-panel.component'
import {
  APPROVAL_ENV_LABELS,
  APPROVAL_RISK_LABELS,
  APPROVAL_SOURCE_LABELS,
  APPROVAL_SOURCE_LOGO,
  APPROVAL_STATUS_LABELS,
} from './approvals.config'
import {
  defaultApprovalPolicies,
  type ApprovalPolicy,
  type ApprovalRequest,
  type ApprovalRisk,
  type ApprovalStatus,
} from './approvals.demo'

type ApprovalsView = 'pending' | 'history' | 'policies'

@Component({
  selector: 'app-approvals-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    BrandLogoComponent,
    ApprovalsDetailPanelComponent,
  ],
  template: `
    <div class="page-container apr-page animate-fade-in">
      <section class="apr-intro">
        <div class="apr-intro__main">
          <span class="apr-intro__eyebrow">Gobierno operativo</span>
          <h2 class="apr-intro__title">Aprobaciones</h2>
          <p class="apr-intro__desc">
            Punto de control obligatorio antes de ejecutar acciones sensibles en cloud. Cuando alguien
            lanza una plantilla, ejecuta un runbook o solicita un cambio que requiere revisión, la
            petición aparece aquí automáticamente con el detalle de qué se va a aprobar.
          </p>
        </div>
        <div class="apr-intro__aside">
          <p class="apr-intro__label">¿Para qué sirve?</p>
          <ul class="apr-intro__uses">
            <li>
              <mat-icon>inbox</mat-icon>
              <span>Recibir automáticamente lanzamientos y ejecuciones que requieran revisión</span>
            </li>
            <li>
              <mat-icon>visibility</mat-icon>
              <span>Ver exactamente qué acción se autoriza y qué ocurrirá al aprobar</span>
            </li>
            <li>
              <mat-icon>gavel</mat-icon>
              <span>Aprobar, rechazar o delegar según políticas por entorno, riesgo y origen</span>
            </li>
            <li>
              <mat-icon>history</mat-icon>
              <span>Registrar decisiones en historial con ticket, comentarios y SLA</span>
            </li>
          </ul>
          <div class="apr-intro__sources">
            <span>Terraform</span>
            <span>Catálogo</span>
            <span>Runbooks</span>
            <span>Jenkins</span>
            <span>Instancias</span>
          </div>
        </div>
      </section>

      <div class="apr-bar">
        <nav class="apr-tabs" role="tablist" aria-label="Vistas de aprobaciones">
          <button
            type="button"
            role="tab"
            class="apr-tabs__tab"
            [class.apr-tabs__tab--on]="view() === 'pending'"
            [attr.aria-selected]="view() === 'pending'"
            (click)="handleViewChange('pending')"
          >
            <mat-icon>pending_actions</mat-icon>
            Pendientes
            @if (pendingCount()) {
              <span class="apr-tabs__badge">{{ pendingCount() }}</span>
            }
          </button>
          <button
            type="button"
            role="tab"
            class="apr-tabs__tab"
            [class.apr-tabs__tab--on]="view() === 'history'"
            [attr.aria-selected]="view() === 'history'"
            (click)="handleViewChange('history')"
          >
            <mat-icon>history</mat-icon>
            Historial
          </button>
          <button
            type="button"
            role="tab"
            class="apr-tabs__tab"
            [class.apr-tabs__tab--on]="view() === 'policies'"
            [attr.aria-selected]="view() === 'policies'"
            (click)="handleViewChange('policies')"
          >
            <mat-icon>policy</mat-icon>
            Políticas
          </button>
        </nav>

        @if (view() !== 'policies') {
          <div class="apr-bar__tools">
            <label class="apr-search">
              <mat-icon>search</mat-icon>
              <input
                type="search"
                [formControl]="searchControl"
                placeholder="Buscar acción, recurso, solicitante…"
                aria-label="Buscar solicitudes"
              />
            </label>
            <div class="apr-filters" role="group" aria-label="Filtrar por riesgo">
              @for (risk of riskFilters; track risk.id) {
                <button
                  type="button"
                  class="apr-filter"
                  [class.apr-filter--on]="riskFilter() === risk.id"
                  (click)="riskFilter.set(risk.id)"
                >
                  {{ risk.label }}
                </button>
              }
            </div>
          </div>
        }

        <div class="apr-bar__actions">
          @if (view() === 'pending') {
            <button type="button" class="apr-btn" (click)="handleBulkReject()">
              <mat-icon>close</mat-icon>
              Rechazar selección
            </button>
            <button type="button" class="apr-btn apr-btn--primary" (click)="handleBulkApprove()">
              <mat-icon>check</mat-icon>
              Aprobar selección
            </button>
          }
          <button type="button" class="apr-btn" (click)="handleRefresh()">
            <mat-icon>sync</mat-icon>
            Actualizar
          </button>
        </div>
      </div>

      @if (view() === 'policies') {
        <div class="apr-policies">
          @for (pol of policies(); track pol.id) {
            <article class="apr-policy" [class.apr-policy--off]="!pol.enabled">
              <header class="apr-policy__head">
                <div>
                  <span class="apr-policy__status">{{ pol.enabled ? 'Activa' : 'Inactiva' }}</span>
                  <h3>{{ pol.name }}</h3>
                  <p>{{ pol.description }}</p>
                </div>
                <div class="apr-policy__meta">
                  <span><mat-icon>groups</mat-icon>{{ pol.minApprovers }} aprob.</span>
                  <span><mat-icon>shield</mat-icon>{{ riskLabel(pol.riskThreshold) }}+</span>
                </div>
              </header>
              <dl class="apr-policy__grid">
                <div><dt>Alcance</dt><dd class="mono">{{ pol.scope }}</dd></div>
                <div>
                  <dt>Entornos</dt>
                  <dd>{{ formatEnvironments(pol.environments) }}</dd>
                </div>
                <div>
                  <dt>Fuentes</dt>
                  <dd>{{ formatSources(pol.sources) }}</dd>
                </div>
                <div>
                  <dt>Pendientes</dt>
                  <dd>{{ pol.pendingCount }}</dd>
                </div>
              </dl>
              @if (pol.lastTriggered) {
                <footer class="apr-policy__foot">
                  Última activación · {{ pol.lastTriggered | date: 'dd MMM, HH:mm' }}
                </footer>
              }
            </article>
          }
        </div>
      } @else {
        <div class="apr-workspace">
          <div class="apr-list" role="list">
            @for (req of filteredRequests(); track req.id) {
              <button
                type="button"
                role="listitem"
                class="apr-item"
                [class.apr-item--on]="selectedId() === req.id"
                [class.apr-item--sla]="req.status === 'pending' && slaBreached(req)"
                [attr.data-risk]="req.risk"
                [attr.data-status]="req.status"
                (click)="selectedId.set(req.id)"
              >
                <span class="apr-item__risk" aria-hidden="true"></span>
                <span class="apr-item__logos">
                  <app-brand-logo [logo]="req.cloud" size="sm" />
                  <app-brand-logo [logo]="sourceLogo(req.source)" size="sm" />
                </span>
                <span class="apr-item__body">
                  <span class="apr-item__row">
                    <strong>{{ req.approvedSubject }}</strong>
                    <span class="apr-item__pill" [attr.data-status]="req.status">
                      {{ statusLabel(req.status) }}
                    </span>
                  </span>
                  <span class="apr-item__meta">
                    Solicitado por {{ req.requester }} · {{ sourceLabel(req.source) }} · {{ envLabel(req.environment) }}
                  </span>
                  <span class="apr-item__sub">
                    <span class="apr-item__risk-label">{{ riskLabel(req.risk) }}</span>
                    · {{ req.sourceEntityLabel }}
                    @if (req.changeTicket) {
                      · <span class="mono">{{ req.changeTicket }}</span>
                    }
                  </span>
                  <span class="apr-item__time">
                    {{ req.requestedAt | date: 'dd MMM, HH:mm' }}
                    @if (req.status === 'pending') {
                      · {{ slaLabel(req) }}
                    }
                  </span>
                  @if (req.status === 'pending') {
                    <span class="apr-item__progress">
                      <span [style.width.%]="approvalProgress(req)"></span>
                    </span>
                  }
                </span>
              </button>
            } @empty {
              <div class="apr-list__empty">
                <mat-icon>inbox</mat-icon>
                <p>No hay solicitudes que coincidan con los filtros.</p>
              </div>
            }
          </div>

          <aside class="apr-inspector" aria-label="Detalle de la solicitud">
            <app-approvals-detail-panel
              [request]="selectedRequest()"
              (approve)="handleApprove($event)"
              (reject)="handleReject($event)"
              (delegate)="handleDelegate($event)"
            />
          </aside>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .apr-page {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      color: #0f172a;
      font-size: 0.8125rem;
      line-height: 1.45;
    }

    .apr-intro {
      flex-shrink: 0;
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
      gap: 1rem 1.25rem;
      padding: 0.15rem 0.1rem 0.35rem;
    }
    .apr-intro__eyebrow {
      display: block;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
      margin-bottom: 0.2rem;
    }
    .apr-intro__title {
      margin: 0 0 0.35rem;
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
    }
    .apr-intro__desc {
      margin: 0;
      max-width: 42rem;
      font-size: 0.72rem;
      color: #64748b;
      line-height: 1.55;
    }
    .apr-intro__label {
      margin: 0 0 0.4rem;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }
    .apr-intro__uses {
      list-style: none;
      margin: 0 0 0.5rem;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .apr-intro__uses li {
      display: flex;
      align-items: flex-start;
      gap: 0.4rem;
      font-size: 0.68rem;
      color: #475569;
      line-height: 1.45;
    }
    .apr-intro__uses mat-icon {
      flex-shrink: 0;
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
      color: #b45309;
      margin-top: 0.08rem;
    }
    .apr-intro__sources {
      display: flex;
      flex-wrap: wrap;
      gap: 0.28rem;
    }
    .apr-intro__sources span {
      padding: 0.14rem 0.42rem;
      border-radius: 999px;
      background: #f8fafc;
      font-size: 0.58rem;
      font-weight: 650;
      color: #64748b;
    }

    .apr-bar {
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem;
      padding: 0.15rem 0;
    }
    .apr-tabs {
      display: flex;
      gap: 0.2rem;
      padding: 0.2rem;
      border-radius: 10px;
      background: #f8fafc;
    }
    .apr-tabs__tab {
      display: inline-flex;
      align-items: center;
      gap: 0.32rem;
      padding: 0.38rem 0.65rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
    }
    .apr-tabs__tab mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    .apr-tabs__tab--on {
      color: #0f172a;
      background: #fff;
    }
    .apr-tabs__badge {
      padding: 0.05rem 0.35rem;
      border-radius: 999px;
      background: #fef3c7;
      color: #b45309;
      font-size: 0.58rem;
      font-weight: 700;
    }
    .apr-bar__tools {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
      flex: 1;
      min-width: 0;
    }
    .apr-search {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex: 1;
      min-width: 12rem;
      max-width: 20rem;
      padding: 0.35rem 0.55rem;
      border-radius: 9px;
      background: #f8fafc;
    }
    .apr-search mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: #94a3b8;
    }
    .apr-search input {
      flex: 1;
      border: none;
      background: transparent;
      font: inherit;
      font-size: 0.72rem;
      color: #0f172a;
      outline: none;
    }
    .apr-filters { display: flex; flex-wrap: wrap; gap: 0.22rem; }
    .apr-filter {
      padding: 0.25rem 0.48rem;
      border: none;
      border-radius: 999px;
      background: #f1f5f9;
      font: inherit;
      font-size: 0.62rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
    }
    .apr-filter--on { background: #1e293b; color: #fff; }
    .apr-bar__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-left: auto;
    }
    .apr-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      width: fit-content;
      height: fit-content;
      min-height: unset;
      margin: 0;
      padding: 0.42rem 0.55rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #fff;
      font: inherit;
      font-size: 0.76rem;
      font-weight: 600;
      line-height: 1.25;
      box-sizing: border-box;
      color: #475569;
      cursor: pointer;
    }
    .apr-btn mat-icon { display: block; margin: 0; font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    .apr-btn--primary { background: #1e293b; border-color: #0f172a; color: #fff; }

    .apr-workspace {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
      gap: 0.65rem;
      overflow: hidden;
    }
    .apr-list {
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding-right: 0.15rem;
    }
    .apr-item {
      position: relative;
      display: flex;
      gap: 0.45rem;
      width: 100%;
      padding: 0.55rem 0.55rem 0.55rem 0.65rem;
      border: none;
      border-radius: 11px;
      background: #f8fafc;
      text-align: left;
      font: inherit;
      cursor: pointer;
      transition: background 0.15s;
    }
    .apr-item:hover { background: #f1f5f9; }
    .apr-item--on { background: #e2e8f0; }
    .apr-item--sla { background: #fef2f2; }
    .apr-item__risk {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      border-radius: 11px 0 0 11px;
      background: var(--apr-risk-color, #64748b);
    }
    .apr-item[data-risk='critical'] { --apr-risk-color: #dc2626; }
    .apr-item[data-risk='high'] { --apr-risk-color: #ea580c; }
    .apr-item[data-risk='medium'] { --apr-risk-color: #d97706; }
    .apr-item[data-risk='low'] { --apr-risk-color: #059669; }
    .apr-item__logos {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      padding-top: 0.1rem;
    }
    .apr-item__body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
    }
    .apr-item__row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.35rem;
    }
    .apr-item__row strong {
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1.35;
      color: #0f172a;
    }
    .apr-item__pill {
      flex-shrink: 0;
      padding: 0.1rem 0.35rem;
      border-radius: 999px;
      font-size: 0.52rem;
      font-weight: 700;
      text-transform: uppercase;
      background: #fef3c7;
      color: #b45309;
    }
    .apr-item__pill[data-status='approved'] { background: #ecfdf5; color: #059669; }
    .apr-item__pill[data-status='rejected'] { background: #fef2f2; color: #dc2626; }
    .apr-item__pill[data-status='expired'] { background: #f1f5f9; color: #64748b; }
    .apr-item__meta,
    .apr-item__sub,
    .apr-item__time {
      font-size: 0.62rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .apr-item__risk-label {
      font-weight: 700;
      color: var(--apr-risk-color, #64748b);
    }
    .apr-item__progress {
      display: block;
      height: 2px;
      margin-top: 0.15rem;
      border-radius: 999px;
      background: #f1f5f9;
      overflow: hidden;
    }
    .apr-item__progress span {
      display: block;
      height: 100%;
      background: #1e293b;
      border-radius: inherit;
    }
    .apr-list__empty {
      padding: 2rem 1rem;
      text-align: center;
      color: #94a3b8;
    }
    .apr-list__empty mat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      margin-bottom: 0.35rem;
    }

    .apr-inspector {
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .apr-policies {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.65rem;
      align-content: start;
      padding-bottom: 0.5rem;
    }
    .apr-policy {
      padding: 0.75rem 0.85rem;
      border-radius: 12px;
      background: #f8fafc;
    }
    .apr-policy--off { opacity: 0.65; }
    .apr-policy__head {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.55rem;
    }
    .apr-policy__status {
      font-size: 0.55rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #059669;
    }
    .apr-policy--off .apr-policy__status { color: #94a3b8; }
    .apr-policy__head h3 {
      margin: 0.12rem 0 0.25rem;
      font-size: 0.82rem;
      font-weight: 700;
    }
    .apr-policy__head p {
      margin: 0;
      font-size: 0.68rem;
      color: #64748b;
      line-height: 1.45;
    }
    .apr-policy__meta {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.62rem;
      color: #64748b;
    }
    .apr-policy__meta span {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
    }
    .apr-policy__meta mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .apr-policy__grid {
      display: grid;
      gap: 0.35rem;
      margin: 0;
    }
    .apr-policy__grid dt {
      font-size: 0.52rem;
      font-weight: 650;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .apr-policy__grid dd {
      margin: 0.05rem 0 0;
      font-size: 0.65rem;
      color: #334155;
    }
    .apr-policy__foot {
      margin-top: 0.5rem;
      padding-top: 0.45rem;
      font-size: 0.6rem;
      color: #94a3b8;
    }
    .mono { font-family: var(--app-font-mono, ui-monospace, monospace); }

    @media (max-width: 1100px) {
      .apr-intro { grid-template-columns: 1fr; }
      .apr-workspace { grid-template-columns: 1fr; }
      .apr-inspector { min-height: 24rem; }
    }
  `,
})
export class ApprovalsPageComponent {
  private readonly toast = inject(ToastService)
  private readonly approvals = inject(ApprovalsService)

  readonly view = signal<ApprovalsView>('pending')
  readonly requests = this.approvals.requests
  readonly policies = signal<ApprovalPolicy[]>(structuredClone(defaultApprovalPolicies))
  readonly selectedId = signal<string | null>(
    this.approvals.requests().find((r) => r.status === 'pending')?.id ?? null,
  )
  readonly riskFilter = signal<'all' | ApprovalRisk>('all')

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200)),
    { initialValue: '' },
  )

  readonly riskFilters = [
    { id: 'all' as const, label: 'Todos' },
    { id: 'critical' as const, label: 'Crítico' },
    { id: 'high' as const, label: 'Alto' },
    { id: 'medium' as const, label: 'Medio' },
    { id: 'low' as const, label: 'Bajo' },
  ]

  readonly pendingCount = computed(() => this.requests().filter((r) => r.status === 'pending').length)

  readonly filteredRequests = computed(() => {
    const q = this.searchTerm().trim().toLowerCase()
    const risk = this.riskFilter()
    const statuses: ApprovalStatus[] = this.view() === 'pending'
      ? ['pending']
      : ['approved', 'rejected', 'expired', 'delegated']

    return this.requests()
      .filter((r) => statuses.includes(r.status))
      .filter((r) => risk === 'all' || r.risk === risk)
      .filter((r) => {
        if (!q) return true
        const haystack = [
          r.action,
          r.resource,
          r.requester,
          r.id,
          r.changeTicket ?? '',
          ...r.tags,
        ].join(' ').toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
  })

  readonly selectedRequest = computed(() => {
    const id = this.selectedId()
    if (!id) return null
    return this.requests().find((r) => r.id === id) ?? null
  })

  sourceLabel = (s: ApprovalRequest['source']): string => APPROVAL_SOURCE_LABELS[s]
  sourceLogo = (s: ApprovalRequest['source']) => APPROVAL_SOURCE_LOGO[s]
  envLabel = (e: ApprovalRequest['environment']): string => APPROVAL_ENV_LABELS[e]
  riskLabel = (r: ApprovalRisk): string => APPROVAL_RISK_LABELS[r]
  statusLabel = (s: ApprovalStatus): string => APPROVAL_STATUS_LABELS[s]

  formatEnvironments = (envs: ApprovalRequest['environment'][]): string =>
    envs.map((e) => this.envLabel(e)).join(', ')

  formatSources = (sources: ApprovalPolicy['sources']): string =>
    sources.map((s) => this.sourceLabel(s)).join(', ')

  handleViewChange = (next: ApprovalsView): void => {
    this.view.set(next)
    const first = this.filteredRequests()[0]
    this.selectedId.set(first?.id ?? null)
  }

  slaBreached = (req: ApprovalRequest): boolean => new Date(req.slaDeadline).getTime() < Date.now()

  slaLabel = (req: ApprovalRequest): string => {
    const diffMs = new Date(req.slaDeadline).getTime() - Date.now()
    if (diffMs <= 0) return `SLA vencido`
    const mins = Math.round(diffMs / 60_000)
    if (mins >= 60) return `SLA ${Math.floor(mins / 60)}h ${mins % 60}m`
    return `SLA ${mins}m`
  }

  approvalProgress = (req: ApprovalRequest): number => {
    if (!req.approversRequired) return 100
    return Math.round((req.approversCompleted / req.approversRequired) * 100)
  }

  handleApprove = (req: ApprovalRequest): void => {
    const updated = this.approvals.approve(req.id)
    if (!updated) return

    const exec = updated.pendingExecution
    if (exec?.kind === 'service-catalog-launch') {
      const tpl = defaultServiceCatalogTemplates().find((t) => t.id === exec.templateId)
      if (tpl) {
        const launch = this.approvals.resolveLaunchFromApproval(updated, tpl)
        this.approvals.queueLaunchAfterApproval(launch)
        this.toast.success(`Aprobado — se ejecutará: ${updated.approvedSubject}`)
      }
    } else if (exec?.kind === 'runbook-execute') {
      this.toast.success(`Aprobado — runbook encolado: ${updated.approvedSubject}`)
    } else {
      this.toast.success(`Aprobado — ${updated.approvedSubject}`)
    }
    this.selectNextPending(req.id)
  }

  handleReject = (req: ApprovalRequest): void => {
    if (!this.approvals.reject(req.id)) return
    this.toast.warning(`Rechazado — no se ejecutará: ${req.approvedSubject}`)
    this.selectNextPending(req.id)
  }

  handleDelegate = (req: ApprovalRequest): void => {
    this.toast.info(`Delegación de ${req.id} enviada a security@cloudops.io (demo)`)
  }

  handleBulkApprove = (): void => {
    const pending = this.filteredRequests().filter((r) => r.status === 'pending')
    if (!pending.length) {
      this.toast.info('No hay solicitudes pendientes visibles')
      return
    }
    pending.forEach((r) => this.handleApprove(r))
  }

  handleBulkReject = (): void => {
    const selected = this.selectedRequest()
    if (!selected || selected.status !== 'pending') {
      this.toast.info('Selecciona una solicitud pendiente para rechazar')
      return
    }
    this.handleReject(selected)
  }

  handleRefresh = (): void => {
    this.approvals.resetDemo()
    this.toast.info('Cola de aprobaciones actualizada')
  }

  private selectNextPending = (currentId: string): void => {
    const next = this.requests().find((r) => r.status === 'pending' && r.id !== currentId)
    this.selectedId.set(next?.id ?? null)
  }
}
