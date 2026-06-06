import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { DashboardHeaderComponent } from './components/dashboard-header.component'
import { DashboardKpiPremiumComponent, type DashboardKpiItem } from './components/dashboard-kpi-premium.component'
import { DashboardInsightsGridComponent } from './components/dashboard-insights-grid.component'
import { DashboardFleetTableComponent } from './components/dashboard-fleet-table.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { InstanceDetailDrawerComponent } from './components/instance-detail-drawer.component'
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
import { ApprovalsService } from '../approvals/approvals.service'

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    DashboardKpiPremiumComponent,
    DashboardInsightsGridComponent,
    DashboardFleetTableComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    InstanceDetailDrawerComponent,
  ],
  template: `
    <div class="dashboard-page">
      <div class="dashboard-body">
        @if (page.loading()) {
          <app-loading-state message="Cargando métricas del tablero…" />
        } @else if (page.error()) {
          <app-error-state [message]="page.error()!" (retry)="loadData()" />
        } @else {
          <section class="dashboard-kpis animate-fade-in" aria-label="Indicadores clave">
            <app-dashboard-kpi-premium [items]="kpiItems()" />
          </section>

          <app-dashboard-header
            [lastSync]="lastSyncLabel()"
            [demoMode]="demo.demoMode()"
            [refreshing]="refreshing()"
            [timeRange]="timeRange()"
            (refreshClick)="handleRefresh()"
            (exportClick)="handleExport()"
            (rangeChange)="handleRangeChange($event)"
          />

          <app-dashboard-insights-grid class="animate-fade-in" />

          <app-dashboard-fleet-table
            class="animate-fade-in"
            [rows]="instanceList()"
          />
        }
      </div>

      <app-instance-detail-drawer
        [open]="drawerOpen()"
        [instance]="selectedInstance()"
        (close)="closeDrawer()"
      />
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      width: 100%;
    }
    .dashboard-page {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      width: 100%;
      overflow: hidden;
    }
    .dashboard-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      padding-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .dashboard-kpis { flex-shrink: 0; }
    app-dashboard-insights-grid,
    app-dashboard-fleet-table { flex-shrink: 0; }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly inventory = inject(InventoryService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly realtime = inject(RealtimeService)
  private readonly approvalsSvc = inject(ApprovalsService)
  readonly demo = inject(DemoService)

  readonly pendingApprovals = this.approvalsSvc.pendingCount

  readonly page = createPageLoader(true)
  readonly data = signal<DashboardData | null>(null)
  readonly refreshing = signal(false)
  readonly timeRange = signal<TimeRange>('24h')
  readonly lastSyncAt = signal(new Date())
  readonly drawerOpen = signal(false)
  readonly selectedInstance = signal<DashboardInstanceRow | null>(null)

  readonly kpiItems = computed((): DashboardKpiItem[] => {
    this.data()
    this.pendingApprovals()
    return [
      {
        label: 'Instancias',
        value: 126,
        subtitle: '32 en ejecución',
        icon: 'dns',
        tone: 'blue',
        trend: '18% vs ayer',
        trendUp: true,
        sparkline: [18, 22, 24, 28, 30, 32, 32],
      },
      {
        label: 'Gasto mensual',
        value: this.formatSpend(this.n('monthlySpend') || 4820),
        subtitle: `Proyectado ${this.forecastSpend()}`,
        icon: 'payments',
        tone: 'green',
        trend: '6% vs mes anterior',
        trendUp: false,
        sparkline: [5200, 5100, 5000, 4950, 4880, 4840, 4820],
      },
      {
        label: 'Alertas',
        value: this.n('alertsOpen') || 9,
        subtitle: `${this.criticalAlerts()} críticas`,
        icon: 'notifications_active',
        tone: 'orange',
        trend: '125% vs ayer',
        trendUp: true,
        sparkline: [2, 3, 4, 5, 6, 8, 9],
      },
      {
        label: 'Aprobaciones',
        value: this.pendingApprovals() || 6,
        subtitle: 'Pendientes de revisión',
        icon: 'verified',
        tone: 'violet',
        trend: '25% vs ayer',
        trendUp: false,
        sparkline: [8, 7, 7, 6, 6, 6, 6],
      },
      {
        label: 'SLA global',
        value: '94%',
        subtitle: '18 servicios monitorizados',
        icon: 'favorite',
        tone: 'purple',
        trend: '2% vs semana pasada',
        trendUp: false,
        progress: 94,
        sparkline: [96, 95, 95, 94, 94, 94, 94],
      },
      {
        label: 'CI/CD',
        value: this.jenkinsN('running') || 2,
        subtitle: 'Builds en curso',
        logo: 'jenkins',
        tone: 'cyan',
        trend: '1 vs ayer',
        trendUp: true,
        sparkline: [0, 1, 1, 2, 1, 2, 2],
      },
    ]
  })

  ngOnInit(): void {
    this.realtime.connect()
    this.realtime.on('inventory.updated', () => this.loadData())
    this.realtime.on('dashboard.updated', () => this.loadData())
    this.loadData()
  }

  n = (key: string): number => invNum(this.data() as Record<string, unknown> | null, key)
  jenkinsN = (key: string): number => invNum(this.data()?.jenkins as Record<string, unknown>, key)

  instanceList = (): DashboardInstanceRow[] => this.data()?.instanceList ?? []

  lastSyncLabel = (): string =>
    this.lastSyncAt().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

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

  handleRangeChange = (range: TimeRange): void => {
    this.timeRange.set(range)
    this.demoActions.simulate(`Range ${range}`, 200).subscribe()
  }

  closeDrawer = (): void => {
    this.drawerOpen.set(false)
  }

  criticalAlerts = (): number => Number(this.data()?.alertsBySeverity?.['CRITICAL'] ?? 3)

  forecastSpend = (): string => this.formatSpend(Math.round((this.n('monthlySpend') || 4820) * 1.076))

  formatSpend = (value?: number): string => {
    if (value === undefined || value === null) return '0 US$'
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  }
}
