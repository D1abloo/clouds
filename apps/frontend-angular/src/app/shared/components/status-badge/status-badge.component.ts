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
    .status-badge--running { color: #16a34a; background: rgba(22,163,74,0.1); }
    .status-badge--stopped { color: #64748b; background: rgba(100,116,139,0.12); }
    .status-badge--pending, .status-badge--planning, .status-badge--planned { color: #d97706; background: rgba(217,119,6,0.12); }
    .status-badge--applied { color: #2563eb; background: rgba(37,99,235,0.12); }
    .status-badge--error, .status-badge--failed { color: #dc2626; background: rgba(220,38,38,0.1); }
    .status-badge--warning { color: #ca8a04; background: rgba(202,138,4,0.12); }
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
