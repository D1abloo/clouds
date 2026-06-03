import { Component, Input } from '@angular/core'

export type ChartKind = 'bar' | 'donut' | 'line'

@Component({
  selector: 'app-mini-chart',
  standalone: true,
  template: `
    <div class="mini-chart" [class.mini-chart--animated]="animated" [attr.aria-label]="title">
      @if (title) {
        <div class="mini-chart__title">{{ title }}</div>
      }

      @if (kind === 'bar') {
        <div class="mini-chart__bars">
          @for (item of data; track item.label; let i = $index) {
            <div class="bar-col" [title]="item.label + ': ' + item.value">
              <span class="bar-value">{{ item.value }}</span>
              <div
                class="bar"
                [style.height.%]="barHeight(item.value)"
                [style.background]="item.color ?? barColor(i)"
                [style.animation-delay.ms]="i * 60"
              ></div>
              <span class="bar-label">{{ item.label }}</span>
            </div>
          }
        </div>
      } @else if (kind === 'donut') {
        <div class="mini-chart__donut-wrap">
          <div class="donut-center-wrap">
            <svg viewBox="0 0 36 36" class="donut">
              <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="color-mix(in srgb, var(--app-text-muted) 12%, transparent)" stroke-width="3.2" />
              @for (seg of donutSegments(); track seg.label) {
                <circle
                  class="donut-seg"
                  cx="18" cy="18" r="15.9"
                  fill="transparent"
                  [attr.stroke]="seg.color"
                  stroke-width="3.2"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="seg.dash"
                  [attr.stroke-dashoffset]="seg.offset"
                />
              }
            </svg>
            <div class="donut-center">
              <strong>{{ donutTotal() }}</strong>
              <span>total</span>
            </div>
          </div>
          <ul class="donut-legend">
            @for (item of data; track item.label; let i = $index) {
              <li [title]="item.label + ': ' + item.value">
                <span [style.background]="item.color ?? barColor(i)"></span>
                <div>
                  <em>{{ item.label }}</em>
                  <strong>{{ item.value }}</strong>
                </div>
              </li>
            }
          </ul>
        </div>
      } @else {
        <div class="line-wrap">
          @if (secondaryData.length) {
            <div class="line-legend">
              <span><i class="dot dot--cpu"></i> CPU</span>
              <span><i class="dot dot--ram"></i> RAM</span>
            </div>
          }
          <svg class="line-chart" viewBox="0 0 200 90" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="lineGradRam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#10b981" stop-opacity="0.28" />
                <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
              </linearGradient>
            </defs>
            @if (secondaryData.length) {
              <polygon [attr.points]="lineArea(secondaryData)" fill="url(#lineGradRam)" class="line-area" />
              <polyline [attr.points]="linePoints(secondaryData)" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" class="line-stroke" />
            }
            <polygon [attr.points]="lineArea(data)" fill="url(#lineGradCpu)" class="line-area" />
            <polyline [attr.points]="linePoints(data)" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" class="line-stroke" />
          </svg>
          <div class="line-labels">
            @for (item of data; track item.label) {
              <span>{{ item.label }}</span>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .mini-chart {
      background: transparent;
      border: none;
      padding: 0;
      min-height: 180px;
      height: 100%;
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
      gap: 0.65rem;
      height: 170px;
      padding-top: 1.25rem;
    }
    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      position: relative;
      cursor: default;
    }
    .bar-value {
      position: absolute;
      top: 0;
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--app-text-muted);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .bar-col:hover .bar-value { opacity: 1; }
    .bar-label {
      font-size: 0.68rem;
      color: var(--app-text-muted);
      text-align: center;
      font-weight: 500;
    }
    .bar {
      width: 100%;
      max-width: 52px;
      border-radius: 8px 8px 4px 4px;
      min-height: 6px;
      transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .mini-chart--animated .bar {
      animation: barGrow 0.6s ease forwards;
      transform-origin: bottom;
    }
    @keyframes barGrow {
      from { transform: scaleY(0); opacity: 0.5; }
      to { transform: scaleY(1); opacity: 1; }
    }
    .mini-chart__donut-wrap {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      min-height: 170px;
    }
    .donut-center-wrap { position: relative; flex-shrink: 0; }
    .donut {
      width: 120px;
      height: 120px;
      transform: rotate(-90deg);
    }
    .donut-seg {
      transition: stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease;
    }
    .donut-center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      strong { font-size: 1.35rem; font-weight: 700; line-height: 1; }
      span { font-size: 0.65rem; color: var(--app-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    }
    .donut-legend {
      list-style: none;
      padding: 0;
      margin: 0;
      flex: 1;
      li {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        margin-bottom: 0.45rem;
        padding: 0.35rem 0;
        border-radius: 8px;
        transition: background 0.2s ease;
        &:hover { background: color-mix(in srgb, var(--app-accent) 5%, transparent); }
        > span:first-child {
          width: 10px;
          height: 10px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        div {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          flex: 1;
          em { font-style: normal; font-size: 0.78rem; color: var(--app-text-muted); }
          strong { font-size: 0.82rem; font-weight: 700; }
        }
      }
    }
    .line-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
    .line-legend {
      display: flex;
      gap: 1rem;
      font-size: 0.72rem;
      color: var(--app-text-muted);
      span { display: inline-flex; align-items: center; gap: 0.35rem; }
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      &--cpu { background: #3b82f6; }
      &--ram { background: #10b981; }
    }
    .line-chart {
      width: 100%;
      height: 130px;
    }
    .line-stroke {
      stroke-dasharray: 400;
      animation: drawLine 1s ease forwards;
    }
    .line-area { opacity: 0; animation: fadeArea 0.8s ease 0.2s forwards; }
    @keyframes drawLine {
      from { stroke-dashoffset: 400; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes fadeArea {
      to { opacity: 1; }
    }
    .line-labels {
      display: flex;
      justify-content: space-between;
      span { font-size: 0.65rem; color: var(--app-text-muted); }
    }
  `,
})
export class MiniChartComponent {
  @Input({ required: true }) title!: string
  @Input() kind: ChartKind = 'bar'
  @Input() data: { label: string; value: number; color?: string }[] = []
  @Input() secondaryData: { label: string; value: number; color?: string }[] = []
  @Input() animated = false

  private readonly colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#0ea5e9']

  barColor = (i: number): string => this.colors[i % this.colors.length]

  barHeight = (value: number): number => {
    const max = Math.max(...this.data.map((d) => d.value), 1)
    return Math.max(10, (value / max) * 100)
  }

  donutTotal = (): number => this.data.reduce((s, d) => s + d.value, 0)

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

  linePoints = (series: { label: string; value: number }[]): string => {
    if (!series.length) return ''
    const max = Math.max(...series.map((d) => d.value), 1)
    return series
      .map((d, i) => {
        const x = (i / Math.max(series.length - 1, 1)) * 200
        const y = 85 - (d.value / max) * 70
        return `${x},${y}`
      })
      .join(' ')
  }

  lineArea = (series: { label: string; value: number }[]): string => {
    const pts = this.linePoints(series)
    if (!pts) return ''
    return `0,90 ${pts} 200,90`
  }
}
