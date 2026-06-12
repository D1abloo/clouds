import { Component, computed, inject } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { map, startWith } from 'rxjs'
import { CloudLaunchWizardComponent } from '../cloud/cloud-launch-wizard.component'

@Component({
  selector: 'app-ai-infra-studio',
  standalone: true,
  imports: [CloudLaunchWizardComponent],
  template: `
    <div class="ais">
      <app-cloud-launch-wizard [studioMode]="true" [embedded]="true" [initialProvider]="initialProvider()" />
    </div>
  `,
  styleUrl: './ai-infra-studio.component.scss',
})
export class AiInfraStudioComponent {
  private readonly route = inject(ActivatedRoute)
  private readonly params = toSignal(
    this.route.queryParamMap.pipe(
      map((p) => p.get('provider')),
      startWith(this.route.snapshot.queryParamMap.get('provider')),
    ),
    { initialValue: this.route.snapshot.queryParamMap.get('provider') },
  )

  readonly initialProvider = computed(() => this.params())
}
