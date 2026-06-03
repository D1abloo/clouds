import { Component, Input, output } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="state-container animate-fade-in surface-elevated" role="alert">
      <div class="state-icon-wrap">
        <mat-icon>error_outline</mat-icon>
      </div>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <button mat-flat-button color="primary" type="button" (click)="retry.emit()">
        <mat-icon>refresh</mat-icon> Try again
      </button>
    </div>
  `,
  styles: `
    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 2.5rem 1.5rem;
      border-radius: var(--app-radius-lg);
      margin: 1rem 0;
    }
    .state-icon-wrap {
      width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(239,68,68,0.1); margin-bottom: 0.75rem;
      mat-icon { color: #ef4444; font-size: 2rem; width: 2rem; height: 2rem; }
    }
    h3 { margin: 0 0 0.35rem; font-weight: 600; }
    p { margin: 0 0 1.25rem; color: var(--app-text-muted); max-width: 400px; line-height: 1.5; }
    button { display: inline-flex; align-items: center; gap: 0.35rem; }
  `,
})
export class ErrorStateComponent {
  @Input() title = 'Something went wrong'
  @Input() message = 'Unable to load data. Please try again.'
  readonly retry = output<void>()
}
