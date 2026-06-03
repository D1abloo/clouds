import { Component, Input } from '@angular/core'

export type ChartKind = 'bar' | 'donut' | 'line'

@Component({
  selector: 'app-mini-chart',
  standalone: true,
  template: `
    <div class="mini-chart" [attr.aria-label]="title">
      <div class="mini-chart__title">{{ title }}</div>
      @if (kind === 'bar') {
        <div class="mini-chart__bars">
          @for (item of data; track item.label) {
            <div class="bar-col">
              <div class="bar" [style.height.%]="barHeight(item.value)"></div>
              <span>{{ item.label }}</span>
            </div>
          }
        </div>
      } @else if (kind === 'donut') {
        <div class="mini-chart__donut-wrap">
          <svg viewBox="0 0 36 36" class="donut">
            @for (seg of donutSegments(); track seg.label) {
              <circle
                class="donut-seg"
                cx="18"
                cy="18"
                r="15.9"
                fill="transparent"
                [attr.stroke]="seg.color"
                stroke-width="3.2"
                [attr.stroke-dasharray]="seg.dash"
                [attr.stroke-dashoffset]="seg.offset"
              />
            }
          </svg>
          <ul class="donut-legend">
            @for (item of data; track item.label) {
              <li><span [style.background]="item.color"></span>{{ item.label }} ({{ item.value }})</li>
            }
          </ul>
        </div>
      } @else {
        <svg class="line-chart" viewBox="0 0 200 80" preserveAspectRatio="none">
          <polyline [attr.points]="linePoints()" fill="none" stroke="#3b82f6" stroke-width="2" />
        </svg>
      }
    </div>
  `,
  styles: `
    .mini-chart {
      background: var(--app-card);
      border: 1px solid var(--app-border);
      border-radius: 12px;
      padding: 1rem;
      min-height: 200px;
    }
    .mini-chart__title {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      color: var(--app-text-muted);
    }
    .mini-chart__bars {
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
      height: 140px;
    }
    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      span { font-size: 0.7rem; color: var(--app-text-muted); }
    }
    .bar {
      width: 100%;
      max-width: 48px;
      background: linear-gradient(180deg, #3b82f6, #1d4ed8);
      border-radius: 4px 4px 0 0;
      min-height: 4px;
    }
    .mini-chart__donut-wrap {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .donut { width: 100px; height: 100px; transform: rotate(-90deg); }
    .donut-legend {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.75rem;
      li {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin-bottom: 0.25rem;
        span { width: 10px; height: 10px; border-radius: 2px; }
      }
    }
    .line-chart { width: 100%; height: 120px; }
  `,
})
export class MiniChartComponent {
  @Input({ required: true }) title!: string
  @Input() kind: ChartKind = 'bar'
  @Input() data: { label: string; value: number; color?: string }[] = []

  private readonly colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

  barHeight = (value: number): number => {
    const max = Math.max(...this.data.map((d) => d.value), 1)
    return Math.max(8, (value / max) * 100)
  }

  donutSegments = () => {
    const total = this.data.reduce((s, d) => s + d.value, 0) || 1
    let offset = 25
    return this.data.map((d, i) => {
      const pct = (d.value / total) * 100
      const dash = `${pct} ${100 - pct}`
      const seg = { label: d.label, color: d.color ?? this.colors[i % this.colors.length], dash, offset }
      offset -= pct
      return seg
    })
  }

  linePoints = (): string => {
    if (!this.data.length) return ''
    const max = Math.max(...this.data.map((d) => d.value), 1)
    return this.data
      .map((d, i) => {
        const x = (i / Math.max(this.data.length - 1, 1)) * 200
        const y = 80 - (d.value / max) * 70
        return `${x},${y}`
      })
      .join(' ')
  }
}
