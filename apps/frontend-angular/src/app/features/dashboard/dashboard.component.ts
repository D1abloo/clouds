import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { DashboardHeaderComponent } from './components/dashboard-header.component'
import {
  MetricStatsGridComponent,
  type MetricStatItem,
} from '../../shared/components/metric-stats-grid/metric-stats-grid.component'
import { AlertsTableComponent } from './components/alerts-table.component'
import { NotificationsPanelComponent, NotificationRow } from './components/notifications-panel.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { InstanceOverviewTableComponent } from './components/instance-overview-table.component'
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
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatIconModule,
    BrandLogoComponent,
    DashboardHeaderComponent,
    MetricStatsGridComponent,
    AlertsTableComponent,
    NotificationsPanelComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    InstanceOverviewTableComponent,
    InstanceDetailDrawerComponent,
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

      <div class="dashboard-body">
        @if (page.loading()) {
          <div class="dashboard-skeleton animate-fade-in">
            <div class="dashboard-kpis-panel">
              <div class="metric-stats-grid dashboard-skeleton__grid">
                @for (i of [1, 2, 3, 4, 5, 6]; track i) {
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
          <section class="dashboard-kpis-panel animate-fade-in" aria-label="Indicadores clave">
            <app-metric-stats-grid [items]="dashboardKpiMetrics()" />
          </section>

          <nav class="dashboard-pulse animate-fade-in" aria-label="Accesos operativos">
            <a class="dashboard-pulse__chip" routerLink="/approvals">
              <mat-icon>verified</mat-icon>
              <span>Aprobaciones</span>
              <strong>{{ pendingApprovals() }}</strong>
            </a>
            <a class="dashboard-pulse__chip dashboard-pulse__chip--warn" routerLink="/alerts/active">
              <mat-icon>notifications_active</mat-icon>
              <span>Alertas</span>
              <strong>{{ n('alertsOpen') }}</strong>
            </a>
            <a class="dashboard-pulse__chip" routerLink="/jenkins">
              <app-brand-logo logo="jenkins" size="sm" />
              <span>Jenkins</span>
              <strong>{{ jenkinsN('success') }} OK</strong>
            </a>
            <a class="dashboard-pulse__chip" routerLink="/billing/overview">
              <mat-icon>payments</mat-icon>
              <span>Facturación</span>
              <strong>{{ formatSpend(n('monthlySpend')) }}</strong>
            </a>
            <a class="dashboard-pulse__chip" routerLink="/health-center">
              <app-brand-logo logo="grafana" size="sm" />
              <span>Salud</span>
              <strong>94%</strong>
            </a>
            <a class="dashboard-pulse__chip" routerLink="/command-center">
              <mat-icon>bolt</mat-icon>
              <span>Mando</span>
              <strong>5 tareas</strong>
            </a>
          </nav>

          <app-instance-overview-table
            class="animate-fade-in"
            [rows]="instanceList()"
            [threeColumn]="true"
            (select)="openDrawer($event)"
          >
            <div class="dashboard-feed" dashboardFeed>
              <app-alerts-table [rows]="recentAlerts()" />
              <app-notifications-panel [items]="notificationRows()" />
            </div>
          </app-instance-overview-table>
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
      max-width: 100%;
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
    .dashboard-kpis-panel {
      padding: 0.85rem 0.95rem 0.95rem;
      border-radius: 14px;
      background: color-mix(in srgb, var(--app-surface) 42%, var(--app-card));
      box-shadow: var(--app-shadow-sm);
    }
    .dashboard-kpis-panel ::ng-deep .metric-stat {
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
      box-shadow: 0 1px 3px color-mix(in srgb, var(--app-text) 4%, transparent);
    }
    .dashboard-pulse {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      padding: 0.55rem 0.65rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--app-surface) 36%, var(--app-card));
      box-shadow: var(--app-shadow-xs);
    }
    .dashboard-pulse__chip {
      display: inline-flex;
      align-items: center;
      gap: 0.42rem;
      padding: 0.42rem 0.72rem;
      border-radius: 999px;
      text-decoration: none;
      color: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
      box-shadow: 0 1px 2px color-mix(in srgb, var(--app-text) 3%, transparent);
      transition: background 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease;
      span { color: var(--app-text-muted); }
      strong {
        font-size: 0.72rem;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        color: var(--app-text);
      }
      mat-icon {
        font-size: 0.95rem;
        width: 0.95rem;
        height: 0.95rem;
        color: var(--app-accent);
      }
      &:hover {
        transform: translateY(-1px);
        box-shadow: var(--app-shadow-sm);
        background: color-mix(in srgb, var(--app-accent) 4%, var(--app-card));
      }
    }
    .dashboard-pulse__chip--warn mat-icon { color: #d97706; }
    .dashboard-pulse__chip--warn strong { color: #d97706; }
    .dashboard-feed {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 0;
      height: 100%;
    }
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

  readonly dashboardKpiMetrics = computed((): MetricStatItem[] => {
    this.data()
    this.pendingApprovals()
    return [
      {
        label: 'Instancias',
        value: this.n('totalInstances'),
        icon: 'dns',
        tone: 'primary',
        subtitle: `${this.n('runningInstances')} en ejecución`,
        delay: 0,
      },
      {
        label: 'Gasto mensual',
        value: this.formatSpend(this.n('monthlySpend')),
        icon: 'payments',
        tone: 'success',
        subtitle: `Previsto ${this.forecastSpend()}`,
        trend: '−4%',
        trendDown: true,
        delay: 30,
      },
      {
        label: 'Alertas',
        value: this.n('alertsOpen'),
        icon: 'notifications_active',
        tone: 'danger',
        subtitle: `${this.criticalAlerts()} crítico`,
        badge: 'Activas',
        delay: 60,
      },
      {
        label: 'Aprobaciones',
        value: this.pendingApprovals(),
        icon: 'verified',
        tone: 'warning',
        subtitle: 'Pendiente de revisión',
        delay: 90,
      },
      {
        label: 'SLA global',
        value: '94%',
        icon: 'favorite',
        tone: 'purple',
        subtitle: '18 servicios monitorizados',
        delay: 120,
      },
      {
        label: 'CI/CD',
        value: this.jenkinsN('running'),
        icon: 'build',
        logo: 'jenkins',
        tone: 'warning',
        subtitle: 'build en curso',
        delay: 150,
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

  openDrawer = (row: DashboardInstanceRow): void => {
    this.selectedInstance.set(row)
    this.drawerOpen.set(true)
  }

  closeDrawer = (): void => {
    this.drawerOpen.set(false)
  }

  recentAlerts = (): Record<string, unknown>[] =>
    (this.data()?.recentAlerts as Record<string, unknown>[]) ?? []

  notificationRows = (): NotificationRow[] =>
    ((this.data()?.notifications ?? []) as unknown as NotificationRow[]).map((n) => ({
      ...n,
      severity: n.severity ?? 'INFO',
    }))

  criticalAlerts = (): number => Number(this.data()?.alertsBySeverity?.['CRITICAL'] ?? 3)

  forecastSpend = (): string => this.formatSpend(Math.round(this.n('monthlySpend') * 1.06))

  formatSpend = (value?: number): string => {
    if (value === undefined || value === null) return '$0'
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  }
}
