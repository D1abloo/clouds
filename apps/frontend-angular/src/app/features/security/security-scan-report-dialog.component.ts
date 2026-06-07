import { DatePipe } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { ToastService } from '../../core/services/toast.service'
import { downloadBlob, securitySeverityLabel } from './security.config'
import {
  buildScanReportText,
  scanReportFilename,
  type SecurityScanReport,
} from './security-scan-report.util'

export interface SecurityScanReportDialogData {
  report: SecurityScanReport
}

@Component({
  selector: 'app-security-scan-report-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatTabsModule],
  template: `
    <article class="sec-rpt">
      <header class="sec-rpt__head">
        <mat-icon>description</mat-icon>
        <div>
          <span class="sec-rpt__id mono">{{ data.report.id }}</span>
          <h2>Informe de escaneo de seguridad</h2>
          <p>Generado el {{ data.report.completedAt | date: 'dd MMM yyyy, HH:mm' }} · {{ data.report.durationSeconds }}s</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content class="sec-rpt__body">
        <div class="sec-rpt__summary">
          <article>
            <span>Puntuación</span>
            <strong>{{ data.report.previousScore }} → {{ data.report.newScore }}/100</strong>
            <em>{{ data.report.scoreDelta > 0 ? '+' : '' }}{{ data.report.scoreDelta }} pts</em>
          </article>
          <article>
            <span>Recursos</span>
            <strong>{{ data.report.resourcesScanned }}</strong>
          </article>
          <article>
            <span>Nuevos hallazgos</span>
            <strong>{{ data.report.newFindings.length }}</strong>
          </article>
        </div>

        <mat-tab-group class="sec-rpt__tabs" animationDuration="200ms">
          <mat-tab label="Informe completo">
            <pre class="sec-rpt__doc">{{ reportText() }}</pre>
          </mat-tab>
          <mat-tab label="Hallazgos">
            @if (data.report.newFindings.length) {
              <ul class="sec-rpt__findings">
                @for (f of data.report.newFindings; track f.id) {
                  <li>
                    <span class="sec-rpt__sev" [attr.data-sev]="f.severity">{{ severityLabel(f.severity) }}</span>
                    <div>
                      <strong>{{ f.finding }}</strong>
                      <span>{{ f.resource }} · {{ f.provider }} · {{ f.category }}</span>
                      <p>{{ f.recommendation }}</p>
                    </div>
                  </li>
                }
              </ul>
            } @else {
              <p class="sec-rpt__empty">Sin hallazgos nuevos en este escaneo.</p>
            }
          </mat-tab>
          <mat-tab label="Objetivos">
            <ul class="sec-rpt__targets">
              @for (t of data.report.targets; track t.resource + t.category) {
                <li>
                  <strong class="mono">{{ t.resource }}</strong>
                  <span>{{ t.provider }} · {{ t.category }} · {{ t.resourceType }}</span>
                  <em>{{ t.check }}</em>
                </li>
              }
            </ul>
          </mat-tab>
        </mat-tab-group>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" (click)="handleDownloadTxt()">
          <mat-icon>description</mat-icon> Descargar TXT
        </button>
        <button mat-stroked-button type="button" (click)="handleDownloadJson()">
          <mat-icon>data_object</mat-icon> Descargar JSON
        </button>
        <button mat-flat-button color="primary" type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .sec-rpt { width: 100%; color: #0f172a; display: flex; flex-direction: column; min-height: 0; }
    .sec-rpt__head {
      display: flex; gap: 0.65rem; align-items: flex-start; padding-bottom: 0.75rem;
      border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
      mat-icon:first-child { color: #4f46e5; font-size: 1.4rem; width: 1.4rem; height: 1.4rem; margin-top: 0.1rem; }
      h2 { margin: 0.1rem 0 0; font-size: 1.05rem; font-weight: 700; }
      p { margin: 0.2rem 0 0; font-size: 0.72rem; color: #64748b; }
    }
    .sec-rpt__id { display: block; font-size: 0.62rem; color: #94a3b8; }
    .sec-rpt__body { padding-top: 0.75rem !important; display: flex; flex-direction: column; gap: 0.75rem; min-height: 0; }
    .sec-rpt__summary {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.45rem;
      article {
        padding: 0.55rem 0.65rem; border-radius: 9px; border: 1px solid #e2e8f0; background: #f8fafc;
        span { display: block; font-size: 0.58rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em; }
        strong { display: block; margin-top: 0.15rem; font-size: 0.95rem; }
        em { display: block; margin-top: 0.1rem; font-size: 0.65rem; font-style: normal; font-weight: 600; color: #dc2626; }
      }
    }
    .sec-rpt__tabs { min-height: 0; }
    .sec-rpt__doc {
      margin: 0.65rem 0 0; padding: 0.85rem 1rem; border-radius: 10px; background: #0f172a; color: #e2e8f0;
      font-family: ui-monospace, monospace; font-size: 0.68rem; line-height: 1.55;
      white-space: pre-wrap; word-break: break-word; max-height: 22rem; overflow: auto; scrollbar-width: thin;
    }
    .sec-rpt__findings, .sec-rpt__targets {
      list-style: none; margin: 0.65rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem;
      max-height: 22rem; overflow-y: auto; scrollbar-width: thin;
    }
    .sec-rpt__findings li, .sec-rpt__targets li {
      padding: 0.5rem 0.6rem; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff;
    }
    .sec-rpt__findings li { display: flex; gap: 0.45rem; align-items: flex-start; }
    .sec-rpt__findings strong { display: block; font-size: 0.74rem; }
    .sec-rpt__findings span { display: block; font-size: 0.62rem; color: #64748b; margin-top: 0.08rem; }
    .sec-rpt__findings p { margin: 0.25rem 0 0; font-size: 0.64rem; color: #475569; line-height: 1.45; }
    .sec-rpt__targets strong { display: block; font-size: 0.72rem; }
    .sec-rpt__targets span { display: block; font-size: 0.62rem; color: #64748b; margin-top: 0.08rem; }
    .sec-rpt__targets em { display: block; font-size: 0.6rem; font-style: normal; color: #94a3b8; margin-top: 0.15rem; }
    .sec-rpt__sev {
      flex-shrink: 0; padding: 0.15rem 0.4rem; border-radius: 999px; font-size: 0.58rem; font-weight: 700;
      &[data-sev='critical'] { background: #fef2f2; color: #b91c1c; }
      &[data-sev='high'] { background: #fff7ed; color: #c2410c; }
      &[data-sev='medium'] { background: #fffbeb; color: #b45309; }
    }
    .sec-rpt__empty { margin: 0.65rem 0 0; font-size: 0.72rem; color: #64748b; text-align: center; padding: 1rem; }
    .mono { font-family: ui-monospace, monospace; }
    @media (max-width: 640px) {
      .sec-rpt__summary { grid-template-columns: 1fr; }
    }
  `,
})
export class SecurityScanReportDialogComponent {
  readonly data = inject<SecurityScanReportDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)
  readonly severityLabel = securitySeverityLabel

  readonly reportText = computed(() => buildScanReportText(this.data.report))

  handleDownloadTxt = (): void => {
    downloadBlob(this.reportText(), scanReportFilename(this.data.report, 'txt'), 'text/plain')
    this.toast.success('Informe descargado (TXT)')
  }

  handleDownloadJson = (): void => {
    downloadBlob(JSON.stringify(this.data.report, null, 2), scanReportFilename(this.data.report, 'json'), 'application/json')
    this.toast.success('Informe descargado (JSON)')
  }
}
