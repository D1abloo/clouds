import { DatePipe } from '@angular/common'
import { Component, computed, input, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import {
  RUNBOOK_CATEGORY_LABELS,
  RUNBOOK_EXECUTION_RESULT_LABELS,
  RUNBOOK_STEP_TYPE_LABELS,
  RUNBOOK_TRIGGER_LABELS,
  type Runbook,
  type RunbookExecution,
  type RunbookExecutionStepLog,
} from './runbooks.types'
import { buildExecutionStepLogs } from './runbook-execution.util'

export type ExecutionDetailTab = 'resumen' | 'pasos' | 'registro'

const STEP_TYPE_ICON: Record<string, string> = {
  command: 'terminal',
  check: 'fact_check',
  approval: 'verified_user',
  notify: 'campaign',
}

const STEP_STATUS_LABEL: Record<string, string> = {
  success: 'OK',
  warning: 'Advertencia',
  error: 'Error',
  skipped: 'Omitido',
  pending: 'Pendiente',
}

@Component({
  selector: 'app-runbook-execution-detail-panel',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule],
  template: `
    @if (execution(); as ex) {
      <div
        class="rb-ex-panel"
        [class.rb-ex-panel--embedded]="embedded()"
        [class.rb-ex-panel--rex]="embedded() && stageHeader()"
      >
        @if (embedded() && !stageHeader()) {
          <header class="rb-ex-panel__hero rb-ex-panel__hero--compact" [attr.data-result]="ex.result">
            <div class="rb-ex-panel__compact-ring" [attr.data-result]="ex.result" aria-hidden="true">
              <svg viewBox="0 0 36 36">
                <path
                  class="rb-ex-panel__ring-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  class="rb-ex-panel__ring-fill"
                  [attr.stroke-dasharray]="progressPct(ex) + ', 100'"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span class="rb-ex-panel__ring-text">{{ ex.stepsCompleted }}/{{ ex.stepsTotal }}</span>
            </div>
            <div class="rb-ex-panel__compact-main">
              <span class="rb-ex-panel__result" [attr.data-result]="ex.result">
                <mat-icon>{{ resultIcon(ex.result) }}</mat-icon>
                {{ resultLabel(ex.result) }}
              </span>
              <h3 class="rb-ex-panel__title">{{ ex.runbookName }}</h3>
              <p class="rb-ex-panel__compact-meta mono">
                {{ ex.id }} · {{ ex.duration }} · {{ ex.startedAt | date: 'dd MMM, HH:mm' }}
              </p>
            </div>
            <div class="rb-ex-panel__compact-pct" [attr.data-result]="ex.result">
              <strong>{{ ex.progressPercent ?? progressPct(ex) }}%</strong>
              <span>progreso</span>
            </div>
          </header>
        } @else {
          <header class="rb-ex-panel__hero">
            <div class="rb-ex-panel__hero-top">
              <div class="rb-ex-panel__hero-main">
                <span class="rb-ex-panel__result" [attr.data-result]="ex.result">
                  <mat-icon>{{ resultIcon(ex.result) }}</mat-icon>
                  {{ resultLabel(ex.result) }}
                </span>
                <h3 class="rb-ex-panel__title">{{ ex.runbookName }}</h3>
                <p class="rb-ex-panel__id mono">{{ ex.id }}</p>
              </div>
              <div class="rb-ex-panel__hero-side">
                <div class="rb-ex-panel__ring" [attr.data-result]="ex.result">
                  <svg viewBox="0 0 36 36" aria-hidden="true">
                    <path
                      class="rb-ex-panel__ring-bg"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      class="rb-ex-panel__ring-fill"
                      [attr.stroke-dasharray]="progressPct(ex) + ', 100'"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span class="rb-ex-panel__ring-text">{{ ex.stepsCompleted }}/{{ ex.stepsTotal }}</span>
                </div>
                <span class="rb-ex-panel__duration">{{ ex.duration }}</span>
              </div>
            </div>
          </header>
        }

        <nav
          class="rb-ex-panel__tabs"
          [class.rb-ex-panel__tabs--segmented]="embedded()"
          role="tablist"
          aria-label="Secciones del registro"
        >
          <button
            type="button"
            role="tab"
            class="rb-ex-panel__tab"
            [class.rb-ex-panel__tab--on]="activeTab() === 'resumen'"
            [attr.aria-selected]="activeTab() === 'resumen'"
            (click)="activeTab.set('resumen')"
          >
            <mat-icon>dashboard</mat-icon>
            Resumen
          </button>
          <button
            type="button"
            role="tab"
            class="rb-ex-panel__tab"
            [class.rb-ex-panel__tab--on]="activeTab() === 'pasos'"
            [attr.aria-selected]="activeTab() === 'pasos'"
            (click)="activeTab.set('pasos')"
          >
            <mat-icon>format_list_numbered</mat-icon>
            Pasos
            <span class="rb-ex-panel__tab-count">{{ stepCount() }}</span>
          </button>
          <button
            type="button"
            role="tab"
            class="rb-ex-panel__tab"
            [class.rb-ex-panel__tab--on]="activeTab() === 'registro'"
            [attr.aria-selected]="activeTab() === 'registro'"
            (click)="activeTab.set('registro')"
          >
            <mat-icon>terminal</mat-icon>
            Registro
          </button>
        </nav>

        <div
          class="rb-ex-panel__body"
          [class.rb-ex-panel__body--scroll]="activeTab() !== 'registro'"
          [class.rb-ex-panel__body--log]="activeTab() === 'registro'"
          role="tabpanel"
          [attr.aria-label]="activeTab() === 'resumen' ? 'Resumen' : activeTab() === 'pasos' ? 'Pasos' : 'Registro'"
        >
          @if (activeTab() === 'resumen') {
            <div class="rb-ex-panel__tab-pane rb-ex-panel__tab-pane--resumen">
            <article class="rb-ex-panel__card rb-ex-panel__card--result" [attr.data-result]="ex.result">
              <h4><mat-icon>flag</mat-icon> Resultado</h4>
              <div class="rb-ex-panel__progress-block rb-ex-panel__progress-block--full">
                <div class="rb-ex-panel__progress-head">
                  <span>Progreso</span>
                  <strong>{{ ex.stepsCompleted }}/{{ ex.stepsTotal }} ({{ ex.progressPercent ?? progressPct(ex) }}%)</strong>
                </div>
                <div class="rb-ex-panel__progress-bar" [attr.data-result]="ex.result">
                  <span [style.width.%]="ex.progressPercent ?? progressPct(ex)"></span>
                </div>
              </div>
              <p class="rb-ex-panel__failure-summary">{{ ex.failureSummary }}</p>
            </article>

            @if (ex.runbookDescription) {
              <article class="rb-ex-panel__card rb-ex-panel__card--runbook">
                <h4><mat-icon>auto_stories</mat-icon> Runbook</h4>
                <p class="rb-ex-panel__runbook-desc">{{ ex.runbookDescription }}</p>
                <dl class="rb-ex-panel__runbook-meta" [class.rb-ex-panel__runbook-meta--compact]="embedded()">
                  @if (ex.category) {
                    <div>
                      <dt>Categoría</dt>
                      <dd>{{ categoryLabel(ex.category) }}</dd>
                    </div>
                  }
                  @if (ex.runbookOwner) {
                    <div>
                      <dt>Propietario</dt>
                      <dd>{{ ex.runbookOwner }}</dd>
                    </div>
                  }
                  @if (ex.runbookTrigger) {
                    <div>
                      <dt>Disparador tipo</dt>
                      <dd>{{ triggerLabel(ex.runbookTrigger) }}</dd>
                    </div>
                  }
                  @if (ex.runbookLinkedTo) {
                    <div>
                      <dt>Vinculado por defecto</dt>
                      <dd class="mono">{{ ex.runbookLinkedTo }}</dd>
                    </div>
                  }
                  @if (ex.runbookAvgDuration) {
                    <div>
                      <dt>Duración habitual</dt>
                      <dd>{{ ex.runbookAvgDuration }}</dd>
                    </div>
                  }
                  @if (ex.runbookSuccessRate != null) {
                    <div>
                      <dt>Tasa éxito runbook</dt>
                      <dd>{{ ex.runbookSuccessRate }}%</dd>
                    </div>
                  }
                </dl>
                @if (ex.runbookTags?.length) {
                  <div class="rb-ex-panel__tags">
                    @for (tag of ex.runbookTags; track tag) {
                      <span>{{ tag }}</span>
                    }
                  </div>
                }
                @if (ex.runbookRequiresApproval) {
                  <p class="rb-ex-panel__approval-flag">
                    <mat-icon>verified_user</mat-icon>
                    Este runbook requiere aprobación previa
                  </p>
                }
              </article>
            }

            @if (embedded()) {
              <article class="rb-ex-panel__card rb-ex-panel__card--quick">
                <h4><mat-icon>info</mat-icon> Detalle rápido</h4>
                <dl class="rb-ex-panel__quick-facts">
                  <div>
                    <dt>Inicio</dt>
                    <dd>{{ ex.startedAt | date: 'dd MMM, HH:mm' }}</dd>
                  </div>
                  <div>
                    <dt>Objetivo</dt>
                    <dd class="mono">{{ ex.target }}</dd>
                  </div>
                  @if (ex.environment) {
                    <div>
                      <dt>Entorno</dt>
                      <dd>{{ ex.environment }}</dd>
                    </div>
                  }
                  <div>
                    <dt>Ejecutado por</dt>
                    <dd>{{ ex.triggeredBy }}</dd>
                  </div>
                  @if (ex.provider) {
                    <div>
                      <dt>Proveedor</dt>
                      <dd>{{ ex.provider }}</dd>
                    </div>
                  }
                  @if (ex.finishedAt) {
                    <div>
                      <dt>Fin</dt>
                      <dd>{{ ex.finishedAt | date: 'dd MMM, HH:mm' }}</dd>
                    </div>
                  }
                  @if (ex.accountName) {
                    <div>
                      <dt>Cuenta</dt>
                      <dd>{{ ex.accountName }}</dd>
                    </div>
                  }
                  @if (ex.region) {
                    <div>
                      <dt>Región</dt>
                      <dd>{{ ex.region }}</dd>
                    </div>
                  }
                  @if (ex.correlationId) {
                    <div>
                      <dt>Correlación</dt>
                      <dd class="mono">{{ ex.correlationId }}</dd>
                    </div>
                  }
                </dl>
              </article>
            } @else {
            <div class="rb-ex-panel__grid">
              <article class="rb-ex-panel__card">
                <h4><mat-icon>schedule</mat-icon> Tiempos</h4>
                <dl>
                  <div>
                    <dt>Inicio</dt>
                    <dd>{{ ex.startedAt | date: 'dd MMM yyyy, HH:mm:ss' }}</dd>
                  </div>
                  @if (ex.finishedAt) {
                    <div>
                      <dt>Fin</dt>
                      <dd>{{ ex.finishedAt | date: 'dd MMM yyyy, HH:mm:ss' }}</dd>
                    </div>
                  }
                  <div>
                    <dt>Duración total</dt>
                    <dd><strong>{{ ex.duration }}</strong></dd>
                  </div>
                  @if (ex.correlationId) {
                    <div>
                      <dt>ID correlación</dt>
                      <dd class="mono">{{ ex.correlationId }}</dd>
                    </div>
                  }
                </dl>
              </article>
              <article class="rb-ex-panel__card">
                <h4><mat-icon>dns</mat-icon> Infraestructura</h4>
                <dl>
                  <div class="rb-ex-panel__full">
                    <dt>Objetivo</dt>
                    <dd class="mono">{{ ex.target }}</dd>
                  </div>
                  @if (ex.instanceId) {
                    <div>
                      <dt>ID instancia</dt>
                      <dd class="mono">{{ ex.instanceId }}</dd>
                    </div>
                  }
                  @if (ex.provider) {
                    <div>
                      <dt>Proveedor</dt>
                      <dd>
                        <span class="rb-ex-panel__prov" [attr.data-provider]="ex.provider">{{ ex.provider }}</span>
                      </dd>
                    </div>
                  }
                  @if (ex.accountName) {
                    <div>
                      <dt>Cuenta cloud</dt>
                      <dd>{{ ex.accountName }}</dd>
                    </div>
                  }
                  @if (ex.region) {
                    <div>
                      <dt>Región</dt>
                      <dd>{{ ex.region }}</dd>
                    </div>
                  }
                </dl>
              </article>
              <article class="rb-ex-panel__card">
                <h4><mat-icon>person</mat-icon> Contexto de ejecución</h4>
                <dl>
                  <div>
                    <dt>Disparado por</dt>
                    <dd>{{ ex.triggeredBy }}</dd>
                  </div>
                  @if (ex.environment) {
                    <div>
                      <dt>Entorno</dt>
                      <dd>{{ ex.environment }}</dd>
                    </div>
                  }
                  @if (ex.category) {
                    <div>
                      <dt>Categoría</dt>
                      <dd>{{ categoryLabel(ex.category) }}</dd>
                    </div>
                  }
                  <div>
                    <dt>Runbook ID</dt>
                    <dd class="mono">{{ ex.runbookId }}</dd>
                  </div>
                  <div>
                    <dt>ID ejecución</dt>
                    <dd class="mono">{{ ex.id }}</dd>
                  </div>
                </dl>
              </article>
              @if (ex.dryRun || ex.note || ex.notifyOnComplete) {
                <article class="rb-ex-panel__card rb-ex-panel__card--flags">
                  <h4><mat-icon>tune</mat-icon> Opciones</h4>
                  <ul>
                    @if (ex.dryRun) {
                      <li><mat-icon>science</mat-icon> Dry-run (simulación)</li>
                    }
                    @if (ex.notifyOnComplete) {
                      <li><mat-icon>campaign</mat-icon> Notificación enviada</li>
                    }
                    @if (ex.note) {
                      <li><mat-icon>sticky_note_2</mat-icon> {{ ex.note }}</li>
                    }
                  </ul>
                </article>
              }
            </div>
            }
            <p class="rb-ex-panel__excerpt">
              <mat-icon>short_text</mat-icon>
              <span><strong>Extracto del log:</strong> {{ ex.logExcerpt }}</span>
            </p>
            </div>
          }

          @if (activeTab() === 'pasos') {
            <div class="rb-ex-panel__tab-pane rb-ex-panel__tab-pane--pasos">
            @if (stepLogs().length) {
              <p class="rb-ex-panel__tab-intro">
                {{ stepLogs().length }} pasos registrados · resultado global {{ resultLabel(ex.result) }}
              </p>
              <ol class="rb-ex-panel__timeline">
                @for (step of stepLogs(); track step.order; let last = $last) {
                  <li class="rb-ex-panel__step" [attr.data-status]="step.status" [class.rb-ex-panel__step--last]="last">
                    <div class="rb-ex-panel__step-rail">
                      <span class="rb-ex-panel__step-dot">
                        <mat-icon>{{ stepTypeIcon(step.type) }}</mat-icon>
                      </span>
                      @if (!last) {
                        <span class="rb-ex-panel__step-line" aria-hidden="true"></span>
                      }
                    </div>
                    <div class="rb-ex-panel__step-card">
                      <div class="rb-ex-panel__step-top">
                        <strong>Paso {{ step.order }} — {{ step.title }}</strong>
                        <span class="rb-ex-panel__step-badge">{{ stepStatusLabel(step.status) }}</span>
                        @if (step.duration) {
                          <span class="rb-ex-panel__step-dur">{{ step.duration }}</span>
                        }
                      </div>
                      <span class="rb-ex-panel__step-type">{{ stepTypeLabel(step.type) }}</span>
                      @if (step.command) {
                        <pre class="rb-ex-panel__cmd mono">$ {{ step.command }}</pre>
                      }
                      @if (step.output) {
                        <pre class="rb-ex-panel__out mono">{{ step.output }}</pre>
                      }
                    </div>
                  </li>
                }
              </ol>
            } @else {
              <p class="rb-ex-panel__empty">Sin detalle de pasos para esta ejecución.</p>
            }
            </div>
          }

          @if (activeTab() === 'registro') {
            <div class="rb-ex-panel__tab-pane rb-ex-panel__tab-pane--registro">
            <div class="rb-ex-panel__log-toolbar">
              <span>{{ logLines().length }} líneas · desplaza para ver todo</span>
              <div class="rb-ex-panel__log-actions">
                @if (!embedded()) {
                  <button type="button" class="rb-ex-panel__log-btn" (click)="logExpanded.set(!logExpanded())">
                    <mat-icon>{{ logExpanded() ? 'unfold_less' : 'unfold_more' }}</mat-icon>
                    {{ logExpanded() ? 'Compactar' : 'Expandir' }}
                  </button>
                }
                <button type="button" class="rb-ex-panel__log-btn" (click)="copyLog()">
                  <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
                  {{ copied() ? 'Copiado' : 'Copiar todo' }}
                </button>
              </div>
            </div>
            <div
              class="rb-ex-panel__log-view"
              [class.rb-ex-panel__log-view--compact]="!logExpanded() && !embedded()"
              [class.rb-ex-panel__log-view--embedded]="embedded()"
            >
              @for (line of logLines(); track $index) {
                <div class="rb-ex-panel__log-line">
                  <span class="rb-ex-panel__ln">{{ $index + 1 }}</span>
                  <span class="rb-ex-panel__lc" [class.rb-ex-panel__lc--sep]="line.startsWith('—')">{{ line || ' ' }}</span>
                </div>
              }
            </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      width: 100%;
    }
    .rb-ex-panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      color: #111;
    }
    .rb-ex-panel__hero {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      padding: 0.85rem 1rem;
      border-radius: 14px;
      background: linear-gradient(
        145deg,
        color-mix(in srgb, #844fba 10%, #fff) 0%,
        color-mix(in srgb, #111 2%, #fff) 48%,
        #fff 100%
      );
      border: 1px solid color-mix(in srgb, #844fba 20%, transparent);
      box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 80%, transparent);
      flex-shrink: 0;
    }
    .rb-ex-panel__hero-top {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .rb-ex-panel__kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.45rem;
      padding-top: 0.55rem;
      border-top: 1px dashed color-mix(in srgb, #844fba 22%, transparent);
    }
    .rb-ex-panel__kpi {
      display: grid;
      grid-template-columns: auto 1fr;
      grid-template-rows: auto auto;
      gap: 0.05rem 0.4rem;
      padding: 0.45rem 0.55rem;
      border-radius: 10px;
      background: color-mix(in srgb, #fff 70%, transparent);
      border: 1px solid color-mix(in srgb, #111 6%, transparent);
    }
    .rb-ex-panel__kpi mat-icon {
      grid-row: 1 / span 2;
      align-self: center;
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: #844fba;
    }
    .rb-ex-panel__kpi-label {
      font-size: 0.58rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }
    .rb-ex-panel__kpi strong {
      grid-column: 2;
      font-size: 0.72rem;
      font-weight: 700;
      color: #111;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rb-ex-panel__title {
      margin: 0.3rem 0 0.1rem;
      font-size: 1.05rem;
      font-weight: 700;
    }
    .rb-ex-panel__id {
      margin: 0;
      font-size: 0.65rem;
      color: #64748b;
    }
    .rb-ex-panel__result {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.18rem 0.5rem;
      border-radius: 999px;
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    .rb-ex-panel__result[data-result='success'] {
      background: color-mix(in srgb, #22c55e 16%, transparent);
      color: #15803d;
    }
    .rb-ex-panel__result[data-result='warning'] {
      background: color-mix(in srgb, #f59e0b 16%, transparent);
      color: #b45309;
    }
    .rb-ex-panel__result[data-result='error'] {
      background: color-mix(in srgb, #ef4444 16%, transparent);
      color: #b91c1c;
    }
    .rb-ex-panel__result mat-icon {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
    }
    .rb-ex-panel__hero-side {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }
    .rb-ex-panel__ring {
      position: relative;
      width: 4rem;
      height: 4rem;
    }
    .rb-ex-panel__ring svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .rb-ex-panel__ring-bg {
      fill: none;
      stroke: color-mix(in srgb, #111 10%, transparent);
      stroke-width: 3;
    }
    .rb-ex-panel__ring-fill {
      fill: none;
      stroke: #844fba;
      stroke-width: 3;
      stroke-linecap: round;
    }
    .rb-ex-panel__ring[data-result='success'] .rb-ex-panel__ring-fill {
      stroke: #22c55e;
    }
    .rb-ex-panel__ring[data-result='warning'] .rb-ex-panel__ring-fill {
      stroke: #f59e0b;
    }
    .rb-ex-panel__ring[data-result='error'] .rb-ex-panel__ring-fill {
      stroke: #ef4444;
    }
    .rb-ex-panel__ring-text {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      font-size: 0.68rem;
      font-weight: 800;
    }
    .rb-ex-panel__duration {
      font-size: 0.72rem;
      font-weight: 700;
      color: #64748b;
    }
    .rb-ex-panel__tabs {
      display: flex;
      gap: 0;
      margin: 0;
      padding: 0;
      border-bottom: 1px solid color-mix(in srgb, #111 8%, transparent);
      flex-shrink: 0;
    }
    .rb-ex-panel__tab {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      padding: 0.55rem 0.65rem;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      border-radius: 0;
      background: transparent;
      font: inherit;
      font-size: 0.74rem;
      font-weight: 650;
      color: #64748b;
      cursor: pointer;
      transition: color 0.15s ease, border-color 0.15s ease;
    }
    .rb-ex-panel__tab mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .rb-ex-panel__tab--on {
      color: #844fba;
      border-bottom-color: #844fba;
      font-weight: 700;
    }
    .rb-ex-panel__tab:hover:not(.rb-ex-panel__tab--on) {
      color: #334155;
      background: color-mix(in srgb, #111 3%, transparent);
    }
    .rb-ex-panel__tab-count {
      padding: 0 0.3rem;
      border-radius: 4px;
      font-size: 0.58rem;
      font-weight: 800;
      background: color-mix(in srgb, #844fba 12%, transparent);
    }
    .rb-ex-panel__body {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .rb-ex-panel__body--scroll {
      overflow-x: hidden;
      overflow-y: auto;
      padding: 0.55rem 0.5rem 1.5rem 0.35rem;
      scroll-padding-bottom: 1rem;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: color-mix(in srgb, #7c3aed 45%, #cbd5e1) transparent;
    }
    .rb-ex-panel__body--scroll::-webkit-scrollbar {
      width: 8px;
    }
    .rb-ex-panel__body--scroll::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: color-mix(in srgb, #7c3aed 40%, #cbd5e1);
    }
    .rb-ex-panel__body--scroll::-webkit-scrollbar-track {
      background: color-mix(in srgb, #111 4%, transparent);
      border-radius: 999px;
    }
    .rb-ex-panel__body--log {
      overflow: hidden;
      padding: 0.45rem 0.45rem 0.5rem;
    }
    .rb-ex-panel__tab-pane--pasos,
    .rb-ex-panel__tab-pane--resumen {
      min-height: min-content;
    }
    .rb-ex-panel__tab-pane--registro {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .rb-ex-panel__tab-pane--registro .rb-ex-panel__log-toolbar {
      flex-shrink: 0;
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 0.35rem 0.4rem;
      margin-bottom: 0.4rem;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .rb-ex-panel__tab-pane--registro .rb-ex-panel__log-view {
      flex: 1;
      min-height: 0;
      max-height: none;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: #64748b #0c1222;
    }
    .rb-ex-panel__tab-pane--registro .rb-ex-panel__log-view::-webkit-scrollbar {
      width: 8px;
    }
    .rb-ex-panel__tab-pane--registro .rb-ex-panel__log-view::-webkit-scrollbar-thumb {
      background: #475569;
      border-radius: 4px;
    }
    .rb-ex-panel--embedded {
      flex: 1;
      min-height: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
    .rb-ex-panel__hero--compact {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 0.55rem 0.75rem;
      padding: 0.65rem 0.8rem;
      border-radius: 12px;
      flex-shrink: 0;
      border: 1px solid color-mix(in srgb, #844fba 22%, transparent);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, #844fba 9%, #fff) 0%,
        #fff 55%,
        color-mix(in srgb, #111 2%, #fff) 100%
      );
      box-shadow: 0 2px 12px color-mix(in srgb, #844fba 8%, transparent);
    }
    .rb-ex-panel__hero--compact[data-result='success'] {
      border-color: color-mix(in srgb, #22c55e 28%, transparent);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, #22c55e 8%, #fff) 0%,
        #fff 60%
      );
    }
    .rb-ex-panel__hero--compact[data-result='warning'] {
      border-color: color-mix(in srgb, #f59e0b 28%, transparent);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, #f59e0b 8%, #fff) 0%,
        #fff 60%
      );
    }
    .rb-ex-panel__hero--compact[data-result='error'] {
      border-color: color-mix(in srgb, #ef4444 28%, transparent);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, #ef4444 8%, #fff) 0%,
        #fff 60%
      );
    }
    .rb-ex-panel__compact-ring {
      position: relative;
      width: 2.85rem;
      height: 2.85rem;
      flex-shrink: 0;
    }
    .rb-ex-panel__compact-ring svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .rb-ex-panel__compact-ring .rb-ex-panel__ring-text {
      font-size: 0.58rem;
    }
    .rb-ex-panel__compact-main {
      min-width: 0;
    }
    .rb-ex-panel__hero--compact .rb-ex-panel__title {
      margin: 0;
      font-size: 0.92rem;
      line-height: 1.25;
      word-break: break-word;
    }
    .rb-ex-panel__compact-meta {
      margin: 0.15rem 0 0;
      font-size: 0.62rem;
      color: #64748b;
      line-height: 1.35;
      word-break: break-word;
    }
    .rb-ex-panel__compact-pct {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.35rem 0.5rem;
      border-radius: 8px;
      background: color-mix(in srgb, #844fba 10%, transparent);
      flex-shrink: 0;
    }
    .rb-ex-panel__compact-pct strong {
      font-size: 1rem;
      font-weight: 800;
      line-height: 1;
      color: #844fba;
    }
    .rb-ex-panel__compact-pct[data-result='success'] strong {
      color: #15803d;
    }
    .rb-ex-panel__compact-pct[data-result='warning'] strong {
      color: #b45309;
    }
    .rb-ex-panel__compact-pct[data-result='error'] strong {
      color: #b91c1c;
    }
    .rb-ex-panel__compact-pct span {
      font-size: 0.52rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .rb-ex-panel--embedded .rb-ex-panel__hero:not(.rb-ex-panel__hero--compact) {
      padding: 0.75rem 0.9rem;
      border-radius: 12px;
      flex-shrink: 0;
    }
    .rb-ex-panel--embedded .rb-ex-panel__title {
      word-break: break-word;
    }
    .rb-ex-panel__tabs--segmented {
      margin: 0.5rem 0 0;
      padding: 0.2rem;
      gap: 0.2rem;
      border: none;
      border-radius: 11px;
      background: color-mix(in srgb, #111 5%, transparent);
    }
    .rb-ex-panel__tabs--segmented .rb-ex-panel__tab {
      flex: 1;
      margin-bottom: 0;
      border: none;
      border-radius: 8px;
      padding: 0.5rem 0.4rem;
      font-size: 0.7rem;
    }
    .rb-ex-panel__tabs--segmented .rb-ex-panel__tab--on {
      background: #fff;
      color: #844fba;
      box-shadow: 0 1px 6px color-mix(in srgb, #111 8%, transparent);
      border-bottom: none;
    }
    .rb-ex-panel--embedded .rb-ex-panel__tabs {
      flex-shrink: 0;
      margin: 0.45rem 0 0;
    }
    .rb-ex-panel__tab-pane {
      min-height: 0;
    }
    .rb-ex-panel__tab-intro {
      margin: 0 0 0.55rem;
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
    }
    .rb-ex-panel__card--result {
      margin-bottom: 0.55rem;
      border-color: color-mix(in srgb, #844fba 18%, transparent);
    }
    .rb-ex-panel__card--result[data-result='success'] {
      border-color: color-mix(in srgb, #22c55e 25%, transparent);
    }
    .rb-ex-panel__card--result[data-result='warning'] {
      border-color: color-mix(in srgb, #f59e0b 25%, transparent);
    }
    .rb-ex-panel__card--result[data-result='error'] {
      border-color: color-mix(in srgb, #ef4444 25%, transparent);
    }
    .rb-ex-panel__result-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .rb-ex-panel__result-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    .rb-ex-panel__result-pill[data-result='success'] {
      background: color-mix(in srgb, #22c55e 16%, transparent);
      color: #15803d;
    }
    .rb-ex-panel__result-pill[data-result='warning'] {
      background: color-mix(in srgb, #f59e0b 16%, transparent);
      color: #b45309;
    }
    .rb-ex-panel__result-pill[data-result='error'] {
      background: color-mix(in srgb, #ef4444 16%, transparent);
      color: #b91c1c;
    }
    .rb-ex-panel__progress-block {
      flex: 1;
      min-width: 180px;
    }
    .rb-ex-panel__progress-head {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.68rem;
      margin-bottom: 0.25rem;
      color: #64748b;
    }
    .rb-ex-panel__progress-head strong {
      color: #111;
      font-weight: 800;
    }
    .rb-ex-panel__progress-bar {
      height: 8px;
      border-radius: 999px;
      background: color-mix(in srgb, #111 8%, transparent);
      overflow: hidden;
    }
    .rb-ex-panel__progress-bar span {
      display: block;
      height: 100%;
      border-radius: 999px;
      background: #844fba;
      transition: width 0.2s ease;
    }
    .rb-ex-panel__progress-bar[data-result='success'] span {
      background: #22c55e;
    }
    .rb-ex-panel__progress-bar[data-result='warning'] span {
      background: #f59e0b;
    }
    .rb-ex-panel__progress-bar[data-result='error'] span {
      background: #ef4444;
    }
    .rb-ex-panel__failure-summary {
      margin: 0;
      font-size: 0.74rem;
      line-height: 1.5;
      color: #334155;
    }
    .rb-ex-panel__card--runbook {
      margin-bottom: 0.55rem;
    }
    .rb-ex-panel__runbook-desc {
      margin: 0 0 0.55rem;
      font-size: 0.76rem;
      line-height: 1.5;
      color: #334155;
    }
    .rb-ex-panel__runbook-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.4rem;
      margin: 0;
    }
    .rb-ex-panel__runbook-meta dt {
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .rb-ex-panel__runbook-meta dd {
      margin: 0.05rem 0 0;
      font-size: 0.72rem;
      font-weight: 650;
    }
    .rb-ex-panel__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: 0.5rem;
    }
    .rb-ex-panel__tags span {
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 600;
      background: color-mix(in srgb, #111 6%, transparent);
      color: #333;
    }
    .rb-ex-panel__approval-flag {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0.5rem 0 0;
      font-size: 0.7rem;
      font-weight: 700;
      color: #b45309;
    }
    .rb-ex-panel__approval-flag mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__tab-pane--resumen {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__tab-pane--pasos {
      padding-bottom: 0.5rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__timeline {
      padding-bottom: 0.25rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__step-card {
      max-width: 100%;
    }
    .rb-ex-panel--embedded .rb-ex-panel__out,
    .rb-ex-panel--embedded .rb-ex-panel__cmd {
      max-height: none;
      overflow: visible;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .rb-ex-panel--embedded .rb-ex-panel__card--result {
      margin-bottom: 0;
      padding: 0.5rem 0.65rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__card--result h4 {
      margin-bottom: 0.35rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__card--runbook {
      margin-bottom: 0;
      padding: 0.5rem 0.65rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__runbook-desc {
      margin-bottom: 0.45rem;
      font-size: 0.74rem;
      line-height: 1.55;
    }
    .rb-ex-panel--embedded .rb-ex-panel__runbook-meta--compact {
      grid-template-columns: 1fr 1fr;
      gap: 0.3rem 0.5rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__runbook-meta--compact dd {
      font-size: 0.68rem;
    }
    .rb-ex-panel__card--quick {
      margin-bottom: 0;
      padding: 0.5rem 0.65rem;
    }
    .rb-ex-panel__card--quick h4 {
      margin-bottom: 0.35rem;
      font-size: 0.65rem;
    }
    .rb-ex-panel__quick-facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.35rem 0.55rem;
      margin: 0;
    }
    .rb-ex-panel__quick-facts dt {
      margin: 0;
      font-size: 0.52rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
    }
    .rb-ex-panel__quick-facts dd {
      margin: 0.1rem 0 0;
      font-size: 0.68rem;
      font-weight: 600;
      color: #334155;
      word-break: break-word;
    }
    .rb-ex-panel--embedded .rb-ex-panel__grid--compact {
      grid-template-columns: 1fr 1fr;
      gap: 0.45rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__grid--compact .rb-ex-panel__card {
      padding: 0.5rem 0.6rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__grid--compact .rb-ex-panel__card h4 {
      margin-bottom: 0.3rem;
      font-size: 0.65rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__grid--compact dt {
      font-size: 0.55rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__grid--compact dd {
      font-size: 0.68rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__failure-summary {
      font-size: 0.7rem;
      margin-top: 0.35rem;
    }
    .rb-ex-panel--embedded .rb-ex-panel__excerpt {
      margin: 0;
      padding: 0.45rem 0.55rem;
      font-size: 0.7rem;
    }
    .rb-ex-panel__scroll-hint {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      margin: 0.15rem 0 0;
      padding: 0.4rem;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: #94a3b8;
      border-radius: 8px;
      background: color-mix(in srgb, #844fba 5%, transparent);
    }
    .rb-ex-panel__scroll-hint mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: #844fba;
      animation: rb-ex-scroll-nudge 2s ease-in-out infinite;
    }
    @keyframes rb-ex-scroll-nudge {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(3px);
      }
    }
    .rb-ex-panel__progress-block--full {
      width: 100%;
      min-width: 0;
    }
    .rb-ex-panel--rex .rb-ex-panel__body--log,
    .rb-ex-panel--embedded .rb-ex-panel__body--log {
      flex: 1;
      min-height: 0;
    }
    .rb-ex-panel--embedded .rb-ex-panel__card {
      border-left: 3px solid color-mix(in srgb, #844fba 35%, transparent);
    }
    .rb-ex-panel--embedded .rb-ex-panel__card--result[data-result='success'] {
      border-left-color: #22c55e;
    }
    .rb-ex-panel--embedded .rb-ex-panel__card--result[data-result='warning'] {
      border-left-color: #f59e0b;
    }
    .rb-ex-panel--embedded .rb-ex-panel__card--result[data-result='error'] {
      border-left-color: #ef4444;
    }
    .rb-ex-panel__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.55rem;
    }
    .rb-ex-panel__card {
      padding: 0.65rem 0.75rem;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, #111 7%, transparent);
      background: var(--app-card, #fff);
      box-shadow:
        0 1px 3px color-mix(in srgb, #111 5%, transparent),
        inset 0 1px 0 color-mix(in srgb, #fff 90%, transparent);
    }
    .rb-ex-panel__card h4 {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0 0 0.45rem;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .rb-ex-panel__card h4 mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: #844fba;
    }
    .rb-ex-panel__card dl {
      margin: 0;
      display: grid;
      gap: 0.35rem;
    }
    .rb-ex-panel__card dt {
      font-size: 0.6rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .rb-ex-panel__card dd {
      margin: 0.05rem 0 0;
      font-size: 0.74rem;
      font-weight: 600;
      word-break: break-word;
    }
    .rb-ex-panel__full {
      grid-column: 1 / -1;
    }
    .rb-ex-panel__prov {
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      font-size: 0.68rem;
      font-weight: 800;
      background: color-mix(in srgb, #f59e0b 12%, transparent);
      color: #b45309;
    }
    .rb-ex-panel__prov[data-provider='GCP'] {
      background: color-mix(in srgb, #22c55e 12%, transparent);
      color: #15803d;
    }
    .rb-ex-panel__prov[data-provider='VPS'] {
      background: color-mix(in srgb, #844fba 12%, transparent);
      color: #844fba;
    }
    .rb-ex-panel__card--flags ul {
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 0.72rem;
    }
    .rb-ex-panel__card--flags li {
      display: flex;
      gap: 0.3rem;
      margin-bottom: 0.25rem;
    }
    .rb-ex-panel__card--flags mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #844fba;
    }
    .rb-ex-panel__excerpt {
      display: flex;
      gap: 0.45rem;
      align-items: flex-start;
      margin: 0.75rem 0 0;
      padding: 0.65rem 0.75rem;
      border-radius: 12px;
      font-size: 0.76rem;
      line-height: 1.5;
      color: #475569;
      background: color-mix(in srgb, #844fba 5%, #fff);
      border-left: 3px solid #844fba;
      border-top: 1px solid color-mix(in srgb, #111 6%, transparent);
      border-right: 1px solid color-mix(in srgb, #111 6%, transparent);
      border-bottom: 1px solid color-mix(in srgb, #111 6%, transparent);
    }
    .rb-ex-panel__excerpt mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: #844fba;
      flex-shrink: 0;
    }
    .rb-ex-panel__timeline {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .rb-ex-panel__step {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.65rem;
      padding-bottom: 0.25rem;
    }
    .rb-ex-panel__step-rail {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 2.25rem;
    }
    .rb-ex-panel__step-dot {
      display: grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 10px;
      background: color-mix(in srgb, #22c55e 14%, transparent);
      color: #15803d;
      flex-shrink: 0;
      z-index: 1;
    }
    .rb-ex-panel__step[data-status='warning'] .rb-ex-panel__step-dot {
      background: color-mix(in srgb, #f59e0b 14%, transparent);
      color: #b45309;
    }
    .rb-ex-panel__step[data-status='error'] .rb-ex-panel__step-dot {
      background: color-mix(in srgb, #ef4444 14%, transparent);
      color: #b91c1c;
    }
    .rb-ex-panel__step[data-status='skipped'] .rb-ex-panel__step-dot {
      background: color-mix(in srgb, #111 8%, transparent);
      color: #64748b;
    }
    .rb-ex-panel__step-dot mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .rb-ex-panel__step-line {
      flex: 1;
      width: 2px;
      min-height: 1rem;
      margin-top: 0.2rem;
      background: color-mix(in srgb, #111 12%, transparent);
    }
    .rb-ex-panel__step-card {
      padding: 0.55rem 0.65rem;
      margin-bottom: 0.5rem;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, #111 7%, transparent);
      background: var(--app-elevated, #fff);
    }
    .rb-ex-panel__step-top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.25rem;
    }
    .rb-ex-panel__step-top strong {
      font-size: 0.78rem;
      flex: 1;
      min-width: 140px;
    }
    .rb-ex-panel__step-badge {
      font-size: 0.58rem;
      font-weight: 800;
      text-transform: uppercase;
      padding: 0.12rem 0.35rem;
      border-radius: 4px;
      background: color-mix(in srgb, #22c55e 12%, transparent);
      color: #15803d;
    }
    .rb-ex-panel__step[data-status='warning'] .rb-ex-panel__step-badge {
      background: color-mix(in srgb, #f59e0b 12%, transparent);
      color: #b45309;
    }
    .rb-ex-panel__step[data-status='error'] .rb-ex-panel__step-badge {
      background: color-mix(in srgb, #ef4444 12%, transparent);
      color: #b91c1c;
    }
    .rb-ex-panel__step-dur {
      font-size: 0.62rem;
      color: #64748b;
      font-weight: 600;
    }
    .rb-ex-panel__step-type {
      display: inline-block;
      font-size: 0.6rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 0.25rem;
    }
    .rb-ex-panel__cmd {
      margin: 0 0 0.35rem;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      background: #1e293b;
      color: #a5f3fc;
      font-size: 0.66rem;
    }
    .rb-ex-panel__out {
      margin: 0;
      padding: 0.4rem 0.5rem;
      border-radius: 6px;
      background: color-mix(in srgb, #111 4%, transparent);
      font-size: 0.65rem;
      line-height: 1.45;
      white-space: pre-wrap;
      color: #334155;
    }
    .rb-ex-panel__log-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.45rem;
      font-size: 0.68rem;
      font-weight: 600;
      color: #64748b;
    }
    .rb-ex-panel__log-actions {
      display: flex;
      gap: 0.3rem;
    }
    .rb-ex-panel__log-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.28rem 0.5rem;
      border: 1px solid color-mix(in srgb, #111 10%, transparent);
      border-radius: 8px;
      background: #fff;
      font: inherit;
      font-size: 0.65rem;
      font-weight: 600;
      cursor: pointer;
      color: #333;
    }
    .rb-ex-panel__log-btn mat-icon {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
    }
    .rb-ex-panel__log-view {
      border-radius: 10px;
      background: #0c1222;
      border: 1px solid #1e293b;
      max-height: min(50vh, 420px);
      overflow: auto;
      scrollbar-width: thin;
      font-size: 0.68rem;
    }
    .rb-ex-panel__log-view--compact {
      max-height: 200px;
    }
    .rb-ex-panel__log-line {
      display: grid;
      grid-template-columns: 2.5rem 1fr;
      gap: 0.5rem;
      padding: 0.15rem 0.5rem;
      border-bottom: 1px solid color-mix(in srgb, #fff 4%, transparent);
    }
    .rb-ex-panel__log-line:hover {
      background: color-mix(in srgb, #fff 4%, transparent);
    }
    .rb-ex-panel__ln {
      text-align: right;
      color: #64748b;
      user-select: none;
      font-variant-numeric: tabular-nums;
    }
    .rb-ex-panel__lc {
      color: #cbd5e1;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .rb-ex-panel__lc--sep {
      color: #475569;
    }
    .rb-ex-panel__empty {
      text-align: center;
      padding: 2rem 1rem;
      color: #64748b;
      font-size: 0.8rem;
    }
    .rb-ex-panel--rex {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      border-radius: 14px;
      border: 1px solid color-mix(in srgb, #7c3aed 12%, #e2e8f0);
      background: #fff;
      box-shadow: 0 2px 12px color-mix(in srgb, #7c3aed 6%, transparent);
      overflow: hidden;
    }
    .rb-ex-panel--rex .rb-ex-panel__tabs {
      margin: 0;
      padding: 0.4rem 0.5rem 0;
      border-bottom: 1px solid #e2e8f0;
      background: color-mix(in srgb, #7c3aed 4%, #f8fafc);
    }
    .rb-ex-panel--rex .rb-ex-panel__tabs--segmented {
      padding: 0.35rem;
      gap: 0.25rem;
      background: color-mix(in srgb, #7c3aed 5%, #f1f5f9);
    }
    .rb-ex-panel--rex .rb-ex-panel__tab--on {
      color: #7c3aed;
      border-bottom-color: transparent;
    }
    .rb-ex-panel--rex .rb-ex-panel__tabs--segmented .rb-ex-panel__tab--on {
      color: #7c3aed;
      background: #fff;
      box-shadow: 0 1px 4px color-mix(in srgb, #7c3aed 10%, transparent);
    }
    .rb-ex-panel--rex .rb-ex-panel__tab-count {
      background: color-mix(in srgb, #7c3aed 14%, #ede9fe);
      color: #6d28d9;
    }
    .rb-ex-panel--rex .rb-ex-panel__body--scroll {
      padding: 0.65rem 0.55rem 1.5rem;
      background: #fff;
      scrollbar-color: color-mix(in srgb, #7c3aed 40%, #cbd5e1) #f8fafc;
    }
    .rb-ex-panel--rex .rb-ex-panel__body--scroll::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, #7c3aed 45%, #cbd5e1);
    }
    .rb-ex-panel--rex .rb-ex-panel__body--log {
      padding: 0.5rem;
    }
    .rb-ex-panel--rex .rb-ex-panel__tab-pane--registro .rb-ex-panel__log-view {
      flex: 1;
      min-height: 0;
      max-height: none;
    }
    .rb-ex-panel--rex .rb-ex-panel__tabs {
      flex-shrink: 0;
    }
    .rb-ex-panel--rex .rb-ex-panel__card {
      border-left: 3px solid #8b5cf6;
      background: #fafafa;
      border-color: #e2e8f0;
      border-left-color: #8b5cf6;
    }
    .rb-ex-panel--rex .rb-ex-panel__card h4 mat-icon {
      color: #7c3aed;
    }
    .rb-ex-panel--rex .rb-ex-panel__card--result[data-result='success'] {
      border-left-color: #10b981;
    }
    .rb-ex-panel--rex .rb-ex-panel__card--result[data-result='warning'] {
      border-left-color: #f59e0b;
    }
    .rb-ex-panel--rex .rb-ex-panel__card--result[data-result='error'] {
      border-left-color: #ef4444;
    }
    .rb-ex-panel--rex .rb-ex-panel__progress-bar span {
      background: #8b5cf6;
    }
    .rb-ex-panel--rex .rb-ex-panel__progress-bar[data-result='success'] span {
      background: #10b981;
    }
    .rb-ex-panel--rex .rb-ex-panel__progress-bar[data-result='warning'] span {
      background: #f59e0b;
    }
    .rb-ex-panel--rex .rb-ex-panel__progress-bar[data-result='error'] span {
      background: #ef4444;
    }
    .rb-ex-panel--rex .rb-ex-panel__excerpt {
      background: color-mix(in srgb, #7c3aed 5%, #fff);
      border-left-color: #8b5cf6;
      border-color: color-mix(in srgb, #7c3aed 12%, #e2e8f0);
    }
    .rb-ex-panel--rex .rb-ex-panel__excerpt mat-icon {
      color: #7c3aed;
    }
    .rb-ex-panel--rex .rb-ex-panel__tags span {
      background: #e2e8f0;
      color: #334155;
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
  `,
})
export class RunbookExecutionDetailPanelComponent {
  readonly execution = input.required<RunbookExecution>()
  readonly runbook = input<Runbook | null>(null)
  readonly embedded = input(false)
  /** Cabecera en el panel padre (workspace rex); solo pestañas + contenido aquí */
  readonly stageHeader = input(false)

