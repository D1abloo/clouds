import { Component, Input, output } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { emptyStateReveal } from '../../animations/ui-motion.animations'

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  animations: [emptyStateReveal],
  template: `
    <div class="state-container animate-fade-in" role="status" @emptyStateReveal>
      <div class="state-icon-wrap">
        <mat-icon class="state-icon">{{ icon }}</mat-icon>
      </div>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
      @if (actionLabel) {
        <button mat-flat-button color="primary" type="button" (click)="actionClick.emit()">
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
      padding: 3.5rem 1.5rem;
      color: var(--app-text-muted);
    }
    .state-icon-wrap {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--app-elevated);
      box-shadow: var(--app-shadow-sm);
      margin-bottom: 0.75rem;
    }
    .state-icon {
      font-size: 2.25rem;
      width: 2.25rem;
      height: 2.25rem;
      opacity: 0.55;
    }
    h3 {
      margin: 0 0 0.5rem;
      color: inherit;
      font-weight: 600;
      font-size: 1.05rem;
    }
    p {
      margin: 0 0 1.25rem;
      max-width: 400px;
      line-height: 1.5;
      font-size: 0.9rem;
    }
  `,
})
export class EmptyStateComponent {
  @Input() icon = 'inbox'
  @Input() title = 'Sin datos todavía'
  @Input() description = 'Conecta una integración para comenzar.'
  @Input() actionLabel?: string
  readonly actionClick = output<void>()
}
