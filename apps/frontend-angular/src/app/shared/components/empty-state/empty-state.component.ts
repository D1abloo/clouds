import { Component, Input, output } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="state-container" role="status">
      <mat-icon class="state-icon">{{ icon }}</mat-icon>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
      @if (actionLabel) {
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="actionClick.emit()"
        >
          {{ actionLabel }}
        </button>
      }
    </div>
  `,
  styles: `
    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 3rem 1rem;
      color: var(--app-text-muted);
    }
    .state-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      margin-bottom: 0.5rem;
      opacity: 0.6;
    }
    h3 {
      margin: 0 0 0.5rem;
      color: inherit;
      font-weight: 600;
    }
    p {
      margin: 0 0 1rem;
      max-width: 360px;
    }
  `,
})
export class EmptyStateComponent {
  @Input() icon = 'inbox'
  @Input() title = 'No data yet'
  @Input() description = 'There is nothing to display.'
  @Input() actionLabel?: string
  readonly actionClick = output<void>()
}
