import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { CloudLaunchInfraPreviewComponent } from '../cloud-launch-infra-preview.component'
import type { CloudSlug } from '../cloud-provider.data'

@Component({
  selector: 'app-cloud-architecture-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CloudLaunchInfraPreviewComponent],
  template: `
    <app-cloud-launch-infra-preview
      [slug]="slug()"
      [region]="region()"
      [network]="network()"
      [securityGroup]="securityGroup()"
      [instanceType]="instanceType()"
      [imageName]="imageName()"
      [instanceName]="instanceName()"
      [specs]="specs()"
      [monthlyCost]="monthlyCost()"
      [launchPercent]="launchPercent()"
      [diskGb]="diskGb()"
      [diskType]="diskType()"
      [keyPair]="keyPair()"
      [publicIp]="publicIp()"
    />
  `,
})
export class CloudArchitecturePreviewComponent {
  readonly slug = input.required<CloudSlug>()
  readonly region = input('')
  readonly network = input('')
  readonly securityGroup = input('')
  readonly instanceType = input('')
  readonly imageName = input('')
  readonly instanceName = input('')
  readonly specs = input('—')
  readonly monthlyCost = input('$0')
  readonly launchPercent = input(0)
  readonly diskGb = input<number | undefined>()
  readonly diskType = input('')
  readonly keyPair = input('')
  readonly publicIp = input(false)
}
