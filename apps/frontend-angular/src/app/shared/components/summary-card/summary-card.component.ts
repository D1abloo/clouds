import { Component, Input } from '@angular/core'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  template: `
    <mat-card
      class="summary-card"
      [class.summary-card--elevated]="variant === 'elevated'"
      [attr.aria-label]="title"
    >
      <mat-card-content>
        <div class="summary-card__header">
          <div class="summary-card__icon-wrap" [class]="'tone-' + (iconColor ?? 'primary')">
            <mat-icon>{{ icon }}</mat-icon>
          </div>
          <div class="summary-card__titles">
            <span class="summary-card__title">{{ title }}</span>
            @if (trend) {
              <span class="summary-card__trend">{{ trend }}</span>
            }
          </div>
        </div>
        <div class="summary-card__value">{{ value }}</div>
        @if (subtitle) {
          <div class="summary-card__subtitle">{{ subtitle }}</div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .summary-card {
      height: 100%;
      border: none;
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      border-radius: var(--app-radius-lg);
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--app-shadow-md);
      }
    }
    .summary-card--elevated {
      background: linear-gradient(145deg, var(--app-card), color-mix(in srgb, var(--app-surface) 40%, var(--app-card)));
    }
    .summary-card__header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 0.85rem;
    }
    .summary-card__icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      mat-icon { font-size: 1.25rem; width: 1.25rem; height: 1.25rem; color: var(--app-accent); }
      &.tone-warn { background: rgba(239,68,68,0.12); mat-icon { color: #ef4444; } }
      &.tone-primary mat-icon { color: var(--app-accent); }
    }
    .summary-card__titles { display: flex; flex-direction: column; gap: 0.1rem; }
    .summary-card__title {
      font-size: 0.8125rem;
      color: var(--app-text-muted);
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .summary-card__trend {
      font-size: 0.68rem;
      color: var(--app-accent);
      font-weight: 500;
    }
    .summary-card__value {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    .summary-card__subtitle {
      margin-top: 0.35rem;
      font-size: 0.8125rem;
      color: var(--app-text-muted);
    }
  `,
})
export class SummaryCardComponent {
  @Input({ required: true }) title!: string
  @Input({ required: true }) value!: string | number
  @Input() subtitle?: string
  @Input() trend?: string
  @Input() icon = 'insights'
  @Input() iconColor: 'primary' | 'accent' | 'warn' | undefined = 'primary'
  @Input() variant: 'default' | 'elevated' = 'default'
}
