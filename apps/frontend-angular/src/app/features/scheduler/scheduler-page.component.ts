import { DatePipe } from '@angular/common'
import { Component, computed, effect, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import {
  defaultSchedulerHistory,
  defaultSchedulerTasks,
  SCHEDULER_RESULT_LABELS,
  SCHEDULER_STATUS_LABELS,
  SCHEDULER_TYPE_LABELS,
  type SchedulerRunHistory,
  type SchedulerRunResult,
  type SchedulerTask,
  type SchedulerTaskStatus,
  type SchedulerTaskType,
} from './scheduler.demo'
import { MatDialog } from '@angular/material/dialog'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { ToastService } from '../../core/services/toast.service'
import { SchedulerRunDialogComponent } from './scheduler-run-dialog.component'
import { ProConfigGateComponent } from '../../shared/components/pro-config-gate/pro-config-gate.component'
import { SchedulerTaskFormDialogComponent, type SchedulerTaskFormDialogResult } from './scheduler-task-form-dialog.component'
import {
  buildHistoryFromRun,
  ENVIRONMENT_LABELS,
  PRIORITY_LABELS,
  RETRY_BACKOFF_LABELS,
  TIMEOUT_ACTION_LABELS,
  simulateRunOutput,
  type SchedulerRunOptions,
} from './scheduler.util'

type SchedulerView = 'tasks' | 'history' | 'upcoming'

const TYPE_ICON: Record<SchedulerTaskType, string> = {
  instance: 'dns',
  jenkins: 'build',
  ssh: 'terminal',
  backup: 'backup',
  sync: 'sync',
  report: 'assessment',
  docker: 'view_in_ar',
  runbook: 'auto_stories',
}

@Component({
  selector: 'app-scheduler-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, MatButtonModule, MatIconModule, ProConfigGateComponent],
  template: `
    <app-pro-config-gate module="Programador">
    <div class="page-container sched-page animate-fade-in">
      <div class="sched-bar">
        <nav class="sched-views" role="tablist" aria-label="Vistas del programador">
        <button
          type="button"
          role="tab"
          class="sched-views__tab"
          [class.sched-views__tab--on]="view() === 'tasks'"
          [attr.aria-selected]="view() === 'tasks'"
          (click)="view.set('tasks')"
        >
          <mat-icon>event_repeat</mat-icon>
          Tareas
          <span class="sched-views__count">{{ tasks().length }}</span>
        </button>
        <button
          type="button"
          role="tab"
          class="sched-views__tab"
          [class.sched-views__tab--on]="view() === 'upcoming'"
          [attr.aria-selected]="view() === 'upcoming'"
          (click)="view.set('upcoming')"
        >
          <mat-icon>schedule</mat-icon>
          Próximas 24h
          <span class="sched-views__count">{{ upcoming24h().length }}</span>
        </button>
        <button
          type="button"
          role="tab"
          class="sched-views__tab"
          [class.sched-views__tab--on]="view() === 'history'"
          [attr.aria-selected]="view() === 'history'"
          (click)="view.set('history')"
        >
          <mat-icon>history</mat-icon>
          Historial
          <span class="sched-views__count">{{ history().length }}</span>
        </button>
        </nav>

        <div class="sched-bar__actions">
          <button type="button" class="sched-btn sched-btn--primary" (click)="handleNew()">
            <mat-icon>add</mat-icon>
            Nueva
          </button>
          <button type="button" class="sched-btn" (click)="openExecute()">
            <mat-icon>play_arrow</mat-icon>
            Ejecutar ahora
          </button>
          <button type="button" class="sched-btn" (click)="handlePauseAll()">
            <mat-icon>pause</mat-icon>
            Pausar todas
          </button>
        </div>
      </div>

      @if (view() === 'history') {
        <section class="sched-history app-section-panel">
          <div class="sched-history__toolbar">
            <label class="sched-search">
              <mat-icon>search</mat-icon>
              <input
                type="search"
                [formControl]="searchControl"
                placeholder="Buscar tarea, salida o resultado…"
                aria-label="Buscar en historial"
              />
            </label>
          </div>
          <div class="sched-history__table-wrap">
            <table class="sched-table">
              <thead>
                <tr>
                  <th>Tarea</th>
                  <th>Tipo</th>
                  <th>Ejecutada</th>
                  <th>Duración</th>
                  <th>Resultado</th>
                  <th>Salida</th>
                </tr>
              </thead>
              <tbody>
                @for (run of filteredHistory(); track run.id) {
                  <tr (click)="selectTaskById(run.taskId)" class="sched-table__row--click">
                    <td><strong>{{ run.taskName }}</strong></td>
                    <td>{{ typeLabel(run.type) }}</td>
                    <td class="mono">{{ run.executedAt | date: 'dd MMM, HH:mm' }}</td>
                    <td>{{ run.duration }}</td>
                    <td>
                      <span class="sched-pill" [attr.data-result]="run.result">{{ resultLabel(run.result) }}</span>
                    </td>
                    <td class="sched-table__output">{{ run.output }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      } @else {
        <div class="sched-workspace">
          <aside class="sched-rail">
            <div class="sched-rail__toolbar">
              @if (view() === 'tasks') {
                <label class="sched-search">
                  <mat-icon>search</mat-icon>
                  <input
                    type="search"
                    [formControl]="searchControl"
                    placeholder="Nombre, objetivo, responsable…"
                    aria-label="Buscar tareas"
                  />
                </label>
                <div class="sched-filters" role="group" aria-label="Filtrar por tipo">
                  <button
                    type="button"
                    class="sched-filter"
                    [class.sched-filter--on]="typeFilter() === 'all'"
                    (click)="typeFilter.set('all')"
                  >
                    Todas
                  </button>
                  @for (t of taskTypes; track t) {
                    <button
                      type="button"
                      class="sched-filter"
                      [class.sched-filter--on]="typeFilter() === t"
                      (click)="typeFilter.set(t)"
                    >
                      {{ typeLabel(t) }}
                    </button>
                  }
                </div>
              } @else {
                <p class="sched-rail__hint">
                  <mat-icon>info</mat-icon>
                  Ejecuciones previstas en las próximas 24 horas, ordenadas por hora.
                </p>
              }
            </div>
            <p class="sched-rail__count" aria-live="polite">
              {{ listItems().length }} programación{{ listItems().length === 1 ? '' : 'es' }}
              @if (searchTerm()) {
                <span class="sched-rail__count-filter">· filtrado</span>
              }
            </p>
            <ul class="sched-list" role="list" aria-label="Lista de programaciones">
              @for (task of listItems(); track task.id) {
                <li>
                  <button
                    type="button"
                    class="sched-item"
                    [class.sched-item--on]="selectedId() === task.id"
                    [attr.data-result]="task.lastResult"
                    [attr.data-status]="task.status"
                    (click)="selectedId.set(task.id)"
                  >
                    <span class="sched-item__icon" [attr.data-type]="task.type">
                      <mat-icon>{{ typeIcon(task.type) }}</mat-icon>
                    </span>
                    <span class="sched-item__body">
                      <span class="sched-item__row">
                        <strong>{{ task.name }}</strong>
                        <span class="sched-item__next">{{ task.nextRun }}</span>
                      </span>
                      <span class="sched-item__meta mono">{{ task.target }}</span>
                      <span class="sched-item__foot">
                        <span class="sched-pill sched-pill--sm" [attr.data-status]="task.status">
                          {{ statusLabel(task.status) }}
                        </span>
                        <span class="sched-item__cron">{{ task.cronHuman }}</span>
                      </span>
                    </span>
                  </button>
                </li>
              } @empty {
                <li class="sched-list__empty">No hay tareas que coincidan con el filtro.</li>
              }
            </ul>
          </aside>

          <main class="sched-stage">
            @if (selectedTask(); as task) {
              <header class="sched-stage__head" [attr.data-status]="task.status">
                <span class="sched-stage__icon" [attr.data-type]="task.type">
                  <mat-icon>{{ typeIcon(task.type) }}</mat-icon>
                </span>
                <div class="sched-stage__titles">
                  <h3>{{ task.name }}</h3>
                  <p>{{ task.id }} · {{ typeLabel(task.type) }} · {{ task.owner }}</p>
                </div>
                <div class="sched-stage__actions">
                  <button type="button" class="sched-btn sched-btn--sm sched-btn--primary" (click)="openExecute(task.id)">
                    <mat-icon>play_arrow</mat-icon>
                    Ejecutar
                  </button>
                  <button type="button" class="sched-btn sched-btn--sm" (click)="handleEdit(task)">
                    <mat-icon>edit</mat-icon>
                    Editar
                  </button>
                  <button type="button" class="sched-btn sched-btn--sm" (click)="handleTogglePause(task)">
                    <mat-icon>{{ task.enabled ? 'pause' : 'play_circle' }}</mat-icon>
                    {{ task.enabled ? 'Pausar' : 'Reanudar' }}
                  </button>
                </div>
              </header>

              <div class="sched-stage__scroll">
                <div class="sched-detail-grid">
                  <article class="sched-card sched-card--accent">
                    <h4><mat-icon>schedule</mat-icon> Programación</h4>
                    <dl class="sched-dl">
                      <div>
                        <dt>Expresión cron</dt>
                        <dd class="mono">{{ task.cron }}</dd>
                      </div>
                      <div>
                        <dt>Descripción humana</dt>
                        <dd>{{ task.cronHuman }}</dd>
                      </div>
                      <div>
                        <dt>Zona horaria</dt>
                        <dd>{{ task.timezone }}</dd>
                      </div>
                      <div>
                        <dt>Próxima ejecución</dt>
                        <dd><strong>{{ task.nextRun }}</strong> · {{ task.nextRunAt | date: 'dd MMM yyyy, HH:mm' }}</dd>
                      </div>
                      <div>
                        <dt>Última ejecución</dt>
                        <dd>
                          {{ task.lastRun }}
                          ·
                          <span class="sched-pill sched-pill--sm" [attr.data-result]="task.lastResult">
                            {{ resultLabel(task.lastResult) }}
                          </span>
                        </dd>
                      </div>
                      @if (task.maintenanceWindow) {
                        <div>
                          <dt>Ventana mantenimiento</dt>
                          <dd>{{ task.maintenanceWindow }}</dd>
                        </div>
                      }
                    </dl>
                  </article>

                  <article class="sched-card">
                    <h4><mat-icon>tune</mat-icon> Configuración</h4>
                    <dl class="sched-dl">
                      <div class="sched-dl__full">
                        <dt>Descripción</dt>
                        <dd>{{ task.description }}</dd>
                      </div>
                      <div>
                        <dt>Objetivo</dt>
                        <dd class="mono">{{ task.target }}</dd>
                      </div>
                      <div>
                        <dt>Recurso vinculado</dt>
                        <dd>{{ task.linkedResource }}</dd>
                      </div>
                      @if (task.environment) {
                        <div>
                          <dt>Entorno</dt>
                          <dd>{{ environmentLabel(task.environment) }}</dd>
                        </div>
                      }
                      @if (task.priority) {
                        <div>
                          <dt>Prioridad</dt>
                          <dd>{{ priorityLabel(task.priority) }}</dd>
                        </div>
                      }
                      @if (task.credentialProfile) {
                        <div>
                          <dt>Credenciales</dt>
                          <dd class="mono">{{ task.credentialProfile }}</dd>
                        </div>
                      }
                      <div>
                        <dt>Propietario</dt>
                        <dd>{{ task.owner }}</dd>
                      </div>
                      <div>
                        <dt>Asignado a</dt>
                        <dd>{{ task.assignee }}</dd>
                      </div>
                      <div>
                        <dt>Reintentos</dt>
                        <dd>{{ task.retries }}</dd>
                      </div>
                      <div>
                        <dt>Duración máx.</dt>
                        <dd>{{ task.maxDuration }}</dd>
                      </div>
                      <div>
                        <dt>Estado</dt>
                        <dd>
                          <span class="sched-pill" [attr.data-status]="task.status">{{ statusLabel(task.status) }}</span>
                          · {{ task.enabled ? 'Habilitada' : 'Deshabilitada' }}
                        </dd>
                      </div>
                      <div>
                        <dt>Alertas</dt>
                        <dd>
                          {{ task.notifyOnFailure ? 'Si falla' : '' }}{{ task.notifyOnFailure && task.notifyOnSuccess ? ' · ' : '' }}{{ task.notifyOnSuccess ? 'Si éxito' : '' }}{{ !task.notifyOnFailure && !task.notifyOnSuccess ? 'Sin notificación' : '' }}
                        </dd>
                      </div>
                      @if (task.notifyChannels) {
                        <div class="sched-dl__full">
                          <dt>Canales</dt>
                          <dd class="mono">{{ task.notifyChannels }}</dd>
                        </div>
                      }
                      @if (task.documentationUrl) {
                        <div class="sched-dl__full">
                          <dt>Documentación</dt>
                          <dd class="mono">{{ task.documentationUrl }}</dd>
                        </div>
                      }
                    </dl>
                  </article>

                  <article class="sched-card">
                    <h4><mat-icon>terminal</mat-icon> Ejecución</h4>
                    <dl class="sched-dl">
                      <div class="sched-dl__full">
                        <dt>Comando</dt>
                        <dd class="mono sched-cmd">{{ task.command || '— (definir en edición)' }}</dd>
                      </div>
                      @if (task.parameters) {
                        <div class="sched-dl__full">
                          <dt>Parámetros</dt>
                          <dd class="mono">{{ task.parameters }}</dd>
                        </div>
                      }
                      <div>
                        <dt>Concurrencia máx.</dt>
                        <dd>{{ task.concurrency ?? 1 }} ejecución{{ (task.concurrency ?? 1) === 1 ? '' : 'es' }} simultánea{{ (task.concurrency ?? 1) === 1 ? '' : 's' }}</dd>
                      </div>
                      @if (task.workingDirectory) {
                        <div>
                          <dt>Directorio</dt>
                          <dd class="mono">{{ task.workingDirectory }}</dd>
                        </div>
                      }
                      @if (task.timeoutAction) {
                        <div>
                          <dt>Timeout</dt>
                          <dd>{{ timeoutActionLabel(task.timeoutAction) }}</dd>
                        </div>
                      }
                      @if (task.executor) {
                        <div>
                          <dt>Executor</dt>
                          <dd class="mono">{{ task.executor }}</dd>
                        </div>
                      }
                      @if (task.retryBackoff) {
                        <div>
                          <dt>Backoff reintentos</dt>
                          <dd>{{ retryBackoffLabel(task.retryBackoff) }}</dd>
                        </div>
                      }
                      <div>
                        <dt>Solapamiento</dt>
                        <dd>{{ task.skipIfRunning !== false ? 'Omitir si ya corre' : 'Permitir solapamiento' }}</dd>
                      </div>
                      <div>
                        <dt>Disparo manual</dt>
                        <dd>Disponible desde «Ejecutar» (dry-run, forzar, nota)</dd>
                      </div>
                    </dl>
                  </article>

                  <article class="sched-card">
                    <h4><mat-icon>insights</mat-icon> Métricas (7 días)</h4>
                    <dl class="sched-dl sched-dl--metrics">
                      <div>
                        <dt>Tasa de éxito</dt>
                        <dd><strong class="sched-metric">{{ task.successRate }}%</strong></dd>
                      </div>
                      <div>
                        <dt>Ejecuciones</dt>
                        <dd><strong class="sched-metric">{{ task.runs7d }}</strong></dd>
                      </div>
                      <div>
                        <dt>Fallos</dt>
                        <dd><strong class="sched-metric" [class.sched-metric--bad]="task.failures7d > 0">{{ task.failures7d }}</strong></dd>
                      </div>
                    </dl>
                    <div class="sched-tags">
                      @for (tag of task.tags; track tag) {
                        <span>{{ tag }}</span>
                      }
                    </div>
                  </article>

                  <article class="sched-card sched-card--wide">
                    <h4><mat-icon>history</mat-icon> Últimas ejecuciones de esta tarea</h4>
                    @if (historyForTask(task.id).length) {
                      <ul class="sched-mini-runs">
                        @for (run of historyForTask(task.id); track run.id) {
                          <li>
                            <span class="sched-pill sched-pill--sm" [attr.data-result]="run.result">{{ resultLabel(run.result) }}</span>
                            <span class="mono">{{ run.executedAt | date: 'dd MMM, HH:mm' }}</span>
                            <span>{{ run.duration }}</span>
                            <span class="sched-mini-runs__out">{{ run.output }}</span>
                          </li>
                        }
                      </ul>
                    } @else {
                      <p class="sched-card__empty">Sin ejecuciones registradas en el historial demo.</p>
                    }
                  </article>
                </div>
              </div>
            } @else {
              <div class="sched-stage__empty">
                <mat-icon>touch_app</mat-icon>
                <h4>Selecciona una tarea</h4>
                <p>Elige una programación de la lista para ver cron, configuración, métricas e historial.</p>
              </div>
            }
          </main>
        </div>
      }
    </div>
    </app-pro-config-gate>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
      overflow: hidden;
    }
    .sched-page {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      flex: 1;
      min-height: 0;
      height: 100%;
      overflow: hidden;
      color: #111;
    }
    .sched-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      flex-shrink: 0;
    }
    .sched-bar__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .sched-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.4rem 0.75rem;
      border: 1px solid color-mix(in srgb, #111 12%, transparent);
      border-radius: 10px;
      background: #fff;
      font: inherit;
      font-size: 0.76rem;
      font-weight: 650;
      cursor: pointer;
    }
    .sched-btn--primary {
      border-color: color-mix(in srgb, #d97706 35%, transparent);
      background: color-mix(in srgb, #d97706 12%, #fff);
      color: #b45309;
    }
    .sched-btn--sm {
      padding: 0.35rem 0.6rem;
      font-size: 0.7rem;
    }
    .sched-btn mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .sched-views {
      display: flex;
      gap: 0.25rem;
      padding: 0.25rem;
      border-radius: 11px;
      background: #f1f5f9;
      flex: 1;
      min-width: min(100%, 280px);
    }
    .sched-views__tab {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      padding: 0.5rem 0.55rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 650;
      color: #64748b;
      cursor: pointer;
    }
    .sched-views__tab--on {
      background: #fff;
      color: #b45309;
      font-weight: 700;
      box-shadow: 0 1px 6px rgb(15 23 42 / 0.08);
    }
    .sched-views__count {
      padding: 0 0.3rem;
      border-radius: 4px;
      font-size: 0.58rem;
      font-weight: 800;
      background: color-mix(in srgb, #d97706 12%, #fff);
    }
    .sched-workspace {
      display: grid;
      grid-template-columns: minmax(260px, 300px) minmax(0, 1fr);
      flex: 1;
      min-height: min(520px, calc(100dvh - 9.5rem));
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 8px 32px color-mix(in srgb, #d97706 8%, transparent);
    }
    .sched-rail {
      display: flex;
      flex-direction: column;
      min-height: 0;
      border-right: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .sched-rail__toolbar {
      padding: 0.55rem;
      border-bottom: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .sched-rail__count {
      margin: 0;
      padding: 0.35rem 0.65rem;
      font-size: 0.62rem;
      font-weight: 700;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .sched-rail__count-filter {
      font-weight: 500;
      color: #d97706;
    }
    .sched-rail__hint {
      display: flex;
      gap: 0.35rem;
      margin: 0;
      font-size: 0.68rem;
      line-height: 1.45;
      color: #64748b;
    }
    .sched-rail__hint mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      color: #d97706;
    }
    .sched-search {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.5rem;
      margin-bottom: 0.45rem;
      border: 1px solid #e2e8f0;
      border-radius: 9px;
      background: #fff;
    }
    .sched-search mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #94a3b8;
    }
    .sched-search input {
      flex: 1;
      border: none;
      outline: none;
      font: inherit;
      font-size: 0.72rem;
      background: transparent;
      min-width: 0;
    }
    .sched-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    .sched-filter {
      padding: 0.2rem 0.45rem;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      background: #fff;
      font: inherit;
      font-size: 0.58rem;
      font-weight: 650;
      color: #64748b;
      cursor: pointer;
    }
    .sched-filter--on {
      border-color: color-mix(in srgb, #d97706 40%, transparent);
      background: color-mix(in srgb, #d97706 10%, #fff);
      color: #b45309;
      font-weight: 700;
    }
    .sched-list {
      list-style: none;
      margin: 0;
      padding: 0.45rem;
      overflow-y: auto;
      overflow-x: hidden;
      flex: 1;
      min-height: 0;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: color-mix(in srgb, #d97706 35%, #cbd5e1) transparent;
    }
    .sched-list::-webkit-scrollbar {
      width: 6px;
    }
    .sched-list::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: color-mix(in srgb, #d97706 40%, #cbd5e1);
    }
    .sched-cmd {
      word-break: break-all;
      line-height: 1.45;
    }
    .sched-item {
      display: flex;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 0.55rem;
      margin-bottom: 0.35rem;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #fff;
      text-align: left;
      font: inherit;
      cursor: pointer;
      transition: border-color 0.12s ease, box-shadow 0.12s ease;
    }
    .sched-item:hover {
      border-color: color-mix(in srgb, #d97706 35%, #e2e8f0);
    }
    .sched-item--on {
      border-color: #d97706;
      box-shadow: 0 0 0 1px color-mix(in srgb, #d97706 25%, transparent);
      background: color-mix(in srgb, #d97706 5%, #fff);
    }
    .sched-item__icon {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: 8px;
      background: color-mix(in srgb, #d97706 12%, #fff);
      color: #b45309;
      flex-shrink: 0;
    }
    .sched-item__body {
      flex: 1;
      min-width: 0;
    }
    .sched-item__row {
      display: flex;
      justify-content: space-between;
      gap: 0.35rem;
    }
    .sched-item__row strong {
      font-size: 0.74rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sched-item__next {
      font-size: 0.6rem;
      font-weight: 700;
      color: #d97706;
      flex-shrink: 0;
    }
    .sched-item__meta {
      display: block;
      margin-top: 0.12rem;
      font-size: 0.6rem;
      color: #64748b;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sched-item__foot {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.3rem;
      margin-top: 0.3rem;
    }
    .sched-item__cron {
      font-size: 0.58rem;
      color: #94a3b8;
    }
    .sched-list__empty {
      padding: 1.5rem 0.75rem;
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
    }
    .sched-stage {
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      background: #f1f5f9;
    }
    .sched-stage__head {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.65rem 0.85rem;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .sched-stage__icon {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 11px;
      background: color-mix(in srgb, #d97706 12%, #fff);
      color: #b45309;
    }
    .sched-stage__titles {
      flex: 1;
      min-width: 0;
    }
    .sched-stage__titles h3 {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sched-stage__titles p {
      margin: 0.15rem 0 0;
      font-size: 0.66rem;
      color: #64748b;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sched-stage__actions {
      display: flex;
      gap: 0.3rem;
      flex-shrink: 0;
    }
    .sched-stage__scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0.65rem;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: color-mix(in srgb, #d97706 35%, #cbd5e1) transparent;
    }
    .sched-stage__scroll::-webkit-scrollbar {
      width: 6px;
    }
    .sched-stage__scroll::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: color-mix(in srgb, #d97706 40%, #cbd5e1);
    }
    .sched-detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.55rem;
    }
    .sched-card {
      padding: 0.65rem 0.75rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #fff;
    }
    .sched-card--accent {
      border-color: color-mix(in srgb, #d97706 22%, #e2e8f0);
      background: color-mix(in srgb, #d97706 4%, #fff);
    }
    .sched-card--wide {
      grid-column: 1 / -1;
    }
    .sched-card h4 {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0 0 0.45rem;
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .sched-card h4 mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: #d97706;
    }
    .sched-dl {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4rem 0.55rem;
      margin: 0;
    }
    .sched-dl__full {
      grid-column: 1 / -1;
    }
    .sched-dl dt {
      font-size: 0.55rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .sched-dl dd {
      margin: 0.08rem 0 0;
      font-size: 0.72rem;
      font-weight: 600;
      color: #334155;
      line-height: 1.4;
      word-break: break-word;
    }
    .sched-dl--metrics .sched-metric {
      font-size: 1.1rem;
      color: #059669;
    }
    .sched-metric--bad {
      color: #dc2626 !important;
    }
    .sched-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-top: 0.45rem;
    }
    .sched-tags span {
      padding: 0.1rem 0.38rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 600;
      background: #f1f5f9;
      color: #475569;
    }
    .sched-mini-runs {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .sched-mini-runs li {
      display: grid;
      grid-template-columns: auto auto auto 1fr;
      gap: 0.35rem 0.5rem;
      align-items: baseline;
      font-size: 0.68rem;
      padding: 0.4rem 0.45rem;
      border-radius: 8px;
      background: #f8fafc;
    }
    .sched-mini-runs__out {
      grid-column: 1 / -1;
      color: #64748b;
      line-height: 1.4;
    }
    .sched-card__empty {
      margin: 0;
      font-size: 0.72rem;
      color: #94a3b8;
    }
    .sched-stage__empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem;
      text-align: center;
      color: #64748b;
    }
    .sched-stage__empty mat-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      color: #d97706;
      opacity: 0.5;
    }
    .sched-pill {
      display: inline-flex;
      padding: 0.14rem 0.42rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    .sched-pill--sm {
      font-size: 0.52rem;
      padding: 0.1rem 0.35rem;
    }
    .sched-pill[data-status='running'] {
      color: #047857;
      background: color-mix(in srgb, #10b981 14%, #fff);
    }
    .sched-pill[data-status='paused'] {
      color: #64748b;
      background: #f1f5f9;
    }
    .sched-pill[data-status='failed'] {
      color: #b91c1c;
      background: color-mix(in srgb, #ef4444 14%, #fff);
    }
    .sched-pill[data-status='pending'] {
      color: #b45309;
      background: color-mix(in srgb, #f59e0b 14%, #fff);
    }
    .sched-pill[data-result='success'] {
      color: #047857;
      background: color-mix(in srgb, #10b981 14%, #fff);
    }
    .sched-pill[data-result='warning'] {
      color: #b45309;
      background: color-mix(in srgb, #f59e0b 14%, #fff);
    }
    .sched-pill[data-result='error'] {
      color: #b91c1c;
      background: color-mix(in srgb, #ef4444 14%, #fff);
    }
    .sched-pill[data-result='skipped'] {
      color: #475569;
      background: color-mix(in srgb, #64748b 12%, #fff);
    }
    .sched-history {
      flex: 1;
      min-height: min(520px, calc(100dvh - 9.5rem));
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0.65rem;
    }
    .sched-history__toolbar {
      flex-shrink: 0;
      margin-bottom: 0.5rem;
    }
    .sched-history__table-wrap {
      flex: 1;
      min-height: 0;
      overflow: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      scrollbar-width: thin;
      scrollbar-color: color-mix(in srgb, #d97706 35%, #cbd5e1) transparent;
    }
    .sched-history__table-wrap::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .sched-history__table-wrap::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: color-mix(in srgb, #d97706 40%, #cbd5e1);
    }
    .sched-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.74rem;
    }
    .sched-table th {
      position: sticky;
      top: 0;
      padding: 0.5rem 0.65rem;
      text-align: left;
      font-size: 0.62rem;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .sched-table td {
      padding: 0.5rem 0.65rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    .sched-table__row--click {
      cursor: pointer;
    }
    .sched-table__row--click:hover {
      background: color-mix(in srgb, #d97706 5%, #fff);
    }
    .sched-table__output {
      max-width: 280px;
      color: #64748b;
      line-height: 1.4;
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
    @media (max-width: 1000px) {
      .sched-workspace {
        grid-template-columns: 1fr;
        grid-template-rows: minmax(220px, 36vh) minmax(280px, 1fr);
        min-height: min(640px, calc(100dvh - 10rem));
      }
      .sched-rail {
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
      }
      .sched-detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SchedulerPageComponent {
  private readonly demo = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)
  private readonly toast = inject(ToastService)

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly view = signal<SchedulerView>('tasks')
  readonly typeFilter = signal<SchedulerTaskType | 'all'>('all')
  readonly selectedId = signal<string | null>(null)

  readonly tasks = signal(defaultSchedulerTasks())
  readonly history = signal(defaultSchedulerHistory())

  readonly taskTypes: SchedulerTaskType[] = [
    'instance',
    'jenkins',
    'ssh',
    'backup',
    'sync',
    'report',
    'docker',
    'runbook',
  ]

  readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(150), startWith('')),
    { initialValue: '' },
  )

  readonly upcoming24h = computed(() => {
    const limit = Date.now() + 24 * 60 * 60_000
    return [...this.tasks()]
      .filter((t) => t.enabled && new Date(t.nextRunAt).getTime() <= limit)
      .sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime())
  })

  readonly filteredTasks = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const type = this.typeFilter()
    return this.tasks().filter((t) => {
      const matchType = type === 'all' || t.type === type
      const blob = `${t.name} ${t.target} ${t.owner} ${t.assignee} ${t.tags.join(' ')}`.toLowerCase()
      const matchSearch = !term || blob.includes(term)
      return matchType && matchSearch
    })
  })

  readonly listItems = computed(() => {
    if (this.view() === 'upcoming') return this.upcoming24h()
    return this.filteredTasks()
  })

  readonly selectedTask = computed(() => {
    const id = this.selectedId()
    if (!id) return null
    return this.tasks().find((t) => t.id === id) ?? null
  })

  private readonly syncSelection = effect(() => {
    const list = this.listItems()
    const id = this.selectedId()
    if (!list.length) return
    if (!id || !list.some((t) => t.id === id)) {
      this.selectedId.set(list[0].id)
    }
  })

  readonly filteredHistory = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.history().filter((h) => {
      const blob = `${h.taskName} ${h.output} ${h.result}`.toLowerCase()
      return !term || blob.includes(term)
    })
  })

  historyForTask = (taskId: string): SchedulerRunHistory[] =>
    this.history().filter((h) => h.taskId === taskId)

  selectTaskById = (id: string): void => {
    this.view.set('tasks')
    this.selectedId.set(id)
  }

  typeLabel = (t: SchedulerTaskType): string => SCHEDULER_TYPE_LABELS[t]
  statusLabel = (s: SchedulerTaskStatus): string => SCHEDULER_STATUS_LABELS[s]
  resultLabel = (r: SchedulerRunResult): string => SCHEDULER_RESULT_LABELS[r]
  typeIcon = (t: SchedulerTaskType): string => TYPE_ICON[t] ?? 'event'
  environmentLabel = (e: NonNullable<SchedulerTask['environment']>): string => ENVIRONMENT_LABELS[e]
  priorityLabel = (p: NonNullable<SchedulerTask['priority']>): string => PRIORITY_LABELS[p]
  timeoutActionLabel = (a: NonNullable<SchedulerTask['timeoutAction']>): string => TIMEOUT_ACTION_LABELS[a]
  retryBackoffLabel = (b: NonNullable<SchedulerTask['retryBackoff']>): string => RETRY_BACKOFF_LABELS[b]

  handleNew = (): void => {
    const ref = this.dialog.open(SchedulerTaskFormDialogComponent, {
      data: { mode: 'create' },
      width: 'min(960px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '94vh',
      panelClass: 'scheduler-form-dialog-panel',
    })
    ref.afterClosed().subscribe((result: SchedulerTaskFormDialogResult | undefined) => {
      if (!result) return
      const { task, runOnceAfterSave } = result
      this.tasks.update((list) => [task, ...list])
      this.selectedId.set(task.id)
      this.view.set('tasks')
      this.toast.success(`Programación «${task.name}» creada`)
      if (runOnceAfterSave) {
        this.toast.info('Lanzando ejecución inicial…')
        setTimeout(() => this.openExecute(task.id), 400)
      }
    })
  }

  handleEdit = (task: SchedulerTask): void => {
    const ref = this.dialog.open(SchedulerTaskFormDialogComponent, {
      data: { mode: 'edit', task },
      width: 'min(960px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '94vh',
      panelClass: 'scheduler-form-dialog-panel',
    })
    ref.afterClosed().subscribe((result: SchedulerTaskFormDialogResult | undefined) => {
      if (!result) return
      const { task: updated } = result
      this.tasks.update((list) => list.map((t) => (t.id === updated.id ? updated : t)))
      this.toast.success(`«${updated.name}» actualizada`)
    })
  }

  openExecute = (preselectedId?: string): void => {
    const list = this.tasks()
    if (!list.length) {
      this.toast.error('No hay tareas para ejecutar')
      return
    }
    const ref = this.dialog.open(SchedulerRunDialogComponent, {
      data: { tasks: list, preselectedId },
      width: 'min(1080px, 98vw)',
      maxWidth: '98vw',
      height: 'min(94vh, 920px)',
      maxHeight: '94vh',
      panelClass: 'scheduler-run-dialog-panel',
    })
    ref.afterClosed().subscribe((opts) => {
      if (!opts) return
      const task = this.tasks().find((t) => t.id === opts.taskId)
      if (!task) return
      this.performRun(task, opts)
    })
  }

  handlePauseAll = (): void => {
    const hadActive = this.tasks().some((t) => t.enabled)
    this.tasks.update((list) =>
      list.map((t) => ({
        ...t,
        enabled: false,
        status: 'paused' as SchedulerTaskStatus,
      })),
    )
    this.toast.info(hadActive ? 'Todas las programaciones pausadas' : 'Todas las tareas ya estaban pausadas')
  }

  handleTogglePause = (task: SchedulerTask): void => {
    const enabled = !task.enabled
    this.tasks.update((list) =>
      list.map((t) => {
        if (t.id !== task.id) return t
        const status: SchedulerTaskStatus = enabled
          ? t.lastResult === 'error'
            ? 'failed'
            : 'running'
          : 'paused'
        return { ...t, enabled, status }
      }),
    )
    this.toast.info(enabled ? `«${task.name}» reanudada` : `«${task.name}» pausada`)
  }

  private performRun = (task: SchedulerTask, opts: SchedulerRunOptions): void => {
    const label = opts.dryRun ? `Simulando: ${task.name}` : `Ejecutando: ${task.name}`
    this.demo.simulate(label, 550).subscribe({
      next: () => {
        const { result, duration, output } = simulateRunOutput(task, opts)
        const run = buildHistoryFromRun(task, result, duration, output, 'manual')
        const now = new Date().toISOString()
        this.history.update((h) => [run, ...h])
        this.tasks.update((list) =>
          list.map((t) => {
            if (t.id !== task.id) return t
            const status: SchedulerTaskStatus =
              result === 'error' ? 'failed' : t.enabled || opts.forceRun ? 'running' : 'paused'
            return {
              ...t,
              lastRun: 'Hace un momento',
              lastRunAt: now,
              lastResult: result,
              status,
              runs7d: opts.dryRun ? t.runs7d : t.runs7d + 1,
              failures7d: !opts.dryRun && result === 'error' ? t.failures7d + 1 : t.failures7d,
            }
          }),
        )
        const shouldNotify =
          opts.notifyOnComplete ||
          (task.notifyOnSuccess && result === 'success') ||
          (task.notifyOnFailure && (result === 'error' || result === 'warning'))
        if (shouldNotify) {
          const channels = task.notifyChannels ? ` → ${task.notifyChannels}` : ''
          const notifyMsg =
            result === 'success'
              ? `Notificación: ${task.name} completada${channels}`
              : result === 'error'
                ? `Notificación: fallo en ${task.name}${channels}`
                : `Notificación: ${task.name} · ${this.resultLabel(result)}${channels}`
          this.toast.show(notifyMsg, 'info', 3500)
        }
        if (result === 'success') {
          this.toast.success(opts.dryRun ? `Dry-run OK: ${task.name}` : `Ejecución completada: ${task.name}`)
        } else if (result === 'skipped') {
          this.toast.warning('Ejecución omitida — activa «Forzar» si la tarea está pausada')
        } else if (result === 'error') {
          this.toast.error(`Error en ejecución: ${task.name}`)
        } else {
          this.toast.warning(`Completada con advertencias: ${task.name}`)
        }
      },
    })
  }
}
