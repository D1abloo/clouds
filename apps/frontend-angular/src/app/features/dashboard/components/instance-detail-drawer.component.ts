import { Component, Input, output, inject } from '@angular/core'
import { DatePipe } from '@angular/common'
import { RouterLink } from '@angular/router'
import { MatTabsModule } from '@angular/material/tabs'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import { MiniChartComponent } from '../../../shared/components/mini-chart/mini-chart.component'
import { DashboardInstanceRow } from '../dashboard.models'
import { DemoActionsService } from '../../../core/services/demo-actions.service'
import { buildInstanceTrendChart } from '../utils/dashboard-instance-charts.util'
import {
  instanceAlerts,
  instanceAuditLog,
  instanceDockerContainers,
  instanceEnvLabel,
  instanceK8sPods,
  instanceProviderLogo,
  instanceServices,
  instanceStatusLabel,
} from '../utils/dashboard-instance-detail.util'

@Component({
  selector: 'app-instance-detail-drawer',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    StatusBadgeComponent,
    BrandLogoComponent,
    MiniChartComponent,
  ],
  template: `
    @if (open && instance) {
      <div class="drawer-backdrop animate-fade-in" (click)="close.emit()" role="presentation"></div>
      <aside class="instance-drawer animate-slide-in" role="dialog" aria-label="Detalle de instancia">
        <header class="instance-drawer__head">
          <div class="instance-drawer__identity">
            <div class="instance-drawer__logo">
              @if (providerLogo(); as logo) {
                <app-brand-logo [logo]="logo" size="md" />
              } @else {
                <mat-icon>dns</mat-icon>
              }
            </div>
            <div class="instance-drawer__titles">
              <span class="instance-drawer__provider">{{ instance.provider }} · {{ instance.region }}</span>
              <h2>{{ instance.name }}</h2>
              <div class="instance-drawer__badges">
                <app-status-badge [value]="instance.status" />
                <span class="instance-drawer__env">{{ envLabel() }}</span>
                @if (instance.isDemo) {
                  <span class="instance-drawer__demo">Demo</span>
                }
              </div>
              <code class="instance-drawer__id">{{ instance.id }}</code>
            </div>
          </div>
          <button mat-icon-button type="button" aria-label="Cerrar panel" (click)="close.emit()">
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <div class="instance-drawer__kpis">
          <div class="kpi-chip">
            <mat-icon>speed</mat-icon>
            <div>
              <span>CPU pico</span>
              <strong>{{ trend()?.cpuPeak ?? '—' }}%</strong>
            </div>
          </div>
          <div class="kpi-chip">
            <mat-icon>memory</mat-icon>
            <div>
              <span>RAM pico</span>
              <strong>{{ trend()?.ramPeak ?? '—' }}%</strong>
            </div>
          </div>
          <div class="kpi-chip">
            <mat-icon>payments</mat-icon>
            <div>
              <span>Coste/mes</span>
              <strong>{{ formatCost(instance.monthlyCost) }}</strong>
            </div>
          </div>
          <div class="kpi-chip" [class.kpi-chip--warn]="instance.alertCount">
            <mat-icon>notifications</mat-icon>
            <div>
              <span>Alertas</span>
              <strong>{{ instance.alertCount ?? 0 }}</strong>
            </div>
          </div>
        </div>

        <mat-tab-group class="soft-tabs drawer-tabs" animationDuration="200ms">
          <mat-tab label="Resumen">
            <div class="drawer-panel">
              <section class="detail-section">
                <h3><mat-icon>badge</mat-icon> Identidad</h3>
                <dl class="detail-grid">
                  <div><dt>Cuenta</dt><dd>{{ instance.accountName ?? '—' }}</dd></div>
                  <div><dt>Entorno</dt><dd>{{ envLabel() }}</dd></div>
                  <div><dt>Tipo</dt><dd>{{ instance.instanceType ?? '—' }}</dd></div>
                  <div><dt>Sistema</dt><dd>{{ instance.os ?? '—' }}</dd></div>
                  <div><dt>Estado</dt><dd>{{ statusLabel() }}</dd></div>
                  <div><dt>Última sync</dt><dd>{{ instance.lastSyncedAt | date: 'medium' }}</dd></div>
                </dl>
              </section>

              <section class="detail-section">
                <h3><mat-icon>lan</mat-icon> Red</h3>
                <dl class="detail-grid">
                  <div class="detail-grid__wide">
                    <dt>IP pública</dt>
                    <dd class="mono">{{ instance.publicIp ?? '—' }}</dd>
                  </div>
                  <div class="detail-grid__wide">
                    <dt>IP privada</dt>
                    <dd class="mono">{{ instance.privateIp ?? '—' }}</dd>
                  </div>
                  <div><dt>Región</dt><dd>{{ instance.region ?? '—' }}</dd></div>
                  <div><dt>Proveedor</dt><dd>{{ instance.provider }}</dd></div>
                </dl>
              </section>

              <section class="detail-section">
                <h3><mat-icon>memory</mat-icon> Recursos</h3>
                <dl class="detail-grid">
                  <div><dt>CPU</dt><dd>{{ instance.cpuCores ?? '—' }} vCPU</dd></div>
                  <div><dt>RAM</dt><dd>{{ instance.ramGb ?? '—' }} GB</dd></div>
                  <div><dt>Disco</dt><dd>{{ instance.diskGb ?? '—' }} GB</dd></div>
                  <div><dt>Coste estimado</dt><dd>{{ formatCost(instance.monthlyCost) }}</dd></div>
                </dl>
              </section>

              <section class="detail-section">
                <h3><mat-icon>hub</mat-icon> Plataformas detectadas</h3>
                <div class="platform-flags">
                  <span class="platform-flag" [class.platform-flag--on]="instance.hasDocker">
                    <app-brand-logo logo="docker" size="sm" />
                    Docker {{ instance.hasDocker ? 'activo' : 'no detectado' }}
                  </span>
                  <span class="platform-flag" [class.platform-flag--on]="instance.hasKubernetes">
                    <app-brand-logo logo="kubernetes" size="sm" />
                    Kubernetes {{ instance.hasKubernetes ? 'activo' : 'no detectado' }}
                  </span>
                  @if (instance.isVps) {
                    <span class="platform-flag platform-flag--on">
                      <mat-icon>computer</mat-icon>
                      VPS / bare metal
                    </span>
                  }
                </div>
              </section>

              <div class="drawer-actions">
                <a mat-flat-button color="primary" [routerLink]="['/instances', instance.id]">
                  <mat-icon>open_in_new</mat-icon>
                  Ficha completa
                </a>
                <button mat-stroked-button type="button" (click)="demo('Terminal')">
                  <mat-icon>terminal</mat-icon>
                  Terminal
                </button>
                <button mat-stroked-button type="button" (click)="demo('Sync')">
                  <mat-icon>sync</mat-icon>
                  Sincronizar
                </button>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Rendimiento">
            <div class="drawer-panel">
              @if (trend(); as t) {
                <div class="metric-chart-block">
                  <div class="metric-chart-block__head">
                    <h4>CPU · 24 h</h4>
                    <span>Pico {{ t.cpuPeak }}%</span>
                  </div>
                  <app-mini-chart title="" kind="line" [data]="t.cpu" [animated]="true" unit="%" />
                </div>
                <div class="metric-chart-block">
                  <div class="metric-chart-block__head">
                    <h4>RAM · 24 h</h4>
                    <span>Pico {{ t.ramPeak }}%</span>
                  </div>
                  <app-mini-chart title="" kind="line" [data]="t.ram" [secondaryData]="[]" [animated]="true" unit="%" />
                </div>
                <div class="metric-chart-block metric-chart-block--combo">
                  <div class="metric-chart-block__head">
                    <h4>CPU + RAM correlacionadas</h4>
                    <span>Últimas 24 h</span>
                  </div>
                  <app-mini-chart
                    title=""
                    kind="line"
                    [data]="t.cpu"
                    [secondaryData]="t.ram"
                    [animated]="true"
                    unit="%"
                  />
                </div>
              }
            </div>
          </mat-tab>

          <mat-tab label="Docker">
            <div class="drawer-panel">
              @if (dockerRows().length) {
                <p class="panel-intro">{{ dockerRows().length }} contenedores en {{ instance.name }}</p>
                <ul class="detail-list">
                  @for (c of dockerRows(); track c.name) {
                    <li>
                      <div class="detail-list__main">
                        <strong>{{ c.name }}</strong>
                        <span class="detail-list__status" [class]="statusClass(c.status)">{{ c.status }}</span>
                      </div>
                      <div class="detail-list__meta">
                        @if (c.image) { <span>{{ c.image }}</span> }
                        @if (c.ports) { <span class="mono">{{ c.ports }}</span> }
                      </div>
                    </li>
                  }
                </ul>
              } @else {
                <p class="muted">Docker no detectado en esta instancia</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="Kubernetes">
            <div class="drawer-panel">
              @if (k8sRows().length) {
                <p class="panel-intro">{{ k8sRows().length }} pods monitorizados</p>
                <ul class="detail-list">
                  @for (p of k8sRows(); track p.name) {
                    <li>
                      <div class="detail-list__main">
                        <strong>{{ p.name }}</strong>
                        <span class="detail-list__status detail-list__status--ok">{{ p.status }}</span>
                      </div>
                      <div class="detail-list__meta">
                        <span>ns/{{ p.namespace }}</span>
                      </div>
                    </li>
                  }
                </ul>
              } @else {
                <p class="muted">Sin cargas Kubernetes en esta instancia</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="Servicios">
            <div class="drawer-panel">
              <ul class="detail-list">
                @for (s of serviceRows(); track s.name) {
                  <li>
                    <div class="detail-list__main">
                      <strong>{{ s.name }}</strong>
                      <span class="detail-list__status detail-list__status--ok">{{ s.status }}</span>
                    </div>
                    @if (s.port) {
                      <div class="detail-list__meta"><span class="mono">puerto {{ s.port }}</span></div>
                    }
                  </li>
                }
              </ul>
            </div>
          </mat-tab>

          <mat-tab label="Facturación">
            <div class="drawer-panel">
              <dl class="detail-grid detail-grid--billing">
                <div><dt>Mensual</dt><dd>{{ formatCost(instance.monthlyCost) }}</dd></div>
                <div><dt>MTD</dt><dd>{{ formatCost((instance.monthlyCost ?? 0) * 0.4) }}</dd></div>
                <div><dt>Proyección</dt><dd>{{ formatCost((instance.monthlyCost ?? 0) * 1.05) }}</dd></div>
                <div><dt>Etiquetas</dt><dd>env={{ instance.environment }} · provider={{ instance.provider }}</dd></div>
              </dl>
            </div>
          </mat-tab>

          <mat-tab label="Alertas">
            <div class="drawer-panel">
              @if (alertRows().length) {
                <ul class="detail-list">
                  @for (a of alertRows(); track a.title) {
                    <li>
                      <div class="detail-list__main">
                        <strong>{{ a.title }}</strong>
                        <span class="detail-list__severity" [class]="'sev-' + a.severity.toLowerCase()">{{ a.severity }}</span>
                      </div>
                      <div class="detail-list__meta"><span>{{ a.since }}</span></div>
                    </li>
                  }
                </ul>
              } @else {
                <p class="muted">Sin alertas activas</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="Auditoría">
            <div class="drawer-panel">
              <ul class="detail-list">
                @for (ev of auditRows(); track ev.action) {
                  <li>
                    <div class="detail-list__main">
                      <strong>{{ ev.action }}</strong>
                      <span class="detail-list__meta-inline">{{ ev.when }}</span>
                    </div>
                    <div class="detail-list__meta"><span>{{ ev.actor }}</span></div>
                  </li>
                }
              </ul>
            </div>
          </mat-tab>
        </mat-tab-group>
      </aside>
    }
  `,
  styles: `
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      z-index: 200;
      backdrop-filter: blur(2px);
    }
    .instance-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(560px, 100vw);
      z-index: 201;
      background: var(--app-card);
      box-shadow: var(--app-shadow-lg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .instance-drawer__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.1rem 1.2rem 0.85rem;
      gap: 0.75rem;
      flex-shrink: 0;
    }
    .instance-drawer__identity {
      display: flex;
      gap: 0.75rem;
      min-width: 0;
      flex: 1;
    }
    .instance-drawer__logo {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--app-accent) 10%, var(--app-card));
      mat-icon { color: var(--app-accent); }
    }
    .instance-drawer__titles { min-width: 0; }
    .instance-drawer__provider {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }
    h2 {
      margin: 0.15rem 0 0;
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      word-break: break-word;
    }
    .instance-drawer__badges {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
      margin-top: 0.4rem;
    }
    .instance-drawer__env {
      font-size: 0.62rem;
      font-weight: 650;
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text-muted) 10%, var(--app-card));
      color: var(--app-text-muted);
    }
    .instance-drawer__demo {
      font-size: 0.58rem;
      font-weight: 700;
      padding: 0.12rem 0.38rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 12%, var(--app-card));
      color: var(--app-accent);
    }
    .instance-drawer__id {
      display: block;
      margin-top: 0.35rem;
      font-size: 0.62rem;
      color: var(--app-text-muted);
      word-break: break-all;
    }
    .instance-drawer__kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.45rem;
      padding: 0 1.2rem 0.85rem;
      flex-shrink: 0;
    }
    .kpi-chip {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
      padding: 0.5rem 0.55rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-surface) 45%, var(--app-card));
      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        color: var(--app-text-muted);
        margin-top: 0.1rem;
      }
      span {
        display: block;
        font-size: 0.55rem;
        font-weight: 650;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--app-text-muted);
      }
      strong {
        display: block;
        font-size: 0.78rem;
        font-weight: 750;
        font-variant-numeric: tabular-nums;
      }
    }
    .kpi-chip--warn strong { color: var(--app-danger); }
    .drawer-tabs { flex: 1; overflow: hidden; min-height: 0; }
    .drawer-panel {
      padding: 1rem 1.2rem 1.25rem;
      overflow-y: auto;
      max-height: calc(100vh - 220px);
    }
    .detail-section {
      margin-bottom: 1.15rem;
      h3 {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin: 0 0 0.65rem;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--app-text-muted);
        mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      }
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem 0.85rem;
      margin: 0;
      dt {
        font-size: 0.62rem;
        color: var(--app-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 650;
      }
      dd { margin: 0.12rem 0 0; font-size: 0.82rem; font-weight: 550; word-break: break-word; }
    }
    .detail-grid__wide { grid-column: 1 / -1; }
    .detail-grid--billing dd { font-weight: 700; }
    .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.74rem; }
    .platform-flags {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .platform-flag {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.6rem;
      border-radius: 8px;
      font-size: 0.74rem;
      color: var(--app-text-muted);
      background: color-mix(in srgb, var(--app-text-muted) 6%, var(--app-card));
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
    .platform-flag--on {
      color: var(--app-text);
      background: color-mix(in srgb, var(--status-running) 10%, var(--app-card));
      mat-icon { color: var(--status-running); }
    }
    .drawer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-top: 0.5rem;
      padding-top: 0.85rem;
    }
    .metric-chart-block {
      margin-bottom: 1rem;
      padding: 0.75rem 0.85rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-surface) 40%, var(--app-card));
    }
    .metric-chart-block__head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.45rem;
      h4 { margin: 0; font-size: 0.78rem; font-weight: 700; }
      span { font-size: 0.65rem; color: var(--app-text-muted); font-weight: 600; }
    }
    .panel-intro {
      margin: 0 0 0.75rem;
      font-size: 0.74rem;
      color: var(--app-text-muted);
    }
    .detail-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      li {
        padding: 0.65rem 0.75rem;
        border-radius: 10px;
        background: color-mix(in srgb, var(--app-surface) 40%, var(--app-card));
      }
    }
    .detail-list__main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      strong { font-size: 0.8rem; font-weight: 650; }
    }
    .detail-list__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.25rem;
      font-size: 0.68rem;
      color: var(--app-text-muted);
    }
    .detail-list__meta-inline { font-size: 0.65rem; color: var(--app-text-muted); font-weight: 500; }
    .detail-list__status {
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.1rem 0.38rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text-muted) 12%, var(--app-card));
      color: var(--app-text-muted);
    }
    .detail-list__status--ok {
      background: color-mix(in srgb, var(--status-running) 12%, var(--app-card));
      color: var(--status-running);
    }
    .detail-list__severity {
      font-size: 0.58rem;
      font-weight: 700;
      padding: 0.1rem 0.38rem;
      border-radius: 999px;
    }
    .sev-critical { background: color-mix(in srgb, #ef4444 14%, var(--app-card)); color: #dc2626; }
    .sev-warning { background: color-mix(in srgb, #f59e0b 14%, var(--app-card)); color: #b45309; }
    .sev-info { background: color-mix(in srgb, #3b82f6 12%, var(--app-card)); color: #2563eb; }
    .muted { color: var(--app-text-muted); font-size: 0.82rem; }
    @media (max-width: 520px) {
      .instance-drawer__kpis { grid-template-columns: repeat(2, 1fr); }
    }
  `,
})
export class InstanceDetailDrawerComponent {
  private readonly demoActions = inject(DemoActionsService)

