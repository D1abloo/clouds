import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'

export type StatTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

/** Inline metric row for dashboard sections (no per-metric card). */
@Component({
  selector: 'app-stat-card',
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
        @if (updated) {
          <span class="metric-row__sub"><mat-icon class="metric-row__clock">schedule</mat-icon>{{ updated }}</span>
        }
      </div>
      <div class="metric-row__end">
        @if (trend) {
          <span class="metric-row__trend" [class.metric-row__trend--down]="trendDown" [matTooltip]="trend">
            <mat-icon>{{ trendDown ? 'trending_down' : 'trending_up' }}</mat-icon>
            {{ trend }}
          </span>
        }
        @if (badge) {
          <span class="metric-row__badge" [matTooltip]="badge">{{ badge }}</span>
        }
        <span class="metric-row__value" [matTooltip]="valueTooltip()">{{ value }}</span>
      </div>
    </div>
  `,
})
export class StatCardComponent {
  @Input({ required: true }) title!: string
  @Input({ required: true }) value!: string | number
  @Input() subtitle = ''
  @Input() trend = ''
  @Input() trendDown = false
  @Input() badge = ''
  @Input() updated = ''
  @Input() icon = 'insights'
  @Input() tone: StatTone = 'default'
  @Input() delay = 0

  toneClass = (): string => {
    const map: Record<StatTone, string> = {
      default: 'tone-primary',
      primary: 'tone-primary',
      success: 'tone-success',
      warning: 'tone-warn',
      danger: 'tone-warn',
      info: 'tone-info',
    }
    return map[this.tone] ?? 'tone-primary'
  }

  valueTooltip = (): string => String(this.value)
}
