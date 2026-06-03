import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-success-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="state-container animate-fade-in" role="status">
      <div class="state-icon-wrap success">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
    </div>
  `,
  styles: `
    .state-container {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      padding: 2.5rem 1.5rem; color: var(--app-text-muted);
    }
    .state-icon-wrap {
      width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 0.75rem; box-shadow: var(--app-shadow-sm);
      &.success { background: rgba(34,197,94,0.12); mat-icon { color: #16a34a; font-size: 2rem; width: 2rem; height: 2rem; } }
    }
    h3 { margin: 0 0 0.35rem; font-weight: 600; color: inherit; }
    p { margin: 0; max-width: 360px; font-size: 0.9rem; }
  `,
})
export class SuccessStateComponent {
  @Input() icon = 'check_circle'
  @Input() title = 'Success'
  @Input() description = 'Operation completed successfully.'
}