  @Input() open = false
  @Input() instance: DashboardInstanceRow | null = null
  readonly close = output<void>()

  readonly trend = () =>
    this.instance ? buildInstanceTrendChart(this.instance) : null

  readonly providerLogo = () =>
    this.instance ? instanceProviderLogo(this.instance.provider) : undefined

  readonly envLabel = () =>
    this.instance ? instanceEnvLabel(this.instance.environment) : '—'

  readonly statusLabel = () =>
    this.instance ? instanceStatusLabel(this.instance.status) : '—'

  readonly dockerRows = () =>
    this.instance ? instanceDockerContainers(this.instance) : []

  readonly k8sRows = () =>
    this.instance ? instanceK8sPods(this.instance) : []

  readonly alertRows = () =>
    this.instance ? instanceAlerts(this.instance) : []

  readonly serviceRows = () =>
    this.instance ? instanceServices(this.instance) : []

  readonly auditRows = () =>
    this.instance ? instanceAuditLog(this.instance) : []

  statusClass = (status: string): string =>
    status === 'running' ? 'detail-list__status detail-list__status--ok' : 'detail-list__status'

  formatCost = (v: number | null | undefined): string => {
    if (v == null) return '—'
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
  }

  demo = (action: string): void => {
    this.demoActions.simulate(`${action} — ${this.instance?.name}`, 350).subscribe()
  }
}
