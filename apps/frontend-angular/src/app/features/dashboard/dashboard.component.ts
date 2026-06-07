import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { DashboardFleetTableComponent } from './components/dashboard-fleet-table.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { InstanceDetailDrawerComponent } from './components/instance-detail-drawer.component'
import { InventoryService } from '../../core/services/inventory.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { DashboardData, DashboardInstanceRow } from './dashboard.models'
import { buildDemoDashboard } from './utils/dashboard-demo.util'

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
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
export class DashboardComponent implements OnInit {
  private readonly inventory = inject(InventoryService)
  private readonly realtime = inject(RealtimeService)

  readonly page = createPageLoader(true)
  readonly data = signal<DashboardData | null>(null)
  readonly drawerOpen = signal(false)
  readonly selectedInstance = signal<DashboardInstanceRow | null>(null)

  ngOnInit(): void {
    this.realtime.connect()
    this.realtime.on('inventory.updated', () => this.loadData())
    this.realtime.on('dashboard.updated', () => this.loadData())
    this.loadData()
  }

  instanceList = (): DashboardInstanceRow[] => this.data()?.instanceList ?? []

  loadData = (): void => {
    this.page.run(this.inventory.dashboard(), {
      onSuccess: (d) => this.data.set(d),
      errorMessage: 'No se pudo cargar el tablero',
      fallback: buildDemoDashboard,
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
