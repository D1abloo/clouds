import { Component, Input, output, signal, computed, effect } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator'
import { MatTooltipModule } from '@angular/material/tooltip'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component'
import { InstancePerformancePanelComponent } from './instance-performance-panel.component'
import { DashboardInstanceRow } from '../dashboard.models'
import { instanceProviderLogo } from '../utils/dashboard-instance-detail.util'
import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'

type CloudFilterValue = '' | 'AWS' | 'GCP' | 'AZURE' | 'VPS'
type ProviderTone = 'aws' | 'gcp' | 'azure' | 'vps' | 'default'

interface CloudFilterOption {
  value: CloudFilterValue
  label: string
  logo?: NavLogoKey
}

@Component({
  selector: 'app-instance-overview-table',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatTooltipModule,
    StatusBadgeComponent,
    BrandLogoComponent,
    EmptyStateComponent,
    InstancePerformancePanelComponent,
  ],
  template: `
    <div class="instance-shell">
      <div class="instance-toolbar">
        <div class="instance-toolbar__row">
          <div class="instance-toolbar__clouds" role="group" aria-label="Filtrar por cloud">
            @for (opt of cloudOptions(); track opt.value) {
              <button
                type="button"
                class="cloud-chip"
                [class.cloud-chip--active]="selectedCloud() === opt.value"
                (click)="handleCloudSelect(opt.value)"
              >
                @if (opt.logo) {
                  <app-brand-logo [logo]="opt.logo" size="sm" />
                } @else {
                  <mat-icon>cloud_queue</mat-icon>
                }
                <span>{{ opt.label }}</span>
                <em>{{ cloudCount(opt.value) }}</em>
              </button>
            }
          </div>
          <div class="instance-toolbar__stats">
            <span><strong>{{ filtered().length }}</strong> instancias</span>
            <span><strong>{{ runningCount() }}</strong> activas</span>
            @if (alertCount() > 0) {
              <span class="instance-toolbar__stats-warn"><strong>{{ alertCount() }}</strong> con alertas</span>
            }
          </div>
        </div>

        <div class="instance-toolbar__filters">
          <mat-form-field appearance="outline" class="filter-search">
            <mat-label>Buscar</mat-label>
            <mat-icon matPrefix>search</mat-icon>
            <input matInput [formControl]="searchControl" placeholder="Nombre, IP, cuenta…" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Estado</mat-label>
            <mat-select [formControl]="statusControl">
              <mat-option value="">Todos</mat-option>
              <mat-option value="RUNNING">En ejecución</mat-option>
              <mat-option value="STOPPED">Detenida</mat-option>
              <mat-option value="WARNING">Advertencia</mat-option>
              <mat-option value="ERROR">Error</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Región</mat-label>
            <mat-select [formControl]="regionControl">
              <mat-option value="">Todas</mat-option>
              @for (r of regions(); track r) {
                <mat-option [value]="r">{{ r }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Entorno</mat-label>
            <mat-select [formControl]="envControl">
              <mat-option value="">Todos</mat-option>
              <mat-option value="production">Producción</mat-option>
              <mat-option value="staging">Staging</mat-option>
              <mat-option value="development">Desarrollo</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      @if (!rows.length) {
        <app-empty-state icon="cloud_off" title="Sin instancias" message="Carga datos demo o conecta una cuenta cloud" />
      } @else if (!filtered().length) {
        <app-empty-state icon="filter_alt_off" title="Sin coincidencias" message="Prueba otro cloud o ajusta los filtros" />
      } @else {
        <div class="instance-split">
          <aside class="instance-list">
            <header class="instance-list__head">
              @if (selectedCloudLogo(); as logo) {
                <app-brand-logo [logo]="logo" size="sm" />
              } @else {
                <mat-icon>cloud_queue</mat-icon>
              }
              <div>
                <strong>{{ cloudLabel() }}</strong>
                <span>{{ filtered().length }} en la flota</span>
              </div>
            </header>

            <div class="instance-pickers">
              @for (row of paged(); track row.id) {
                <button
                  type="button"
                  class="instance-picker"
                  [class]="'instance-picker instance-picker--' + providerTone(row.provider)"
                  [class.instance-picker--active]="selectedInstance()?.id === row.id"
                  [attr.aria-pressed]="selectedInstance()?.id === row.id"
                  (click)="handleInstanceSelect(row)"
                >
                  <span class="instance-picker__accent" aria-hidden="true"></span>
                  <div class="instance-picker__body">
                    <div class="instance-picker__head">
                      @if (providerLogo(row.provider); as logo) {
                        <span class="instance-picker__logo">
                          <app-brand-logo [logo]="logo" size="sm" />
                        </span>
                      }
                      <div class="instance-picker__copy">
                        <strong>{{ row.name }}</strong>
                        <span>{{ row.instanceType }} · {{ row.region }}</span>
                      </div>
                      <app-status-badge [value]="row.status" />
                    </div>
                    <div class="instance-picker__meta">
                      <span>{{ row.cpuCores }} vCPU · {{ row.ramGb }} GB</span>
                      <span>{{ formatCost(row.monthlyCost) }}</span>
                      @if (row.alertCount) {
                        <span class="instance-picker__alert">{{ row.alertCount }} alertas</span>
                      }
                    </div>
                  </div>
                </button>
              }
            </div>

            <mat-paginator
              class="instance-list__pager"
              [length]="filtered().length"
              [pageSize]="pageSize()"
              [pageIndex]="pageIndex()"
              [pageSizeOptions]="[8, 16, 32]"
              (page)="handlePage($event)"
              aria-label="Paginación de instancias"
            />
          </aside>

          <div class="instance-detail">
            @if (selectedInstance(); as inst) {
              <app-instance-performance-panel
                [instance]="inst"
                (openFull)="handleOpenFullDetail()"
              />
            } @else {
              <div class="instance-detail__empty">
                @if (selectedCloudLogo(); as logo) {
                  <app-brand-logo [logo]="logo" size="lg" />
                } @else {
                  <mat-icon>insights</mat-icon>
                }
                <strong>Selecciona una instancia</strong>
                <p>Consulta CPU, RAM, disco y alertas de cualquier host de {{ cloudLabel() }}.</p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .instance-shell {
      padding: 0.9rem 1rem 1rem;
      border-radius: 14px;
      background: color-mix(in srgb, var(--app-surface) 38%, var(--app-card));
    }
    .instance-toolbar {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 0.9rem;
    }
    .instance-toolbar__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
    }
    .instance-toolbar__clouds {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .cloud-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border: none;
      padding: 0.38rem 0.65rem;
      border-radius: 999px;
      cursor: pointer;
      background: color-mix(in srgb, var(--app-surface) 55%, var(--app-card));
      color: var(--app-text-muted);
      font-size: 0.68rem;
      font-weight: 650;
      transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
      em {
        font-style: normal;
        font-size: 0.58rem;
        font-weight: 700;
        padding: 0.06rem 0.38rem;
        border-radius: 999px;
        background: color-mix(in srgb, var(--app-text) 6%, transparent);
        font-variant-numeric: tabular-nums;
      }
      mat-icon {
        font-size: 0.95rem;
        width: 0.95rem;
        height: 0.95rem;
        opacity: 0.75;
      }
      &:hover {
        background: color-mix(in srgb, var(--app-accent) 8%, var(--app-card));
        transform: translateY(-1px);
      }
    }
    .cloud-chip--active {
      background: color-mix(in srgb, var(--app-accent) 14%, var(--app-card));
      color: var(--app-accent);
      em { background: color-mix(in srgb, var(--app-accent) 18%, transparent); }
    }
    .instance-toolbar__stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem 0.85rem;
      font-size: 0.66rem;
      color: var(--app-text-muted);
      strong {
        font-size: 0.82rem;
        font-weight: 800;
        color: var(--app-text);
        margin-right: 0.18rem;
      }
    }
    .instance-toolbar__stats-warn strong { color: #d97706; }
    .instance-toolbar__filters {
      display: grid;
      grid-template-columns: minmax(180px, 2fr) repeat(3, minmax(120px, 1fr));
      gap: 0.55rem;
      mat-form-field { width: 100%; margin: 0; }
    }
    .instance-split {
      display: grid;
      grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
      gap: 0.85rem;
      align-items: start;
    }
    .instance-list {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      padding: 0.7rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--app-text) 2.5%, transparent);
    }
    .instance-list__head {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.15rem 0.2rem 0.45rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        color: var(--app-text-muted);
      }
      strong {
        display: block;
        font-size: 0.78rem;
        font-weight: 700;
      }
      span {
        display: block;
        font-size: 0.62rem;
        color: var(--app-text-muted);
      }
    }
    .instance-pickers {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .instance-picker {
      position: relative;
      width: 100%;
      text-align: left;
      border: none;
      padding: 0;
      border-radius: 12px;
      cursor: pointer;
      background: color-mix(in srgb, var(--app-surface) 32%, var(--app-card));
      color: inherit;
      overflow: hidden;
      transition: background 0.18s ease, transform 0.18s ease;
      &:hover {
        background: color-mix(in srgb, var(--app-surface) 18%, var(--app-card));
        transform: translateY(-1px);
      }
    }
    .instance-picker__accent {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
    }
    .instance-picker--aws .instance-picker__accent { background: linear-gradient(180deg, #ff9900, #ffb84d); }
    .instance-picker--gcp .instance-picker__accent { background: linear-gradient(180deg, #4285f4, #669df6); }
    .instance-picker--azure .instance-picker__accent { background: linear-gradient(180deg, #0078d4, #50a3e5); }
    .instance-picker--vps .instance-picker__accent { background: linear-gradient(180deg, #64748b, #94a3b8); }
    .instance-picker--default .instance-picker__accent { background: var(--app-accent); }
    .instance-picker--active {
      background: color-mix(in srgb, var(--app-accent) 10%, var(--app-card));
      outline: 1px solid color-mix(in srgb, var(--app-accent) 28%, transparent);
      outline-offset: -1px;
    }
    .instance-picker__body {
      padding: 0.68rem 0.75rem 0.68rem 0.85rem;
    }
    .instance-picker__head {
      display: flex;
      align-items: flex-start;
      gap: 0.45rem;
    }
    .instance-picker__logo {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--app-surface) 40%, var(--app-card));
    }
    .instance-picker__copy {
      flex: 1;
      min-width: 0;
      strong {
        display: block;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      span {
        display: block;
        margin-top: 0.1rem;
        font-size: 0.62rem;
        color: var(--app-text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    .instance-picker__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.6rem;
      margin-top: 0.42rem;
      padding-left: 2.35rem;
      font-size: 0.62rem;
      color: var(--app-text-muted);
    }
    .instance-picker__alert {
      color: var(--app-danger);
      font-weight: 700;
    }
    .instance-list__pager {
      margin-top: 0.15rem;
      background: transparent;
    }
    .instance-detail {
      min-height: 320px;
      padding: 0.7rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--app-text) 2.5%, transparent);
    }
    .instance-detail__empty {
      min-height: 360px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem 1.5rem;
      color: var(--app-text-muted);
      mat-icon {
        font-size: 2.5rem;
        width: 2.5rem;
        height: 2.5rem;
        opacity: 0.35;
        margin-bottom: 0.65rem;
      }
      strong {
        font-size: 0.9rem;
        color: var(--app-text);
        margin-bottom: 0.35rem;
      }
      p {
        margin: 0;
        font-size: 0.74rem;
        line-height: 1.5;
        max-width: 300px;
      }
    }
    @media (max-width: 1100px) {
      .instance-toolbar__filters {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 960px) {
      .instance-split { grid-template-columns: 1fr; }
      .instance-toolbar__filters { grid-template-columns: 1fr; }
    }
  `,
})
export class InstanceOverviewTableComponent {
  @Input({ required: true }) rows: DashboardInstanceRow[] = []
  readonly select = output<DashboardInstanceRow>()

