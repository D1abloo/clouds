import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-panel-card',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <section class="panel-card surface-elevated animate-fade-in" [attr.aria-label]="title">
      @if (title) {
        <header class="panel-card__header">
          <div class="panel-card__title">
            @if (icon) { <mat-icon>{{ icon }}</mat-icon> }
            <div>
              <h3>{{ title }}</h3>
              @if (subtitle) { <p>{{ subtitle }}</p> }
            </div>
          </div>
          <ng-content select="[panelActions]" />
        </header>
      }
      <div class="panel-card__body">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    .panel-card {
      border-radius: var(--app-radius-lg);
      overflow: hidden;
      margin-bottom: 1.25rem;
    }
    .panel-card__header {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 0.75rem; padding: 1rem 1.25rem 0.85rem;
    }
    .panel-card__title {
      display: flex; align-items: flex-start; gap: 0.65rem;
      mat-icon { color: var(--app-accent); margin-top: 2px; }
      h3 { margin: 0; font-size: 1rem; font-weight: 600; }
      p { margin: 0.15rem 0 0; font-size: 0.8rem; color: var(--app-text-muted); }
    }
    .panel-card__body { padding: 1rem 1.25rem 1.25rem; }
  `,
})
export class PanelCardComponent {
  @Input() title = ''
  @Input() subtitle = ''
  @Input() icon = ''
}
