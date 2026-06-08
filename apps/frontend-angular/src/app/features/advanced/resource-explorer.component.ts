import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core'
import { RouterLink } from '@angular/router'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatDialog } from '@angular/material/dialog'
import { debounceTime, startWith, delay, of } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import {
  ResourceExplorerDetailDialogComponent,
  type ResourceExplorerDetailDialogResult,
} from './resource-explorer-detail-dialog.component'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { ToastService } from '../../core/services/toast.service'
import { ModuleOptionalCtaComponent } from '../../shared/components/module-optional-cta/module-optional-cta.component'
import { getInternalEmptyCopy } from '../../core/routing/module-requirements.util'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
import {
  EXPLORER_RESOURCES_RICH,
  EXPLORER_TYPE_FILTERS,
  type ExplorerResourceRich,
} from '../overview/overview-pages.demo'

const nowTime = (): string =>
  new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

@Component({
  selector: 'app-resource-explorer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ModuleOptionalCtaComponent,
    StatusBadgeComponent,
    BrandLogoComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div class="exp-page animate-fade-in">
      <app-page-header
        icon="manage_search"
        title="Explorador de recursos"
        description="Índice unificado multi-cloud: instancias, cuentas, contenedores, pods, CI/CD, redes, alertas y costes — con salud, IP, sync y enlaces directos al módulo origen."
        [lastSync]="lastSyncLabel()"
        [actions]="[
          { label: 'Actualizar índice', icon: 'refresh', primary: true },
          { label: 'Exportar CSV', icon: 'download' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      @if (loading()) {
        <app-loading-state message="Indexando recursos multi-cloud…" />
      } @else {
        @if (pro.proMode() && !resources.length) {
          <app-module-optional-cta />
        }
        <div class="exp-providers" role="list" aria-label="Filtrar por proveedor">
          @for (p of providerPills; track p.key) {
            <button
              type="button"
              class="exp-provider"
              [class.exp-provider--active]="providerFilter() === p.key"
              role="listitem"
              (click)="setProvider(p.key)"
            >
              @if (p.logo) { <app-brand-logo [logo]="p.logo" size="sm" /> }
              <strong>{{ p.label }}</strong>
              <em>{{ p.count }}</em>
            </button>
          }
        </div>

        <div class="exp-toolbar">
          <div class="exp-types">
            @for (t of typeFilters; track t.key) {
              <button
                type="button"
                class="exp-type"
                [class.exp-type--active]="typeFilter() === t.key"
                (click)="setType(t.key)"
              >
                {{ t.label }} <span>{{ t.count }}</span>
              </button>
            }
          </div>
          <div class="exp-filters">
            <mat-form-field appearance="fill" class="exp-search" subscriptSizing="dynamic">
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [formControl]="searchControl" placeholder="Nombre, ID, IP, tags…" aria-label="Buscar recursos" />
            </mat-form-field>
            <mat-form-field appearance="fill" subscriptSizing="dynamic">
              <mat-label>Estado</mat-label>
              <mat-select [formControl]="statusControl">
                <mat-option value="">Todos</mat-option>
                <mat-option value="running">En ejecución</mat-option>
                <mat-option value="active">Activo</mat-option>
                <mat-option value="success">Correcto</mat-option>
                <mat-option value="warning">Advertencia</mat-option>
                <mat-option value="failed">Fallido</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="fill" subscriptSizing="dynamic">
              <mat-label>Salud</mat-label>
              <mat-select [formControl]="healthControl">
                <mat-option value="">Todas</mat-option>
                <mat-option value="healthy">Sana</mat-option>
                <mat-option value="warning">Advertencia</mat-option>
                <mat-option value="critical">Crítica</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        @if (selectedResource(); as sel) {
          <article class="exp-preview" aria-live="polite">
            <header class="exp-preview__head">
              <div class="exp-preview__title">
                @if (sel.logo) { <app-brand-logo [logo]="sel.logo" size="sm" /> }
                <div>
                  <strong>{{ sel.name }}</strong>
                  <span>{{ sel.type }} · {{ sel.provider }} · {{ sel.region }}</span>
                </div>
              </div>
              <div class="exp-preview__badges">
                <app-status-badge [value]="sel.status" />
                @if (sel.health) {
                  <span class="exp-health" [class]="'exp-health--' + sel.health">{{ healthLabel(sel.health) }}</span>
                }
              </div>
            </header>
            <div class="exp-preview__grid">
              <div><span>Cuenta</span><strong>{{ sel.account ?? '—' }}</strong></div>
              <div><span>IP</span><strong>{{ sel.ip ?? '—' }}</strong></div>
              <div><span>CPU</span><strong>{{ sel.cpu ?? '—' }}</strong></div>
              <div><span>Memoria</span><strong>{{ sel.memory ?? '—' }}</strong></div>
              <div><span>Uptime</span><strong>{{ sel.uptime ?? '—' }}</strong></div>
              <div><span>Coste</span><strong>{{ sel.cost ?? '—' }}</strong></div>
              <div><span>Propietario</span><strong>{{ sel.owner ?? '—' }}</strong></div>
              <div><span>Entorno</span><strong>{{ envLabel(sel.environment) }}</strong></div>
              <div><span>Riesgo</span><strong [class]="sel.risk ? 'exp-risk exp-risk--' + sel.risk : ''">{{ sel.risk ? riskLabel(sel.risk) : '—' }}</strong></div>
              <div><span>Alertas</span><strong>{{ sel.alertsActive ?? 0 }}</strong></div>
              <div><span>Módulo</span><strong>{{ sel.module ?? '—' }}</strong></div>
              <div><span>Último sync</span><strong>{{ sel.lastSync ?? '—' }}</strong></div>
            </div>
            <p class="exp-preview__detail">{{ sel.detail }}</p>
            @if (sel.network) { <p class="exp-preview__meta"><mat-icon>cable</mat-icon> {{ sel.network }}</p> }
            @if (tagList(sel).length) {
              <div class="exp-preview__tag-row">
                @for (tag of tagList(sel); track tag) {
                  <span class="exp-preview__tag">{{ tag }}</span>
                }
              </div>
            }
            <footer class="exp-preview__actions">
              @if (sel.route) {
                <a [routerLink]="sel.route" class="exp-btn exp-btn--primary">Abrir módulo</a>
              }
              <button type="button" class="exp-btn" (click)="viewDetail(sel)">
                <mat-icon>info</mat-icon>
                Ver detalle completo
              </button>
            </footer>
          </article>
        }

        @if (filtered().length === 0) {
          <app-empty-state
            [title]="resources.length ? 'Sin resultados' : emptyCopy.title"
            [description]="resources.length ? 'Prueba con otros filtros o términos de búsqueda.' : emptyCopy.message"
            icon="search_off"
          />
        } @else {
          <section class="exp-table-section">
            <header class="exp-table-head">
              <strong>{{ filtered().length }} recursos</strong>
              <span>Coste estimado filtrado: {{ filteredCost() }}</span>
            </header>
            <div class="data-table-wrap">
              <table class="premium-table table-row-hover exp-table">
                <thead>
                  <tr>
                    <th>Recurso</th>
                    <th>Tipo</th>
                    <th>Proveedor</th>
                    <th>Región</th>
                    <th>Salud</th>
                    <th>Estado</th>
                    <th>Entorno</th>
                    <th>Riesgo</th>
                    <th>Coste</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of filtered(); track row.id) {
                    <tr
                      tabindex="0"
                      [class.exp-row--selected]="selectedId() === row.id"
                      (click)="selectResource(row)"
                      (keydown.enter)="selectResource(row)"
                    >
                      <td>
                        <strong>{{ row.name }}</strong>
                        <small>{{ row.id }}</small>
                        @if (row.account) { <small>{{ row.account }}</small> }
                      </td>
                      <td>{{ row.type }}</td>
                      <td>
                        <span class="exp-cell-logo">
                          @if (row.logo) { <app-brand-logo [logo]="row.logo" size="sm" /> }
                          {{ row.provider }}
                        </span>
                      </td>
                      <td>{{ row.region }}</td>
                      <td>
                        @if (row.health) {
                          <span class="exp-health exp-health--compact" [class]="'exp-health--' + row.health">
                            {{ healthLabel(row.health) }}
                          </span>
                        } @else { — }
                      </td>
                      <td><app-status-badge [value]="row.status" /></td>
                      <td>{{ envLabel(row.environment) }}</td>
                      <td>
                        @if (row.risk) {
                          <span class="exp-risk exp-risk--compact" [class]="'exp-risk--' + row.risk">{{ riskLabel(row.risk) }}</span>
                        } @else { — }
                      </td>
                      <td>{{ row.cost ?? '—' }}</td>
                      <td class="exp-actions" (click)="$event.stopPropagation()">
                        <button type="button" class="exp-link exp-link--btn" (click)="viewDetail(row)" [attr.aria-label]="'Ver detalle de ' + row.name">Detalle</button>
                        @if (row.route) {
                          <a [routerLink]="row.route" class="exp-link">Abrir</a>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .exp-page { display: flex; flex-direction: column; gap: 0.65rem; }
    .exp-hero {
      border-radius: var(--app-radius-md);
      background: var(--app-card);
      overflow: hidden;
    }
    .exp-hero__kpis {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 0;
      padding: 0.45rem 0.5rem 0.5rem;
    }
    .exp-kpi {
      position: relative;
      padding: 0.4rem 0.55rem 0.42rem 0.65rem;
      min-width: 0;
    }
    .exp-kpi:not(:last-child) {
      border-right: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .exp-kpi__accent {
      position: absolute;
      inset: 0 auto 0 0;
      width: 2px;
    }
    .exp-kpi--blue .exp-kpi__accent { background: #3b82f6; }
    .exp-kpi--green .exp-kpi__accent { background: #10b981; }
    .exp-kpi--orange .exp-kpi__accent { background: #f59e0b; }
    .exp-kpi--violet .exp-kpi__accent { background: #8b5cf6; }
    .exp-kpi--cyan .exp-kpi__accent { background: #06b6d4; }
    .exp-kpi--red .exp-kpi__accent { background: #ef4444; }
    .exp-kpi__label {
      display: block;
      font-size: 0.56rem;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }
    .exp-kpi__value {
      display: block;
      font-size: 1.1rem;
      font-weight: 850;
      letter-spacing: -0.03em;
      line-height: 1.15;
    }
    .exp-kpi__hint {
      font-size: 0.56rem;
      color: var(--app-text-muted);
      font-weight: 600;
    }
    .exp-providers { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .exp-provider {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.55rem;
      border-radius: 10px;
      border: none;
      background: color-mix(in srgb, var(--app-surface) 30%, var(--app-card));
      cursor: pointer;
      strong { font-size: 0.68rem; }
      em { font-style: normal; font-size: 0.58rem; color: var(--app-text-muted); font-weight: 800; }
    }
    .exp-provider--active {
      background: color-mix(in srgb, var(--app-accent) 10%, var(--app-card));
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--app-accent) 22%, transparent);
      strong { color: var(--app-accent); }
    }
    .exp-toolbar {
      padding: 0.55rem 0.65rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--app-surface) 18%, var(--app-card));
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .exp-types { display: flex; flex-wrap: wrap; gap: 0.28rem; }
    .exp-type {
      padding: 0.22rem 0.48rem;
      border-radius: 8px;
      border: none;
      background: color-mix(in srgb, var(--app-text) 4%, transparent);
      font-size: 0.62rem;
      font-weight: 700;
      cursor: pointer;
      span { font-size: 0.55rem; opacity: 0.7; margin-left: 0.15rem; }
    }
    .exp-type--active {
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      color: var(--app-accent);
    }
    .exp-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      align-items: center;
    }
    .exp-search {
      flex: 2;
      min-width: 180px;
      margin: 0;
      ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    }
    .exp-preview {
      padding: 0.65rem 0.75rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--app-accent) 4%, var(--app-card));
    }
    .exp-preview__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .exp-preview__title {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      strong { display: block; font-size: 0.85rem; }
      span { display: block; font-size: 0.62rem; color: var(--app-text-muted); font-weight: 600; }
    }
    .exp-preview__badges { display: flex; gap: 0.35rem; align-items: center; }
    .exp-preview__grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 0.45rem;
      margin-bottom: 0.45rem;
      span { display: block; font-size: 0.55rem; color: var(--app-text-muted); font-weight: 700; text-transform: uppercase; }
      strong { font-size: 0.72rem; font-weight: 750; }
    }
    .exp-preview__detail { margin: 0; font-size: 0.68rem; line-height: 1.4; }
    .exp-preview__meta {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin: 0.25rem 0 0;
      font-size: 0.62rem;
      color: var(--app-text-muted);
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .exp-preview__tag-row { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.35rem; }
    .exp-preview__tag {
      font-size: 0.55rem;
      font-weight: 700;
      padding: 0.12rem 0.35rem;
      border-radius: 6px;
      background: color-mix(in srgb, var(--app-accent) 8%, transparent);
      color: var(--app-accent);
    }
    .exp-preview__actions { display: flex; gap: 0.35rem; margin-top: 0.5rem; }
    .exp-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.3rem 0.6rem;
      border-radius: 8px;
      border: none;
      background: color-mix(in srgb, var(--app-text) 5%, var(--app-card));
      font-size: 0.64rem;
      font-weight: 750;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .exp-btn--primary {
      background: color-mix(in srgb, var(--app-accent) 12%, var(--app-card));
      color: var(--app-accent);
    }
    .exp-table-section {
      padding: 0.55rem 0.65rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--app-surface) 15%, var(--app-card));
    }
    .exp-table-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.45rem;
      strong { font-size: 0.75rem; }
      span { font-size: 0.62rem; color: var(--app-text-muted); font-weight: 650; }
    }
    .exp-table tbody tr { cursor: pointer; }
    .exp-row--selected { background: color-mix(in srgb, var(--app-accent) 6%, transparent) !important; }
    .exp-table small { display: block; font-size: 0.58rem; color: var(--app-text-muted); }
    .exp-cell-logo { display: inline-flex; align-items: center; gap: 0.3rem; }
    .exp-health {
      font-size: 0.58rem;
      font-weight: 800;
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      text-transform: uppercase;
    }
    .exp-health--compact { font-size: 0.55rem; }
    .exp-health--healthy { background: color-mix(in srgb, #10b981 12%, transparent); color: #059669; }
    .exp-health--warning { background: color-mix(in srgb, #f59e0b 12%, transparent); color: #b45309; }
    .exp-health--critical { background: color-mix(in srgb, #ef4444 12%, transparent); color: #dc2626; }
    .exp-actions { white-space: nowrap; display: flex; gap: 0.25rem; }
    .exp-link {
      padding: 0.18rem 0.4rem;
      border-radius: 6px;
      background: color-mix(in srgb, var(--app-accent) 10%, transparent);
      color: var(--app-accent);
      font-size: 0.6rem;
      font-weight: 700;
      text-decoration: none;
    }
    .exp-link--btn {
      border: none;
      cursor: pointer;
      font-family: inherit;
    }
    .exp-risk { font-size: 0.62rem; font-weight: 800; text-transform: capitalize; }
    .exp-risk--compact { font-size: 0.58rem; }
    .exp-risk--low { color: #059669; }
    .exp-risk--medium { color: #b45309; }
    .exp-risk--high { color: #dc2626; }
    @media (max-width: 1100px) {
      .exp-hero__kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .exp-kpi:nth-child(3), .exp-kpi:nth-child(6) { border-right: none; }
      .exp-preview__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 640px) {
      .exp-hero__kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .exp-kpi { border-right: none !important; }
    }
  `,
})
export class ResourceExplorerComponent implements OnInit {
  private readonly demo = inject(DemoActionsService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)
  readonly pro = inject(ProModeService)

  readonly emptyCopy = getInternalEmptyCopy('resource-explorer')
  readonly resources = allowsDemoDataFrom(this.pro) ? EXPLORER_RESOURCES_RICH : []
  readonly typeFilters = EXPLORER_TYPE_FILTERS

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly statusControl = new FormControl('', { nonNullable: true })
  readonly healthControl = new FormControl('', { nonNullable: true })

  readonly loading = signal(true)
  readonly typeFilter = signal('')
  readonly providerFilter = signal('')
  readonly selectedId = signal<string | null>(this.resources[0]?.id ?? null)
  readonly lastSync = signal(nowTime())

  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')), { initialValue: '' })
  private readonly statusFilter = toSignal(this.statusControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly healthFilter = toSignal(this.healthControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  readonly providerPills = [
    { key: '', label: 'Todos', logo: null as null, count: this.resources.length },
    { key: 'AWS', label: 'AWS', logo: 'aws' as const, count: this.resources.filter((r) => r.provider === 'AWS').length },
    { key: 'GCP', label: 'GCP', logo: 'gcp' as const, count: this.resources.filter((r) => r.provider === 'GCP').length },
    { key: 'Azure', label: 'Azure', logo: 'azure' as const, count: this.resources.filter((r) => r.provider === 'Azure').length },
    { key: 'Kubernetes', label: 'K8s', logo: 'kubernetes' as const, count: this.resources.filter((r) => r.provider === 'Kubernetes').length },
    { key: 'Jenkins', label: 'Jenkins', logo: 'jenkins' as const, count: this.resources.filter((r) => r.provider === 'Jenkins').length },
    { key: 'Docker', label: 'Docker', logo: 'docker' as const, count: this.resources.filter((r) => r.provider === 'Docker').length },
    { key: 'Terraform', label: 'TF', logo: 'terraform' as const, count: this.resources.filter((r) => r.provider === 'Terraform').length },
    { key: 'VPS', label: 'VPS', logo: null as null, count: this.resources.filter((r) => r.provider === 'VPS').length },
  ]

  readonly filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const type = this.typeFilter()
    const provider = this.providerFilter()
    const status = this.statusFilter()
    const health = this.healthFilter()
    return this.resources.filter((r) => {
      const matchTerm = !term || `${r.name} ${r.id} ${r.detail} ${r.tags ?? ''} ${r.ip ?? ''} ${r.account ?? ''}`.toLowerCase().includes(term)
      const matchType = !type || r.typeKey === type
      const matchProvider = !provider || r.provider === provider
      const matchStatus = !status || r.status === status
      const matchHealth = !health || r.health === health
      return matchTerm && matchType && matchProvider && matchStatus && matchHealth
    })
  })

  readonly selectedResource = computed(() => {
    const id = this.selectedId()
    if (!id) return null
    return this.resources.find((r) => r.id === id) ?? null
  })

  readonly lastSyncLabel = computed(() => `Índice ${this.lastSync()}`)

  filteredCost = (): string => {
    const nums = this.filtered()
      .map((r) => r.cost?.match(/([\d.]+)/)?.[1])
      .filter(Boolean)
      .map(Number)
    if (!nums.length) return '—'
    return `~${nums.reduce((a, b) => a + b, 0).toLocaleString('es-ES')} US$/mes`
  }

  ngOnInit(): void {
    of(true).pipe(delay(350)).subscribe(() => this.loading.set(false))
  }

  selectResource = (row: ExplorerResourceRich): void => {
    this.selectedId.set(row.id)
  }

  setType = (key: string): void => this.typeFilter.set(key)
  setProvider = (key: string): void => this.providerFilter.set(key)

  healthLabel = (h: string): string => {
    const map: Record<string, string> = { healthy: 'Sana', warning: 'Adv.', critical: 'Crítica' }
    return map[h] ?? h
  }

  envLabel = (env?: string): string => {
    if (!env) return '—'
    const map: Record<string, string> = { production: 'Prod', staging: 'Staging', development: 'Dev' }
    return map[env] ?? env
  }

  riskLabel = (r: string): string => {
    const map: Record<string, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto' }
    return map[r] ?? r
  }

  tagList = (row: ExplorerResourceRich): string[] => {
    if (!row.tags) return []
    return row.tags.split(',').map((t) => t.trim()).filter(Boolean)
  }

  handleHeader = (label: string): void => {
    if (label === 'Actualizar índice') {
      this.loading.set(true)
      of(true).pipe(delay(500)).subscribe(() => {
        this.loading.set(false)
        this.lastSync.set(nowTime())
        this.toast.success('Índice de recursos actualizado')
      })
      return
    }
    this.demo.simulate('Exportar CSV del explorador', 600, 'CSV exportado con ' + this.filtered().length + ' recursos').subscribe()
  }

  viewDetail = (row: ExplorerResourceRich): void => {
    this.dialog
      .open(ResourceExplorerDetailDialogComponent, {
        width: '960px',
        maxWidth: '96vw',
        maxHeight: '92vh',
        data: { resource: row },
      })
      .afterClosed()
      .subscribe((result: ResourceExplorerDetailDialogResult | undefined) => {
        if (result?.selectId) {
          this.selectedId.set(result.selectId)
        }
      })
  }
}
