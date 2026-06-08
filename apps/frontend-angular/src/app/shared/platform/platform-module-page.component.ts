import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  computed,
  OnInit,
} from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { debounceTime, startWith, delay, of, timeout, finalize } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../components/page-header/page-header.component'
import { LoadingStateComponent } from '../components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../components/error-state/error-state.component'
import { StatusBadgeComponent } from '../components/status-badge/status-badge.component'
import { NavIconComponent } from '../components/nav-icon/nav-icon.component'
import { PlatformActionService } from './platform-action.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { ModuleOptionalCtaComponent } from '../components/module-optional-cta/module-optional-cta.component'
import { getInternalEmptyCopy, shouldShowOptionalCloudCta } from '../../core/routing/module-requirements.util'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
import { getPlatformRowOps, isPlatformScopeModule } from './platform-module-ops.catalog'
import { observabilityModuleMeta } from './observability-meta.util'
import type { PlatformModuleConfig, PlatformModuleTab } from './platform-module.models'

@Component({
  selector: 'app-platform-module-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    ModuleOptionalCtaComponent,
    StatusBadgeComponent,
    NavIconComponent,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  template: `
    <div class="page-container platform-module animate-fade-in">
      <app-page-header
        [title]="effectiveConfig().title"
        [description]="effectiveConfig().description"
        [icon]="effectiveConfig().icon"
        [demoMode]="pro.demoMode()"
        [actions]="effectiveConfig().headerActions"
        (actionClick)="handleHeaderAction($event)"
      />

      @if (loading()) {
        <app-loading-state message="Cargando módulo…" />
      } @else if (error()) {
        <app-error-state [message]="error()!" (retry)="load()" />
      } @else {
        @if (showCloudCta()) {
          <app-module-optional-cta />
        }
        @if (isObservability()) {
          <div class="obs-integration-bar">
            <app-nav-icon [logo]="obsMeta().primaryLogo" size="md" />
            <div>
              <strong>{{ obsMeta().label }}</strong>
              <span>{{ obsMeta().stackLabel }}</span>
            </div>
            <div class="obs-integration-bar__logos">
              @for (logo of obsMeta().integrations; track logo) {
                <span class="obs-logo-chip" [attr.title]="logo"><app-nav-icon [logo]="logo" size="sm" /></span>
              }
            </div>
          </div>
        }

        @if (effectiveConfig().summaryCards.length) {
          <div class="obs-summary-row">
            @for (card of effectiveConfig().summaryCards; track card.title) {
              <article class="obs-summary-card" [attr.data-tone]="card.iconColor ?? 'primary'">
                <mat-icon>{{ card.icon }}</mat-icon>
                <div>
                  <span>{{ card.title }}</span>
                  <strong>{{ card.value }}</strong>
                  @if (card.trend) { <small>{{ card.trend }}</small> }
                </div>
              </article>
            }
          </div>
        }

        @if (effectiveConfig().quickActions?.length) {
          <div class="hub-quick-actions">
            @for (qa of effectiveConfig().quickActions!; track qa.label) {
              <button type="button" class="hub-action-chip" (click)="runQuickAction(qa.label)">
                <mat-icon>{{ qa.icon }}</mat-icon>
                {{ qa.label }}
              </button>
            }
          </div>
        }

        <div class="table-card platform-module__panel">
          <mat-tab-group
            class="soft-tabs"
            animationDuration="280ms"
            [selectedIndex]="tabIndex()"
            (selectedIndexChange)="onTabChange($event)"
          >
            @for (tab of effectiveConfig().tabs; track tab.label; let i = $index) {
              <mat-tab [label]="tab.label">
                <div class="tab-panel hub-tab-panel">
                  @if (tab.filters?.length || tab.searchPlaceholder) {
                    <div class="filter-row table-toolbar">
                      @if (tab.searchPlaceholder) {
                        <mat-form-field appearance="outline">
                          <mat-label>Buscar</mat-label>
                          <input
                            matInput
                            [formControl]="searchControl"
                            [placeholder]="tab.searchPlaceholder"
                            [attr.aria-label]="tab.searchPlaceholder"
                          />
                          <mat-hint>{{ tab.searchPlaceholder }}</mat-hint>
                        </mat-form-field>
                      }
                      @for (f of tab.filters ?? []; track f.key) {
                        <mat-form-field appearance="outline">
                          <mat-label>{{ f.label }}</mat-label>
                          <mat-select
                            [value]="filterValues()[f.key] ?? ''"
                            (selectionChange)="onFilterChange(f.key, $event.value)"
                          >
                            @for (opt of f.options; track opt) {
                              <mat-option [value]="opt">{{ opt || 'Todos' }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                      }
                    </div>
                  }

                  @if (filteredRows(tab, i).length === 0) {
                    <app-empty-state
                      [title]="tab.emptyMessage ?? emptyCopy().title"
                      [description]="emptyCopy().message"
                      icon="inbox"
                    />
                  } @else {
                    <div class="platform-module__body">
                      <div class="data-table-wrap">
                        <table class="premium-table table-row-hover">
                          <thead>
                            <tr>
                              @for (col of tab.columns; track col.key) {
                                <th>{{ col.label }}</th>
                              }
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (row of filteredRows(tab, i); track rowTrack(row, $index)) {
                              <tr>
                                @for (col of tab.columns; track col.key) {
                                  <td>
                                    @if (col.type === 'status') {
                                      <app-status-badge [value]="$any(row[col.key])" />
                                    } @else if (col.type === 'severity') {
                                      <span class="severity-pill severity-pill--{{ severityKey(row[col.key]) }}">
                                        {{ row[col.key] }}
                                      </span>
                                    } @else if (col.type === 'date') {
                                      {{ formatDate(row[col.key]) }}
                                    } @else if (col.type === 'logo') {
                                      <app-nav-icon [logo]="$any(row[col.key])" size="sm" />
                                    } @else {
                                      {{ row[col.key] }}
                                    }
                                  </td>
                                }
                                <td>
                                  @if (effectiveConfig().id === 'reports') {
                                    <button mat-stroked-button type="button" class="row-detail-btn" (click)="openRowDetail(row, tab.label)">
                                      <mat-icon>article</mat-icon> Leer informe
                                    </button>
                                  } @else {
                                    <button mat-stroked-button type="button" class="row-detail-btn" (click)="openRowDetail(row, tab.label)">
                                      <mat-icon>visibility</mat-icon> Ver
                                    </button>
                                  }
                                  <button
                                    mat-icon-button
                                    [matMenuTriggerFor]="rowMenu"
                                    aria-label="Acciones de fila"
                                    (click)="selectRow(row, tab.label)"
                                  >
                                    <mat-icon>more_vert</mat-icon>
                                  </button>
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  }
                </div>
              </mat-tab>
            }
          </mat-tab-group>
        </div>
      }

      <mat-menu #rowMenu="matMenu">
        @for (item of rowMenuItems(); track item.id) {
          <button
            mat-menu-item
            type="button"
            [disabled]="item.disabled"
            [attr.title]="item.disabledReason ?? null"
            (click)="runRowAction(item.id, item.label)"
          >
            <mat-icon>{{ item.icon }}</mat-icon>
            {{ item.label }}
          </button>
        }
      </mat-menu>
    </div>
  `,
  styles: `
    .platform-module__panel { overflow: hidden; }
    .severity-pill {
      display: inline-flex;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    .severity-pill--critical { color: #ef4444; background: color-mix(in srgb, #ef4444 22%, transparent); }
    .severity-pill--warning { color: #f59e0b; background: color-mix(in srgb, #f59e0b 22%, transparent); }
    .severity-pill--info { color: #38bdf8; background: color-mix(in srgb, #38bdf8 22%, transparent); }
    .obs-integration-bar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.65rem 1rem;
      padding: 0.65rem 0.85rem; margin-bottom: 0.75rem;
      border-left: 3px solid var(--cat-observability, #10b981);
      background: color-mix(in srgb, #10b981 5%, transparent);
      strong { display: block; font-size: 0.82rem; }
      span { font-size: 0.68rem; color: var(--app-text-muted); }
    }
    .obs-integration-bar__logos { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-left: auto; }
    .obs-logo-chip {
      display: inline-flex; padding: 0.15rem 0.35rem; border-radius: 6px;
      background: #fff; border: 1px solid #0000000d;
    }
    .obs-summary-row {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.5rem; margin-bottom: 0.85rem;
    }
    .obs-summary-card {
      display: flex; gap: 0.45rem; align-items: flex-start; padding: 0.55rem 0.65rem;
      border-left: 3px solid #10b981; background: color-mix(in srgb, var(--app-text) 3%, transparent);
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: #047857; }
      span { display: block; font-size: 0.62rem; text-transform: uppercase; color: var(--app-text-muted); }
      strong { display: block; font-size: 1rem; font-weight: 800; margin-top: 0.08rem; }
      small { font-size: 0.62rem; color: #047857; }
    }
    .obs-summary-card[data-tone='warn'] { border-left-color: #f59e0b; mat-icon { color: #b45309; } }
    .obs-summary-card[data-tone='cyan'] { border-left-color: #06b6d4; mat-icon { color: #0891b2; } }
    .row-detail-btn { margin-right: 0.15rem; font-size: 0.72rem; mat-icon { font-size: 1rem; width: 1rem; height: 1rem; margin-right: 0.1rem; } }
  `,
})
export class PlatformModulePageComponent implements OnInit {
  readonly config = input.required<PlatformModuleConfig>()

