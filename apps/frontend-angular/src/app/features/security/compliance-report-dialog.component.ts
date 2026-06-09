import { DatePipe } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { ToastService } from '../../core/services/toast.service'
import { SECURITY_ACCENT, securitySeverityLabel } from './security.config'
import {
  buildComplianceReportText,
  downloadComplianceReportJson,
  downloadComplianceReportPdf,
  downloadComplianceReportTxt,
} from './compliance-report-export.util'
import type { ComplianceReport, ComplianceViolation } from './compliance.data'

export interface ComplianceReportDialogData {
  report: ComplianceReport
  violations: ComplianceViolation[]
}

@Component({
  selector: 'app-compliance-report-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatTabsModule],
  template: `
    <article class="crpt">
      <header class="crpt__head" [attr.data-fw]="data.report.framework">
        <div class="crpt__brand">
          <span class="crpt__fw-badge">{{ data.report.framework }}</span>
          <div>
            <span class="crpt__label">Informe de cumplimiento</span>
            <h2>{{ data.report.name }}</h2>
            <p>{{ data.report.period }} · Generado {{ data.report.generatedAt | date: 'dd MMM yyyy, HH:mm' }}</p>
          </div>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>

      <mat-dialog-content class="crpt__body">
        <div class="crpt__stats">
          <article><span>Puntuación</span><strong>{{ data.report.score }}%</strong></article>
          <article><span>Violaciones</span><strong>{{ data.report.violationsCount }}</strong></article>
          <article><span>Aprobados</span><strong>{{ data.report.passedControls }}</strong></article>
          <article><span>Fallidos</span><strong>{{ data.report.failedControls }}</strong></article>
        </div>

        <mat-tab-group animationDuration="200ms">
          <mat-tab label="Resumen">
            <section class="crpt__section">
              <h3>Resumen ejecutivo</h3>
              <p>{{ data.report.executiveSummary }}</p>
            </section>
            @for (s of data.report.sections; track s.title) {
              <section class="crpt__section">
                <h3>{{ s.title }}</h3>
                @for (p of s.paragraphs; track p) { <p>{{ p }}</p> }
              </section>
            }
          </mat-tab>
          <mat-tab label="Violaciones ({{ relatedViolations().length }})">
            <ul class="crpt__violations">
              @for (v of relatedViolations(); track v.id) {
                <li>
                  <span class="crpt__sev" [attr.data-sev]="v.severity">{{ severityLabel(v.severity) }}</span>
                  <div>
                    <strong>{{ v.rule }}</strong>
                    <span>{{ v.resource }} · {{ v.controlId }}</span>
                    <p>{{ v.description }}</p>
                  </div>
                </li>
              } @empty {
                <li class="crpt__empty">Sin violaciones relacionadas con este framework.</li>
              }
            </ul>
          </mat-tab>
          <mat-tab label="Recomendaciones">
            <ol class="crpt__recs">
              @for (r of data.report.recommendations; track r) { <li>{{ r }}</li> }
            </ol>
            @if (data.report.appendix?.length) {
              <section class="crpt__section">
                <h3>Anexo</h3>
                <ul class="crpt__appendix">
                  @for (a of data.report.appendix!; track a) { <li>{{ a }}</li> }
                </ul>
              </section>
            }
          </mat-tab>
          <mat-tab label="Documento">
            <pre class="crpt__doc">{{ reportText() }}</pre>
          </mat-tab>
        </mat-tab-group>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" (click)="handleDownloadTxt()"><mat-icon>description</mat-icon> TXT</button>
        <button mat-stroked-button type="button" (click)="handleDownloadJson()"><mat-icon>data_object</mat-icon> JSON</button>
        <button mat-flat-button color="primary" type="button" (click)="handleDownloadPdf()">
          <mat-icon>picture_as_pdf</mat-icon> Descargar PDF
        </button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .crpt { width: 100%; color: #0f172a; display: flex; flex-direction: column; min-height: 0; }
    .crpt__head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem;
      padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0;
    }
    .crpt__brand { display: flex; gap: 0.65rem; align-items: flex-start; }
    .crpt__fw-badge {
      padding: 0.35rem 0.55rem; border-radius: 8px; font-size: 0.62rem; font-weight: 800;
      background: ${SECURITY_ACCENT}; color: #fff; letter-spacing: 0.03em; flex-shrink: 0;
    }
    .crpt__head[data-fw='GDPR'] .crpt__fw-badge { background: #1d4ed8; }
    .crpt__head[data-fw='ISO 27001'] .crpt__fw-badge { background: #4338ca; }
    .crpt__label { display: block; font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; }
    .crpt__head h2 { margin: 0.15rem 0 0; font-size: 1.05rem; font-weight: 700; }
    .crpt__head p { margin: 0.2rem 0 0; font-size: 0.72rem; color: #64748b; }
    .crpt__body { padding-top: 0.75rem !important; min-height: 0; }
    .crpt__stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.45rem; margin-bottom: 0.75rem;
      article {
        padding: 0.5rem 0.6rem; border-radius: 9px; border: 1px solid #e2e8f0; background: #f8fafc;
        span { display: block; font-size: 0.58rem; color: #94a3b8; text-transform: uppercase; }
        strong { display: block; margin-top: 0.12rem; font-size: 0.95rem; }
      }
    }
    .crpt__section { margin-top: 0.65rem; h3 { margin: 0 0 0.35rem; font-size: 0.72rem; font-weight: 700; color: #4338ca; } p { margin: 0 0 0.35rem; font-size: 0.72rem; line-height: 1.55; color: #475569; } }
    .crpt__violations { list-style: none; margin: 0.65rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; max-height: 18rem; overflow-y: auto; }
    .crpt__violations li { display: flex; gap: 0.45rem; padding: 0.5rem 0.6rem; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; }
    .crpt__violations strong { display: block; font-size: 0.74rem; }
    .crpt__violations span { display: block; font-size: 0.62rem; color: #64748b; margin-top: 0.06rem; }
    .crpt__violations p { margin: 0.25rem 0 0; font-size: 0.65rem; color: #475569; line-height: 1.45; }
    .crpt__sev { flex-shrink: 0; padding: 0.15rem 0.4rem; border-radius: 999px; font-size: 0.58rem; font-weight: 700;
      &[data-sev='critical'] { background: #fef2f2; color: #b91c1c; }
      &[data-sev='high'] { background: #fff7ed; color: #c2410c; }
      &[data-sev='medium'] { background: #fffbeb; color: #b45309; }
    }
    .crpt__recs { margin: 0.65rem 0 0; padding-left: 1.2rem; font-size: 0.72rem; line-height: 1.6; color: #475569; }
    .crpt__appendix { margin: 0.35rem 0 0; padding-left: 1.1rem; font-size: 0.68rem; color: #64748b; line-height: 1.5; }
    .crpt__doc {
      margin: 0.65rem 0 0; padding: 0.85rem; border-radius: 8px; background: #0f172a; color: #e2e8f0;
      font-family: ui-monospace, monospace; font-size: 0.65rem; line-height: 1.55; white-space: pre-wrap;
      max-height: 20rem; overflow: auto; scrollbar-width: thin;
    }
    .crpt__empty { text-align: center; color: #94a3b8; font-size: 0.72rem; padding: 1rem !important; border: none !important; background: transparent !important; }
    @media (max-width: 640px) { .crpt__stats { grid-template-columns: repeat(2, 1fr); } }
  `,
})
export class ComplianceReportDialogComponent {
  readonly data = inject<ComplianceReportDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)
  readonly severityLabel = securitySeverityLabel

  readonly relatedViolations = computed(() =>
    this.data.violations.filter((v) => v.framework === this.data.report.framework),
  )

  readonly reportText = computed(() => buildComplianceReportText(this.data.report, this.data.violations))

  handleDownloadPdf = async (): Promise<void> => {
    await downloadComplianceReportPdf(this.data.report, this.data.violations)
    this.toast.success('Informe PDF descargado')
  }

  handleDownloadTxt = (): void => {
    downloadComplianceReportTxt(this.data.report, this.data.violations)
    this.toast.success('Informe TXT descargado')
  }

  handleDownloadJson = (): void => {
    downloadComplianceReportJson(this.data.report, this.data.violations)
    this.toast.success('Informe JSON descargado')
  }
}
