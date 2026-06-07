import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { ToastService } from '../../core/services/toast.service'
import type {
  Metrics24hReport,
  PortScanReport,
  SshValidateResult,
  VpsCheckStatus,
} from './infrastructure-vps-operations.util'
import {
  exportPortScanCsv,
  exportPortScanJson,
  exportPortScanPdf,
} from './infrastructure-vps-port-audit.util'
import type { VpsDiscoveryTask } from './vps-add-discovery.service'

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

const trendIcon = (trend: string): string => {
  if (trend === 'up') return 'trending_up'
  if (trend === 'down') return 'trending_down'
  return 'trending_flat'
}

@Component({
  selector: 'app-vps-metrics-24h-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="vps-op-dialog">
      <header class="vps-op-dialog__head">
        <div>
          <h2 mat-dialog-title>Métricas 24h · {{ data.hostName }}</h2>
          <p class="vps-op-dialog__sub mono">{{ data.hostIp }} · {{ data.windowLabel }} · {{ data.interval }}</p>
        </div>
        <span class="vps-op-dialog__chip">{{ data.agent }}</span>
      </header>

      <mat-dialog-content>
        <div class="vps-op-kpi-row">
          <article>
            <span>Uptime</span>
            <strong>{{ data.uptime }}</strong>
          </article>
          <article>
            <span>Load avg</span>
            <strong class="mono">{{ data.loadAvg }}</strong>
          </article>
          <article>
            <span>Red ↓ / ↑</span>
            <strong class="mono">{{ data.networkInMbps }} / {{ data.networkOutMbps }} Mbps</strong>
          </article>
          <article>
            <span>IOPS disco</span>
            <strong class="mono">{{ data.diskReadIops }} r · {{ data.diskWriteIops }} w</strong>
          </article>
          <article>
            <span>Swap</span>
            <strong>{{ data.swapUsedPct }}%</strong>
          </article>
        </div>

        @if (data.alerts.length) {
          <ul class="vps-op-alerts">
            @for (a of data.alerts; track a.message) {
              <li [attr.data-severity]="a.severity">
                <mat-icon>{{ statusIcon[a.severity] }}</mat-icon>
                {{ a.message }}
              </li>
            }
          </ul>
        }

        <div class="vps-metrics-grid">
          @for (s of data.series; track s.label) {
            <article class="vps-metrics-card" [attr.data-status]="s.status">
              <header>
                <div>
                  <span>{{ s.label }}</span>
                  <small>Umbral {{ s.threshold }}{{ s.unit }}</small>
                </div>
                <strong>{{ s.current }}{{ s.unit }}</strong>
              </header>
              <div class="vps-metrics-card__trend">
                <mat-icon>{{ trendIcon(s.trend) }}</mat-icon>
                <span>{{ s.trend === 'up' ? 'Al alza' : s.trend === 'down' ? 'A la baja' : 'Estable' }}</span>
                <em [attr.data-status]="s.status">{{ statusLabel[s.status] }}</em>
              </div>
              <div class="vps-metrics-card__stats">
                <div><em>Mín</em><b>{{ s.min }}{{ s.unit }}</b></div>
                <div><em>Media</em><b>{{ s.avg }}{{ s.unit }}</b></div>
                <div><em>Pico</em><b>{{ s.peak }}{{ s.unit }}</b></div>
                <div><em>P95</em><b>{{ s.p95 }}{{ s.unit }}</b></div>
              </div>
              <div class="vps-metrics-chart" role="img" [attr.aria-label]="'Gráfico ' + s.label + ' 24h'">
                @for (p of s.points; track p.hour) {
                  <span
                    [style.height.%]="p.value"
                    [class.vps-metrics-chart__peak]="p.value === s.peak"
                    [title]="p.hour + ' · ' + p.value + s.unit"
                  ></span>
                }
              </div>
              <footer class="vps-metrics-card__foot mono">{{ s.points[0].hour }} – {{ s.points[23].hour }}</footer>
            </article>
          }
        </div>

        <p class="vps-op-dialog__meta">Recogido: {{ data.collectedAt }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button mat-dialog-close type="button">Cerrar</button>
        <button mat-flat-button color="primary" mat-dialog-close type="button">Exportar CSV</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .vps-op-dialog__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      padding-right: 0.5rem;
    }
    .vps-op-dialog__sub {
      margin: 0.15rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
    }
    .vps-op-dialog__chip {
      flex-shrink: 0;
      padding: 0.25rem 0.5rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 650;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 14%, transparent);
      color: var(--infra-accent-deep, #c2410c);
    }
    .vps-op-kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.45rem;
      margin-bottom: 0.75rem;
    }
    .vps-op-kpi-row article {
      padding: 0.45rem 0.55rem;
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      background: color-mix(in srgb, var(--app-surface) 20%, var(--app-card));
    }
    .vps-op-kpi-row span {
      display: block;
      font-size: 0.58rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .vps-op-kpi-row strong {
      display: block;
      margin-top: 0.15rem;
      font-size: 0.78rem;
    }
    .vps-op-alerts {
      list-style: none;
      margin: 0 0 0.75rem;
      padding: 0;
      display: grid;
      gap: 0.35rem;
    }
    .vps-op-alerts li {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
      padding: 0.4rem 0.55rem;
      border-radius: 8px;
      font-size: 0.68rem;
      background: color-mix(in srgb, var(--app-text) 4%, transparent);
    }
    .vps-op-alerts li[data-severity='warn'] {
      background: color-mix(in srgb, #f59e0b 12%, transparent);
      color: #92400e;
    }
    .vps-op-alerts mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .vps-metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.55rem;
    }
    .vps-metrics-card {
      padding: 0.65rem 0.7rem;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      background: color-mix(in srgb, var(--app-surface) 25%, var(--app-card));
    }
    .vps-metrics-card[data-status='warn'] {
      border-color: color-mix(in srgb, #f59e0b 35%, transparent);
    }
    .vps-metrics-card header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 0.72rem;
      margin-bottom: 0.25rem;
    }
    .vps-metrics-card header small {
      display: block;
      font-size: 0.58rem;
      color: var(--app-text-muted);
    }
    .vps-metrics-card header strong {
      color: var(--infra-accent-deep, #c2410c);
      font-size: 1rem;
    }
    .vps-metrics-card__trend {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-bottom: 0.4rem;
      font-size: 0.65rem;
      color: var(--app-text-muted);
    }
    .vps-metrics-card__trend mat-icon {
      width: 14px;
      height: 14px;
      font-size: 14px;
    }
    .vps-metrics-card__trend em {
      margin-left: auto;
      font-style: normal;
      font-weight: 700;
      font-size: 0.58rem;
      text-transform: uppercase;
    }
    .vps-metrics-card__trend em[data-status='warn'] { color: #b45309; }
    .vps-metrics-card__trend em[data-status='ok'] { color: #059669; }
    .vps-metrics-card__stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.35rem;
      margin-bottom: 0.45rem;
    }
    .vps-metrics-card__stats em {
      display: block;
      font-style: normal;
      font-size: 0.55rem;
      color: var(--app-text-muted);
    }
    .vps-metrics-card__stats b {
      font-size: 0.68rem;
    }
    .vps-metrics-chart {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 64px;
    }
    .vps-metrics-chart span {
      flex: 1;
      min-width: 3px;
      border-radius: 2px 2px 0 0;
      background: linear-gradient(180deg, var(--infra-accent, #ff9900), color-mix(in srgb, var(--infra-accent, #ff9900) 50%, transparent));
    }
    .vps-metrics-chart__peak {
      background: linear-gradient(180deg, #dc2626, color-mix(in srgb, #dc2626 50%, transparent));
    }
    .vps-metrics-card__foot {
      margin-top: 0.3rem;
      font-size: 0.58rem;
      color: var(--app-text-muted);
    }
    .vps-op-dialog__meta {
      margin: 0.75rem 0 0;
      font-size: 0.62rem;
      color: var(--app-text-muted);
    }
    .mono { font-family: ui-monospace, monospace; }
  `,
})
export class VpsMetrics24hDialogComponent {
  readonly data = inject<Metrics24hReport>(MAT_DIALOG_DATA)
  readonly statusIcon = statusIcon
  readonly statusLabel = statusLabel
  readonly trendIcon = trendIcon
}

@Component({
  selector: 'app-vps-port-scan-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <div class="vps-op-dialog">
      <header class="vps-op-dialog__head">
        <div>
          <h2 mat-dialog-title>Escaneo de puertos · {{ data.hostName }}</h2>
          <p class="vps-op-dialog__sub mono">{{ data.hostIp }} · {{ data.method }}</p>
        </div>
        <span class="vps-op-dialog__chip">{{ data.durationSec }}s · {{ data.portsScanned }} puertos</span>
      </header>

      <mat-dialog-content>
        <div class="vps-op-kpi-row">
          <article><span>Abiertos</span><strong>{{ data.openCount }}</strong></article>
          <article><span>Filtrados</span><strong>{{ data.filteredCount }}</strong></article>
          <article><span>Cerrados</span><strong>{{ data.closedCount }}</strong></article>
          <article data-tone="ok"><span>Riesgo OK</span><strong>{{ data.riskOk }}</strong></article>
          <article data-tone="warn"><span>Revisar</span><strong>{{ data.riskWarn }}</strong></article>
          <article data-tone="crit"><span>Crítico</span><strong>{{ data.riskCrit }}</strong></article>
        </div>

        <div class="vps-port-table-wrap">
          <table class="vps-port-table">
            <thead>
              <tr>
                <th>Puerto</th>
                <th>Proto</th>
                <th>Servicio</th>
                <th>Proceso</th>
                <th>Banner</th>
                <th>Exposición</th>
                <th>Firewall</th>
                <th>RTT</th>
                <th>Riesgo</th>
              </tr>
            </thead>
            <tbody>
              @for (p of data.ports; track p.port) {
                <tr [attr.data-risk]="p.risk">
                  <td class="mono">{{ p.port }}</td>
                  <td class="mono">{{ p.protocol }}</td>
                  <td>{{ p.service }}</td>
                  <td class="mono">{{ p.process }}</td>
                  <td class="vps-port-table__banner mono">{{ p.banner }}</td>
                  <td>{{ p.exposure }}</td>
                  <td>{{ p.firewall }}</td>
                  <td class="mono">{{ p.responseMs }} ms</td>
                  <td>
                    <span class="vps-risk-pill" [attr.data-risk]="p.risk">
                      {{ p.risk === 'crit' ? 'Crítico' : p.risk === 'warn' ? 'Revisar' : 'OK' }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (data.warnings.length) {
          <section class="vps-op-section">
            <h3><mat-icon>warning</mat-icon> Hallazgos</h3>
            <ul>
              @for (w of data.warnings; track w) {
                <li>{{ w }}</li>
              }
            </ul>
          </section>
        }

        <section class="vps-op-section">
          <h3><mat-icon>lightbulb</mat-icon> Recomendaciones</h3>
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

        <p class="vps-op-dialog__meta">Escaneado: {{ data.scannedAt }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button mat-dialog-close type="button">Cerrar</button>
        <button mat-stroked-button type="button" [matMenuTriggerFor]="scanExportMenu">
          <mat-icon>download</mat-icon>
          Descargar informe
        </button>
        <mat-menu #scanExportMenu="matMenu">
          <button mat-menu-item type="button" (click)="handleExport('csv')">CSV</button>
          <button mat-menu-item type="button" (click)="handleExport('json')">JSON</button>
          <button mat-menu-item type="button" (click)="handleExport('pdf')">PDF</button>
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
      padding: 0.25rem 0.5rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 650;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 14%, transparent);
      color: var(--infra-accent-deep, #c2410c);
    }
    .vps-op-kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
      gap: 0.4rem;
      margin-bottom: 0.75rem;
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
      margin-top: 0.12rem;
      font-size: 0.85rem;
    }
    .vps-port-table-wrap {
      overflow-x: auto;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      border-radius: 10px;
    }
    .vps-port-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.68rem;
    }
    .vps-port-table th,
    .vps-port-table td {
      padding: 0.4rem 0.45rem;
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
    .vps-port-table__banner {
      max-width: 140px;
      word-break: break-word;
      font-size: 0.62rem;
    }
    .vps-port-table tr[data-risk='warn'] { background: color-mix(in srgb, #f59e0b 6%, transparent); }
    .vps-port-table tr[data-risk='crit'] { background: color-mix(in srgb, #ef4444 8%, transparent); }
    .vps-risk-pill {
      display: inline-block;
      padding: 0.12rem 0.35rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .vps-risk-pill[data-risk='ok'] {
      background: color-mix(in srgb, #10b981 18%, transparent);
      color: #047857;
    }
    .vps-risk-pill[data-risk='warn'] {
      background: color-mix(in srgb, #f59e0b 18%, transparent);
      color: #92400e;
    }
    .vps-risk-pill[data-risk='crit'] {
      background: color-mix(in srgb, #ef4444 18%, transparent);
      color: #b91c1c;
    }
    .vps-op-section {
      margin-top: 0.75rem;
    }
    .vps-op-section h3 {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0 0 0.35rem;
      font-size: 0.72rem;
      font-weight: 700;
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
    .vps-op-section--muted ul {
      list-style: square;
    }
    .vps-op-dialog__meta {
      margin: 0.75rem 0 0;
      font-size: 0.62rem;
      color: var(--app-text-muted);
    }
    .mono { font-family: ui-monospace, monospace; }
  `,
})
export class VpsPortScanDialogComponent {
  readonly data = inject<PortScanReport>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)

  handleExport = (format: 'csv' | 'json' | 'pdf'): void => {
    const exporters = {
      csv: exportPortScanCsv,
      json: exportPortScanJson,
      pdf: exportPortScanPdf,
    }
    const filename = exporters[format](this.data)
    this.toast.success(`Informe descargado · ${filename}`)
  }
}

@Component({
  selector: 'app-vps-validate-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="vps-op-dialog">
      <header class="vps-op-dialog__head">
        <div>
          <h2 mat-dialog-title>Validación SSH · {{ data.hostName }}</h2>
          <p class="vps-op-dialog__sub mono">{{ data.hostIp }}:{{ data.port }} · {{ data.os }}</p>
        </div>
        <span class="vps-validate-badge" [attr.data-status]="data.overallStatus">
          <mat-icon>{{ statusIcon[data.overallStatus] }}</mat-icon>
          {{ statusLabel[data.overallStatus] }}
        </span>
      </header>

      <mat-dialog-content>
        <div class="vps-op-kpi-row">
          <article>
            <span>Latencia</span>
            <strong class="mono">{{ data.latencyMs }} ms ± {{ data.jitterMs }}</strong>
          </article>
          <article>
            <span>Pérdida paquetes</span>
            <strong>{{ data.packetLoss }}</strong>
          </article>
          <article>
            <span>Último login</span>
            <strong>{{ data.lastSuccessfulLogin }}</strong>
          </article>
          <article>
            <span>MFA</span>
            <strong>{{ data.mfaRequired ? 'Requerido' : 'No requerido' }}</strong>
          </article>
        </div>

        @if (data.bastionHop) {
          <p class="vps-validate-hop">
            <mat-icon>hub</mat-icon>
            Ruta: cliente → <strong>{{ data.bastionHop }}</strong> → {{ data.hostName }}
          </p>
        }

        <section class="vps-op-section">
          <h3>Comprobaciones ejecutadas</h3>
          <ul class="vps-validate-checks">
            @for (c of data.checks; track c.id) {
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
        </section>

        <div class="vps-validate-grid">
          <section>
            <h3>Conexión</h3>
            <dl>
              <div><dt>Usuario</dt><dd class="mono">{{ data.user }}</dd></div>
              <div><dt>SSH</dt><dd class="mono">{{ data.sshVersion }}</dd></div>
              <div><dt>Autenticación</dt><dd>{{ data.authMethod }}</dd></div>
              <div><dt>Política sesión</dt><dd>{{ data.sessionPolicy }}</dd></div>
              <div><dt>Proveedor</dt><dd>{{ data.provider }}</dd></div>
              <div><dt>Región</dt><dd>{{ data.location }}</dd></div>
            </dl>
          </section>
          <section>
            <h3>Claves y confianza</h3>
            <dl>
              <div><dt>Host key servidor</dt><dd class="mono">{{ data.serverHostKey }}</dd></div>
              <div><dt>Clave cliente</dt><dd class="mono">{{ data.clientKeyName }}</dd></div>
              <div><dt>Huella cliente</dt><dd class="mono">{{ data.clientKeyFingerprint }}</dd></div>
              <div><dt>known_hosts</dt><dd>{{ data.knownHostsMatch ? 'Coincide' : 'Desconocido — revisar' }}</dd></div>
            </dl>
          </section>
        </div>

        <section class="vps-op-section">
          <h3><mat-icon>lightbulb</mat-icon> Recomendaciones</h3>
          <ul>
            @for (r of data.recommendations; track r) {
              <li>{{ r }}</li>
            }
          </ul>
        </section>

        <p class="vps-op-dialog__meta">Validado: {{ data.lastCheck }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button mat-dialog-close type="button">Cerrar</button>
        <button mat-flat-button color="primary" mat-dialog-close type="button">Abrir terminal</button>
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
    .vps-validate-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.3rem 0.55rem;
      border-radius: 999px;
      font-size: 0.68rem;
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
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .vps-op-kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.4rem;
      margin-bottom: 0.65rem;
    }
    .vps-op-kpi-row article {
      padding: 0.4rem 0.5rem;
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
    }
    .vps-op-kpi-row span {
      display: block;
      font-size: 0.55rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .vps-op-kpi-row strong {
      display: block;
      margin-top: 0.12rem;
      font-size: 0.75rem;
    }
    .vps-validate-hop {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.65rem;
      padding: 0.45rem 0.55rem;
      border-radius: 8px;
      font-size: 0.68rem;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 10%, transparent);
    }
    .vps-validate-hop mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .vps-op-section h3 {
      margin: 0 0 0.4rem;
      font-size: 0.72rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .vps-op-section h3 mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .vps-validate-checks {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.35rem;
    }
    .vps-validate-checks li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.45rem;
      align-items: start;
      padding: 0.45rem 0.55rem;
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .vps-validate-checks li[data-status='ok'] mat-icon { color: #059669; }
    .vps-validate-checks li[data-status='warn'] mat-icon { color: #b45309; }
    .vps-validate-checks li[data-status='fail'] mat-icon { color: #dc2626; }
    .vps-validate-checks mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }
    .vps-validate-checks strong {
      display: block;
      font-size: 0.7rem;
    }
    .vps-validate-checks span {
      display: block;
      font-size: 0.65rem;
      color: var(--app-text-muted);
    }
    .vps-validate-checks em {
      font-style: normal;
      font-size: 0.62rem;
      color: var(--app-text-muted);
    }
    .vps-validate-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.65rem;
      margin: 0.75rem 0;
    }
    .vps-validate-grid h3 {
      margin: 0 0 0.35rem;
      font-size: 0.68rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .vps-validate-grid dl {
      margin: 0;
      display: grid;
      gap: 0.35rem;
    }
    .vps-validate-grid dt {
      font-size: 0.55rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .vps-validate-grid dd {
      margin: 0.06rem 0 0;
      font-size: 0.68rem;
      font-weight: 650;
    }
    .vps-op-section ul {
      margin: 0;
      padding-left: 1.1rem;
      font-size: 0.68rem;
      color: var(--app-text-muted);
    }
    .vps-op-dialog__meta {
      margin: 0.75rem 0 0;
      font-size: 0.62rem;
      color: var(--app-text-muted);
    }
    .mono { font-family: ui-monospace, monospace; }
  `,
})
export class VpsValidateDialogComponent {
  readonly data = inject<SshValidateResult>(MAT_DIALOG_DATA)
  readonly statusIcon = statusIcon
  readonly statusLabel = statusLabel
}

export type VpsDiscoverySummaryAction = 'metrics' | 'ports' | 'close'

export interface VpsDiscoverySummaryDialogData {
  hostName: string
  hostIp: string
  tasks: VpsDiscoveryTask[]
  canOpenMetrics: boolean
  canOpenPortScan: boolean
}

const taskStatusIcon: Record<VpsDiscoveryTask['status'], string> = {
  ok: 'check_circle',
  skip: 'remove_circle_outline',
  warn: 'warning',
  fail: 'cancel',
}

@Component({
  selector: 'app-vps-discovery-summary-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="vps-op-dialog">
      <header class="vps-op-dialog__head">
        <div>
          <h2 mat-dialog-title>Discovery completado · {{ data.hostName }}</h2>
          <p class="vps-op-dialog__sub mono">{{ data.hostIp }} · {{ data.tasks.length }} tareas ejecutadas</p>
        </div>
        <span class="vps-op-dialog__chip">Post-alta agentless</span>
      </header>

      <mat-dialog-content>
        <ul class="vps-discovery-summary">
          @for (t of data.tasks; track t.id) {
            <li [attr.data-status]="t.status">
              <mat-icon>{{ taskStatusIcon[t.status] }}</mat-icon>
              <div>
                <strong>{{ t.label }}</strong>
                <span>{{ t.detail }}</span>
              </div>
              <em>{{ t.durationMs }} ms</em>
            </li>
          }
        </ul>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        @if (data.canOpenPortScan) {
          <button mat-stroked-button type="button" [mat-dialog-close]="'ports'">Ver escaneo puertos</button>
        }
        @if (data.canOpenMetrics) {
          <button mat-stroked-button type="button" [mat-dialog-close]="'metrics'">Ver métricas</button>
        }
        <button mat-flat-button color="primary" mat-dialog-close type="button">Cerrar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .vps-discovery-summary {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.35rem;
    }
    .vps-discovery-summary li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.45rem;
      align-items: start;
      padding: 0.45rem 0.55rem;
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .vps-discovery-summary li[data-status='ok'] mat-icon { color: #059669; }
    .vps-discovery-summary li[data-status='warn'] mat-icon { color: #b45309; }
    .vps-discovery-summary li[data-status='fail'] mat-icon { color: #dc2626; }
    .vps-discovery-summary mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }
    .vps-discovery-summary strong {
      display: block;
      font-size: 0.72rem;
    }
    .vps-discovery-summary span {
      display: block;
      font-size: 0.65rem;
      color: var(--app-text-muted);
    }
    .vps-discovery-summary em {
      font-style: normal;
      font-size: 0.62rem;
      color: var(--app-text-muted);
    }
  `,
})
export class VpsDiscoverySummaryDialogComponent {
  readonly data = inject<VpsDiscoverySummaryDialogData>(MAT_DIALOG_DATA)
  readonly taskStatusIcon = taskStatusIcon
}
