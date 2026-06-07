import { DatePipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import { CLOUD_PROVIDER_LABELS, SCHEDULER_TYPE_LOGO } from './scheduler-form.config'
import {
  SCHEDULER_RESULT_LABELS,
  SCHEDULER_STATUS_LABELS,
  SCHEDULER_TYPE_LABELS,
  type SchedulerTask,
  type SchedulerTaskStatus,
  type SchedulerTaskType,
} from './scheduler.demo'
import {
  ENVIRONMENT_LABELS,
  formatNextRunFromCron,
  inferCloudProvider,
  PRIORITY_LABELS,
  RETRY_BACKOFF_LABELS,
  TIMEOUT_ACTION_LABELS,
  type SchedulerRunOptions,
} from './scheduler.util'

export interface SchedulerRunDialogData {
  tasks: SchedulerTask[]
  preselectedId?: string
}

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

const EXEC_STEPS = [
  { id: 'validate', icon: 'fact_check', label: 'Validar programación', hint: 'Cron, objetivo y estado' },
  { id: 'auth', icon: 'vpn_key', label: 'Resolver credenciales', hint: 'Perfil y executor' },
  { id: 'run', icon: 'terminal', label: 'Ejecutar comando', hint: 'Runner remoto o agente' },
  { id: 'log', icon: 'history', label: 'Registrar historial', hint: 'Duración, salida y resultado' },
  { id: 'notify', icon: 'notifications', label: 'Notificar', hint: 'Slack, email o PagerDuty' },
] as const

@Component({
  selector: 'app-scheduler-run-dialog',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    BrandLogoComponent,
  ],
  template: `
    <div class="sch-run" [formGroup]="form">
      <header class="sch-run__hero" [class.sch-run__hero--idle]="!selectedTask()">
        @if (selectedTask(); as task) {
          <div class="sch-run__hero-main">
            <span class="sch-run__hero-logo" [attr.data-type]="task.type">
              @if (typeLogo(task.type); as logo) {
                <app-brand-logo [logo]="logo" size="xl" />
              } @else {
                <mat-icon>{{ typeIcon(task.type) }}</mat-icon>
              }
            </span>
            <div class="sch-run__hero-copy">
              <span class="sch-run__hero-kicker">Ejecutar programación</span>
              <h2>{{ task.name }}</h2>
              <p class="mono">{{ task.id }} · {{ typeLabels[task.type] }}</p>
              <div class="sch-run__hero-chips">
                <span class="sch-run__chip" [attr.data-status]="task.status">{{ statusLabel(task.status) }}</span>
                <span class="sch-run__chip sch-run__chip--env">
                  <app-brand-logo [logo]="cloudLogo(task)" size="sm" />
                  {{ cloudShortLabel(task) }} · {{ envLabel(task.environment) }}
                </span>
                <span class="sch-run__chip sch-run__chip--muted">{{ task.nextRun }}</span>
              </div>
            </div>
          </div>
        } @else {
          <div class="sch-run__hero-main sch-run__hero-main--idle">
            <span class="sch-run__hero-logo sch-run__hero-logo--idle">
              <mat-icon>play_circle</mat-icon>
            </span>
            <div class="sch-run__hero-copy">
              <span class="sch-run__hero-kicker">Ejecutar ahora</span>
              <h2>Selecciona una programación</h2>
              <p>Elige una tarea de la lista para revisar comando, opciones y vista previa antes de lanzar.</p>
            </div>
          </div>
        }
      </header>

      <mat-dialog-content class="sch-run__layout">
        <div class="sch-run__col sch-run__col--tasks">
          <div class="sch-run__col-head">
            <h3><mat-icon>playlist_play</mat-icon> Tareas</h3>
            <span class="sch-run__count">{{ filteredTasks().length }}/{{ data.tasks.length }}</span>
          </div>

          <label class="sch-run__search">
            <mat-icon>search</mat-icon>
            <input
              type="search"
              [value]="searchTerm()"
              (input)="searchTerm.set($any($event.target).value)"
              placeholder="Buscar nombre, objetivo, tag…"
              aria-label="Buscar tarea"
            />
          </label>

          <div class="sch-run__filters" role="group" aria-label="Filtrar tareas">
            <button
              type="button"
              class="sch-run__filter"
              [class.sch-run__filter--on]="statusFilter() === 'all'"
              (click)="statusFilter.set('all')"
            >
              Todas
            </button>
            @for (s of statusFilters; track s) {
              <button
                type="button"
                class="sch-run__filter"
                [class.sch-run__filter--on]="statusFilter() === s"
                (click)="statusFilter.set(s)"
              >
                {{ statusLabel(s) }}
              </button>
            }
          </div>

          <ul class="sch-run__task-list" role="listbox" aria-label="Tareas programadas">
            @for (t of filteredTasks(); track t.id) {
              <li>
                <button
                  type="button"
                  role="option"
                  class="sch-run__task"
                  [class.sch-run__task--on]="form.get('taskId')?.value === t.id"
                  [attr.aria-selected]="form.get('taskId')?.value === t.id"
                  [attr.data-status]="t.status"
                  (click)="selectTask(t.id)"
                >
                  <span class="sch-run__task-icon" [attr.data-type]="t.type">
                    @if (typeLogo(t.type); as logo) {
                      <app-brand-logo [logo]="logo" size="md" />
                    } @else {
                      <mat-icon>{{ typeIcon(t.type) }}</mat-icon>
                    }
                  </span>
                  <span class="sch-run__task-body">
                    <span class="sch-run__task-row">
                      <strong>{{ t.name }}</strong>
                      <span class="sch-run__pill" [attr.data-status]="t.status">{{ statusLabel(t.status) }}</span>
                    </span>
                    <span class="sch-run__task-meta mono">{{ t.target }}</span>
                    <span class="sch-run__task-foot">
                      <app-brand-logo [logo]="cloudLogo(t)" size="sm" />
                      {{ typeLabels[t.type] }} · {{ cloudShortLabel(t) }} · {{ envLabel(t.environment) }}
                    </span>
                  </span>
                </button>
              </li>
            } @empty {
              <li class="sch-run__empty">Ninguna tarea coincide con los filtros.</li>
            }
          </ul>
        </div>

        <div class="sch-run__col sch-run__col--options">
          <div class="sch-run__col-head">
            <h3><mat-icon>tune</mat-icon> Opciones</h3>
          </div>

          <div class="sch-run__opt-grid">
            <div class="sch-run__opt-card" [class.sch-run__opt-card--on]="form.get('dryRun')?.value">
              <span class="sch-run__opt-icon"><mat-icon>science</mat-icon></span>
              <div class="sch-run__opt-copy">
                <strong>Dry-run</strong>
                <span>Simula validación sin tocar infraestructura</span>
              </div>
              <mat-slide-toggle formControlName="dryRun" color="primary" />
            </div>
            <div class="sch-run__opt-card" [class.sch-run__opt-card--on]="form.get('forceRun')?.value">
              <span class="sch-run__opt-icon"><mat-icon>bolt</mat-icon></span>
              <div class="sch-run__opt-copy">
                <strong>Forzar ejecución</strong>
                <span>Ignora pausa, deshabilitado u omitir-si-corriendo</span>
              </div>
              <mat-slide-toggle formControlName="forceRun" color="primary" />
            </div>
            <div class="sch-run__opt-card" [class.sch-run__opt-card--on]="form.get('notifyOnComplete')?.value">
              <span class="sch-run__opt-icon"><mat-icon>notifications_active</mat-icon></span>
              <div class="sch-run__opt-copy">
                <strong>Notificar al finalizar</strong>
                <span>Alerta a Slack, email o PagerDuty configurados</span>
              </div>
              <mat-slide-toggle formControlName="notifyOnComplete" color="primary" />
            </div>
          </div>

          <div class="sch-run__pipeline">
            <h4><mat-icon>route</mat-icon> Flujo de ejecución</h4>
            <ol class="sch-run__timeline">
              @for (step of execSteps(); track step.id; let i = $index) {
                <li
                  [class.sch-run__step--skip]="step.skip"
                  [class.sch-run__step--on]="step.active && !step.skip"
                >
                  <span class="sch-run__step-num">{{ i + 1 }}</span>
                  <span class="sch-run__step-icon"><mat-icon>{{ step.icon }}</mat-icon></span>
                  <span class="sch-run__step-text">
                    <strong>{{ step.label }}</strong>
                    <span>{{ step.hint }}</span>
                  </span>
                </li>
              }
            </ol>
          </div>

          <mat-form-field appearance="outline" class="sch-run__full">
            <mat-label>Nota / ticket de cambio</mat-label>
            <textarea matInput rows="3" formControlName="note" placeholder="Motivo, INC-1234, ventana aprobada…"></textarea>
            <mat-hint>Visible en historial · recomendado en producción</mat-hint>
          </mat-form-field>

          @if (runWarnings().length) {
            <ul class="sch-run__warnings">
              @for (w of runWarnings(); track w) {
                <li><mat-icon>warning</mat-icon>{{ w }}</li>
              }
            </ul>
          }
        </div>

        @if (selectedTask(); as task) {
          <aside class="sch-run__col sch-run__col--detail" aria-label="Detalle de la tarea">
            <div class="sch-run__col-head">
              <h3><mat-icon>info</mat-icon> Detalle</h3>
            </div>

            <article class="sch-run__card">
              <h4><mat-icon>description</mat-icon> Programación</h4>
              <dl>
                <div><dt>ID</dt><dd class="mono">{{ task.id }}</dd></div>
                <div><dt>Tipo</dt><dd>{{ typeLabels[task.type] }}</dd></div>
                <div><dt>Prioridad</dt><dd>{{ prioLabel(task.priority) }}</dd></div>
                <div><dt>Propietario</dt><dd>{{ task.owner }}</dd></div>
                <div><dt>Asignado</dt><dd>{{ task.assignee }}</dd></div>
                <div class="sch-run__dl-wide"><dt>Descripción</dt><dd>{{ task.description || '—' }}</dd></div>
                <div class="sch-run__dl-wide"><dt>Cron</dt><dd class="mono">{{ task.cronHuman }} · {{ task.cron }}</dd></div>
                <div><dt>Zona horaria</dt><dd>{{ task.timezone }}</dd></div>
                <div><dt>Próxima</dt><dd>{{ formatNext(task) }}</dd></div>
                @if (task.maintenanceWindow) {
                  <div class="sch-run__dl-wide"><dt>Ventana</dt><dd>{{ task.maintenanceWindow }}</dd></div>
                }
              </dl>
            </article>

            <article class="sch-run__card">
              <h4><mat-icon>terminal</mat-icon> Ejecución</h4>
              <dl>
                <div class="sch-run__dl-wide"><dt>Objetivo</dt><dd class="mono">{{ task.target }}</dd></div>
                <div class="sch-run__dl-wide"><dt>Recurso</dt><dd>{{ task.linkedResource || '—' }}</dd></div>
                @if (task.command) {
                  <div class="sch-run__dl-wide"><dt>Comando</dt><dd class="mono sch-run__cmd">{{ task.command }}</dd></div>
                }
                @if (task.parameters) {
                  <div class="sch-run__dl-wide"><dt>Parámetros</dt><dd class="mono">{{ task.parameters }}</dd></div>
                }
                @if (task.workingDirectory) {
                  <div><dt>Directorio</dt><dd class="mono">{{ task.workingDirectory }}</dd></div>
                }
                @if (task.credentialProfile) {
                  <div><dt>Credenciales</dt><dd class="mono">{{ task.credentialProfile }}</dd></div>
                }
                @if (task.executor) {
                  <div><dt>Executor</dt><dd class="mono">{{ task.executor }}</dd></div>
                }
                <div><dt>Concurrencia</dt><dd>{{ task.concurrency ?? 1 }}</dd></div>
                <div><dt>Reintentos</dt><dd>{{ task.retries }} · {{ backoffLabel(task.retryBackoff) }}</dd></div>
                <div><dt>Duración máx.</dt><dd>{{ task.maxDuration }}</dd></div>
                @if (task.timeoutAction) {
                  <div><dt>Timeout</dt><dd>{{ timeoutLabel(task.timeoutAction) }}</dd></div>
                }
                <div><dt>Solapamiento</dt><dd>{{ task.skipIfRunning !== false ? 'Omitir si corre' : 'Permitir' }}</dd></div>
              </dl>
            </article>

            <article class="sch-run__card">
              <h4><mat-icon>history</mat-icon> Historial</h4>
              <dl class="sch-run__last-run">
                <div><dt>Última ejecución</dt><dd>{{ task.lastRun }}</dd></div>
                <div>
                  <dt>Resultado</dt>
                  <dd>
                    <span class="sch-run__pill sch-run__pill--result" [attr.data-result]="task.lastResult">
                      {{ resultLabel(task.lastResult) }}
                    </span>
                  </dd>
                </div>
                @if (task.lastRunAt) {
                  <div><dt>Timestamp</dt><dd>{{ task.lastRunAt | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
                }
                @if (task.notifyChannels) {
                  <div class="sch-run__dl-wide"><dt>Canales</dt><dd class="mono">{{ task.notifyChannels }}</dd></div>
                }
                @if (task.tags.length) {
                  <div class="sch-run__dl-wide">
                    <dt>Etiquetas</dt>
                    <dd class="sch-run__tags">
                      @for (tag of task.tags; track tag) {
                        <span>{{ tag }}</span>
                      }
                    </dd>
                  </div>
                }
              </dl>
            </article>

            <article class="sch-run__preview-block">
              <h4><mat-icon>preview</mat-icon> Vista previa</h4>
              <pre class="sch-run__preview-code">{{ runPreview() }}</pre>
            </article>
          </aside>
        } @else {
          <aside class="sch-run__col sch-run__col--detail sch-run__col--empty">
            <span class="sch-run__empty-icon"><mat-icon>touch_app</mat-icon></span>
            <h4>Detalle de la tarea</h4>
            <p>Selecciona una programación para ver cron, comando, métricas y la vista previa del runner.</p>
          </aside>
        }
      </mat-dialog-content>

      <mat-dialog-actions class="sch-run__actions">
        <div class="sch-run__actions-info">
          @if (selectedTask(); as task) {
            <span class="sch-run__mode-pill" [attr.data-dry]="form.get('dryRun')?.value">
              <mat-icon>{{ form.get('dryRun')?.value ? 'science' : 'play_arrow' }}</mat-icon>
              {{ form.get('dryRun')?.value ? 'Modo simulación' : 'Ejecución real' }}
            </span>
            <span class="sch-run__actions-target mono">{{ task.target }}</span>
          } @else {
            <span class="sch-run__actions-hint">Selecciona una tarea para habilitar la ejecución</span>
          }
        </div>
        <div class="sch-run__actions-btns">
          <button type="button" mat-stroked-button class="sch-run__cancel" (click)="dialogRef.close()">Cancelar</button>
          <button
            type="button"
            mat-flat-button
            color="primary"
            class="sch-run__submit"
            [disabled]="!canRun()"
            (click)="handleRun()"
          >
            <mat-icon>{{ form.get('dryRun')?.value ? 'science' : 'play_arrow' }}</mat-icon>
            {{ form.get('dryRun')?.value ? 'Simular (dry-run)' : 'Ejecutar ahora' }}
          </button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .sch-run {
      --run-border: #e2e8f0;
      --run-muted: #64748b;
      --run-ink: #0f172a;
      --run-surface: #f8fafc;
      display: flex;
      flex-direction: column;
      width: 100%;
      min-height: min(88vh, 860px);
      max-height: min(94vh, 920px);
      overflow: hidden;
      color: var(--run-ink);
      background: #fff;
    }
    .sch-run__hero {
      display: flex;
      flex-wrap: wrap;
      align-items: stretch;
      justify-content: space-between;
      gap: 0.85rem;
      padding: 0.85rem 1.1rem;
      flex-shrink: 0;
    }
    .sch-run__hero--idle {
      background: transparent;
    }
    .sch-run__hero-main {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
      flex: 1;
      min-width: min(100%, 420px);
    }
    .sch-run__hero-logo {
      display: grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      flex-shrink: 0;
    }
    .sch-run__hero-logo mat-icon {
      font-size: 1.65rem;
      width: 1.65rem;
      height: 1.65rem;
      color: var(--run-muted);
    }
    .sch-run__hero-kicker {
      display: block;
      margin-bottom: 0.2rem;
      font-size: 0.58rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--run-muted);
    }
    .sch-run__hero-copy h2 {
      margin: 0;
      font-size: 1.08rem;
      font-weight: 800;
      line-height: 1.25;
      letter-spacing: -0.01em;
    }
    .sch-run__hero-copy p {
      margin: 0.2rem 0 0;
      font-size: 0.68rem;
      color: var(--run-muted);
      line-height: 1.45;
    }
    .sch-run__hero-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: 0.45rem;
    }
    .sch-run__chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 650;
      background: var(--run-surface);
      color: var(--run-muted);
    }
    .sch-run__chip--env {
      font-weight: 700;
    }
    .sch-run__chip--muted {
      color: var(--run-muted);
    }
    .sch-run__layout {
      display: grid !important;
      grid-template-columns: minmax(240px, 280px) minmax(280px, 1fr) minmax(300px, 360px);
      grid-template-rows: minmax(0, 1fr);
      flex: 1 1 auto;
      min-height: 0;
      padding: 0 !important;
      margin: 0 !important;
      max-height: none !important;
      overflow: hidden !important;
    }
    .sch-run__col {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .sch-run__col-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.55rem 0.75rem;
      flex-shrink: 0;
    }
    .sch-run__col-head h3 {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--run-muted);
    }
    .sch-run__col-head h3 mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: var(--run-muted);
    }
    .sch-run__count {
      font-size: 0.62rem;
      font-weight: 700;
      color: var(--run-muted);
    }
    .sch-run__col--tasks,
    .sch-run__col--options {
      padding: 0.65rem 0.75rem;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .sch-run__col--detail {
      padding: 0.65rem 0.75rem;
      overflow-y: auto;
      background: #fff;
      scrollbar-width: thin;
    }
    .sch-run__col--empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      text-align: center;
      color: var(--run-muted);
      padding: 2rem 1rem;
    }
    .sch-run__empty-icon {
      display: grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      color: var(--run-muted);
      margin-bottom: 0.25rem;
    }
    .sch-run__empty-icon mat-icon {
      font-size: 1.65rem;
      width: 1.65rem;
      height: 1.65rem;
    }
    .sch-run__col--empty h4 {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--run-ink);
    }
    .sch-run__col--empty p {
      margin: 0;
      max-width: 16rem;
      font-size: 0.74rem;
      line-height: 1.5;
    }
    .sch-run__search {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.38rem 0.55rem;
      margin-bottom: 0.45rem;
      border-radius: 9px;
      background: var(--run-surface);
      flex-shrink: 0;
    }
    .sch-run__search mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #94a3b8;
    }
    .sch-run__search input {
      flex: 1;
      border: none;
      outline: none;
      font: inherit;
      font-size: 0.74rem;
      background: transparent;
      min-width: 0;
    }
    .sch-run__filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-bottom: 0.45rem;
      flex-shrink: 0;
    }
    .sch-run__filter {
      padding: 0.18rem 0.45rem;
      border: none;
      border-radius: 999px;
      background: var(--run-surface);
      font: inherit;
      font-size: 0.58rem;
      font-weight: 650;
      color: var(--run-muted);
      cursor: pointer;
    }
    .sch-run__filter--on {
      background: #e2e8f0;
      color: var(--run-ink);
      font-weight: 800;
    }
    .sch-run__task-list {
      list-style: none;
      margin: 0;
      padding: 0;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .sch-run__task {
      display: flex;
      gap: 0.5rem;
      width: 100%;
      padding: 0.52rem 0.58rem;
      margin-bottom: 0.35rem;
      border: none;
      border-radius: 10px;
      background: transparent;
      text-align: left;
      font: inherit;
      cursor: pointer;
      transition: background 0.12s;
    }
    .sch-run__task:hover {
      background: var(--run-surface);
    }
    .sch-run__task--on {
      background: var(--run-surface);
    }
    .sch-run__task-icon {
      display: grid;
      place-items: center;
      width: 2.15rem;
      height: 2.15rem;
      flex-shrink: 0;
    }
    .sch-run__task-icon mat-icon {
      font-size: 1.05rem;
      width: 1.05rem;
      height: 1.05rem;
      color: var(--run-muted);
    }
    .sch-run__task-body {
      flex: 1;
      min-width: 0;
    }
    .sch-run__task-row {
      display: flex;
      justify-content: space-between;
      gap: 0.3rem;
    }
    .sch-run__task-row strong {
      font-size: 0.76rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sch-run__task-meta {
      display: block;
      margin-top: 0.1rem;
      font-size: 0.62rem;
      color: var(--run-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sch-run__task-foot {
      display: block;
      margin-top: 0.18rem;
      font-size: 0.58rem;
      color: #94a3b8;
    }
    .sch-run__empty {
      padding: 1.25rem 0.5rem;
      text-align: center;
      font-size: 0.74rem;
      color: var(--run-muted);
    }
    .sch-run__pill {
      padding: 0.08rem 0.32rem;
      border-radius: 999px;
      font-size: 0.52rem;
      font-weight: 700;
      text-transform: uppercase;
      background: var(--run-surface);
      color: var(--run-muted);
      flex-shrink: 0;
    }
    .sch-run__opt-grid {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-bottom: 0.65rem;
    }
    .sch-run__opt-card {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.55rem 0.65rem;
      border: none;
      border-radius: 10px;
      background: transparent;
      transition: background 0.12s;
    }
    .sch-run__opt-card--on {
      background: var(--run-surface);
    }
    .sch-run__opt-icon {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      flex-shrink: 0;
      color: var(--run-muted);
    }
    .sch-run__opt-icon mat-icon {
      font-size: 1.05rem;
      width: 1.05rem;
      height: 1.05rem;
    }
    .sch-run__opt-copy {
      flex: 1;
      min-width: 0;
    }
    .sch-run__opt-copy strong {
      display: block;
      font-size: 0.72rem;
      font-weight: 800;
    }
    .sch-run__opt-copy span {
      display: block;
      margin-top: 0.12rem;
      font-size: 0.62rem;
      color: var(--run-muted);
      line-height: 1.4;
    }
    .sch-run__pipeline {
      margin-bottom: 0.65rem;
      padding: 0.55rem 0;
    }
    .sch-run__pipeline h4 {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0 0 0.45rem;
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--run-muted);
    }
    .sch-run__pipeline h4 mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: var(--run-muted);
    }
    .sch-run__pipeline ol,
    .sch-run__timeline {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .sch-run__timeline li {
      display: grid;
      grid-template-columns: auto auto 1fr;
      gap: 0.45rem;
      align-items: flex-start;
      padding: 0.35rem 0 0.35rem 0.15rem;
      position: relative;
      opacity: 0.45;
    }
    .sch-run__timeline li:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 0.55rem;
      top: 1.85rem;
      bottom: -0.15rem;
      width: 2px;
      background: linear-gradient(180deg, var(--run-border), transparent);
    }
    .sch-run__step--on {
      opacity: 1;
    }
    .sch-run__step--on .sch-run__step-num {
      background: var(--run-ink);
      color: #fff;
    }
    .sch-run__step--skip {
      opacity: 0.3;
      text-decoration: line-through;
    }
    .sch-run__step-num {
      display: grid;
      place-items: center;
      width: 1.15rem;
      height: 1.15rem;
      border-radius: 999px;
      font-size: 0.52rem;
      font-weight: 800;
      background: var(--run-surface);
      color: var(--run-muted);
      flex-shrink: 0;
      z-index: 1;
    }
    .sch-run__step-icon {
      display: grid;
      place-items: center;
      width: 1.35rem;
      height: 1.35rem;
      color: var(--run-muted);
      flex-shrink: 0;
    }
    .sch-run__step-icon mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .sch-run__step-text strong {
      display: block;
      font-size: 0.68rem;
    }
    .sch-run__step-text span {
      display: block;
      font-size: 0.58rem;
      color: var(--run-muted);
    }
    .sch-run__full {
      width: 100%;
    }
    .sch-run__warnings {
      list-style: none;
      margin: 0.5rem 0 0;
      padding: 0;
    }
    .sch-run__warnings li {
      display: flex;
      gap: 0.3rem;
      padding: 0.38rem 0.48rem;
      margin-bottom: 0.25rem;
      border-radius: 8px;
      font-size: 0.66rem;
      line-height: 1.4;
      color: var(--run-muted);
      background: var(--run-surface);
    }
    .sch-run__warnings mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      flex-shrink: 0;
    }
    .sch-run__card {
      margin-bottom: 0.55rem;
      padding: 0.6rem 0;
    }
    .sch-run__card h4 {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0 0 0.45rem;
      font-size: 0.72rem;
      font-weight: 800;
    }
    .sch-run__card h4 mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: var(--run-muted);
    }
    .sch-run__card dl {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem 0.5rem;
      margin: 0;
      font-size: 0.68rem;
    }
    .sch-run__card dt {
      font-size: 0.52rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
    }
    .sch-run__card dd {
      margin: 0.05rem 0 0;
      font-weight: 600;
      word-break: break-word;
    }
    .sch-run__dl-wide {
      grid-column: 1 / -1;
    }
    .sch-run__cmd {
      word-break: break-all;
      line-height: 1.45;
    }
    .sch-run__last-run {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem;
      margin: 0;
      font-size: 0.68rem;
    }
    .sch-run__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.2rem;
    }
    .sch-run__tags span {
      padding: 0.08rem 0.35rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 650;
      background: #f1f5f9;
      color: #475569;
    }
    .sch-run__preview-block h4 {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0 0 0.4rem;
      font-size: 0.62rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--run-muted);
    }
    .sch-run__preview-block h4 mat-icon {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
      color: var(--run-muted);
    }
    .sch-run__preview-code {
      margin: 0;
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
      font-family: var(--app-font-mono, ui-monospace, monospace);
      font-size: 0.65rem;
      line-height: 1.55;
      color: var(--run-ink);
      background: var(--run-surface);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 12rem;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .sch-run__actions {
      display: flex !important;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
      flex-shrink: 0;
      padding: 0.75rem 1.1rem 0.95rem !important;
      background: #fff;
    }
    .sch-run__actions-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
    }
    .sch-run__mode-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      width: fit-content;
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--run-muted);
    }
    .sch-run__mode-pill mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .sch-run__actions-target {
      font-size: 0.66rem;
      color: var(--run-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 22rem;
    }
    .sch-run__actions-hint {
      font-size: 0.68rem;
      color: var(--run-muted);
    }
    .sch-run__actions-btns {
      display: flex;
      gap: 0.4rem;
      flex-shrink: 0;
    }
    .sch-run__cancel {
      border-radius: 10px !important;
    }
    .sch-run__submit mat-icon {
      margin-right: 0.25rem;
      font-size: 1.05rem;
      width: 1.05rem;
      height: 1.05rem;
      vertical-align: -3px;
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
      font-size: 0.92em;
    }
    @media (max-width: 1000px) {
      .sch-run__layout {
        grid-template-columns: 1fr 1fr;
      }
      .sch-run__col--detail {
        grid-column: 1 / -1;
        max-height: 36vh;
      }
    }
    @media (max-width: 640px) {
      .sch-run {
        min-height: min(92vh, 900px);
      }
      .sch-run__layout {
        grid-template-columns: 1fr;
      }
      .sch-run__col {
        max-height: 38vh;
      }
    }
  `,
})
export class SchedulerRunDialogComponent {
  readonly data = inject<SchedulerRunDialogData>(MAT_DIALOG_DATA)
  readonly dialogRef = inject(MatDialogRef<SchedulerRunDialogComponent, SchedulerRunOptions | undefined>)
  private readonly fb = inject(FormBuilder)

