import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { DatePipe } from '@angular/common'
import { Component, inject, computed, signal, effect, OnInit } from '@angular/core'
import { Router, NavigationEnd } from '@angular/router'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { debounceTime, filter, forkJoin, map, startWith, type Observable } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { RunbookExecutionDetailDialogComponent } from './runbook-execution-detail-dialog.component'
import { RunbookExecutionDetailPanelComponent } from './runbook-execution-detail-panel.component'
import { RunbookExecutionsCalendarComponent } from './runbook-executions-calendar.component'
import { RUNBOOKS_EXECUTIONS_STYLES } from './runbooks-executions.styles'
import {
  dateKeyLabel,
  latestExecutionDateKey,
  todayDateKey,
  toDateKey,
} from './runbook-execution-date.util'
import { RunbookDetailDialogComponent } from './runbook-detail-dialog.component'
import {
  buildExecutionFullLog,
  buildExecutionStepLogs,
  enrichRunbookExecution,
  inferFinishedAt,
} from './runbook-execution.util'
import { ToastService } from '../../core/services/toast.service'
import { InstancesService } from '../../core/services/instances.service'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { VpsService } from '../../core/services/vps.service'
import { buildRunbookTargets, type RunbookTargetInstance } from './runbook-target.util'
import { ProConfigGateComponent } from '../../shared/components/pro-config-gate/pro-config-gate.component'
import type { CloudAccount } from '../../core/models/api.models'
import {
  RunbookExecuteDialogComponent,
  type RunbookExecuteDialogResult,
} from './runbook-execute-dialog.component'
import {
  RunbookCreateDialogComponent,
  type RunbookCreateDialogData,
  type RunbookCreateDialogResult,
} from './runbook-create-dialog.component'
import {
  RunbookImportDialogComponent,
  type RunbookImportPayload,
} from './runbook-import-dialog.component'
import {
  RUNBOOK_CATEGORY_LABELS,
  RUNBOOK_EXECUTION_RESULT_LABELS,
  RUNBOOK_TRIGGER_LABELS,
  type Runbook,
  type RunbookCategory,
  type RunbookExecution,
  type RunbookStep,
} from './runbooks.types'
import { defaultRunbookExecutions, defaultRunbooks } from './runbooks.data'
import { ApprovalsService } from '../approvals/approvals.service'
import { needsApprovalBeforeRunbook } from '../approvals/approvals.util'

type RunbooksView = 'catalog' | 'executions'

