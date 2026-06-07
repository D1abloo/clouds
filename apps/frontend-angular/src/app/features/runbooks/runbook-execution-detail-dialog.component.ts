import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import type { Runbook, RunbookExecution } from './runbooks.demo'
import { RunbookExecutionDetailPanelComponent } from './runbook-execution-detail-panel.component'

export interface RunbookExecutionDetailDialogData {
  execution: RunbookExecution
  runbook?: Runbook | null
}

@Component({
  selector: 'app-runbook-execution-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, RunbookExecutionDetailPanelComponent],
  template: `
    <div class="rb-ex-dialog">
      <mat-dialog-content class="rb-ex-dialog__body">
        <app-runbook-execution-detail-panel
          [execution]="data.execution"
          [runbook]="data.runbook ?? null"
        />
      </mat-dialog-content>
      <mat-dialog-actions class="rb-ex-dialog__footer" align="end">
        <button mat-button type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .rb-ex-dialog {
      display: flex;
      flex-direction: column;
      max-height: min(94vh, 900px);
      min-height: min(80vh, 600px);
      width: 100%;
    }
    .rb-ex-dialog__body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      padding: 0.5rem 0.75rem !important;
      max-height: none !important;
    }
    .rb-ex-dialog__body app-runbook-execution-detail-panel {
      display: block;
      height: 100%;
      min-height: min(72vh, 520px);
    }
    .rb-ex-dialog__footer {
      flex-shrink: 0;
      border-top: 1px solid color-mix(in srgb, #111 8%, transparent);
    }
  `,
})
export class RunbookExecutionDetailDialogComponent {
  readonly data = inject<RunbookExecutionDetailDialogData>(MAT_DIALOG_DATA)
}
