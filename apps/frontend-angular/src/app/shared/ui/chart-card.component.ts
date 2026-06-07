import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../components/brand-logo/brand-logo.component'
import { ChartKind } from '../components/mini-chart/mini-chart.component'
import { MiniChartComponent } from '../components/mini-chart/mini-chart.component'
import type { NavLogoKey } from '../theme/nav-logo.types'

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [MiniChartComponent, MatIconModule, BrandLogoComponent],
  template: `
    <div
      class="chart-card animate-fade-in"
      [class.chart-card--wide]="size === 'wide'"
      [class.chart-card--compact]="size === 'compact'"
      [class.chart-card--flat]="flat"
      [style.animation-delay.ms]="delay"
      [attr.aria-label]="title"
    >
      <div class="chart-card__accent" [class]="'chart-card__accent--' + accent"></div>
      <div class="chart-card__inner">
        <div class="chart-card__head">
          <div class="chart-card__head-main">
            <div
              class="chart-card__icon"
              [class]="'chart-card__icon--' + accent"
              [class.chart-card__icon--logos]="brandLogos.length > 0"
            >
              @if (brandLogos.length) {
                <div class="chart-card__logo-strip">
                  @for (logoKey of brandLogos; track logoKey) {
                    <app-brand-logo [logo]="logoKey" size="sm" />
                  }
                </div>
              } @else if (brandLogo) {
                <app-brand-logo [logo]="brandLogo" size="md" />
              } @else {
                <mat-icon>{{ chartIcon }}</mat-icon>
              }
            </div>
            <div class="chart-card__titles">
              <h4>{{ title }}</h4>
              @if (subtitle) { <p>{{ subtitle }}</p> }
            </div>
          </div>
          <div class="chart-card__meta">
            @if (badge) { <span class="chart-card__badge">{{ badge }}</span> }
            @if (hasData && highlightValue !== null && highlightValue !== undefined) {
              <div class="chart-card__highlight">
                <span>{{ highlightLabel }}</span>
                <strong>{{ highlightValue }}{{ unit }}</strong>
              </div>
            }
          </div>
        </div>
        @if (loading) {
          <div class="chart-card__skeleton shimmer"></div>
        } @else if (!hasData) {
          <div class="chart-card__empty">
            <mat-icon>insert_chart_outlined</mat-icon>
            <span>Sin datos aún</span>
            <small>Las métricas demo aparecen tras sincronizar</small>
          </div>
        } @else {
          <div class="chart-card__well">
            <app-mini-chart
              [title]="''"
              [kind]="kind"
              [data]="data"
              [secondaryData]="secondaryData"
              [animated]="true"
              [unit]="unit"
              [showShare]="showShare"
              [centerLabel]="centerLabel"
            />
          </div>
          @if (footnote) {
            <p class="chart-card__foot">{{ footnote }}</p>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .chart-card {
      position: relative;
      border-radius: 0;
      min-height: 250px;
      background: transparent;
      border: none;
      box-shadow: none;
      display: flex;
      overflow: hidden;
      transition: none;
      &:hover {
        background: transparent;
        transform: none;
      }
    }
    .chart-card__accent {
      display: none;
    }
    .chart-card__inner {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 0.95rem 1rem 0.9rem 1.05rem;
      min-width: 0;
    }
    .chart-card--wide { min-height: 290px; }
    .chart-card--compact {
      min-height: 200px;
      .chart-card__inner { padding: 0.75rem 0.85rem 0.75rem 0.95rem; }
      .chart-card__head { margin-bottom: 0.45rem; }
      .chart-card__icon {
        width: 28px;
        height: 28px;
        mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
      }
      .chart-card__titles h4 { font-size: 0.76rem; }
      .chart-card__titles p { font-size: 0.6rem; }
      .chart-card__highlight strong { font-size: 0.85rem; }
      .chart-card__well { min-height: 118px; padding: 0.45rem 0.5rem; }
      .chart-card__foot { margin-top: 0.3rem; font-size: 0.58rem; }
    }
    .chart-card__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.55rem;
      margin-bottom: 0.65rem;
      flex-shrink: 0;
    }
    .chart-card__head-main {
      display: flex;
      gap: 0.55rem;
      align-items: flex-start;
      min-width: 0;
      flex: 1;
    }
    .chart-card__icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
    .chart-card__icon--logos {
      width: auto;
      min-width: 34px;
      max-width: 72px;
      height: 34px;
      padding: 0 0.35rem;
    }
    .chart-card__logo-strip {
      display: inline-flex;
      align-items: center;
      gap: 0.22rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .chart-card--compact .chart-card__icon--logos {
      max-width: 64px;
      height: 28px;
      padding: 0 0.28rem;
    }
    .chart-card__icon--violet { background: color-mix(in srgb, #8b5cf6 12%, var(--app-card)); mat-icon { color: #8b5cf6; } }
    .chart-card__icon--cyan { background: color-mix(in srgb, #22d3ee 12%, var(--app-card)); mat-icon { color: #0ea5e9; } }
    .chart-card__icon--green { background: color-mix(in srgb, #10b981 12%, var(--app-card)); mat-icon { color: #10b981; } }
    .chart-card__icon--amber { background: color-mix(in srgb, #f59e0b 12%, var(--app-card)); mat-icon { color: #d97706; } }
    .chart-card__icon--pink { background: color-mix(in srgb, #ec4899 12%, var(--app-card)); mat-icon { color: #db2777; } }
    .chart-card__titles {
      min-width: 0;
      h4 { margin: 0; font-size: 0.84rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.25; }
      p { margin: 0.15rem 0 0; font-size: 0.66rem; color: var(--app-text-muted); line-height: 1.4; }
    }
    .chart-card__meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.28rem;
      flex-shrink: 0;
    }
    .chart-card__badge {
      font-size: 0.55rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 12%, var(--app-card));
      color: var(--app-accent);
    }
    .chart-card__highlight {
      text-align: right;
      span {
        display: block;
        font-size: 0.55rem;
        font-weight: 650;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--app-text-muted);
      }
      strong {
        font-size: 1rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
      }
    }
    .chart-card__well {
      flex: 1;
      min-height: 175px;
      padding: 0.55rem 0.6rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-text) 2.5%, transparent);
    }
    .chart-card--wide .chart-card__well { min-height: 210px; }
    .chart-card__foot {
      margin: 0.5rem 0 0;
      font-size: 0.62rem;
      line-height: 1.4;
      color: var(--app-text-muted);
      flex-shrink: 0;
    }
    .chart-card__skeleton {
      flex: 1;
      min-height: 175px;
      border-radius: 10px;
      background: linear-gradient(90deg, var(--app-surface) 25%, var(--app-elevated) 50%, var(--app-surface) 75%);
      background-size: 200% 100%;
    }
    .chart-card__empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.28rem;
      min-height: 175px;
      color: var(--app-text-muted);
      mat-icon { font-size: 1.75rem; width: 1.75rem; height: 1.75rem; opacity: 0.35; }
      span { font-size: 0.78rem; font-weight: 600; }
      small { font-size: 0.65rem; }
    }
    .shimmer { animation: shimmer 1.4s infinite; }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `,
})
export class ChartCardComponent {
  @Input({ required: true }) title!: string
  @Input() subtitle = ''
  @Input() badge = ''
  @Input() footnote = ''
  @Input() chartIcon = 'bar_chart'
  @Input() brandLogo?: NavLogoKey
  @Input() brandLogos: NavLogoKey[] = []
  @Input() accent: 'violet' | 'cyan' | 'green' | 'amber' | 'pink' = 'violet'
  @Input() kind: ChartKind = 'bar'
  @Input() data: { label: string; value: number; color?: string }[] = []
  @Input() secondaryData: { label: string; value: number; color?: string }[] = []
  @Input() loading = false
  @Input() delay = 0
  @Input() unit = ''
  @Input() showShare = false
  @Input() centerLabel = 'total'
  @Input() highlightLabel = 'Total'
  @Input() highlightValue: string | number | null = null
  @Input() size: 'default' | 'wide' | 'compact' = 'default'
  @Input() flat = true

  get hasData(): boolean {
    return this.data.length > 0 || this.secondaryData.length > 0
  }
}
