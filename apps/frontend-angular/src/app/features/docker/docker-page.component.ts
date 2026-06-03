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
import { InventoryService } from '../../core/services/inventory.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { invNum } from '../../core/utils/inventory.util'

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
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Docker"
        description="Container hosts, images, networks and volumes across VPS"
        [actions]="[
          { label: 'Start demo container', icon: 'play_arrow', primary: true },
          { label: 'Refresh', icon: 'refresh' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      @if (page.loading()) {
        <app-loading-state />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="summary-grid">
          <app-summary-card title="Docker hosts" [value]="n('hosts')" icon="dns" />
          <app-summary-card title="Running" [value]="n('running')" icon="play_circle" />
          <app-summary-card title="Stopped" [value]="n('stopped')" icon="stop_circle" />
          <app-summary-card title="Images" [value]="n('images')" icon="layers" />
          <app-summary-card title="Volumes" [value]="n('volumes')" icon="storage" />
          <app-summary-card title="Networks" [value]="n('networks')" icon="hub" />
        </div>

        <mat-tab-group>
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
                <table mat-table [dataSource]="filtered()" class="full-table">
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
          <mat-tab label="Hosts"><div class="tab-panel"><p>{{ n('hosts') }} Docker hosts registered (demo).</p></div></mat-tab>
          <mat-tab label="Images"><div class="tab-panel"><p>{{ n('images') }} unique images across hosts.</p></div></mat-tab>
          <mat-tab label="Networks"><div class="tab-panel"><p>{{ n('networks') }} bridge/overlay networks.</p></div></mat-tab>
          <mat-tab label="Volumes"><div class="tab-panel"><p>{{ n('volumes') }} persistent volumes.</p></div></mat-tab>
          <mat-tab label="Logs"><div class="tab-panel"><pre class="log-preview mono">{{ logPreview() }}</pre></div></mat-tab>
        </mat-tab-group>
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
  private readonly inventory = inject(InventoryService)
  private readonly demoActions = inject(DemoActionsService)
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

  filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.items().filter((c) => !term || String(c['name']).toLowerCase().includes(term))
  })

  ngOnInit = (): void => this.load()

  n = (key: string): number => invNum(this.data(), key)

  load = (): void => {
    this.page.run(this.inventory.docker(), {
      onSuccess: (d) => this.data.set(d),
      errorMessage: 'Failed to load Docker inventory',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Start demo container') {
      this.demoActions.simulate('Start container nginx-demo', 800, 'Container nginx-demo started').subscribe(() => this.load())
      return
    }
    this.load()
    this.demoActions.simulate('Docker refresh', 400).subscribe()
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
