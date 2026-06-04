import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  template: `
    <article
      class="summary-card animate-fade-in"
      [class.summary-card--elevated]="variant === 'elevated'"
      [attr.aria-label]="title"
    >
      <div class="summary-card__top">
        <div class="summary-card__icon-wrap" [class]="'tone-' + (iconColor ?? 'primary')">
          <mat-icon>{{ icon }}</mat-icon>
        </div>
        @if (trend) {
          <span class="summary-card__trend" [matTooltip]="trend">{{ trend }}</span>
        }
      </div>
      <div class="summary-card__title" [matTooltip]="title">{{ title }}</div>
      <div class="summary-card__value" [matTooltip]="valueTooltip()">{{ value }}</div>
      @if (subtitle) {
        <div class="summary-card__subtitle" [matTooltip]="subtitle">{{ subtitle }}</div>
      }
    </article>
  `,
  styles: `
    .summary-card {
      display: flex;
      flex-direction: column;
      min-height: 148px;
      padding: 1.15rem 1.25rem;
      border-radius: var(--app-radius-lg);
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      transition: transform 0.28s ease, box-shadow 0.28s ease;
      &:hover {
        transform: translateY(-3px);
        box-shadow: var(--app-shadow-md);
      }
    }
    .summary-card--elevated {
      background: linear-gradient(145deg, var(--app-card), color-mix(in srgb, var(--app-surface) 35%, var(--app-card)));
    }
    .summary-card__top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .summary-card__icon-wrap {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      mat-icon { font-size: 1.3rem; width: 1.3rem; height: 1.3rem; color: var(--app-accent); }
      &.tone-warn { background: color-mix(in srgb, #ef4444 18%, transparent); mat-icon { color: #ef4444; } }
      &.tone-accent { background: color-mix(in srgb, #38bdf8 18%, transparent); mat-icon { color: #38bdf8; } }
      &.tone-success { background: color-mix(in srgb, #22c55e 18%, transparent); mat-icon { color: #22c55e; } }
      &.tone-info { background: color-mix(in srgb, #0ea5e9 18%, transparent); mat-icon { color: #0ea5e9; } }
      &.tone-purple { background: color-mix(in srgb, #a855f7 18%, transparent); mat-icon { color: #a855f7; } }
      &.tone-cyan { background: color-mix(in srgb, #22d3ee 18%, transparent); mat-icon { color: #22d3ee; } }
    }
    .summary-card__trend {
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--app-accent);
      padding: 0.2rem 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      max-width: 50%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .summary-card__title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--app-text-muted);
      line-height: 1.35;
    }
    .summary-card__value {
      margin-top: 0.25rem;
      font-size: clamp(1.45rem, 2.5vw, 1.95rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.15;
      word-break: break-word;
    }
    .summary-card__subtitle {
      margin-top: 0.35rem;
      font-size: 0.8125rem;
      color: var(--app-text-muted);
      line-height: 1.35;
    }
  `,
})
export class SummaryCardComponent {
  @Input({ required: true }) title!: string
  @Input({ required: true }) value!: string | number
  @Input() subtitle?: string
  @Input() trend?: string
  @Input() icon = 'insights'
  @Input() iconColor: 'primary' | 'accent' | 'warn' | 'success' | 'info' | 'purple' | 'cyan' | undefined = 'primary'
  @Input() variant: 'default' | 'elevated' = 'default'

  valueTooltip = (): string => String(this.value)
}
