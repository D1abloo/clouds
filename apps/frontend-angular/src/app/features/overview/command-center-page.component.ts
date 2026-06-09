import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { delay, of } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { startWith, debounceTime } from 'rxjs/operators'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatDialog } from '@angular/material/dialog'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component'
import { DetailDialogComponent } from '../../shared/components/detail-dialog/detail-dialog.component'
import { ProModeService } from '../../core/services/pro-mode.service'
import { ToastService } from '../../core/services/toast.service'
import {
  CommandCenterApiService,
  dialogResultToPayload,
  quickActionToPayload,
} from './command-center-api.service'
import type { ExecuteActionPayload } from './command-center.types'
import { providerToLogo } from './utils/provider-logo.util'
import {
  CommandCenterActionDialogComponent,
  type CommandCenterActionDialogResult,
} from './command-center-action-dialog.component'
import {
  COMMAND_CENTER_ACTIONS,
  COMMAND_CENTER_PENDING,
  COMMAND_CENTER_QUEUE,
  COMMAND_CENTER_PLATFORMS,
  COMMAND_CENTER_QUICK_ACTIONS,
  type CommandCenterQueueItem,
  type CommandCenterQuickAction,
  type OverviewActionRow,
} from './overview-pages.data'

const nowTime = (): string =>
  new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

