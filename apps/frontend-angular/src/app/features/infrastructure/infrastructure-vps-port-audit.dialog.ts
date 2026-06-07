import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatTabsModule } from '@angular/material/tabs'
import { ToastService } from '../../core/services/toast.service'
import type { PortAuditReport } from './infrastructure-vps-port-audit.util'
import {
  exportPortAuditCsv,
  exportPortAuditJson,
  exportPortAuditMarkdown,
  exportPortAuditPdf,
} from './infrastructure-vps-port-audit.util'

type SeverityFilter = 'all' | 'crit' | 'warn' | 'ok'

@Component({
  selector: 'app-vps-port-audit-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatMenuModule, MatTabsModule],
  template: `
    <div class="vps-op-dialog">
      <header class="vps-op-dialog__head">
        <div>
          <h2 mat-dialog-title>Auditoría de puertos · flota VPS</h2>
          <p class="vps-op-dialog__sub mono">{{ data.reportId }} · {{ data.policyVersion }}</p>
        </div>
        <span class="vps-op-dialog__chip">{{ data.durationSec }}s · {{ data.hostsScanned }} hosts</span>
      </header>

      <mat-dialog-content>
        <p class="vps-audit-summary">{{ data.executiveSummary }}</p>

        <div class="vps-op-kpi-row">
          <article><span>Hosts</span><strong>{{ data.hostCount }}</strong></article>
          <article><span>Puertos abiertos</span><strong>{{ data.totalOpenPorts }}</strong></article>
          <article><span>Servicios únicos</span><strong>{{ data.uniqueServices }}</strong></article>
          <article><span>Exposición pública</span><strong>{{ data.publicExposed }}</strong></article>
          <article data-tone="ok"><span>OK</span><strong>{{ data.riskOk }}</strong></article>
          <article data-tone="warn"><span>Revisar</span><strong>{{ data.riskWarn }}</strong></article>
          <article data-tone="crit"><span>Crítico</span><strong>{{ data.riskCrit }}</strong></article>
          <article><span>Violaciones</span><strong>{{ data.violations.length }}</strong></article>
        </div>

        <div class="vps-audit-filters" role="tablist" aria-label="Filtrar por severidad">
          @for (f of filters(); track f.id) {
            <button
              type="button"
              role="tab"
              class="vps-audit-filter"
              [class.vps-audit-filter--on]="severityFilter() === f.id"
              [attr.aria-selected]="severityFilter() === f.id"
              (click)="severityFilter.set(f.id)"
            >
              {{ f.label }}
              <em>{{ f.count }}</em>
            </button>
          }
        </div>

        <mat-tab-group class="vps-audit-tabs" animationDuration="200ms">
          <mat-tab label="Violaciones ({{ filteredViolations().length }})">
            <div class="vps-port-table-wrap">
              <table class="vps-port-table">
                <thead>
                  <tr>
                    <th>Severidad</th>
                    <th>Regla</th>
                    <th>Host</th>
                    <th>Puerto</th>
                    <th>Servicio</th>
                    <th>Detalle</th>
                    <th>Remediación</th>
                  </tr>
                </thead>
                <tbody>
                  @for (v of filteredViolations(); track v.id) {
                    <tr [attr.data-risk]="v.severity">
                      <td>
                        <span class="vps-risk-pill" [attr.data-risk]="v.severity === 'crit' ? 'crit' : 'warn'">
                          {{ v.severity === 'crit' ? 'Crítico' : 'Revisar' }}
                        </span>
                      </td>
                      <td class="mono">{{ v.rule }}</td>
                      <td>
                        <strong>{{ v.hostName }}</strong>
                        <span class="vps-audit-sub mono">{{ v.hostIp }}</span>
                      </td>
                      <td class="mono">{{ v.port }}</td>
                      <td>{{ v.service }}</td>
                      <td>{{ v.detail }}</td>
                      <td class="vps-audit-remediation">{{ v.remediation }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="vps-audit-empty">Sin violaciones para el filtro seleccionado</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </mat-tab>

          <mat-tab label="Hosts ({{ filteredHosts().length }})">
            <div class="vps-audit-host-grid">
              @for (h of filteredHosts(); track h.hostId) {
                <article class="vps-audit-host-card" [attr.data-health]="h.health">
                  <header>
                    <div>
                      <strong>{{ h.hostName }}</strong>
                      <span class="mono">{{ h.hostIp }}</span>
                    </div>
                    <em>{{ h.score }}/100</em>
                  </header>
                  <dl>
                    <div><dt>Proveedor</dt><dd>{{ h.provider }} · {{ h.location }}</dd></div>
                    <div><dt>Entorno</dt><dd>{{ h.environment }}</dd></div>
                    <div><dt>Puertos</dt><dd>{{ h.openPorts }} abiertos · {{ h.riskWarn }} warn · {{ h.riskCrit }} crit</dd></div>
                  </dl>
                  @if (h.findings.length) {
                    <ul>
                      @for (f of h.findings; track f) {
                        <li>{{ f }}</li>
                      }
                    </ul>
                  }
                  <footer>
                    @for (p of h.ports; track p.port) {
                      <span class="vps-audit-port-pill" [attr.data-risk]="p.risk">{{ p.port }}/{{ p.service }}</span>
                    }
                  </footer>
                </article>
              }
            </div>
          </mat-tab>

          <mat-tab label="Recomendaciones">
            <section class="vps-op-section">
              <h3><mat-icon>lightbulb</mat-icon> Acciones sugeridas</h3>
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
            <p class="vps-op-dialog__meta">
              {{ data.method }} · {{ data.scope }} · escaneados {{ data.portsScannedPerHost }} puertos/host
            </p>
          </mat-tab>
        </mat-tab-group>

        <p class="vps-op-dialog__meta">Generado: {{ data.generatedAt }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cerrar</button>
        <button mat-stroked-button type="button" [matMenuTriggerFor]="exportMenu">
          <mat-icon>download</mat-icon>
          Exportar
        </button>
        <mat-menu #exportMenu="matMenu">
          <button mat-menu-item type="button" (click)="handleExport('csv')">CSV · detalle puertos</button>
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
      grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
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
    .vps-audit-tabs { margin-top: 0.25rem; }
    .vps-port-table-wrap {
      overflow-x: auto;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      border-radius: 10px;
      margin-top: 0.5rem;
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
    .vps-port-table tr[data-risk='crit'] { background: color-mix(in srgb, #ef4444 7%, transparent); }
    .vps-port-table tr[data-risk='warn'] { background: color-mix(in srgb, #f59e0b 6%, transparent); }
    .vps-audit-sub {
      display: block;
      font-size: 0.6rem;
      color: var(--app-text-muted);
    }
    .vps-audit-remediation {
      font-size: 0.62rem;
      color: var(--app-text-muted);
      max-width: 160px;
    }
    .vps-audit-empty {
      text-align: center;
      color: var(--app-text-muted);
      padding: 1rem !important;
    }
    .vps-risk-pill {
      display: inline-block;
      padding: 0.1rem 0.35rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .vps-risk-pill[data-risk='warn'] {
      background: color-mix(in srgb, #f59e0b 18%, transparent);
      color: #92400e;
    }
    .vps-risk-pill[data-risk='crit'] {
      background: color-mix(in srgb, #ef4444 18%, transparent);
      color: #b91c1c;
    }
    .vps-audit-host-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .vps-audit-host-card {
      padding: 0.55rem 0.6rem;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
    }
    .vps-audit-host-card[data-health='crit'] { border-color: color-mix(in srgb, #ef4444 35%, transparent); }
    .vps-audit-host-card[data-health='warn'] { border-color: color-mix(in srgb, #f59e0b 35%, transparent); }
    .vps-audit-host-card header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.35rem;
    }
    .vps-audit-host-card header strong { display: block; font-size: 0.72rem; }
    .vps-audit-host-card header span { font-size: 0.62rem; color: var(--app-text-muted); }
    .vps-audit-host-card header em {
      font-style: normal;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--infra-accent-deep, #c2410c);
    }
    .vps-audit-host-card dl {
      margin: 0 0 0.35rem;
      display: grid;
      gap: 0.2rem;
    }
    .vps-audit-host-card dt {
      font-size: 0.55rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .vps-audit-host-card dd {
      margin: 0;
      font-size: 0.65rem;
    }
    .vps-audit-host-card ul {
      margin: 0 0 0.35rem;
      padding-left: 1rem;
      font-size: 0.62rem;
      color: #92400e;
    }
    .vps-audit-host-card footer {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    .vps-audit-port-pill {
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
      font-size: 0.58rem;
      background: color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .vps-audit-port-pill[data-risk='warn'] { background: color-mix(in srgb, #f59e0b 15%, transparent); }
    .vps-audit-port-pill[data-risk='crit'] { background: color-mix(in srgb, #ef4444 15%, transparent); }
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
      margin: 0.65rem 0 0;
      font-size: 0.62rem;
      color: var(--app-text-muted);
    }
    .mono { font-family: ui-monospace, monospace; }
  `,
})
export class VpsPortAuditDialogComponent {
  readonly data = inject<PortAuditReport>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)

  readonly severityFilter = signal<SeverityFilter>('all')

  readonly filters = computed(() => {
    const d = this.data
    return [
      { id: 'all' as const, label: 'Todos', count: d.violations.length },
      { id: 'crit' as const, label: 'Críticos', count: d.violations.filter((v) => v.severity === 'crit').length },
      { id: 'warn' as const, label: 'Revisar', count: d.violations.filter((v) => v.severity === 'warn').length },
      { id: 'ok' as const, label: 'Hosts OK', count: d.hosts.filter((h) => h.health === 'ok').length },
    ]
  })

  readonly filteredViolations = computed(() => {
    const filter = this.severityFilter()
    if (filter === 'all') return this.data.violations
    if (filter === 'crit' || filter === 'warn') return this.data.violations.filter((v) => v.severity === filter)
    return []
  })

  readonly filteredHosts = computed(() => {
    const filter = this.severityFilter()
    if (filter === 'all') return this.data.hosts
    if (filter === 'crit') return this.data.hosts.filter((h) => h.health === 'crit')
    if (filter === 'warn') return this.data.hosts.filter((h) => h.health === 'warn')
    return this.data.hosts.filter((h) => h.health === 'ok')
  })

  handleExport = (format: 'csv' | 'json' | 'md' | 'pdf'): void => {
    const exporters = {
      csv: exportPortAuditCsv,
      json: exportPortAuditJson,
      md: exportPortAuditMarkdown,
      pdf: exportPortAuditPdf,
    }
    const filename = exporters[format](this.data)
    this.toast.success(`Informe descargado · ${filename}`)
  }
}
