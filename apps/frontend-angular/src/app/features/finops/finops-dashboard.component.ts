import { ChangeDetectionStrategy, Component } from '@angular/core'
import { FinopsKpiCardComponent } from './components/finops-kpi-card.component'
import { FinopsChartCardComponent } from './components/finops-chart-card.component'
import { FINOPS_KPIS } from './data/mock-kpis'
import { FINOPS_BILLING_CHART } from './data/mock-billing'

@Component({
  selector: 'app-finops-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FinopsKpiCardComponent, FinopsChartCardComponent],
  template: `
    <div class="page-container finops-page">
      <header class="finops-hero">
        <h1>Panel FinOps</h1>
        <p>KPIs consolidados de gasto, ahorro y salud financiera cloud.</p>
      </header>
      <div class="finops-grid">
        @for (kpi of kpis; track kpi.id) {
          <app-finops-kpi-card [kpi]="kpi" />
        }
      </div>
      <div class="finops-grid" style="margin-top: 1rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        <app-finops-chart-card title="Gasto por proveedor (MTD)" kind="bar" [data]="billingChart" />
        <app-finops-chart-card title="Distribución de coste" kind="donut" [data]="billingChart" />
      </div>
    </div>
  `,
  styleUrl: './finops-theme.scss',
})
export class FinopsDashboardComponent {
  readonly kpis = FINOPS_KPIS
  readonly billingChart = FINOPS_BILLING_CHART.map((d, i) => ({
    ...d,
    color: ['#ff9900', '#4285f4', '#0078d4'][i],
  }))
}
