import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { FinopsInstanceTableComponent } from './components/finops-instance-table.component'
import { FinopsCloudSelectorComponent } from './components/finops-cloud-selector.component'
import { FINOPS_INSTANCES } from './data/mock-instances'

@Component({
  selector: 'app-finops-instances-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FinopsInstanceTableComponent, FinopsCloudSelectorComponent],
  template: `
    <div class="page-container finops-page">
      <header class="finops-hero">
        <h1>Instancias FinOps</h1>
        <p>Inventario con coste mensual, utilización y recomendaciones de optimización.</p>
      </header>
      <app-finops-cloud-selector [selected]="provider()" (selectedChange)="provider.set($event)" />
      <app-finops-instance-table [instances]="instances" [providerFilter]="provider()" />
    </div>
  `,
  styleUrl: './finops-theme.scss',
})
export class FinopsInstancesPageComponent {
  readonly instances = FINOPS_INSTANCES
  readonly provider = signal('all')
}
