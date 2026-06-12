import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { CloudLaunchProgressComponent, type CloudLaunchProgressState } from '../cloud-launch-progress.component'

@Component({
  selector: 'app-launch-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CloudLaunchProgressComponent],
  template: `<app-cloud-launch-progress [progress]="progress()" />`,
})
export class LaunchProgressComponent {
  readonly progress = input<CloudLaunchProgressState | null>(null)
}
