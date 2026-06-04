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
import { MatDialog } from '@angular/material/dialog'
import { debounceTime, startWith, delay, of } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../components/page-header/page-header.component'
import { SummaryCardComponent } from '../components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../components/error-state/error-state.component'
import { StatusBadgeComponent } from '../components/status-badge/status-badge.component'
import { DetailDialogComponent } from '../components/detail-dialog/detail-dialog.component'
import { ChartCardComponent } from '../ui/chart-card.component'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import type { PlatformModuleConfig, PlatformModuleTab } from './platform-module.models'

@Component({
  selector: 'app-platform-module-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    SummaryCardComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    ChartCardComponent,
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
        [title]="config().title"
        [description]="config().description"
        [icon]="config().icon"
        [actions]="config().headerActions"
        [lastSync]="lastSync()"
        (actionClick)="handleHeaderAction($event)"
      />

      @if (loading()) {
        <app-loading-state message="Loading module data…" />
      } @else if (error()) {
        <app-error-state [message]="error()!" (retry)="load()" />
      } @else {
        <div class="summary-grid">
          @for (card of config().summaryCards; track card.title) {
            <app-summary-card
              [title]="card.title"
              [value]="card.value"
              [icon]="card.icon"
              [trend]="card.trend"
              [iconColor]="card.iconColor ?? 'primary'"
              variant="elevated"
            />
          }
        </div>

        @if (config().quickActions?.length) {
          <div class="hub-quick-actions">
            @for (qa of config().quickActions!; track qa.label) {
              <button type="button" class="hub-action-chip" (click)="runAction(qa.label)">
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
            @for (tab of config().tabs; track tab.label; let i = $index) {
              <mat-tab [label]="tab.label">
                <div class="tab-panel hub-tab-panel">
                  @if (tab.filters?.length || tab.searchPlaceholder) {
                    <div class="filter-row table-toolbar">
                      @if (tab.searchPlaceholder) {
                        <mat-form-field appearance="outline">
                          <mat-label>Search</mat-label>
                          <input matInput [formControl]="searchControl" [placeholder]="tab.searchPlaceholder" />
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
                              <mat-option [value]="opt">{{ opt || 'All' }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                      }
                    </div>
                  }

                  @if (filteredRows(tab, i).length === 0) {
                    <app-empty-state
                      [title]="tab.emptyMessage ?? 'No records'"
                      description="Adjust filters or run a sync to refresh demo data."
                      icon="inbox"
                    />
                  } @else {
                    <div class="platform-module__body">
                      <div class="data-table-wrap platform-module__table">
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
                                    } @else {
                                      {{ row[col.key] }}
                                    }
                                  </td>
                                }
                                <td>
                                  <button
                                    mat-icon-button
                                    [matMenuTriggerFor]="rowMenu"
                                    aria-label="Row actions"
                                    (click)="selectedRow.set(row)"
                                  >
                                    <mat-icon>more_vert</mat-icon>
                                  </button>
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>

                      @if (tab.charts?.length) {
                        <div class="platform-module__charts">
                          @for (chart of tab.charts!; track chart.title) {
                            <app-chart-card
                              [title]="chart.title"
                              [subtitle]="chart.subtitle ?? ''"
                              [kind]="chart.kind"
                              [data]="chart.data"
                            />
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              </mat-tab>
            }
          </mat-tab-group>
        </div>
      }

      <mat-menu #rowMenu="matMenu">
        <button mat-menu-item type="button" (click)="viewDetail()">
          <mat-icon>visibility</mat-icon> View details
        </button>
        <button mat-menu-item type="button" (click)="runAction('Execute action')">
          <mat-icon>play_arrow</mat-icon> Execute
        </button>
        @if (config().id === 'approvals') {
          <button mat-menu-item type="button" (click)="runAction('Approve')">
            <mat-icon>check</mat-icon> Approve
          </button>
          <button mat-menu-item type="button" (click)="runAction('Reject')">
            <mat-icon>close</mat-icon> Reject
          </button>
        }
        <button mat-menu-item type="button" (click)="runAction('Export row')">
          <mat-icon>download</mat-icon> Export
        </button>
      </mat-menu>
    </div>
  `,
  styles: `
    .platform-module__panel { overflow: hidden; }
    .platform-module__body {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 1rem;
    }
    .platform-module__charts {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
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
    @media (max-width: 1100px) {
      .platform-module__body { grid-template-columns: 1fr; }
    }
  `,
})
export class PlatformModulePageComponent implements OnInit {
  readonly config = input.required<PlatformModuleConfig>()

  private readonly demo = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)

  readonly loading = signal(true)
  readonly error = signal<string | null>(null)
  readonly tabIndex = signal(0)
  readonly selectedRow = signal<Record<string, unknown> | null>(null)
  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly filterValues = signal<Record<string, string>>({})

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )

  activeTab = computed(() => this.config().tabs[this.tabIndex()] ?? this.config().tabs[0])

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
      .pipe(delay(400))
      .subscribe({
        next: () => this.loading.set(false),
        error: () => {
          this.loading.set(false)
          this.error.set('Failed to load module data (demo)')
        },
      })
  }

  lastSync = (): string => `Synced ${new Date().toLocaleTimeString()}`

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
      return new Date(String(v)).toLocaleString()
    } catch {
      return String(v)
    }
  }

  handleHeaderAction = (label: string): void => {
    if (label === 'Refresh') {
      this.load()
      return
    }
    this.runAction(label)
  }

  runAction = (label: string): void => {
    this.demo.simulate(`${this.config().title}: ${label}`, 700).subscribe()
  }

  viewDetail = (): void => {
    const row = this.selectedRow()
    if (!row) return
    this.dialog.open(DetailDialogComponent, {
      width: '520px',
      data: {
        title: String(row['name'] ?? row['action'] ?? row['id'] ?? 'Details'),
        rows: Object.entries(row)
          .filter(([k]) => !k.startsWith('_'))
          .map(([label, value]) => ({
            label: label.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
            value: String(value ?? '—'),
          })),
        extra: `[demo] Full trace for ${this.config().id}\n${JSON.stringify(row, null, 2)}`,
      },
    })
  }
}
