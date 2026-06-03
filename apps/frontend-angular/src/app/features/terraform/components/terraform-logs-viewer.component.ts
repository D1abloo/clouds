import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'

@Component({
  selector: 'app-terraform-logs-viewer',
  standalone: true,
  imports: [MatIconModule, MatProgressBarModule],
  template: `
    <div class="logs-viewer surface-elevated animate-fade-in">
      <div class="logs-viewer__header">
        <h4><mat-icon>terminal</mat-icon> Terraform logs</h4>
        @if (streaming) { <mat-progress-bar mode="indeterminate" /> }
      </div>
      <pre class="logs-output mono">{{ logs || placeholder }}</pre>
    </div>
  `,
  styles: `
    .logs-viewer {
      border-radius: var(--app-radius-lg);
      overflow: hidden;
    }
    .logs-viewer__header {
      padding: 0.85rem 1.25rem;
      background: var(--app-surface);
      h4 {
        margin: 0 0 0.35rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.9rem;
      }
    }
    .logs-output {
      margin: 0;
      padding: 1.25rem;
      min-height: 160px;
      max-height: 240px;
      overflow: auto;
      font-size: 0.75rem;
      line-height: 1.55;
      background: #0d1117;
      color: #7ee787;
    }
  `,
})
export class TerraformLogsViewerComponent {
  @Input() logs = ''
  @Input() streaming = false
  @Input() placeholder = 'Logs will appear after terraform init/plan/apply…'
}
