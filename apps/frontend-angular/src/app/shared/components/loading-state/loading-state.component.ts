import { Component, Input } from '@angular/core'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { panelReveal } from '../../animations/ui-motion.animations'

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  animations: [panelReveal],
  template: `
    <div class="state-container animate-fade-in" role="status" [attr.aria-label]="message" @panelReveal>
      <div class="spinner-wrap">
        <mat-spinner diameter="44" />
      </div>
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
      padding: 3.5rem 1rem;
      color: var(--app-text-muted);
    }
    .spinner-wrap {
      padding: 1rem;
      border-radius: 50%;
      background: var(--app-elevated);
      box-shadow: var(--app-shadow-sm);
    }
    p { margin: 0; font-size: 0.9rem; }
  `,
})
export class LoadingStateComponent {
  @Input() message = 'Loading...'
}
