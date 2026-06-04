import { Component, Input, output, signal, computed, inject } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator'
import { MatTooltipModule } from '@angular/material/tooltip'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component'
import { DashboardInstanceRow } from '../dashboard.models'
import { DemoActionsService } from '../../../core/services/demo-actions.service'

type SortKey = keyof DashboardInstanceRow | 'monthlyCost'

@Component({
  selector: 'app-instance-overview-table',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatTooltipModule,
    StatusBadgeComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="instance-overview">
      <header class="instance-overview__head">
        <div>
          <h3><mat-icon>dns</mat-icon> Vista de instancias</h3>
          <p>{{ filtered().length }} instancias en AWS, GCP, Azure y VPS</p>
        </div>
      </header>

      <div class="instance-overview__filters">
        <mat-form-field appearance="outline" class="filter-search">
          <mat-label>Buscar instancias</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [formControl]="searchControl" placeholder="Nombre, IP, cuenta…" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Proveedor</mat-label>
          <mat-select [formControl]="providerControl">
            <mat-option value="">Todos los proveedores</mat-option>
            <mat-option value="AWS">AWS</mat-option>
            <mat-option value="GCP">GCP</mat-option>
            <mat-option value="AZURE">Azure</mat-option>
            <mat-option value="VPS">VPS</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Estado</mat-label>
          <mat-select [formControl]="statusControl">
            <mat-option value="">Todos los estados</mat-option>
            <mat-option value="RUNNING">En ejecución</mat-option>
            <mat-option value="STOPPED">Detenida</mat-option>
            <mat-option value="WARNING">Advertencia</mat-option>
            <mat-option value="ERROR">Error</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Región</mat-label>
          <mat-select [formControl]="regionControl">
            <mat-option value="">Todas las regiones</mat-option>
            @for (r of regions(); track r) {
              <mat-option [value]="r">{{ r }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Entorno</mat-label>
          <mat-select [formControl]="envControl">
            <mat-option value="">Todos los entornos</mat-option>
            <mat-option value="production">Producción</mat-option>
            <mat-option value="staging">Staging</mat-option>
            <mat-option value="development">Desarrollo</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      @if (!rows.length) {
        <app-empty-state icon="cloud_off" title="Sin instancias" message="Carga datos demo o conecta una cuenta cloud" />
      } @else if (!filtered().length) {
        <app-empty-state icon="filter_alt_off" title="Sin coincidencias" message="Prueba a ajustar los filtros" />
      } @else {
        <div class="instance-overview__scroll">
          <table mat-table [dataSource]="paged()" class="premium-table instance-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let row">
                <button type="button" class="name-link" [matTooltip]="row.name" (click)="select.emit(row)">
                  {{ row.name }}
                </button>
                @if (row.isDemo) { <span class="demo-tag">DEMO</span> }
              </td>
            </ng-container>
            <ng-container matColumnDef="provider">
              <th mat-header-cell *matHeaderCellDef>Proveedor</th>
              <td mat-cell *matCellDef="let row"><span class="provider-pill">{{ row.provider }}</span></td>
            </ng-container>
            <ng-container matColumnDef="account">
              <th mat-header-cell *matHeaderCellDef>Cuenta</th>
              <td mat-cell *matCellDef="let row" [matTooltip]="row.accountName">{{ row.accountName }}</td>
            </ng-container>
            <ng-container matColumnDef="region">
              <th mat-header-cell *matHeaderCellDef>Región</th>
              <td mat-cell *matCellDef="let row">{{ row.region }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status" /></td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Tipo</th>
              <td mat-cell *matCellDef="let row" [matTooltip]="row.instanceType">{{ row.instanceType }}</td>
            </ng-container>
            <ng-container matColumnDef="os">
              <th mat-header-cell *matHeaderCellDef>OS</th>
              <td mat-cell *matCellDef="let row" [matTooltip]="row.os">{{ row.os }}</td>
            </ng-container>
            <ng-container matColumnDef="publicIp">
              <th mat-header-cell *matHeaderCellDef>IP pública</th>
              <td mat-cell *matCellDef="let row" class="mono">{{ row.publicIp }}</td>
            </ng-container>
            <ng-container matColumnDef="privateIp">
              <th mat-header-cell *matHeaderCellDef>IP privada</th>
              <td mat-cell *matCellDef="let row" class="mono">{{ row.privateIp }}</td>
            </ng-container>
            <ng-container matColumnDef="cpu">
              <th mat-header-cell *matHeaderCellDef>CPU</th>
              <td mat-cell *matCellDef="let row">{{ row.cpuCores ?? '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="ram">
              <th mat-header-cell *matHeaderCellDef>RAM</th>
              <td mat-cell *matCellDef="let row">{{ row.ramGb != null ? row.ramGb + ' GB' : '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="disk">
              <th mat-header-cell *matHeaderCellDef>Disco</th>
              <td mat-cell *matCellDef="let row">{{ row.diskGb != null ? row.diskGb + ' GB' : '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="cost">
              <th mat-header-cell *matHeaderCellDef>Coste/mes</th>
              <td mat-cell *matCellDef="let row">{{ formatCost(row.monthlyCost) }}</td>
            </ng-container>
            <ng-container matColumnDef="docker">
              <th mat-header-cell *matHeaderCellDef>Docker</th>
              <td mat-cell *matCellDef="let row">
                @if (row.hasDocker) { <mat-icon class="ok-icon" matTooltip="Docker detectado">check_circle</mat-icon> }
                @else { <span class="muted">—</span> }
              </td>
            </ng-container>
            <ng-container matColumnDef="k8s">
              <th mat-header-cell *matHeaderCellDef>K8s</th>
              <td mat-cell *matCellDef="let row">
                @if (row.hasKubernetes) { <mat-icon class="ok-icon" matTooltip="Kubernetes detectado">check_circle</mat-icon> }
                @else { <span class="muted">—</span> }
              </td>
            </ng-container>
            <ng-container matColumnDef="alerts">
              <th mat-header-cell *matHeaderCellDef>Alertas</th>
              <td mat-cell *matCellDef="let row">
                @if (row.alertCount) {
                  <span class="alert-count">{{ row.alertCount }}</span>
                } @else { <span class="muted">0</span> }
              </td>
            </ng-container>
            <ng-container matColumnDef="synced">
              <th mat-header-cell *matHeaderCellDef>Última sync</th>
              <td mat-cell *matCellDef="let row">{{ formatDate(row.lastSyncedAt) }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button type="button" [matMenuTriggerFor]="menu" aria-label="Acciones de instancia">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item type="button" (click)="select.emit(row)"><mat-icon>visibility</mat-icon> Ver detalle</button>
                  <button mat-menu-item type="button" (click)="runDemo('Metrics', row.name)"><mat-icon>monitoring</mat-icon> Ver métricas</button>
                  <button mat-menu-item type="button" (click)="runDemo('Terminal', row.name)"><mat-icon>terminal</mat-icon> Abrir terminal</button>
                  <button mat-menu-item type="button" (click)="runDemo('Docker', row.name)"><mat-icon>view_in_ar</mat-icon> Ver Docker</button>
                  <button mat-menu-item type="button" (click)="runDemo('Kubernetes', row.name)"><mat-icon>hub</mat-icon> Ver Kubernetes</button>
                  <button mat-menu-item type="button" (click)="runDemo('Billing', row.name)"><mat-icon>payments</mat-icon> Ver facturación</button>
                  <button mat-menu-item type="button" (click)="runDemo('Alerts', row.name)"><mat-icon>warning</mat-icon> Ver alertas</button>
                  <button mat-menu-item type="button" (click)="runDemo('Audit', row.name)"><mat-icon>history</mat-icon> Ver auditoría</button>
                  <button mat-menu-item type="button" (click)="runDemo('Restart', row.name)"><mat-icon>restart_alt</mat-icon> Reiniciar demo</button>
                  <button mat-menu-item type="button" (click)="runDemo('Verify', row.name)"><mat-icon>verified</mat-icon> Verificar demo</button>
                </mat-menu>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: cols" class="table-row-hover"></tr>
          </table>
        </div>
        <mat-paginator
          [length]="filtered().length"
          [pageSize]="pageSize()"
          [pageIndex]="pageIndex()"
          [pageSizeOptions]="[10, 25, 50]"
          (page)="handlePage($event)"
          aria-label="Paginación de instancias"
        />
      }
    </div>
  `,
  styles: `
    .instance-overview {
      padding: 1.35rem 1.5rem;
      border-radius: var(--app-radius-lg);
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
    }
    .instance-overview__head {
      margin-bottom: 1rem;
      h3 {
        display: flex; align-items: center; gap: 0.45rem;
        margin: 0; font-size: 1.05rem; font-weight: 700;
        mat-icon { color: var(--app-accent); }
      }
      p { margin: 0.25rem 0 0; font-size: 0.82rem; color: var(--app-text-muted); }
    }
    .instance-overview__filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1rem;
      mat-form-field { min-width: 160px; flex: 1; }
      .filter-search { min-width: 220px; flex: 2; }
    }
    .instance-overview__scroll {
      overflow-x: auto;
      overflow-y: visible;
      margin: 0 -0.5rem;
      padding: 0 0.5rem 0.5rem;
    }
    .instance-table {
      min-width: 1400px;
      th, td {
        white-space: nowrap;
        padding: 0.75rem 0.85rem !important;
        font-size: 0.8125rem;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
    .name-link {
      border: none;
      background: none;
      color: var(--app-accent);
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      font-size: inherit;
      text-align: left;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-block;
      vertical-align: middle;
    }
    .demo-tag {
      margin-left: 0.35rem;
      font-size: 0.6rem;
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      color: var(--app-accent);
      vertical-align: middle;
    }
    .provider-pill {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 10%, transparent);
    }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }
    .ok-icon { color: var(--app-success); font-size: 18px; width: 18px; height: 18px; }
    .alert-count {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-danger) 12%, transparent);
      color: var(--app-danger);
    }
    .muted { color: var(--app-text-muted); font-size: 0.78rem; }
  `,
})
export class InstanceOverviewTableComponent {
  private readonly demoActions = inject(DemoActionsService)

  @Input({ required: true }) rows: DashboardInstanceRow[] = []
  readonly select = output<DashboardInstanceRow>()

  readonly cols = [
    'name', 'provider', 'account', 'region', 'status', 'type', 'os',
    'publicIp', 'privateIp', 'cpu', 'ram', 'disk', 'cost', 'docker', 'k8s', 'alerts', 'synced', 'actions',
  ]

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly providerControl = new FormControl('', { nonNullable: true })
  readonly statusControl = new FormControl('', { nonNullable: true })
  readonly regionControl = new FormControl('', { nonNullable: true })
  readonly envControl = new FormControl('', { nonNullable: true })

  readonly pageIndex = signal(0)
  readonly pageSize = signal(10)

  private readonly search = toSignal(this.searchControl.valueChanges.pipe(startWith(''), debounceTime(200)), { initialValue: '' })
  private readonly provider = toSignal(this.providerControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly status = toSignal(this.statusControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly region = toSignal(this.regionControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly env = toSignal(this.envControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  regions = computed(() => [...new Set(this.rows.map((r) => r.region).filter(Boolean))] as string[])

  filtered = computed(() => {
    const q = this.search().toLowerCase()
    return this.rows.filter((r) => {
      if (this.provider() && r.provider !== this.provider()) return false
      if (this.status() && r.status !== this.status()) return false
      if (this.region() && r.region !== this.region()) return false
      if (this.env() && String(r.environment).toLowerCase() !== this.env()) return false
      if (!q) return true
      const hay = [r.name, r.accountName, r.publicIp, r.privateIp, r.region, r.provider].join(' ').toLowerCase()
      return hay.includes(q)
    })
  })

  paged = computed(() => {
    const start = this.pageIndex() * this.pageSize()
    return this.filtered().slice(start, start + this.pageSize())
  })

  handlePage = (ev: PageEvent): void => {
    this.pageIndex.set(ev.pageIndex)
    this.pageSize.set(ev.pageSize)
  }

  formatCost = (v: number | null | undefined): string => {
    if (v == null) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
  }

  formatDate = (v: string | Date | undefined): string => {
    if (!v) return '—'
    return new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  runDemo = (action: string, name: string): void => {
    this.demoActions.simulate(`${action} — ${name}`, 400).subscribe()
  }
}
