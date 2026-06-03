import { Component, Input } from '@angular/core'

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  template: `
    <div class="skeleton-card" [style.height.px]="height">
      <div class="skeleton-line w60"></div>
      <div class="skeleton-line w40"></div>
      <div class="skeleton-block"></div>
    </div>
  `,
  styles: `
    .skeleton-card {
      padding: 1.25rem; border-radius: var(--app-radius-lg);
      background: var(--app-elevated); box-shadow: var(--app-shadow-sm);
    }
    .skeleton-line, .skeleton-block {
      border-radius: var(--app-radius-sm);
      background: linear-gradient(90deg, var(--app-surface) 25%, var(--app-divider) 50%, var(--app-surface) 75%);
      background-size: 200% 100%; animation: shimmer 1.4s infinite;
    }
    .skeleton-line { height: 12px; margin-bottom: 0.65rem; }
    .w60 { width: 60%; } .w40 { width: 40%; }
    .skeleton-block { height: calc(100% - 48px); min-height: 80px; margin-top: 0.5rem; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `,
})
export class SkeletonCardComponent {
  @Input() height = 200
}
