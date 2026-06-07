import { Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { NavIconComponent } from '../nav-icon/nav-icon.component'
import type { NavLogoKey } from '../../theme/nav-logo.types'

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
  logo?: NavLogoKey
}

@Component({
  selector: 'app-metric-stats-grid',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, NavIconComponent],
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
              @if (item.logo) {
                <app-nav-icon [logo]="item.logo" size="sm" />
              } @else {
                <mat-icon>{{ item.icon }}</mat-icon>
              }
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
      padding: 0.5rem 0;
      border-radius: 0;
      background: transparent;
      min-width: 0;
      transition: none;
      animation: fadeIn 0.35s ease backwards;
      &:hover {
        transform: none;
        background: transparent;
        box-shadow: none;
      }
    }
    .metric-stat__top {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.15rem;
    }
    .metric-stat__icon {
      width: 28px;
      height: 28px;
      border-radius: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: transparent;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; opacity: 0.88; }
    }
    .tone-primary mat-icon { color: var(--app-accent); }
    .tone-success mat-icon { color: var(--status-running); }
    .tone-warning mat-icon { color: var(--status-warning); }
    .tone-danger mat-icon { color: var(--status-error); }
    .tone-info mat-icon { color: var(--status-info); }
    .tone-purple mat-icon { color: #a855f7; }
    .tone-cyan mat-icon { color: #22d3ee; }
    .tone-default mat-icon { color: var(--app-text-muted); }
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
