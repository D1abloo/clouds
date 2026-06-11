import { DecimalPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { FINOPS_RECOMMENDATIONS } from './data/mock-recommendations'

@Component({
  selector: 'app-finops-recommendations-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatIconModule],
  template: `
    <div class="page-container finops-page">
      <header class="finops-hero">
        <h1><mat-icon>auto_awesome</mat-icon> Insights IA FinOps</h1>
        <p>Recomendaciones generadas por Copilot para reducir gasto sin perder rendimiento.</p>
      </header>
      <div class="finops-grid" style="grid-template-columns: 1fr;">
        @for (r of recs; track r.id) {
          <article class="finops-card rec">
            <div class="rec__head">
              <span class="finops-badge finops-badge--savings">€ {{ r.savingsMonthly | number:'1.0-0' }}/mes</span>
              <span class="finops-badge finops-badge--warn">{{ r.effort }}</span>
            </div>
            <h3>{{ r.title }}</h3>
            <p>{{ r.summary }}</p>
            <span class="meta">{{ r.category }} · {{ r.provider }}</span>
          </article>
        }
      </div>
    </div>
  `,
  styles: [`
    @import './finops-theme.scss';
    h1 { display: flex; align-items: center; gap: 0.5rem; }
    .rec__head { display: flex; gap: 0.4rem; margin-bottom: 0.5rem; }
    h3 { margin: 0 0 0.35rem; font-size: 0.95rem; }
    p { margin: 0 0 0.5rem; font-size: 0.82rem; color: var(--finops-muted); line-height: 1.45; }
    .meta { font-size: 0.68rem; color: var(--finops-muted); }
  `],
})
export class FinopsRecommendationsPageComponent {
  readonly recs = FINOPS_RECOMMENDATIONS
}
