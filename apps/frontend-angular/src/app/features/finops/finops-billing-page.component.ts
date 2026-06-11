import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { FinopsBillingTableComponent } from './components/finops-billing-table.component'
import { FinopsCloudSelectorComponent } from './components/finops-cloud-selector.component'
import { FINOPS_INVOICES } from './data/mock-billing'

@Component({
  selector: 'app-finops-billing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, FinopsBillingTableComponent, FinopsCloudSelectorComponent],
  template: `
    <div class="page-container finops-page">
      <header class="finops-hero">
        <h1>Facturación FinOps</h1>
        <p>Facturas consolidadas AWS, GCP y Azure con filtros y exportación.</p>
        <div class="finops-actions">
          <button mat-stroked-button type="button"><mat-icon>download</mat-icon> Exportar CSV</button>
          <button mat-stroked-button type="button"><mat-icon>picture_as_pdf</mat-icon> Exportar PDF</button>
        </div>
      </header>
      <app-finops-cloud-selector [selected]="provider()" (selectedChange)="provider.set($event)" />
      <app-finops-billing-table [invoices]="invoices" [providerFilter]="provider()" />
    </div>
  `,
  styles: [`
    @import './finops-theme.scss';
    .finops-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
  `],
})
export class FinopsBillingPageComponent {
  readonly invoices = FINOPS_INVOICES
  readonly provider = signal('all')
}