const newId = (): string => `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const reindexQueue = (items: CommandCenterQueueItem[]): CommandCenterQueueItem[] =>
  items.map((item, index) => ({ ...item, position: index + 1 }))

const matchesProvider = (row: { provider: string }, filter: string | null): boolean =>
  !filter || row.provider.toLowerCase() === filter.toLowerCase()

const matchesSearch = (row: OverviewActionRow, query: string): boolean => {
  if (!query.trim()) return true
  const q = query.toLowerCase()
  return [row.action, row.resource, row.provider, row.region, row.detail, row.actor]
    .join(' ')
    .toLowerCase()
    .includes(q)
}

const queueItemToPayload = (item: CommandCenterQueueItem): ExecuteActionPayload | null => {
  if (!item.actionType) return null
  return {
    type: item.actionType,
    resource: item.resource,
    region: item.region,
    namespace: item.namespace,
    replicas: item.replicas,
    provider: item.provider,
    jobName: item.jobName ?? item.resource,
  }
}

const pendingRowToPayload = (row: OverviewActionRow): ExecuteActionPayload | null =>
  dialogResultToPayload({
    action: row.action,
    provider: row.provider,
    logo: row.logo ?? null,
    resource: row.resource,
    region: row.region,
    mode: 'now',
    priority: 'normal',
  })

@Component({
  selector: 'app-command-center-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    LoadingStateComponent,
    StatusBadgeComponent,
    BrandLogoComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="cmd-page animate-fade-in">
      <app-page-header
        icon="terminal"
        title="Centro de mando"
        description="Orquestación multi-cloud: ejecuta, aprueba y monitoriza acciones en AWS, GCP, Azure, Kubernetes, Jenkins, Terraform y Docker desde un único panel operativo."
        [demoMode]="false"
        [lastSync]="lastSyncLabel()"
        [actions]="headerActions()"
        (actionClick)="handleHeader($event)"
      />

      @if (loading()) {
        <app-loading-state message="Cargando centro de mando…" />
      } @else {
        <section class="cmd-hero" aria-label="Resumen operativo">
          <header class="cmd-hero__bar">
            <div class="cmd-hero__bar-start">
              <div class="cmd-hero__status" [class.cmd-hero__status--live]="refreshing()">
                @if (refreshing()) {
                  <mat-spinner diameter="14" />
                  <span>Sincronizando operaciones…</span>
                } @else {
                  <span class="cmd-hero__dot" aria-hidden="true"></span>
                  <span>{{ connectedPlatforms() }} plataformas · {{ queue().length }} en cola</span>
                }
              </div>
              @if (platformFilter()) {
                <button type="button" class="cmd-hero__filter-chip" (click)="clearPlatformFilter()">
                  <mat-icon>filter_alt</mat-icon>
                  {{ platformFilter() }}
                  <mat-icon>close</mat-icon>
                </button>
              }
            </div>
            <div class="cmd-hero__bar-end">
              <mat-form-field appearance="fill" class="cmd-hero__search" subscriptSizing="dynamic">
                <mat-icon matPrefix>search</mat-icon>
                <input matInput placeholder="Buscar acción, recurso o actor…" [formControl]="searchControl" />
              </mat-form-field>
              <button
                type="button"
                class="cmd-hero__icon-btn"
                matTooltip="Procesar siguiente en cola"
                aria-label="Procesar cola"
                [disabled]="!queue().length || processingQueue()"
                (click)="handleProcessNext()"
              >
                <mat-icon>skip_next</mat-icon>
              </button>
              <button
                type="button"
                class="cmd-hero__icon-btn"
                matTooltip="Actualizar panel"
                aria-label="Actualizar"
                [disabled]="refreshing()"
                (click)="handleRefresh()"
              >
                <mat-icon>refresh</mat-icon>
              </button>
            </div>
          </header>
        </section>

        <div class="cmd-platforms" role="list" aria-label="Estado por plataforma">
          @for (p of platforms; track p.logo) {
            <button
              type="button"
              class="cmd-platform"
              [class.cmd-platform--active]="platformFilter() === p.provider"
              role="listitem"
              [attr.aria-pressed]="platformFilter() === p.provider"
              (click)="togglePlatformFilter(p.provider)"
            >
              <app-brand-logo [logo]="p.logo" size="sm" />
              <div class="cmd-platform__body">
                <strong>{{ p.label }}</strong>
                <span>{{ p.tasks }} activas · {{ p.successRate }}% éxito</span>
                <small>{{ p.lastAction }}</small>
              </div>
              <span class="cmd-platform__badge">{{ p.tasks }}</span>
            </button>
          }
        </div>

        <section class="cmd-quick-section" aria-labelledby="cmd-quick-title">
          <header class="cmd-quick-section__head">
            <div>
              <h2 id="cmd-quick-title">Acciones rápidas</h2>
              <p>Selecciona una acción para ver qué hará, sobre qué recurso actúa y a qué módulo te llevará al completarse.</p>
            </div>
          </header>

          <div class="cmd-quick-grid" role="list">
            @for (qa of quickActions; track qa.id) {
              <button
                type="button"
                class="cmd-quick-card"
                [class.cmd-quick-card--active]="selectedQuickId() === qa.id"
                role="listitem"
                [attr.aria-pressed]="selectedQuickId() === qa.id"
                (click)="handleSelectQuickAction(qa.id)"
              >
                <span class="cmd-quick-card__top">
                  @if (qa.logo) {
                    <app-brand-logo [logo]="qa.logo" size="sm" />
                  } @else {
                    <mat-icon>{{ qa.icon }}</mat-icon>
                  }
                  <span class="cmd-quick-card__eta">~{{ qa.eta }}</span>
                </span>
                <strong class="cmd-quick-card__label">{{ qa.label }}</strong>
                <span class="cmd-quick-card__detail">{{ qa.detail }}</span>
                <span class="cmd-quick-card__dest">
                  <mat-icon>arrow_forward</mat-icon>
                  {{ qa.destinationLabel }}
                </span>
              </button>
            }
          </div>

          @if (selectedQuick(); as qa) {
            <article class="cmd-quick-preview" aria-live="polite">
              <header class="cmd-quick-preview__head">
                <div class="cmd-quick-preview__title">
                  @if (qa.logo) {
                    <app-brand-logo [logo]="qa.logo" size="sm" />
                  }
                  <div>
                    <strong>{{ qa.label }}</strong>
                    <span>{{ qa.resource }} · {{ qa.region }} · {{ qa.provider }}</span>
                  </div>
                </div>
                <span class="cmd-quick-preview__eta">ETA ~{{ qa.eta }}</span>
              </header>

              <div class="cmd-quick-preview__grid">
                <div class="cmd-quick-preview__block">
                  <h4><mat-icon>info</mat-icon> Qué hará</h4>
                  <p>{{ qa.effect }}</p>
                  <ul>
                    @for (step of qa.steps; track step) {
                      <li>{{ step }}</li>
                    }
                  </ul>
                </div>
                <div class="cmd-quick-preview__block cmd-quick-preview__block--dest">
                  <h4><mat-icon>open_in_new</mat-icon> Dónde llegarás</h4>
                  <p class="cmd-quick-preview__route">{{ qa.destinationLabel }}</p>
                  <code class="cmd-quick-preview__path">{{ qa.destinationRoute }}</code>
                  <p class="cmd-quick-preview__hint">{{ qa.destinationHint }}</p>
                </div>
              </div>

              <footer class="cmd-quick-preview__actions">
                <button type="button" class="cmd-preview-btn cmd-preview-btn--primary" (click)="handleQuickEnqueue(qa.id)">
                  <mat-icon>queue</mat-icon>
                  Encolar acción
                </button>
                <button type="button" class="cmd-preview-btn" (click)="handleQuickNavigate(qa.id)">
                  <mat-icon>launch</mat-icon>
                  Ir al módulo destino
                </button>
                <button type="button" class="cmd-preview-btn cmd-preview-btn--accent" (click)="handleQuickEnqueueAndGo(qa.id)">
                  <mat-icon>play_circle</mat-icon>
                  Encolar e ir al destino
                </button>
              </footer>
            </article>
          }
        </section>

        <div class="cmd-grid">
          <section class="cmd-panel">
            <header class="cmd-panel__head">
              <div>
                <h3>Acciones recientes</h3>
                <p>Historial de las últimas 24 h con actor, región y resultado</p>
              </div>
              <span class="cmd-panel__count">{{ filteredRecent().length }}</span>
            </header>
            <ul class="cmd-list">
              @for (row of filteredRecent(); track row.id) {
                <li class="cmd-row">
                  <button type="button" class="cmd-row__logo" (click)="handleViewDetail(row)" [attr.aria-label]="'Ver detalle de ' + row.action">
                    @if (row.logo) {
                      <app-brand-logo [logo]="row.logo" size="sm" />
                    } @else {
                      <mat-icon>dns</mat-icon>
                    }
                  </button>
                  <div class="cmd-row__body">
                    <strong>{{ row.action }}</strong>
                    <span>{{ row.resource }} · {{ row.region }}</span>
                    <small>{{ row.detail }} · {{ row.actor }}</small>
                  </div>
                  <div class="cmd-row__meta">
                    <app-status-badge [value]="row.status" />
                    <time>{{ row.when }}</time>
                    @if (row.status === 'running') {
                      <button type="button" class="cmd-row__link" (click)="handleCancelRunning(row.id)">Cancelar</button>
                    }
                  </div>
                </li>
              } @empty {
                <li class="cmd-empty">No hay acciones recientes para este filtro.</li>
              }
            </ul>
          </section>

          <section class="cmd-panel">
            <header class="cmd-panel__head">
              <div>
                <h3>Pendientes de aprobación</h3>
                <p>Acciones destructivas o de alta prioridad que requieren confirmación</p>
              </div>
              <span class="cmd-panel__count cmd-panel__count--warn">{{ filteredPending().length }}</span>
            </header>
            <ul class="cmd-list">
              @for (row of filteredPending(); track row.id) {
                <li class="cmd-row cmd-row--pending">
                  <span class="cmd-row__logo">
                    @if (row.logo) {
                      <app-brand-logo [logo]="row.logo" size="sm" />
                    } @else {
                      <mat-icon>pending</mat-icon>
                    }
                  </span>
                  <div class="cmd-row__body">
                    <strong>{{ row.action }}</strong>
                    <span>{{ row.resource }} · {{ row.region }}</span>
                    <small>{{ row.detail }} · solicitado por {{ row.actor }}</small>
                  </div>
                  <div class="cmd-row__actions">
                    <button type="button" class="cmd-btn cmd-btn--ok" (click)="handleApprove(row.id)">
                      <mat-icon>check</mat-icon>
                      Aprobar
                    </button>
                    <button type="button" class="cmd-btn cmd-btn--ghost" (click)="handleReject(row.id)">
                      <mat-icon>close</mat-icon>
                    </button>
                    <button type="button" class="cmd-btn cmd-btn--ghost" matTooltip="Ver detalle" (click)="handleViewDetail(row)">
                      <mat-icon>info</mat-icon>
                    </button>
                  </div>
                </li>
              } @empty {
                <li class="cmd-empty">Sin pendientes — todas las acciones están autorizadas.</li>
              }
            </ul>
          </section>

          <section class="cmd-panel">
            <header class="cmd-panel__head">
              <div>
                <h3>Cola de ejecución</h3>
                <p>Orden FIFO · ETA estimado · prioridad alta al frente</p>
              </div>
              <span class="cmd-panel__count">{{ queue().length }}</span>
            </header>
            <ol class="cmd-queue">
              @for (item of queue(); track item.id) {
                <li class="cmd-queue__row" [class.cmd-queue__row--processing]="processingId() === item.id">
                  <span class="cmd-queue__pos">{{ item.position }}</span>
                  @if (item.logo) {
                    <app-brand-logo [logo]="item.logo" size="sm" />
                  } @else {
                    <mat-icon>cloud</mat-icon>
                  }
                  <div class="cmd-queue__body">
                    <strong>{{ item.action }}</strong>
                    <span>{{ item.resource ?? item.provider }} · ETA {{ item.eta }}</span>
                    @if (item.priority === 'high') {
                      <small class="cmd-queue__prio">Prioridad alta</small>
                    }
                  </div>
                  @if (processingId() === item.id) {
                    <mat-spinner diameter="18" />
                  } @else {
                    <app-status-badge [value]="item.status" />
                  }
                  <div class="cmd-row__actions">
                    @if (item.position > 1) {
                      <button type="button" class="cmd-btn cmd-btn--ghost" matTooltip="Subir prioridad" (click)="handlePromote(item.id)">
                        <mat-icon>arrow_upward</mat-icon>
                      </button>
                    }
                    <button type="button" class="cmd-btn cmd-btn--ghost" matTooltip="Quitar de cola" (click)="handleRemoveFromQueue(item.id)">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                </li>
              } @empty {
                <li class="cmd-empty">Cola vacía. Usa «Ejecutar acción» o las acciones rápidas.</li>
              }
            </ol>
          </section>
        </div>

        <section class="cmd-audit" aria-label="Actividad del operador">
          <header class="cmd-audit__head">
            <mat-icon>history_edu</mat-icon>
            <div>
              <strong>Registro de operador</strong>
              <span>Últimas decisiones en esta sesión</span>
            </div>
          </header>
          <ul class="cmd-audit__list">
            @for (entry of auditLog(); track entry.id) {
              <li>
                <time>{{ entry.when }}</time>
                <span>{{ entry.message }}</span>
              </li>
            } @empty {
              <li class="cmd-empty">Aún no hay actividad en esta sesión.</li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  styles: `
    .cmd-page { display: flex; flex-direction: column; gap: 0.65rem; }
    .cmd-hero {
      border-radius: var(--app-radius-md);
      background: var(--app-card);
      overflow: hidden;
    }
    .cmd-hero__bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.45rem 0.65rem;
      padding: 0.45rem 0.75rem;
      background: color-mix(in srgb, var(--app-surface) 22%, var(--app-card));
    }
    .cmd-hero__bar-start, .cmd-hero__bar-end {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
    }
    .cmd-hero__bar-end { margin-left: auto; }
    .cmd-hero__status {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.62rem;
      font-weight: 650;
      color: var(--app-text-muted);
    }
    .cmd-hero__status--live { color: var(--app-accent); }
    .cmd-hero__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--app-success);
    }
    .cmd-hero__filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.2rem 0.45rem;
      border-radius: 999px;
      border: none;
      background: color-mix(in srgb, var(--app-accent) 10%, var(--app-card));
      color: var(--app-accent);
      font-size: 0.62rem;
      font-weight: 750;
      cursor: pointer;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    }
    .cmd-hero__search {
      width: min(240px, 42vw);
      margin: 0;
      ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
      ::ng-deep .mat-mdc-text-field-wrapper { height: 32px; }
      ::ng-deep .mat-mdc-form-field-infix { padding-top: 6px !important; min-height: 32px; }
      mat-icon { font-size: 0.95rem; margin-right: 0.25rem; color: var(--app-text-muted); }
    }
    .cmd-hero__icon-btn {
      width: 30px;
      height: 30px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: none;
      background: color-mix(in srgb, var(--app-text) 5%, var(--app-card));
      color: var(--app-text-muted);
      cursor: pointer;
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
      &:hover:not(:disabled) { color: var(--app-accent); background: color-mix(in srgb, var(--app-accent) 8%, var(--app-card)); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .cmd-platforms {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .cmd-platform {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.4rem 0.55rem;
      border-radius: 10px;
      border: none;
      background: color-mix(in srgb, var(--app-surface) 35%, var(--app-card));
      cursor: pointer;
      text-align: left;
      transition: background 0.15s ease, transform 0.15s ease;
      &:hover { background: color-mix(in srgb, var(--app-accent) 6%, var(--app-card)); }
    }
    .cmd-platform--active {
      background: color-mix(in srgb, var(--app-accent) 10%, var(--app-card));
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--app-accent) 22%, transparent);
    }
    .cmd-platform__body {
      min-width: 0;
      strong { display: block; font-size: 0.68rem; font-weight: 800; }
      span { display: block; font-size: 0.58rem; color: var(--app-text-muted); font-weight: 600; }
      small { display: block; font-size: 0.54rem; color: var(--app-text-muted); margin-top: 0.05rem; }
    }
    .cmd-platform__badge {
      margin-left: auto;
      font-size: 0.62rem;
      font-weight: 800;
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 10%, transparent);
      color: var(--app-accent);
    }
    .cmd-quick {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .cmd-quick-section__head {
      margin-bottom: 0.5rem;
      h2 { margin: 0; font-size: 0.88rem; font-weight: 850; }
      p { margin: 0.2rem 0 0; font-size: 0.62rem; color: var(--app-text-muted); max-width: 62ch; line-height: 1.4; }
    }
    .cmd-quick-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.45rem;
    }
    .cmd-quick-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.2rem;
      padding: 0.55rem 0.65rem;
      border-radius: 11px;
      border: none;
      background: color-mix(in srgb, var(--app-surface) 30%, var(--app-card));
      cursor: pointer;
      text-align: left;
      transition: background 0.15s ease, box-shadow 0.15s ease;
      &:hover { background: color-mix(in srgb, var(--app-accent) 5%, var(--app-card)); }
    }
    .cmd-quick-card--active {
      background: color-mix(in srgb, var(--app-accent) 9%, var(--app-card));
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--app-accent) 24%, transparent);
    }
    .cmd-quick-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: var(--app-text-muted); }
    }
    .cmd-quick-card__eta {
      font-size: 0.55rem;
      font-weight: 750;
      color: var(--app-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .cmd-quick-card__label {
      font-size: 0.74rem;
      font-weight: 800;
    }
    .cmd-quick-card__detail {
      font-size: 0.6rem;
      color: var(--app-text-muted);
      font-weight: 600;
      line-height: 1.35;
    }
    .cmd-quick-card__dest {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      margin-top: 0.15rem;
      font-size: 0.56rem;
      font-weight: 700;
      color: var(--app-accent);
      mat-icon { font-size: 0.75rem; width: 0.75rem; height: 0.75rem; }
    }
    .cmd-quick-preview {
      margin-top: 0.55rem;
      padding: 0.65rem 0.75rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--app-surface) 22%, var(--app-card));
    }
    .cmd-quick-preview__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.55rem;
    }
    .cmd-quick-preview__title {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      strong { display: block; font-size: 0.82rem; font-weight: 850; }
      span { display: block; font-size: 0.6rem; color: var(--app-text-muted); font-weight: 600; margin-top: 0.1rem; }
    }
    .cmd-quick-preview__eta {
      font-size: 0.62rem;
      font-weight: 750;
      color: var(--app-text-muted);
      white-space: nowrap;
    }
    .cmd-quick-preview__grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 0.65rem;
    }
    .cmd-quick-preview__block {
      h4 {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        margin: 0 0 0.35rem;
        font-size: 0.68rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--app-text-muted);
        mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
      }
      p { margin: 0; font-size: 0.68rem; line-height: 1.45; color: var(--app-text); }
      ul {
        margin: 0.35rem 0 0;
        padding-left: 1rem;
        li { font-size: 0.62rem; color: var(--app-text-muted); margin-bottom: 0.15rem; line-height: 1.35; }
      }
    }
    .cmd-quick-preview__block--dest {
      padding: 0.45rem 0.55rem;
      border-radius: 9px;
      background: color-mix(in srgb, var(--app-accent) 5%, var(--app-card));
    }
    .cmd-quick-preview__route {
      font-weight: 750 !important;
      color: var(--app-accent) !important;
    }
    .cmd-quick-preview__path {
      display: inline-block;
      margin-top: 0.25rem;
      padding: 0.15rem 0.4rem;
      border-radius: 6px;
      font-size: 0.58rem;
      background: color-mix(in srgb, var(--app-text) 5%, transparent);
      color: var(--app-text-muted);
    }
    .cmd-quick-preview__hint {
      margin-top: 0.35rem !important;
      font-size: 0.62rem !important;
      color: var(--app-text-muted) !important;
    }
    .cmd-quick-preview__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.6rem;
      padding-top: 0.55rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .cmd-preview-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.32rem 0.6rem;
      border-radius: 8px;
      border: none;
      background: color-mix(in srgb, var(--app-text) 5%, var(--app-card));
      color: var(--app-text);
      font-size: 0.64rem;
      font-weight: 750;
      cursor: pointer;
      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
      &:hover { background: color-mix(in srgb, var(--app-text) 8%, var(--app-card)); }
    }
    .cmd-preview-btn--primary {
      background: color-mix(in srgb, var(--app-accent) 12%, var(--app-card));
      color: var(--app-accent);
    }
    .cmd-preview-btn--accent {
      background: linear-gradient(135deg, var(--app-accent), var(--app-accent-dark));
      color: white;
    }
    .cmd-quick__chip {
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      padding: 0.32rem 0.6rem;
      border-radius: 999px;
      border: none;
      background: color-mix(in srgb, var(--app-accent) 7%, var(--app-card));
      color: var(--app-accent);
      font-size: 0.66rem;
      font-weight: 750;
      cursor: pointer;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
      &:hover { background: color-mix(in srgb, var(--app-accent) 14%, var(--app-card)); }
    }
    .cmd-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
    }
    .cmd-panel {
      min-width: 0;
      padding: 0.65rem 0.75rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--app-surface) 18%, var(--app-card));
    }
    .cmd-panel__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.55rem;
      h3 { margin: 0; font-size: 0.82rem; font-weight: 850; }
      p { margin: 0.15rem 0 0; font-size: 0.6rem; color: var(--app-text-muted); line-height: 1.35; max-width: 28ch; }
    }
    .cmd-panel__count {
      flex-shrink: 0;
      font-size: 0.62rem;
      font-weight: 800;
      padding: 0.12rem 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 10%, transparent);
      color: var(--app-accent);
    }
    .cmd-panel__count--warn {
      background: color-mix(in srgb, #f59e0b 12%, transparent);
      color: #b45309;
    }
    .cmd-list, .cmd-queue { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .cmd-row, .cmd-queue__row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.45rem;
      align-items: start;
      padding: 0.4rem 0.35rem;
      border-radius: 9px;
      background: color-mix(in srgb, var(--app-card) 70%, transparent);
    }
    .cmd-row--pending { align-items: center; }
    .cmd-queue__row {
      grid-template-columns: auto auto 1fr auto auto;
      align-items: center;
    }
    .cmd-queue__row--processing { background: color-mix(in srgb, var(--app-accent) 6%, var(--app-card)); }
    .cmd-row__logo {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: none;
      background: color-mix(in srgb, var(--app-surface) 50%, var(--app-card));
      cursor: pointer;
      padding: 0;
    }
    .cmd-row__body, .cmd-queue__body {
      min-width: 0;
      strong { display: block; font-size: 0.72rem; font-weight: 750; }
      span { display: block; font-size: 0.62rem; color: var(--app-text-muted); font-weight: 600; }
      small { display: block; font-size: 0.58rem; color: var(--app-text-muted); margin-top: 0.08rem; }
    }
    .cmd-row__meta {
      text-align: right;
      time { display: block; font-size: 0.58rem; color: var(--app-text-muted); margin-top: 0.15rem; }
    }
    .cmd-row__link {
      display: inline-block;
      margin-top: 0.2rem;
      padding: 0;
      border: none;
      background: none;
      color: var(--app-accent);
      font-size: 0.58rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
    }
    .cmd-row__actions {
      display: flex;
      align-items: center;
      gap: 0.2rem;
    }
    .cmd-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      padding: 0.22rem 0.45rem;
      border-radius: 7px;
      border: none;
      font-size: 0.6rem;
      font-weight: 750;
      cursor: pointer;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    }
    .cmd-btn--ok {
      background: color-mix(in srgb, #10b981 14%, var(--app-card));
      color: #059669;
    }
    .cmd-btn--ghost {
      padding: 0.22rem;
      background: color-mix(in srgb, var(--app-text) 5%, transparent);
      color: var(--app-text-muted);
      &:hover { color: var(--app-text); }
    }
    .cmd-queue__pos {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.62rem;
      font-weight: 800;
      background: color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .cmd-queue__prio { color: #d97706 !important; font-weight: 700 !important; }
    .cmd-empty {
      padding: 0.75rem 0.5rem;
      font-size: 0.68rem;
      color: var(--app-text-muted);
      text-align: center;
    }
    .cmd-audit {
      padding: 0.55rem 0.75rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--app-surface) 25%, var(--app-card));
    }
    .cmd-audit__head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.45rem;
      mat-icon { color: var(--app-accent); font-size: 1.1rem; }
      strong { display: block; font-size: 0.75rem; }
      span { font-size: 0.6rem; color: var(--app-text-muted); }
    }
    .cmd-audit__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      li {
        display: flex;
        gap: 0.5rem;
        font-size: 0.62rem;
        color: var(--app-text-muted);
        time { font-weight: 700; color: var(--app-text); min-width: 2.8rem; }
      }
    }
    @media (max-width: 1200px) {
      .cmd-grid { grid-template-columns: 1fr; }
      .cmd-quick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .cmd-quick-preview__grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .cmd-quick-grid { grid-template-columns: 1fr; }
    }
  `,
})
export class CommandCenterPageComponent implements OnInit {
    private readonly pro = inject(ProModeService)
  private readonly commandCenterApi = inject(CommandCenterApiService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)
  private readonly router = inject(Router)

  readonly loading = signal(true)
  readonly refreshing = signal(false)
  readonly processingQueue = signal(false)
  readonly processingId = signal<string | null>(null)
  readonly lastSync = signal(nowTime())
  readonly platformFilter = signal<string | null>(null)
  readonly selectedQuickId = signal<string | null>(COMMAND_CENTER_QUICK_ACTIONS[0]?.id ?? null)

  readonly recent = signal<OverviewActionRow[]>([])
  readonly pending = signal<OverviewActionRow[]>([])
  readonly queue = signal<CommandCenterQueueItem[]>([])
  readonly auditLog = signal<{ id: string; when: string; message: string }[]>([])
  private readonly pendingPayloads = signal<Record<string, ExecuteActionPayload>>({})

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly searchQuery = toSignal(
    this.searchControl.valueChanges.pipe(startWith(''), debounceTime(180)),
    { initialValue: '' },
  )

  readonly platforms = COMMAND_CENTER_PLATFORMS
  readonly quickActions = COMMAND_CENTER_QUICK_ACTIONS

  readonly selectedQuick = computed((): CommandCenterQuickAction | null => {
    const id = this.selectedQuickId()
    if (!id) return null
    return this.quickActions.find((a) => a.id === id) ?? null
  })

  readonly connectedPlatforms = computed(() => new Set(this.recent().map((r) => r.provider)).size)

  readonly filteredRecent = computed(() => {
    const q = this.searchQuery()
    const pf = this.platformFilter()
    return this.recent().filter((r) => matchesProvider(r, pf) && matchesSearch(r, q))
  })

  readonly filteredPending = computed(() => {
    const q = this.searchQuery()
    const pf = this.platformFilter()
    return this.pending().filter((r) => matchesProvider(r, pf) && matchesSearch(r, q))
  })

  readonly lastSyncLabel = computed(() => `Actualizado ${this.lastSync()}`)

  readonly headerActions = computed(() => [
    { label: 'Ejecutar acción', icon: 'play_arrow', primary: true, disabled: this.refreshing() },
    { label: 'Vaciar cola', icon: 'clear_all', disabled: !this.queue().length || this.refreshing() },
    { label: 'Actualizar', icon: 'refresh', disabled: this.refreshing() },
  ])

  ngOnInit(): void {
    of(true).pipe(delay(350)).subscribe(() => {
      this.loading.set(false)
      this.loadRecentFromApi()
    })
  }

  private loadRecentFromApi = (): void => {
    this.commandCenterApi.recent(30).subscribe((rows) => {
      if (!rows.length) return
      const mapped: OverviewActionRow[] = rows.map((row) => ({
        id: row.id,
        action: row.action,
        resource: row.resource,
        provider: row.provider,
        logo: providerToLogo(row.provider) ?? undefined,
        region: row.region,
        status: row.status as OverviewActionRow['status'],
        actor: row.actor,
        when: new Date(row.when).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        detail: row.detail,
      }))
      this.recent.set(mapped)
    })
  }

  private pushAudit = (message: string): void => {
    this.auditLog.update((log) => [
      { id: newId(), when: nowTime(), message },
      ...log.slice(0, 11),
    ])
  }

  handleHeader = (label: string): void => {
    if (label === 'Ejecutar acción') {
      this.openActionDialog()
      return
    }
    if (label === 'Vaciar cola') {
      this.handleClearQueue()
      return
    }
    if (label === 'Actualizar') {
      this.handleRefresh()
    }
  }

  handleRefresh = (): void => {
    if (this.refreshing()) return
    this.refreshing.set(true)
    this.loadRecentFromApi()
    this.commandCenterApi.recent(1).subscribe({
      complete: () => {},
      error: () => {},
    })
    of(true).pipe(delay(400)).subscribe({
      complete: () => {
        this.refreshing.set(false)
        this.lastSync.set(nowTime())
        this.toast.success('Panel del centro de mando actualizado')
        this.pushAudit('Panel sincronizado con el estado operativo')
      },
    })
  }

  handleClearQueue = (): void => {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Vaciar cola de ejecución',
        message: `Se cancelarán ${this.queue().length} tareas en cola. Esta acción no se puede deshacer.`,
        confirmLabel: 'Vaciar cola',
        cancelLabel: 'Cancelar',
        destructive: true,
      },
    })
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return
      const count = this.queue().length
      this.queue.set([])
      this.toast.success(`Cola vaciada · ${count} tareas canceladas`)
      this.pushAudit(`Cola vaciada (${count} tareas)`)
    })
  }

  openActionDialog = (prefill?: CommandCenterActionDialogResult): void => {
    const ref = this.dialog.open(CommandCenterActionDialogComponent, {
      width: '520px',
      data: prefill ? { prefill } : undefined,
    })
    ref.afterClosed().subscribe((result?: CommandCenterActionDialogResult) => {
      if (!result) return
      this.applyActionResult(result)
    })
  }

  private applyActionResult = (result: CommandCenterActionDialogResult): void => {
    const payload = dialogResultToPayload(result)
    if (result.mode === 'queue') {
      this.enqueueAction(result, payload)
      return
    }
    if (result.priority === 'high' || this.isDestructive(result.action)) {
      this.addPending(result, payload)
      this.toast.info(`«${result.action}» enviada a aprobación`)
      this.pushAudit(`Solicitud de aprobación: ${result.action} en ${result.resource}`)
      return
    }
    if (!payload) {
      this.toast.error(`Acción no soportada en producción: ${result.action}`)
      return
    }
    this.executeViaApi(payload, result.action, result.provider, result.logo ?? undefined, result.region)
  }

  private isDestructive = (action: string): boolean => {
    const lower = action.toLowerCase()
    return lower.includes('detener') || lower.includes('apply') || lower.includes('rollback') || lower.includes('eliminar')
  }

  private enqueueAction = (
    result: CommandCenterActionDialogResult,
    payload: ExecuteActionPayload | null,
  ): void => {
    const item: CommandCenterQueueItem = {
      id: newId(),
      position: this.queue().length + 1,
      action: result.action,
      resource: result.resource,
      provider: result.provider,
      logo: result.logo ?? undefined,
      eta: result.priority === 'high' ? '1 min' : '5 min',
      status: 'pending',
      priority: result.priority,
      actionType: payload?.type,
      region: result.region,
      namespace: payload?.namespace,
      replicas: payload?.replicas,
      jobName: payload?.jobName,
    }
    const next = result.priority === 'high'
      ? reindexQueue([item, ...this.queue()])
      : reindexQueue([...this.queue(), item])
    this.queue.set(next)
    this.toast.success(`«${result.action}» añadida a la cola (posición ${item.position})`)
    this.pushAudit(`Encolada: ${result.action} · ${result.resource}`)
  }

  private addPending = (
    result: CommandCenterActionDialogResult,
    payload: ExecuteActionPayload | null,
  ): void => {
    const id = newId()
    const row: OverviewActionRow = {
      id,
      action: result.action,
      resource: result.resource,
      provider: result.provider,
      logo: result.logo ?? undefined,
      region: result.region,
      status: 'pending',
      actor: 'operador@cloudops',
      when: 'Pendiente',
      detail: result.priority === 'high' ? 'Prioridad alta · requiere aprobación' : 'Requiere aprobación',
    }
    if (payload) {
      this.pendingPayloads.update((map) => ({ ...map, [id]: payload }))
    }
    this.pending.update((list) => [row, ...list])
  }

  private executeViaApi = (
    payload: ExecuteActionPayload,
    label: string,
    provider: string,
    logo: OverviewActionRow['logo'],
    region: string,
    navigateAfter = false,
  ): void => {
    const rowId = newId()
    const running: OverviewActionRow = {
      id: rowId,
      action: label,
      resource: payload.resource ?? '—',
      provider,
      logo,
      region,
      status: 'running',
      actor: 'operador@cloudops',
      when: nowTime(),
      detail: 'Ejecutando vía API…',
    }
    this.recent.update((list) => [running, ...list])
    this.toast.info(`Ejecutando «${label}»…`)
    this.pushAudit(`Ejecución API: ${label} · ${payload.resource ?? '—'}`)

    this.commandCenterApi.execute(payload).subscribe({
      next: (res) => {
        this.recent.update((list) =>
          list.map((r) =>
            r.id === rowId
              ? { ...r, status: 'success' as const, detail: res.message, resource: res.resource }
              : r,
          ),
        )
        this.toast.success(res.message)
        this.pushAudit(`Completada: ${label} → ${res.destinationLabel}`)
        this.loadRecentFromApi()
        if (navigateAfter) {
          this.router.navigateByUrl(res.destinationRoute)
        }
      },
      error: (err: { error?: { message?: string } }) => {
        const msg = err?.error?.message ?? `Error al ejecutar «${label}»`
        this.recent.update((list) =>
          list.map((r) => (r.id === rowId ? { ...r, status: 'failed' as const, detail: msg } : r)),
        )
        this.toast.error(msg)
        this.pushAudit(`Error: ${label} · ${msg}`)
      },
    })
  }

  handleSelectQuickAction = (id: string): void => {
    this.selectedQuickId.set(id)
  }

  private getQuickAction = (id: string): CommandCenterQuickAction | undefined =>
    this.quickActions.find((a) => a.id === id)

  handleQuickEnqueue = (id: string): void => {
    const qa = this.getQuickAction(id)
    if (!qa) return
    const item: CommandCenterQueueItem = {
      id: newId(),
      position: this.queue().length + 1,
      action: qa.label,
      resource: qa.resource,
      provider: qa.provider,
      logo: qa.logo,
      eta: qa.eta,
      status: 'pending',
      priority: 'normal',
      actionType: qa.actionType,
      region: qa.region,
      namespace: qa.namespace,
      replicas: qa.replicas,
      jobName: qa.jobName,
    }
    this.queue.set(reindexQueue([...this.queue(), item]))
    this.toast.success(`«${qa.label}» añadida a la cola`)
    this.pushAudit(`Encolada: ${qa.label} · ${qa.resource}`)
  }

  handleQuickNavigate = (id: string): void => {
    const qa = this.getQuickAction(id)
    if (!qa) return
    this.router.navigateByUrl(qa.destinationRoute)
    this.toast.info(`Abriendo ${qa.destinationLabel}`)
    this.pushAudit(`Navegación a destino: ${qa.destinationLabel}`)
  }

  handleQuickEnqueueAndGo = (id: string): void => {
    const qa = this.getQuickAction(id)
    if (!qa) return
    const payload = quickActionToPayload(qa)
    this.executeViaApi(payload, qa.label, qa.provider, qa.logo, qa.region, true)
  }

  handleQuickAction = (id: string): void => {
    this.handleQuickEnqueue(id)
  }

  handleApprove = (id: string): void => {
    const row = this.pending().find((r) => r.id === id)
    if (!row) return
    const payload = this.pendingPayloads()[id] ?? pendingRowToPayload(row)
    this.pending.update((list) => list.filter((r) => r.id !== id))
    this.pendingPayloads.update((map) => {
      const next = { ...map }
      delete next[id]
      return next
    })
    if (!payload) {
      this.toast.error(`No se pudo ejecutar: acción no mapeada (${row.action})`)
      return
    }
    this.executeViaApi(payload, row.action, row.provider, row.logo, row.region)
    this.toast.success(`Aprobada: ${row.action}`)
    this.pushAudit(`Aprobada por operador: ${row.action}`)
  }

  handleReject = (id: string): void => {
    const row = this.pending().find((r) => r.id === id)
    if (!row) return
    this.pending.update((list) => list.filter((r) => r.id !== id))
    this.toast.warning(`Rechazada: ${row.action}`)
    this.pushAudit(`Rechazada: ${row.action} · ${row.resource}`)
  }

  handleRemoveFromQueue = (id: string): void => {
    const item = this.queue().find((q) => q.id === id)
    if (!item) return
    this.queue.update((list) => reindexQueue(list.filter((q) => q.id !== id)))
    this.toast.info(`Eliminada de cola: ${item.action}`)
    this.pushAudit(`Quitada de cola: ${item.action}`)
  }

  handlePromote = (id: string): void => {
    const list = this.queue()
    const idx = list.findIndex((q) => q.id === id)
    if (idx <= 0) return
    const next = [...list]
    const [item] = next.splice(idx, 1)
    next.unshift(item)
    this.queue.set(reindexQueue(next))
    this.toast.success(`«${item.action}» movida al frente de la cola`)
    this.pushAudit(`Priorizada en cola: ${item.action}`)
  }

  handleProcessNext = (): void => {
    const [next, ...rest] = this.queue()
    if (!next || this.processingQueue()) return
    const payload = queueItemToPayload(next)
    if (!payload) {
      this.toast.error(`Cola: acción sin tipo API (${next.action})`)
      return
    }
    this.processingQueue.set(true)
    this.processingId.set(next.id)
    this.queue.set(reindexQueue(rest))
    this.pushAudit(`Procesando cola: ${next.action}`)

    this.commandCenterApi.execute(payload).subscribe({
      next: (res) => {
        const running: OverviewActionRow = {
          id: newId(),
          action: next.action,
          resource: res.resource,
          provider: next.provider,
          logo: next.logo,
          region: next.region ?? '—',
          status: 'success',
          actor: 'system@cloudops',
          when: nowTime(),
          detail: res.message,
        }
        this.recent.update((list) => [running, ...list])
        this.processingQueue.set(false)
        this.processingId.set(null)
        this.toast.success(`Cola: ${res.message}`)
        this.pushAudit(`Cola completada: ${next.action}`)
        this.loadRecentFromApi()
      },
      error: (err: { error?: { message?: string } }) => {
        this.processingQueue.set(false)
        this.processingId.set(null)
        this.toast.error(err?.error?.message ?? `Error en cola: ${next.action}`)
        this.pushAudit(`Cola fallida: ${next.action}`)
      },
    })
  }

  handleCancelRunning = (id: string): void => {
    const row = this.recent().find((r) => r.id === id)
    if (!row || row.status !== 'running') return
    this.recent.update((list) =>
      list.map((r) => (r.id === id ? { ...r, status: 'failed' as const, detail: 'Cancelada por operador' } : r)),
    )
    this.toast.warning(`Cancelada: ${row.action}`)
    this.pushAudit(`Cancelada en curso: ${row.action}`)
  }

  handleViewDetail = (row: OverviewActionRow): void => {
    this.dialog.open(DetailDialogComponent, {
      width: '440px',
      data: {
        title: row.action,
        icon: 'terminal',
        rows: [
          { label: 'Recurso', value: row.resource },
          { label: 'Proveedor', value: row.provider },
          { label: 'Región', value: row.region },
          { label: 'Estado', value: row.status },
          { label: 'Actor', value: row.actor },
          { label: 'Cuándo', value: row.when },
          { label: 'Detalle', value: row.detail },
        ],
      },
    })
  }

  togglePlatformFilter = (provider: string): void => {
    this.platformFilter.update((current) => (current === provider ? null : provider))
  }

  clearPlatformFilter = (): void => this.platformFilter.set(null)
}
