import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { ToastService } from '../../core/services/toast.service'
import {
  downloadModuleReportCompose,
  exportModuleReportCsv,
  exportModuleReportJson,
  exportModuleReportMarkdown,
  exportModuleReportText,
  type ModuleOperationReport,
  type ModuleOpSection,
  type ModuleOpStatus,
} from './infrastructure-module-operations.util'

const statusLabel: Record<ModuleOpStatus, string> = {
  ok: 'Completado',
  warn: 'Atención',
  fail: 'Fallo',
}

const statusIcon: Record<ModuleOpStatus, string> = {
  ok: 'check_circle',
  warn: 'warning',
  fail: 'error',
}

const moduleLabel: Record<string, string> = {
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  network: 'Red',
  storage: 'Almacenamiento',
  backups: 'Copias de seguridad',
  'capacity-planner': 'Planificador de capacidad',
}

const actionIcon = (report: ModuleOperationReport): string => {
  const map: Record<string, string> = {
    inspect: 'search',
    logs: 'article',
    restart: 'restart_alt',
    shell: 'terminal',
    restore: 'restore',
    ping: 'wifi_tethering',
    traffic: 'map',
    analysis: 'analytics',
  }
  return map[report.actionId] ?? 'bolt'
}

@Component({
  selector: 'app-module-operation-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <div class="mod-op-dialog">
      <header class="mod-op-dialog__hero">
        <div class="mod-op-dialog__hero-icon" [attr.data-status]="data.status">
          <mat-icon>{{ actionIcon(data) }}</mat-icon>
        </div>
        <div class="mod-op-dialog__hero-body">
          <div class="mod-op-dialog__chips">
            <span class="mod-op-dialog__chip">{{ moduleLabel[data.moduleId] ?? data.moduleId }}</span>
            <span class="mod-op-dialog__chip mod-op-dialog__chip--muted">{{ data.actionLabel ?? data.actionId }}</span>
          </div>
          <h2 mat-dialog-title>{{ data.title }}</h2>
          <p class="mod-op-dialog__sub">{{ data.subtitle }}</p>
          @if (data.resourceName) {
            <p class="mod-op-dialog__resource mono">{{ data.resourceName }}</p>
          }
        </div>
        <span class="mod-op-dialog__badge" [attr.data-status]="data.status">
          <mat-icon>{{ statusIcon[data.status] }}</mat-icon>
          {{ statusLabel[data.status] }}
        </span>
      </header>

      <mat-dialog-content>
        @if (data.summary) {
          <p class="mod-op-dialog__summary">{{ data.summary }}</p>
        }

        @if (data.alerts?.length) {
          <ul class="mod-op-alerts">
            @for (a of data.alerts; track a.message) {
              <li [attr.data-severity]="a.severity">
                <mat-icon>{{ statusIcon[a.severity] }}</mat-icon>
                <span>{{ a.message }}</span>
              </li>
            }
          </ul>
        }

        @if (data.kpis.length) {
          <div class="mod-op-kpi-row">
            @for (k of data.kpis; track k.label) {
              <article [attr.data-tone]="k.tone">
                <div class="mod-op-kpi-row__icon">
                  <mat-icon>{{ k.icon ?? 'insights' }}</mat-icon>
                </div>
                <div>
                  <span>{{ k.label }}</span>
                  <strong>{{ k.value }}</strong>
                </div>
              </article>
            }
          </div>
        }

        @for (section of data.sections; track section.title) {
          <section class="mod-op-section">
            <header class="mod-op-section__head">
              @if (section.icon) {
                <mat-icon>{{ section.icon }}</mat-icon>
              }
              <h3>{{ section.title }}</h3>
            </header>
            <div class="mod-op-section__body">
              @if (section.items?.length) {
                <ul class="mod-op-list">
                  @for (item of section.items; track item) {
                    <li>{{ item }}</li>
                  }
                </ul>
              }
              @if (section.table) {
                <div class="mod-op-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        @for (h of section.table.headers; track h) {
                          <th>{{ h }}</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of section.table.rows; track $index) {
                        <tr>
                          @for (cell of row; track $index) {
                            <td [class.mono]="isMonoCell(cell)">{{ cell }}</td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
              @if (section.code) {
                <div class="mod-op-terminal" [class.mod-op-terminal--plain]="!isTerminalSection(section)">
                  @if (isTerminalSection(section)) {
                    <div class="mod-op-terminal__bar">
                      <span></span><span></span><span></span>
                      <em>{{ section.title }}</em>
                    </div>
                  }
                  <pre class="mono">{{ section.code }}</pre>
                </div>
              }
              @if (section.steps?.length) {
                <ol class="mod-op-steps">
                  @for (step of section.steps; track step.label) {
                    <li [attr.data-status]="step.status">
                      <div class="mod-op-steps__icon">
                        <mat-icon>{{ statusIcon[step.status] }}</mat-icon>
                      </div>
                      <div class="mod-op-steps__body">
                        <strong>{{ step.label }}</strong>
                        <span>{{ step.detail }}</span>
                      </div>
                      @if (step.durationMs) {
                        <em class="mono">{{ formatMs(step.durationMs) }}</em>
                      }
                    </li>
                  }
                </ol>
              }
            </div>
          </section>
        }

        @if (data.recommendations.length) {
          <section class="mod-op-section mod-op-section--rec">
            <header class="mod-op-section__head">
              <mat-icon>lightbulb</mat-icon>
              <h3>Recomendaciones</h3>
            </header>
            <ul class="mod-op-rec-list">
              @for (r of data.recommendations; track r) {
                <li>{{ r }}</li>
              }
            </ul>
          </section>
        }

        <footer class="mod-op-footer">
          <div>
            <span class="mod-op-footer__label">Agente</span>
            <span class="mono">{{ data.agent ?? 'cloudops-agent' }}</span>
          </div>
          <div>
            <span class="mod-op-footer__label">Generado</span>
            <span>{{ data.generatedAt }}</span>
          </div>
          <div>
            <span class="mod-op-footer__label">Duración</span>
            <span>{{ data.durationSec }}s</span>
          </div>
          @if (data.impact) {
            <div class="mod-op-footer__impact">
              <mat-icon>info</mat-icon>
              {{ data.impact }}
            </div>
          }
        </footer>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cerrar</button>
        <button mat-stroked-button type="button" [matMenuTriggerFor]="exportMenu">
          <mat-icon>download</mat-icon>
          Exportar informe
        </button>
        <mat-menu #exportMenu="matMenu">
          <button mat-menu-item type="button" (click)="handleExport('csv')">CSV</button>
          <button mat-menu-item type="button" (click)="handleExport('json')">JSON</button>
          <button mat-menu-item type="button" (click)="handleExport('md')">Markdown</button>
          <button mat-menu-item type="button" (click)="handleExport('txt')">Texto</button>
          @if (data.actionId === 'compose' || data.title.includes('Compose')) {
            <button mat-menu-item type="button" (click)="handleExport('yaml')">YAML compose</button>
          }
        </mat-menu>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .mod-op-dialog {
      --mod-op-accent: var(--infra-accent, #ff9900);
      --mod-op-accent-deep: var(--infra-accent-deep, #c2410c);
    }

    .mod-op-dialog__hero {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.75rem;
      align-items: start;
      padding: 0 0 0.85rem;
      margin-bottom: 0.25rem;
      border-bottom: 1px solid color-mix(in srgb, var(--mod-op-accent) 22%, transparent);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--mod-op-accent) 7%, var(--app-card)),
        var(--app-card)
      );
    }

    .mod-op-dialog__hero-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--mod-op-accent) 16%, transparent);
      border: 1px solid color-mix(in srgb, var(--mod-op-accent) 30%, transparent);
    }

    .mod-op-dialog__hero-icon mat-icon {
      color: var(--mod-op-accent-deep);
    }

    .mod-op-dialog__hero-icon[data-status='warn'] {
      background: color-mix(in srgb, #f59e0b 16%, transparent);
      border-color: color-mix(in srgb, #f59e0b 30%, transparent);
    }

    .mod-op-dialog__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-bottom: 0.25rem;
    }

    .mod-op-dialog__chip {
      padding: 0.12rem 0.45rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: color-mix(in srgb, var(--mod-op-accent) 14%, transparent);
      color: var(--mod-op-accent-deep);
    }

    .mod-op-dialog__chip--muted {
      background: color-mix(in srgb, var(--app-text) 6%, transparent);
      color: var(--app-text-muted);
    }

    h2[mat-dialog-title] {
      margin: 0;
      padding: 0;
      font-size: 1.05rem;
      font-weight: 850;
      line-height: 1.25;
    }

    .mod-op-dialog__sub {
      margin: 0.2rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
    }

    .mod-op-dialog__resource {
      margin: 0.25rem 0 0;
      font-size: 0.68rem;
      color: var(--mod-op-accent-deep);
    }

    .mod-op-dialog__badge {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.28rem 0.55rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .mod-op-dialog__badge mat-icon {
      width: 14px;
      height: 14px;
      font-size: 14px;
    }

    .mod-op-dialog__badge[data-status='ok'] {
      background: color-mix(in srgb, #10b981 16%, transparent);
      color: #047857;
    }

    .mod-op-dialog__badge[data-status='warn'] {
      background: color-mix(in srgb, #f59e0b 16%, transparent);
      color: #92400e;
    }

    .mod-op-dialog__badge[data-status='fail'] {
      background: color-mix(in srgb, #ef4444 16%, transparent);
      color: #b91c1c;
    }

    .mod-op-dialog__summary {
      margin: 0 0 0.65rem;
      padding: 0.55rem 0.65rem;
      border-radius: 8px;
      font-size: 0.72rem;
      line-height: 1.45;
      background: color-mix(in srgb, var(--mod-op-accent) 6%, var(--app-card));
      border-left: 3px solid var(--mod-op-accent);
      color: var(--app-text);
    }

    .mod-op-alerts {
      list-style: none;
      margin: 0 0 0.65rem;
      padding: 0;
      display: grid;
      gap: 0.35rem;
    }

    .mod-op-alerts li {
      display: flex;
      align-items: flex-start;
      gap: 0.4rem;
      padding: 0.45rem 0.55rem;
      border-radius: 8px;
      font-size: 0.68rem;
    }

    .mod-op-alerts li mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      flex-shrink: 0;
    }

    .mod-op-alerts li[data-severity='warn'] {
      background: color-mix(in srgb, #f59e0b 10%, transparent);
      color: #92400e;
    }

    .mod-op-alerts li[data-severity='fail'] {
      background: color-mix(in srgb, #ef4444 10%, transparent);
      color: #b91c1c;
    }

    .mod-op-kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.45rem;
      margin-bottom: 0.75rem;
    }

    .mod-op-kpi-row article {
      display: flex;
      gap: 0.45rem;
      align-items: flex-start;
      padding: 0.5rem 0.55rem;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      background: color-mix(in srgb, var(--app-surface) 25%, var(--app-card));
    }

    .mod-op-kpi-row article[data-tone='warn'] strong {
      color: #b45309;
    }

    .mod-op-kpi-row article[data-tone='crit'] strong {
      color: #dc2626;
    }

    .mod-op-kpi-row__icon {
      width: 28px;
      height: 28px;
      border-radius: 7px;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--mod-op-accent) 12%, transparent);
      flex-shrink: 0;
    }

    .mod-op-kpi-row__icon mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      color: var(--mod-op-accent-deep);
    }

    .mod-op-kpi-row span {
      display: block;
      font-size: 0.55rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }

    .mod-op-kpi-row strong {
      display: block;
      margin-top: 0.08rem;
      font-size: 0.8rem;
      font-weight: 750;
    }

    .mod-op-section {
      margin-bottom: 0.75rem;
      border: 1px solid color-mix(in srgb, var(--app-text) 7%, transparent);
      border-radius: 10px;
      overflow: hidden;
    }

    .mod-op-section__head {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.6rem;
      background: color-mix(in srgb, var(--app-text) 4%, var(--app-card));
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }

    .mod-op-section__head h3 {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 750;
    }

    .mod-op-section__head mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      color: var(--mod-op-accent-deep);
    }

    .mod-op-section__body {
      padding: 0.55rem 0.6rem;
    }

    .mod-op-list {
      margin: 0;
      padding-left: 1.1rem;
      font-size: 0.68rem;
      color: var(--app-text-muted);
      line-height: 1.5;
    }

    .mod-op-table-wrap {
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }

    .mod-op-table-wrap table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.68rem;
    }

    .mod-op-table-wrap th,
    .mod-op-table-wrap td {
      padding: 0.38rem 0.5rem;
      text-align: left;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }

    .mod-op-table-wrap tbody tr:nth-child(even) {
      background: color-mix(in srgb, var(--app-text) 2%, transparent);
    }

    .mod-op-table-wrap th {
      font-size: 0.58rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
      background: color-mix(in srgb, var(--app-text) 3%, var(--app-card));
    }

    .mod-op-terminal {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #334155;
    }

    .mod-op-terminal__bar {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.55rem;
      background: #1e293b;
      border-bottom: 1px solid #334155;
    }

    .mod-op-terminal__bar span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #475569;
    }

    .mod-op-terminal__bar span:nth-child(1) { background: #ef4444; }
    .mod-op-terminal__bar span:nth-child(2) { background: #f59e0b; }
    .mod-op-terminal__bar span:nth-child(3) { background: #22c55e; }

    .mod-op-terminal__bar em {
      margin-left: auto;
      font-style: normal;
      font-size: 0.58rem;
      color: #94a3b8;
    }

    .mod-op-terminal pre {
      margin: 0;
      padding: 0.65rem 0.75rem;
      max-height: 280px;
      overflow: auto;
      font-size: 0.64rem;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .mod-op-terminal pre {
      background: #0f172a;
      color: #e2e8f0;
    }

    .mod-op-terminal--plain {
      border-color: color-mix(in srgb, var(--app-text) 10%, transparent);
    }

    .mod-op-terminal--plain pre {
      background: color-mix(in srgb, var(--app-text) 5%, var(--app-card));
      color: inherit;
    }

    .mod-op-steps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0;
    }

    .mod-op-steps li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.5rem;
      align-items: start;
      padding: 0.5rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }

    .mod-op-steps li:last-child {
      border-bottom: none;
    }

    .mod-op-steps__icon mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }

    .mod-op-steps li[data-status='ok'] .mod-op-steps__icon mat-icon { color: #059669; }
    .mod-op-steps li[data-status='warn'] .mod-op-steps__icon mat-icon { color: #b45309; }
    .mod-op-steps li[data-status='fail'] .mod-op-steps__icon mat-icon { color: #dc2626; }

    .mod-op-steps strong {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
    }

    .mod-op-steps span {
      display: block;
      font-size: 0.62rem;
      color: var(--app-text-muted);
      margin-top: 0.08rem;
    }

    .mod-op-steps em {
      font-style: normal;
      font-size: 0.58rem;
      color: var(--app-text-muted);
      white-space: nowrap;
    }

    .mod-op-section--rec {
      border-color: color-mix(in srgb, #f59e0b 25%, transparent);
      background: color-mix(in srgb, #f59e0b 4%, var(--app-card));
    }

    .mod-op-rec-list {
      margin: 0;
      padding: 0.55rem 0.6rem 0.65rem 1.8rem;
      font-size: 0.68rem;
      color: #92400e;
      line-height: 1.45;
    }

    .mod-op-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem 1rem;
      padding: 0.55rem 0.65rem;
      margin-top: 0.25rem;
      border-radius: 8px;
      background: color-mix(in srgb, var(--app-text) 4%, var(--app-card));
      font-size: 0.62rem;
    }

    .mod-op-footer__label {
      display: block;
      font-size: 0.52rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }

    .mod-op-footer__impact {
      flex: 1 1 100%;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding-top: 0.25rem;
      border-top: 1px dashed color-mix(in srgb, var(--app-text) 10%, transparent);
      color: var(--app-text-muted);
    }

    .mod-op-footer__impact mat-icon {
      width: 14px;
      height: 14px;
      font-size: 14px;
      color: var(--mod-op-accent-deep);
    }

    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  `,
})
export class ModuleOperationDialogComponent {
  readonly data = inject<ModuleOperationReport>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)
  readonly statusLabel = statusLabel
  readonly statusIcon = statusIcon
  readonly moduleLabel = moduleLabel
  readonly actionIcon = actionIcon

  handleExport = (format: 'csv' | 'json' | 'md' | 'txt' | 'yaml'): void => {
    let filename = ''
    if (format === 'csv') filename = exportModuleReportCsv(this.data)
    else if (format === 'json') filename = exportModuleReportJson(this.data)
    else if (format === 'md') filename = exportModuleReportMarkdown(this.data)
    else if (format === 'yaml') filename = downloadModuleReportCompose(this.data) ?? ''
    else filename = exportModuleReportText(this.data)
    if (filename) this.toast.success(`Descargado · ${filename}`)
  }

  isTerminalSection = (section: ModuleOpSection): boolean =>
    /terminal|log|tail|ping|traceroute|shell|kubectl|yaml|json|compose/i.test(`${section.title} ${section.icon ?? ''}`)

  isMonoCell = (cell: string): boolean => /[/:@.]/.test(cell) || cell.length > 18

  formatMs = (ms: number): string => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`)
}
