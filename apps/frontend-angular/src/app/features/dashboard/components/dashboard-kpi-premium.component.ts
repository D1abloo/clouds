import { Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'

export interface DashboardKpiItem {
  label: string
  value: string | number
  subtitle: string
  icon?: string
  logo?: NavLogoKey
  tone: 'blue' | 'green' | 'orange' | 'violet' | 'purple' | 'cyan'
  trend?: string
  trendUp?: boolean
  sparkline: number[]
  sparkColor?: string
  progress?: number
}

@Component({
  selector: 'app-dashboard-kpi-premium',
  standalone: true,
  imports: [MatIconModule, BrandLogoComponent],
  template: `
    <div class="kpi-premium" role="list">
      @for (item of items(); track item.label; let i = $index) {
        <article class="kpi-card" [class]="'kpi-card--' + item.tone" role="listitem">
          <div class="kpi-card__head">
            <span class="kpi-card__icon">
              @if (item.logo) {
                <app-brand-logo [logo]="item.logo" size="sm" />
              } @else {
                <mat-icon>{{ item.icon }}</mat-icon>
              }
            </span>
            @if (item.trend) {
              <span class="kpi-card__trend" [class.kpi-card__trend--down]="!item.trendUp">
                <mat-icon>{{ item.trendUp ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                {{ item.trend }}
              </span>
            }
          </div>
          <span class="kpi-card__label">{{ item.label }}</span>
          <strong class="kpi-card__value">{{ item.value }}</strong>
          <span class="kpi-card__sub">{{ item.subtitle }}</span>
          @if (item.progress !== undefined) {
            <div class="kpi-card__progress" aria-hidden="true">
              <span [style.width.%]="item.progress"></span>
            </div>
          } @else {
            <svg class="kpi-card__spark" viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden="true">
              <polyline
                [attr.points]="sparkPoints(item.sparkline)"
                fill="none"
                [attr.stroke]="item.sparkColor ?? sparkColor(item.tone)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          }
        </article>
      }
    </div>
  `,
  styles: `
    .kpi-premium {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 0.65rem;
    }
    .kpi-card {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      padding: 0.85rem 0.95rem 0.75rem;
      border-radius: 14px;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      box-shadow: 0 1px 3px color-mix(in srgb, var(--app-text) 5%, transparent);
      min-width: 0;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px color-mix(in srgb, var(--app-text) 8%, transparent);
      }
    }
    .kpi-card__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }
    .kpi-card__icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 1.05rem; width: 1.05rem; height: 1.05rem; }
    }
    .kpi-card--blue .kpi-card__icon { background: color-mix(in srgb, #3b82f6 14%, transparent); mat-icon { color: #3b82f6; } }
    .kpi-card--green .kpi-card__icon { background: color-mix(in srgb, #10b981 14%, transparent); mat-icon { color: #10b981; } }
    .kpi-card--orange .kpi-card__icon { background: color-mix(in srgb, #f59e0b 14%, transparent); mat-icon { color: #f59e0b; } }
    .kpi-card--violet .kpi-card__icon { background: color-mix(in srgb, #8b5cf6 14%, transparent); mat-icon { color: #8b5cf6; } }
    .kpi-card--purple .kpi-card__icon { background: color-mix(in srgb, #a855f7 14%, transparent); mat-icon { color: #a855f7; } }
    .kpi-card--cyan .kpi-card__icon { background: color-mix(in srgb, #06b6d4 14%, transparent); mat-icon { color: #06b6d4; } }
    .kpi-card__label {
      font-size: 0.68rem;
      font-weight: 650;
      color: var(--app-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .kpi-card__value {
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      line-height: 1.1;
    }
    .kpi-card__sub {
      font-size: 0.66rem;
      color: var(--app-text-muted);
      margin-bottom: 0.35rem;
    }
    .kpi-card__trend {
      display: inline-flex;
      align-items: center;
      gap: 0.1rem;
      font-size: 0.58rem;
      font-weight: 700;
      padding: 0.12rem 0.38rem;
      border-radius: 999px;
      color: #10b981;
      background: color-mix(in srgb, #10b981 12%, transparent);
      mat-icon { font-size: 0.75rem; width: 0.75rem; height: 0.75rem; }
    }
    .kpi-card__trend--down {
      color: #ef4444;
      background: color-mix(in srgb, #ef4444 12%, transparent);
    }
    .kpi-card__spark {
      width: 100%;
      height: 28px;
      margin-top: auto;
      opacity: 0.85;
    }
    .kpi-card__progress {
      height: 5px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      overflow: hidden;
      margin-top: auto;
      span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #10b981, #34d399);
      }
    }
    @media (max-width: 1280px) { .kpi-premium { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 720px) { .kpi-premium { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `,
})
export class DashboardKpiPremiumComponent {
  readonly items = input.required<DashboardKpiItem[]>()

  sparkPoints = (values: number[]): string => {
    if (!values.length) return ''
    const max = Math.max(...values, 1)
    const min = Math.min(...values)
    const range = max - min || 1
    return values
      .map((v, i) => {
        const x = (i / Math.max(values.length - 1, 1)) * 120
        const y = 26 - ((v - min) / range) * 22
        return `${x},${y}`
      })
      .join(' ')
  }

  sparkColor = (tone: DashboardKpiItem['tone']): string => {
    const map: Record<DashboardKpiItem['tone'], string> = {
      blue: '#3b82f6',
      green: '#10b981',
      orange: '#f59e0b',
      violet: '#8b5cf6',
      purple: '#a855f7',
      cyan: '#06b6d4',
    }
    return map[tone]
  }
}
