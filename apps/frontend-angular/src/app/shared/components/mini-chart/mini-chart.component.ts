import { Component, Input } from '@angular/core'
import { chartColor } from '../../theme/chart-palette'

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
        <div class="mini-chart__bars-wrap">
          <div class="mini-chart__y-axis" aria-hidden="true">
            @for (tick of yTicks(); track tick) {
              <span>{{ tick }}{{ unit }}</span>
            }
          </div>
          <div class="mini-chart__bars">
            @for (item of data; track item.label; let i = $index) {
              <div class="bar-col" [title]="item.label + ': ' + formatValue(item.value)">
                <span class="bar-value">{{ formatValue(item.value) }}{{ unit }}</span>
                @if (showShare) {
                  <span class="bar-share">{{ sharePercent(item.value) }}</span>
                }
                <div class="bar-track">
                  <div
                    class="bar"
                    [style.height.%]="barHeight(item.value)"
                    [style.--bar-color]="item.color ?? barColor(i)"
                    [style.animation-delay.ms]="i * 70"
                  ></div>
                </div>
                <span class="bar-label">{{ item.label }}</span>
              </div>
            }
          </div>
        </div>
      } @else if (kind === 'donut') {
        <div class="mini-chart__donut-wrap">
          <div class="donut-center-wrap">
            <svg viewBox="0 0 42 42" class="donut" aria-hidden="true">
              <circle
                cx="21"
                cy="21"
                r="15.9"
                fill="transparent"
                stroke="color-mix(in srgb, var(--app-text-muted) 10%, transparent)"
                stroke-width="3.4"
              />
              @for (seg of donutSegments(); track seg.label) {
                <circle
                  class="donut-seg"
                  cx="21"
                  cy="21"
                  r="15.9"
                  fill="transparent"
                  [attr.stroke]="seg.color"
                  stroke-width="3.4"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="seg.dash"
                  [attr.stroke-dashoffset]="seg.offset"
                />
              }
            </svg>
            <div class="donut-center">
              <strong>{{ donutCenterValue() }}</strong>
              <span>{{ donutCenterLabel() }}</span>
            </div>
          </div>
          <ul class="donut-legend">
            @for (item of data; track item.label; let i = $index) {
              <li [title]="item.label + ': ' + formatValue(item.value)">
                <span class="donut-legend__dot" [style.background]="item.color ?? barColor(i)"></span>
                <div class="donut-legend__copy">
                  <em>{{ item.label }}</em>
                  <div class="donut-legend__nums">
                    <strong>{{ formatValue(item.value) }}</strong>
                    <small>{{ sharePercent(item.value) }}</small>
                  </div>
                </div>
                <div class="donut-legend__bar" aria-hidden="true">
                  <span [style.width.%]="barHeight(item.value)" [style.background]="item.color ?? barColor(i)"></span>
                </div>
              </li>
            }
          </ul>
        </div>
      } @else {
        <div class="line-wrap">
          @if (secondaryData.length) {
            <div class="line-legend">
              <span><i class="dot dot--primary"></i> CPU</span>
              <span><i class="dot dot--secondary"></i> RAM</span>
            </div>
          }
          <svg class="line-chart" viewBox="0 0 200 100" preserveAspectRatio="none" role="img">
            <defs>
              <linearGradient [attr.id]="uid + '-cpu'" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#6366f1" stop-opacity="0.32" />
                <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
              </linearGradient>
              <linearGradient [attr.id]="uid + '-ram'" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#10b981" stop-opacity="0.26" />
                <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
              </linearGradient>
            </defs>
            @for (y of lineGridY(); track y) {
              <line x1="0" [attr.y1]="y" x2="200" [attr.y2]="y" class="line-grid" />
            }
            @if (secondaryData.length) {
              <polygon [attr.points]="lineArea(secondaryData)" [attr.fill]="'url(#' + uid + '-ram)'" class="line-area" />
              <polyline [attr.points]="linePoints(secondaryData)" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" class="line-stroke line-stroke--secondary" />
              @for (pt of lineDots(secondaryData); track pt.x) {
                <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="2.8" fill="#10b981" class="line-dot" />
              }
            }
            <polygon [attr.points]="lineArea(data)" [attr.fill]="'url(#' + uid + '-cpu)'" class="line-area" />
            <polyline [attr.points]="linePoints(data)" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" class="line-stroke" />
            @for (pt of lineDots(data); track pt.x) {
              <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="3" fill="#6366f1" class="line-dot" />
            }
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
      min-height: 190px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .mini-chart__title {
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 0.65rem;
      color: var(--app-text-muted);
    }
    .mini-chart__bars-wrap {
      display: flex;
      gap: 0.45rem;
      flex: 1;
      min-height: 190px;
    }
    .mini-chart__y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 1.5rem 0 1.6rem;
      flex-shrink: 0;
      span {
        font-size: 0.58rem;
        font-weight: 600;
        color: color-mix(in srgb, var(--app-text-muted) 70%, transparent);
        font-variant-numeric: tabular-nums;
      }
    }
    .mini-chart__bars {
      flex: 1;
      display: flex;
      align-items: flex-end;
      gap: 0.55rem;
      height: 100%;
      padding: 1.35rem 0.15rem 0;
      background-image: repeating-linear-gradient(
        to top,
        color-mix(in srgb, var(--app-text-muted) 7%, transparent) 0,
        color-mix(in srgb, var(--app-text-muted) 7%, transparent) 1px,
        transparent 1px,
        transparent 25%
      );
      border-radius: 8px;
    }
    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.28rem;
      min-width: 0;
      cursor: default;
    }
    .bar-value {
      font-size: 0.62rem;
      font-weight: 750;
      color: var(--app-text);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .bar-share {
      font-size: 0.55rem;
      font-weight: 650;
      color: var(--app-text-muted);
    }
    .bar-track {
      width: 100%;
      max-width: 56px;
      height: 120px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .bar-label {
      font-size: 0.62rem;
      color: var(--app-text-muted);
      text-align: center;
      font-weight: 600;
      line-height: 1.2;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .bar {
      width: 100%;
      border-radius: 8px 8px 4px 4px;
      min-height: 4px;
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--bar-color) 88%, white),
        var(--bar-color)
      );
      box-shadow: 0 4px 14px color-mix(in srgb, var(--bar-color) 28%, transparent);
      transition: height 0.55s cubic-bezier(0.34, 1.2, 0.64, 1);
    }
    .mini-chart--animated .bar {
      animation: barGrow 0.65s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
      transform-origin: bottom;
    }
    @keyframes barGrow {
      from { transform: scaleY(0); opacity: 0.4; }
      to { transform: scaleY(1); opacity: 1; }
    }
    .mini-chart__donut-wrap {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-height: 190px;
      flex: 1;
    }
    .donut-center-wrap {
      position: relative;
      flex-shrink: 0;
    }
    .donut {
      width: 132px;
      height: 132px;
      transform: rotate(-90deg);
      filter: drop-shadow(0 2px 8px color-mix(in srgb, var(--app-accent) 12%, transparent));
    }
    .donut-seg {
      transition: stroke-dasharray 0.7s ease, stroke-dashoffset 0.7s ease;
    }
    .donut-center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      strong {
        font-size: 1.45rem;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }
      span {
        margin-top: 0.15rem;
        font-size: 0.6rem;
        color: var(--app-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-weight: 650;
      }
    }
    .donut-legend {
      list-style: none;
      padding: 0;
      margin: 0;
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .donut-legend li {
      display: grid;
      grid-template-columns: auto 1fr;
      grid-template-rows: auto auto;
      gap: 0.15rem 0.5rem;
      padding: 0.35rem 0.4rem;
      border-radius: 8px;
      transition: background 0.18s ease;
      &:hover { background: color-mix(in srgb, var(--app-accent) 5%, transparent); }
    }
    .donut-legend__dot {
      width: 9px;
      height: 9px;
      border-radius: 3px;
      margin-top: 0.35rem;
      grid-row: 1 / span 2;
    }
    .donut-legend__copy {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.5rem;
      min-width: 0;
      em {
        font-style: normal;
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--app-text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    .donut-legend__nums {
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
      flex-shrink: 0;
      strong { font-size: 0.82rem; font-weight: 800; font-variant-numeric: tabular-nums; }
      small { font-size: 0.62rem; font-weight: 700; color: var(--app-accent); }
    }
    .donut-legend__bar {
      grid-column: 2;
      height: 3px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text-muted) 10%, transparent);
      overflow: hidden;
      span {
        display: block;
        height: 100%;
        border-radius: 999px;
        transition: width 0.6s ease;
      }
    }
    .line-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      flex: 1;
      min-height: 190px;
    }
    .line-legend {
      display: flex;
      gap: 1rem;
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--app-text-muted);
      span { display: inline-flex; align-items: center; gap: 0.32rem; }
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      &--primary { background: #6366f1; }
      &--secondary { background: #10b981; }
    }
    .line-chart {
      width: 100%;
      height: 140px;
      flex: 1;
    }
    .line-grid {
      stroke: color-mix(in srgb, var(--app-text-muted) 8%, transparent);
      stroke-width: 0.6;
      vector-effect: non-scaling-stroke;
    }
    .line-stroke {
      stroke-dasharray: 420;
      animation: drawLine 1.1s ease forwards;
      filter: drop-shadow(0 1px 2px color-mix(in srgb, #6366f1 25%, transparent));
    }
    .line-stroke--secondary { filter: drop-shadow(0 1px 2px color-mix(in srgb, #10b981 20%, transparent)); }
    .line-area { opacity: 0; animation: fadeArea 0.85s ease 0.15s forwards; }
    .line-dot { opacity: 0; animation: fadeArea 0.5s ease 0.7s forwards; }
    @keyframes drawLine {
      from { stroke-dashoffset: 420; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes fadeArea {
      to { opacity: 1; }
    }
    .line-labels {
      display: flex;
      justify-content: space-between;
      padding: 0 0.1rem;
      span {
        font-size: 0.6rem;
        font-weight: 600;
        color: var(--app-text-muted);
        font-variant-numeric: tabular-nums;
      }
    }
  `,
})
export class MiniChartComponent {
  private static nextUid = 0
  readonly uid = `mc-${MiniChartComponent.nextUid++}`

  @Input({ required: true }) title!: string
  @Input() kind: ChartKind = 'bar'
  @Input() data: { label: string; value: number; color?: string }[] = []
  @Input() secondaryData: { label: string; value: number; color?: string }[] = []
  @Input() animated = false
  @Input() unit = ''
  @Input() showShare = false
  @Input() centerLabel = 'total'

  barColor = (i: number): string => chartColor(i)

  formatValue = (value: number): string => {
    if (Number.isInteger(value)) return String(value)
    return value.toFixed(1)
  }

  dataMax = (): number => Math.max(...this.data.map((d) => d.value), 1)

  dataTotal = (): number => this.data.reduce((s, d) => s + d.value, 0)

  sharePercent = (value: number): string => {
    const total = this.dataTotal()
    if (!total) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }

  barHeight = (value: number): number => {
    const max = this.dataMax()
    return Math.max(6, (value / max) * 100)
  }

  yTicks = (): number[] => {
    const max = this.dataMax()
    const step = max <= 10 ? 2 : max <= 50 ? 10 : max <= 100 ? 25 : Math.ceil(max / 4 / 10) * 10
    const top = Math.ceil(max / step) * step
    return [top, Math.round(top * 0.66), Math.round(top * 0.33), 0]
  }

  donutTotal = (): number => this.dataTotal()

  donutCenterValue = (): string => this.formatValue(this.donutTotal())

  donutCenterLabel = (): string => this.centerLabel

  donutSegments = () => {
    const total = this.donutTotal() || 1
    let offset = 25
    return this.data.map((d, i) => {
      const pct = (d.value / total) * 100
      const dash = `${pct} ${100 - pct}`
      const seg = { label: d.label, color: d.color ?? chartColor(i), dash, offset }
      offset -= pct
      return seg
    })
  }

  lineGridY = (): number[] => [20, 40, 60, 80]

  linePoints = (series: { label: string; value: number }[]): string => {
    if (!series.length) return ''
    const max = Math.max(...series.map((d) => d.value), 1)
    return series
      .map((d, i) => {
        const x = (i / Math.max(series.length - 1, 1)) * 200
        const y = 92 - (d.value / max) * 72
        return `${x},${y}`
      })
      .join(' ')
  }

  lineArea = (series: { label: string; value: number }[]): string => {
    const pts = this.linePoints(series)
    if (!pts) return ''
    return `0,92 ${pts} 200,92`
  }

  lineDots = (series: { label: string; value: number }[]): { x: number; y: number }[] => {
    if (!series.length) return []
    const max = Math.max(...series.map((d) => d.value), 1)
    return series.map((d, i) => ({
      x: (i / Math.max(series.length - 1, 1)) * 200,
      y: 92 - (d.value / max) * 72,
    }))
  }
}
