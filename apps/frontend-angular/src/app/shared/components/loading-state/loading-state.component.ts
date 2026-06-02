import { Component, Input } from '@angular/core'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="state-container" role="status" [attr.aria-label]="message">
      <mat-spinner diameter="40" />
      <p>{{ message }}</p>
    </div>
  `,
  styles: `
    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 3rem 1rem;
      color: var(--app-text-muted);
    }
  `,
})
export class LoadingStateComponent {
  @Input() message = 'Loading...'
}