  readonly activeTab = signal<ExecutionDetailTab>('resumen')
  readonly logExpanded = signal(true)
  readonly copied = signal(false)

  readonly stepLogs = computed(() => {
    const ex = this.execution()
    if (ex.stepLogs?.length) return ex.stepLogs
    const rb = this.runbook()
    if (!rb?.steps.length) return []
    return buildExecutionStepLogs(
      rb,
      ex.stepsCompleted,
      ex.stepsTotal,
      ex.result,
      ex.dryRun,
    )
  })

  readonly stepCount = computed(() => {
    const ex = this.execution()
    return this.stepLogs().length || ex.stepsTotal || 0
  })

  readonly fullLog = computed(
    () => this.execution().fullLog ?? this.execution().logExcerpt,
  )

  readonly logLines = computed(() => this.fullLog().split('\n'))

  progressPct = (ex: RunbookExecution): number => {
    if (!ex.stepsTotal) return 0
    return Math.round((ex.stepsCompleted / ex.stepsTotal) * 100)
  }

  resultLabel = (r: RunbookExecution['result']): string => RUNBOOK_EXECUTION_RESULT_LABELS[r]

  resultIcon = (r: RunbookExecution['result']): string => {
    if (r === 'success') return 'check_circle'
    if (r === 'warning') return 'warning'
    return 'error'
  }

  categoryLabel = (cat: Runbook['category']): string => RUNBOOK_CATEGORY_LABELS[cat]

  triggerLabel = (t: Runbook['trigger']): string => RUNBOOK_TRIGGER_LABELS[t]

  stepTypeIcon = (type: string): string => STEP_TYPE_ICON[type] ?? 'chevron_right'

  stepTypeLabel = (type: RunbookExecutionStepLog['type']): string =>
    RUNBOOK_STEP_TYPE_LABELS[type] ?? type

  stepStatusLabel = (status: RunbookExecutionStepLog['status']): string =>
    STEP_STATUS_LABEL[status] ?? status

  copyLog = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(this.fullLog())
      this.copied.set(true)
      window.setTimeout(() => this.copied.set(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }
}
