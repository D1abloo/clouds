import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { securitySeverityLabel, securityStatusLabel, downloadBlob } from './security.config'
import type { SecurityRisk } from './security-center.data'

export interface SecurityEvidenceDialogData {
  finding: SecurityRisk
}

const buildExtendedEvidence = (f: SecurityRisk): string => {
  const lines = [
    f.evidence,
    '',
    '══════════════════════════════════════════════════════════',
    '  SALIDA DEL ESCÁNER DE POSTURA',
    '══════════════════════════════════════════════════════════',
    `Scan ID      : scn-${f.id}-${Date.now().toString(36).slice(-6)}`,
    `Engine       : cloudops-posture-scanner v2.4.1`,
    `Policy pack  : ${f.category.toLowerCase()}-baseline / CIS v1.4`,
    `Resource     : ${f.resource}`,
    `Provider     : ${f.provider} · ${f.region}`,
    `Severity     : ${f.severity}`,
    `Detected     : ${f.detectedAt}`,
    '',
    '--- Contexto ---',
    `Tipo de riesgo : ${f.riskType}`,
    `Propietario    : ${f.owner}`,
    `Estado actual  : ${f.status}`,
    '',
    '--- Regla evaluada ---',
    `Finding   : ${f.finding}`,
    `Impacto   : ${f.impact}`,
    '',
    '--- Recomendación automática ---',
    f.recommendation,
    '',
    '--- Pasos sugeridos ---',
    ...f.remediationSteps.map((s, i) => `${i + 1}. ${s}`),
  ]
  if (f.cve) lines.push('', `Referencia: ${f.cve}`)
  if (f.relatedResources.length) {
    lines.push('', '--- Recursos relacionados ---', ...f.relatedResources.map((r) => `  · ${r}`))
  }
  lines.push('', '[FIN DEL INFORME DE EVIDENCIA]')
  return lines.join('\n')
}

