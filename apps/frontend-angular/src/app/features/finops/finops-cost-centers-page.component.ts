import { DecimalPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { FINOPS_COST_CENTERS } from './data/mock-cost-centers'

@Component({
  selector: 'app-finops-cost-centers-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="page-container finops-page">
      <header class="finops-hero">
        <h1>Centros de coste</h1>
        <p>Desglose presupuestario por equipo y proveedor cloud.</p>
      </header>
      <div class="finops-grid">
        @for (cc of centers; track cc.id) {
          <article class="finops-card">
            <h3>{{ cc.name }}</h3>
            <p class="meta">{{ cc.owner }} · {{ cc.providers.join(', ') }}</p>
            <div class="bar-track">
              <div class="bar-fill" [style.width.%]="pct(cc)"></div>
            </div>
            <p class="nums">€ {{ cc.spent | number:'1.0-0' }} / € {{ cc.budget | number:'1.0-0' }} ({{ pct(cc) | number:'1.0-0' }} %)</p>
          </article>
        }
      </div>
    </div>
  `,
  styles: [`
    @import './finops-theme.scss';
    h3 { margin: 0 0 0.25rem; font-size: 1rem; }
    .meta { margin: 0 0 0.75rem; font-size: 0.75rem; color: var(--finops-muted); }
    .bar-track { height: 8px; border-radius: 999px; background: color-mix(in srgb, #334155 80%, transparent); overflow: hidden; margin-bottom: 0.5rem; }
    .bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--finops-electric), var(--finops-purple)); }
    .nums { margin: 0; font-size: 0.82rem; font-weight: 600; }
  `],
})
export class FinopsCostCentersPageComponent {
  readonly centers = FINOPS_COST_CENTERS
  pct = (cc: (typeof FINOPS_COST_CENTERS)[0]): number => Math.min(100, Math.round((cc.spent / cc.budget) * 100))
}
