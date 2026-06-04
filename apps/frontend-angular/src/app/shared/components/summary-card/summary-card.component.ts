import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'

/** Inline metric row — use inside `.summary-grid` / `.metrics-panel` (no individual card chrome). */
@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  template: `
    <div class="metric-row" [attr.aria-label]="title">
      <span class="metric-row__icon" [class]="toneClass()">
        <mat-icon>{{ icon }}</mat-icon>
      </span>
      <div class="metric-row__main">
        <span class="metric-row__label" [matTooltip]="title">{{ title }}</span>
        @if (subtitle) {
          <span class="metric-row__sub" [matTooltip]="subtitle">{{ subtitle }}</span>
        }
      </div>
      <div class="metric-row__end">
        @if (trend) {
          <span class="metric-row__trend" [matTooltip]="trend">{{ trend }}</span>
        }
        <span class="metric-row__value" [matTooltip]="valueTooltip()">{{ value }}</span>
      </div>
    </div>
  `,
})
export class SummaryCardComponent {
  @Input({ required: true }) title!: string
  @Input({ required: true }) value!: string | number
  @Input() subtitle?: string
  @Input() trend?: string
  @Input() icon = 'insights'
  @Input() iconColor: 'primary' | 'accent' | 'warn' | 'success' | 'info' | 'purple' | 'cyan' | undefined = 'primary'
  /** @deprecated No-op — kept for API compatibility with existing templates */
  @Input() variant: 'default' | 'elevated' = 'default'

  toneClass = (): string => `tone-${this.iconColor ?? 'primary'}`

  valueTooltip = (): string => String(this.value)
}
