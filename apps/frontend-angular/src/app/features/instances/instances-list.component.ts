import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatMenuModule } from '@angular/material/menu'
import { MatTabsModule } from '@angular/material/tabs'
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { DetailDialogComponent } from '../../shared/components/detail-dialog/detail-dialog.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { InstancesService } from '../../core/services/instances.service'
import { LiveCloudSyncService } from '../../core/services/live-cloud-sync.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
import { ToastService } from '../../core/services/toast.service'
import { Instance } from '../../core/models/api.models'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-instance-start-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Iniciar instancia</h2>
    <mat-dialog-content>
      <p>¿Iniciar la instancia <strong>{{ data.name }}</strong> en {{ data.provider }}?</p>
      <p class="hint">La instancia se iniciará en el proveedor cloud conectado.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" type="button" [mat-dialog-close]="true">Iniciar</button>
    </mat-dialog-actions>
  `,
  styles: `.hint { color: var(--app-text-muted); font-size: 0.85rem; }`,
})
export class InstanceStartConfirmDialogComponent {
  readonly data = inject<{ name: string; provider: string }>(MAT_DIALOG_DATA)
}

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
        title="Instancias"
        description="Inventario global — AWS, GCP, Azure y VPS"
        [actions]="[
          { label: 'Lanzar instancia', icon: 'rocket_launch', primary: true },
          { label: viewMode() === 'list' ? 'Vista cuadrícula' : 'Vista lista', icon: 'view_module' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      <div class="table-card">
        <mat-tab-group class="soft-tabs" animationDuration="260ms">
          <mat-tab label="Resumen">
            <div class="hub-tab-panel">
              <div class="hub-quick-actions">
                <button type="button" class="hub-action-chip" (click)="handleSyncAll()" [disabled]="liveSync.syncing()">
                  {{ liveSync.syncing() ? 'Sincronizando…' : 'Sincronizar todo' }}
                </button>
                <button type="button" class="hub-action-chip" (click)="handleLaunch()">Lanzar instancia</button>
              </div>
            </div>
          </mat-tab>
          <mat-tab label="Todas las instancias">
            <div class="hub-tab-panel">
        <div class="filter-row">
          <mat-form-field appearance="outline">
            <mat-label>Buscar instancias</mat-label>
            <input matInput [formControl]="searchControl" placeholder="Nombre o región…" aria-label="Filtrar instancias" />
            <mat-hint>Filtra por nombre de instancia o región cloud</mat-hint>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Proveedor</mat-label>
            <mat-select [formControl]="providerControl">
              <mat-option value="">Todos</mat-option>
              <mat-option value="AWS">AWS</mat-option>
              <mat-option value="GCP">GCP</mat-option>
              <mat-option value="AZURE">Azure</mat-option>
              <mat-option value="VPS">VPS</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Región</mat-label>
            <mat-select [formControl]="regionControl">
              <mat-option value="">Todas</mat-option>
              @for (r of regions(); track r) { <mat-option [value]="r">{{ r }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Estado</mat-label>
            <mat-select [formControl]="statusControl">
              <mat-option value="">Todos</mat-option>
              <mat-option value="RUNNING">En ejecución</mat-option>
              <mat-option value="STOPPED">Detenida</mat-option>
              <mat-option value="WARNING">Advertencia</mat-option>
              <mat-option value="ERROR">Error</mat-option>
              <mat-option value="TERMINATED">Borradas / Terminadas</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Entorno</mat-label>
            <mat-select [formControl]="envControl">
              <mat-option value="">Todos</mat-option>
              <mat-option value="prod">Producción</mat-option>
              <mat-option value="staging">Staging</mat-option>
              <mat-option value="dev">Desarrollo</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        @if (selected().size > 0) {
          <div class="bulk-bar">
            <span>{{ selected().size }} seleccionadas</span>
            <button mat-stroked-button type="button" (click)="bulkAction('start')">Iniciar</button>
            <button mat-stroked-button type="button" (click)="bulkAction('stop')">Detener</button>
            <button mat-stroked-button type="button" (click)="bulkAction('restart')">Reiniciar</button>
          </div>
        }

        @if (page.loading()) {
          <app-loading-state />
        } @else if (page.error()) {
          <app-error-state [message]="page.error()!" (retry)="load()" />
        } @else if (filtered().length === 0 && instances().length > 0) {
          <app-empty-state
            title="Sin coincidencias"
            description="Borra los filtros para ver {{ instances().length }} instancias."
          />
        } @else if (filtered().length === 0) {
          <app-empty-state
            title="Sin instancias"
            description="Conecta una cuenta cloud o registra un VPS para ver recursos en la flota."
          />
        } @else if (viewMode() === 'grid') {
          <div class="instance-grid">
            @for (row of filtered(); track row.id) {
              <div class="instance-card">
                <mat-checkbox [checked]="selected().has(row.id)" (change)="toggleSelect(row.id, $event.checked)" />
                <a [routerLink]="['/instances', row.id]"><strong>{{ row.name }}</strong></a>
                <app-status-badge [value]="row.status" />
                <p>{{ row.provider }} · {{ row.region }}</p>
                <button mat-stroked-button type="button" (click)="showDetail(row)">Detalle</button>
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
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let row">
                <a [routerLink]="['/instances', row.id]">{{ row.name }}</a>
                @if (row.isDemo) { <span class="chip-demo">DEMO</span> }
              </td>
            </ng-container>
            <ng-container matColumnDef="provider"><th mat-header-cell *matHeaderCellDef>Proveedor</th><td mat-cell *matCellDef="let row">{{ row.provider }}</td></ng-container>
            <ng-container matColumnDef="region"><th mat-header-cell *matHeaderCellDef>Región</th><td mat-cell *matCellDef="let row">{{ row.region ?? '—' }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Estado</th><td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status" /></td></ng-container>
            <ng-container matColumnDef="environment"><th mat-header-cell *matHeaderCellDef>Entorno</th><td mat-cell *matCellDef="let row">{{ row.environment ?? '—' }}</td></ng-container>
            <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Tipo</th><td mat-cell *matCellDef="let row">{{ row.instanceType ?? '—' }}</td></ng-container>
            <ng-container matColumnDef="cost"><th mat-header-cell *matHeaderCellDef>Coste/mes</th><td mat-cell *matCellDef="let row">{{ formatCost(row.monthlyCost) }}</td></ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button [matMenuTriggerFor]="instMenu" aria-label="Acciones"><mat-icon>more_vert</mat-icon></button>
                <mat-menu #instMenu="matMenu">
                  @if (row.status === 'STOPPED') {
                    <button mat-menu-item (click)="instanceAction(row, 'start')">Iniciar</button>
                  }
                  <button mat-menu-item (click)="instanceAction(row, 'stop')">Detener</button>
                  <button mat-menu-item (click)="showDetail(row)">Ver detalle</button>
                  <button mat-menu-item (click)="viewMetrics(row)">Métricas</button>
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
          <mat-tab label="Por proveedor"><div class="hub-tab-panel"><p>AWS {{ byProvider('AWS') }} · GCP {{ byProvider('GCP') }} · Azure {{ byProvider('AZURE') }} · VPS {{ byProvider('VPS') }}</p></div></mat-tab>
          <mat-tab label="Por estado"><div class="hub-tab-panel"><p>En ejecución {{ running() }} · Detenidas {{ stopped() }}</p></div></mat-tab>
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
    @media (max-width: 767px) {
      .bulk-bar {
        flex-wrap: wrap;
      }
      .bulk-bar button {
        min-height: 44px;
      }
      .instance-grid {
        grid-template-columns: 1fr;
      }
      .filter-row mat-form-field {
        width: 100%;
        min-width: 0;
      }
    }
  `,
})
export class InstancesListComponent implements OnInit {
  private readonly service = inject(InstancesService)
  private readonly pro = inject(ProModeService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  readonly liveSync = inject(LiveCloudSyncService)

  readonly showDemoExtras = (): boolean => allowsDemoDataFrom(this.pro)

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
    this.statusControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load())
    this.liveSync.startPolling(() => {
      this.liveSync.syncAllAccountsSilent().subscribe({ next: () => this.loadSilent() })
    })
    this.destroyRef.onDestroy(() => this.liveSync.stopPolling())
  }

  handleLaunch = (): void => {
    void this.router.navigate(['/admin/infraestructura/instancias/lanzar'])
  }

  handleSyncAll = (): void => {
    this.liveSync.syncAllAccounts().subscribe({
      next: () => {
        this.toast.success('Inventario sincronizado')
        this.load()
      },
      error: () => this.toast.error('No se pudo sincronizar'),
    })
  }

  private listFilters = (): { status?: string } => {
    const status = this.statusControl.value
    if (status === 'TERMINATED') return { status: 'TERMINATED' }
    if (status) return { status }
    return {}
  }

  load = (): void => {
    this.page.run(this.service.list(this.listFilters()), {
      onSuccess: (data) => this.instances.set(data),
      errorMessage: 'No se pudieron cargar las instancias',
    })
  }

  loadSilent = (): void => {
    this.service.list(this.listFilters()).subscribe({
      next: (data) => this.instances.set(data),
    })
  }

  handleHeader = (label: string): void => {
    if (label.startsWith('Lanzar')) {
      this.handleLaunch()
      return
    }
    if (label.startsWith('Vista')) {
      this.viewMode.update((m) => (m === 'list' ? 'grid' : 'list'))
    }
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
    if (this.selected().size === 0) {
      this.toast.error('Selecciona instancias primero')
      return
    }
    this.toast.success(`Acción ${action} en ${this.selected().size} instancia(s) solicitada`)
    this.load()
  }

  instanceAction = (row: Instance, action: 'start' | 'stop'): void => {
    if (action === 'start') {
      this.dialog
        .open(InstanceStartConfirmDialogComponent, {
          width: '420px',
          data: { name: row.name, provider: row.provider },
        })
        .afterClosed()
        .subscribe((confirmed) => {
          if (!confirmed) return
          this.service.start(row.id).subscribe({
            next: () => {
              this.toast.success(`Instancia ${row.name} iniciada`)
              this.load()
            },
            error: () => this.toast.error(`No se pudo iniciar ${row.name}`),
          })
        })
      return
    }
    this.service.stop(row.id).subscribe({
      next: () => {
        this.toast.success(`Instancia ${row.name} detenida`)
        this.load()
      },
      error: () => this.toast.error(`No se pudo detener ${row.name}`),
    })
  }

  viewMetrics = (row: Instance): void => {
    void this.router.navigate(['/metrics/overview'], { queryParams: { instance: row.id } })
  }

  showDetail = (row: Instance): void => {
    this.dialog.open(DetailDialogComponent, {
      width: '440px',
      data: {
        title: row.name,
        rows: [
          { label: 'Proveedor', value: row.provider },
          { label: 'Región', value: row.region ?? '—' },
          { label: 'Estado', value: row.status ?? '—' },
          { label: 'Tipo', value: row.instanceType ?? '—' },
          { label: 'Coste/mes', value: this.formatCost(row.monthlyCost) },
        ],
      },
    })
  }

  formatCost = (value?: number): string => {
    if (value === undefined || value === null) return '—'
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(value)
  }
}
