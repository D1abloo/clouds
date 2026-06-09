import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import { SECURITY_ACCENT, SECURITY_ACCENT_BORDER, SECURITY_ACCENT_LIGHT, securitySeverityLabel } from './security.config'
import type { ComplianceViolation } from './compliance.data'

export interface ComplianceViolationDetailData {
  violation: ComplianceViolation
}

@Component({
  selector: 'app-compliance-violation-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="cvio">
      <header class="cvio__head">
        <div>
          <span class="cvio__label">Violación de cumplimiento</span>
          <h2>{{ data.violation.rule }}</h2>
          <p>{{ data.violation.description }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content class="cvio__body">
        <div class="cvio__badges">
          <span class="cvio__fw">{{ data.violation.framework }}</span>
          <span class="cvio__sev" [attr.data-sev]="data.violation.severity">{{ severityLabel(data.violation.severity) }}</span>
          <app-status-badge [value]="data.violation.status" />
        </div>
        <dl class="cvio__grid">
          <div><dt>Recurso</dt><dd class="mono">{{ data.violation.resource }}</dd></div>
          <div><dt>Control</dt><dd class="mono">{{ data.violation.controlId }}</dd></div>
          <div><dt>Propietario</dt><dd>{{ data.violation.owner }}</dd></div>
          <div><dt>Detectado</dt><dd>{{ data.violation.detectedAt | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
        </dl>
        <section class="cvio__block cvio__block--impact">
          <h3><mat-icon>warning</mat-icon> Impacto</h3>
          <p>{{ data.violation.impact }}</p>
        </section>
        <section class="cvio__block">
          <h3><mat-icon>fact_check</mat-icon> Evidencia</h3>
          <pre>{{ data.violation.evidence }}</pre>
        </section>
        <div class="cvio__cols">
          <section class="cvio__block">
            <h3><mat-icon>healing</mat-icon> Pasos de remediación</h3>
            <ol>
              @for (step of data.violation.remediationSteps; track step) { <li>{{ step }}</li> }
            </ol>
          </section>
          <section class="cvio__block">
            <h3><mat-icon>dns</mat-icon> Recursos afectados</h3>
            <ul>
              @for (r of data.violation.affectedResources; track r) { <li class="mono">{{ r }}</li> }
            </ul>
          </section>
        </div>
        <section class="cvio__block cvio__block--rec">
          <h3><mat-icon>lightbulb</mat-icon> Recomendación</h3>
          <p>{{ data.violation.recommendation }}</p>
        </section>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-flat-button color="primary" type="button" (click)="handleRemediate()"><mat-icon>healing</mat-icon> Remediar</button>
        <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .cvio { width: 100%; color: #0f172a; display: flex; flex-direction: column; min-height: 0; }
    .cvio__head { display: flex; justify-content: space-between; gap: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .cvio__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .cvio__head h2 { margin: 0.2rem 0 0; font-size: 1.05rem; font-weight: 700; }
    .cvio__head p { margin: 0.25rem 0 0; font-size: 0.72rem; color: #64748b; line-height: 1.5; max-width: 36rem; }
    .cvio__body { padding-top: 0.75rem !important; display: flex; flex-direction: column; gap: 0.75rem; }
    .cvio__badges { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
    .cvio__fw { padding: 0.2rem 0.5rem; border-radius: 999px; background: ${SECURITY_ACCENT}; color: #fff; font-size: 0.62rem; font-weight: 700; }
    .cvio__sev { padding: 0.15rem 0.4rem; border-radius: 999px; font-size: 0.58rem; font-weight: 700;
      &[data-sev='critical'] { background: #fef2f2; color: #b91c1c; }
      &[data-sev='high'] { background: #fff7ed; color: #c2410c; }
      &[data-sev='medium'] { background: #fffbeb; color: #b45309; }
    }
    .cvio__grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.45rem 1rem;
      dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.1rem 0 0; font-size: 0.78rem; }
    }
    .cvio__cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .cvio__block {
      padding: 0.6rem 0.7rem; border-radius: 9px; border: 1px solid #e2e8f0; background: #f8fafc;
      h3 { display: flex; align-items: center; gap: 0.3rem; margin: 0 0 0.35rem; font-size: 0.68rem; font-weight: 700; color: #4338ca;
        mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
      }
      p { margin: 0; font-size: 0.72rem; line-height: 1.5; color: #475569; }
      pre { margin: 0; padding: 0.55rem; border-radius: 6px; background: #0f172a; color: #e2e8f0; font-size: 0.65rem; white-space: pre-wrap; }
      ol, ul { margin: 0; padding-left: 1.1rem; font-size: 0.7rem; line-height: 1.55; color: #475569; }
    }
    .cvio__block--impact { border-color: #fed7aa; background: #fff7ed; h3 { color: #c2410c; } }
    .cvio__block--rec { border-color: ${SECURITY_ACCENT_BORDER}; background: ${SECURITY_ACCENT_LIGHT}; h3 { color: #4338ca; } p { color: #3730a3; } }
    .mono { font-family: ui-monospace, monospace; }
    @media (max-width: 640px) { .cvio__cols, .cvio__grid { grid-template-columns: 1fr; } }
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
