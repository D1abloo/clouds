import { DatePipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { ToastService } from '../../core/services/toast.service'
import {
  SECURITY_ACCENT,
  SECURITY_ACCENT_BORDER,
  SECURITY_ACCENT_LIGHT,
  downloadBlob,
  securitySeverityLabel,
} from './security.config'
import { SecurityCenterService } from './security-center.service'
import {
  buildScanReportText,
  scanReportFilename,
  type SecurityScanReport,
} from './security-scan-report.util'
import { SecurityScanReportDialogComponent } from './security-scan-report-dialog.component'

export interface SecurityExportDialogData {
  scope?: 'full' | 'finding'
  findingId?: string
}

type ExportSource = 'current' | 'scan'

@Component({
  selector: 'app-security-export-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <article class="sec-export">
      <header class="sec-export__head">
        <mat-icon>download</mat-icon>
        <div>
          <h2>{{ data.scope === 'finding' ? 'Exportar hallazgo' : 'Exportar informe de seguridad' }}</h2>
          <p>
            @if (data.scope === 'finding') {
              Descarga los datos del hallazgo seleccionado.
            } @else {
              Selecciona un informe de escaneo guardado o exporta el estado actual del centro de seguridad.
            }
          </p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content class="sec-export__body">
        @if (data.scope === 'finding') {
          <fieldset class="sec-export__formats">
            <legend>Formato</legend>
            @for (fmt of formats; track fmt.id) {
              <label class="sec-export__fmt" [class.sec-export__fmt--on]="selectedFormat() === fmt.id">
                <input
                  type="radio"
                  name="format"
                  [value]="fmt.id"
                  [checked]="selectedFormat() === fmt.id"
                  (change)="selectedFormat.set(fmt.id)"
                />
                <mat-icon>{{ fmt.icon }}</mat-icon>
                <span>{{ fmt.label }}</span>
              </label>
            }
          </fieldset>
        } @else {
          <section class="sec-export__section">
            <h3>Origen del informe</h3>
            <div class="sec-export__source">
              <label class="sec-export__source-opt" [class.sec-export__source-opt--on]="exportSource() === 'scan'">
                <input
                  type="radio"
                  name="source"
                  value="scan"
                  [checked]="exportSource() === 'scan'"
                  (change)="exportSource.set('scan')"
                />
                <mat-icon>description</mat-icon>
                <div>
                  <strong>Informe de escaneo guardado</strong>
                  <span>{{ scanReports().length }} informe(s) disponible(s)</span>
                </div>
              </label>
              <label class="sec-export__source-opt" [class.sec-export__source-opt--on]="exportSource() === 'current'">
                <input
                  type="radio"
                  name="source"
                  value="current"
                  [checked]="exportSource() === 'current'"
                  (change)="exportSource.set('current')"
                />
                <mat-icon>dashboard</mat-icon>
                <div>
                  <strong>Estado actual del centro</strong>
                  <span>Snapshot en vivo de hallazgos y KPIs</span>
                </div>
              </label>
            </div>
          </section>

          @if (exportSource() === 'scan') {
            <section class="sec-export__section">
              <h3>Informes de escaneo <em>{{ scanReports().length }}</em></h3>
              @if (scanReports().length) {
                <ul class="sec-export__reports">
                  @for (report of scanReports(); track report.id) {
                    <li
                      class="sec-export__report"
                      [class.sec-export__report--on]="selectedReportId() === report.id"
                    >
                      <label class="sec-export__report-main">
                        <input
                          type="radio"
                          name="scanReport"
                          [value]="report.id"
                          [checked]="selectedReportId() === report.id"
                          (change)="selectedReportId.set(report.id)"
                        />
                        <div class="sec-export__report-info">
                          <strong class="mono">{{ report.id }}</strong>
                          <span>{{ report.completedAt | date: 'dd MMM yyyy, HH:mm' }} · {{ report.durationSeconds }}s</span>
                          <span>{{ report.scope }} · {{ report.providers.join(', ') }}</span>
                          <span>
                            {{ report.resourcesScanned }} recursos ·
                            {{ report.newFindings.length }} nuevos ·
                            {{ report.previousScore }}→{{ report.newScore }}/100
                          </span>
                        </div>
                      </label>
                      <button type="button" class="sec-export__view" (click)="handleViewReport(report)">
                        <mat-icon>visibility</mat-icon> Ver
                      </button>
                    </li>
                  }
                </ul>
              } @else {
                <p class="sec-export__empty">
                  No hay informes de escaneo guardados. Ejecuta un escaneo para generar y guardar informes.
                </p>
              }
            </section>
          } @else {
            <ul class="sec-export__includes">
              <li>Resumen ejecutivo y puntuación de riesgo actual</li>
              <li>Total de hallazgos por severidad</li>
              <li>Recursos afectados y recomendaciones</li>
              <li>Estado de remediación</li>
            </ul>
          }

          <fieldset class="sec-export__formats">
            <legend>Formato de exportación</legend>
            <div class="sec-export__format-grid">
              @for (fmt of formats; track fmt.id) {
                <label class="sec-export__fmt" [class.sec-export__fmt--on]="selectedFormat() === fmt.id">
                  <input
                    type="radio"
                    name="format"
                    [value]="fmt.id"
                    [checked]="selectedFormat() === fmt.id"
                    (change)="selectedFormat.set(fmt.id)"
                  />
                  <mat-icon>{{ fmt.icon }}</mat-icon>
                  <span>{{ fmt.label }}</span>
                </label>
              }
            </div>
          </fieldset>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
        @if (data.scope !== 'finding' && exportSource() === 'scan' && selectedReport()) {
          <button mat-stroked-button type="button" (click)="handleViewReport(selectedReport()!)">
            <mat-icon>description</mat-icon> Ver informe
          </button>
        }
        <button
          mat-flat-button
          color="primary"
          type="button"
          class="sec-export__cta"
          [disabled]="!canExport()"
          (click)="handleExport()"
        >
          <mat-icon>download</mat-icon> Exportar
        </button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .sec-export { width: 100%; color: #0f172a; display: flex; flex-direction: column; min-height: 0; }
    .sec-export__head {
      display: flex; gap: 0.65rem; align-items: flex-start; padding-bottom: 0.75rem;
      border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
      mat-icon:first-child { color: ${SECURITY_ACCENT}; font-size: 1.35rem; width: 1.35rem; height: 1.35rem; margin-top: 0.05rem; }
      h2 { margin: 0; font-size: 1.05rem; font-weight: 700; line-height: 1.25; }
      p { margin: 0.2rem 0 0; font-size: 0.72rem; color: #64748b; line-height: 1.45; max-width: 36rem; }
    }
    .sec-export__body { padding-top: 0.85rem !important; display: flex; flex-direction: column; gap: 0.85rem; }
    .sec-export__section h3 {
      margin: 0 0 0.45rem; font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.04em; color: #94a3b8; display: flex; align-items: center; gap: 0.35rem;
      em { font-style: normal; font-weight: 600; color: ${SECURITY_ACCENT}; }
    }
    .sec-export__source { display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; }
    .sec-export__source-opt {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.65rem; border-radius: 9px;
      border: 1px solid #e2e8f0; cursor: pointer; transition: border-color 0.15s, background 0.15s;
      input { accent-color: ${SECURITY_ACCENT}; }
      mat-icon { color: #94a3b8; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      strong { display: block; font-size: 0.74rem; font-weight: 600; }
      span { display: block; font-size: 0.64rem; color: #64748b; margin-top: 0.1rem; }
      &:hover { border-color: ${SECURITY_ACCENT_BORDER}; }
    }
    .sec-export__source-opt--on {
      border-color: ${SECURITY_ACCENT}; background: ${SECURITY_ACCENT_LIGHT};
      mat-icon { color: ${SECURITY_ACCENT}; }
    }
    .sec-export__reports {
      list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem;
      max-height: 14rem; overflow-y: auto; scrollbar-width: thin;
    }
    .sec-export__report {
      display: grid; grid-template-columns: 1fr auto; gap: 0.45rem; align-items: center;
      padding: 0.45rem 0.55rem; border-radius: 9px; border: 1px solid #e2e8f0; background: #fff;
    }
    .sec-export__report--on { border-color: ${SECURITY_ACCENT}; background: ${SECURITY_ACCENT_LIGHT}; }
    .sec-export__report-main {
      display: flex; gap: 0.45rem; align-items: flex-start; cursor: pointer; min-width: 0;
      input { margin-top: 0.2rem; accent-color: ${SECURITY_ACCENT}; flex-shrink: 0; }
    }
    .sec-export__report-info {
      min-width: 0;
      strong { display: block; font-size: 0.7rem; color: #0f172a; }
      span { display: block; font-size: 0.62rem; color: #64748b; margin-top: 0.08rem; line-height: 1.35; }
    }
    .sec-export__view {
      display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.28rem 0.5rem; border-radius: 7px;
      border: 1px solid #e2e8f0; background: #fff; font: inherit; font-size: 0.62rem; font-weight: 600;
      color: #475569; cursor: pointer; flex-shrink: 0;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
      &:hover { border-color: ${SECURITY_ACCENT_BORDER}; color: ${SECURITY_ACCENT}; background: #fff; }
    }
    .sec-export__empty {
      margin: 0; padding: 0.75rem; border-radius: 8px; background: #f8fafc; border: 1px dashed #cbd5e1;
      font-size: 0.72rem; color: #64748b; text-align: center; line-height: 1.5;
    }
    .sec-export__formats { border: none; margin: 0; padding: 0; }
    .sec-export__formats legend {
      font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 0.4rem;
    }
    .sec-export__format-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem; }
    .sec-export__fmt {
      display: flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.55rem; border-radius: 8px;
      border: 1px solid #e2e8f0; cursor: pointer; font-size: 0.68rem; min-width: 0;
      &:has(input:checked), &.sec-export__fmt--on { border-color: ${SECURITY_ACCENT}; background: ${SECURITY_ACCENT_LIGHT}; }
      input { accent-color: ${SECURITY_ACCENT}; }
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #64748b; flex-shrink: 0; }
      span { line-height: 1.3; }
    }
    .sec-export__includes {
      margin: 0; padding: 0.65rem 0.85rem; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0;
      padding-left: 1.35rem; font-size: 0.68rem; color: #64748b; line-height: 1.6;
    }
    .mono { font-family: ui-monospace, monospace; }
    .sec-export__cta mat-icon { margin-right: 0.2rem; font-size: 1rem; width: 1rem; height: 1rem; }
    @media (max-width: 720px) {
      .sec-export__source { grid-template-columns: 1fr; }
      .sec-export__format-grid { grid-template-columns: 1fr; }
      .sec-export__report { grid-template-columns: 1fr; }
    }
  `,
})
export class SecurityExportDialogComponent {
  readonly data = inject<SecurityExportDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? { scope: 'full' }
  private readonly dialogRef = inject(MatDialogRef<SecurityExportDialogComponent>)
  private readonly dialog = inject(MatDialog)
  private readonly svc = inject(SecurityCenterService)
  private readonly toast = inject(ToastService)

  readonly selectedFormat = signal<'pdf' | 'csv' | 'json'>('json')
  readonly exportSource = signal<ExportSource>('scan')
  readonly selectedReportId = signal<string | null>(null)

  readonly scanReports = computed(() => this.svc.scanReports())

  readonly selectedReport = computed(() => {
    const id = this.selectedReportId()
    if (!id) return this.scanReports()[0] ?? null
    return this.scanReports().find((r) => r.id === id) ?? null
  })

  readonly canExport = computed(() => {
    if (this.data.scope === 'finding') return true
    if (this.exportSource() === 'current') return true
    return !!this.selectedReport()
  })

  readonly formats = [
    { id: 'pdf' as const, label: 'PDF / TXT', icon: 'picture_as_pdf' },
    { id: 'csv' as const, label: 'CSV', icon: 'table_chart' },
    { id: 'json' as const, label: 'JSON', icon: 'data_object' },
  ]

  constructor() {
    const latest = this.svc.latestScanReport()
    if (latest) this.selectedReportId.set(latest.id)
  }

  handleViewReport = (report: SecurityScanReport): void => {
    this.dialog.open(SecurityScanReportDialogComponent, {
      width: 'min(920px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '92vh',
      panelClass: 'sec-scan-report-dialog-panel',
      data: { report },
    })
  }

  handleExport = (): void => {
    if (!this.canExport()) return

    if (this.data.scope === 'finding') {
      this.exportFinding()
      return
    }

    if (this.exportSource() === 'scan') {
      const report = this.selectedReport()
      if (!report) {
        this.toast.warning('Selecciona un informe de escaneo')
        return
      }
      this.exportScanReport(report)
      return
    }

    this.exportCurrentState()
  }

  private exportScanReport = (report: SecurityScanReport): void => {
    const fmt = this.selectedFormat()

    if (fmt === 'json') {
      downloadBlob(JSON.stringify(report, null, 2), scanReportFilename(report, 'json'), 'application/json')
    } else if (fmt === 'csv') {
      const header = 'Hallazgo,Recurso,Proveedor,Categoría,Severidad,Detectado\n'
      const rows = report.newFindings.map((r) =>
        `"${r.finding}","${r.resource}","${r.provider}","${r.category}","${securitySeverityLabel(r.severity)}","${r.detectedAt}"`,
      ).join('\n')
      downloadBlob(header + rows, `informe-escaneo-${report.id}.csv`, 'text/csv')
    } else {
      downloadBlob(buildScanReportText(report), scanReportFilename(report, 'txt'), 'text/plain')
      this.toast.info('PDF simulado — descargado como informe de texto')
    }

    this.toast.success(`Informe ${report.id} exportado`)
    this.dialogRef.close(true)
  }

  private exportCurrentState = (): void => {
    const fmt = this.selectedFormat()
    const date = new Date().toISOString().slice(0, 10)
    const risks = this.svc.risks()

    if (fmt === 'csv') {
      const header = 'Hallazgo,Recurso,Proveedor,Severidad,Estado,Detectado\n'
      const rows = risks.map((r) =>
        `"${r.finding}","${r.resource}","${r.provider}","${securitySeverityLabel(r.severity)}","${r.status}","${r.detectedAt}"`,
      ).join('\n')
      downloadBlob(header + rows, `informe-seguridad-${date}.csv`, 'text/csv')
    } else if (fmt === 'json') {
      const payload = {
        generatedAt: new Date().toISOString(),
        riskScore: this.svc.kpis().find((k) => k.label === 'Puntuación de riesgo')?.value,
        findings: risks,
        lastScan: this.svc.lastScanAt(),
        scanReports: this.svc.scanReports().map((r) => ({ id: r.id, completedAt: r.completedAt, newFindings: r.newFindings.length })),
      }
      downloadBlob(JSON.stringify(payload, null, 2), `informe-seguridad-${date}.json`, 'application/json')
    } else {
      const summary = [
        'INFORME DE SEGURIDAD — CloudOps',
        `Fecha: ${new Date().toLocaleString('es-ES')}`,
        `Puntuación: ${this.svc.kpis().find((k) => k.label === 'Puntuación de riesgo')?.value}`,
        `Hallazgos: ${risks.length}`,
        `Informes de escaneo guardados: ${this.svc.scanReports().length}`,
        '',
        ...risks.map((r) => `- [${securitySeverityLabel(r.severity)}] ${r.finding} (${r.resource})`),
      ].join('\n')
      downloadBlob(summary, `informe-seguridad-${date}.txt`, 'text/plain')
      this.toast.info('PDF simulado — descargado como informe de texto')
    }

    this.toast.success(`Informe exportado (${fmt.toUpperCase()})`)
    this.dialogRef.close(true)
  }

  private exportFinding = (): void => {
    const fmt = this.selectedFormat()
    const date = new Date().toISOString().slice(0, 10)
    const risks = this.svc.risks().filter((r) => r.id === this.data.findingId)

    if (fmt === 'json') {
      downloadBlob(JSON.stringify({ exportedAt: new Date().toISOString(), finding: risks[0] }, null, 2), `hallazgo-${this.data.findingId}.json`, 'application/json')
    } else if (fmt === 'csv') {
      const r = risks[0]
      if (!r) return
      const row = `"${r.finding}","${r.resource}","${r.provider}","${securitySeverityLabel(r.severity)}","${r.status}","${r.detectedAt}"`
      downloadBlob(`Hallazgo,Recurso,Proveedor,Severidad,Estado,Detectado\n${row}`, `hallazgo-${r.id}.csv`, 'text/csv')
    } else {
      const r = risks[0]
      if (!r) return
      downloadBlob(`${r.finding}\n${r.resource}\n${r.recommendation}`, `hallazgo-${r.id}.txt`, 'text/plain')
    }

    this.toast.success('Hallazgo exportado')
    this.dialogRef.close(true)
  }
}
