import { Component, Input } from '@angular/core'
import { MatChipsModule } from '@angular/material/chips'
import { MatIconModule } from '@angular/material/icon'
import { normalizeStatus, statusLabel } from '../../utils/status.util'
import { ResourceStatus } from '../../../core/models/api.models'

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [MatChipsModule, MatIconModule],
  template: `
    <span class="status-badge" [class]="'status-badge--' + statusKey" [attr.aria-label]="'Status: ' + label">
      <mat-icon class="status-badge__dot">{{ dotIcon }}</mat-icon>
      {{ label }}
    </span>
  `,
  styles: `
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.65rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      background: var(--app-surface);
      box-shadow: var(--app-shadow-xs);
      transition: transform 0.2s ease;
    }
    .status-badge__dot {
      font-size: 8px;
      width: 8px;
      height: 8px;
    }
    .status-badge--running { color: var(--status-running); background: color-mix(in srgb, var(--status-running) 22%, transparent); box-shadow: 0 0 12px color-mix(in srgb, var(--status-running) 35%, transparent); }
    .status-badge--stopped { color: var(--status-stopped); background: color-mix(in srgb, var(--status-stopped) 18%, transparent); }
    .status-badge--pending, .status-badge--planning, .status-badge--planned { color: var(--status-warning); background: color-mix(in srgb, var(--status-warning) 22%, transparent); }
    .status-badge--applied { color: var(--status-info); background: color-mix(in srgb, var(--status-info) 22%, transparent); }
    .status-badge--error, .status-badge--failed { color: var(--status-error); background: color-mix(in srgb, var(--status-error) 22%, transparent); box-shadow: 0 0 10px color-mix(in srgb, var(--status-error) 30%, transparent); }
    .status-badge--warning { color: var(--status-warning); background: color-mix(in srgb, var(--status-warning) 22%, transparent); }
    .status-badge--unknown { color: #64748b; }
  `,
})
export class StatusBadgeComponent {
  @Input() set value(raw: string | undefined) {
    this.apply(raw)
  }

  @Input() set status(raw: string | undefined) {
    this.apply(raw)
  }

  private apply(raw: string | undefined) {
    this.statusKey = normalizeStatus(raw)
    this.label = statusLabel(this.statusKey)
    this.dotIcon = 'circle'
  }

  statusKey: ResourceStatus = 'unknown'
  label = 'Unknown'
  dotIcon = 'circle'
}