  readonly selectedCloud = signal<CloudFilterValue>('AWS')
  readonly selectedInstance = signal<DashboardInstanceRow | null>(null)

  readonly cloudFilterDefs: CloudFilterOption[] = [
    { value: '', label: 'Todos' },
    { value: 'AWS', label: 'AWS', logo: 'aws' },
    { value: 'GCP', label: 'GCP', logo: 'gcp' },
    { value: 'AZURE', label: 'Azure', logo: 'azure' },
    { value: 'VPS', label: 'VPS' },
  ]

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly statusControl = new FormControl('', { nonNullable: true })
  readonly regionControl = new FormControl('', { nonNullable: true })
  readonly envControl = new FormControl('', { nonNullable: true })

  readonly pageIndex = signal(0)
  readonly pageSize = signal(8)

  private readonly search = toSignal(this.searchControl.valueChanges.pipe(startWith(''), debounceTime(200)), { initialValue: '' })
  private readonly status = toSignal(this.statusControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly region = toSignal(this.regionControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly env = toSignal(this.envControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  constructor() {
    effect(() => {
      const list = this.filtered()
      const selected = this.selectedInstance()
      if (selected && !list.some((row) => row.id === selected.id)) {
        this.selectedInstance.set(null)
      }
    })
  }

  cloudOptions = (): CloudFilterOption[] => this.cloudFilterDefs

  cloudCount = (value: CloudFilterValue): number =>
    this.filteredByCloud(value).length

  cloudLabel = (): string => {
    const opt = this.cloudFilterDefs.find((item) => item.value === this.selectedCloud())
    return opt?.label ?? 'Cloud'
  }

  selectedCloudLogo = (): NavLogoKey | undefined => {
    const opt = this.cloudFilterDefs.find((item) => item.value === this.selectedCloud())
    return opt?.logo
  }

  runningCount = computed(() =>
    this.filtered().filter((row) => row.status === 'RUNNING').length,
  )

  alertCount = computed(() =>
    this.filtered().reduce((sum, row) => sum + (row.alertCount ?? 0), 0),
  )

  regions = computed(() => {
    const cloud = this.selectedCloud()
    const base = cloud ? this.rows.filter((r) => r.provider === cloud) : this.rows
    return [...new Set(base.map((r) => r.region).filter(Boolean))] as string[]
  })

  filteredByCloud = (cloud: CloudFilterValue): DashboardInstanceRow[] => {
    if (!cloud) return this.rows
    return this.rows.filter((row) => row.provider === cloud)
  }

  filtered = computed(() => {
    const cloud = this.selectedCloud()
    const q = this.search().toLowerCase()
    return this.filteredByCloud(cloud).filter((r) => {
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

  handleCloudSelect = (value: CloudFilterValue): void => {
    this.selectedCloud.set(value)
    this.selectedInstance.set(null)
    this.pageIndex.set(0)
    this.regionControl.setValue('')
  }

  handleInstanceSelect = (row: DashboardInstanceRow): void => {
    this.selectedInstance.set(row)
  }

  handleOpenFullDetail = (): void => {
    const inst = this.selectedInstance()
    if (inst) this.select.emit(inst)
  }

  handlePage = (event: PageEvent): void => {
    this.pageIndex.set(event.pageIndex)
    this.pageSize.set(event.pageSize)
  }

  providerLogo = (provider?: string) => instanceProviderLogo(provider)

  providerTone = (provider?: string): ProviderTone => {
    if (provider === 'AWS') return 'aws'
    if (provider === 'GCP') return 'gcp'
    if (provider === 'AZURE') return 'azure'
    if (provider === 'VPS') return 'vps'
    return 'default'
  }

  formatCost = (value?: number | null): string => {
    if (value == null) return '—'
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mes`
  }
}
