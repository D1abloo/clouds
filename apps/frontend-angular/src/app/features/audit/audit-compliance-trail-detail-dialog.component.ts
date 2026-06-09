import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { AUDIT_ACCENT, AUDIT_ACCENT_BORDER, AUDIT_ACCENT_LIGHT } from './audit.config'
import type { ComplianceTrailEntry } from './audit.data'

export interface AuditComplianceTrailDetailData {
  entry: ComplianceTrailEntry
}

@Component({
  selector: 'app-audit-compliance-trail-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <article class="ctr">
      <header class="ctr__head">
        <div>
          <span class="ctr__label">Trail de cumplimiento</span>
          <h2>{{ data.entry.action }}</h2>
          <p>{{ data.entry.description }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content class="ctr__body">
        <div class="ctr__badges">
          <span class="ctr__fw">{{ data.entry.framework }}</span>
          <span class="ctr__ctrl mono">{{ data.entry.controlId }}</span>
          <span class="ctr__outcome" [attr.data-outcome]="data.entry.outcome">{{ data.entry.outcome }}</span>
        </div>
        <dl class="ctr__grid">
          <div><dt>Actor</dt><dd>{{ data.entry.actor }}</dd></div>
          <div><dt>Recurso</dt><dd class="mono">{{ data.entry.resource }}</dd></div>
          <div><dt>Registrado</dt><dd>{{ data.entry.at | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
        </dl>
        <section class="ctr__block">
          <h3><mat-icon>fact_check</mat-icon> Evidencia</h3>
          <p>{{ data.entry.evidence }}</p>
        </section>
        <section class="ctr__block ctr__block--notes">
          <h3><mat-icon>sticky_note_2</mat-icon> Notas</h3>
          <p>{{ data.entry.notes }}</p>
        </section>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .ctr { width: 100%; color: #0f172a; display: flex; flex-direction: column; min-height: 0; }
    .ctr__head { display: flex; justify-content: space-between; gap: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .ctr__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .ctr__head h2 { margin: 0.2rem 0 0; font-size: 1.05rem; font-weight: 700; }
    .ctr__head p { margin: 0.25rem 0 0; font-size: 0.72rem; color: #64748b; line-height: 1.5; max-width: 36rem; }
    .ctr__body { padding-top: 0.75rem !important; display: flex; flex-direction: column; gap: 0.75rem; }
    .ctr__badges { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
    .ctr__fw { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700; background: ${AUDIT_ACCENT}; color: #fff; }
    .ctr__ctrl { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 600; background: #fff; border: 1px solid ${AUDIT_ACCENT_BORDER}; color: #475569; }
    .ctr__outcome { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700;
      &[data-outcome='Aprobado'], &[data-outcome='Completado'], &[data-outcome='Cerrado'] { background: #dcfce7; color: #15803d; }
      &[data-outcome='Pendiente'] { background: #fef3c7; color: #b45309; }
    }
    .ctr__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem;
      dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.1rem 0 0; font-size: 0.78rem; }
    }
    .ctr__block { padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid ${AUDIT_ACCENT_BORDER}; background: ${AUDIT_ACCENT_LIGHT}; }
    .ctr__block h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.4rem; font-size: 0.75rem; font-weight: 700; color: ${AUDIT_ACCENT}; }
    .ctr__block h3 mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .ctr__block p { margin: 0; font-size: 0.72rem; color: #475569; line-height: 1.55; }
    .ctr__block--notes { border-color: #bbf7d0; background: #f0fdf4; }
    .ctr__block--notes h3 { color: #15803d; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
  `,
})
export class AuditComplianceTrailDetailDialogComponent {
  readonly data = inject<AuditComplianceTrailDetailData>(MAT_DIALOG_DATA)
}
