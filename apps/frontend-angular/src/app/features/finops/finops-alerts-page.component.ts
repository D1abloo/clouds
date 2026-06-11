import { ChangeDetectionStrategy, Component } from '@angular/core'
import { FinopsAlertCardComponent } from './components/finops-alert-card.component'
import { FINOPS_ALERTS } from './data/mock-alerts'

@Component({
  selector: 'app-finops-alerts-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FinopsAlertCardComponent],
  template: `
    <div class="page-container finops-page">
      <header class="finops-hero">
        <h1>Alertas FinOps</h1>
        <p>Presupuestos, picos de coste y anomalías de facturación.</p>
      </header>
      <div class="finops-grid" style="grid-template-columns: 1fr;">
        @for (a of alerts; track a.id) {
          <app-finops-alert-card [alert]="a" />
        }
      </div>
    </div>
  `,
  styleUrl: './finops-theme.scss',
})
export class FinopsAlertsPageComponent {
  readonly alerts = FINOPS_ALERTS
}
