import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-realtime-status-badge',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <span class="rt-badge" [class]="'rt-badge--' + mode" [attr.aria-label]="label">
      <span class="rt-badge__dot"></span>
      <mat-icon class="rt-badge__icon">{{ icon }}</mat-icon>
      <span>{{ label }}</span>
    </span>
  `,
  styles: `
    .rt-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      background: var(--app-elevated);
      box-shadow: var(--app-shadow-xs);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .rt-badge__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }
    .rt-badge__icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .rt-badge--live .rt-badge__dot { background: #22c55e; }
    .rt-badge--demo .rt-badge__dot { background: #3b82f6; }
    .rt-badge--syncing .rt-badge__dot { background: #f59e0b; }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.55; transform: scale(0.85); }
    }
  `,
})
export class RealtimeStatusBadgeComponent {
  @Input() mode: 'live' | 'demo' | 'syncing' = 'demo'
  @Input() label = 'Demo mode'
  @Input() icon = 'science'
}