@Component({
  selector: 'app-runbooks-page',
  standalone: true,
  imports: [
    ProConfigGateComponent,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    RunbookExecutionDetailPanelComponent,
    RunbookExecutionsCalendarComponent,
  ],
  template: `
    <app-pro-config-gate module="Runbooks">
    <div class="page-container runbooks-page animate-fade-in" [class.runbooks-page--executions]="view() === 'executions'">
      @if (view() === 'catalog') {
        <section class="runbooks-intro">
          <div class="runbooks-intro__text">
            <h2 class="runbooks-intro__title">Runbooks operativos</h2>
            <p>
              Procedimientos documentados para incidentes, mantenimiento y respuesta a alertas.
              Ejecuta pasos guiados, revisa logs y vincula cada runbook a hosts, clusters o reglas.
            </p>
          </div>
          <div class="runbooks-intro__actions">
            <button type="button" class="runbooks-btn runbooks-btn--primary" (click)="openExecute()">
              <mat-icon>play_arrow</mat-icon>
              Ejecutar
            </button>
            <button type="button" class="runbooks-btn" (click)="openNew()">
              <mat-icon>add</mat-icon>
              Nuevo
            </button>
            <button type="button" class="runbooks-btn" (click)="openImport()">
              <mat-icon>upload</mat-icon>
              Subir
            </button>
          </div>
        </section>
      } @else {
        <header class="runbooks-exec-bar">
          <div class="runbooks-exec-bar__title">
            <mat-icon>history</mat-icon>
            <span>Registro de ejecuciones</span>
          </div>
          <div class="runbooks-exec-bar__actions">
            <button type="button" class="runbooks-btn runbooks-btn--sm runbooks-btn--primary" (click)="openExecute()">
              <mat-icon>play_arrow</mat-icon>
              Ejecutar
            </button>
            <button type="button" class="runbooks-btn runbooks-btn--sm" (click)="openNew()">
              <mat-icon>add</mat-icon>
              Nuevo
            </button>
          </div>
        </header>
      }

      @if (view() === 'catalog') {
        <div class="runbooks-catalog">
            <div class="runbooks-toolbar">
              <label class="runbooks-search">
                <mat-icon>search</mat-icon>
                <input
                  type="search"
                  [formControl]="searchControl"
                  placeholder="Buscar por nombre, tag o recurso…"
                  aria-label="Buscar runbooks"
                />
              </label>
              <div class="runbooks-filters" role="group" aria-label="Categoría">
                <button
                  type="button"
                  class="runbooks-filter"
                  [class.runbooks-filter--on]="categoryFilter() === 'all'"
                  (click)="categoryFilter.set('all')"
                >
                  Todos
                </button>
                @for (cat of categories; track cat) {
                  <button
                    type="button"
                    class="runbooks-filter"
                    [class.runbooks-filter--on]="categoryFilter() === cat"
                    (click)="categoryFilter.set(cat)"
                  >
                    {{ categoryLabel(cat) }}
                  </button>
                }
              </div>
            </div>

            <div class="runbooks-grid">
              @for (rb of filteredRunbooks(); track rb.id) {
                <article
                  class="runbook-card"
                  [attr.data-category]="rb.category"
                  [attr.data-status]="rb.status"
                >
                  <header class="runbook-card__head">
                    <span class="runbook-card__category">{{ categoryLabel(rb.category) }}</span>
                    @if (rb.requiresApproval) {
                      <span class="runbook-card__badge" title="Requiere aprobación">
                        <mat-icon>verified_user</mat-icon>
                      </span>
                    }
                  </header>
                  <h3 class="runbook-card__title">{{ rb.name }}</h3>
                  <p class="runbook-card__desc">{{ rb.description }}</p>
                  <div class="runbook-card__tags">
                    @for (tag of rb.tags; track tag) {
                      <span class="runbook-card__tag">{{ tag }}</span>
                    }
                  </div>
                  <dl class="runbook-card__meta">
                    <div>
                      <dt>Pasos</dt>
                      <dd>{{ rb.steps.length }}</dd>
                    </div>
                    <div>
                      <dt>Duración media</dt>
                      <dd>{{ rb.avgDuration }}</dd>
                    </div>
                    <div>
                      <dt>Éxito</dt>
                      <dd>{{ rb.successRate }}%</dd>
                    </div>
                    <div>
                      <dt>Disparador</dt>
                      <dd>{{ triggerLabel(rb.trigger) }}</dd>
                    </div>
                  </dl>
                  <div class="runbook-card__steps" aria-label="Vista previa de pasos">
                    @for (step of rb.steps.slice(0, 4); track step.order) {
                      <span class="runbook-card__step" [attr.data-type]="step.type" [title]="step.title"></span>
                    }
                    @if (rb.steps.length > 4) {
                      <span class="runbook-card__step-more">+{{ rb.steps.length - 4 }}</span>
                    }
                  </div>
                  <footer class="runbook-card__foot">
                    <span class="runbook-card__linked">
                      <mat-icon>link</mat-icon>
                      {{ rb.linkedTo }}
                    </span>
                    <span class="runbook-card__owner">{{ rb.owner }}</span>
                  </footer>
                  <div class="runbook-card__actions">
                    <button type="button" class="runbooks-btn runbooks-btn--sm" (click)="openRunbookDetail(rb)">
                      <mat-icon>visibility</mat-icon>
                      Ver pasos
                    </button>
                    <button
                      type="button"
                      class="runbooks-btn runbooks-btn--sm runbooks-btn--primary"
                      (click)="handleRun(rb)"
                    >
                      <mat-icon>play_arrow</mat-icon>
                      Ejecutar
                    </button>
                  </div>
                </article>
              } @empty {
                <p class="runbooks-empty">No hay runbooks que coincidan con el filtro.</p>
              }
            </div>
        </div>
      } @else {
        <section class="runbooks-executions-panel" aria-label="Ejecuciones de runbooks">
          <div class="rex">
            <aside class="rex-rail" aria-label="Calendario y ejecuciones del día">
              <div class="rex-rail__cal">
                <app-runbook-executions-calendar
                  theme="light"
                  [executions]="filteredExecutions()"
                  [viewYear]="calendarView().year"
                  [viewMonth]="calendarView().month"
                  [selectedDateKey]="selectedCalendarDate()"
                  (monthChange)="handleCalendarMonthChange($event)"
                  (dateSelect)="selectCalendarDate($event)"
                />
              </div>
              <div class="rex-rail__list">
                <header class="rex-rail__list-head">
                  <div>
                    @if (selectedDayLabel(); as label) {
                      <h4>{{ label }}</h4>
                    } @else {
                      <h4>Selecciona un día</h4>
                      <p>En el calendario</p>
                    }
                  </div>
                  <span class="rex-rail__count">{{ executionsForSelectedDay().length }}</span>
                </header>
                @if (executionsForSelectedDay().length) {
                  <ul class="rex-timeline">
                    @for (ex of executionsForSelectedDay(); track ex.id) {
                      <li>
                        <button
                          type="button"
                          class="rex-item"
                          [class.rex-item--on]="selectedExecutionId() === ex.id"
                          [attr.data-result]="ex.result"
                          (click)="selectExecution(ex.id)"
                        >
                          <span class="rex-item__stripe" aria-hidden="true"></span>
                          <span class="rex-item__body">
                            <span class="rex-item__row">
                              <strong>{{ ex.runbookName }}</strong>
                              <span class="rex-item__time">{{ ex.startedAt | date: 'HH:mm' }}</span>
                            </span>
                            <span class="rex-item__target mono">{{ ex.target }}</span>
                            <span class="rex-item__meta">
                              <span class="rex-pill" [attr.data-result]="ex.result">
                                {{ executionResultLabel(ex.result) }}
                              </span>
                              <span class="rex-item__dur">{{ ex.duration }}</span>
                              <span class="rex-item__steps">{{ ex.stepsCompleted }}/{{ ex.stepsTotal }}</span>
                            </span>
                            <span
                              class="rex-item__bar"
                              [style.width.%]="executionProgressPct(ex)"
                              aria-hidden="true"
                            ></span>
                          </span>
                        </button>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="rex-empty">
                    @if (filteredExecutions().length) {
                      Sin ejecuciones este día.
                    } @else {
                      Aún no hay ejecuciones. Lanza un runbook desde el catálogo.
                    }
                  </p>
                }
              </div>
            </aside>

            <main class="rex-stage" aria-label="Detalle de ejecución">
              @if (selectedExecution(); as ex) {
                <header class="rex-stage__head" [attr.data-result]="ex.result">
                  <span class="rex-stage__status" aria-hidden="true">
                    <mat-icon>{{ executionResultIcon(ex.result) }}</mat-icon>
                  </span>
                  <div class="rex-stage__titles">
                    <h3>{{ ex.runbookName }}</h3>
                    <p class="mono">
                      {{ ex.id }} · {{ ex.target }} · {{ ex.startedAt | date: 'dd MMM yyyy, HH:mm' }}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="rex-stage__expand"
                    (click)="openExecutionFullscreen(ex)"
                  >
                    <mat-icon>open_in_full</mat-icon>
                    Pantalla completa
                  </button>
                </header>
                <div class="rex-stage__body">
                  <app-runbook-execution-detail-panel
                    [execution]="ex"
                    [runbook]="selectedRunbook()"
                    [embedded]="true"
                    [stageHeader]="true"
                  />
                </div>
              } @else {
                <div class="rex-stage__empty">
                  <span class="rex-stage__empty-icon" aria-hidden="true">
                    <mat-icon>plagiarism</mat-icon>
                  </span>
                  <h4>Inspector de ejecución</h4>
                  <p>Selecciona un día en el calendario y una ejecución de la lista para revisar resultado, pasos y registro.</p>
                </div>
              }
            </main>
          </div>
        </section>
      }
    </div>
    </app-pro-config-gate>
  `,
  styles: [
    `
    .runbooks-page {
      color: #111;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .runbooks-intro {
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem 1rem;
      border-radius: var(--app-radius-lg, 16px);
      background: color-mix(in srgb, #844fba 6%, var(--app-card, #fff));
      border: 1px solid color-mix(in srgb, #844fba 18%, transparent);
    }
    .runbooks-intro__title {
      margin: 0 0 0.35rem;
      font-size: 1.15rem;
      font-weight: 700;
      color: #111;
    }
    .runbooks-intro p {
      margin: 0;
      max-width: 42rem;
      font-size: 0.82rem;
      line-height: 1.55;
      color: #333;
    }
    .runbooks-intro__actions {
      display: flex;
      gap: 0.35rem;
      flex-shrink: 0;
      align-items: flex-start;
      height: fit-content;
      padding: 0;
    }
    .runbooks-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      width: fit-content;
      height: fit-content;
      min-height: unset;
      margin: 0;
      padding: 0.42rem 0.55rem;
      border: 1px solid color-mix(in srgb, #111 12%, transparent);
      border-radius: 8px;
      background: #fff;
      font: inherit;
      font-size: 0.76rem;
      font-weight: 600;
      line-height: 1.25;
      box-sizing: border-box;
      color: #111;
      cursor: pointer;
    }
    .runbooks-btn:hover {
      background: color-mix(in srgb, #111 4%, transparent);
    }
    .runbooks-btn mat-icon {
      display: block;
      margin: 0;
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .runbooks-btn--primary {
      border-color: color-mix(in srgb, #844fba 35%, transparent);
      background: color-mix(in srgb, #844fba 12%, transparent);
    }
    .runbooks-btn--icon {
      padding: 0.42rem;
    }
    .runbooks-btn--sm {
      padding: 0.32rem 0.45rem;
      font-size: 0.72rem;
    }
    .runbooks-catalog {
      min-width: 0;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .runbooks-toolbar {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      margin-bottom: 0.75rem;
    }
    .runbooks-search {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.65rem;
      border-radius: 10px;
      background: var(--app-elevated, #fff);
      border: 1px solid color-mix(in srgb, #111 8%, transparent);
    }
    .runbooks-search mat-icon {
      color: #64748b;
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .runbooks-search input {
      border: none;
      background: transparent;
      font: inherit;
      font-size: 0.8rem;
      color: #111;
      width: 100%;
      min-width: 0;
    }
    .runbooks-search input:focus {
      outline: none;
    }
    .runbooks-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .runbooks-filter {
      padding: 0.28rem 0.6rem;
      border: 1px solid color-mix(in srgb, #111 10%, transparent);
      border-radius: 999px;
      background: transparent;
      font: inherit;
      font-size: 0.72rem;
      color: #333;
      cursor: pointer;
    }
    .runbooks-filter--on {
      color: #111;
      border-color: color-mix(in srgb, #844fba 35%, transparent);
      background: color-mix(in srgb, #844fba 8%, transparent);
    }
    .runbooks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.75rem;
    }
    .runbook-card {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      padding: 0.85rem 0.9rem;
      border-radius: 14px;
      background: var(--app-card, #fff);
      border: 1px solid color-mix(in srgb, #111 8%, transparent);
      border-left: 4px solid #844fba;
      box-shadow: var(--app-shadow-xs, 0 1px 2px rgba(15, 23, 42, 0.04));
      transition: box-shadow 0.15s ease, transform 0.12s ease;
    }
    .runbook-card:hover {
      box-shadow: var(--app-shadow-sm);
      transform: translateY(-2px);
    }
    .runbook-card[data-category='infra'] { border-left-color: #38bdf8; }
    .runbook-card[data-category='app'] { border-left-color: #844fba; }
    .runbook-card[data-category='db'] { border-left-color: #f59e0b; }
    .runbook-card[data-category='security'] { border-left-color: #ef4444; }
    .runbook-card[data-category='k8s'] { border-left-color: #22c55e; }
    .runbook-card[data-status='draft'] { opacity: 0.88; }
    .runbook-card__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .runbook-card__category {
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #64748b;
    }
    .runbook-card__badge mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #d97706;
    }
    .runbook-card__title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #111;
    }
    .runbook-card__desc {
      margin: 0;
      font-size: 0.74rem;
      line-height: 1.5;
      color: #333;
      flex: 1;
    }
    .runbook-card__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }
    .runbook-card__tag {
      font-size: 0.62rem;
      padding: 0.12rem 0.4rem;
      border-radius: 6px;
      background: color-mix(in srgb, #111 5%, transparent);
      color: #333;
    }
    .runbook-card__meta {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.35rem 0.5rem;
      margin: 0;
      font-size: 0.68rem;
    }
    .runbook-card__meta dt {
      color: #64748b;
      font-weight: 600;
    }
    .runbook-card__meta dd {
      margin: 0;
      color: #111;
      font-weight: 650;
    }
    .runbook-card__steps {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .runbook-card__step {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      background: #cbd5e1;
    }
    .runbook-card__step[data-type='command'] { background: #844fba; }
    .runbook-card__step[data-type='check'] { background: #38bdf8; }
    .runbook-card__step[data-type='approval'] { background: #f59e0b; }
    .runbook-card__step[data-type='notify'] { background: #22c55e; }
    .runbook-card__step-more {
      font-size: 0.62rem;
      color: #64748b;
      margin-left: 0.15rem;
    }
    .runbook-card__foot {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.68rem;
      color: #64748b;
      padding-top: 0.35rem;
      border-top: 1px solid color-mix(in srgb, #111 6%, transparent);
    }
    .runbook-card__linked {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .runbook-card__linked mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .runbook-card__actions {
      display: flex;
      gap: 0.35rem;
      margin-top: 0.15rem;
    }
    .runbooks-page--executions {
      gap: 0.35rem;
      flex: 1;
      min-height: 0;
      height: 100%;
      overflow: hidden;
    }
    .runbooks-page--executions .runbooks-executions-panel {
      flex: 1;
      min-height: 0;
      max-height: none;
    }
    .runbooks-exec-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.35rem 0.6rem;
      border-radius: 12px;
      background: color-mix(in srgb, #7c3aed 6%, #fff);
      border: 1px solid color-mix(in srgb, #7c3aed 14%, #e2e8f0);
      flex-shrink: 0;
    }
    .runbooks-exec-bar__title {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: #1e293b;
    }
    .runbooks-exec-bar__title mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: #7c3aed;
    }
    .runbooks-exec-bar__actions {
      display: flex;
      gap: 0.35rem;
    }
    .runbooks-progress {
      display: block;
      height: 6px;
      border-radius: 3px;
      background: color-mix(in srgb, #111 8%, transparent);
      overflow: hidden;
      max-width: 80px;
    }
    .runbooks-progress__bar {
      display: block;
      height: 100%;
      background: #844fba;
      border-radius: 3px;
    }
    .runbooks-progress__label {
      display: block;
      font-size: 0.65rem;
      color: #64748b;
      margin-top: 0.15rem;
    }
    .runbooks-result {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.15rem 0.4rem;
      border-radius: 6px;
    }
    .runbooks-result[data-result='success'] {
      background: color-mix(in srgb, #22c55e 14%, transparent);
      color: #15803d;
    }
    .runbooks-result[data-result='warning'] {
      background: color-mix(in srgb, #f59e0b 14%, transparent);
      color: #b45309;
    }
    .runbooks-result[data-result='error'] {
      background: color-mix(in srgb, #ef4444 14%, transparent);
      color: #b91c1c;
    }
    .runbooks-empty {
      grid-column: 1 / -1;
      text-align: center;
      color: #64748b;
      font-size: 0.85rem;
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
  `,
    RUNBOOKS_EXECUTIONS_STYLES,
  ],
})
export class RunbooksPageComponent implements OnInit {
  private readonly actions = inject(PlatformActionService)

  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)
  private readonly router = inject(Router)
  private readonly instancesSvc = inject(InstancesService)
  private readonly cloudAccountsSvc = inject(CloudAccountsService)
  private readonly vpsSvc = inject(VpsService)
  private readonly approvals = inject(ApprovalsService)

  ngOnInit(): void {
    this.drainApprovedRunbookExecutions()
  }

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  )

  readonly view = computed((): RunbooksView => {
    const path = this.url().split('?')[0]
    return path === '/runbooks/executions' || path.startsWith('/runbooks/executions/')
      ? 'executions'
      : 'catalog'
  })
  readonly categoryFilter = signal<RunbookCategory | 'all'>('all')
  readonly runbooks = signal(defaultRunbooks())
  readonly executions = signal(defaultRunbookExecutions())

  readonly categories: RunbookCategory[] = ['infra', 'app', 'db', 'security', 'k8s']

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(150), startWith('')),
    { initialValue: '' },
  )

  readonly filteredExecutions = computed(() =>
    [...this.executions()]
      .map((ex) => enrichRunbookExecution(ex, this.runbooks()))
      .sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      ),
  )

  readonly calendarView = signal({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  })
  readonly selectedCalendarDate = signal<string | null>(todayDateKey())

  readonly selectedDayLabel = computed(() => {
    const key = this.selectedCalendarDate()
    return key ? dateKeyLabel(key) : null
  })

  readonly executionsForSelectedDay = computed(() => {
    const key = this.selectedCalendarDate()
    if (!key) return []
    return this.filteredExecutions().filter((ex) => toDateKey(ex.startedAt) === key)
  })

  readonly selectedExecutionId = signal<string | null>(null)

  readonly selectedExecution = computed(() => {
    const id = this.selectedExecutionId()
    if (!id) return null
    return this.filteredExecutions().find((ex) => ex.id === id) ?? null
  })

  readonly selectedRunbook = computed(() => {
    const ex = this.selectedExecution()
    if (!ex) return null
    return this.runbooks().find((r) => r.id === ex.runbookId) ?? null
  })

  private readonly syncCalendarDate = effect(() => {
    const filtered = this.filteredExecutions()
    const selected = this.selectedCalendarDate()
    if (!filtered.length) {
      this.selectedCalendarDate.set(null)
      return
    }
    if (selected && filtered.some((ex) => toDateKey(ex.startedAt) === selected)) return
    const latest = latestExecutionDateKey(filtered)
    this.selectedCalendarDate.set(latest ?? todayDateKey())
    if (latest) {
      const [y, m] = latest.split('-').map(Number)
      this.calendarView.set({ year: y, month: m - 1 })
    }
  })

  private readonly syncSelectedExecution = effect(() => {
    const list = this.executionsForSelectedDay()
    const current = this.selectedExecutionId()
    if (!list.length) {
      this.selectedExecutionId.set(null)
      return
    }
    if (!current || !list.some((ex) => ex.id === current)) {
      this.selectedExecutionId.set(list[0].id)
    }
  })

  readonly filteredRunbooks = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const cat = this.categoryFilter()
    return this.runbooks().filter((rb) => {
      if (cat !== 'all' && rb.category !== cat) return false
      if (!term) return true
      const hay = [rb.name, rb.description, rb.linkedTo, rb.owner, ...rb.tags].join(' ').toLowerCase()
      return hay.includes(term)
    })
  })

  categoryLabel = (cat: RunbookCategory): string => RUNBOOK_CATEGORY_LABELS[cat]
  triggerLabel = (t: Runbook['trigger']): string => RUNBOOK_TRIGGER_LABELS[t]

  executionResultLabel = (result: RunbookExecution['result']): string =>
    RUNBOOK_EXECUTION_RESULT_LABELS[result]

  executionResultIcon = (result: RunbookExecution['result']): string => {
    if (result === 'success') return 'check_circle'
    if (result === 'warning') return 'warning'
    return 'error'
  }

  executionProgressPct = (ex: RunbookExecution): number => {
    if (!ex.stepsTotal) return 0
    return Math.round((ex.stepsCompleted / ex.stepsTotal) * 100)
  }

  selectExecution = (id: string): void => {
    this.selectedExecutionId.set(id)
  }

  handleCalendarMonthChange = (view: { year: number; month: number }): void => {
    this.calendarView.set(view)
  }

  selectCalendarDate = (dateKey: string): void => {
    this.selectedCalendarDate.set(dateKey)
  }

  readonly runnableRunbooks = computed(() =>
    this.runbooks().filter((r) => r.status !== 'deprecated'),
  )

  openExecute = (preselectedId?: string): void => {
    const list = this.runnableRunbooks()
    if (!list.length) {
      this.toast.error('No hay runbooks disponibles para ejecutar')
      return
    }
    this.loadRunbookTargets().subscribe(({ targets, accounts }) => {
      const ref = this.dialog.open(RunbookExecuteDialogComponent, {
        data: { runbooks: list, instances: targets, accounts, preselectedId },
        width: 'min(1280px, 98vw)',
        maxWidth: '98vw',
        maxHeight: '96vh',
        panelClass: 'runbook-execute-dialog-panel',
      })
      ref.afterClosed().subscribe((result) => {
        if (!result) return
        if (targets.length && !result.instanceId) {
          this.toast.error('Selecciona una instancia cloud o VPS para ejecutar')
          return
        }
        const rb = list.find((r) => r.id === result.runbookId)
        if (rb && needsApprovalBeforeRunbook(rb, result.dryRun)) {
          const req = this.approvals.submitRunbookExecution(rb, result)
          this.toast.info(`Enviado a Aprobaciones — ${req.approvedSubject}`)
          return
        }
        this.runExecution(result)
      })
    })
  }

  openNew = (): void => {
    this.loadRunbookTargets().subscribe(({ targets, accounts }) => {
      const ref = this.dialog.open(RunbookCreateDialogComponent, {
        data: { instances: targets, accounts } satisfies RunbookCreateDialogData,
        width: 'min(1280px, 98vw)',
        maxWidth: '98vw',
        maxHeight: '96vh',
        panelClass: 'runbook-create-dialog-panel',
      })
      ref.afterClosed().subscribe((data) => {
        if (!data) return
        const rb = this.buildRunbookFromCreate(data)
        this.runbooks.update((list) => [rb, ...list])
        this.categoryFilter.set(rb.category)
        void this.router.navigate(['/runbooks'])
        this.toast.success(`Runbook «${rb.name}» creado como borrador`)
        this.openRunbookDetail(rb, true)
      })
    })
  }

  private loadRunbookTargets = (): Observable<{
    targets: RunbookTargetInstance[]
    accounts: CloudAccount[]
  }> =>
    forkJoin({
      instances: this.instancesSvc.list(),
      accounts: this.cloudAccountsSvc.list(),
      vps: this.vpsSvc.list(),
    }).pipe(
      map(({ instances, accounts, vps }) => ({
        targets: buildRunbookTargets(instances, accounts, vps),
        accounts,
      })),
    )

  openImport = (): void => {
    const ref = this.dialog.open(RunbookImportDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
    })
    ref.afterClosed().subscribe((payload) => {
      if (!payload) return
      const rb = this.buildRunbookFromImport(payload)
      this.runbooks.update((list) => [rb, ...list])
      this.categoryFilter.set(rb.category)
      void this.router.navigate(['/runbooks'])
      this.toast.success(`Runbook «${rb.name}» importado correctamente`)
    })
  }

  handleRun = (rb: Runbook): void => {
    this.openExecute(rb.id)
  }

  private runExecution = (result: RunbookExecuteDialogResult): void => {
    const rb = this.runbooks().find((r) => r.id === result.runbookId)
    if (!rb) return

    const label = result.dryRun ? `Simulando: ${rb.name}` : `Ejecutando: ${rb.name}`
    this.actions.simulate(label, 700).subscribe({
      next: () => {
        const stepsTotal = rb.steps.length
        const stepsCompleted = result.dryRun ? stepsTotal : stepsTotal
        const startedAt = new Date().toISOString()
        const execResult: RunbookExecution['result'] = result.dryRun
          ? 'success'
          : rb.successRate >= 90
            ? 'success'
            : 'warning'
        const stepLogs = buildExecutionStepLogs(rb, stepsCompleted, stepsTotal, execResult, result.dryRun)
        const duration = result.dryRun ? '0s (dry-run)' : rb.avgDuration
        const partial: RunbookExecution = {
          id: `ex-${Date.now()}`,
          runbookId: rb.id,
          runbookName: rb.name,
          startedAt,
          finishedAt: inferFinishedAt(startedAt, duration),
          duration,
          triggeredBy: 'ops@cloudops.local',
          target: result.target,
          instanceId: result.instanceId,
          provider: result.provider,
          accountName: result.accountName,
          category: rb.category,
          result: execResult,
          logExcerpt: this.buildExecutionLog(rb, result, stepsTotal),
          stepsCompleted,
          stepsTotal,
          stepLogs,
          dryRun: result.dryRun,
          note: result.note,
          notifyOnComplete: result.notifyOnComplete,
        }
        partial.fullLog = buildExecutionFullLog(partial, stepLogs)
        const execution = enrichRunbookExecution(partial, this.runbooks())
        this.executions.update((list) => [execution, ...list])
        this.runbooks.update((list) =>
          list.map((r) =>
            r.id === rb.id
              ? {
                  ...r,
                  executions7d: r.executions7d + 1,
                  lastRunLabel: 'Ahora',
                  lastResult:
                    execution.result === 'error'
                      ? 'error'
                      : execution.result === 'warning'
                        ? 'warning'
                        : 'success',
                }
              : r,
          ),
        )
        const dayKey = toDateKey(startedAt)
        this.selectedCalendarDate.set(dayKey)
        const now = new Date()
        this.calendarView.set({ year: now.getFullYear(), month: now.getMonth() })
        this.selectedExecutionId.set(execution.id)
        void this.router.navigate(['/runbooks/executions'])
        this.toast.success(
          result.dryRun
            ? `Simulación de «${rb.name}» registrada`
            : `«${rb.name}» ejecutado en ${result.target}`,
        )
      },
    })
  }

  private buildRunbookFromCreate = (data: RunbookCreateDialogResult): Runbook => ({
    id: `rb-${Date.now()}`,
    name: data.name,
    description: data.description,
    category: data.category,
    tags: data.tags,
    steps: data.steps.length ? data.steps : [{ order: 1, title: 'Primer paso', type: 'check' }],
    owner: data.owner,
    avgDuration: '—',
    successRate: 0,
    executions7d: 0,
    lastRunLabel: 'Sin ejecutar',
    lastResult: 'never',
    trigger: data.trigger,
    linkedTo: data.linkedTo,
    status: 'draft',
    requiresApproval: data.requiresApproval,
    defaultInstanceId: data.instanceId,
    defaultProvider: data.defaultProvider,
    defaultAccountName: data.defaultAccountName,
    createdAt: new Date().toISOString(),
  })

  private buildRunbookFromImport = (payload: RunbookImportPayload): Runbook => {
    const category = this.parseCategory(payload.category)
    const steps: RunbookStep[] =
      payload.steps?.map((s, i) => ({
        order: i + 1,
        title: s.title,
        type: (['command', 'check', 'approval', 'notify'].includes(s.type ?? '')
          ? s.type
          : 'command') as RunbookStep['type'],
        command: s.command,
      })) ?? [{ order: 1, title: 'Paso importado', type: 'check' }]

    return {
      id: `rb-import-${Date.now()}`,
      name: payload.name,
      description: payload.description ?? 'Runbook importado desde archivo',
      category,
      tags: payload.tags ?? ['imported'],
      steps,
      owner: payload.owner ?? 'Importado',
      avgDuration: '—',
      successRate: 0,
      executions7d: 0,
      lastRunLabel: 'Sin ejecutar',
      lastResult: 'never',
      trigger: 'manual',
      linkedTo: payload.linkedTo ?? '—',
      status: 'draft',
      requiresApproval: false,
    }
  }

  private buildExecutionLog = (
    rb: Runbook,
    result: RunbookExecuteDialogResult,
    stepsTotal: number,
  ): string => {
    const parts: string[] = []
    parts.push(`${result.provider} · ${result.target}`)
    if (result.accountName) parts.push(`Cuenta: ${result.accountName}`)
    if (result.dryRun) {
      parts.push(`[dry-run] Validados ${stepsTotal} pasos sin aplicar cambios`)
    } else {
      parts.push(`Ejecución completada · ${rb.steps[stepsTotal - 1]?.title ?? 'OK'}`)
    }
    if (result.note) parts.push(`Nota: ${result.note}`)
    if (result.notifyOnComplete) parts.push('Notificación enviada (#ops-demo)')
    return parts.join(' · ')
  }

  private parseCategory = (raw?: string): RunbookCategory => {
    const cats: RunbookCategory[] = ['infra', 'app', 'db', 'security', 'k8s']
    if (raw && cats.includes(raw as RunbookCategory)) return raw as RunbookCategory
    return 'infra'
  }

  openRunbookDetail = (rb: Runbook, justCreated = false): void => {
    const ref = this.dialog.open(RunbookDetailDialogComponent, {
      data: { runbook: rb, justCreated },
      width: 'min(800px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '94vh',
    })
    ref.afterClosed().subscribe((action) => {
      if (action === 'execute') this.handleRun(rb)
    })
  }

  openExecutionFullscreen = (ex: RunbookExecution): void => {
    const runbook = this.runbooks().find((r) => r.id === ex.runbookId) ?? null
    const execution = enrichRunbookExecution(ex, this.runbooks())
    this.dialog.open(RunbookExecutionDetailDialogComponent, {
      data: { execution, runbook },
      width: 'min(960px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '94vh',
      panelClass: 'runbook-execution-detail-dialog-panel',
    })
  }

  private drainApprovedRunbookExecutions = (): void => {
    const batch = this.approvals.drainApprovedRunbookExecutions()
    batch.forEach((result) => this.runExecution(result))
  }
}
