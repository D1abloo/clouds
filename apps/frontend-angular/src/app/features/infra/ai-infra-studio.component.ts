import { Component } from '@angular/core'
import { CloudLaunchWizardComponent } from '../cloud/cloud-launch-wizard.component'

@Component({
  selector: 'app-ai-infra-studio',
  standalone: true,
  imports: [CloudLaunchWizardComponent],
  template: `
    <div class="ais">
      <app-cloud-launch-wizard [studioMode]="true" [embedded]="true" />
    </div>
  `,
  styleUrl: './ai-infra-studio.component.scss',
})
export class AiInfraStudioComponent {}
