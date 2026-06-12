import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { type CloudLaunchProgressState } from '../cloud-launch-progress.component'
import { LaunchProgressComponent } from './launch-progress.component'
import { panelReveal } from '../../../shared/animations/ui-motion.animations'

@Component({
  selector: 'app-launch-progress-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, LaunchProgressComponent],
  animations: [panelReveal],
  template: `
    <section class="lpp" @panelReveal>
      <header>
        <mat-icon>sync</mat-icon>
        <strong>{{ title() }}</strong>
      </header>
      @if (progress()) {
        <app-launch-progress [progress]="progress()" />
      } @else {
        <p class="lpp__idle">{{ idleText() }}</p>
      }
    </section>
  `,
  styleUrl: './launch-progress-panel.component.scss',
})
export class LaunchProgressPanelComponent {
  readonly title = input('Provisionando recurso…')
  readonly idleText = input('Pulsa Lanzar para iniciar el despliegue.')
  readonly progress = input<CloudLaunchProgressState | null>(null)
}
