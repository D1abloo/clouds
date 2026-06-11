import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { CloudLaunchProgressComponent, type CloudLaunchProgressState } from '../cloud-launch-progress.component'

@Component({
  selector: 'app-launch-progress-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, CloudLaunchProgressComponent],
  template: `
    <section class="lpp">
      <header>
        <mat-icon>sync</mat-icon>
        <strong>{{ title() }}</strong>
      </header>
      @if (progress()) {
        <app-cloud-launch-progress [progress]="progress()" />
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
