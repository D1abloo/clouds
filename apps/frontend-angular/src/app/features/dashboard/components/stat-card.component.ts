import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

export type StatTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [MatIconModule],
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
          <span class="stat-card__trend" [class.stat-card__trend--down]="trendDown">
            <mat-icon>{{ trendDown ? 'trending_down' : 'trending_up' }}</mat-icon>
            {{ trend }}
          </span>
        }
      </div>
      <div class="stat-card__label">{{ title }}</div>
      <div class="stat-card__value">{{ value }}</div>
      @if (subtitle) {
        <div class="stat-card__subtitle">{{ subtitle }}</div>
      }
      @if (badge) {
        <span class="stat-card__badge">{{ badge }}</span>
      }
    </article>
  `,
  styles: `
    .stat-card {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 148px;
      padding: 1.15rem 1.25rem;
      border-radius: var(--app-radius-lg);
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      transition: transform 0.28s ease, box-shadow 0.28s ease;
      overflow: hidden;
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(145deg, color-mix(in srgb, var(--app-accent) 4%, transparent), transparent 55%);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.28s ease;
      }
      &:hover {
        transform: translateY(-3px);
        box-shadow: var(--app-shadow-md);
        &::after { opacity: 1; }
      }
    }
    .stat-card__top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 0.85rem;
    }
    .stat-card__icon {
      width: 42px;
      height: 42px;
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
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--app-success);
      padding: 0.2rem 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-success) 12%, transparent);
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &--down { color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 12%, transparent); }
    }
    .stat-card__label {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .stat-card__value {
      margin-top: 0.25rem;
      font-size: 2.05rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }
    .stat-card__subtitle {
      margin-top: 0.4rem;
      font-size: 0.8125rem;
      color: var(--app-text-muted);
    }
    .stat-card__badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      color: var(--app-accent);
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
  @Input() icon = 'insights'
  @Input() tone: StatTone = 'default'
  @Input() delay = 0
}
