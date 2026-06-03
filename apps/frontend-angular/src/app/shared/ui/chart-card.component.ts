import { Component, inject, Input } from '@angular/core'
import { ChartKind } from '../components/mini-chart/mini-chart.component'
import { MiniChartComponent } from '../components/mini-chart/mini-chart.component'

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [MiniChartComponent],
  template: `
    <div
      class="chart-card animate-fade-in"
      [style.animation-delay.ms]="delay"
      [attr.aria-label]="title"
    >
      <div class="chart-card__head">
        <div>
          <h4>{{ title }}</h4>
          @if (subtitle) { <p>{{ subtitle }}</p> }
        </div>
        @if (badge) { <span class="chart-card__badge">{{ badge }}</span> }
      </div>
      @if (loading) {
        <div class="chart-card__skeleton shimmer"></div>
      } @else if (!hasData) {
        <div class="chart-card__empty">
          <span>No data yet</span>
          <small>Demo metrics appear after sync</small>
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
      padding: 1.35rem 1.4rem;
      border-radius: var(--app-radius-lg);
      min-height: 280px;
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      display: flex;
      flex-direction: column;
      transition: transform 0.28s ease, box-shadow 0.28s ease;
      &:hover {
        transform: translateY(-3px);
        box-shadow: var(--app-shadow-md);
      }
    }
    .chart-card__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      h4 { margin: 0; font-size: 0.95rem; font-weight: 700; letter-spacing: -0.01em; }
      p { margin: 0.25rem 0 0; font-size: 0.78rem; color: var(--app-text-muted); line-height: 1.4; }
    }
    .chart-card__badge {
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.18rem 0.55rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      color: var(--app-accent);
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
      gap: 0.25rem;
      min-height: 180px;
      color: var(--app-text-muted);
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
  @Input() kind: ChartKind = 'bar'
  @Input() data: { label: string; value: number; color?: string }[] = []
  @Input() secondaryData: { label: string; value: number; color?: string }[] = []
  @Input() loading = false
  @Input() delay = 0

  get hasData(): boolean {
    return this.data.length > 0 || this.secondaryData.length > 0
  }
}
