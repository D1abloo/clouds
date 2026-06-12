import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FinopsInstanceTableComponent } from './components/finops-instance-table.component'
import { FinopsCloudSelectorComponent } from './components/finops-cloud-selector.component'
import { FINOPS_INSTANCES, type FinopsInstance } from './data/mock-instances'
import {
  CloudLaunchActivityService,
  type LaunchInventoryResource,
} from '../../core/services/cloud-launch-activity.service'
import type { FinopsCloudProvider } from './data/mock-billing'

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
      <app-finops-instance-table [instances]="instances()" [providerFilter]="provider()" />
    </div>
  `,
  styleUrl: './finops-theme.scss',
})
export class FinopsInstancesPageComponent {
  private readonly activity = inject(CloudLaunchActivityService)
  readonly instances = computed(() => [...this.activity.resources().map(this.toFinopsInstance), ...FINOPS_INSTANCES])
  readonly provider = signal('all')

  private readonly toFinopsInstance = (row: LaunchInventoryResource): FinopsInstance => ({
    id: row.id,
    name: row.name,
    provider: this.finopsProvider(row.provider),
    region: row.zone ? `${row.region} / ${row.zone}` : row.region,
    type: row.instanceType,
    monthlyCost: row.monthlyCost ?? 0,
    utilization: row.status === 'TERMINATED' ? 0 : 35,
    recommendation: row.status === 'TERMINATED' ? 'Recurso eliminado' : 'Coste generado por AI Infra Studio',
    severity: row.status === 'TERMINATED' ? 'low' : 'medium',
    status: row.status === 'TERMINATED' ? 'stopped' : 'running',
  })

  private finopsProvider = (provider: string): FinopsCloudProvider => {
    if (provider === 'AZURE') return 'Azure'
    if (provider === 'GCP') return 'GCP'
    if (provider === 'IONOS') return 'IONOS'
    return 'AWS'
  }
}
