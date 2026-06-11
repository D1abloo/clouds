import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { CloudLaunchInfraPreviewComponent } from '../cloud-launch-infra-preview.component'
import type { CloudSlug } from '../cloud-provider.data'

@Component({
  selector: 'app-infra-copilot-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, CloudLaunchInfraPreviewComponent],
  template: `
    <aside class="copilot" aria-label="Copilot Infra">
      <header class="copilot__head">
        <mat-icon>assistant</mat-icon>
        <div>
          <strong>Copilot Infra</strong>
          <span>Guía en tiempo real</span>
        </div>
      </header>
      <p class="copilot__hint">{{ hint() }}</p>
      <ul class="copilot__list">
        <li><span>Paso</span><strong>{{ stepLabel() }}</strong></li>
        <li><span>Región</span><strong>{{ region() || '—' }}</strong></li>
        <li><span>Zona</span><strong>{{ zone() || '—' }}</strong></li>
        <li><span>Red</span><strong>{{ network() || '—' }}</strong></li>
        <li><span>Coste est.</span><strong>{{ costHint() || '—' }}</strong></li>
      </ul>
      @if (alertTitle()) {
        <div class="copilot__alert" [class.copilot__alert--danger]="alertDanger()">
          <mat-icon>{{ alertDanger() ? 'error' : 'info' }}</mat-icon>
          <span>{{ alertTitle() }}</span>
        </div>
      }
      <app-cloud-launch-infra-preview
        [slug]="slug()"
        [region]="region()"
        [network]="network()"
        [securityGroup]="securityGroup()"
        [instanceType]="instanceType()"
        [imageName]="imageName()"
        [instanceName]="instanceName()"
        [specs]="specs()"
        [monthlyCost]="costHint()"
        [launchPercent]="progressPct()"
        [diskGb]="diskGb()"
        [diskType]="diskType()"
        [keyPair]="keyPair()"
        [publicIp]="publicIp()"
      />
    </aside>
  `,
  styleUrl: './infra-copilot-panel.component.scss',
})
export class InfraCopilotPanelComponent {
  readonly slug = input<CloudSlug>('aws')
  readonly stepLabel = input('Proveedor')
  readonly hint = input('Configura la infraestructura paso a paso. Los errores se validan antes del lanzamiento.')
  readonly region = input('')
  readonly zone = input('')
  readonly network = input('')
  readonly securityGroup = input('')
  readonly instanceType = input('')
  readonly imageName = input('')
  readonly instanceName = input('')
  readonly specs = input('—')
  readonly costHint = input('')
  readonly progressPct = input(0)
  readonly diskGb = input<number | undefined>(undefined)
  readonly diskType = input('')
  readonly keyPair = input('')
  readonly publicIp = input(false)
  readonly alertTitle = input('')
  readonly alertDanger = input(false)
}
