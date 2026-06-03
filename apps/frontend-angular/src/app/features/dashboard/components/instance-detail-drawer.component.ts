import { Component, Input, output, inject } from '@angular/core'
import { DatePipe } from '@angular/common'
import { RouterLink } from '@angular/router'
import { MatTabsModule } from '@angular/material/tabs'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { MiniChartComponent } from '../../../shared/components/mini-chart/mini-chart.component'
import { DashboardInstanceRow } from '../dashboard.models'
import { DemoActionsService } from '../../../core/services/demo-actions.service'

@Component({
  selector: 'app-instance-detail-drawer',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    StatusBadgeComponent,
    MiniChartComponent,
  ],
  template: `
    @if (open && instance) {
      <div class="drawer-backdrop animate-fade-in" (click)="close.emit()" role="presentation"></div>
      <aside class="instance-drawer animate-slide-in" role="dialog" aria-label="Instance detail">
        <header class="instance-drawer__head">
          <div>
            <span class="instance-drawer__provider">{{ instance.provider }}</span>
            <h2>{{ instance.name }}</h2>
            <app-status-badge [value]="instance.status" />
          </div>
          <button mat-icon-button type="button" aria-label="Close drawer" (click)="close.emit()">
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <mat-tab-group class="soft-tabs drawer-tabs" animationDuration="200ms">
          <mat-tab label="Summary">
            <div class="drawer-panel">
              <dl class="detail-grid">
                <div><dt>Account</dt><dd>{{ instance.accountName }}</dd></div>
                <div><dt>Region</dt><dd>{{ instance.region }}</dd></div>
                <div><dt>Type</dt><dd>{{ instance.instanceType }}</dd></div>
                <div><dt>OS</dt><dd>{{ instance.os }}</dd></div>
                <div><dt>Public IP</dt><dd class="mono">{{ instance.publicIp }}</dd></div>
                <div><dt>Private IP</dt><dd class="mono">{{ instance.privateIp }}</dd></div>
                <div><dt>CPU</dt><dd>{{ instance.cpuCores ?? '—' }} cores</dd></div>
                <div><dt>RAM</dt><dd>{{ instance.ramGb ?? '—' }} GB</dd></div>
                <div><dt>Disk</dt><dd>{{ instance.diskGb ?? '—' }} GB</dd></div>
                <div><dt>Cost/mo</dt><dd>{{ formatCost(instance.monthlyCost) }}</dd></div>
                <div><dt>Environment</dt><dd>{{ instance.environment }}</dd></div>
                <div><dt>Last sync</dt><dd>{{ instance.lastSyncedAt | date: 'medium' }}</dd></div>
              </dl>
              <div class="drawer-actions">
                <a mat-stroked-button [routerLink]="['/instances', instance.id]"><mat-icon>open_in_new</mat-icon> Full detail</a>
                <button mat-stroked-button type="button" (click)="demo('Terminal')"><mat-icon>terminal</mat-icon> Terminal</button>
              </div>
            </div>
          </mat-tab>
          <mat-tab label="Metrics">
            <div class="drawer-panel">
              <app-mini-chart title="CPU 24h" kind="line" [data]="cpuTrend" [animated]="true" />
              <app-mini-chart title="RAM 24h" kind="line" [data]="ramTrend" [secondaryData]="[]" [animated]="true" />
            </div>
          </mat-tab>
          <mat-tab label="Docker">
            <div class="drawer-panel">
              @if (instance.hasDocker) {
                <p>{{ instance.name }} — 4 containers running, 1 stopped</p>
                <ul class="mini-list">
                  <li>nginx — running — 80:80</li>
                  <li>api — running — 3000:3000</li>
                  <li>redis — running</li>
                </ul>
              } @else {
                <p class="muted">No Docker detected on this instance</p>
              }
            </div>
          </mat-tab>
          <mat-tab label="Kubernetes">
            <div class="drawer-panel">
              @if (instance.hasKubernetes) {
                <p>2 pods running in namespace default</p>
                <ul class="mini-list">
                  <li>app-deployment-0 — Running</li>
                  <li>app-deployment-1 — Running</li>
                </ul>
              } @else {
                <p class="muted">No Kubernetes workloads detected</p>
              }
            </div>
          </mat-tab>
          <mat-tab label="Services">
            <div class="drawer-panel">
              <ul class="mini-list">
                <li>sshd — active</li>
                <li>nginx — active</li>
                <li>docker — active</li>
              </ul>
            </div>
          </mat-tab>
          <mat-tab label="Billing">
            <div class="drawer-panel">
              <p>Monthly cost: <strong>{{ formatCost(instance.monthlyCost) }}</strong></p>
              <p>MTD: <strong>{{ formatCost((instance.monthlyCost ?? 0) * 0.4) }}</strong></p>
            </div>
          </mat-tab>
          <mat-tab label="Alerts">
            <div class="drawer-panel">
              @if (instance.alertCount) {
                <ul class="mini-list">
                  <li>CPU threshold exceeded — CRITICAL</li>
                  <li>Disk usage above 85% — WARNING</li>
                </ul>
              } @else {
                <p class="muted">No active alerts</p>
              }
            </div>
          </mat-tab>
          <mat-tab label="Audit">
            <div class="drawer-panel">
              <ul class="mini-list">
                <li>instance.sync — {{ instance.lastSyncedAt | date: 'short' }}</li>
                <li>metrics.collect — 2 hours ago</li>
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
      width: min(520px, 100vw);
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
      padding: 1.25rem 1.35rem;
      gap: 1rem;
      h2 { margin: 0.25rem 0; font-size: 1.25rem; font-weight: 700; word-break: break-word; }
    }
    .instance-drawer__provider {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-accent);
    }
    .drawer-tabs { flex: 1; overflow: hidden; }
    .drawer-panel { padding: 1.25rem; overflow-y: auto; max-height: calc(100vh - 140px); }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem 1rem;
      margin: 0 0 1.25rem;
      dt { font-size: 0.72rem; color: var(--app-text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
      dd { margin: 0.15rem 0 0; font-size: 0.875rem; font-weight: 500; word-break: break-word; }
    }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; }
    .drawer-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .mini-list {
      list-style: none;
      padding: 0;
      margin: 0;
      li {
        padding: 0.65rem 0;
        font-size: 0.85rem;
        border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 12%, transparent);
      }
    }
    .muted { color: var(--app-text-muted); font-size: 0.875rem; }
  `,
})
export class InstanceDetailDrawerComponent {
  private readonly demoActions = inject(DemoActionsService)

  @Input() open = false
  @Input() instance: DashboardInstanceRow | null = null
  readonly close = output<void>()

  readonly cpuTrend = [
    { label: '00', value: 42 }, { label: '04', value: 38 }, { label: '08', value: 55 },
    { label: '12', value: 72 }, { label: '16', value: 68 }, { label: '20', value: 48 },
  ]
  readonly ramTrend = [
    { label: '00', value: 58 }, { label: '04', value: 52 }, { label: '08', value: 61 },
    { label: '12', value: 78 }, { label: '16', value: 74 }, { label: '20', value: 62 },
  ]

  formatCost = (v: number | null | undefined): string => {
    if (v == null) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
  }

  demo = (action: string): void => {
    this.demoActions.simulate(`${action} — ${this.instance?.name}`, 350).subscribe()
  }
}