  readonly typeLabels = SCHEDULER_TYPE_LABELS
  readonly searchTerm = signal('')
  readonly statusFilter = signal<SchedulerTaskStatus | 'all'>('all')
  readonly statusFilters: SchedulerTaskStatus[] = ['running', 'paused', 'failed']

  readonly form = this.fb.group({
    taskId: [this.data.preselectedId ?? this.data.tasks[0]?.id ?? ''],
    dryRun: [false],
    forceRun: [false],
    notifyOnComplete: [true],
    note: [''],
  })

  readonly filteredTasks = computed(() => {
    const term = this.searchTerm().toLowerCase().trim()
    const status = this.statusFilter()
    return this.data.tasks.filter((t) => {
      if (status !== 'all' && t.status !== status) return false
      if (!term) return true
      const blob = `${t.name} ${t.target} ${t.type} ${t.owner} ${t.tags.join(' ')}`.toLowerCase()
      return blob.includes(term)
    })
  })

  readonly execSteps = computed(() => {
    const raw = this.form.getRawValue()
    const notify = !!raw.notifyOnComplete
    const dry = !!raw.dryRun
    return EXEC_STEPS.map((s) => ({
      ...s,
      active: true,
      skip: s.id === 'notify' && !notify,
      hint:
        s.id === 'run' && dry
          ? 'Simulación — sin cambios reales'
          : s.id === 'notify' && !notify
            ? 'Desactivado'
            : s.hint,
    }))
  })

