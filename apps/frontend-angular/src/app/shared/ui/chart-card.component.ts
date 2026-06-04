import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { ChartKind } from '../components/mini-chart/mini-chart.component'
import { MiniChartComponent } from '../components/mini-chart/mini-chart.component'

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [MiniChartComponent, MatIconModule],
  template: `
    <div
      class="chart-card animate-fade-in"
      [style.animation-delay.ms]="delay"
      [attr.aria-label]="title"
    >
      <div class="chart-card__accent" [class]="'chart-card__accent--' + accent"></div>
      <div class="chart-card__head">
        <div class="chart-card__head-main">
          <div class="chart-card__icon" [class]="'tone-' + accent">
            <mat-icon>{{ chartIcon }}</mat-icon>
          </div>
          <div>
            <h4>{{ title }}</h4>
            @if (subtitle) { <p>{{ subtitle }}</p> }
          </div>
        </div>
        @if (badge) { <span class="chart-card__badge">{{ badge }}</span> }
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
        <div class="chart-card__chart">
          <app-mini-chart
            [title]="''"
            [kind]="kind"
            [data]="data"
            [secondaryData]="secondaryData"
            [animated]="true"
          />
        </div>
      }
    </div>
  `,
  styles: `
    .chart-card {
      position: relative;
      padding: 1.35rem 1.4rem 1.2rem;
      border-radius: var(--app-radius-lg);
      min-height: 280px;
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: transform var(--motion-normal, 0.28s ease), box-shadow var(--motion-normal, 0.28s ease);
      &:hover {
        transform: translateY(-3px);
        box-shadow: var(--app-shadow-md);
      }
    }
    .chart-card__accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--chart-vivid-1), var(--chart-vivid-2));
      &--violet { background: linear-gradient(90deg, #8b5cf6, #6366f1); }
      &--cyan { background: linear-gradient(90deg, #22d3ee, #3b82f6); }
      &--green { background: linear-gradient(90deg, #10b981, #22c55e); }
      &--amber { background: linear-gradient(90deg, #f59e0b, #f97316); }
      &--pink { background: linear-gradient(90deg, #ec4899, #a855f7); }
    }
    .chart-card__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .chart-card__head-main {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      min-width: 0;
    }
    .chart-card__icon {
      width: 38px;
      height: 38px;
      border-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }
    }
    h4 { margin: 0; font-size: 0.95rem; font-weight: 700; letter-spacing: -0.01em; }
    p { margin: 0.25rem 0 0; font-size: 0.78rem; color: var(--app-text-muted); line-height: 1.4; }
    .chart-card__badge {
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.18rem 0.55rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      color: var(--app-accent);
      flex-shrink: 0;
    }
    .chart-card__chart { flex: 1; min-height: 180px; }
    .chart-card__skeleton {
      flex: 1;
      min-height: 180px;
      border-radius: var(--app-radius-md);
      background: linear-gradient(90deg, var(--app-surface) 25%, var(--app-elevated) 50%, var(--app-surface) 75%);
      background-size: 200% 100%;
    }
    .chart-card__empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      min-height: 180px;
      color: var(--app-text-muted);
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; opacity: 0.45; }
      span { font-size: 0.875rem; font-weight: 600; }
      small { font-size: 0.75rem; }
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
  @Input() chartIcon = 'bar_chart'
  @Input() accent: 'violet' | 'cyan' | 'green' | 'amber' | 'pink' = 'violet'
  @Input() kind: ChartKind = 'bar'
  @Input() data: { label: string; value: number; color?: string }[] = []
  @Input() secondaryData: { label: string; value: number; color?: string }[] = []
  @Input() loading = false
  @Input() delay = 0

  get hasData(): boolean {
    return this.data.length > 0 || this.secondaryData.length > 0
  }
}
