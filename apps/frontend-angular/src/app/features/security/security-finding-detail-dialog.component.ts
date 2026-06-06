import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import { securitySeverityLabel, securityStatusLabel } from './security.config'
import type { SecurityRisk } from './security-center.demo'
import { SecurityRemediateConfirmDialogComponent } from './security-remediate-confirm-dialog.component'
import { SecurityExportDialogComponent } from './security-export-dialog.component'
import { MatDialog } from '@angular/material/dialog'

export interface SecurityFindingDetailData {
  finding: SecurityRisk
}

@Component({
  selector: 'app-security-finding-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="sec-detail">
      <header class="sec-detail__head">
        <div>
          <span class="sec-detail__label">Hallazgo de seguridad · {{ data.finding.category }}</span>
          <h2>{{ data.finding.finding }}</h2>
          <p>{{ data.finding.description }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content class="sec-detail__body">
        <div class="sec-detail__badges">
          <span class="sec-sev" [attr.data-sev]="data.finding.severity">{{ severityLabel(data.finding.severity) }}</span>
          <span class="sec-status">{{ statusLabel(data.finding.status) }}</span>
          <span class="sec-detail__type">{{ data.finding.riskType }}</span>
        </div>
        <dl class="sec-detail__grid">
          <div><dt>Recurso</dt><dd class="mono">{{ data.finding.resource }}</dd></div>
          <div><dt>Tipo</dt><dd>{{ data.finding.resourceType }}</dd></div>
          <div><dt>Proveedor</dt><dd>{{ data.finding.provider }}</dd></div>
          <div><dt>Región</dt><dd>{{ data.finding.region }}</dd></div>
          <div><dt>Propietario</dt><dd>{{ data.finding.owner }}</dd></div>
          <div><dt>Detectado</dt><dd>{{ data.finding.detectedAt | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
        </dl>
        <section class="sec-detail__section">
          <h3>Impacto</h3>
          <p>{{ data.finding.impact }}</p>
        </section>
        <section class="sec-detail__section sec-detail__section--pink">
          <h3>Recomendación</h3>
          <p>{{ data.finding.recommendation }}</p>
        </section>
        <section class="sec-detail__section">
          <h3>Pasos de remediación</h3>
          <ol>
            @for (step of data.finding.remediationSteps; track step) { <li>{{ step }}</li> }
          </ol>
        </section>
        <section class="sec-detail__section">
          <h3>Evidencia técnica</h3>
          <pre>{{ data.finding.evidence }}</pre>
        </section>
        <section class="sec-detail__section">
          <h3>Historial</h3>
          <ol class="sec-detail__timeline">
            @for (entry of data.finding.history; track entry.at) {
              <li>
                <time>{{ entry.at | date: 'dd MMM HH:mm' }}</time>
                <strong>{{ entry.action }}</strong>
                <span>{{ entry.user }}</span>
                @if (entry.note) { <em>{{ entry.note }}</em> }
              </li>
            }
          </ol>
        </section>
      </mat-dialog-content>
      <mat-dialog-actions align="start" class="sec-detail__actions">
        @if (data.finding.remediable && data.finding.status !== 'completed') {
          <button mat-flat-button color="primary" type="button" (click)="handleRemediate()">
            <mat-icon>healing</mat-icon> Remediar
          </button>
        }
        <button mat-stroked-button type="button" (click)="handleExport()">
          <mat-icon>download</mat-icon> Exportar
        </button>
        <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .sec-detail { min-width: min(600px, 96vw); max-height: 90vh; color: #0f172a; display: flex; flex-direction: column; }
    .sec-detail__head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;
      padding-bottom: 0.65rem; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
    }
    .sec-detail__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; letter-spacing: 0.05em; color: #db2777; }
    .sec-detail__head h2 { margin: 0.2rem 0 0; font-size: 0.95rem; font-weight: 700; line-height: 1.35; }
    .sec-detail__head p { margin: 0.35rem 0 0; font-size: 0.72rem; color: #64748b; line-height: 1.5; }
    .sec-detail__body { padding-top: 0.75rem !important; overflow-y: auto; }
    .sec-detail__badges { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.65rem; }
    .sec-sev {
      display: inline-block; padding: 0.15rem 0.45rem; border-radius: 999px; font-size: 0.65rem; font-weight: 700;
      &[data-sev='critical'] { background: #fee2e2; color: #b91c1c; }
      &[data-sev='high'] { background: #ffedd5; color: #c2410c; }
      &[data-sev='medium'] { background: #fef3c7; color: #b45309; }
      &[data-sev='low'] { background: #ecfccb; color: #4d7c0f; }
      &[data-sev='info'] { background: #e0f2fe; color: #0369a1; }
    }
    .sec-status { padding: 0.15rem 0.45rem; border-radius: 999px; font-size: 0.65rem; font-weight: 600; background: #f1f5f9; color: #475569; }
    .sec-detail__type { padding: 0.15rem 0.45rem; border-radius: 999px; font-size: 0.62rem; background: #fdf2f8; color: #be185d; }
    .sec-detail__grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.55rem 1rem; margin: 0 0 0.75rem;
      dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.1rem 0 0; font-size: 0.78rem; }
    }
    .sec-detail__section {
      margin-bottom: 0.75rem; padding: 0.6rem 0.65rem; border-radius: 9px; background: #f8fafc; border: 1px solid #e2e8f0;
      h3 { margin: 0 0 0.35rem; font-size: 0.65rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
      p, ol { margin: 0; font-size: 0.75rem; line-height: 1.55; color: #334155; }
      ol { padding-left: 1.1rem; }
      pre { margin: 0; padding: 0.55rem; border-radius: 6px; background: #0f172a; color: #e2e8f0; font-size: 0.65rem; overflow-x: auto; white-space: pre-wrap; }
    }
    .sec-detail__section--pink { background: #fdf2f8; border-color: #fbcfe8; h3 { color: #be185d; } p { color: #831843; } }
    .sec-detail__timeline { list-style: none; padding: 0; margin: 0; }
    .sec-detail__timeline li { padding: 0.35rem 0; border-bottom: 1px solid #e2e8f0; font-size: 0.68rem; }
    .sec-detail__timeline time { display: block; font-size: 0.58rem; color: #94a3b8; }
    .sec-detail__timeline strong { display: block; font-size: 0.68rem; }
    .sec-detail__timeline span { color: #64748b; }
    .sec-detail__timeline em { display: block; font-size: 0.62rem; color: #94a3b8; font-style: normal; }
    .sec-detail__actions { gap: 0.35rem; padding-top: 0.5rem; flex-shrink: 0; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.72rem; }
  `,
})
export class SecurityFindingDetailDialogComponent {
  readonly data = inject<SecurityFindingDetailData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<SecurityFindingDetailDialogComponent>)
  private readonly dialog = inject(MatDialog)
  private readonly toast = inject(ToastService)

  readonly severityLabel = securitySeverityLabel
  readonly statusLabel = securityStatusLabel

  handleRemediate = (): void => {
    this.dialogRef.close()
    this.dialog.open(SecurityRemediateConfirmDialogComponent, {
      width: 'min(500px, 94vw)',
      data: { finding: this.data.finding },
    })
  }

  handleExport = (): void => {
    this.dialog.open(SecurityExportDialogComponent, {
      width: 'min(440px, 92vw)',
      data: { scope: 'finding', findingId: this.data.finding.id },
    })
  }
}
