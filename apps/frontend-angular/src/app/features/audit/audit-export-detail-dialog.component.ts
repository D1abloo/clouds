import { DatePipe, DecimalPipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import { AUDIT_ACCENT, AUDIT_ACCENT_BORDER, AUDIT_ACCENT_LIGHT, downloadBlob } from './audit.config'
import type { AuditExport } from './audit.demo'

export interface AuditExportDetailData {
  export: AuditExport
}

@Component({
  selector: 'app-audit-export-detail-dialog',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="aexp">
      <header class="aexp__head">
        <div>
          <span class="aexp__label">Exportación de auditoría</span>
          <h2>{{ data.export.name }}</h2>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content class="aexp__body">
        <div class="aexp__badges">
          <span class="aexp__fmt">{{ data.export.format }}</span>
          <app-status-badge [value]="data.export.status" />
        </div>
        <dl class="aexp__grid">
          <div><dt>Periodo</dt><dd>{{ data.export.period }}</dd></div>
          <div><dt>Registros</dt><dd>{{ data.export.records | number }}</dd></div>
          <div><dt>Solicitado por</dt><dd>{{ data.export.requestedBy }}</dd></div>
          <div><dt>Generado</dt><dd>{{ data.export.generatedAt | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
          <div><dt>Tamaño</dt><dd>{{ data.export.sizeKb ? (data.export.sizeKb + ' KB') : '—' }}</dd></div>
          <div><dt>Filtros</dt><dd>{{ data.export.filters }}</dd></div>
        </dl>
        <section class="aexp__block">
          <h3><mat-icon>view_list</mat-icon> Campos incluidos</h3>
          <div class="aexp__tags">
            @for (f of data.export.includes; track f) { <span>{{ f }}</span> }
          </div>
        </section>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        @if (data.export.status === 'success') {
          <button mat-flat-button color="primary" type="button" (click)="handleDownload()">
            <mat-icon>download</mat-icon> Descargar {{ data.export.format }}
          </button>
        }
        <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .aexp { width: 100%; color: #0f172a; display: flex; flex-direction: column; min-height: 0; }
    .aexp__head { display: flex; justify-content: space-between; gap: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .aexp__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .aexp__head h2 { margin: 0.2rem 0 0; font-size: 1.05rem; font-weight: 700; }
    .aexp__body { padding-top: 0.75rem !important; display: flex; flex-direction: column; gap: 0.75rem; }
    .aexp__badges { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
    .aexp__fmt { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700; background: ${AUDIT_ACCENT}; color: #fff; }
    .aexp__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem;
      dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.1rem 0 0; font-size: 0.78rem; }
    }
    .aexp__block { padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid ${AUDIT_ACCENT_BORDER}; background: ${AUDIT_ACCENT_LIGHT}; }
    .aexp__block h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.4rem; font-size: 0.75rem; font-weight: 700; color: ${AUDIT_ACCENT}; }
    .aexp__block h3 mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .aexp__tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .aexp__tags span { padding: 0.12rem 0.45rem; border-radius: 999px; font-size: 0.62rem; font-weight: 600; background: #fff; border: 1px solid #e2e8f0; color: #475569; font-family: ui-monospace, monospace; }
  `,
})
export class AuditExportDetailDialogComponent {
  readonly data = inject<AuditExportDetailData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<AuditExportDetailDialogComponent>)
  private readonly toast = inject(ToastService)

  handleDownload = (): void => {
    const ex = this.data.export
    const ext = ex.format.toLowerCase()
    const content = ext === 'json'
      ? JSON.stringify({ name: ex.name, records: ex.records, period: ex.period, includes: ex.includes }, null, 2)
      : `# ${ex.name}\nPeriodo: ${ex.period}\nRegistros: ${ex.records}\nFiltros: ${ex.filters}\n`
    downloadBlob(content, `${ex.name.replace(/\s+/g, '-').toLowerCase()}.${ext}`, ext === 'json' ? 'application/json' : 'text/plain')
    this.toast.success(`Descargado: ${ex.name}`)
    this.dialogRef.close()
  }
}
