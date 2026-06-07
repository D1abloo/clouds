import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatMenuModule } from '@angular/material/menu'
import { MatTabsModule } from '@angular/material/tabs'
import { MatDialog } from '@angular/material/dialog'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { DetailDialogComponent } from '../../shared/components/detail-dialog/detail-dialog.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { InstancesService } from '../../core/services/instances.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { DemoService } from '../../core/services/demo.service'
import { ToastService } from '../../core/services/toast.service'
import { Instance } from '../../core/models/api.models'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-instances-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatMenuModule,
    MatTabsModule,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Instances"
        description="Global inventory — AWS, GCP, Azure and VPS"
        [actions]="[
          { label: viewMode() === 'list' ? 'Grid view' : 'List view', icon: 'view_module' },
          { label: 'Bulk actions', icon: 'playlist_play', primary: true },
        ]"
        (actionClick)="handleHeader($event)"
      />

      <div class="table-card">
        <mat-tab-group class="soft-tabs" animationDuration="260ms">
          <mat-tab label="Overview">
            <div class="hub-tab-panel">
              <div class="hub-quick-actions">
                <button type="button" class="hub-action-chip">Sync all</button>
                <button type="button" class="hub-action-chip">Export CSV</button>
                <button type="button" class="hub-action-chip">Launch instance</button>
              </div>
            </div>
          </mat-tab>
          <mat-tab label="All Instances">
            <div class="hub-tab-panel">
        <div class="filter-row">
          <mat-form-field appearance="outline">
            <mat-label>Buscar instancias</mat-label>
            <input matInput [formControl]="searchControl" placeholder="Nombre o región…" aria-label="Filtrar instancias" />
            <mat-hint>Filtra por nombre de instancia o región cloud</mat-hint>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Provider</mat-label>
            <mat-select [formControl]="providerControl">
              <mat-option value="">All</mat-option>
              <mat-option value="AWS">AWS</mat-option>
              <mat-option value="GCP">GCP</mat-option>
              <mat-option value="AZURE">Azure</mat-option>
              <mat-option value="VPS">VPS</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Region</mat-label>
            <mat-select [formControl]="regionControl">
              <mat-option value="">All</mat-option>
              @for (r of regions(); track r) { <mat-option [value]="r">{{ r }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Status</mat-label>
            <mat-select [formControl]="statusControl">
              <mat-option value="">All</mat-option>
              <mat-option value="RUNNING">Running</mat-option>
              <mat-option value="STOPPED">Stopped</mat-option>
              <mat-option value="WARNING">Warning</mat-option>
              <mat-option value="ERROR">Error</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Environment</mat-label>
            <mat-select [formControl]="envControl">
              <mat-option value="">All</mat-option>
              <mat-option value="prod">Production</mat-option>
              <mat-option value="staging">Staging</mat-option>
              <mat-option value="dev">Development</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        @if (selected().size > 0) {
          <div class="bulk-bar">
            <span>{{ selected().size }} selected</span>
            <button mat-stroked-button type="button" (click)="bulkAction('start')">Start</button>
            <button mat-stroked-button type="button" (click)="bulkAction('stop')">Stop</button>
            <button mat-stroked-button type="button" (click)="bulkAction('restart')">Restart</button>
            <button mat-stroked-button type="button" (click)="bulkAction('verify')">Verify</button>
          </div>
        }

        @if (page.loading()) {
          <app-loading-state />
        } @else if (page.error()) {
          <app-error-state [message]="page.error()!" (retry)="load()" />
        } @else if (filtered().length === 0 && instances().length > 0) {
          <app-empty-state
            title="No matches"
            description="Clear filters to see {{ instances().length }} instances."
          />
        } @else if (filtered().length === 0) {
          <app-empty-state
            title="No instances"
            description="Load demo data from Settings or the Demo banner (admin login required)."
          />
          @if (demo.canManageDemo()) {
            <button mat-flat-button color="primary" type="button" class="empty-action" (click)="demo.loadDemo()">
              Cargar datos demo
            </button>
          }
        } @else if (viewMode() === 'grid') {
          <div class="instance-grid">
            @for (row of filtered(); track row.id) {
              <div class="instance-card">
                <mat-checkbox [checked]="selected().has(row.id)" (change)="toggleSelect(row.id, $event.checked)" />
                <a [routerLink]="['/instances', row.id]"><strong>{{ row.name }}</strong></a>
                <app-status-badge [value]="row.status" />
                <p>{{ row.provider }} · {{ row.region }}</p>
                <button mat-stroked-button type="button" (click)="showDetail(row)">Detail</button>
              </div>
            }
          </div>
        } @else {
          <div class="data-table-wrap">
          <table mat-table [dataSource]="filtered()" class="premium-table table-row-hover">
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <mat-checkbox [checked]="selected().has(row.id)" (change)="toggleSelect(row.id, $event.checked)" />
              </td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">
                <a [routerLink]="['/instances', row.id]">{{ row.name }}</a>
                @if (row.isDemo) { <span class="chip-demo">DEMO</span> }
              </td>
            </ng-container>
            <ng-container matColumnDef="provider"><th mat-header-cell *matHeaderCellDef>Provider</th><td mat-cell *matCellDef="let row">{{ row.provider }}</td></ng-container>
            <ng-container matColumnDef="region"><th mat-header-cell *matHeaderCellDef>Region</th><td mat-cell *matCellDef="let row">{{ row.region ?? '—' }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status" /></td></ng-container>
            <ng-container matColumnDef="environment"><th mat-header-cell *matHeaderCellDef>Env</th><td mat-cell *matCellDef="let row">{{ row.environment ?? '—' }}</td></ng-container>
            <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let row">{{ row.instanceType ?? '—' }}</td></ng-container>
            <ng-container matColumnDef="cost"><th mat-header-cell *matHeaderCellDef>Cost/mo</th><td mat-cell *matCellDef="let row">{{ formatCost(row.monthlyCost) }}</td></ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button [matMenuTriggerFor]="instMenu" aria-label="Actions"><mat-icon>more_vert</mat-icon></button>
                <mat-menu #instMenu="matMenu">
                  <button mat-menu-item (click)="instanceAction(row, 'start')">Start</button>
                  <button mat-menu-item (click)="instanceAction(row, 'stop')">Stop</button>
                  <button mat-menu-item (click)="showDetail(row)">View detail</button>
                  <button mat-menu-item (click)="viewMetrics(row)">Metrics</button>
                </mat-menu>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols" class="table-row-hover"></tr>
          </table>
          </div>
        }
            </div>
          </mat-tab>
          <mat-tab label="By Provider"><div class="hub-tab-panel"><p>AWS {{ byProvider('AWS') }} · GCP {{ byProvider('GCP') }} · Azure {{ byProvider('AZURE') }} · VPS {{ byProvider('VPS') }}</p></div></mat-tab>
          <mat-tab label="By Status"><div class="hub-tab-panel"><p>Running {{ running() }} · Stopped {{ stopped() }}</p></div></mat-tab>
          <mat-tab label="By Region"><div class="hub-tab-panel"><p>Top regions: us-east-1, eu-west-1, europe-west1 (demo)</p></div></mat-tab>
          <mat-tab label="Metrics"><div class="hub-tab-panel"><p>Average CPU across fleet: 52% (demo)</p></div></mat-tab>
          <mat-tab label="Cost"><div class="hub-tab-panel"><p>Estimated monthly: {{ formatTotalCost() }}</p></div></mat-tab>
          <mat-tab label="Alerts"><div class="hub-tab-panel"><p>3 instances with open alerts (demo)</p></div></mat-tab>
          <mat-tab label="Audit"><div class="hub-tab-panel"><a routerLink="/audit">View audit log</a></div></mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `,
  styles: `
    a { color: inherit; font-weight: 500; }
    .bulk-bar { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; padding: 0.65rem 1rem; background: var(--app-elevated); border-radius: var(--app-radius-md); box-shadow: var(--app-shadow-xs); }
    .instance-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
    .instance-card {
      border: none;
      border-radius: var(--app-radius-lg);
      padding: 1rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      transition: box-shadow 0.25s ease, transform 0.2s ease;
      &:hover { box-shadow: var(--app-shadow-md); transform: translateY(-2px); }
    }
    .empty-action { margin-top: 0.75rem; }
  `,
})
export class InstancesListComponent implements OnInit {
  private readonly service = inject(InstancesService)
  readonly demoActions = inject(DemoActionsService)
  readonly demo = inject(DemoService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly providerControl = new FormControl('', { nonNullable: true })
  readonly regionControl = new FormControl('', { nonNullable: true })
  readonly statusControl = new FormControl('', { nonNullable: true })
  readonly envControl = new FormControl('', { nonNullable: true })

  readonly page = createPageLoader(true)
  readonly instances = signal<Instance[]>([])
  readonly viewMode = signal<'list' | 'grid'>('list')
  readonly selected = signal<Set<string>>(new Set())
  readonly cols = ['select', 'name', 'provider', 'region', 'status', 'environment', 'type', 'cost', 'actions']

  byProvider = (p: string): number => this.instances().filter((i) => i.provider === p).length

  formatTotalCost = (): string => {
    const sum = this.instances().reduce((s, i) => s + (i.monthlyCost ?? 120), 0)
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(sum)
  }

  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')), { initialValue: '' })
  private readonly providerFilter = toSignal(this.providerControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly regionFilter = toSignal(this.regionControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly statusFilter = toSignal(this.statusControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly envFilter = toSignal(this.envControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  regions = computed(() => [...new Set(this.instances().map((i) => i.region).filter(Boolean))] as string[])

  running = computed(() => this.instances().filter((i) => i.status === 'RUNNING').length)
  stopped = computed(() => this.instances().filter((i) => i.status === 'STOPPED').length)

  filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.instances().filter((i) => {
      const matchTerm = !term || i.name.toLowerCase().includes(term) || (i.region ?? '').toLowerCase().includes(term)
      const matchProvider = !this.providerFilter() || i.provider === this.providerFilter()
      const matchRegion = !this.regionFilter() || i.region === this.regionFilter()
      const matchStatus = !this.statusFilter() || i.status === this.statusFilter()
      const matchEnv = !this.envFilter() || (i.environment ?? '').toLowerCase() === this.envFilter().toLowerCase()
      return matchTerm && matchProvider && matchRegion && matchStatus && matchEnv
    })
  })

  ngOnInit(): void {
    this.load()
  }

  load = (): void => {
    this.page.run(this.service.list(), {
      onSuccess: (data) => this.instances.set(data),
      errorMessage: 'Failed to load instances',
    })
  }

  handleHeader = (label: string): void => {
    if (label.startsWith('Grid') || label.startsWith('List')) {
      this.viewMode.update((m) => (m === 'list' ? 'grid' : 'list'))
      return
    }
    if (this.selected().size === 0) {
      this.toast.error('Select instances first')
      return
    }
    this.bulkAction('start')
  }

  toggleSelect = (id: string, checked: boolean): void => {
    this.selected.update((set) => {
      const next = new Set(set)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  bulkAction = (action: string): void => {
    this.demoActions.simulate(`Bulk ${action} (${this.selected().size} instances)`, 1000).subscribe(() => this.load())
  }

  instanceAction = (row: Instance, action: 'start' | 'stop'): void => {
    const fn = action === 'start' ? this.service.start : this.service.stop
    fn(row.id).subscribe({
      next: () => this.toast.success(`${action} requested`),
      error: () => this.demoActions.simulate(`${action} ${row.name}`, 500).subscribe(),
    })
  }

  viewMetrics = (row: Instance): void => {
    this.demoActions.simulate(`Metrics ${row.name}`, 400).subscribe()
  }

  showDetail = (row: Instance): void => {
    this.dialog.open(DetailDialogComponent, {
      width: '440px',
      data: {
        title: row.name,
        rows: [
          { label: 'Provider', value: row.provider },
          { label: 'Region', value: row.region ?? '—' },
          { label: 'Status', value: row.status ?? '—' },
          { label: 'Type', value: row.instanceType ?? '—' },
          { label: 'Cost/mo', value: this.formatCost(row.monthlyCost) },
        ],
      },
    })
  }

  formatCost = (value?: number): string => {
    if (value === undefined || value === null) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }
}
