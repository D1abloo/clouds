import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-launch-error-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="lec" [class.lec--warn]="level() === 'warning'" role="alert">
      <mat-icon>{{ level() === 'error' ? 'error' : 'warning' }}</mat-icon>
      <div>
        <strong>{{ title() }}</strong>
        <p>{{ message() }}</p>
        @if (suggestions().length) {
          <ul>
            @for (s of suggestions(); track s) {
              <li>{{ s }}</li>
            }
          </ul>
        }
      </div>
    </div>
  `,
  styleUrl: './launch-error-card.component.scss',
})
export class LaunchErrorCardComponent {
  readonly title = input.required<string>()
  readonly message = input.required<string>()
  readonly level = input<'error' | 'warning'>('error')
  readonly suggestions = input<string[]>([])
}