  constructor() {
    this.syncOptionsForTask(this.selectedTask())
    this.form.get('taskId')?.valueChanges.subscribe(() => {
      this.syncOptionsForTask(this.selectedTask())
    })
  }

  selectedTask = (): SchedulerTask | undefined =>
    this.data.tasks.find((t) => t.id === this.form.getRawValue().taskId)

  typeIcon = (t: SchedulerTaskType): string => TYPE_ICON[t] ?? 'event'
  typeLogo = (t: SchedulerTaskType): NavLogoKey | null => SCHEDULER_TYPE_LOGO[t] ?? null
  cloudLogo = (task: SchedulerTask): NavLogoKey => inferCloudProvider(task)
  cloudShortLabel = (task: SchedulerTask): string => {
    const id = inferCloudProvider(task)
    return id === 'aws' ? 'AWS' : id === 'gcp' ? 'GCP' : 'Azure'
  }
  cloudLabel = (task: SchedulerTask): string => CLOUD_PROVIDER_LABELS[inferCloudProvider(task)]
  statusLabel = (s: SchedulerTask['status']): string => SCHEDULER_STATUS_LABELS[s]
  resultLabel = (r: SchedulerTask['lastResult']): string => SCHEDULER_RESULT_LABELS[r]
  envLabel = (e: SchedulerTask['environment'] | undefined): string =>
    ENVIRONMENT_LABELS[e ?? 'production']
  prioLabel = (p: SchedulerTask['priority'] | undefined): string =>
    PRIORITY_LABELS[p ?? 'normal']
  timeoutLabel = (a: NonNullable<SchedulerTask['timeoutAction']>): string =>
    TIMEOUT_ACTION_LABELS[a]
  backoffLabel = (b: SchedulerTask['retryBackoff'] | undefined): string =>
    RETRY_BACKOFF_LABELS[b ?? 'fixed']
  formatNext = (task: SchedulerTask): string =>
    formatNextRunFromCron(task.cron, task.timezone)

