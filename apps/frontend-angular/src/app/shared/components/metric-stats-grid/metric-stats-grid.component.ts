import { Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'

export type MetricStatTone =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'cyan'
  | 'default'

export interface MetricStatItem {
  label: string
  value: string | number
  icon: string
  tone?: MetricStatTone
  subtitle?: string
  trend?: string
  trendDown?: boolean
  badge?: string
  delay?: number
}

@Component({
  selector: 'app-metric-stats-grid',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  template: `
    <div class="metric-stats-grid stagger-children" role="list">
      @for (item of items(); track item.label; let i = $index) {
        <article
          class="metric-stat"
          role="listitem"
          [attr.aria-label]="item.label + ': ' + item.value"
          [style.animation-delay.ms]="item.delay ?? i * 30"
        >
          <div class="metric-stat__top">
            <span class="metric-stat__icon" [class]="iconTone(item.tone)">
              <mat-icon>{{ item.icon }}</mat-icon>
            </span>
            @if (item.badge) {
              <span class="metric-stat__badge">{{ item.badge }}</span>
            }
            @if (item.trend) {
              <span
                class="metric-stat__trend"
                [class.metric-stat__trend--down]="item.trendDown"
                [matTooltip]="item.trend"
              >
                @if (item.trendDown) {
                  <mat-icon>trending_down</mat-icon>
                } @else if (item.trend.includes('%') || item.trend.includes('−') || item.trend.includes('-')) {
                  <mat-icon>trending_down</mat-icon>
                } @else {
                  <mat-icon>trending_up</mat-icon>
                }
                {{ item.trend }}
              </span>
            }
          </div>
          <span class="metric-stat__label" [matTooltip]="item.label">{{ item.label }}</span>
          <span class="metric-stat__value" [matTooltip]="valueText(item.value)">{{ item.value }}</span>
          @if (item.subtitle) {
            <span class="metric-stat__sub" [matTooltip]="item.subtitle">{{ item.subtitle }}</span>
          }
        </article>
      }
    </div>
  `,
  styles: `
    .metric-stats-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 0.7rem;
      padding: 0.15rem 0 0.25rem;
    }
    .metric-stat {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding: 0.85rem 0.95rem;
      border-radius: var(--app-radius-md);
      background: color-mix(in srgb, var(--app-text) 2.5%, transparent);
      min-width: 0;
      transition: transform var(--motion-fast, 0.18s ease), background var(--motion-fast, 0.18s ease), box-shadow var(--motion-fast, 0.18s ease);
      animation: fadeIn 0.35s ease backwards;
      &:hover {
        transform: translateY(-2px);
        background: color-mix(in srgb, var(--app-accent) 5%, var(--app-card));
        box-shadow: var(--app-shadow-sm);
      }
    }
    .metric-stat__top {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.15rem;
    }
    .metric-stat__icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }
    .tone-primary { background: color-mix(in srgb, var(--app-accent) 14%, transparent); mat-icon { color: var(--app-accent); } }
    .tone-success { background: color-mix(in srgb, var(--status-running) 16%, transparent); mat-icon { color: var(--status-running); } }
    .tone-warning { background: color-mix(in srgb, var(--status-warning) 16%, transparent); mat-icon { color: var(--status-warning); } }
    .tone-danger { background: color-mix(in srgb, var(--status-error) 16%, transparent); mat-icon { color: var(--status-error); } }
    .tone-info { background: color-mix(in srgb, var(--status-info) 16%, transparent); mat-icon { color: var(--status-info); } }
    .tone-purple { background: color-mix(in srgb, #a855f7 16%, transparent); mat-icon { color: #a855f7; } }
    .tone-cyan { background: color-mix(in srgb, #22d3ee 16%, transparent); mat-icon { color: #22d3ee; } }
    .tone-default { background: color-mix(in srgb, var(--app-text-muted) 12%, transparent); mat-icon { color: var(--app-text-muted); } }
    .metric-stat__label {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--app-text-muted);
      line-height: 1.25;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .metric-stat__value {
      font-size: clamp(1.25rem, 2.2vw, 1.55rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.1;
      color: var(--app-text);
      font-variant-numeric: tabular-nums;
    }
    .metric-stat__sub {
      font-size: 0.68rem;
      color: var(--app-text-muted);
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .metric-stat__badge {
      margin-left: auto;
      font-size: 0.55rem;
      font-weight: 800;
      text-transform: uppercase;
      padding: 0.1rem 0.38rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 14%, transparent);
      color: var(--app-accent);
    }
    .metric-stat__trend {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 0.05rem;
      font-size: 0.62rem;
      font-weight: 700;
      color: var(--status-running);
      padding: 0.1rem 0.35rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--status-running) 12%, transparent);
      mat-icon { font-size: 12px; width: 12px; height: 12px; }
      &--down {
        color: var(--status-error);
        background: color-mix(in srgb, var(--status-error) 12%, transparent);
      }
    }
    @media (max-width: 1400px) {
      .metric-stats-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    @media (max-width: 1024px) {
      .metric-stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .metric-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  `,
})
export class MetricStatsGridComponent {
  readonly items = input.required<MetricStatItem[]>()

  iconTone = (tone?: MetricStatTone): string => `tone-${tone ?? 'primary'}`

  valueText = (v: string | number): string => String(v)
}
