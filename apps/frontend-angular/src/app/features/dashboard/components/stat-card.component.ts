import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'

export type StatTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  template: `
    <article
      class="stat-card animate-fade-in"
      [class]="'stat-card--' + tone"
      [style.animation-delay.ms]="delay"
      [attr.aria-label]="title"
    >
      <div class="stat-card__top">
        <div class="stat-card__icon" aria-hidden="true">
          <mat-icon>{{ icon }}</mat-icon>
        </div>
        @if (trend) {
          <span class="stat-card__trend" [class.stat-card__trend--down]="trendDown" [matTooltip]="trend">
            <mat-icon>{{ trendDown ? 'trending_down' : 'trending_up' }}</mat-icon>
            <span class="stat-card__trend-text">{{ trend }}</span>
          </span>
        }
      </div>
      <div class="stat-card__label" [matTooltip]="title">{{ title }}</div>
      <div class="stat-card__value" [matTooltip]="valueTooltip()">{{ value }}</div>
      @if (subtitle) {
        <div class="stat-card__subtitle" [matTooltip]="subtitle">{{ subtitle }}</div>
      }
      @if (updated) {
        <div class="stat-card__updated"><mat-icon>schedule</mat-icon> {{ updated }}</div>
      }
      @if (badge) {
        <span class="stat-card__badge" [matTooltip]="badge">{{ badge }}</span>
      }
    </article>
  `,
  styles: `
    .stat-card {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 168px;
      padding: 1.2rem 1.3rem 1.1rem;
      border-radius: var(--app-radius-lg);
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      transition: transform 0.28s ease, box-shadow 0.28s ease;
      overflow: visible;
      &:hover {
        transform: translateY(-3px);
        box-shadow: var(--app-shadow-md);
      }
    }
    .stat-card__top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .stat-card__icon {
      width: 42px;
      height: 42px;
      flex-shrink: 0;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      mat-icon { font-size: 1.3rem; width: 1.3rem; height: 1.3rem; color: var(--app-accent); }
    }
    .stat-card--success .stat-card__icon { background: color-mix(in srgb, var(--app-success) 14%, transparent); mat-icon { color: var(--app-success); } }
    .stat-card--warning .stat-card__icon { background: color-mix(in srgb, var(--app-warning) 14%, transparent); mat-icon { color: var(--app-warning); } }
    .stat-card--danger .stat-card__icon { background: color-mix(in srgb, var(--app-danger) 14%, transparent); mat-icon { color: var(--app-danger); } }
    .stat-card--info .stat-card__icon { background: color-mix(in srgb, var(--app-info) 14%, transparent); mat-icon { color: var(--app-info); } }
    .stat-card__trend {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      max-width: 55%;
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--app-success);
      padding: 0.2rem 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-success) 12%, transparent);
      mat-icon { font-size: 14px; width: 14px; height: 14px; flex-shrink: 0; }
      &--down { color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 12%, transparent); }
    }
    .stat-card__trend-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .stat-card__label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--app-text-muted);
      line-height: 1.35;
      word-wrap: break-word;
    }
    .stat-card__value {
      margin-top: 0.3rem;
      font-size: clamp(1.45rem, 2.5vw, 1.85rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.15;
      word-break: break-word;
    }
    .stat-card__subtitle {
      margin-top: 0.35rem;
      font-size: 0.8125rem;
      color: var(--app-text-muted);
      line-height: 1.35;
      word-wrap: break-word;
    }
    .stat-card__updated {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.45rem;
      font-size: 0.68rem;
      color: var(--app-text-muted);
      mat-icon { font-size: 12px; width: 12px; height: 12px; }
    }
    .stat-card__badge {
      position: absolute;
      top: 0.85rem;
      right: 0.85rem;
      max-width: 40%;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      color: var(--app-accent);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class StatCardComponent {
  @Input({ required: true }) title!: string
  @Input({ required: true }) value!: string | number
  @Input() subtitle = ''
  @Input() trend = ''
  @Input() trendDown = false
  @Input() badge = ''
  @Input() updated = ''
  @Input() icon = 'insights'
  @Input() tone: StatTone = 'default'
  @Input() delay = 0

  valueTooltip = (): string => String(this.value)
}
