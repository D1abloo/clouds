import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { ToastService } from '../../core/services/toast.service'
import { securitySeverityLabel, securityStatusLabel } from './security.config'
import type { SecurityRisk } from './security-center.demo'
import { SecurityRemediateConfirmDialogComponent } from './security-remediate-confirm-dialog.component'
import { SecurityExportDialogComponent } from './security-export-dialog.component'
import { SecurityEvidenceDialogComponent } from './security-evidence-dialog.component'
import { MatDialog } from '@angular/material/dialog'

export interface SecurityFindingDetailData {
  finding: SecurityRisk
}

@Component({
  selector: 'app-security-finding-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <article class="sec-detail">
      <header class="sec-detail__head">
        <div class="sec-detail__head-main">
          <span class="sec-detail__label">Hallazgo de seguridad · {{ data.finding.category }}</span>
          <h2>{{ data.finding.finding }}</h2>
          <p>{{ data.finding.description }}</p>
        </div>
        <div class="sec-detail__head-badges">
          <span class="sec-sev" [attr.data-sev]="data.finding.severity">{{ severityLabel(data.finding.severity) }}</span>
          <span class="sec-status">{{ statusLabel(data.finding.status) }}</span>
          <span class="sec-detail__type">{{ data.finding.riskType }}</span>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>

      <mat-dialog-content class="sec-detail__body">
        <div class="sec-detail__layout">
          <aside class="sec-detail__aside">
            <h3>Metadatos</h3>
            <dl class="sec-detail__grid">
              <div><dt>Recurso</dt><dd class="mono">{{ data.finding.resource }}</dd></div>
              <div><dt>Tipo</dt><dd>{{ data.finding.resourceType }}</dd></div>
              <div><dt>Proveedor</dt><dd>{{ data.finding.provider }}</dd></div>
              <div><dt>Región</dt><dd>{{ data.finding.region }}</dd></div>
              <div><dt>Propietario</dt><dd>{{ data.finding.owner }}</dd></div>
              <div><dt>Detectado</dt><dd>{{ data.finding.detectedAt | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
              @if (data.finding.cve) {
                <div class="sec-detail__full"><dt>Referencia</dt><dd class="mono">{{ data.finding.cve }}</dd></div>
              }
            </dl>
            @if (data.finding.tags.length) {
              <div class="sec-detail__tags">
                @for (tag of data.finding.tags; track tag) { <span>{{ tag }}</span> }
              </div>
            }
            @if (data.finding.relatedResources.length) {
              <h3>Recursos relacionados</h3>
              <ul class="sec-detail__related">
                @for (rel of data.finding.relatedResources; track rel) { <li class="mono">{{ rel }}</li> }
              </ul>
            }
          </aside>

          <div class="sec-detail__main">
            <section class="sec-detail__section">
              <h3>Impacto</h3>
              <p>{{ data.finding.impact }}</p>
            </section>
            <section class="sec-detail__section sec-detail__section--accent">
              <h3>Recomendación</h3>
              <p>{{ data.finding.recommendation }}</p>
            </section>
            <div class="sec-detail__cols">
              <section class="sec-detail__section">
                <h3>Pasos de remediación</h3>
                <ol>
                  @for (step of data.finding.remediationSteps; track step) { <li>{{ step }}</li> }
                </ol>
              </section>
              <section class="sec-detail__section">
                <h3>Historial reciente</h3>
                <ol class="sec-detail__timeline sec-detail__timeline--compact">
                  @for (entry of data.finding.history.slice(0, 4); track entry.at) {
                    <li>
                      <time>{{ entry.at | date: 'dd MMM HH:mm' }}</time>
                      <strong>{{ entry.action }}</strong>
                      <span>{{ entry.user }}</span>
                    </li>
                  }
                </ol>
              </section>
            </div>
            <section class="sec-detail__section sec-detail__section--evidence">
              <div class="sec-detail__evidence-head">
                <h3>Evidencia · {{ data.finding.evidenceType }}</h3>
                <button type="button" class="sec-detail__evidence-btn" (click)="handleOpenEvidence()">
                  <mat-icon>open_in_full</mat-icon> Ver evidencia ampliada
                </button>
              </div>
              <pre class="sec-detail__evidence-pre">{{ data.finding.evidence }}</pre>
            </section>
            <section class="sec-detail__section">
              <h3>Historial completo</h3>
              <ol class="sec-detail__timeline">
                @for (entry of data.finding.history; track entry.at) {
                  <li>
                    <time>{{ entry.at | date: 'dd MMM yyyy, HH:mm' }}</time>
                    <strong>{{ entry.action }}</strong>
                    <span>{{ entry.user }}</span>
                    @if (entry.note) { <em>{{ entry.note }}</em> }
                  </li>
                }
              </ol>
            </section>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="start" class="sec-detail__actions">
        @if (data.finding.remediable && data.finding.status !== 'completed') {
          <button mat-flat-button class="sec-detail__btn-primary" type="button" (click)="handleRemediate()">
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
    .sec-detail { display: flex; flex-direction: column; width: 100%; max-width: 960px; color: #0f172a; }
    .sec-detail__head {
      flex-shrink: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 0.65rem;
      align-items: start; padding-bottom: 0.65rem; border-bottom: 1px solid #e2e8f0;
    }
    .sec-detail__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; letter-spacing: 0.05em; color: #6366f1; }
    .sec-detail__head h2 { margin: 0.2rem 0 0; font-size: 1rem; font-weight: 700; line-height: 1.35; max-width: 42rem; }
    .sec-detail__head p { margin: 0.35rem 0 0; font-size: 0.75rem; color: #64748b; line-height: 1.5; max-width: 46rem; }
    .sec-detail__head-badges { display: flex; flex-wrap: wrap; gap: 0.3rem; justify-content: flex-end; align-content: flex-start; }
    .sec-detail__body { padding: 0.75rem 0 !important; overflow-y: auto; flex: 1; min-height: 0; }
    .sec-detail__layout { display: grid; grid-template-columns: minmax(13rem, 16rem) minmax(0, 1fr); gap: 1rem; width: 100%; }
    .sec-detail__aside {
      padding: 0.65rem; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0;
      h3 { margin: 0 0 0.4rem; font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #6366f1; }
    }
    .sec-detail__grid {
      display: grid; grid-template-columns: 1fr; gap: 0.45rem; margin: 0 0 0.65rem;
      dt { font-size: 0.55rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.08rem 0 0; font-size: 0.75rem; word-break: break-word; }
    }
    .sec-detail__full { grid-column: 1 / -1; }
    .sec-detail__tags { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.65rem; }
    .sec-detail__tags span { padding: 0.1rem 0.4rem; border-radius: 999px; background: #eef2ff; font-size: 0.58rem; font-weight: 600; color: #4338ca; }
    .sec-detail__related { margin: 0; padding-left: 1rem; font-size: 0.68rem; }
    .sec-detail__main { min-width: 0; }
    .sec-detail__cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    .sec-detail__section {
      margin-bottom: 0.65rem; padding: 0.6rem 0.7rem; border-radius: 9px; background: #f8fafc; border: 1px solid #e2e8f0;
      h3 { margin: 0 0 0.35rem; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #64748b; }
      p, ol { margin: 0; font-size: 0.75rem; line-height: 1.55; color: #334155; }
      ol { padding-left: 1.1rem; }
      pre { margin: 0; padding: 0.55rem; border-radius: 6px; background: #0f172a; color: #e2e8f0; font-size: 0.65rem; line-height: 1.5; overflow-x: auto; white-space: pre-wrap; }
    }
    .sec-detail__section--accent { background: #eef2ff; border-color: #c7d2fe; h3 { color: #4338ca; } p { color: #3730a3; } }
    .sec-detail__section--evidence { background: #f8fafc; }
    .sec-detail__evidence-head {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.45rem;
      h3 { margin: 0; }
    }
    .sec-detail__evidence-btn {
      display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.3rem 0.55rem; border-radius: 8px;
      border: 1px solid #c7d2fe; background: #fff; font: inherit; font-size: 0.65rem; font-weight: 600;
      color: #4338ca; cursor: pointer;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
      &:hover { background: #eef2ff; }
    }
    .sec-detail__evidence-pre {
      margin: 0; padding: 0.75rem 0.85rem; border-radius: 8px; background: #0f172a; color: #e2e8f0;
      font-family: ui-monospace, monospace; font-size: 0.7rem; line-height: 1.6;
      overflow: auto; white-space: pre-wrap; word-break: break-word;
      min-height: 8rem; max-height: 14rem; width: 100%; box-sizing: border-box;
    }
    .sec-detail__timeline--compact li { padding: 0.28rem 0; }
    .sec-sev {
      display: inline-block; padding: 0.15rem 0.45rem; border-radius: 999px; font-size: 0.65rem; font-weight: 700;
      &[data-sev='critical'] { background: #fee2e2; color: #b91c1c; }
      &[data-sev='high'] { background: #ffedd5; color: #c2410c; }
      &[data-sev='medium'] { background: #fef3c7; color: #b45309; }
      &[data-sev='low'] { background: #ecfccb; color: #4d7c0f; }
      &[data-sev='info'] { background: #e0f2fe; color: #0369a1; }
    }
    .sec-status { padding: 0.15rem 0.45rem; border-radius: 999px; font-size: 0.65rem; font-weight: 600; background: #f1f5f9; color: #475569; }
    .sec-detail__type { padding: 0.15rem 0.45rem; border-radius: 999px; font-size: 0.62rem; background: #eef2ff; color: #4338ca; font-weight: 600; }
    .sec-detail__timeline { list-style: none; padding: 0; margin: 0; }
    .sec-detail__timeline li { padding: 0.4rem 0; border-bottom: 1px solid #e2e8f0; font-size: 0.72rem; }
    .sec-detail__timeline time { display: block; font-size: 0.6rem; color: #94a3b8; }
    .sec-detail__timeline strong { display: block; font-weight: 600; }
    .sec-detail__timeline span { color: #64748b; }
    .sec-detail__timeline em { display: block; font-size: 0.65rem; color: #94a3b8; font-style: normal; }
    .sec-detail__actions { gap: 0.35rem; padding-top: 0.5rem; flex-shrink: 0; border-top: 1px solid #f1f5f9; }
    .sec-detail__btn-primary { background: #4f46e5 !important; color: #fff !important; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.72rem; }

    @media (max-width: 720px) {
      .sec-detail__layout { grid-template-columns: 1fr; }
      .sec-detail__cols { grid-template-columns: 1fr; }
      .sec-detail__head { grid-template-columns: 1fr auto; }
      .sec-detail__head-badges { grid-column: 1 / -1; justify-content: flex-start; }
    }
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
      width: 'min(480px, 92vw)',
      maxWidth: '92vw',
      panelClass: 'sec-export-dialog-panel--compact',
      data: { scope: 'finding', findingId: this.data.finding.id },
    })
  }

  handleOpenEvidence = (): void => {
    this.dialog.open(SecurityEvidenceDialogComponent, {
      width: 'min(920px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '92vh',
      panelClass: 'sec-evidence-dialog-panel',
      data: { finding: this.data.finding },
    })
  }
}
