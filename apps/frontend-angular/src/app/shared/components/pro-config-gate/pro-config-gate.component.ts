import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { ProModeService } from '../../../core/services/pro-mode.service'
import { ConnectionRequiredComponent } from '../connection-required/connection-required.component'
import { shouldBlockForMissingConnection } from '../../../core/routing/module-requirements.util'

@Component({
  selector: 'app-pro-config-gate',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConnectionRequiredComponent],
  template: `
    @if (requiresConfig()) {
      <app-connection-required [moduleId]="moduleKey()" />
    } @else {
      <ng-content />
    }
  `,
})
export class ProConfigGateComponent {
  private readonly pro = inject(ProModeService)

  readonly module = input.required<string>()
  readonly moduleId = input<string>('')
  readonly liveData = input(false)

  readonly moduleKey = computed(() => {
    const explicit = this.moduleId().trim()
    return explicit || this.module()
  })

  readonly requiresConfig = computed(
    () => this.pro.proMode() && shouldBlockForMissingConnection(this.moduleKey(), this.liveData()),
  )
}
