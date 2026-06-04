import { Component, Input, output } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { TerraformLogsViewerComponent } from './terraform-logs-viewer.component'
import { TerraformPlanViewerComponent } from './terraform-plan-viewer.component'

@Component({
  selector: 'app-run-detail-drawer',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    StatusBadgeComponent,
    TerraformLogsViewerComponent,
    TerraformPlanViewerComponent,
  ],
  template: `
    @if (open) {
      <div class="drawer-backdrop animate-fade-in" (click)="close.emit()" role="presentation"></div>
      <aside class="run-drawer animate-slide-in" role="dialog" aria-label="Run details">
        <header class="run-drawer__header">
          <div>
            <h3>{{ run?.['workspaceName'] ?? 'Run detail' }}</h3>
            <app-status-badge [value]="runStatus()" />
          </div>
          <button mat-icon-button type="button" (click)="close.emit()" aria-label="Close"><mat-icon>close</mat-icon></button>
        </header>
        <div class="run-drawer__body">
          <dl class="detail-grid">
            <dt>Provider</dt><dd>{{ run?.['provider'] ?? '—' }}</dd>
            <dt>Run ID</dt><dd class="mono">{{ run?.['id'] ?? '—' }}</dd>
            <dt>Workspace</dt><dd>{{ run?.['workspaceName'] ?? '—' }}</dd>
            <dt>Created</dt><dd>{{ formatDate(run?.['createdAt']) }}</dd>
            <dt>User</dt><dd>{{ run?.['userId'] ?? 'system' }}</dd>
          </dl>
          <app-terraform-plan-viewer [planOutput]="planOutput" [runId]="runId()" />
          <app-terraform-logs-viewer [logs]="logs" />
        </div>
      </aside>
    }
  `,
  styles: `
    .drawer-backdrop {
      position: fixed; inset: 0; background: rgba(15,23,42,0.45);
      z-index: 1100;
      border: none;
      box-shadow: none;
      filter: none;
      backdrop-filter: none;
    }
    .run-drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: min(480px, 95vw);
      z-index: 1101; background: var(--app-card);
      border: none;
      outline: none;
      box-shadow: none;
      filter: none;
      display: flex; flex-direction: column;
    }
    .run-drawer__header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 1.25rem 1.5rem;
      border: none;
      box-shadow: none;
      h3 { margin: 0 0 0.35rem; font-size: 1.1rem; text-shadow: none; }
    }
    .run-drawer__body {
      flex: 1; overflow-y: auto; padding: 1.25rem;
      display: flex; flex-direction: column; gap: 1rem;
    }
    .detail-grid {
      display: grid; grid-template-columns: 100px 1fr; gap: 0.4rem 0.75rem; font-size: 0.85rem;
      dt { color: var(--app-text-muted); }
      dd { margin: 0; }
    }
  `,
})
export class RunDetailDrawerComponent {
  @Input() open = false
  @Input() run: Record<string, unknown> | null = null
  @Input() planOutput = ''
  @Input() logs = ''
  readonly close = output<void>()

  formatDate = (v: unknown): string => {
    if (!v) return '—'
    const d = new Date(String(v))
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
  }

  runStatus = (): string => String(this.run?.['status'] ?? 'unknown')
  runId = (): string => String(this.run?.['id'] ?? '')
}
