import { Component, inject, OnInit, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { BillingService } from '../../core/services/billing.service'
import { BillingSummary } from '../../core/models/api.models'
import { createPageLoader } from '../../core/utils/page-load.util'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { ChartPlaceholderComponent } from '../../shared/components/chart-placeholder/chart-placeholder.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'

@Component({
  selector: 'app-billing-page',
  standalone: true,
  imports: [
    SummaryCardComponent,
    ChartPlaceholderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Billing</h1>
        <p>Cloud spend summary and cost sync</p>
      </header>

      @if (page.loading()) {
        <app-loading-state />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="summary-grid">
          <app-summary-card
            title="Total cost"
            [value]="formatCost(summary()?.totalCost)"
            [subtitle]="summary()?.period ?? 'Current period'"
            icon="payments"
          />
          <app-summary-card
            title="Currency"
            [value]="summary()?.currency ?? 'USD'"
            icon="attach_money"
          />
          <app-summary-card
            title="Daily / Weekly"
            [value]="formatCost(summary()?.daily) + ' / ' + formatCost(summary()?.weekly)"
            icon="today"
          />
          <app-summary-card
            title="Forecast"
            [value]="formatCost(summary()?.forecastMonthly)"
            [subtitle]="varianceLabel()"
            icon="trending_up"
          />
        </div>
        <app-chart-placeholder label="Cost by provider" />
        @if (summary()?.byProvider) {
          <ul class="provider-list">
            @for (entry of providerEntries(); track entry[0]) {
              <li>
                <strong>{{ entry[0] }}</strong>
                <span>{{ formatCost(entry[1]) }}</span>
              </li>
            }
          </ul>
        }
      }
    </div>
  `,
  styles: `
    .provider-list {
      list-style: none;
      padding: 0;
      margin-top: 1.5rem;
      li {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--app-border);
      }
    }
  `,
})
export class BillingPageComponent implements OnInit {
  private readonly billing = inject(BillingService)

  readonly page = createPageLoader(true)
  readonly summary = signal<BillingSummary | null>(null)

  ngOnInit = (): void => this.load()

  load = (): void => {
    this.page.run(this.billing.summary(), {
      onSuccess: (data) => this.summary.set(data),
      errorMessage: 'Failed to load billing summary',
    })
  }

  providerEntries = (): [string, number][] => {
    const by = this.summary()?.byProvider ?? {}
    return Object.entries(by)
  }

  formatCost = (value?: number): string => {
    if (value === undefined || value === null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.summary()?.currency ?? 'USD',
    }).format(value)
  }

  varianceLabel = (): string => {
    const v = this.summary()?.varianceVsPreviousMonth
    if (v === undefined || v === null) return ''
    const sign = v >= 0 ? '+' : ''
    return `${sign}${v.toFixed(1)}% vs last month`
  }
}
