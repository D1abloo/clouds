import { DecimalPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import type { FinopsAlert } from '../data/mock-alerts'

@Component({
  selector: 'app-finops-alert-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatIconModule],
  template: `
    <article class="finops-card finops-alert" [class]="'finops-alert--' + alert().severity">
      <div class="finops-alert__head">
        <mat-icon>{{ icon() }}</mat-icon>
        <div>
          <strong>{{ alert().title }}</strong>
          <span class="finops-alert__meta">{{ alert().provider }} · {{ dateLabel() }}</span>
        </div>
      </div>
      <p>{{ alert().description }}</p>
      @if (alert().amount) {
        <span class="finops-badge finops-badge--over">Impacto: € {{ alert().amount | number:'1.0-0' }}</span>
      }
    </article>
  `,
  styles: `
    .finops-alert__head { display: flex; gap: 0.6rem; align-items: flex-start; margin-bottom: 0.5rem; }
    .finops-alert__meta { display: block; font-size: 0.68rem; color: var(--finops-muted); margin-top: 0.15rem; }
    p { margin: 0 0 0.5rem; font-size: 0.82rem; color: var(--finops-muted); line-height: 1.45; }
    .finops-alert--critical { border-left: 3px solid var(--finops-overcost); }
    .finops-alert--warning { border-left: 3px solid #fbbf24; }
    .finops-alert--info { border-left: 3px solid var(--finops-electric); }
  `,
})
export class FinopsAlertCardComponent {
  readonly alert = input.required<FinopsAlert>()

  icon = (): string =>
    ({ critical: 'error', warning: 'warning', info: 'info' })[this.alert().severity]

  dateLabel = (): string =>
    new Date(this.alert().createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