  private readonly actions = inject(PlatformActionService)
  readonly pro = inject(ProModeService)

  readonly loading = signal(true)
  readonly error = signal<string | null>(null)
  readonly tabIndex = signal(0)
  readonly selectedRow = signal<Record<string, unknown> | null>(null)
  readonly selectedTabLabel = signal('')
  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly filterValues = signal<Record<string, string>>({})

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )

  readonly effectiveConfig = computed(() => {
    const cfg = this.config()
    if (!this.pro.proMode() || allowsDemoDataFrom(this.pro)) return cfg
    return {
      ...cfg,
      summaryCards: [],
      quickActions: [],
      tabs: cfg.tabs.map((tab) => ({ ...tab, rows: [], charts: [] })),
    }
  })

  activeTab = computed(
    () => this.effectiveConfig().tabs[this.tabIndex()] ?? this.effectiveConfig().tabs[0],
  )

  readonly observabilityIds = new Set(['logs', 'incidents', 'cost-optimizer', 'reports', 'change-management'])

  isObservability = (): boolean => this.observabilityIds.has(this.effectiveConfig().id)

  obsMeta = () => observabilityModuleMeta(this.effectiveConfig().id)

  readonly emptyCopy = computed(() => getInternalEmptyCopy(this.effectiveConfig().id))

  readonly showCloudCta = computed(
    () => this.pro.proMode() && shouldShowOptionalCloudCta(this.effectiveConfig().id) && !this.hasAnyRows(),
  )

  private hasAnyRows = (): boolean => this.effectiveConfig().tabs.some((t) => t.rows.length > 0)

  openRowDetail = (row: Record<string, unknown>, tabLabel: string): void => {
    this.actions.openDetail(this.config().id, row, tabLabel)
  }

  rowMenuItems = computed(() => {
    const row = this.selectedRow()
    const tab = this.selectedTabLabel() || this.activeTab().label
    const moduleId = this.effectiveConfig().id
    if (!row) return []
    if (isPlatformScopeModule(moduleId)) {
      return getPlatformRowOps(moduleId, tab, row)
    }
    return getPlatformRowOps(moduleId, tab, row)
  })

  onFilterChange = (key: string, value: string): void => {
    this.filterValues.update((m) => ({ ...m, [key]: value }))
  }

  ngOnInit(): void {
    this.load()
  }

  load = (): void => {
    this.loading.set(true)
    this.error.set(null)
    of(true)
      .pipe(
        delay(400),
        timeout(5000),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => {},
        error: () => this.error.set('No se pudo cargar el módulo'),
      })
  }

  filteredRows = (tab: PlatformModuleTab, tabIdx: number): Record<string, unknown>[] => {
    if (this.tabIndex() !== tabIdx) return tab.rows
    const term = (this.searchTerm() ?? '').toLowerCase()
    const filters = this.filterValues()
    return tab.rows.filter((row) => {
      const text = JSON.stringify(row).toLowerCase()
      const matchSearch = !term || text.includes(term)
      const matchFilters = (tab.filters ?? []).every((f) => {
        const val = filters[f.key] ?? ''
        if (!val) return true
        return String(row[f.key] ?? '').toLowerCase() === val.toLowerCase()
      })
      return matchSearch && matchFilters
    })
  }

  onTabChange = (idx: number): void => {
    this.tabIndex.set(idx)
    this.searchControl.setValue('')
    this.filterValues.set({})
  }

  rowTrack = (row: Record<string, unknown>, i: number): string =>
    String(row['id'] ?? row['name'] ?? row['action'] ?? i)

  severityKey = (v: unknown): string => String(v ?? 'info').toLowerCase()

  formatDate = (v: unknown): string => {
    if (!v) return '—'
    try {
      return new Date(String(v)).toLocaleString('es-ES')
    } catch {
      return String(v)
    }
  }

  selectRow = (row: Record<string, unknown>, tabLabel: string): void => {
    this.selectedRow.set(row)
    this.selectedTabLabel.set(tabLabel)
  }

  handleHeaderAction = (label: string): void => {
    this.actions.runModuleAction(this.config().id, label, this.activeTab().label, undefined, () => this.load())
  }

  runQuickAction = (label: string): void => {
    this.actions.runQuickAction(this.config().id, label, this.activeTab().label)
  }

  runRowAction = (actionId: string, actionLabel: string): void => {
    const row = this.selectedRow()
    if (!row) return
    this.actions.runRowAction(this.config().id, actionId, row, this.selectedTabLabel(), actionLabel)
  }
}
