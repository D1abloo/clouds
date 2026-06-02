import { Component, Input, output } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="state-container" role="alert">
      <mat-icon class="state-icon" color="warn">error_outline</mat-icon>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <button
        mat-stroked-button
        color="primary"
        type="button"
        (click)="retry.emit()"
      >
        Try again
      </button>
    </div>
  `,
  styles: `
    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 3rem 1rem;
    }
    .state-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      margin-bottom: 0.5rem;
    }
    h3 { margin: 0 0 0.5rem; }
    p {
      margin: 0 0 1rem;
      color: var(--app-text-muted);
      max-width: 400px;
    }
  `,
})
export class ErrorStateComponent {
  @Input() title = 'Something went wrong'
  @Input() message = 'Unable to load data. Please try again.'
  readonly retry = output<void>()
}
