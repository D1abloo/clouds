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
}

@Component({
  selector: 'app-dashboard-kpi-premium',
  standalone: true,
  imports: [MatIconModule, BrandLogoComponent],
  template: `
    <div class="kpi-strip" role="list" [attr.aria-label]="rangeLabel() || 'Indicadores clave'">
      @for (item of items(); track item.label; let last = $last) {
        <article
          class="kpi-cell"
          [class]="'kpi-cell--' + item.tone"
          role="listitem"
          [attr.aria-label]="item.label + ': ' + item.value"
        >
          <div class="kpi-cell__row">
            <div class="kpi-cell__identity">
              <span class="kpi-cell__icon" aria-hidden="true">
                @if (item.logo) {
                  <app-brand-logo [logo]="item.logo" size="sm" />
                } @else {
                  <mat-icon>{{ item.icon }}</mat-icon>
                }
              </span>
              <span class="kpi-cell__label">{{ item.label }}</span>
            </div>
            @if (item.trend) {
              <span
                class="kpi-cell__trend"
                [class.kpi-cell__trend--down]="!item.trendUp"
                [attr.aria-label]="'Tendencia: ' + item.trend"
              >
                <mat-icon aria-hidden="true">{{ item.trendUp ? 'north_east' : 'south_east' }}</mat-icon>
                {{ item.trend }}
              </span>
            }
          </div>
          <strong class="kpi-cell__value">{{ item.value }}</strong>
          <span class="kpi-cell__sub">{{ item.subtitle }}</span>
        </article>
        @if (!last) {
          <div class="kpi-strip__divider" aria-hidden="true"></div>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(11, minmax(0, 1fr));
      align-items: stretch;
      gap: 0;
      padding: 0.85rem 0.25rem 0.65rem;
    }
    .kpi-cell {
      grid-column: span 2;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
      padding: 0 0.85rem;
    }
    .kpi-strip__divider {
      width: 1px;
      align-self: stretch;
      margin: 0.15rem 0;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
    }
    .kpi-cell__row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.45rem;
      margin-bottom: 0.15rem;
    }
    .kpi-cell__identity {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      min-width: 0;
    }
    .kpi-cell__icon {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
    .kpi-cell--blue .kpi-cell__icon { background: color-mix(in srgb, #3b82f6 14%, transparent); mat-icon { color: #2563eb; } }
    .kpi-cell--green .kpi-cell__icon { background: color-mix(in srgb, #10b981 14%, transparent); mat-icon { color: #059669; } }
    .kpi-cell--orange .kpi-cell__icon { background: color-mix(in srgb, #f59e0b 15%, transparent); mat-icon { color: #d97706; } }
    .kpi-cell--violet .kpi-cell__icon { background: color-mix(in srgb, #8b5cf6 14%, transparent); mat-icon { color: #7c3aed; } }
    .kpi-cell--purple .kpi-cell__icon { background: color-mix(in srgb, #a855f7 14%, transparent); mat-icon { color: #9333ea; } }
    .kpi-cell--cyan .kpi-cell__icon { background: color-mix(in srgb, #06b6d4 14%, transparent); mat-icon { color: #0891b2; } }
    .kpi-cell__label {
      font-size: 0.68rem;
      font-weight: 750;
      color: var(--app-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.2;
    }
    .kpi-cell__value {
      font-size: clamp(1.35rem, 2vw, 1.75rem);
      font-weight: 850;
      letter-spacing: -0.04em;
      font-variant-numeric: tabular-nums;
      line-height: 1.05;
      color: var(--app-text);
    }
    .kpi-cell__sub {
      font-size: 0.68rem;
      font-weight: 600;
      color: color-mix(in srgb, var(--app-text-muted) 90%, transparent);
      line-height: 1.35;
    }
    .kpi-cell__trend {
      display: inline-flex;
      align-items: center;
      gap: 0.12rem;
      font-size: 0.58rem;
      font-weight: 750;
      padding: 0.18rem 0.45rem;
      border-radius: 999px;
      white-space: nowrap;
      flex-shrink: 0;
      color: #059669;
      background: color-mix(in srgb, #10b981 12%, transparent);
      mat-icon { font-size: 0.72rem; width: 0.72rem; height: 0.72rem; }
    }
    .kpi-cell__trend--down {
      color: #dc2626;
      background: color-mix(in srgb, #ef4444 12%, transparent);
    }
    @media (max-width: 1280px) {
      .kpi-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.85rem 0;
        padding-inline: 0;
      }
      .kpi-cell { grid-column: span 1; padding: 0 0.35rem; }
      .kpi-strip__divider { display: none; }
    }
    @media (max-width: 720px) {
      .kpi-strip { grid-template-columns: 1fr; }
    }
  `,
})
export class DashboardKpiPremiumComponent {
  readonly items = input.required<DashboardKpiItem[]>()
  readonly rangeLabel = input('')
}