@Component({
  selector: 'app-security-evidence-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatTabsModule],
  template: `
    <article class="sec-ev">
      <header class="sec-ev__head">
        <mat-icon>fact_check</mat-icon>
        <div class="sec-ev__head-text">
          <span class="sec-ev__type">{{ data.finding.evidenceType }}</span>
          <h2>Evidencia técnica ampliada</h2>
          <p>{{ data.finding.finding }}</p>
        </div>
        <div class="sec-ev__badges">
          <span class="sec-ev__sev" [attr.data-sev]="data.finding.severity">{{ severityLabel(data.finding.severity) }}</span>
          <span class="sec-ev__st">{{ statusLabel(data.finding.status) }}</span>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>

      <mat-dialog-content class="sec-ev__body">
        <dl class="sec-ev__meta">
          <div><dt>Recurso</dt><dd class="mono">{{ data.finding.resource }}</dd></div>
          <div><dt>Proveedor</dt><dd>{{ data.finding.provider }}</dd></div>
          <div><dt>Región</dt><dd>{{ data.finding.region }}</dd></div>
          <div><dt>Detectado</dt><dd>{{ data.finding.detectedAt | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
        </dl>

        <mat-tab-group class="sec-ev__tabs" animationDuration="200ms">
          <mat-tab label="Evidencia principal">
            <pre class="sec-ev__pre sec-ev__pre--lg">{{ data.finding.evidence }}</pre>
          </mat-tab>
          <mat-tab label="Informe completo del escáner">
            <pre class="sec-ev__pre sec-ev__pre--full">{{ extendedEvidence }}</pre>
          </mat-tab>
          <mat-tab label="Remediación">
            <div class="sec-ev__rem">
              <p><strong>Impacto:</strong> {{ data.finding.impact }}</p>
              <p><strong>Recomendación:</strong> {{ data.finding.recommendation }}</p>
              <ol>
                @for (step of data.finding.remediationSteps; track step) { <li>{{ step }}</li> }
              </ol>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="sec-ev__actions">
        <button mat-stroked-button type="button" (click)="handleExport()">
          <mat-icon>download</mat-icon> Exportar evidencia
        </button>
        <button mat-flat-button class="sec-ev__btn-primary" type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .sec-ev {
      display: flex; flex-direction: column; width: 100%; max-width: 920px;
      min-width: min(720px, 96vw); color: #0f172a;
    }
    .sec-ev__head {
      flex-shrink: 0; display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto;
      gap: 0.55rem; align-items: start; padding-bottom: 0.65rem; border-bottom: 1px solid #e2e8f0;
    }
    .sec-ev__head > mat-icon:first-child { color: #4f46e5; font-size: 1.5rem; width: 1.5rem; height: 1.5rem; }
    .sec-ev__type { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #6366f1; }
    .sec-ev__head h2 { margin: 0.1rem 0 0; font-size: 0.95rem; font-weight: 700; }
    .sec-ev__head p { margin: 0.2rem 0 0; font-size: 0.72rem; color: #64748b; line-height: 1.45; }
    .sec-ev__badges { display: flex; flex-wrap: wrap; gap: 0.3rem; align-content: flex-start; }
    .sec-ev__sev {
      padding: 0.12rem 0.42rem; border-radius: 999px; font-size: 0.6rem; font-weight: 700;
      &[data-sev='critical'] { background: #fee2e2; color: #b91c1c; }
      &[data-sev='high'] { background: #ffedd5; color: #c2410c; }
      &[data-sev='medium'] { background: #fef3c7; color: #b45309; }
      &[data-sev='low'] { background: #ecfccb; color: #4d7c0f; }
      &[data-sev='info'] { background: #e0f2fe; color: #0369a1; }
    }
    .sec-ev__st { padding: 0.12rem 0.42rem; border-radius: 999px; font-size: 0.6rem; font-weight: 600; background: #f1f5f9; color: #475569; }
    .sec-ev__body { padding: 0.75rem 0 !important; overflow: hidden; display: flex; flex-direction: column; min-height: 0; flex: 1; }
    .sec-ev__meta {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.45rem 1rem;
      margin: 0 0 0.65rem; padding: 0.55rem 0.65rem; border-radius: 9px; background: #f8fafc; border: 1px solid #e2e8f0;
      dt { font-size: 0.52rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.06rem 0 0; font-size: 0.72rem; color: #334155; word-break: break-word; }
    }
    .sec-ev__tabs { flex: 1; min-height: 0; }
    :host ::ng-deep .sec-ev__tabs .mat-mdc-tab-body-wrapper { flex: 1; min-height: 18rem; }
    :host ::ng-deep .sec-ev__tabs .mat-mdc-tab-body-content { overflow: auto; padding-top: 0.5rem; }
    .sec-ev__pre {
      margin: 0; padding: 0.85rem 1rem; border-radius: 10px; background: #0f172a; color: #e2e8f0;
      font-family: ui-monospace, monospace; font-size: 0.72rem; line-height: 1.6;
      overflow: auto; white-space: pre-wrap; word-break: break-word; width: 100%; box-sizing: border-box;
    }
    .sec-ev__pre--lg { min-height: 12rem; max-height: 22rem; }
    .sec-ev__pre--full { min-height: 18rem; max-height: 28rem; }
    .sec-ev__rem {
      padding: 0.65rem; font-size: 0.75rem; line-height: 1.55; color: #334155;
      p { margin: 0 0 0.5rem; }
      ol { margin: 0; padding-left: 1.2rem; }
    }
    .sec-ev__actions { flex-shrink: 0; border-top: 1px solid #f1f5f9; padding-top: 0.5rem; }
    .sec-ev__btn-primary { background: #4f46e5 !important; color: #fff !important; }
    .mono { font-family: ui-monospace, monospace; }
    @media (max-width: 720px) {
      .sec-ev { min-width: 0; }
      .sec-ev__meta { grid-template-columns: 1fr 1fr; }
      .sec-ev__head { grid-template-columns: auto 1fr auto; }
      .sec-ev__badges { grid-column: 1 / -1; }
    }
  `,
})
export class SecurityEvidenceDialogComponent {
  readonly data = inject<SecurityEvidenceDialogData>(MAT_DIALOG_DATA)
  readonly severityLabel = securitySeverityLabel
  readonly statusLabel = securityStatusLabel
  readonly extendedEvidence = buildExtendedEvidence(this.data.finding)

  handleExport = (): void => {
    downloadBlob(this.extendedEvidence, `evidencia-${this.data.finding.id}.txt`, 'text/plain')
  }
}
