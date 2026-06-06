import { Component, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { ToastService } from '../../core/services/toast.service'
import { downloadBlob } from './security.config'
import { SecurityCenterService } from './security-center.service'
import { securitySeverityLabel } from './security.config'

export interface SecurityExportDialogData {
  scope?: 'full' | 'finding'
  findingId?: string
}

@Component({
  selector: 'app-security-export-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <article class="sec-export">
      <header class="sec-export__head">
        <mat-icon>download</mat-icon>
        <div>
          <h2>{{ data.scope === 'finding' ? 'Exportar hallazgo' : 'Exportar informe de seguridad' }}</h2>
          <p>Genera un informe con resumen ejecutivo, hallazgos, severidades y recomendaciones.</p>
        </div>
      </header>
      <mat-dialog-content class="sec-export__body">
        <fieldset class="sec-export__formats">
          <legend>Formato</legend>
          @for (fmt of formats; track fmt.id) {
            <label class="sec-export__fmt" [class.sec-export__fmt--on]="selectedFormat() === fmt.id">
              <input type="radio" name="format" [value]="fmt.id" [checked]="selectedFormat() === fmt.id" (change)="selectedFormat.set(fmt.id)" />
              <mat-icon>{{ fmt.icon }}</mat-icon>
              <span>{{ fmt.label }}</span>
            </label>
          }
        </fieldset>
        @if (data.scope !== 'finding') {
          <ul class="sec-export__includes">
            <li>Resumen ejecutivo y puntuación de riesgo</li>
            <li>Total de hallazgos por severidad</li>
            <li>Recursos afectados y recomendaciones</li>
            <li>Estado de remediación</li>
          </ul>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button color="primary" type="button" (click)="handleExport()">
          <mat-icon>download</mat-icon> Exportar
        </button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .sec-export { min-width: min(440px, 92vw); color: #0f172a; }
    .sec-export__head { display: flex; gap: 0.55rem; align-items: flex-start; padding-bottom: 0.6rem; border-bottom: 1px solid #e2e8f0; }
    .sec-export__head mat-icon { color: #ec4899; }
    .sec-export__head h2 { margin: 0; font-size: 0.95rem; font-weight: 700; }
    .sec-export__head p { margin: 0.2rem 0 0; font-size: 0.7rem; color: #64748b; }
    .sec-export__formats { border: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .sec-export__formats legend { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 0.35rem; }
    .sec-export__fmt {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.6rem; border-radius: 8px;
      border: 1px solid #e2e8f0; cursor: pointer; font-size: 0.75rem;
      &:has(input:checked), &.sec-export__fmt--on { border-color: #ec4899; background: #fdf2f8; }
      input { accent-color: #ec4899; }
    }
    .sec-export__includes { margin: 0.75rem 0 0; padding-left: 1.1rem; font-size: 0.68rem; color: #64748b; line-height: 1.6; }
  `,
})
export class SecurityExportDialogComponent {
  readonly data = inject<SecurityExportDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? { scope: 'full' }
  private readonly dialogRef = inject(MatDialogRef<SecurityExportDialogComponent>)
  private readonly svc = inject(SecurityCenterService)
  private readonly toast = inject(ToastService)

  readonly selectedFormat = signal<'pdf' | 'csv' | 'json'>('pdf')
  readonly formats = [
    { id: 'pdf' as const, label: 'PDF — Informe ejecutivo', icon: 'picture_as_pdf' },
    { id: 'csv' as const, label: 'CSV — Tabla de hallazgos', icon: 'table_chart' },
    { id: 'json' as const, label: 'JSON — Datos estructurados', icon: 'data_object' },
  ]

  handleExport = (): void => {
    const fmt = this.selectedFormat()
    const date = new Date().toISOString().slice(0, 10)
    const risks = this.data.findingId
      ? this.svc.risks().filter((r) => r.id === this.data.findingId)
      : this.svc.risks()

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
      }
      downloadBlob(JSON.stringify(payload, null, 2), `informe-seguridad-${date}.json`, 'application/json')
    } else {
      const summary = [
        'INFORME DE SEGURIDAD — CloudOps',
        `Fecha: ${new Date().toLocaleString('es-ES')}`,
        `Puntuación: ${this.svc.kpis().find((k) => k.label === 'Puntuación de riesgo')?.value}`,
        `Hallazgos: ${risks.length}`,
        '',
        ...risks.map((r) => `- [${securitySeverityLabel(r.severity)}] ${r.finding} (${r.resource})`),
      ].join('\n')
      downloadBlob(summary, `informe-seguridad-${date}.txt`, 'text/plain')
      this.toast.info('PDF simulado — descargado como informe de texto')
    }

    this.toast.success(`Informe exportado (${fmt.toUpperCase()})`)
    this.dialogRef.close(true)
  }
}
