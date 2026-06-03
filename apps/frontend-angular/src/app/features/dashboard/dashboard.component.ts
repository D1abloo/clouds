import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { DatePipe } from '@angular/common'
import { RouterLink } from '@angular/router'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTableModule } from '@angular/material/table'
import { MatButtonToggleModule } from '@angular/material/button-toggle'
import { MatListModule } from '@angular/material/list'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { MiniChartComponent } from '../../shared/components/mini-chart/mini-chart.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { InventoryService } from '../../core/services/inventory.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { invNum } from '../../core/utils/inventory.util'
import { finalize } from 'rxjs'

type DashboardData = Record<string, unknown>

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    PageHeaderComponent,
    SummaryCardComponent,
    MiniChartComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatButtonToggleModule,
    MatListModule,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Dashboard"
        description="Global infrastructure overview — instances, costs, alerts and operations"
        [actions]="[
          { label: 'Refresh', icon: 'refresh', primary: true },
          { label: 'Export report', icon: 'download' },
        ]"
        (actionClick)="handleHeaderAction($event)"
      />

      <div class="filter-row" style="margin-bottom: 1rem">
        <mat-button-toggle-group [formControl]="rangeControl" aria-label="Time range">
          <mat-button-toggle value="1h">1h</mat-button-toggle>
          <mat-button-toggle value="24h">24h</mat-button-toggle>
          <mat-button-toggle value="7d">7d</mat-button-toggle>
          <mat-button-toggle value="30d">30d</mat-button-toggle>
        </mat-button-toggle-group>
        @if (refreshing()) {
          <span class="refresh-hint">Updating metrics…</span>
        }
      </div>

      @if (page.loading()) {
        <app-loading-state message="Loading dashboard metrics..." />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="loadData()" />
      } @else {
        <div class="summary-grid">
          <app-summary-card title="Total instances" [value]="n('totalInstances')" icon="dns" />
          <app-summary-card
            title="Running"
            [value]="n('runningInstances')"
            [subtitle]="stoppedLabel()"
            icon="play_circle"
            iconColor="primary"
          />
          <app-summary-card title="Warning / Error" [value]="warningError()" subtitle="Needs attention" icon="error" iconColor="warn" />
          <app-summary-card title="Monthly spend" [value]="formatSpend(n('monthlySpend'))" icon="payments" />
          <app-summary-card title="Open alerts" [value]="n('alertsOpen')" icon="warning" iconColor="warn" />
          <app-summary-card title="VPS hosts" [value]="n('vpsHosts')" icon="storage" />
        </div>

        <div class="chart-grid">
          <app-mini-chart title="Instances by provider" kind="bar" [data]="providerChart()" />
          <app-mini-chart title="Instances by status" kind="donut" [data]="statusChart()" />
          <app-mini-chart title="CPU / RAM trend" kind="line" [data]="cpuRamTrend()" />
          <app-mini-chart title="Cost by provider" kind="bar" [data]="costChart()" />
        </div>

        <div class="status-row">
          <div class="status-card">
            <h3><mat-icon>view_in_ar</mat-icon> Docker</h3>
            <p>{{ dockerLabel() }}</p>
          </div>
          <div class="status-card">
            <h3><mat-icon>hub</mat-icon> Kubernetes</h3>
            <p>{{ k8sLabel() }}</p>
          </div>
          <div class="status-card">
            <h3><mat-icon>build</mat-icon> Jenkins</h3>
            <p>{{ jenkinsLabel() }}</p>
          </div>
          <div class="status-card">
            <h3><mat-icon>architecture</mat-icon> Terraform</h3>
            <p>{{ tfLabel() }}</p>
          </div>
        </div>

        <div class="dashboard-panels">
          <div class="table-card">
            <h3>Recent alerts</h3>
            @if (recentAlerts().length === 0) {
              <p class="muted">No active alerts</p>
            } @else {
              <table mat-table [dataSource]="recentAlerts()">
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Alert</th>
                  <td mat-cell *matCellDef="let row">{{ row.title ?? row.message }}</td>
                </ng-container>
                <ng-container matColumnDef="severity">
                  <th mat-header-cell *matHeaderCellDef>Severity</th>
                  <td mat-cell *matCellDef="let row">{{ row.severity ?? '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status ?? 'open'" /></td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="alertCols"></tr>
                <tr mat-row *matRowDef="let row; columns: alertCols"></tr>
              </table>
            }
            <a mat-stroked-button routerLink="/alerts" class="panel-link">View all alerts</a>
          </div>

          <div class="table-card">
            <h3>Recent activity</h3>
            @if (recentActivity().length === 0) {
              <p class="muted">No recent events</p>
            } @else {
              <mat-list dense>
                @for (ev of recentActivity(); track $index) {
                  <mat-list-item>
                    <span matListItemTitle>{{ ev['action'] ?? ev['eventType'] }}</span>
                    <span matListItemLine>{{ ev['resource'] ?? ev['entityType'] }} · {{ $any(ev['createdAt']) | date: 'short' }}</span>
                  </mat-list-item>
                }
              </mat-list>
            }
            <a mat-stroked-button routerLink="/audit" class="panel-link">Audit log</a>
          </div>

          <div class="table-card">
            <h3>Notifications</h3>
            @if (notifications().length === 0) {
              <p class="muted">No notifications</p>
            } @else {
              <mat-list dense>
                @for (n of notifications(); track n.id) {
                  <mat-list-item>
                    <span matListItemTitle>{{ n.title }}</span>
                    <span matListItemLine>{{ n.message }}</span>
                  </mat-list-item>
                }
              </mat-list>
            }
            <a mat-stroked-button routerLink="/notifications" class="panel-link">All notifications</a>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .refresh-hint { font-size: 0.85rem; color: var(--app-text-muted); }
    .status-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .status-card {
      background: var(--app-card);
      border: 1px solid var(--app-border);
      border-radius: 12px;
      padding: 1rem;
      h3 {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin: 0 0 0.5rem;
        font-size: 0.95rem;
      }
      p { margin: 0; color: var(--app-text-muted); font-size: 0.85rem; }
    }
    .dashboard-panels {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1rem;
    }
    .dashboard-panels h3 { margin: 0 0 0.75rem; font-size: 1rem; }
    .panel-link { margin-top: 0.75rem; }
    .muted { color: var(--app-text-muted); font-size: 0.9rem; }
    table { width: 100%; }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly inventory = inject(InventoryService)
  private readonly demoActions = inject(DemoActionsService)

  readonly page = createPageLoader(true)
  readonly data = signal<DashboardData | null>(null)
  readonly refreshing = signal(false)
  readonly rangeControl = new FormControl('24h', { nonNullable: true })
  readonly alertCols = ['title', 'severity', 'status']

  ngOnInit = (): void => this.loadData()

  n = (key: string): number => invNum(this.data(), key)

  loadData = (): void => {
    this.page.run(this.inventory.dashboard(), {
      onSuccess: (d) => this.data.set(d),
      errorMessage: 'Could not load dashboard from /inventory/dashboard',
    })
  }

  handleHeaderAction = (label: string): void => {
    if (label === 'Refresh') {
      this.refreshing.set(true)
      this.inventory
        .dashboard()
        .pipe(finalize(() => this.refreshing.set(false)))
        .subscribe({
          next: (d) => {
            this.data.set(d)
            this.demoActions.simulate('Dashboard refresh', 300).subscribe()
          },
          error: () => this.page.error.set('Refresh failed'),
        })
      return
    }
    this.demoActions.simulate('Report export', 800, 'Report exported (demo CSV)').subscribe()
  }

  stoppedLabel = (): string => {
    const d = this.data()
    const stopped = (d?.['stoppedInstances'] as number) ?? 0
    return `${stopped} stopped`
  }

  warningError = (): number => {
    const d = this.data()
    return ((d?.['warningInstances'] as number) ?? 0) + ((d?.['errorInstances'] as number) ?? 0)
  }

  providerChart = computed(() => {
    const by = (this.data()?.['byProvider'] as Record<string, number>) ?? {}
    return Object.entries(by).map(([label, value]) => ({ label, value }))
  })

  statusChart = computed(() => {
    const by = (this.data()?.['byStatus'] as Record<string, number>) ?? {}
    const colors: Record<string, string> = {
      running: '#10b981',
      stopped: '#64748b',
      warning: '#f59e0b',
      error: '#ef4444',
    }
    return Object.entries(by).map(([label, value]) => ({
      label,
      value,
      color: colors[label] ?? '#3b82f6',
    }))
  })

  cpuRamTrend = (): { label: string; value: number }[] => [
    { label: '00:00', value: 42 },
    { label: '04:00', value: 38 },
    { label: '08:00', value: 55 },
    { label: '12:00', value: 72 },
    { label: '16:00', value: 68 },
    { label: '20:00', value: 48 },
  ]

  costChart = computed(() => {
    const by = (this.data()?.['byProvider'] as Record<string, number>) ?? {}
    return Object.entries(by).map(([label, value]) => ({
      label,
      value: Math.round(value * 120 + 200),
    }))
  })

  dockerLabel = (): string => {
    const d = (this.data()?.['docker'] as Record<string, number>) ?? {}
    return `${d['hosts'] ?? 0} hosts · ${d['running'] ?? 0}/${d['containers'] ?? 0} running`
  }

  k8sLabel = (): string => {
    const d = (this.data()?.['kubernetes'] as Record<string, number>) ?? {}
    return `${d['clusters'] ?? 0} clusters · ${d['pods'] ?? 0} pods · ${d['errors'] ?? 0} errors`
  }

  jenkinsLabel = (): string => {
    const d = (this.data()?.['jenkins'] as Record<string, number>) ?? {}
    return `${d['jobs'] ?? 0} jobs · ${d['running'] ?? 0} running · ${d['failed'] ?? 0} failed`
  }

  tfLabel = (): string => {
    const d = (this.data()?.['terraform'] as Record<string, number>) ?? {}
    return `${d['runs'] ?? 0} runs · ${d['errors'] ?? 0} errors`
  }

  recentAlerts = (): Record<string, unknown>[] =>
    (this.data()?.['recentAlerts'] as Record<string, unknown>[]) ?? []

  recentActivity = (): Record<string, unknown>[] =>
    (this.data()?.['recentActivity'] as Record<string, unknown>[]) ?? []

  notifications = (): { id: string; title: string; message: string }[] =>
    (this.data()?.['notifications'] as { id: string; title: string; message: string }[]) ?? []

  formatSpend = (value?: number): string => {
    if (value === undefined || value === null) return '$0'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }
}
