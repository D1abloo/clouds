import { Component, Input } from '@angular/core'
import { MatChipsModule } from '@angular/material/chips'
import { normalizeStatus, statusLabel } from '../../utils/status.util'
import { ResourceStatus } from '../../../core/models/api.models'

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [MatChipsModule],
  template: `
    <mat-chip
      [class]="'status-chip status-' + statusKey"
      [attr.aria-label]="'Status: ' + label"
    >
      {{ label }}
    </mat-chip>
  `,
  styles: `
    .status-chip {
      font-size: 0.75rem;
      font-weight: 500;
      min-height: 24px;
    }
    .status-running { --mdc-chip-label-text-color: #16a34a; }
    .status-stopped { --mdc-chip-label-text-color: #64748b; }
    .status-pending { --mdc-chip-label-text-color: #d97706; }
    .status-error { --mdc-chip-label-text-color: #dc2626; }
    .status-warning { --mdc-chip-label-text-color: #ca8a04; }
    .status-unknown { --mdc-chip-label-text-color: #64748b; }
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
  }

  statusKey: ResourceStatus = 'unknown'
  label = 'Unknown'
}
