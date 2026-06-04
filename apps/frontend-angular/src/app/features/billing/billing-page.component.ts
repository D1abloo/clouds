import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { MiniChartComponent } from '../../shared/components/mini-chart/mini-chart.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { BillingService } from '../../core/services/billing.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { BillingSummary } from '../../core/models/api.models'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-billing-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    SummaryCardComponent,
    MiniChartComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Billing"
        description="Cloud spend overview, forecasts and cost alerts"
        [actions]="[
          { label: 'Sync billing', icon: 'sync', primary: true },
          { label: 'Export CSV', icon: 'download' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      <p class="info-banner"><mat-icon>info</mat-icon> Data marked as estimated — demo mode</p>

      @if (page.loading()) {
        <app-loading-state />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="summary-grid app-section-panel stagger-children">
          <app-summary-card title="Today" [value]="formatCost(summary()?.daily)" icon="today" variant="elevated" />
          <app-summary-card title="This week" [value]="formatCost(summary()?.weekly)" icon="date_range" variant="elevated" />
          <app-summary-card title="This month" [value]="formatCost(summary()?.totalMonthly)" icon="calendar_month" variant="elevated" />
          <app-summary-card title="Forecast" [value]="formatCost(summary()?.forecastMonthly)" icon="trending_up" variant="elevated" />
          <app-summary-card title="Top provider" [value]="topProvider()" icon="cloud" variant="elevated" />
          <app-summary-card title="Cost alerts" [value]="3" icon="warning" iconColor="warn" variant="elevated" />
        </div>

        <div class="chart-grid page-section">
          <app-mini-chart title="Cost by provider" kind="bar" [data]="providerChart()" />
          <app-mini-chart title="Daily trend" kind="line" [data]="dailyTrend()" />
          <app-mini-chart title="Forecast" kind="line" [data]="forecastChart()" />
        </div>

        <div class="table-card">
        <mat-tab-group class="soft-tabs" animationDuration="280ms">
          <mat-tab label="Overview">
            <div class="tab-panel">
              <div class="filter-row table-toolbar">
                <mat-form-field appearance="outline">
                  <mat-label>Search</mat-label>
                  <input matInput [formControl]="searchControl" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Provider</mat-label>
                  <mat-select [formControl]="providerControl">
                    <mat-option value="">All</mat-option>
                    @for (p of providerKeys(); track p) {
                      <mat-option [value]="p">{{ p }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="data-table-wrap">
              <table mat-table [dataSource]="filteredRows()" class="premium-table table-row-hover">
                <ng-container matColumnDef="provider">
                  <th mat-header-cell *matHeaderCellDef>Provider</th>
                  <td mat-cell *matCellDef="let row">{{ row.provider }}</td>
                </ng-container>
                <ng-container matColumnDef="service">
                  <th mat-header-cell *matHeaderCellDef>Service</th>
                  <td mat-cell *matCellDef="let row">{{ row.service }}</td>
                </ng-container>
                <ng-container matColumnDef="amount">
                  <th mat-header-cell *matHeaderCellDef>Amount</th>
                  <td mat-cell *matCellDef="let row">{{ formatCost(row.amount) }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let row; columns: cols" class="table-row-hover"></tr>
              </table>
              </div>
            </div>
          </mat-tab>
          @for (tab of ['AWS', 'GCP', 'Azure', 'VPS', 'By instance', 'Forecast', 'Alerts']; track tab) {
            <mat-tab [label]="tab">
              <div class="tab-panel">
                <p>{{ tab }} billing breakdown (demo) — {{ formatCost(tabCost(tab)) }}</p>
              </div>
            </mat-tab>
          }
        </mat-tab-group>
        </div>
      }
    </div>
  `,
  styles: ``,
})
export class BillingPageComponent implements OnInit {
  private readonly billing = inject(BillingService)
  private readonly demoActions = inject(DemoActionsService)

  readonly page = createPageLoader(true)
  readonly summary = signal<BillingSummary | null>(null)
  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly providerControl = new FormControl('', { nonNullable: true })
  readonly cols = ['provider', 'service', 'amount']

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )
  private readonly providerFilter = toSignal(this.providerControl.valueChanges.pipe(startWith('')), {
    initialValue: '',
  })

  billingRows = computed(() => {
    const by = this.summary()?.byProvider ?? {}
    const rows: { provider: string; service: string; amount: number }[] = []
    Object.entries(by).forEach(([provider, amount]) => {
      rows.push({ provider, service: 'compute', amount: amount * 0.6 })
      rows.push({ provider, service: 'storage', amount: amount * 0.25 })
      rows.push({ provider, service: 'network', amount: amount * 0.15 })
    })
    return rows
  })

  filteredRows = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const prov = this.providerFilter()
    return this.billingRows().filter((r) => {
      const matchTerm = !term || r.provider.toLowerCase().includes(term) || r.service.includes(term)
      const matchProv = !prov || r.provider === prov
      return matchTerm && matchProv
    })
  })

  providerKeys = computed(() => Object.keys(this.summary()?.byProvider ?? {}))

  ngOnInit(): void {
    this.load()
  }

  load = (): void => {
    this.page.run(this.billing.summary(), {
      onSuccess: (data) => this.summary.set(data),
      errorMessage: 'Failed to load billing summary',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Sync billing') {
      this.demoActions.simulate('Billing sync', 1200, 'Billing data synchronized (estimated)').subscribe(() => this.load())
      return
    }
    this.demoActions.simulate('CSV export', 600, 'billing-export-demo.csv downloaded').subscribe()
  }

  providerChart = computed(() =>
    Object.entries(this.summary()?.byProvider ?? {}).map(([label, value]) => ({ label, value })),
  )

  dailyTrend = (): { label: string; value: number }[] =>
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => ({
      label,
      value: 800 + i * 120 + Math.random() * 200,
    }))

  forecastChart = (): { label: string; value: number }[] => {
    const base = this.summary()?.forecastMonthly ?? 5000
    return ['W1', 'W2', 'W3', 'W4'].map((label, i) => ({ label, value: base * (0.2 + i * 0.05) }))
  }

  topProvider = (): string => {
    const by = this.summary()?.byProvider ?? {}
    const entries = Object.entries(by)
    if (!entries.length) return '—'
    return entries.sort((a, b) => b[1] - a[1])[0][0]
  }

  tabCost = (tab: string): number => {
    const total = this.summary()?.totalMonthly ?? 0
    if (tab === 'AWS') return (this.summary()?.byProvider?.['AWS'] ?? total * 0.4)
    if (tab === 'GCP') return (this.summary()?.byProvider?.['GCP'] ?? total * 0.3)
    if (tab === 'Azure') return (this.summary()?.byProvider?.['AZURE'] ?? total * 0.2)
    return total * 0.1
  }

  formatCost = (value?: number): string => {
    if (value === undefined || value === null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.summary()?.currency ?? 'USD',
    }).format(value)
  }
}
