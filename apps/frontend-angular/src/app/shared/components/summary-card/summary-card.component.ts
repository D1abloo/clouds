import { Component, Input } from '@angular/core'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  template: `
    <mat-card class="summary-card" [attr.aria-label]="title">
      <mat-card-content>
        <div class="summary-card__header">
          <mat-icon class="summary-card__icon" [color]="iconColor">{{
            icon
          }}</mat-icon>
          <span class="summary-card__title">{{ title }}</span>
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
      border: 1px solid var(--app-border);
      background: var(--app-card);
    }
    .summary-card__header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .summary-card__title {
      font-size: 0.875rem;
      color: var(--app-text-muted);
      font-weight: 500;
    }
    .summary-card__value {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.2;
    }
    .summary-card__subtitle {
      margin-top: 0.25rem;
      font-size: 0.8125rem;
      color: var(--app-text-muted);
    }
    .summary-card__icon {
      font-size: 1.25rem;
      width: 1.25rem;
      height: 1.25rem;
    }
  `,
})
export class SummaryCardComponent {
  @Input({ required: true }) title!: string
  @Input({ required: true }) value!: string | number
  @Input() subtitle?: string
  @Input() icon = 'insights'
  @Input() iconColor: 'primary' | 'accent' | 'warn' | undefined = 'primary'
}
