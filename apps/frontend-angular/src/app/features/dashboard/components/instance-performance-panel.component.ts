import { Component, input, output, computed } from '@angular/core'
import { DatePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { ChartCardComponent } from '../../../shared/ui/chart-card.component'
import { DashboardInstanceRow } from '../dashboard.models'
import { buildInstanceTrendChart } from '../utils/dashboard-instance-charts.util'
import {
  instanceAlerts,
  instanceEnvLabel,
  instanceProviderLogo,
  instanceStatusLabel,
} from '../utils/dashboard-instance-detail.util'

@Component({
  selector: 'app-instance-performance-panel',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    BrandLogoComponent,
    StatusBadgeComponent,
    ChartCardComponent,
  ],
  template: `
    @if (instance(); as inst) {
      <div class="perf-panel">
        <header class="perf-panel__head">
          <div class="perf-panel__identity">
            <span class="perf-panel__logo" [class]="'perf-panel__logo--' + providerTone()">
              @if (providerLogo(); as logo) {
                <app-brand-logo [logo]="logo" size="md" />
              } @else {
                <mat-icon>dns</mat-icon>
              }
            </span>
            <div>
              <span class="perf-panel__cloud">{{ inst.provider }} · {{ inst.region }}</span>
              <h4>{{ inst.name }}</h4>
              <div class="perf-panel__badges">
                <app-status-badge [value]="inst.status" />
                <span class="perf-panel__env">{{ envLabel() }}</span>
              </div>
            </div>
          </div>
          <button mat-stroked-button type="button" (click)="openFull.emit()">
            <mat-icon>open_in_new</mat-icon>
            Ficha completa
          </button>
        </header>

        <div class="perf-panel__kpis">
          <div class="perf-kpi">
            <mat-icon>speed</mat-icon>
            <div>
              <span>CPU actual</span>
              <strong>{{ currentCpu() }}%</strong>
              <small>Pico {{ trend()?.cpuPeak ?? '—' }}%</small>
            </div>
          </div>
          <div class="perf-kpi">
            <mat-icon>memory</mat-icon>
            <div>
              <span>RAM actual</span>
              <strong>{{ currentRam() }}%</strong>
              <small>Pico {{ trend()?.ramPeak ?? '—' }}%</small>
            </div>
          </div>
          <div class="perf-kpi">
            <mat-icon>storage</mat-icon>
            <div>
              <span>Disco</span>
              <strong>{{ diskUsage() }}%</strong>
              <small>{{ inst.diskGb ?? '—' }} GB</small>
            </div>
          </div>
          <div class="perf-kpi" [class.perf-kpi--warn]="inst.alertCount">
            <mat-icon>notifications</mat-icon>
            <div>
              <span>Alertas</span>
              <strong>{{ inst.alertCount ?? 0 }}</strong>
              <small>{{ statusLabel() }}</small>
            </div>
          </div>
        </div>

        <div class="perf-panel__charts">
          <app-chart-card
            size="compact"
            title="CPU · 24 h"
            subtitle="Utilización del procesador"
            chartIcon="speed"
            accent="violet"
            kind="line"
            unit="%"
            [data]="trend()?.cpu ?? []"
            [highlightValue]="trend()?.cpuPeak ?? 0"
            highlightLabel="Pico"
            [delay]="0"
          />
          <app-chart-card
            size="compact"
            title="RAM · 24 h"
            subtitle="Presión de memoria"
            chartIcon="memory"
            accent="cyan"
            kind="line"
            unit="%"
            [data]="trend()?.ram ?? []"
            [highlightValue]="trend()?.ramPeak ?? 0"
            highlightLabel="Pico"
            [delay]="40"
          />
          <app-chart-card
            size="compact"
            title="CPU + RAM"
            subtitle="Correlación de rendimiento"
            chartIcon="show_chart"
            accent="green"
            kind="line"
            unit="%"
            [data]="trend()?.cpu ?? []"
            [secondaryData]="trend()?.ram ?? []"
            [highlightValue]="currentCpu()"
            highlightLabel="CPU now"
            [delay]="80"
          />
        </div>

        <section class="perf-panel__info">
          <h5>Información de la instancia</h5>
          <dl class="perf-info-grid">
            <div><dt>Tipo</dt><dd>{{ inst.instanceType ?? '—' }}</dd></div>
            <div><dt>Sistema</dt><dd>{{ inst.os ?? '—' }}</dd></div>
            <div><dt>vCPU / RAM</dt><dd>{{ inst.cpuCores ?? '—' }} · {{ inst.ramGb ?? '—' }} GB</dd></div>
            <div><dt>IP pública</dt><dd class="mono">{{ inst.publicIp ?? '—' }}</dd></div>
            <div><dt>Cuenta</dt><dd>{{ inst.accountName ?? '—' }}</dd></div>
            <div><dt>Coste/mes</dt><dd>{{ formatCost(inst.monthlyCost) }}</dd></div>
            <div><dt>Última sync</dt><dd>{{ inst.lastSyncedAt | date: 'short' }}</dd></div>
            <div><dt>Stacks</dt><dd>{{ stacksLabel() }}</dd></div>
          </dl>
          @if (alertRows().length) {
            <ul class="perf-alerts">
              @for (a of alertRows(); track a.title) {
                <li [class]="'sev-' + a.severity.toLowerCase()">
                  <mat-icon>warning</mat-icon>
                  <span>{{ a.title }}</span>
                  <small>{{ a.since }}</small>
                </li>
              }
            </ul>
          }
        </section>
      </div>
    }
  `,
  styles: `
    .perf-panel {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      height: 100%;
      min-height: 420px;
    }
    .perf-panel__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.65rem;
      flex-shrink: 0;
    }
    .perf-panel__identity {
      display: flex;
      gap: 0.65rem;
      min-width: 0;
    }
    .perf-panel__logo {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--app-accent) 10%, var(--app-card));
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: var(--app-text-muted); }
    }
    .perf-panel__logo--aws { background: color-mix(in srgb, #ff9900 14%, var(--app-card)); }
    .perf-panel__logo--gcp { background: color-mix(in srgb, #4285f4 14%, var(--app-card)); }
    .perf-panel__logo--azure { background: color-mix(in srgb, #0078d4 14%, var(--app-card)); }
    .perf-panel__logo--vps { background: color-mix(in srgb, #64748b 14%, var(--app-card)); }
    .perf-panel__cloud {
      font-size: 0.6rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }
    h4 {
      margin: 0.12rem 0 0;
      font-size: 0.92rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      word-break: break-word;
    }
    .perf-panel__badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: 0.3rem;
    }
    .perf-panel__env {
      font-size: 0.58rem;
      font-weight: 650;
      padding: 0.1rem 0.38rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text-muted) 10%, var(--app-card));
      color: var(--app-text-muted);
    }
    .perf-panel__head button {
      flex-shrink: 0;
      font-size: 0.68rem;
    }
    .perf-panel__kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.4rem;
    }
    .perf-kpi {
      display: flex;
      gap: 0.35rem;
      padding: 0.45rem 0.5rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-surface) 42%, var(--app-card));
      mat-icon {
        font-size: 0.95rem;
        width: 0.95rem;
        height: 0.95rem;
        color: var(--app-text-muted);
        margin-top: 0.08rem;
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
        font-size: 0.82rem;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }
      small {
        display: block;
        font-size: 0.58rem;
        color: var(--app-text-muted);
        margin-top: 0.05rem;
      }
    }
    .perf-kpi--warn strong { color: var(--app-danger); }
    .perf-panel__charts {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.55rem;
    }
    .perf-panel__info {
      padding: 0.75rem 0.85rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-surface) 40%, var(--app-card));
      h5 {
        margin: 0 0 0.55rem;
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--app-text-muted);
      }
    }
    .perf-info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem 0.65rem;
      margin: 0;
      dt {
        font-size: 0.58rem;
        font-weight: 650;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--app-text-muted);
      }
      dd {
        margin: 0.08rem 0 0;
        font-size: 0.74rem;
        font-weight: 550;
        word-break: break-word;
      }
    }
    .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.68rem; }
    .perf-alerts {
      list-style: none;
      margin: 0.65rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      li {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.45rem;
        border-radius: 8px;
        font-size: 0.68rem;
        background: color-mix(in srgb, #f59e0b 10%, var(--app-card));
        mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
        small { margin-left: auto; color: var(--app-text-muted); }
      }
      .sev-critical { background: color-mix(in srgb, #ef4444 10%, var(--app-card)); }
    }
    @media (max-width: 720px) {
      .perf-panel__kpis { grid-template-columns: repeat(2, 1fr); }
    }
  `,
})
export class InstancePerformancePanelComponent {
  readonly instance = input.required<DashboardInstanceRow>()
  readonly openFull = output<void>()

