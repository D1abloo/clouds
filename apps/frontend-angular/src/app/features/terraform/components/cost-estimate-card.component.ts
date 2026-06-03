import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { CurrencyPipe } from '@angular/common'

export interface CostEstimate {
  hourly?: number
  daily?: number
  monthly?: number
  disk?: number
  total?: number
  currency?: string
}

@Component({
  selector: 'app-cost-estimate-card',
  standalone: true,
  imports: [MatIconModule, CurrencyPipe],
  template: `
    <div class="cost-card surface-elevated animate-fade-in">
      <div class="cost-card__header">
        <mat-icon>trending_up</mat-icon>
        <div>
          <h4>Cost estimate</h4>
          <p>Prices are indicative — verify in your cloud billing console.</p>
        </div>
      </div>
      <div class="cost-card__grid">
        <div class="cost-item">
          <span class="cost-item__label">Hourly</span>
          <strong>{{ (estimate.hourly ?? 0) | currency: currency:'symbol':'1.2-2' }}</strong>
        </div>
        <div class="cost-item">
          <span class="cost-item__label">Daily</span>
          <strong>{{ (estimate.daily ?? (estimate.hourly ?? 0) * 24) | currency: currency:'symbol':'1.2-2' }}</strong>
        </div>
        <div class="cost-item highlight">
          <span class="cost-item__label">Monthly</span>
          <strong>{{ (estimate.monthly ?? estimate.total ?? 0) | currency: currency:'symbol':'1.2-2' }}</strong>
        </div>
        <div class="cost-item">
          <span class="cost-item__label">Disk</span>
          <strong>{{ (estimate.disk ?? 0) | currency: currency:'symbol':'1.2-2' }}</strong>
        </div>
      </div>
      <div class="cost-card__total">
        <span>Estimated total / month</span>
        <strong>{{ (estimate.total ?? estimate.monthly ?? 0) | currency: currency:'symbol':'1.2-2' }}</strong>
      </div>
    </div>
  `,
  styles: `
    .cost-card {
      padding: 1.25rem;
      border-radius: var(--app-radius-lg);
    }
    .cost-card__header {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      margin-bottom: 1rem;
      h4 { margin: 0; font-size: 1rem; font-weight: 600; }
      p { margin: 0.15rem 0 0; font-size: 0.78rem; color: var(--app-text-muted); }
      mat-icon { color: var(--app-accent); }
    }
    .cost-card__grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    .cost-item {
      padding: 0.75rem;
      border-radius: var(--app-radius-md);
      background: var(--app-surface);
      transition: transform 0.2s ease;
      &:hover { transform: translateY(-1px); }
      &__label { display: block; font-size: 0.72rem; color: var(--app-text-muted); margin-bottom: 0.2rem; }
      strong { font-size: 1.05rem; }
      &.highlight {
        background: linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.08));
      }
    }
    .cost-card__total {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--app-divider);
      display: flex;
      justify-content: space-between;
      align-items: center;
      strong { font-size: 1.35rem; color: var(--app-accent); }
    }
  `,
})
export class CostEstimateCardComponent {
  @Input() estimate: CostEstimate = {}
  @Input() currency = 'USD'
}
