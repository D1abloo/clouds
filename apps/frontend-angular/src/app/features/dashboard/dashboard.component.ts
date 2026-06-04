import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { DashboardHeaderComponent } from './components/dashboard-header.component'
import {
  MetricStatsGridComponent,
  type MetricStatItem,
} from '../../shared/components/metric-stats-grid/metric-stats-grid.component'
import { DashboardSectionComponent } from './components/dashboard-section.component'
import { AlertsTableComponent } from './components/alerts-table.component'
import { ActivityTimelineComponent } from './components/activity-timeline.component'
import { NotificationsPanelComponent, NotificationRow } from './components/notifications-panel.component'
import { ChartCardComponent } from '../../shared/ui/chart-card.component'
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
import { finalize, catchError, of } from 'rxjs'
import { buildDemoDashboard } from './utils/dashboard-demo.util'
import { PlatformSummaryCardComponent } from './components/platform-summary-card.component'

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    MetricStatsGridComponent,
    DashboardSectionComponent,
    AlertsTableComponent,
    ActivityTimelineComponent,
    NotificationsPanelComponent,
    ChartCardComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    InstanceOverviewTableComponent,
    InstanceDetailDrawerComponent,
    ProviderSummaryPanelComponent,
    PlatformDetailPanelComponent,
    PlatformSummaryCardComponent,
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
          <div class="app-section-panel">
            <div class="metric-stats-grid dashboard-skeleton__grid">
              @for (i of [1,2,3,4,5,6,7,8,9,10,11,12]; track i) {
                <div class="metric-stat metric-stat--skeleton">
                  <span class="skeleton-shimmer metric-stat__icon-sk"></span>
                  <span class="skeleton-shimmer" style="height:10px;width:70%"></span>
                  <span class="skeleton-shimmer" style="height:22px;width:45%"></span>
                  <span class="skeleton-shimmer" style="height:8px;width:55%"></span>
                </div>
              }
            </div>
          </div>
          <app-loading-state message="Cargando métricas del tablero…" />
        </div>
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="loadData()" />
      } @else {
        <app-dashboard-section title="Resumen de infraestructura" subtitle="Vista en tiempo real de todas las plataformas" icon="insights">
          <div class="app-section-panel">
            <app-metric-stats-grid [items]="infraMetrics()" />
          </div>
        </app-dashboard-section>

        <app-dashboard-section [title]="'Analítica'" [subtitle]="'Gráficos y tendencias · ' + timeRangeLabel()" icon="analytics">
          <div class="charts-grid charts-grid--wide">
            <app-chart-card title="Instancias por proveedor" subtitle="Distribución entre clouds" chartIcon="bar_chart" kind="bar" [data]="providerChart()" [delay]="0" />
            <app-chart-card title="Instancias por estado" subtitle="Salud operativa" chartIcon="donut_large" kind="donut" [data]="statusChart()" [delay]="40" />
            <app-chart-card title="CPU media por proveedor" subtitle="Utilización CPU %" chartIcon="speed" kind="bar" [data]="cpuByProviderChart()" [delay]="80" />
            <app-chart-card title="RAM media por proveedor" subtitle="Utilización memoria %" chartIcon="memory" kind="bar" [data]="ramByProviderChart()" [delay]="120" />
            <app-chart-card title="Coste por proveedor" subtitle="Gasto mensual estimado" chartIcon="payments" accent="green" kind="bar" [data]="costChart()" [delay]="160" />
            <app-chart-card title="Coste por cuenta" subtitle="Principales cuentas de facturación" chartIcon="account_balance" kind="bar" [data]="costByAccountChart()" [delay]="200" />
            <app-chart-card title="Alertas por severidad" subtitle="Incidentes abiertos" chartIcon="warning" accent="amber" kind="donut" [data]="alertsSeverityChart()" [delay]="240" />
            <app-chart-card title="Tendencia CPU / RAM" [subtitle]="'Media del clúster · ' + timeRangeLabel()" chartIcon="show_chart" kind="line" [data]="cpuTrend()" [secondaryData]="ramTrend()" [delay]="280" />
            <app-chart-card title="Contenedores Docker" subtitle="En ejecución vs detenidos" chartIcon="view_in_ar" accent="cyan" kind="donut" [data]="dockerStatusChart()" [delay]="320" />
            <app-chart-card title="Pods Kubernetes" subtitle="Estado de los pods" chartIcon="hub" accent="cyan" kind="donut" [data]="k8sStatusChart()" [delay]="360" />
            <app-chart-card title="Builds Jenkins" subtitle="Resultado de builds" chartIcon="build" accent="amber" kind="bar" [data]="jenkinsChart()" [delay]="400" />
            <app-chart-card title="Ejecuciones Terraform" subtitle="Estado de IaC" chartIcon="account_tree" accent="violet" kind="bar" [data]="terraformChart()" [delay]="440" />
          </div>
        </app-dashboard-section>

        <app-dashboard-section title="Vista de instancias" subtitle="Inventario completo con filtros, ordenación y acciones" icon="dns">
          <app-instance-overview-table
            [rows]="instanceList()"
            (select)="openDrawer($event)"
          />
        </app-dashboard-section>

        <app-dashboard-section title="Proveedores cloud" subtitle="Resumen AWS, GCP, Azure y flota VPS" icon="cloud">
          <div class="provider-grid">
            <app-provider-summary-panel
              title="AWS"
              subtitle="Instancias EC2, cuentas y regiones"
              icon="cloud"
              tone="aws"
              route="/cloud/aws/overview"
              [metrics]="awsMetrics()"
              [extraLines]="awsLines()"
            />
            <app-provider-summary-panel
              title="GCP"
              subtitle="Proyectos y zonas de Compute Engine"
              icon="cloud_circle"
              tone="gcp"
              route="/cloud/gcp/overview"
              [metrics]="gcpMetrics()"
              [extraLines]="gcpLines()"
            />
            <app-provider-summary-panel
              title="Azure"
              subtitle="Máquinas virtuales y suscripciones"
              icon="cloud_queue"
              tone="azure"
              route="/cloud/azure/overview"
              [metrics]="azureMetrics()"
              [extraLines]="azureLines()"
            />
            <app-provider-summary-panel
              title="VPS / Bare Metal"
              subtitle="Hosts gestionados por SSH y edge"
              icon="dns"
              tone="vps"
              route="/vps"
              [metrics]="vpsMetrics()"
              [extraLines]="vpsLines()"
            />
          </div>
        </app-dashboard-section>

        <app-dashboard-section title="Stacks de plataforma" subtitle="Docker, Kubernetes, Jenkins y Terraform" icon="hub">
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
            <app-platform-detail-panel
              title="GitHub"
              [subtitle]="githubLabel()"
              icon="code"
              tone="github"
              route="/repositories/github"
              [metrics]="githubPanelMetrics()"
              [details]="githubDetails()"
            />
          </div>
        </app-dashboard-section>

        <app-dashboard-section title="Salud global" subtitle="Puntuación global, SLA y servicios críticos" icon="favorite">
          <div class="health-grid">
            <app-platform-summary-card
              title="Centro de salud"
              summary="Puntuación global, SLA y comprobaciones"
              icon="favorite"
              tone="default"
              route="/health-center"
              [metrics]="healthMetrics()"
              [delay]="0"
            />
            <app-platform-summary-card
              title="Centro de mando"
              summary="Cola operativa y acciones rápidas"
              icon="bolt"
              tone="jenkins"
              route="/command-center"
              [metrics]="commandMetrics()"
              [delay]="40"
            />
            <app-platform-summary-card
              title="Facturación"
              summary="Gasto, previsión y variación"
              icon="payments"
              tone="terraform"
              route="/billing/overview"
              [metrics]="billingMetrics()"
              [delay]="80"
            />
            <app-platform-summary-card
              title="Alertas"
              summary="Incidentes abiertos y severidad"
              icon="notifications_active"
              tone="docker"
              route="/alerts/active"
              [metrics]="alertsMetrics()"
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

      <app-instance-detail-drawer
        [open]="drawerOpen()"
        [instance]="selectedInstance()"
        (close)="closeDrawer()"
      />
    </div>
  `,
  styles: `
    .dashboard-page { width: 100%; min-width: 0; }
    .dashboard-skeleton__grid .metric-stat--skeleton {
      pointer-events: none;
      min-height: 108px;
    }
    .metric-stat__icon-sk {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: block;
    }
    .dashboard-skeleton__grid .skeleton-shimmer,
    .dashboard-skeleton .skeleton-shimmer {
      border-radius: 8px;
      min-height: 12px;
      display: block;
      background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--app-text-muted) 8%, transparent) 25%,
        color-mix(in srgb, var(--app-text-muted) 14%, transparent) 50%,
        color-mix(in srgb, var(--app-text-muted) 8%, transparent) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.1rem;
    }
    .charts-grid--wide { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .provider-grid, .platform-grid, .health-grid {
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
    @media (max-width: 768px) {
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
  githubN = (key: string): number => invNum(this.data()?.github as Record<string, unknown>, key)

  instanceList = (): DashboardInstanceRow[] => this.data()?.instanceList ?? []

  lastSyncLabel = (): string =>
    this.lastSyncAt().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  syncShort = (): string =>
    `Actualizado ${this.lastSyncAt().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`

  timeRangeLabel = (): string => {
    const map: Record<TimeRange, string> = { '1h': '1 h', '24h': '24 h', '7d': '7 días', '30d': '30 días' }
    return map[this.timeRange()]
  }

  readonly infraMetrics = computed((): MetricStatItem[] => {
    this.data()
    const stopped = this.n('stoppedInstances')
    const failed = this.jenkinsN('failed')
    return [
      { label: 'Instancias totales', value: this.n('totalInstances'), icon: 'dns', subtitle: this.syncShort(), tone: 'primary' },
      {
        label: 'En ejecución',
        value: this.n('runningInstances'),
        icon: 'play_circle',
        tone: 'success',
        subtitle: stopped === 1 ? '1 detenida' : `${stopped} detenidas`,
      },
      { label: 'Detenidas', value: stopped, icon: 'stop_circle', tone: 'default' },
      { label: 'Advertencias', value: this.n('warningInstances'), icon: 'warning_amber', tone: 'warning' },
      { label: 'Errores', value: this.n('errorInstances'), icon: 'error_outline', tone: 'danger' },
      {
        label: 'VPS activas',
        value: this.n('vpsConnected'),
        icon: 'computer',
        tone: 'info',
        subtitle: `${this.n('vpsDisconnected')} desconectadas`,
      },
      { label: 'Hosts Docker', value: this.dockerN('hosts'), icon: 'view_in_ar', logo: 'docker', tone: 'cyan' },
      { label: 'Clústeres Kubernetes', value: this.k8sN('clusters'), icon: 'hub', logo: 'kubernetes', tone: 'info' },
      {
        label: 'Builds Jenkins',
        value: this.jenkinsN('running'),
        icon: 'build',
        logo: 'jenkins',
        tone: 'warning',
        subtitle: failed === 1 ? '1 fallido' : `${failed} fallidos`,
      },
      {
        label: 'Ejecuciones Terraform',
        value: this.tfN('runs'),
        icon: 'account_tree',
        logo: 'terraform',
        tone: 'purple',
        subtitle: `${this.tfN('errors')} errores`,
      },
      {
        label: 'Coste mensual',
        value: this.formatSpend(this.n('monthlySpend')),
        icon: 'payments',
        tone: 'success',
        trend: '−4%',
        trendDown: true,
      },
      {
        label: 'Alertas abiertas',
        value: this.n('alertsOpen'),
        icon: 'notifications_active',
        tone: 'danger',
        badge: 'Activas',
      },
      {
        label: 'Repos GitHub',
        value: this.githubN('repoCount'),
        icon: 'folder',
        logo: 'github',
        tone: 'default',
        subtitle: `${this.githubN('openPullRequests')} PR abiertos`,
      },
    ]
  })

  loadData = (): void => {
    this.page.run(this.inventory.dashboard(), {
      onSuccess: (d) => {
        this.data.set(d)
        this.lastSyncAt.set(new Date())
      },
      errorMessage: 'No se pudo cargar el tablero',
      fallback: buildDemoDashboard,
    })
  }

  handleRefresh = (): void => {
    this.refreshing.set(true)
    this.inventory
      .dashboard()
      .pipe(
        catchError(() => of(buildDemoDashboard())),
        finalize(() => this.refreshing.set(false)),
      )
      .subscribe({
        next: (d) => {
          this.data.set(d)
          this.lastSyncAt.set(new Date())
          this.page.error.set(null)
          this.demoActions.simulate('Dashboard refresh', 300).subscribe()
        },
      })
  }

  handleExport = (): void => {
    this.demoActions.simulate('Report export', 800, 'Report exported (demo CSV)').subscribe()
  }
  handleRangeChange = (range: TimeRange): void => { this.timeRange.set(range); this.demoActions.simulate(`Range ${range}`, 200).subscribe() }

  openDrawer = (row: DashboardInstanceRow): void => { this.selectedInstance.set(row); this.drawerOpen.set(true) }
  closeDrawer = (): void => { this.drawerOpen.set(false) }

  providerChart = computed(() => this.mapChart(this.data()?.byProvider, { AWS: '#f59e0b', GCP: '#3b82f6', AZURE: '#8b5cf6', VPS: '#10b981' }))
  statusChart = computed(() =>
    this.mapChart(this.data()?.byStatus, {
      running: '#10b981',
      stopped: '#64748b',
      warning: '#f59e0b',
      error: '#ef4444',
      pending: '#0ea5e9',
    }, {
      running: 'En ejecución',
      stopped: 'Detenidas',
      warning: 'Advertencias',
      error: 'Errores',
      pending: 'Pendientes',
    }),
  )
  cpuByProviderChart = computed(() => this.mapChart(this.data()?.cpuByProvider))
  ramByProviderChart = computed(() => this.mapChart(this.data()?.ramByProvider))
  costChart = computed(() => {
    const by = this.data()?.byProvider ?? {}
    const colors: Record<string, string> = { AWS: '#f59e0b', GCP: '#3b82f6', AZURE: '#8b5cf6', VPS: '#10b981' }
    return Object.entries(by).map(([label, value]) => ({ label, value: Math.round(Number(value) * 120 + 200), color: colors[label] }))
  })
  costByAccountChart = computed(() => (this.data()?.costByAccount ?? []).map((c) => ({ label: c.label, value: c.value })))
  alertsSeverityChart = computed(() =>
    this.mapChart(
      this.data()?.alertsBySeverity,
      { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#3b82f6' },
      { CRITICAL: 'Críticas', WARNING: 'Advertencias', INFO: 'Info' },
    ),
  )

  cpuTrend = (): { label: string; value: number }[] => {
    const m = this.rangeMult()
    return ['00:00','04:00','08:00','12:00','16:00','20:00'].map((label, i) => ({ label, value: Math.round([42,38,55,72,68,48][i] * m) }))
  }
  ramTrend = (): { label: string; value: number }[] => {
    const m = this.rangeMult()
    return ['00:00','04:00','08:00','12:00','16:00','20:00'].map((label, i) => ({ label, value: Math.round([58,52,61,78,74,62][i] * m) }))
  }

  dockerStatusChart = (): { label: string; value: number; color?: string }[] => [
    { label: 'En ejecución', value: this.dockerN('running'), color: '#10b981' },
    { label: 'Detenidos', value: this.dockerN('stopped'), color: '#64748b' },
  ]
  k8sStatusChart = (): { label: string; value: number; color?: string }[] => {
    const pods = this.k8sN('pods')
    const err = this.k8sN('errors')
    return [
      { label: 'Saludables', value: Math.max(pods - err, 0), color: '#10b981' },
      { label: 'Errores', value: err, color: '#ef4444' },
    ]
  }
  jenkinsChart = (): { label: string; value: number; color?: string }[] => [
    { label: 'En curso', value: this.jenkinsN('running'), color: '#3b82f6' },
    { label: 'Correctos', value: this.jenkinsN('success'), color: '#10b981' },
    { label: 'Fallidos', value: this.jenkinsN('failed'), color: '#ef4444' },
  ]
  terraformChart = (): { label: string; value: number; color?: string }[] => [
    { label: 'Planes', value: this.tfN('plans'), color: '#3b82f6' },
    { label: 'Applies', value: this.tfN('applies'), color: '#10b981' },
    { label: 'Errores', value: this.tfN('errors'), color: '#ef4444' },
  ]

  prov = (key: string): Record<string, unknown> => (this.data()?.providers?.[key] as Record<string, unknown>) ?? {}

  provNum = (key: string, field: string): number => Number(this.prov(key)[field] ?? 0)

  awsMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Cuentas', value: this.provNum('AWS', 'accounts') },
    { label: 'Instancias', value: this.provNum('AWS', 'instances') },
    { label: 'Regiones', value: this.provNum('AWS', 'regions') },
    { label: 'Coste/mes', value: this.formatSpend(this.provNum('AWS', 'monthlyCost')) },
    { label: 'Alertas', value: this.provNum('AWS', 'alerts') },
  ]
  gcpMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Proyectos', value: this.provNum('GCP', 'accounts') },
    { label: 'Instancias', value: this.provNum('GCP', 'instances') },
    { label: 'Zonas', value: this.provNum('GCP', 'regions') },
    { label: 'Coste/mes', value: this.formatSpend(this.provNum('GCP', 'monthlyCost')) },
    { label: 'Alertas', value: this.provNum('GCP', 'alerts') },
  ]
  azureMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Suscripciones', value: this.provNum('AZURE', 'accounts') },
    { label: 'VMs', value: this.provNum('AZURE', 'instances') },
    { label: 'Regiones', value: this.provNum('AZURE', 'regions') },
    { label: 'Coste/mes', value: this.formatSpend(this.provNum('AZURE', 'monthlyCost')) },
    { label: 'Alertas', value: this.provNum('AZURE', 'alerts') },
  ]
  vpsMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Total', value: this.provNum('VPS', 'instances') || this.n('vpsHosts') },
    { label: 'Conectados', value: this.provNum('VPS', 'connected') || this.n('vpsConnected') },
    { label: 'Docker', value: this.provNum('VPS', 'dockerDetected') },
    { label: 'K8s', value: this.provNum('VPS', 'k8sDetected') },
    { label: 'Alertas', value: this.provNum('VPS', 'alerts') },
  ]

  awsLines = (): string[] => [`Última sync: ${this.syncShort()}`, 'Última: aws-prod-app-1']
  gcpLines = (): string[] => [`Última sync: ${this.syncShort()}`, 'Última: gcp-analytics-1']
  azureLines = (): string[] => [`Última sync: ${this.syncShort()}`, 'Última: azure-db-1']
  vpsLines = (): string[] => [`${this.n('vpsDisconnected')} hosts desconectados`, 'Monitorización SSH activa']

  dockerLabel = (): string =>
    `${this.dockerN('hosts')} hosts · ${this.dockerN('running')}/${this.dockerN('containers')} en ejecución`
  k8sLabel = (): string =>
    `${this.k8sN('clusters')} clústeres · ${this.k8sN('pods')} pods · ${this.k8sN('errors')} errores`
  jenkinsLabel = (): string =>
    `${this.jenkinsN('jobs')} jobs · ${this.jenkinsN('running')} en curso · ${this.jenkinsN('failed')} fallidos`
  tfLabel = (): string =>
    `${this.tfN('runs')} ejecuciones · ${this.tfN('errors')} errores · ${this.tfN('workspaces')} workspaces`
  githubLabel = (): string => {
    const g = this.data()?.github as Record<string, unknown> | undefined
    const user = (g?.['username'] as string) ?? 'cloudops-demo'
    return `${user} · ${this.githubN('repoCount')} repos · org cloudops-lab`
  }

  dockerPanelMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Hosts', value: this.dockerN('hosts') },
    { label: 'En ejecución', value: this.dockerN('running') },
    { label: 'Detenidos', value: this.dockerN('stopped') },
    { label: 'Imágenes', value: this.dockerN('images') },
    { label: 'Volúmenes', value: this.dockerN('volumes') },
    { label: 'Redes', value: this.dockerN('networks') },
  ]
  k8sPanelMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Clústeres', value: this.k8sN('clusters') },
    { label: 'Nodos', value: this.k8sN('nodes') },
    { label: 'Namespaces', value: this.k8sN('namespaces') },
    { label: 'Pods', value: this.k8sN('pods') },
    { label: 'Deployments', value: this.k8sN('deployments') },
    { label: 'Servicios', value: this.k8sN('services') },
  ]
  jenkinsPanelMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Servidores', value: this.jenkinsN('servers') },
    { label: 'Jobs', value: this.jenkinsN('jobs') },
    { label: 'En curso', value: this.jenkinsN('running') },
    { label: 'Correctos', value: this.jenkinsN('success') },
    { label: 'Fallidos', value: this.jenkinsN('failed') },
  ]
  tfPanelMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Workspaces', value: this.tfN('workspaces') },
    { label: 'Ejecuciones', value: this.tfN('runs') },
    { label: 'Planes', value: this.tfN('plans') },
    { label: 'Applies', value: this.tfN('applies') },
    { label: 'Plantillas', value: this.tfN('templates') },
    { label: 'Errores', value: this.tfN('errors') },
  ]

  dockerDetails = (): string[] => ['nginx — en ejecución', 'api — en ejecución', 'redis — en ejecución']
  k8sDetails = (): string[] => ['default/app-0 — En ejecución', 'kube-system/coredns — En ejecución']
  jenkinsDetails = (): string[] => ['terraform-apply #4 — FALLO', 'deploy-prod #12 — ÉXITO']
  tfDetails = (): string[] => ['demo-aws-ec2 — APLICADO', 'demo-gcp-vm — PLANIFICADO']
  githubPanelMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Repositorios', value: this.githubN('repoCount') },
    { label: 'Ramas', value: this.githubN('branchCount') },
    { label: 'PR abiertos', value: this.githubN('openPullRequests') },
    { label: 'Webhooks', value: this.githubN('webhookCount') },
    { label: 'Despliegues', value: this.githubN('deploymentCount') },
    { label: 'Estado', value: 'Conectada' },
  ]
  githubDetails = (): string[] => [
    'cloudops-org/cloudops-api',
    'cloudops-org/cloudops-ui',
    'Modo demo — sin token real',
  ]

  recentAlerts = (): Record<string, unknown>[] => (this.data()?.recentAlerts as Record<string, unknown>[]) ?? []
  recentActivity = (): Record<string, unknown>[] => (this.data()?.recentActivity as Record<string, unknown>[]) ?? []
  notificationRows = (): NotificationRow[] =>
    ((this.data()?.notifications ?? []) as unknown as NotificationRow[]).map((n) => ({
      ...n,
      severity: n.severity ?? 'INFO',
    }))

  healthMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Puntuación', value: '94%' },
    { label: 'Servicios', value: 18 },
    { label: 'Degradados', value: 2 },
    { label: 'SLA', value: '99,2%' },
  ]
  commandMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Cola', value: 3 },
    { label: 'Pendientes', value: 5 },
    { label: 'En curso', value: 2 },
    { label: 'Completadas', value: 48 },
  ]
  billingMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Mensual', value: this.formatSpend(this.n('monthlySpend')) },
    { label: 'Previsión', value: this.formatSpend(Math.round(this.n('monthlySpend') * 1.06)) },
    { label: 'Variación', value: '−4%' },
    { label: 'Proveedores', value: 4 },
  ]
  alertsMetrics = (): { label: string; value: string | number }[] => [
    { label: 'Abiertas', value: this.n('alertsOpen') },
    { label: 'Críticas', value: 3 },
    { label: 'Advertencias', value: 4 },
    { label: 'Info', value: 2 },
  ]

  formatSpend = (value?: number): string => {
    if (value === undefined || value === null) return '$0'
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  }

  private rangeMult = (): number => ({ '1h': 0.85, '24h': 1, '7d': 1.08, '30d': 1.15 })[this.timeRange()] ?? 1

  private mapChart = (
    src?: Record<string, number>,
    colors?: Record<string, string>,
    labels?: Record<string, string>,
  ) =>
    Object.entries(src ?? {}).map(([key, value]) => ({
      label: labels?.[key] ?? key,
      value: Number(value),
      color: colors?.[key],
    }))
}
