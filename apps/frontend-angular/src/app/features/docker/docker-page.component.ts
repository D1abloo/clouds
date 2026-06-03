import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatDialog } from '@angular/material/dialog'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { DetailDialogComponent } from '../../shared/components/detail-dialog/detail-dialog.component'
import { DockerService } from '../../core/services/docker.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { DiscoveryService } from '../../core/services/discovery.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { ToastService } from '../../core/services/toast.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { invNum } from '../../core/utils/inventory.util'
import { PanelCardComponent } from '../../shared/ui/panel-card.component'
import { ChartCardComponent } from '../../shared/ui/chart-card.component'
import { SkeletonTableComponent } from '../../shared/ui/skeleton-table.component'

type ContainerRow = Record<string, unknown>

@Component({
  selector: 'app-docker-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    SummaryCardComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    PanelCardComponent,
    ChartCardComponent,
    SkeletonTableComponent,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        icon="view_in_ar"
        title="Docker"
        description="Container hosts, images, networks and volumes across VPS"
        [lastSync]="lastSync()"
        [actions]="[
          { label: 'Start demo container', icon: 'play_arrow', primary: true },
          { label: 'Refresh', icon: 'refresh' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      @if (page.loading()) {
        <app-skeleton-table [rows]="6" [columns]="5" />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="summary-grid">
          <app-summary-card title="Docker hosts" [value]="n('hosts')" icon="dns" variant="elevated" />
          <app-summary-card title="Running" [value]="n('running')" icon="play_circle" variant="elevated" trend="Healthy" />
          <app-summary-card title="Stopped" [value]="n('stopped')" icon="stop_circle" variant="elevated" />
          <app-summary-card title="Images" [value]="n('images')" icon="layers" variant="elevated" />
          <app-summary-card title="Volumes" [value]="n('volumes')" icon="storage" variant="elevated" />
          <app-summary-card title="Networks" [value]="n('networks')" icon="hub" variant="elevated" />
        </div>

        <div class="chart-grid">
          <app-chart-card title="Containers by status" subtitle="Running vs stopped" kind="donut" [data]="containerStatusChart()" badge="Live" />
          <app-chart-card title="Containers by host" kind="bar" [data]="containersByHostChart()" />
          <app-chart-card title="CPU by container" kind="bar" [data]="cpuByContainerChart()" />
          <app-chart-card title="RAM by container" kind="line" [data]="ramByContainerChart()" />
        </div>

        <app-panel-card title="Containers" subtitle="All registered Docker containers" icon="view_in_ar">
          <mat-tab-group class="soft-tabs" animationDuration="280ms">
          <mat-tab label="Containers">
            <div class="tab-panel">
              <div class="filter-row">
                <mat-form-field appearance="outline">
                  <mat-label>Search</mat-label>
                  <input matInput [formControl]="searchControl" />
                </mat-form-field>
              </div>
              @if (filtered().length === 0) {
                <app-empty-state icon="view_in_ar" title="No containers" description="Load demo data or start a demo container." />
              } @else {
                <table mat-table [dataSource]="filtered()" class="premium-table table-row-hover">
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                  </ng-container>
                  <ng-container matColumnDef="image">
                    <th mat-header-cell *matHeaderCellDef>Image</th>
                    <td mat-cell *matCellDef="let row">{{ row.image }}</td>
                  </ng-container>
                  <ng-container matColumnDef="host">
                    <th mat-header-cell *matHeaderCellDef>Host</th>
                    <td mat-cell *matCellDef="let row">{{ row.host }}</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status" /></td>
                  </ng-container>
                  <ng-container matColumnDef="ports">
                    <th mat-header-cell *matHeaderCellDef>Ports</th>
                    <td mat-cell *matCellDef="let row">{{ row.ports }}</td>
                  </ng-container>
                  <ng-container matColumnDef="cpu">
                    <th mat-header-cell *matHeaderCellDef>CPU</th>
                    <td mat-cell *matCellDef="let row">{{ row.cpu }}%</td>
                  </ng-container>
                  <ng-container matColumnDef="ram">
                    <th mat-header-cell *matHeaderCellDef>RAM</th>
                    <td mat-cell *matCellDef="let row">{{ row.ram }}%</td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let row">
                      <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Actions"><mat-icon>more_vert</mat-icon></button>
                      <mat-menu #menu="matMenu">
                        <button mat-menu-item (click)="containerAction(row, 'start')">Start</button>
                        <button mat-menu-item (click)="containerAction(row, 'stop')">Stop</button>
                        <button mat-menu-item (click)="containerAction(row, 'restart')">Restart</button>
                        <button mat-menu-item (click)="showLogs(row)">View logs</button>
                        <button mat-menu-item (click)="showMetrics(row)">Metrics</button>
                      </mat-menu>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="cols"></tr>
                  <tr mat-row *matRowDef="let row; columns: cols"></tr>
                </table>
              }
            </div>
          </mat-tab>
          <mat-tab label="Hosts"><div class="tab-panel"><p>{{ hostRows().length || n('hosts') }} Docker hosts registered.</p></div></mat-tab>
          <mat-tab label="Images"><div class="tab-panel"><p>{{ imageRows().length || n('images') }} unique images across hosts.</p></div></mat-tab>
          <mat-tab label="Networks"><div class="tab-panel"><p>{{ networkRows().length || n('networks') }} bridge/overlay networks.</p></div></mat-tab>
          <mat-tab label="Volumes"><div class="tab-panel"><p>{{ volumeRows().length || n('volumes') }} persistent volumes.</p></div></mat-tab>
          <mat-tab label="Logs"><div class="tab-panel"><pre class="log-preview mono">{{ logPreview() }}</pre></div></mat-tab>
        </mat-tab-group>
        </app-panel-card>
      }
    </div>
  `,
  styles: `
    .full-table { width: 100%; }
    .log-preview {
      background: var(--app-surface);
      padding: 1rem;
      border-radius: 8px;
      max-height: 320px;
      overflow: auto;
      font-size: 0.75rem;
    }
  `,
})
export class DockerPageComponent implements OnInit {
  private readonly docker = inject(DockerService)
  private readonly discovery = inject(DiscoveryService)
  private readonly realtime = inject(RealtimeService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly page = createPageLoader(true)
  readonly data = signal<Record<string, unknown> | null>(null)
  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly cols = ['name', 'image', 'host', 'status', 'ports', 'cpu', 'ram', 'actions']

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )

  items = computed(() => (this.data()?.['items'] as ContainerRow[]) ?? [])
  hostRows = computed(() => (this.data()?.['hostRows'] as Record<string, unknown>[]) ?? [])
  imageRows = computed(() => (this.data()?.['imageRows'] as Record<string, unknown>[]) ?? [])
  networkRows = computed(() => (this.data()?.['networkRows'] as Record<string, unknown>[]) ?? [])
  volumeRows = computed(() => (this.data()?.['volumeRows'] as Record<string, unknown>[]) ?? [])

  filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.items().filter((c) => !term || String(c['name']).toLowerCase().includes(term))
  })

  ngOnInit(): void {
    this.realtime.connect()
    this.realtime.on('discovery.updated', () => this.load())
    this.load()
  }

  n = (key: string): number => invNum(this.data(), key)

  lastSync = (): string => `Synced ${new Date().toLocaleTimeString()}`

  containerStatusChart = (): { label: string; value: number; color?: string }[] => [
    { label: 'Running', value: this.n('running'), color: '#22c55e' },
    { label: 'Stopped', value: this.n('stopped'), color: '#64748b' },
  ]

  containersByHostChart = (): { label: string; value: number }[] => {
    const hosts = this.hostRows()
    if (hosts.length === 0) return [{ label: 'host-1', value: this.n('containers') }]
    return hosts.slice(0, 6).map((h) => ({ label: String(h['hostRef'] ?? h['id']).slice(0, 12), value: Number(h['containerCount'] ?? 1) }))
  }

  cpuByContainerChart = (): { label: string; value: number }[] =>
    this.items().slice(0, 6).map((c) => ({ label: String(c['name']).slice(0, 10), value: Number(c['cpu'] ?? 20) }))

  ramByContainerChart = (): { label: string; value: number }[] =>
    this.items().slice(0, 8).map((c) => ({ label: String(c['name']).slice(0, 8), value: Number(c['ram'] ?? 30) }))

  load = (): void => {
    this.page.run(this.docker.pageData(), {
      onSuccess: (d) => this.data.set(d),
      errorMessage: 'Failed to load Docker data',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Refresh') {
      this.discovery.discoverDocker('vps-prod-docker-01').subscribe({
        next: () => {
          this.toast.success('Docker discovery completed')
          this.load()
        },
        error: () => this.demoActions.simulate('Docker discovery', 900).subscribe(() => this.load()),
      })
      return
    }
    if (label === 'Start demo container') {
      this.discovery.discoverDocker('vps-prod-docker-01').subscribe({
        next: () => this.load(),
        error: () =>
          this.demoActions.simulate('Start container nginx-demo', 800, 'Container started').subscribe(() => this.load()),
      })
    }
  }

  containerAction = (row: ContainerRow, action: string): void => {
    this.demoActions.simulate(`${action} ${row['name']}`, 600).subscribe(() => this.load())
  }

  showLogs = (row: ContainerRow): void => {
    this.dialog.open(DetailDialogComponent, {
      width: '560px',
      data: {
        title: `Logs — ${row['name']}`,
        rows: [{ label: 'Container', value: String(row['name']) }],
        extra: this.logPreview(),
      },
    })
  }

  showMetrics = (row: ContainerRow): void => {
    this.demoActions.simulate(`Metrics ${row['name']}`, 500).subscribe()
  }

  logPreview = (): string =>
    `[2026-06-02T10:00:01Z] nginx: started\n[2026-06-02T10:00:02Z] GET /health 200\n[2026-06-02T10:05:00Z] GET /api/v1/status 200\n[2026-06-02T10:12:33Z] worker: processing job #42`
}
