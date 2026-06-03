import { Component, Input } from '@angular/core'

@Component({
  selector: 'app-skeleton-table',
  standalone: true,
  template: `
    <div class="skeleton-table surface-elevated">
      @for (r of rowsArray; track r) {
        <div class="skeleton-table__row">
          @for (c of colsArray; track c) {
            <div class="skeleton-cell"></div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .skeleton-table {
      border-radius: var(--app-radius-lg); padding: 1rem; overflow: hidden;
    }
    .skeleton-table__row {
      display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: 0.75rem;
      margin-bottom: 0.65rem;
    }
    .skeleton-cell {
      height: 36px; border-radius: var(--app-radius-sm);
      background: linear-gradient(90deg, var(--app-surface) 25%, var(--app-divider) 50%, var(--app-surface) 75%);
      background-size: 200% 100%; animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `,
  host: { '[style.--cols]': 'columns' },
})
export class SkeletonTableComponent {
  @Input() rows = 5
  @Input() columns = 4
  get rowsArray() { return Array.from({ length: this.rows }, (_, i) => i) }
  get colsArray() { return Array.from({ length: this.columns }, (_, i) => i) }
}
