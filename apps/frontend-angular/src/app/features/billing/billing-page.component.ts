import { Component, inject, OnInit, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { BillingService } from '../../core/services/billing.service'
import { BillingSummary } from '../../core/models/api.models'
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

      @if (loading()) {
        <app-loading-state />
      } @else if (error()) {
        <app-error-state [message]="error()!" (retry)="load()" />
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

  readonly loading = signal(true)
  readonly error = signal<string | null>(null)
  readonly summary = signal<BillingSummary | null>(null)

  ngOnInit = (): void => this.load()

  load = (): void => {
    this.loading.set(true)
    this.billing.summary().subscribe({
      next: (data) => {
        this.summary.set(data)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Failed to load billing summary')
        this.loading.set(false)
      },
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
}
