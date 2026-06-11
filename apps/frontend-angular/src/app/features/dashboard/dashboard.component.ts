import { Component, inject, OnDestroy, OnInit, signal, computed } from '@angular/core'
import { DashboardFleetTableComponent } from './components/dashboard-fleet-table.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { InstanceDetailDrawerComponent } from './components/instance-detail-drawer.component'
import { InventoryService } from '../../core/services/inventory.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { LiveCloudSyncService } from '../../core/services/live-cloud-sync.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { DashboardData, DashboardInstanceRow } from './dashboard.models'
import { buildDemoDashboard } from './utils/dashboard.util'
import { filterLiveCloudInstances } from './utils/dashboard-instances.util'
import { emptyDashboard } from '../../core/demo/pro-empty.data'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
import { ProModeService } from '../../core/services/pro-mode.service'

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DashboardFleetTableComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    InstanceDetailDrawerComponent,
  ],
  template: `
    <div class="dashboard-page">
      <div class="dashboard-body">
        @if (page.loading()) {
          <app-loading-state message="Cargando métricas del tablero…" />
        } @else if (page.error()) {
          <app-error-state [message]="page.error()!" (retry)="loadData()" />
        } @else if (instanceList().length === 0) {
          <app-empty-state
            class="animate-fade-in"
            icon="cloud_off"
            title="Sin instancias cloud"
            message="Conecta una cuenta cloud y sincroniza el inventario para ver instancias en vivo aquí."
          />
        } @else {
          <app-dashboard-fleet-table
            class="animate-fade-in"
            [rows]="instanceList()"
            [byProvider]="data()?.byProvider ?? {}"
            [cpuByProvider]="data()?.cpuByProvider ?? {}"
            [costByProvider]="costByProvider()"
            (instanceSelect)="openInstanceDrawer($event)"
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
      gap: 0.65rem;
    }
    app-dashboard-fleet-table { flex-shrink: 0; }
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly inventory = inject(InventoryService)
  private readonly realtime = inject(RealtimeService)
  private readonly liveSync = inject(LiveCloudSyncService)
  private readonly pro = inject(ProModeService)

  readonly page = createPageLoader(true)
  readonly data = signal<DashboardData | null>(null)
  readonly drawerOpen = signal(false)
  readonly selectedInstance = signal<DashboardInstanceRow | null>(null)

  ngOnInit(): void {
    this.realtime.connect()
    this.realtime.on('inventory.updated', () => this.loadData())
    this.realtime.on('dashboard.updated', () => this.loadData())
    this.liveSync.startPolling(() => this.loadData(), 30_000)
    this.loadData()
  }

  ngOnDestroy(): void {
    this.liveSync.stopPolling()
  }

  instanceList = (): DashboardInstanceRow[] => {
    const proMode = this.pro.proMode() && !allowsDemoDataFrom(this.pro)
    return filterLiveCloudInstances(this.data()?.instanceList, proMode)
  }

  loadData = (): void => {
    this.page.run(this.inventory.dashboard(), {
      onSuccess: (d) => {
        const proMode = this.pro.proMode() && !allowsDemoDataFrom(this.pro)
        const instanceList = filterLiveCloudInstances(d.instanceList, proMode)
        const byProvider = instanceList.reduce<Record<string, number>>((acc, row) => {
          acc[row.provider] = (acc[row.provider] ?? 0) + 1
          return acc
        }, {})
        this.data.set({ ...d, instanceList, byProvider })
      },
      errorMessage: 'No se pudo cargar el tablero',
      fallback: () => (allowsDemoDataFrom(this.pro) ? buildDemoDashboard() : emptyDashboard()),
    })
  }

  closeDrawer = (): void => {
    this.drawerOpen.set(false)
  }

  openInstanceDrawer = (instance: DashboardInstanceRow): void => {
    this.selectedInstance.set(instance)
    this.drawerOpen.set(true)
  }

  costByProvider = computed((): Record<string, number> => {
    const list = this.data()?.instanceList ?? []
    const totals: Record<string, number> = {}
    list.forEach((row) => {
      totals[row.provider] = (totals[row.provider] ?? 0) + (row.monthlyCost ?? 0)
    })
    return totals
  })
}
