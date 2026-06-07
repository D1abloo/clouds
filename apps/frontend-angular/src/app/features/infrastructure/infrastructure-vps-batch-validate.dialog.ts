import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { ToastService } from '../../core/services/toast.service'
import type { BatchValidateReport } from './infrastructure-vps-batch-validate.util'
import type { VpsCheckStatus } from './infrastructure-vps-operations.util'
import {
  exportBatchValidateCsv,
  exportBatchValidateJson,
  exportBatchValidateMarkdown,
  exportBatchValidatePdf,
} from './infrastructure-vps-batch-validate.util'

type StatusFilter = 'all' | 'ok' | 'warn' | 'fail' | 'offline'

const statusLabel: Record<VpsCheckStatus, string> = {
  ok: 'Correcto',
  warn: 'Atención',
  fail: 'Fallo',
}

const statusIcon: Record<VpsCheckStatus, string> = {
  ok: 'check_circle',
  warn: 'warning',
  fail: 'cancel',
}

@Component({
  selector: 'app-vps-batch-validate-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <div class="vps-op-dialog">
      <header class="vps-op-dialog__head">
        <div>
          <h2 mat-dialog-title>Validación SSH batch · flota VPS</h2>
          <p class="vps-op-dialog__sub mono">{{ data.reportId }} · {{ data.policyVersion }}</p>
        </div>
        <span class="vps-op-dialog__chip">{{ data.durationSec }}s · {{ data.hostsScanned }}/{{ data.hostCount }} hosts</span>
      </header>

      <mat-dialog-content>
        <p class="vps-audit-summary">{{ data.executiveSummary }}</p>

        <div class="vps-op-kpi-row">
          <article><span>Total</span><strong>{{ data.hostCount }}</strong></article>
          <article data-tone="ok"><span>OK</span><strong>{{ data.hostsOk }}</strong></article>
          <article data-tone="warn"><span>Atención</span><strong>{{ data.hostsWarn }}</strong></article>
          <article data-tone="crit"><span>Fallo</span><strong>{{ data.hostsFail }}</strong></article>
          <article><span>Offline</span><strong>{{ data.hostsOffline }}</strong></article>
          <article><span>Lat. media</span><strong class="mono">{{ data.avgLatencyMs }} ms</strong></article>
          <article><span>P95</span><strong class="mono">{{ data.p95LatencyMs }} ms</strong></article>
          <article><span>Comprobaciones</span><strong>{{ data.totalChecks }}</strong></article>
        </div>

        <div class="vps-audit-filters" role="tablist" aria-label="Filtrar por estado">
          @for (f of filters(); track f.id) {
            <button
              type="button"
              role="tab"
              class="vps-audit-filter"
              [class.vps-audit-filter--on]="statusFilter() === f.id"
              [attr.aria-selected]="statusFilter() === f.id"
              (click)="statusFilter.set(f.id)"
            >
              {{ f.label }}
              <em>{{ f.count }}</em>
            </button>
          }
        </div>

        @if (data.failedHosts.length) {
          <section class="vps-op-section vps-batch-failures">
            <h3><mat-icon>error</mat-icon> Hosts con fallo ({{ data.failedHosts.length }})</h3>
            <ul>
              @for (h of data.failedHosts; track h.hostId) {
                <li [attr.data-status]="h.offline ? 'fail' : h.status">
                  <strong>{{ h.hostName }}</strong>
                  <span class="mono">{{ h.hostIp }}</span>
                  @if (h.offline) {
                    <em>offline</em>
                  } @else if (h.failedChecks.length) {
                    <em>{{ h.failedChecks.join(' · ') }}</em>
                  }
                </li>
              }
            </ul>
          </section>
        }

        <div class="vps-port-table-wrap">
          <table class="vps-port-table">
            <thead>
              <tr>
                <th></th>
                <th>Estado</th>
                <th>Host</th>
                <th>Entorno</th>
                <th>Comprobaciones</th>
                <th>Latencia</th>
                <th>Clave</th>
                <th>Último check</th>
              </tr>
            </thead>
            <tbody>
              @for (h of filteredHosts(); track h.hostId) {
                <tr
                  class="vps-batch-host-row"
                  [attr.data-status]="h.status"
                  [class.vps-batch-host-row--expanded]="expandedHostId() === h.hostId"
                >
                  <td>
                    <button
                      type="button"
                      class="vps-batch-expand"
                      [attr.aria-expanded]="expandedHostId() === h.hostId"
                      [attr.aria-label]="'Detalle ' + h.hostName"
                      (click)="toggleHost(h.hostId)"
                    >
                      <mat-icon>{{ expandedHostId() === h.hostId ? 'expand_less' : 'expand_more' }}</mat-icon>
                    </button>
                  </td>
                  <td>
                    <span class="vps-validate-badge" [attr.data-status]="h.status">
                      <mat-icon>{{ statusIcon[h.status] }}</mat-icon>
                      {{ statusLabel[h.status] }}
                    </span>
                  </td>
                  <td>
                    <strong>{{ h.hostName }}</strong>
                    <span class="vps-audit-sub mono">{{ h.hostIp }} · {{ h.user }}:{{ h.port }}</span>
                  </td>
                  <td>{{ h.environment }}<br /><small>{{ h.provider }}</small></td>
                  <td class="mono">{{ h.checksSummary }}</td>
                  <td class="mono">{{ h.offline ? '—' : h.latencyMs + ' ms' }}</td>
                  <td class="mono">{{ h.clientKeyName }}</td>
                  <td>{{ h.lastCheck }}</td>
                </tr>
                @if (expandedHostId() === h.hostId) {
                  <tr class="vps-batch-detail-row">
                    <td colspan="8">
                      <div class="vps-batch-detail">
                        @if (h.bastionHop) {
                          <p class="vps-validate-hop">
                            <mat-icon>hub</mat-icon>
                            Ruta: cliente → <strong>{{ h.bastionHop }}</strong> → {{ h.hostName }}
                          </p>
                        }
                        <ul class="vps-validate-checks">
                          @for (c of h.checks; track c.id) {
                            <li [attr.data-status]="c.status">
                              <mat-icon>{{ statusIcon[c.status] }}</mat-icon>
                              <div>
                                <strong>{{ c.label }}</strong>
                                <span>{{ c.detail }}</span>
                              </div>
                              <em class="mono">{{ c.durationMs }} ms</em>
                            </li>
                          }
                        </ul>
                        @if (h.recommendations.length) {
                          <footer>
                            @for (r of h.recommendations; track r) {
                              <span>{{ r }}</span>
                            }
                          </footer>
                        }
                      </div>
                    </td>
                  </tr>
                }
              } @empty {
                <tr>
                  <td colspan="8" class="vps-audit-empty">Sin hosts para el filtro seleccionado</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <section class="vps-op-section">
          <h3><mat-icon>lightbulb</mat-icon> Recomendaciones globales</h3>
          <ul>
            @for (r of data.recommendations; track r) {
              <li>{{ r }}</li>
            }
          </ul>
        </section>

        <section class="vps-op-section vps-op-section--muted">
          <h3><mat-icon>policy</mat-icon> Cumplimiento</h3>
          <ul>
            @for (c of data.complianceNotes; track c) {
              <li>{{ c }}</li>
            }
          </ul>
        </section>

        <p class="vps-op-dialog__meta">{{ data.method }} · {{ data.scope }}</p>
        <p class="vps-op-dialog__meta">Generado: {{ data.generatedAt }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cerrar</button>
        <button mat-stroked-button type="button" [matMenuTriggerFor]="exportMenu">
          <mat-icon>download</mat-icon>
          Exportar
        </button>
        <mat-menu #exportMenu="matMenu">
          <button mat-menu-item type="button" (click)="handleExport('csv')">CSV · comprobaciones por host</button>
          <button mat-menu-item type="button" (click)="handleExport('json')">JSON · informe completo</button>
          <button mat-menu-item type="button" (click)="handleExport('md')">Markdown · documentación</button>
          <button mat-menu-item type="button" (click)="handleExport('pdf')">PDF · informe ejecutivo</button>
        </mat-menu>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .vps-op-dialog__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .vps-op-dialog__sub {
      margin: 0.15rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
    }
    .vps-op-dialog__chip {
      flex-shrink: 0;
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 650;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 14%, transparent);
      color: var(--infra-accent-deep, #c2410c);
    }
    .vps-audit-summary {
      margin: 0 0 0.65rem;
      padding: 0.5rem 0.6rem;
      border-radius: 8px;
      font-size: 0.72rem;
      line-height: 1.45;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 8%, transparent);
      border-left: 3px solid var(--infra-accent, #ff9900);
    }
    .vps-op-kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      gap: 0.4rem;
      margin-bottom: 0.65rem;
    }
    .vps-op-kpi-row article {
      padding: 0.4rem 0.5rem;
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      background: color-mix(in srgb, var(--app-surface) 20%, var(--app-card));
    }
    .vps-op-kpi-row article[data-tone='warn'] strong { color: #b45309; }
    .vps-op-kpi-row article[data-tone='crit'] strong { color: #dc2626; }
    .vps-op-kpi-row article[data-tone='ok'] strong { color: #059669; }
    .vps-op-kpi-row span {
      display: block;
      font-size: 0.55rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .vps-op-kpi-row strong {
      display: block;
      margin-top: 0.1rem;
      font-size: 0.82rem;
    }
    .vps-audit-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-bottom: 0.65rem;
    }
    .vps-audit-filter {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.28rem 0.55rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--app-text) 10%, transparent);
      background: transparent;
      font-size: 0.68rem;
      cursor: pointer;
    }
    .vps-audit-filter--on {
      border-color: var(--infra-accent, #ff9900);
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 12%, transparent);
      font-weight: 700;
    }
    .vps-audit-filter em {
      font-style: normal;
      font-size: 0.6rem;
      color: var(--app-text-muted);
    }
    .vps-batch-failures ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 0.3rem;
    }
    .vps-batch-failures li {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.35rem;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      font-size: 0.68rem;
      background: color-mix(in srgb, #ef4444 8%, transparent);
    }
    .vps-batch-failures li[data-status='warn'] {
      background: color-mix(in srgb, #f59e0b 8%, transparent);
    }
    .vps-batch-failures li em {
      font-style: normal;
      color: var(--app-text-muted);
      font-size: 0.62rem;
    }
    .vps-port-table-wrap {
      overflow-x: auto;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      border-radius: 10px;
      margin-bottom: 0.65rem;
    }
    .vps-port-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.66rem;
    }
    .vps-port-table th,
    .vps-port-table td {
      padding: 0.38rem 0.45rem;
      text-align: left;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      vertical-align: top;
    }
    .vps-port-table th {
      font-size: 0.58rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .vps-batch-host-row[data-status='fail'] { background: color-mix(in srgb, #ef4444 7%, transparent); }
    .vps-batch-host-row[data-status='warn'] { background: color-mix(in srgb, #f59e0b 6%, transparent); }
    .vps-batch-expand {
      display: inline-flex;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--app-text-muted);
    }
    .vps-batch-expand mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }
    .vps-validate-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.15rem 0.4rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 700;
    }
    .vps-validate-badge[data-status='ok'] {
      background: color-mix(in srgb, #10b981 16%, transparent);
      color: #047857;
    }
    .vps-validate-badge[data-status='warn'] {
      background: color-mix(in srgb, #f59e0b 16%, transparent);
      color: #92400e;
    }
    .vps-validate-badge[data-status='fail'] {
      background: color-mix(in srgb, #ef4444 16%, transparent);
      color: #b91c1c;
    }
    .vps-validate-badge mat-icon {
      width: 14px;
      height: 14px;
      font-size: 14px;
    }
    .vps-audit-sub {
      display: block;
      font-size: 0.6rem;
      color: var(--app-text-muted);
    }
    .vps-batch-detail-row td {
      padding: 0 !important;
      background: color-mix(in srgb, var(--app-text) 2%, transparent);
    }
    .vps-batch-detail {
      padding: 0.5rem 0.65rem 0.65rem 2rem;
    }
    .vps-validate-hop {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.5rem;
      padding: 0.4rem 0.5rem;
      border-radius: 8px;
      font-size: 0.65rem;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 10%, transparent);
    }
    .vps-validate-hop mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .vps-validate-checks {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.3rem;
    }
    .vps-validate-checks li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.4rem;
      align-items: start;
      padding: 0.35rem 0.45rem;
      border-radius: 6px;
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .vps-validate-checks li[data-status='ok'] mat-icon { color: #059669; }
    .vps-validate-checks li[data-status='warn'] mat-icon { color: #b45309; }
    .vps-validate-checks li[data-status='fail'] mat-icon { color: #dc2626; }
    .vps-validate-checks mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .vps-validate-checks strong {
      display: block;
      font-size: 0.68rem;
    }
    .vps-validate-checks span {
      display: block;
      font-size: 0.62rem;
      color: var(--app-text-muted);
    }
    .vps-batch-detail footer {
      margin-top: 0.45rem;
      display: grid;
      gap: 0.2rem;
      font-size: 0.62rem;
      color: var(--app-text-muted);
    }
    .vps-audit-empty {
      text-align: center;
      color: var(--app-text-muted);
      padding: 1rem !important;
    }
    .vps-op-section { margin-top: 0.5rem; }
    .vps-op-section h3 {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0 0 0.35rem;
      font-size: 0.72rem;
    }
    .vps-op-section h3 mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      color: var(--infra-accent-deep, #c2410c);
    }
    .vps-op-section ul {
      margin: 0;
      padding-left: 1.1rem;
      font-size: 0.68rem;
      color: var(--app-text-muted);
    }
    .vps-op-dialog__meta {
      margin: 0.35rem 0 0;
      font-size: 0.62rem;
      color: var(--app-text-muted);
    }
    .mono { font-family: ui-monospace, monospace; }
  `,
})
export class VpsBatchValidateDialogComponent {
  readonly data = inject<BatchValidateReport>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)

  readonly statusFilter = signal<StatusFilter>('all')
  readonly expandedHostId = signal<string | null>(null)

  readonly statusIcon = statusIcon
  readonly statusLabel = statusLabel

  readonly filters = computed(() => {
    const d = this.data
    return [
      { id: 'all' as const, label: 'Todos', count: d.hostCount },
      { id: 'ok' as const, label: 'OK', count: d.hostsOk },
      { id: 'warn' as const, label: 'Atención', count: d.hostsWarn },
      { id: 'fail' as const, label: 'Fallo', count: d.hostsFail },
      { id: 'offline' as const, label: 'Offline', count: d.hostsOffline },
    ]
  })

  readonly filteredHosts = computed(() => {
    const filter = this.statusFilter()
    if (filter === 'all') return this.data.hosts
    if (filter === 'offline') return this.data.hosts.filter((h) => h.offline)
    return this.data.hosts.filter((h) => h.status === filter)
  })

  toggleHost = (hostId: string): void => {
    this.expandedHostId.update((current) => (current === hostId ? null : hostId))
  }

  handleExport = (format: 'csv' | 'json' | 'md' | 'pdf'): void => {
    const exporters = {
      csv: exportBatchValidateCsv,
      json: exportBatchValidateJson,
      md: exportBatchValidateMarkdown,
      pdf: exportBatchValidatePdf,
    }
    const filename = exporters[format](this.data)
    this.toast.success(`Informe descargado · ${filename}`)
  }
}
