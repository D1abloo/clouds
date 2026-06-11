import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import type { FinopsKpi } from '../data/mock-kpis'

@Component({
  selector: 'app-finops-kpi-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <article class="finops-card finops-kpi" [class]="'finops-kpi--' + kpi().tone">
      <div class="finops-kpi__head">
        <mat-icon>{{ kpi().icon }}</mat-icon>
        <span class="finops-kpi__label">{{ kpi().label }}</span>
      </div>
      <strong class="finops-kpi__value">{{ kpi().value }}</strong>
      <span class="finops-kpi__delta">{{ kpi().delta }}</span>
    </article>
  `,
  styles: `
    .finops-kpi__head { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem; color: var(--finops-muted); font-size: 0.75rem; font-weight: 600; }
    .finops-kpi__value { display: block; font-size: 1.45rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.25rem; }
    .finops-kpi__delta { font-size: 0.72rem; color: var(--finops-muted); }
    .finops-kpi--savings .finops-kpi__value { color: var(--finops-savings); }
    .finops-kpi--overcost .finops-kpi__value { color: var(--finops-overcost); }
    .finops-kpi--electric .finops-kpi__value { color: var(--finops-electric); }
  `,
})
export class FinopsKpiCardComponent {
  readonly kpi = input.required<FinopsKpi>()
}
