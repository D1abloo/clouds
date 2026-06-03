import { Component, Input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'

@Component({
  selector: 'app-platform-summary-card',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatButtonModule],
  template: `
    <a
      class="platform-card animate-fade-in"
      [routerLink]="route"
      [style.animation-delay.ms]="delay"
      [attr.aria-label]="title + ' summary'"
    >
      <div class="platform-card__icon" [class]="'platform-card__icon--' + tone">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
      <div class="platform-card__body">
        <h3>{{ title }}</h3>
        <p>{{ summary }}</p>
        <div class="platform-card__metrics">
          @for (m of metrics; track m.label) {
            <span><strong>{{ m.value }}</strong>{{ m.label }}</span>
          }
        </div>
      </div>
      <span class="platform-card__action">
        View details
        <mat-icon>arrow_forward</mat-icon>
      </span>
    </a>
  `,
  styles: `
    .platform-card {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      padding: 1.2rem 1.25rem;
      border-radius: var(--app-radius-lg);
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      text-decoration: none;
      color: inherit;
      min-height: 180px;
      transition: transform 0.28s ease, box-shadow 0.28s ease;
      &:hover {
        transform: translateY(-3px);
        box-shadow: var(--app-shadow-md);
        .platform-card__action mat-icon { transform: translateX(3px); }
      }
    }
    .platform-card__icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      mat-icon { color: var(--app-accent); }
      &--docker { background: color-mix(in srgb, #0ea5e9 14%, transparent); mat-icon { color: #0ea5e9; } }
      &--k8s { background: color-mix(in srgb, #8b5cf6 14%, transparent); mat-icon { color: #8b5cf6; } }
      &--jenkins { background: color-mix(in srgb, #f97316 14%, transparent); mat-icon { color: #f97316; } }
      &--terraform { background: color-mix(in srgb, #6366f1 14%, transparent); mat-icon { color: #6366f1; } }
    }
    h3 { margin: 0; font-size: 0.95rem; font-weight: 700; }
    p { margin: 0.25rem 0 0; font-size: 0.8rem; color: var(--app-text-muted); line-height: 1.45; }
    .platform-card__metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem 1rem;
      margin-top: 0.35rem;
      span {
        font-size: 0.72rem;
        color: var(--app-text-muted);
        strong {
          display: block;
          font-size: 1rem;
          color: var(--app-text);
          font-weight: 700;
        }
      }
    }
    .platform-card__action {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: auto;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--app-accent);
      mat-icon { font-size: 16px; width: 16px; height: 16px; transition: transform 0.2s ease; }
    }
  `,
})
export class PlatformSummaryCardComponent {
  @Input({ required: true }) title!: string
  @Input({ required: true }) summary!: string
  @Input({ required: true }) icon!: string
  @Input({ required: true }) route!: string
  @Input() tone = 'default'
  @Input() delay = 0
  @Input() metrics: { label: string; value: string | number }[] = []
}
