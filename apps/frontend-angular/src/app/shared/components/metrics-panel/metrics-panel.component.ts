import { Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

export interface MetricItem {
  label: string
  value: string | number
  icon?: string
  subtitle?: string
  trend?: string
  iconColor?: 'primary' | 'accent' | 'warn' | 'success' | 'info' | 'purple' | 'cyan'
}

@Component({
  selector: 'app-metrics-panel',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <section class="metrics-panel" [attr.aria-label]="title() || 'Metrics'">
      @if (title()) {
        <header class="metrics-panel__head">
          @if (icon()) {
            <span class="metrics-panel__head-icon"><mat-icon>{{ icon() }}</mat-icon></span>
          }
          <div>
            <h3 class="metrics-panel__title">{{ title() }}</h3>
            @if (subtitle()) {
              <p class="metrics-panel__subtitle">{{ subtitle() }}</p>
            }
          </div>
        </header>
      }
      <div class="metrics-panel__list">
        @for (item of items(); track item.label) {
          <div class="metric-row" [attr.aria-label]="item.label + ': ' + item.value">
            <span class="metric-row__icon" [class]="toneClass(item.iconColor)">
              <mat-icon>{{ item.icon ?? 'insights' }}</mat-icon>
            </span>
            <div class="metric-row__main">
              <span class="metric-row__label">{{ item.label }}</span>
              @if (item.subtitle) {
                <span class="metric-row__sub">{{ item.subtitle }}</span>
              }
            </div>
            <div class="metric-row__end">
              @if (item.trend) {
                <span class="metric-row__trend">{{ item.trend }}</span>
              }
              <span class="metric-row__value">{{ item.value }}</span>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class MetricsPanelComponent {
  readonly title = input<string>('')
  readonly subtitle = input<string>('')
  readonly icon = input<string>('')
  readonly items = input.required<MetricItem[]>()

  toneClass = (tone?: MetricItem['iconColor']): string => `tone-${tone ?? 'primary'}`
}
