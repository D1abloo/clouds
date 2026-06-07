import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import {
  RUNBOOK_CATEGORY_LABELS,
  RUNBOOK_STATUS_LABELS,
  RUNBOOK_STEP_TYPE_LABELS,
  RUNBOOK_TRIGGER_LABELS,
  type Runbook,
  type RunbookCategory,
} from './runbooks.demo'

export interface RunbookDetailDialogData {
  runbook: Runbook
  justCreated?: boolean
}

const CATEGORY_META: Record<RunbookCategory, { icon: string; color: string }> = {
  infra: { icon: 'dns', color: '#38bdf8' },
  app: { icon: 'web', color: '#844fba' },
  db: { icon: 'storage', color: '#f59e0b' },
  security: { icon: 'shield', color: '#ef4444' },
  k8s: { icon: 'hub', color: '#22c55e' },
}

const STEP_TYPE_ICON: Record<string, string> = {
  command: 'terminal',
  check: 'fact_check',
  approval: 'verified_user',
  notify: 'campaign',
}

@Component({
  selector: 'app-runbook-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="rb-detail">
      <header class="rb-detail__header">
        <div class="rb-detail__head-left">
          <span
            class="rb-detail__cat-icon"
            [style.background]="'color-mix(in srgb, ' + categoryMeta.color + ' 14%, transparent)'"
            [style.color]="categoryMeta.color"
          >
            <mat-icon>{{ categoryMeta.icon }}</mat-icon>
          </span>
          <div>
            @if (data.justCreated) {
              <span class="rb-detail__new-badge">
                <mat-icon>fiber_new</mat-icon>
                Recién creado
              </span>
            }
            <h2 mat-dialog-title>{{ data.runbook.name }}</h2>
            <p class="rb-detail__id mono">{{ data.runbook.id }}</p>
          </div>
        </div>
        <div class="rb-detail__badges">
          <span class="rb-detail__status" [attr.data-status]="data.runbook.status">
            {{ statusLabel() }}
          </span>
          @if (data.runbook.requiresApproval) {
            <span class="rb-detail__approval">
              <mat-icon>verified_user</mat-icon>
              Requiere aprobación
            </span>
          }
        </div>
      </header>

      <mat-dialog-content class="rb-detail__body">
        <p class="rb-detail__desc">{{ data.runbook.description }}</p>

        <div class="rb-detail__metrics">
          <div class="rb-detail__metric">
            <mat-icon>category</mat-icon>
            <div>
              <span>Categoría</span>
              <strong>{{ categoryLabel() }}</strong>
            </div>
          </div>
          <div class="rb-detail__metric">
            <mat-icon>bolt</mat-icon>
            <div>
              <span>Disparador</span>
              <strong>{{ triggerLabel() }}</strong>
            </div>
          </div>
          <div class="rb-detail__metric">
            <mat-icon>format_list_numbered</mat-icon>
            <div>
              <span>Pasos</span>
              <strong>{{ data.runbook.steps.length }}</strong>
            </div>
          </div>
          <div class="rb-detail__metric">
            <mat-icon>schedule</mat-icon>
            <div>
              <span>Duración est.</span>
              <strong>{{ data.runbook.avgDuration }}</strong>
            </div>
          </div>
        </div>

        <section class="rb-detail__panel">
          <h3><mat-icon>info</mat-icon> Información operativa</h3>
          <dl class="rb-detail__dl">
            <div>
              <dt>Propietario / equipo</dt>
              <dd>{{ data.runbook.owner }}</dd>
            </div>
            <div>
              <dt>Objetivo por defecto</dt>
              <dd class="mono">{{ data.runbook.linkedTo || '—' }}</dd>
            </div>
            @if (data.runbook.defaultInstanceId) {
              <div>
                <dt>ID instancia vinculada</dt>
                <dd class="mono">{{ data.runbook.defaultInstanceId }}</dd>
              </div>
            }
            @if (data.runbook.defaultProvider) {
              <div>
                <dt>Proveedor cloud</dt>
                <dd>{{ data.runbook.defaultProvider }}</dd>
              </div>
            }
            @if (data.runbook.defaultAccountName) {
              <div>
                <dt>Cuenta cloud</dt>
                <dd>{{ data.runbook.defaultAccountName }}</dd>
              </div>
            }
            @if (data.runbook.createdAt) {
              <div>
                <dt>Creado</dt>
                <dd>{{ data.runbook.createdAt | date: 'dd MMM yyyy, HH:mm' }}</dd>
              </div>
            }
            <div>
              <dt>Última ejecución</dt>
              <dd>{{ data.runbook.lastRunLabel }}</dd>
            </div>
            <div>
              <dt>Tasa de éxito</dt>
              <dd>{{ data.runbook.successRate }}%</dd>
            </div>
            <div>
              <dt>Ejecuciones (7 días)</dt>
              <dd>{{ data.runbook.executions7d }}</dd>
            </div>
          </dl>
        </section>

        @if (data.runbook.tags.length) {
          <section class="rb-detail__panel">
            <h3><mat-icon>label</mat-icon> Etiquetas</h3>
            <div class="rb-detail__tags">
              @for (tag of data.runbook.tags; track tag) {
                <span>{{ tag }}</span>
              }
            </div>
          </section>
        }

        <section class="rb-detail__panel">
          <h3>
            <mat-icon>format_list_numbered</mat-icon>
            Pasos del procedimiento ({{ data.runbook.steps.length }})
          </h3>
          <ol class="rb-detail__timeline">
            @for (step of data.runbook.steps; track step.order) {
              <li class="rb-detail__step" [attr.data-type]="step.type">
                <span class="rb-detail__step-icon">
                  <mat-icon>{{ stepTypeIcon(step.type) }}</mat-icon>
                </span>
                <div class="rb-detail__step-body">
                  <div class="rb-detail__step-head">
                    <strong>Paso {{ step.order }} — {{ step.title }}</strong>
                    <span class="rb-detail__step-type">{{ stepTypeLabel(step.type) }}</span>
                  </div>
                  @if (step.command) {
                    <pre class="rb-detail__cmd mono">$ {{ step.command }}</pre>
                  } @else if (step.type === 'check') {
                    <p class="rb-detail__step-hint">Comprobación manual o automática de criterios</p>
                  } @else if (step.type === 'approval') {
                    <p class="rb-detail__step-hint">Pausa hasta aprobación de un responsable</p>
                  } @else if (step.type === 'notify') {
                    <p class="rb-detail__step-hint">Envío de notificación a canal o equipo</p>
                  }
                </div>
              </li>
            }
          </ol>
        </section>

        @if (data.justCreated) {
          <p class="rb-detail__tip">
            <mat-icon>lightbulb</mat-icon>
            El runbook se guardó como borrador. Puedes ejecutarlo desde el catálogo cuando esté listo.
          </p>
        }
      </mat-dialog-content>

      <mat-dialog-actions class="rb-detail__footer" align="end">
        <button mat-button type="button" mat-dialog-close>Cerrar</button>
        <button mat-flat-button color="primary" type="button" (click)="handleExecute()">
          <mat-icon>play_arrow</mat-icon>
          Ejecutar runbook
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .rb-detail {
      display: flex;
      flex-direction: column;
      max-height: min(94vh, 860px);
      color: #111;
    }
    .rb-detail__header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.65rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid color-mix(in srgb, #111 8%, transparent);
    }
    .rb-detail__head-left {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
    }
    .rb-detail__cat-icon {
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 12px;
      flex-shrink: 0;
    }
    .rb-detail__cat-icon mat-icon {
      font-size: 1.35rem;
      width: 1.35rem;
      height: 1.35rem;
    }
    h2[mat-dialog-title] {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
      padding: 0;
    }
    .rb-detail__id {
      margin: 0.15rem 0 0;
      font-size: 0.68rem;
      color: #64748b;
    }
    .rb-detail__new-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      margin-bottom: 0.25rem;
      padding: 0.12rem 0.45rem;
      border-radius: 6px;
      font-size: 0.62rem;
      font-weight: 800;
      text-transform: uppercase;
      background: color-mix(in srgb, #22c55e 14%, transparent);
      color: #15803d;
    }
    .rb-detail__new-badge mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .rb-detail__badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      align-items: center;
    }
    .rb-detail__status {
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    .rb-detail__status[data-status='published'] {
      background: color-mix(in srgb, #22c55e 14%, transparent);
      color: #15803d;
    }
    .rb-detail__status[data-status='draft'] {
      background: color-mix(in srgb, #844fba 12%, transparent);
      color: #844fba;
    }
    .rb-detail__status[data-status='deprecated'] {
      background: color-mix(in srgb, #111 10%, transparent);
      color: #64748b;
    }
    .rb-detail__approval {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.65rem;
      font-weight: 700;
      color: #b45309;
      padding: 0.2rem 0.45rem;
      border-radius: 6px;
      background: color-mix(in srgb, #f59e0b 12%, transparent);
    }
    .rb-detail__approval mat-icon {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
    }
    .rb-detail__body {
      flex: 1;
      overflow-y: auto;
      padding-top: 0.75rem !important;
      scrollbar-width: thin;
    }
    .rb-detail__desc {
      margin: 0 0 0.75rem;
      font-size: 0.82rem;
      line-height: 1.55;
      color: #333;
    }
    .rb-detail__metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.45rem;
      margin-bottom: 0.75rem;
    }
    .rb-detail__metric {
      display: flex;
      gap: 0.4rem;
      padding: 0.5rem 0.55rem;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, #111 7%, transparent);
      background: color-mix(in srgb, #111 2%, transparent);
    }
    .rb-detail__metric mat-icon {
      font-size: 1.05rem;
      width: 1.05rem;
      height: 1.05rem;
      color: #844fba;
    }
    .rb-detail__metric span {
      display: block;
      font-size: 0.6rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .rb-detail__metric strong {
      display: block;
      font-size: 0.76rem;
      margin-top: 0.08rem;
    }
    .rb-detail__panel {
      margin-bottom: 0.75rem;
      padding: 0.65rem 0.75rem;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, #111 8%, transparent);
      background: var(--app-card, #fff);
    }
    .rb-detail__panel h3 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.55rem;
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .rb-detail__panel h3 mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #844fba;
    }
    .rb-detail__dl {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.5rem 0.85rem;
      margin: 0;
    }
    .rb-detail__dl dt {
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .rb-detail__dl dd {
      margin: 0.1rem 0 0;
      font-size: 0.76rem;
      font-weight: 600;
      word-break: break-word;
    }
    .rb-detail__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }
    .rb-detail__tags span {
      font-size: 0.68rem;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
      background: color-mix(in srgb, #111 5%, transparent);
      color: #333;
      font-weight: 600;
    }
    .rb-detail__timeline {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .rb-detail__step {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.55rem;
      padding: 0.55rem 0;
      border-bottom: 1px solid color-mix(in srgb, #111 6%, transparent);
    }
    .rb-detail__step:last-child {
      border-bottom: none;
    }
    .rb-detail__step-icon {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: 10px;
      background: color-mix(in srgb, #844fba 12%, transparent);
      color: #844fba;
    }
    .rb-detail__step[data-type='check'] .rb-detail__step-icon {
      background: color-mix(in srgb, #38bdf8 14%, transparent);
      color: #0284c7;
    }
    .rb-detail__step[data-type='approval'] .rb-detail__step-icon {
      background: color-mix(in srgb, #f59e0b 14%, transparent);
      color: #b45309;
    }
    .rb-detail__step[data-type='notify'] .rb-detail__step-icon {
      background: color-mix(in srgb, #22c55e 14%, transparent);
      color: #15803d;
    }
    .rb-detail__step-icon mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .rb-detail__step-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.2rem;
    }
    .rb-detail__step-head strong {
      font-size: 0.8rem;
      flex: 1;
      min-width: 140px;
    }
    .rb-detail__step-type {
      font-size: 0.6rem;
      font-weight: 800;
      text-transform: uppercase;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      background: color-mix(in srgb, #111 6%, transparent);
      color: #64748b;
    }
    .rb-detail__cmd {
      margin: 0;
      padding: 0.4rem 0.55rem;
      border-radius: 8px;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 0.68rem;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .rb-detail__step-hint {
      margin: 0;
      font-size: 0.7rem;
      color: #64748b;
      font-style: italic;
    }
    .rb-detail__tip {
      display: flex;
      align-items: flex-start;
      gap: 0.4rem;
      margin: 0;
      padding: 0.55rem 0.65rem;
      border-radius: 10px;
      font-size: 0.72rem;
      line-height: 1.45;
      color: #334155;
      background: color-mix(in srgb, #844fba 6%, transparent);
      border: 1px solid color-mix(in srgb, #844fba 16%, transparent);
    }
    .rb-detail__tip mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: #844fba;
      flex-shrink: 0;
    }
    .rb-detail__footer {
      border-top: 1px solid color-mix(in srgb, #111 8%, transparent);
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
  `,
})
export class RunbookDetailDialogComponent {
  readonly data = inject<RunbookDetailDialogData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<RunbookDetailDialogComponent, 'execute' | void>)

  get categoryMeta(): { icon: string; color: string } {
    return CATEGORY_META[this.data.runbook.category]
  }

  categoryLabel = (): string => RUNBOOK_CATEGORY_LABELS[this.data.runbook.category]

  triggerLabel = (): string => RUNBOOK_TRIGGER_LABELS[this.data.runbook.trigger]

  statusLabel = (): string => RUNBOOK_STATUS_LABELS[this.data.runbook.status]

  stepTypeIcon = (type: string): string => STEP_TYPE_ICON[type] ?? 'chevron_right'

  stepTypeLabel = (type: Runbook['steps'][number]['type']): string =>
    RUNBOOK_STEP_TYPE_LABELS[type] ?? type

  handleExecute = (): void => {
    this.dialogRef.close('execute')
  }
}
