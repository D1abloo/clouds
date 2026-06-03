import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { DashboardHeaderComponent } from './components/dashboard-header.component'
import { StatCardComponent } from './components/stat-card.component'
import { DashboardSectionComponent } from './components/dashboard-section.component'
import { PlatformSummaryCardComponent } from './components/platform-summary-card.component'
import { AlertsTableComponent } from './components/alerts-table.component'
import { ActivityTimelineComponent } from './components/activity-timeline.component'
import { NotificationsPanelComponent, NotificationRow } from './components/notifications-panel.component'
import { ChartCardComponent } from '../../shared/ui/chart-card.component'
import { SkeletonCardComponent } from '../../shared/ui/skeleton-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { InventoryService } from '../../core/services/inventory.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { DemoService } from '../../core/services/demo.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { invNum } from '../../core/utils/inventory.util'
import { TimeRange } from './components/time-range-selector.component'
import { finalize } from 'rxjs'

type DashboardData = Record<string, unknown>

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    StatCardComponent,
    DashboardSectionComponent,
    PlatformSummaryCardComponent,
    AlertsTableComponent,
    ActivityTimelineComponent,
    NotificationsPanelComponent,
    ChartCardComponent,
    SkeletonCardComponent,
    LoadingStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <div class="dashboard-page">
      <app-dashboard-header
        [lastSync]="lastSyncLabel()"
        [demoMode]="demo.demoMode()"
        [refreshing]="refreshing()"
        [timeRange]="timeRange()"
        (refreshClick)="handleRefresh()"
        (exportClick)="handleExport()"
        (rangeChange)="handleRangeChange($event)"
      />

      @if (page.loading()) {
        <div class="dashboard-skeleton">
          <div class="stats-grid">
            @for (i of [1,2,3,4,5,6]; track i) {
              <app-skeleton-card />
            }
          </div>
          <app-loading-state message="Loading dashboard metrics…" />
        </div>
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="loadData()" />
      } @else {
        <app-dashboard-section title="Key metrics" subtitle="Infrastructure health at a glance" icon="insights">
          <div class="stats-grid">
            <app-stat-card
              title="Total instances"
              [value]="n('totalInstances')"
              icon="dns"
              trend="+2 this week"
              [delay]="0"
            />
            <app-stat-card
              title="Running"
              [value]="n('runningInstances')"
              [subtitle]="stoppedLabel()"
              icon="play_circle"
              tone="success"
              badge="Healthy"
              [delay]="40"
            />
            <app-stat-card
              title="Warning / Error"
              [value]="warningError()"
              subtitle="Needs attention"
              icon="error_outline"
              tone="danger"
              [trend]="warningError() > 0 ? 'Review now' : ''"
              [delay]="80"
            />
            <app-stat-card
              title="Monthly spend"
              [value]="formatSpend(n('monthlySpend'))"
              icon="payments"
              tone="info"
              trend="−4% vs last month"
              [trendDown]="true"
              [delay]="120"
            />
            <app-stat-card
              title="Open alerts"
              [value]="n('alertsOpen')"
              icon="warning_amber"
              tone="warning"
              [subtitle]="n('alertsOpen') ? 'Active incidents' : 'All clear'"
              [delay]="160"
            />
            <app-stat-card
              title="VPS hosts"
              [value]="n('vpsHosts')"
              icon="storage"
              subtitle="Bare metal & VPS"
              [delay]="200"
            />
          </div>
        </app-dashboard-section>

        <app-dashboard-section
          title="Analytics"
          subtitle="Distribution, utilization and cost trends · {{ timeRange() }}"
          icon="analytics"
          [delay]="60"
        >
          <div class="charts-grid">
            <app-chart-card
              title="Instances by provider"
              subtitle="Cloud footprint across AWS, GCP and Azure"
              badge="Live"
              kind="bar"
              [data]="providerChart()"
              [delay]="0"
            />
            <app-chart-card
              title="Instances by status"
              subtitle="Running, stopped, warning and error states"
              kind="donut"
              [data]="statusChart()"
              [delay]="50"
            />
            <app-chart-card
              title="CPU / RAM trend"
              subtitle="Average utilization over selected range"
              [badge]="timeRange()"
              kind="line"
              [data]="cpuTrend()"
              [secondaryData]="ramTrend()"
              [delay]="100"
            />
            <app-chart-card
              title="Cost by provider"
              subtitle="Estimated monthly spend breakdown"
              kind="bar"
              [data]="costChart()"
              [delay]="150"
            />
          </div>
        </app-dashboard-section>

        <app-dashboard-section
          title="Platform overview"
          subtitle="Quick status across automation and container stacks"
          icon="hub"
          [delay]="120"
        >
          <div class="platform-grid">
            <app-platform-summary-card
              title="Docker"
              [summary]="dockerLabel()"
              icon="view_in_ar"
              route="/docker"
              tone="docker"
              [metrics]="dockerMetrics()"
              [delay]="0"
            />
            <app-platform-summary-card
              title="Kubernetes"
              [summary]="k8sLabel()"
              icon="hub"
              route="/kubernetes"
              tone="k8s"
              [metrics]="k8sMetrics()"
              [delay]="40"
            />
            <app-platform-summary-card
              title="Jenkins"
              [summary]="jenkinsLabel()"
              icon="build"
              route="/jenkins"
              tone="jenkins"
              [metrics]="jenkinsMetrics()"
              [delay]="80"
            />
            <app-platform-summary-card
              title="Terraform"
              [summary]="tfLabel()"
              icon="architecture"
              route="/terraform"
              tone="terraform"
              [metrics]="tfMetrics()"
              [delay]="120"
            />
          </div>
        </app-dashboard-section>

        <div class="panels-grid">
          <app-alerts-table [rows]="recentAlerts()" />
          <app-activity-timeline [events]="recentActivity()" />
          <app-notifications-panel [items]="notificationRows()" />
        </div>
      }
    </div>
  `,
  styles: `
    .dashboard-page {
      padding: 0;
      max-width: 1480px;
      margin: 0 auto;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 1rem;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.15rem;
    }
    .platform-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    .panels-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.15rem;
      margin-bottom: 1.5rem;
    }
    .dashboard-skeleton .stats-grid {
      margin-bottom: 1.25rem;
    }
    @media (max-width: 1280px) {
      .stats-grid { grid-template-columns: repeat(3, 1fr); }
      .platform-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 960px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .charts-grid { grid-template-columns: 1fr; }
      .panels-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .stats-grid { grid-template-columns: 1fr; }
      .platform-grid { grid-template-columns: 1fr; }
    }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly inventory = inject(InventoryService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly realtime = inject(RealtimeService)
  readonly demo = inject(DemoService)

  readonly page = createPageLoader(true)
  readonly data = signal<DashboardData | null>(null)
  readonly refreshing = signal(false)
  readonly timeRange = signal<TimeRange>('24h')
  readonly lastSyncAt = signal(new Date())

  ngOnInit(): void {
    this.realtime.connect()
    this.realtime.on('inventory.updated', () => this.loadData())
    this.realtime.on('dashboard.updated', () => this.loadData())
    this.loadData()
  }

  n = (key: string): number => invNum(this.data(), key)

  lastSyncLabel = (): string => this.lastSyncAt().toLocaleTimeString()

  loadData = (): void => {
    this.page.run(this.inventory.dashboard(), {
      onSuccess: (d) => {
        this.data.set(d)
        this.lastSyncAt.set(new Date())
      },
      errorMessage: 'Could not load dashboard from /inventory/dashboard',
    })
  }

  handleRefresh = (): void => {
    this.refreshing.set(true)
    this.inventory
      .dashboard()
      .pipe(finalize(() => this.refreshing.set(false)))
      .subscribe({
        next: (d) => {
          this.data.set(d)
          this.lastSyncAt.set(new Date())
          this.demoActions.simulate('Dashboard refresh', 300).subscribe()
        },
        error: () => this.page.error.set('Refresh failed'),
      })
  }

  handleExport = (): void => {
    this.demoActions.simulate('Report export', 800, 'Report exported (demo CSV)').subscribe()
  }

  handleRangeChange = (range: TimeRange): void => {
    this.timeRange.set(range)
    this.demoActions.simulate(`Range ${range}`, 200).subscribe()
  }

  stoppedLabel = (): string => {
    const stopped = (this.data()?.['stoppedInstances'] as number) ?? 0
    return `${stopped} stopped`
  }

  warningError = (): number => {
    const d = this.data()
    return ((d?.['warningInstances'] as number) ?? 0) + ((d?.['errorInstances'] as number) ?? 0)
  }

  providerChart = computed(() => {
    const by = (this.data()?.['byProvider'] as Record<string, number>) ?? {}
    const colors: Record<string, string> = { AWS: '#f59e0b', GCP: '#3b82f6', Azure: '#8b5cf6' }
    return Object.entries(by).map(([label, value]) => ({
      label,
      value,
      color: colors[label] ?? undefined,
    }))
  })

  statusChart = computed(() => {
    const by = (this.data()?.['byStatus'] as Record<string, number>) ?? {}
    const colors: Record<string, string> = {
      running: '#10b981',
      stopped: '#64748b',
      warning: '#f59e0b',
      error: '#ef4444',
      pending: '#0ea5e9',
    }
    return Object.entries(by).map(([label, value]) => ({
      label,
      value,
      color: colors[label] ?? '#3b82f6',
    }))
  })

  cpuTrend = (): { label: string; value: number }[] => {
    const mult = this.rangeMultiplier()
    return [
      { label: '00:00', value: Math.round(42 * mult) },
      { label: '04:00', value: Math.round(38 * mult) },
      { label: '08:00', value: Math.round(55 * mult) },
      { label: '12:00', value: Math.round(72 * mult) },
      { label: '16:00', value: Math.round(68 * mult) },
      { label: '20:00', value: Math.round(48 * mult) },
    ]
  }

  ramTrend = (): { label: string; value: number }[] => {
    const mult = this.rangeMultiplier()
    return [
      { label: '00:00', value: Math.round(58 * mult) },
      { label: '04:00', value: Math.round(52 * mult) },
      { label: '08:00', value: Math.round(61 * mult) },
      { label: '12:00', value: Math.round(78 * mult) },
      { label: '16:00', value: Math.round(74 * mult) },
      { label: '20:00', value: Math.round(62 * mult) },
    ]
  }

  costChart = computed(() => {
    const by = (this.data()?.['byProvider'] as Record<string, number>) ?? {}
    const colors: Record<string, string> = { AWS: '#f59e0b', GCP: '#3b82f6', Azure: '#8b5cf6' }
    return Object.entries(by).map(([label, value]) => ({
      label,
      value: Math.round(value * 120 + 200),
      color: colors[label],
    }))
  })

  dockerMetrics = (): { label: string; value: string | number }[] => {
    const d = (this.data()?.['docker'] as Record<string, number>) ?? {}
    return [
      { label: 'Hosts', value: d['hosts'] ?? 0 },
      { label: 'Running', value: d['running'] ?? 0 },
      { label: 'Total', value: d['containers'] ?? 0 },
    ]
  }

  k8sMetrics = (): { label: string; value: string | number }[] => {
    const d = (this.data()?.['kubernetes'] as Record<string, number>) ?? {}
    return [
      { label: 'Clusters', value: d['clusters'] ?? 0 },
      { label: 'Pods', value: d['pods'] ?? 0 },
      { label: 'Errors', value: d['errors'] ?? 0 },
    ]
  }

  jenkinsMetrics = (): { label: string; value: string | number }[] => {
    const d = (this.data()?.['jenkins'] as Record<string, number>) ?? {}
    return [
      { label: 'Jobs', value: d['jobs'] ?? 0 },
      { label: 'Running', value: d['running'] ?? 0 },
      { label: 'Failed', value: d['failed'] ?? 0 },
    ]
  }

  tfMetrics = (): { label: string; value: string | number }[] => {
    const d = (this.data()?.['terraform'] as Record<string, number>) ?? {}
    return [
      { label: 'Runs', value: d['runs'] ?? 0 },
      { label: 'Applied', value: d['applied'] ?? d['success'] ?? 0 },
      { label: 'Errors', value: d['errors'] ?? 0 },
    ]
  }

  dockerLabel = (): string => {
    const d = (this.data()?.['docker'] as Record<string, number>) ?? {}
    return `${d['hosts'] ?? 0} hosts · ${d['running'] ?? 0}/${d['containers'] ?? 0} containers running`
  }

  k8sLabel = (): string => {
    const d = (this.data()?.['kubernetes'] as Record<string, number>) ?? {}
    return `${d['clusters'] ?? 0} clusters · ${d['pods'] ?? 0} pods · ${d['errors'] ?? 0} pod errors`
  }

  jenkinsLabel = (): string => {
    const d = (this.data()?.['jenkins'] as Record<string, number>) ?? {}
    return `${d['jobs'] ?? 0} jobs · ${d['running'] ?? 0} running · ${d['failed'] ?? 0} failed builds`
  }

  tfLabel = (): string => {
    const d = (this.data()?.['terraform'] as Record<string, number>) ?? {}
    return `${d['runs'] ?? 0} runs · ${d['errors'] ?? 0} errors · IaC workspaces`
  }

  recentAlerts = (): Record<string, unknown>[] =>
    (this.data()?.['recentAlerts'] as Record<string, unknown>[]) ?? []

  recentActivity = (): Record<string, unknown>[] =>
    (this.data()?.['recentActivity'] as Record<string, unknown>[]) ?? []

  notificationRows = (): NotificationRow[] =>
    ((this.data()?.['notifications'] as NotificationRow[]) ?? []).map((n) => ({
      ...n,
      severity: n.severity ?? 'INFO',
    }))

  formatSpend = (value?: number): string => {
    if (value === undefined || value === null) return '$0'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  }

  private rangeMultiplier = (): number => {
    const map: Record<TimeRange, number> = { '1h': 0.85, '24h': 1, '7d': 1.08, '30d': 1.15 }
    return map[this.timeRange()] ?? 1
  }
}
