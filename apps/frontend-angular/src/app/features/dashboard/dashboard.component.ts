import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { DashboardHeaderComponent } from './components/dashboard-header.component'
import { StatCardComponent } from './components/stat-card.component'
import { DashboardSectionComponent } from './components/dashboard-section.component'
import { AlertsTableComponent } from './components/alerts-table.component'
import { ActivityTimelineComponent } from './components/activity-timeline.component'
import { NotificationsPanelComponent, NotificationRow } from './components/notifications-panel.component'
import { ChartCardComponent } from '../../shared/ui/chart-card.component'
import { SkeletonCardComponent } from '../../shared/ui/skeleton-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { InstanceOverviewTableComponent } from './components/instance-overview-table.component'
import { InstanceDetailDrawerComponent } from './components/instance-detail-drawer.component'
import { ProviderSummaryPanelComponent } from './components/provider-summary-panel.component'
import { PlatformDetailPanelComponent } from './components/platform-detail-panel.component'
import { InventoryService } from '../../core/services/inventory.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { DemoService } from '../../core/services/demo.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { invNum } from '../../core/utils/inventory.util'
import { TimeRange } from './components/time-range-selector.component'
import { DashboardData, DashboardInstanceRow } from './dashboard.models'
import { finalize } from 'rxjs'

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    StatCardComponent,
    DashboardSectionComponent,
    AlertsTableComponent,
    ActivityTimelineComponent,
    NotificationsPanelComponent,
    ChartCardComponent,
    SkeletonCardComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    InstanceOverviewTableComponent,
    InstanceDetailDrawerComponent,
    ProviderSummaryPanelComponent,
    PlatformDetailPanelComponent,
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
            @for (i of [1,2,3,4,5,6,7,8,9,10,11,12]; track i) {
              <app-skeleton-card />
            }
          </div>
          <app-loading-state message="Loading dashboard metrics…" />
        </div>
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="loadData()" />
      } @else {
        <app-dashboard-section title="Infrastructure summary" subtitle="Real-time overview across all platforms" icon="insights">
          <div class="stats-grid">
            <app-stat-card title="Total instances" [value]="n('totalInstances')" icon="dns" [updated]="syncShort()" [delay]="0" />
            <app-stat-card title="Running" [value]="n('runningInstances')" icon="play_circle" tone="success" [subtitle]="stoppedLabel()" [delay]="30" />
            <app-stat-card title="Stopped" [value]="n('stoppedInstances')" icon="stop_circle" tone="default" [delay]="60" />
            <app-stat-card title="Warning" [value]="n('warningInstances')" icon="warning_amber" tone="warning" [delay]="90" />
            <app-stat-card title="Error" [value]="n('errorInstances')" icon="error_outline" tone="danger" [delay]="120" />
            <app-stat-card title="VPS active" [value]="n('vpsConnected')" [subtitle]="vpsDiscLabel()" icon="storage" [delay]="150" />
            <app-stat-card title="Docker hosts" [value]="dockerN('hosts')" icon="view_in_ar" tone="info" [delay]="180" />
            <app-stat-card title="K8s clusters" [value]="k8sN('clusters')" icon="hub" [delay]="210" />
            <app-stat-card title="Jenkins builds" [value]="jenkinsN('running')" [subtitle]="jenkinsSub()" icon="build" tone="warning" [delay]="240" />
            <app-stat-card title="Terraform runs" [value]="tfN('runs')" [subtitle]="tfSub()" icon="architecture" [delay]="270" />
            <app-stat-card title="Monthly spend" [value]="formatSpend(n('monthlySpend'))" icon="payments" tone="info" trend="−4%" [trendDown]="true" [delay]="300" />
            <app-stat-card title="Open alerts" [value]="n('alertsOpen')" icon="notifications_active" tone="danger" badge="Active" [delay]="330" />
          </div>
        </app-dashboard-section>

        <app-dashboard-section title="Analytics" [subtitle]="'Charts and trends · ' + timeRange()" icon="analytics">
          <div class="charts-grid charts-grid--wide">
            <app-chart-card title="Instances by provider" subtitle="Distribution across cloud providers" kind="bar" [data]="providerChart()" [delay]="0" />
            <app-chart-card title="Instances by status" subtitle="Operational health breakdown" kind="donut" [data]="statusChart()" [delay]="40" />
            <app-chart-card title="CPU avg by provider" subtitle="Average CPU utilization %" kind="bar" [data]="cpuByProviderChart()" [delay]="80" />
            <app-chart-card title="RAM avg by provider" subtitle="Average memory utilization %" kind="bar" [data]="ramByProviderChart()" [delay]="120" />
            <app-chart-card title="Cost by provider" subtitle="Estimated monthly spend" kind="bar" [data]="costChart()" [delay]="160" />
            <app-chart-card title="Cost by account" subtitle="Top billing accounts" kind="bar" [data]="costByAccountChart()" [delay]="200" />
            <app-chart-card title="Alerts by severity" subtitle="Open incidents breakdown" kind="donut" [data]="alertsSeverityChart()" [delay]="240" />
            <app-chart-card title="CPU / RAM trend" [subtitle]="'Cluster avg · ' + timeRange()" kind="line" [data]="cpuTrend()" [secondaryData]="ramTrend()" [delay]="280" />
            <app-chart-card title="Docker containers" subtitle="Running vs stopped" kind="donut" [data]="dockerStatusChart()" [delay]="320" />
            <app-chart-card title="Kubernetes pods" subtitle="Pod health overview" kind="donut" [data]="k8sStatusChart()" [delay]="360" />
            <app-chart-card title="Jenkins builds" subtitle="Build outcomes" kind="bar" [data]="jenkinsChart()" [delay]="400" />
            <app-chart-card title="Terraform runs" subtitle="IaC execution status" kind="bar" [data]="terraformChart()" [delay]="440" />
          </div>
        </app-dashboard-section>

        <app-dashboard-section title="Instance Overview" subtitle="Complete inventory with filters, sorting and actions" icon="dns">
          <app-instance-overview-table
            [rows]="instanceList()"
            (select)="openDrawer($event)"
          />
        </app-dashboard-section>

        <app-dashboard-section title="Cloud providers" subtitle="AWS, GCP, Azure and VPS fleet summary" icon="cloud">
          <div class="provider-grid">
            <app-provider-summary-panel
              title="AWS"
              subtitle="EC2 instances, accounts and regions"
              icon="cloud"
              tone="aws"
              route="/accounts/aws"
              [metrics]="awsMetrics()"
              [extraLines]="awsLines()"
            />
            <app-provider-summary-panel
              title="GCP"
              subtitle="Compute Engine projects and zones"
              icon="cloud_circle"
              tone="gcp"
              route="/accounts/gcp"
              [metrics]="gcpMetrics()"
              [extraLines]="gcpLines()"
            />
            <app-provider-summary-panel
              title="Azure"
              subtitle="Virtual machines and subscriptions"
              icon="cloud_queue"
              tone="azure"
              route="/accounts/azure"
              [metrics]="azureMetrics()"
              [extraLines]="azureLines()"
            />
            <app-provider-summary-panel
              title="VPS / Bare Metal"
              subtitle="SSH-managed hosts and edge servers"
              icon="dns"
              tone="vps"
              route="/vps"
              [metrics]="vpsMetrics()"
              [extraLines]="vpsLines()"
            />
          </div>
        </app-dashboard-section>

        <app-dashboard-section title="Platform stacks" subtitle="Docker, Kubernetes, Jenkins and Terraform" icon="hub">
          <div class="platform-grid">
            <app-platform-detail-panel
              title="Docker"
              [subtitle]="dockerLabel()"
              icon="view_in_ar"
              tone="docker"
              route="/docker"
              [metrics]="dockerPanelMetrics()"
              [details]="dockerDetails()"
            />
            <app-platform-detail-panel
              title="Kubernetes"
              [subtitle]="k8sLabel()"
              icon="hub"
              tone="k8s"
              route="/kubernetes"
              [metrics]="k8sPanelMetrics()"
              [details]="k8sDetails()"
            />
            <app-platform-detail-panel
              title="Jenkins"
              [subtitle]="jenkinsLabel()"
              icon="build"
              tone="jenkins"
              route="/jenkins"
              [metrics]="jenkinsPanelMetrics()"
              [details]="jenkinsDetails()"
            />
            <app-platform-detail-panel
              title="Terraform"
              [subtitle]="tfLabel()"
              icon="architecture"
              tone="terraform"
              route="/terraform"
              [metrics]="tfPanelMetrics()"
              [details]="tfDetails()"
            />
          </div>
        </app-dashboard-section>

        <div class="panels-grid">
          <app-alerts-table [rows]="recentAlerts()" />
          <app-activity-timeline [events]="recentActivity()" />
          <app-notifications-panel [items]="notificationRows()" />
        </div>
      }

      <app-instance-detail-drawer
        [open]="drawerOpen()"
        [instance]="selectedInstance()"
        (close)="closeDrawer()"
      />
    </div>
  `,
  styles: `
    .dashboard-page { width: 100%; min-width: 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.1rem;
    }
    .charts-grid--wide { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .provider-grid, .platform-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.1rem;
    }
    .panels-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.15rem;
      margin-bottom: 2rem;
    }
    .dashboard-skeleton .stats-grid { margin-bottom: 1.25rem; }
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
      .panels-grid { grid-template-columns: 1fr; }
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
  readonly drawerOpen = signal(false)
  readonly selectedInstance = signal<DashboardInstanceRow | null>(null)

  ngOnInit(): void {
    this.realtime.connect()
    this.realtime.on('inventory.updated', () => this.loadData())
    this.realtime.on('dashboard.updated', () => this.loadData())
    this.loadData()
  }

  n = (key: string): number => invNum(this.data() as Record<string, unknown> | null, key)
  dockerN = (key: string): number => invNum(this.data()?.docker as Record<string, unknown>, key)
  k8sN = (key: string): number => invNum(this.data()?.kubernetes as Record<string, unknown>, key)
  jenkinsN = (key: string): number => invNum(this.data()?.jenkins as Record<string, unknown>, key)
  tfN = (key: string): number => invNum(this.data()?.terraform as Record<string, unknown>, key)

  instanceList = (): DashboardInstanceRow[] => this.data()?.instanceList ?? []

  lastSyncLabel = (): string => this.lastSyncAt().toLocaleTimeString()
  syncShort = (): string => `Updated ${this.lastSyncAt().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

  loadData = (): void => {
    this.page.run(this.inventory.dashboard(), {
      onSuccess: (d) => {
        this.data.set(d)
        this.lastSyncAt.set(new Date())
      },
      errorMessage: 'Could not load dashboard',
    })
  }

  handleRefresh = (): void => {
    this.refreshing.set(true)
    this.inventory.dashboard().pipe(finalize(() => this.refreshing.set(false))).subscribe({
      next: (d) => { this.data.set(d); this.lastSyncAt.set(new Date()); this.demoActions.simulate('Dashboard refresh', 300).subscribe() },
      error: () => this.page.error.set('Refresh failed'),
    })
  }

  handleExport = (): void => {
    this.demoActions.simulate('Report export', 800, 'Report exported (demo CSV)').subscribe()
  }
  handleRangeChange = (range: TimeRange): void => { this.timeRange.set(range); this.demoActions.simulate(`Range ${range}`, 200).subscribe() }

  openDrawer = (row: DashboardInstanceRow): void => { this.selectedInstance.set(row); this.drawerOpen.set(true) }
  closeDrawer = (): void => { this.drawerOpen.set(false) }

  stoppedLabel = (): string => `${this.n('stoppedInstances')} stopped`
  vpsDiscLabel = (): string => `${this.n('vpsDisconnected')} disconnected`
  jenkinsSub = (): string => `${this.jenkinsN('failed')} failed`
  tfSub = (): string => `${this.tfN('errors')} errors`

  providerChart = computed(() => this.mapChart(this.data()?.byProvider, { AWS: '#f59e0b', GCP: '#3b82f6', AZURE: '#8b5cf6', VPS: '#10b981' }))
  statusChart = computed(() => this.mapChart(this.data()?.byStatus, { running: '#10b981', stopped: '#64748b', warning: '#f59e0b', error: '#ef4444', pending: '#0ea5e9' }))
  cpuByProviderChart = computed(() => this.mapChart(this.data()?.cpuByProvider))
  ramByProviderChart = computed(() => this.mapChart(this.data()?.ramByProvider))
  costChart = computed(() => {
    const by = this.data()?.byProvider ?? {}
    const colors: Record<string, string> = { AWS: '#f59e0b', GCP: '#3b82f6', AZURE: '#8b5cf6', VPS: '#10b981' }
    return Object.entries(by).map(([label, value]) => ({ label, value: Math.round(Number(value) * 120 + 200), color: colors[label] }))
  })
  costByAccountChart = computed(() => (this.data()?.costByAccount ?? []).map((c) => ({ label: c.label, value: c.value })))
  alertsSeverityChart = computed(() => this.mapChart(this.data()?.alertsBySeverity, { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#3b82f6' }))

  cpuTrend = (): { label: string; value: number }[] => {
    const m = this.rangeMult()
    return ['00:00','04:00','08:00','12:00','16:00','20:00'].map((label, i) => ({ label, value: Math.round([42,38,55,72,68,48][i] * m) }))
  }
  ramTrend = (): { label: string; value: number }[] => {
    const m = this.rangeMult()
    return ['00:00','04:00','08:00','12:00','16:00','20:00'].map((label, i) => ({ label, value: Math.round([58,52,61,78,74,62][i] * m) }))
  }

  dockerStatusChart = (): { label: string; value: number; color?: string }[] => [
    { label: 'Running', value: this.dockerN('running'), color: '#10b981' },
    { label: 'Stopped', value: this.dockerN('stopped'), color: '#64748b' },
  ]
  k8sStatusChart = (): { label: string; value: number; color?: string }[] => {
    const pods = this.k8sN('pods')
    const err = this.k8sN('errors')
    return [
      { label: 'Healthy', value: Math.max(pods - err, 0), color: '#10b981' },
      { label: 'Errors', value: err, color: '#ef4444' },
    ]
  }
  jenkinsChart = (): { label: string; value: number; color?: string }[] => [
    { label: 'Running', value: this.jenkinsN('running'), color: '#3b82f6' },
    { label: 'Success', value: this.jenkinsN('success'), color: '#10b981' },
    { label: 'Failed', value: this.jenkinsN('failed'), color: '#ef4444' },
  ]
  terraformChart = (): { label: string; value: number; color?: string }[] => [
    { label: 'Plans', value: this.tfN('plans'), color: '#3b82f6' },
    { label: 'Applies', value: this.tfN('applies'), color: '#10b981' },
    { label: 'Errors', value: this.tfN('errors'), color: '#ef4444' },
  ]

  prov = (key: string): Record<string, unknown> => (this.data()?.providers?.[key] as Record<string, unknown>) ?? {}

  provNum = (key: string, field: string): number => Number(this.prov(key)[field] ?? 0)

  awsMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Accounts', value: this.provNum('AWS', 'accounts') },
    { label: 'Instances', value: this.provNum('AWS', 'instances') },
    { label: 'Regions', value: this.provNum('AWS', 'regions') },
    { label: 'Cost/mo', value: this.formatSpend(this.provNum('AWS', 'monthlyCost')) },
    { label: 'Alerts', value: this.provNum('AWS', 'alerts') },
  ]
  gcpMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Projects', value: this.provNum('GCP', 'accounts') },
    { label: 'Instances', value: this.provNum('GCP', 'instances') },
    { label: 'Zones', value: this.provNum('GCP', 'regions') },
    { label: 'Cost/mo', value: this.formatSpend(this.provNum('GCP', 'monthlyCost')) },
    { label: 'Alerts', value: this.provNum('GCP', 'alerts') },
  ]
  azureMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Subscriptions', value: this.provNum('AZURE', 'accounts') },
    { label: 'VMs', value: this.provNum('AZURE', 'instances') },
    { label: 'Regions', value: this.provNum('AZURE', 'regions') },
    { label: 'Cost/mo', value: this.formatSpend(this.provNum('AZURE', 'monthlyCost')) },
    { label: 'Alerts', value: this.provNum('AZURE', 'alerts') },
  ]
  vpsMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Total', value: this.provNum('VPS', 'instances') || this.n('vpsHosts') },
    { label: 'Connected', value: this.provNum('VPS', 'connected') || this.n('vpsConnected') },
    { label: 'Docker', value: this.provNum('VPS', 'dockerDetected') },
    { label: 'K8s', value: this.provNum('VPS', 'k8sDetected') },
    { label: 'Alerts', value: this.provNum('VPS', 'alerts') },
  ]

  awsLines = (): string[] => [`Last sync: ${this.syncShort()}`, 'Latest: aws-prod-app-1']
  gcpLines = (): string[] => [`Last sync: ${this.syncShort()}`, 'Latest: gcp-analytics-1']
  azureLines = (): string[] => [`Last sync: ${this.syncShort()}`, 'Latest: azure-db-1']
  vpsLines = (): string[] => [`${this.n('vpsDisconnected')} hosts disconnected`, 'SSH monitoring active']

  dockerLabel = (): string => `${this.dockerN('hosts')} hosts · ${this.dockerN('running')}/${this.dockerN('containers')} running`
  k8sLabel = (): string => `${this.k8sN('clusters')} clusters · ${this.k8sN('pods')} pods · ${this.k8sN('errors')} errors`
  jenkinsLabel = (): string => `${this.jenkinsN('jobs')} jobs · ${this.jenkinsN('running')} running · ${this.jenkinsN('failed')} failed`
  tfLabel = (): string => `${this.tfN('runs')} runs · ${this.tfN('errors')} errors · ${this.tfN('workspaces')} workspaces`

  dockerPanelMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Hosts', value: this.dockerN('hosts') }, { label: 'Running', value: this.dockerN('running') },
    { label: 'Stopped', value: this.dockerN('stopped') }, { label: 'Images', value: this.dockerN('images') },
    { label: 'Volumes', value: this.dockerN('volumes') }, { label: 'Networks', value: this.dockerN('networks') },
  ]
  k8sPanelMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Clusters', value: this.k8sN('clusters') }, { label: 'Nodes', value: this.k8sN('nodes') },
    { label: 'Namespaces', value: this.k8sN('namespaces') }, { label: 'Pods', value: this.k8sN('pods') },
    { label: 'Deployments', value: this.k8sN('deployments') }, { label: 'Services', value: this.k8sN('services') },
  ]
  jenkinsPanelMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Servers', value: this.jenkinsN('servers') }, { label: 'Jobs', value: this.jenkinsN('jobs') },
    { label: 'Running', value: this.jenkinsN('running') }, { label: 'Success', value: this.jenkinsN('success') },
    { label: 'Failed', value: this.jenkinsN('failed') },
  ]
  tfPanelMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Workspaces', value: this.tfN('workspaces') }, { label: 'Runs', value: this.tfN('runs') },
    { label: 'Plans', value: this.tfN('plans') }, { label: 'Applies', value: this.tfN('applies') },
    { label: 'Templates', value: this.tfN('templates') }, { label: 'Errors', value: this.tfN('errors') },
  ]

  dockerDetails = (): string[] => ['nginx — running', 'api — running', 'redis — running']
  k8sDetails = (): string[] => ['default/app-0 — Running', 'kube-system/coredns — Running']
  jenkinsDetails = (): string[] => ['terraform-apply #4 — FAILURE', 'deploy-prod #12 — SUCCESS']
  tfDetails = (): string[] => ['demo-aws-ec2 — APPLIED', 'demo-gcp-vm — PLANNED']

  recentAlerts = (): Record<string, unknown>[] => (this.data()?.recentAlerts as Record<string, unknown>[]) ?? []
  recentActivity = (): Record<string, unknown>[] => (this.data()?.recentActivity as Record<string, unknown>[]) ?? []
  notificationRows = (): NotificationRow[] =>
    ((this.data()?.notifications ?? []) as unknown as NotificationRow[]).map((n) => ({
      ...n,
      severity: n.severity ?? 'INFO',
    }))

  formatSpend = (value?: number): string => {
    if (value === undefined || value === null) return '$0'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  }

  private rangeMult = (): number => ({ '1h': 0.85, '24h': 1, '7d': 1.08, '30d': 1.15 })[this.timeRange()] ?? 1

  private mapChart = (src?: Record<string, number>, colors?: Record<string, string>) =>
    Object.entries(src ?? {}).map(([label, value]) => ({ label, value: Number(value), color: colors?.[label] }))
}
