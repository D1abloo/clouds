import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../components/brand-logo/brand-logo.component'
import { ToastService } from '../../core/services/toast.service'
import {
  buildReportDocument,
  reportDocumentText,
  type ReportDocument,
} from './reports-demo.util'
import { downloadReportPdf, downloadReportTxt } from './report-export.util'

export type ReportDocumentDialogData = {
  row?: Record<string, unknown>
  mode?: 'view' | 'download' | 'generate'
}

@Component({
  selector: 'app-report-document-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, BrandLogoComponent],
  template: `
    <article class="report-doc">
      <header class="report-doc__letterhead">
        <div class="report-doc__letterhead-row">
          <div class="report-doc__provider">
            <app-brand-logo class="report-doc__logo" [logo]="doc().primaryLogo" size="xl" />
            <div>
              <strong>{{ doc().cloudLabel }}</strong>
              <span>{{ doc().subtitle }}</span>
            </div>
          </div>
          <div class="report-doc__head-actions">
            <div class="report-doc__ref">
              <span>Ref. {{ doc().id }}</span>
              <span>v{{ doc().version }}</span>
            </div>
            <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar informe">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>
        <div class="report-doc__title-block">
          <p class="report-doc__doc-type">{{ doc().typeLabel }} · {{ doc().classification }}</p>
          <h2 mat-dialog-title>{{ doc().title }}</h2>
        </div>
        <table class="report-doc__meta-table">
          <tbody>
            <tr>
              <th>Periodo</th><td>{{ doc().period }}</td>
              <th>Generado</th><td>{{ doc().generatedAt }}</td>
            </tr>
            <tr>
              <th>Autor</th><td>{{ doc().author }}</td>
              <th>Estado</th><td>{{ statusLabel(doc().status) }}</td>
            </tr>
          </tbody>
        </table>
      </header>

      <mat-dialog-content class="report-doc__body">
        <section class="report-doc__block">
          <h3>1. Resumen ejecutivo</h3>
          <p>{{ doc().executiveSummary }}</p>
        </section>

        <section class="report-doc__block">
          <h3>2. Indicadores clave</h3>
          <table class="report-doc__kpi-table">
            <thead>
              <tr><th>Indicador</th><th>Valor</th><th>Detalle</th></tr>
            </thead>
            <tbody>
              @for (k of doc().kpis; track k.label) {
                <tr>
                  <td>{{ k.label }}</td>
                  <td><strong>{{ k.value }}</strong></td>
                  <td>{{ k.delta ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </section>

        @for (section of doc().sections; track section.id; let i = $index) {
          <section class="report-doc__block">
            <h3>{{ i + 3 }}. {{ sectionTitle(section.title) }}</h3>
            @for (p of section.paragraphs; track p) {
              <p class="report-doc__para">{{ p }}</p>
            }
            @if (section.bullets?.length) {
              <ul class="report-doc__bullets">
                @for (b of section.bullets; track b) { <li>{{ b }}</li> }
              </ul>
            }
            @if (section.table) {
              <div class="report-doc__table-wrap">
                <table>
                  <thead>
                    <tr>@for (h of section.table.headers; track h) { <th>{{ h }}</th> }</tr>
                  </thead>
                  <tbody>
                    @for (row of section.table.rows; track $index) {
                      <tr>@for (cell of row; track $index) { <td>{{ cell }}</td> }</tr>
                    }
                  </tbody>
                </table>
              </div>
            }
            @if (section.highlight) {
              <aside class="report-doc__note">{{ section.highlight }}</aside>
            }
          </section>
        }

        <section class="report-doc__block">
          <h3>{{ doc().sections.length + 3 }}. Recomendaciones</h3>
          <ol class="report-doc__rec-list">
            @for (r of doc().recommendations; track r) { <li>{{ r }}</li> }
          </ol>
        </section>

        @if (doc().appendix?.length) {
          <footer class="report-doc__appendix">
            <h4>Anexo</h4>
            <ul>@for (a of doc().appendix!; track a) { <li>{{ a }}</li> }</ul>
          </footer>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="report-doc__actions">
        <button mat-button mat-dialog-close type="button">Cerrar</button>
        <button mat-stroked-button type="button" (click)="handleCopy()">
          <mat-icon>content_copy</mat-icon> Copiar texto
        </button>
        <button mat-stroked-button type="button" (click)="handleExportTxt()">
          <mat-icon>description</mat-icon> Exportar .txt
        </button>
        <button mat-stroked-button type="button" (click)="handleExportPdf()" [disabled]="exporting()">
          <mat-icon>picture_as_pdf</mat-icon>
          {{ exporting() ? 'Generando PDF…' : 'Descargar PDF' }}
        </button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
    .report-doc {
      --ink: #111827;
      --muted: #6b7280;
      --line: #d1d5db;
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
      background: #fff;
      color: var(--ink);
      max-width: 100%;
    }
    .report-doc__letterhead {
      flex-shrink: 0;
      padding: 0.85rem 0 0.85rem;
      margin: 0;
      background: #fff;
      border-bottom: 1px solid var(--ink);
    }
    .report-doc__letterhead-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .report-doc__provider {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      strong { display: block; font-size: 0.85rem; font-weight: 700; color: var(--ink); }
      span { display: block; font-size: 0.72rem; color: var(--muted); margin-top: 0.15rem; line-height: 1.4; }
    }
    .report-doc__logo {
      display: block;
      flex-shrink: 0;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      outline: none !important;
      padding: 0 !important;
    }
    :host ::ng-deep .report-doc__logo .brand-logo {
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    .report-doc__ref {
      text-align: right;
      font-size: 0.68rem;
      color: var(--muted);
      line-height: 1.5;
      span { display: block; }
    }
    .report-doc__head-actions {
      display: flex;
      align-items: flex-start;
      gap: 0.25rem;
    }
    .report-doc__doc-type {
      margin: 0 0 0.35rem;
      font-size: 0.65rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
    }
    h2[mat-dialog-title] {
      margin: 0;
      padding: 0;
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.3;
      color: var(--ink);
    }
    .report-doc__meta-table {
      width: 100%;
      margin-top: 0.85rem;
      border-collapse: collapse;
      font-size: 0.75rem;
      th, td { padding: 0.35rem 0.5rem; border: 1px solid var(--line); text-align: left; vertical-align: top; }
      th { width: 12%; font-weight: 600; background: #fff; color: var(--muted); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.04em; }
      td { color: var(--ink); font-weight: 500; }
    }
    .report-doc__body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      background: #fff;
      padding: 0.75rem 0 0.25rem;
    }
    .report-doc__block {
      margin-bottom: 1.35rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--line);
      h3 {
        margin: 0 0 0.65rem;
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--ink);
        letter-spacing: 0.01em;
      }
      > p:first-of-type { margin-top: 0; }
    }
    .report-doc__para {
      margin: 0 0 0.65rem;
      font-size: 0.82rem;
      line-height: 1.75;
      color: #374151;
      text-align: justify;
    }
    .report-doc__bullets {
      margin: 0 0 0.65rem;
      padding-left: 1.25rem;
      font-size: 0.8rem;
      line-height: 1.65;
      color: #374151;
      li { margin-bottom: 0.35rem; }
    }
    .report-doc__kpi-table,
    .report-doc__table-wrap table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.76rem;
    }
    .report-doc__kpi-table th,
    .report-doc__table-wrap th {
      padding: 0.45rem 0.55rem;
      text-align: left;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--ink);
      background: #fff;
      border: 1px solid var(--ink);
    }
    .report-doc__kpi-table td,
    .report-doc__table-wrap td {
      padding: 0.42rem 0.55rem;
      border: 1px solid var(--line);
      color: #374151;
      vertical-align: top;
    }
    .report-doc__table-wrap { overflow-x: auto; margin: 0.5rem 0; }
    .report-doc__note {
      margin-top: 0.65rem;
      padding: 0.55rem 0.7rem;
      font-size: 0.78rem;
      line-height: 1.55;
      color: #374151;
      background: #fff;
      border: 1px solid var(--ink);
    }
    .report-doc__rec-list {
      margin: 0;
      padding-left: 1.35rem;
      font-size: 0.8rem;
      line-height: 1.7;
      color: #374151;
      li { margin-bottom: 0.45rem; }
    }
    .report-doc__appendix {
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      h4 { margin: 0 0 0.4rem; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
      ul { margin: 0; padding-left: 1.1rem; font-size: 0.72rem; color: var(--muted); line-height: 1.6; }
    }
    .report-doc__actions {
      flex-shrink: 0;
      border-top: 1px solid var(--line);
      padding-top: 0.5rem;
      background: #fff;
    }
    @media (max-width: 720px) {
      .report-doc__meta-table { font-size: 0.68rem; }
      .report-doc__letterhead-row { flex-direction: column; }
      .report-doc__ref { text-align: left; }
    }
  `,
})
export class ReportDocumentDialogComponent {
  readonly data = inject<ReportDocumentDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)
  readonly exporting = signal(false)

  doc = (): ReportDocument => buildReportDocument(this.data.row)

  sectionTitle = (title: string): string => title.replace(/^\d+\.\s*/, '')

  statusLabel = (s: string): string => {
    if (s === 'success') return 'Completado'
    if (s === 'running') return 'En generación'
    return 'Detenido'
  }

  handleCopy = (): void => {
    const text = reportDocumentText(this.doc())
    void navigator.clipboard.writeText(text).then(
      () => this.toast.success('Informe copiado al portapapeles'),
      () => this.toast.info('Copia en demo'),
    )
  }

  handleExportTxt = (): void => {
    downloadReportTxt(this.doc())
    this.toast.success(`Descargado · ${this.doc().cloudLabel} (.txt)`)
  }

  handleExportPdf = (): void => {
    if (this.exporting()) return
    this.exporting.set(true)
    void downloadReportPdf(this.doc())
      .then(() => this.toast.success(`PDF descargado · ${this.doc().cloudLabel}`))
      .catch(() => this.toast.error('No se pudo generar el PDF'))
      .finally(() => this.exporting.set(false))
  }
}
