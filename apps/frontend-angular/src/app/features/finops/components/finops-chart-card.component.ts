import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MiniChartComponent } from '../../../shared/components/mini-chart/mini-chart.component'

@Component({
  selector: 'app-finops-chart-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MiniChartComponent],
  template: `
    <article class="finops-card finops-chart-card">
      <h3 class="finops-chart-card__title">{{ title() }}</h3>
      <app-mini-chart [title]="''" [kind]="kind()" [data]="data()" [animated]="true" />
    </article>
  `,
  styles: `
    .finops-chart-card__title { margin: 0 0 0.75rem; font-size: 0.9rem; font-weight: 700; color: var(--finops-text); }
    :host ::ng-deep .mini-chart { --app-text-muted: var(--finops-muted); }
  `,
})
export class FinopsChartCardComponent {
  readonly title = input.required<string>()
  readonly kind = input<'bar' | 'donut' | 'line'>('bar')
  readonly data = input<{ label: string; value: number; color?: string }[]>([])
}
