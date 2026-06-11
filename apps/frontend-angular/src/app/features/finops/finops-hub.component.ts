import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { FinopsKpiCardComponent } from './components/finops-kpi-card.component'
import { FINOPS_KPIS } from './data/mock-kpis'

@Component({
  selector: 'app-finops-hub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, FinopsKpiCardComponent],
  template: `
    <div class="page-container finops-page">
      <section class="finops-hero">
        <img src="/assets/finops/hero-finops.svg" alt="" width="48" height="48" class="finops-hero__icon" />
        <h1>FinOps Spendlyx</h1>
        <p>Visibilidad financiera multi-cloud, optimización de costes e insights con IA.</p>
      </section>
      <div class="finops-grid">
        @for (kpi of kpis; track kpi.id) {
          <app-finops-kpi-card [kpi]="kpi" />
        }
      </div>
      <nav class="finops-links" aria-label="Accesos rápidos FinOps">
        @for (link of quickLinks; track link.route) {
          <a class="finops-link" [routerLink]="link.route">
            <mat-icon>{{ link.icon }}</mat-icon>
            {{ link.label }}
          </a>
        }
      </nav>
    </div>
  `,
  styleUrl: './finops-theme.scss',
})
export class FinopsHubComponent {
  readonly kpis = FINOPS_KPIS.slice(0, 4)
  readonly quickLinks = [
    { route: '/finops/dashboard', label: 'Panel completo', icon: 'dashboard' },
    { route: '/finops/billing', label: 'Facturación', icon: 'receipt_long' },
    { route: '/finops/instances', label: 'Instancias', icon: 'dns' },
    { route: '/finops/recommendations', label: 'Insights IA', icon: 'auto_awesome' },
    { route: '/finops/alerts', label: 'Alertas', icon: 'warning_amber' },
    { route: '/finops/reports', label: 'Informes', icon: 'summarize' },
  ]
}
