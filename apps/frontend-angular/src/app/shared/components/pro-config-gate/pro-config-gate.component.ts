import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { ProModeService } from '../../../core/services/pro-mode.service'
import { ConnectionRequiredComponent } from '../connection-required/connection-required.component'

@Component({
  selector: 'app-pro-config-gate',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConnectionRequiredComponent],
  template: `
    @if (requiresConfig()) {
      <app-connection-required [module]="module()" />
    } @else {
      <ng-content />
    }
  `,
})
export class ProConfigGateComponent {
  private readonly pro = inject(ProModeService)

  readonly module = input.required<string>()
  /** Si true, el contenido se muestra también en modo PRO (p. ej. páginas con API real). */
  readonly liveData = input(false)

  readonly requiresConfig = computed(() => this.pro.proMode() && !this.liveData())
}