  selectTask = (id: string): void => {
    this.form.patchValue({ taskId: id })
  }

  runWarnings = (): string[] => {
    const task = this.selectedTask()
    if (!task) return []
    const raw = this.form.getRawValue()
    const warnings: string[] = []
    if (!task.enabled && !raw.forceRun) {
      warnings.push('La tarea está pausada. Activa «Forzar ejecución» para lanzarla.')
    }
    if (task.skipIfRunning !== false && task.status === 'running' && !raw.forceRun && !raw.dryRun) {
      warnings.push('Puede omitirse si ya hay una ejecución en curso (skipIfRunning).')
    }
    if (task.environment === 'production' && !raw.dryRun) {
      warnings.push('Entorno producción — considera dry-run antes de ejecutar.')
    }
    if (task.lastResult === 'error') {
      warnings.push(`Última ejecución con error (${task.lastRun}).`)
    }
    if (task.failures7d > 0) {
      warnings.push(`${task.failures7d} fallo(s) en los últimos 7 días.`)
    }
    return warnings
  }

  runPreview = (): string => {
    const task = this.selectedTask()
    if (!task) return ''
    const raw = this.form.getRawValue()
    const ts = new Date().toISOString()
    if (raw.dryRun) {
      return [
        `[${ts}] DRY-RUN iniciado`,
        `task=${task.id} type=${task.type} cloud=${inferCloudProvider(task)} env=${task.environment ?? 'production'}`,
        `target=${task.target}`,
        task.credentialProfile ? `credentials=${task.credentialProfile}` : '',
        task.executor ? `executor=${task.executor}` : '',
        task.command ? `$ ${task.command}` : '# sin comando',
        task.parameters ? `params: ${task.parameters}` : '',
        '→ Validación OK (simulado)',
        '→ Sin cambios en infraestructura',
      ]
        .filter(Boolean)
        .join('\n')
    }
    if (!task.enabled && !raw.forceRun) {
      return '[skipped] Ejecución omitida — activa «Forzar ejecución»'
    }
    return [
      `[${ts}] RUN manual iniciado`,
      `task=${task.id} priority=${task.priority ?? 'normal'}`,
      `target=${task.target}`,
      task.executor ? `executor=${task.executor}` : 'executor=default',
      task.command ? `$ ${task.command}` : '',
      `retries=${task.retries} max=${task.maxDuration}`,
      raw.notifyOnComplete ? `notify=${task.notifyChannels ?? 'default'}` : 'notify=off',
      raw.note ? `note="${raw.note}"` : '',
      '→ Esperando resultado del agente…',
    ]
      .filter(Boolean)
      .join('\n')
  }

  canRun = (): boolean => {
    const task = this.selectedTask()
    if (!task) return false
    const raw = this.form.getRawValue()
    if (raw.dryRun) return true
    if (!task.enabled && !raw.forceRun) return false
    return true
  }

  private syncOptionsForTask = (task: SchedulerTask | undefined): void => {
    if (!task) return
    const notifyDefault = task.notifyOnSuccess || task.notifyOnFailure
    this.form.patchValue({ notifyOnComplete: notifyDefault }, { emitEvent: false })
  }

  handleRun = (): void => {
    if (!this.canRun()) return
    const raw = this.form.getRawValue()
    this.dialogRef.close({
      taskId: raw.taskId ?? '',
      dryRun: !!raw.dryRun,
      forceRun: !!raw.forceRun,
      notifyOnComplete: !!raw.notifyOnComplete,
      note: raw.note?.trim() ?? '',
    } satisfies SchedulerRunOptions)
  }
}
