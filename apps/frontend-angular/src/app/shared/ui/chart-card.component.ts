import { Component, Input } from '@angular/core'
import { MiniChartComponent, ChartKind } from '../components/mini-chart/mini-chart.component'

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [MiniChartComponent],
  template: `
    <div class="chart-card surface-elevated animate-fade-in">
      <div class="chart-card__head">
        <div>
          <h4>{{ title }}</h4>
          @if (subtitle) { <p>{{ subtitle }}</p> }
        </div>
        @if (badge) { <span class="chart-card__badge">{{ badge }}</span> }
      </div>
      @if (loading) {
        <div class="chart-card__skeleton"></div>
      } @else if (!data.length) {
        <p class="chart-card__empty">No data — demo metrics will appear after sync</p>
      } @else {
        <app-mini-chart [title]="''" [kind]="kind" [data]="data" />
      }
    </div>
  `,
  styles: `
    .chart-card {
      padding: 1.25rem;
      border-radius: var(--app-radius-lg);
      min-height: 240px;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      &:hover { transform: translateY(-2px); box-shadow: var(--app-shadow-md); }
      &__head {
        display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;
        h4 { margin: 0; font-size: 0.95rem; font-weight: 600; }
        p { margin: 0.2rem 0 0; font-size: 0.78rem; color: var(--app-text-muted); }
      }
      &__badge {
        font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
        padding: 0.15rem 0.5rem; border-radius: 999px;
        background: color-mix(in srgb, var(--app-accent) 12%, transparent);
        color: var(--app-accent);
      }
      &__skeleton {
        height: 160px; border-radius: var(--app-radius-md);
        background: linear-gradient(90deg, var(--app-surface) 25%, var(--app-elevated) 50%, var(--app-surface) 75%);
        background-size: 200% 100%; animation: shimmer 1.4s infinite;
      }
      &__empty { color: var(--app-text-muted); font-size: 0.85rem; padding: 2rem 0; text-align: center; }
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `,
})
export class ChartCardComponent {
  @Input({ required: true }) title!: string
  @Input() subtitle = ''
  @Input() badge = ''
  @Input() kind: ChartKind = 'bar'
  @Input() data: { label: string; value: number; color?: string }[] = []
  @Input() loading = false
}
