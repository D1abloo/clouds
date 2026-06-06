import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import { securitySeverityLabel } from './security.config'
import type { ComplianceViolation } from './compliance.demo'

export interface ComplianceViolationDetailData {
  violation: ComplianceViolation
}

@Component({
  selector: 'app-compliance-violation-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="comp-dialog">
      <header class="comp-dialog__head">
        <div>
          <span class="comp-dialog__label">Violación de cumplimiento</span>
          <h2>{{ data.violation.rule }}</h2>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content>
        <dl class="comp-dialog__grid">
          <div><dt>Recurso</dt><dd class="mono">{{ data.violation.resource }}</dd></div>
          <div><dt>Framework</dt><dd>{{ data.violation.framework }}</dd></div>
          <div><dt>Severidad</dt><dd><span class="comp-sev" [attr.data-sev]="data.violation.severity">{{ severityLabel(data.violation.severity) }}</span></dd></div>
          <div><dt>Estado</dt><dd><app-status-badge [value]="data.violation.status" /></dd></div>
          <div><dt>Detectado</dt><dd>{{ data.violation.detectedAt | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
        </dl>
        <section class="comp-dialog__rec"><h3>Recomendación</h3><p>{{ data.violation.recommendation }}</p></section>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-flat-button color="primary" type="button" (click)="handleRemediate()"><mat-icon>healing</mat-icon> Remediar</button>
        <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .comp-dialog { color: #0f172a; }
    .comp-dialog__head { display: flex; justify-content: space-between; padding-bottom: 0.6rem; border-bottom: 1px solid #e2e8f0; }
    .comp-dialog__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .comp-dialog__head h2 { margin: 0.2rem 0 0; font-size: 0.95rem; }
    .comp-dialog__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem; dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; } dd { margin: 0.1rem 0 0; font-size: 0.78rem; } }
    .comp-dialog__rec { margin-top: 0.75rem; padding: 0.65rem; border-radius: 9px; background: #fdf2f8; border: 1px solid #fbcfe8; h3 { margin: 0 0 0.3rem; font-size: 0.68rem; color: #be185d; } p { margin: 0; font-size: 0.75rem; color: #831843; } }
    .comp-sev { display: inline-block; padding: 0.12rem 0.4rem; border-radius: 999px; font-size: 0.6rem; font-weight: 700;
      &[data-sev='critical'] { background: #fee2e2; color: #b91c1c; }
      &[data-sev='warning'] { background: #fef3c7; color: #b45309; }
    }
    .mono { font-family: ui-monospace, monospace; }
  `,
})
export class ComplianceViolationDetailDialogComponent {
  readonly data = inject<ComplianceViolationDetailData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<ComplianceViolationDetailDialogComponent>)
  private readonly toast = inject(ToastService)

  severityLabel = securitySeverityLabel

  handleRemediate = (): void => {
    this.toast.success(`Remediación iniciada: ${this.data.violation.resource}`)
    this.dialogRef.close({ remediated: true, id: this.data.violation.id })
  }
}