  readonly trend = computed(() => buildInstanceTrendChart(this.instance()))

  readonly providerLogo = computed(() => instanceProviderLogo(this.instance().provider))

  readonly providerTone = computed((): 'aws' | 'gcp' | 'azure' | 'vps' | 'default' => {
    const provider = this.instance().provider
    if (provider === 'AWS') return 'aws'
    if (provider === 'GCP') return 'gcp'
    if (provider === 'AZURE') return 'azure'
    if (provider === 'VPS') return 'vps'
    return 'default'
  })

  readonly envLabel = computed(() => instanceEnvLabel(this.instance().environment))

  readonly statusLabel = computed(() => instanceStatusLabel(this.instance().status))

  readonly alertRows = computed(() => instanceAlerts(this.instance()))

  currentCpu = (): number => {
    const points = this.trend().cpu
    return points.length ? points[points.length - 1].value : 0
  }

  currentRam = (): number => {
    const points = this.trend().ram
    return points.length ? points[points.length - 1].value : 0
  }

  diskUsage = (): number => {
    const inst = this.instance()
    const seed = inst.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
    const base = 45 + (seed % 35)
    if (inst.status === 'WARNING') return Math.min(base + 12, 92)
    if (inst.status === 'ERROR') return Math.min(base + 18, 96)
    return base
  }

  stacksLabel = (): string => {
    const inst = this.instance()
    const parts: string[] = []
    if (inst.hasDocker) parts.push('Docker')
    if (inst.hasKubernetes) parts.push('K8s')
    return parts.length ? parts.join(' · ') : 'Ninguno'
  }

  formatCost = (v: number | null | undefined): string => {
    if (v == null) return '—'
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
  }
}
