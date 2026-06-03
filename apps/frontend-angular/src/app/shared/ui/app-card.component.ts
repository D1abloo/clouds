import { Component, Input } from '@angular/core'

@Component({
  selector: 'app-card',
  standalone: true,
  template: `
    <section
      class="app-card animate-fade-in"
      [class.app-card--flush]="flush"
      [attr.aria-label]="ariaLabel || null"
    >
      @if (title) {
        <header class="app-card__head">
          <div>
            <h3>{{ title }}</h3>
            @if (subtitle) { <p>{{ subtitle }}</p> }
          </div>
          <ng-content select="[cardActions]" />
        </header>
      }
      <div class="app-card__body">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    .app-card {
      background: var(--app-card);
      border-radius: var(--app-radius-lg);
      box-shadow: var(--app-shadow-sm);
      overflow: hidden;
      transition: box-shadow 0.25s ease, transform 0.25s ease;
      &:hover { box-shadow: var(--app-shadow-md); }
    }
    .app-card__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 1.15rem 1.35rem 0.85rem;
      h3 { margin: 0; font-size: 1rem; font-weight: 700; letter-spacing: -0.01em; }
      p { margin: 0.2rem 0 0; font-size: 0.8rem; color: var(--app-text-muted); line-height: 1.45; }
    }
    .app-card__body { padding: 0 1.35rem 1.35rem; }
    .app-card--flush .app-card__body { padding: 0; }
  `,
})
export class AppCardComponent {
  @Input() title = ''
  @Input() subtitle = ''
  @Input() ariaLabel = ''
  @Input() flush = false
}
