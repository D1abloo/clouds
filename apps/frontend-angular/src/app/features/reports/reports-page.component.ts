import { DatePipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { toSignal } from '@angular/core/rxjs-interop'
import { debounceTime, startWith } from 'rxjs'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { REPORTS_CONFIG } from '../../shared/platform/platform-modules.data'
import { REPORT_CLOUD_META, type ReportCloudProvider } from '../../shared/platform/report-cloud.util'
import { REPORT_TYPE_ICONS, REPORT_TYPE_LABELS } from './reports.config'
import { ProConfigGateComponent } from '../../shared/components/pro-config-gate/pro-config-gate.component'

type ReportsView = 'reports' | 'templates'

type ReportRow = Record<string, unknown> & {
  id: string
  name: string
  type: string
  cloud: ReportCloudProvider
  period: string
  status: string
  generatedAt: string
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [
    ProConfigGateComponent,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    StatusBadgeComponent,
    BrandLogoComponent,
    NavIconComponent,
  ],
  template: `
    <app-pro-config-gate module="Informes">
    <div class="page-container rpt-page animate-fade-in">
      <section class="rpt-intro">
        <div class="rpt-intro__main">
          <span class="rpt-intro__eyebrow">Observabilidad · FinOps</span>
          <h2 class="rpt-intro__title">{{ config.title }}</h2>
          <p class="rpt-intro__desc">{{ config.description }}</p>
        </div>
        <div class="rpt-intro__actions">
          <button type="button" class="rpt-btn rpt-btn--primary" (click)="handleGenerate()">
            <mat-icon>add</mat-icon>
            Generar informe
          </button>
          <button type="button" class="rpt-btn" (click)="handleSchedule()">
            <mat-icon>event</mat-icon>
            Programar
          </button>
          <button type="button" class="rpt-btn" (click)="handleBulkPdf()">
            <mat-icon>download</mat-icon>
            Descargar PDF
          </button>
        </div>
      </section>

      <section class="rpt-clouds" aria-label="Proveedores cloud">
        @for (cloud of cloudProviders; track cloud.cloudId) {
          <button
            type="button"
            class="rpt-cloud-chip"
            [class.rpt-cloud-chip--on]="cloudFilter() === cloud.cloudId"
            [style.--cloud-accent]="cloud.accent"
            (click)="toggleCloudFilter(cloud.cloudId)"
          >
            <app-nav-icon [logo]="cloud.logo" size="sm" />
            {{ cloud.shortLabel }}
          </button>
        }
        @if (cloudFilter()) {
          <button type="button" class="rpt-cloud-clear" (click)="cloudFilter.set(null)">
            Ver todos
          </button>
        }
      </section>

      <div class="rpt-bar">
        <nav class="rpt-tabs" role="tablist" aria-label="Vistas de informes">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              class="rpt-tabs__tab"
              [class.rpt-tabs__tab--on]="view() === tab.id"
              [attr.aria-selected]="view() === tab.id"
              (click)="view.set(tab.id)"
            >
              <mat-icon>{{ tab.icon }}</mat-icon>
              {{ tab.label }}
              @if (tab.id === 'reports') {
                <span class="rpt-tabs__badge">{{ reportRows.length }}</span>
              }
            </button>
          }
        </nav>

        @if (view() === 'reports') {
          <label class="rpt-search">
            <mat-icon>search</mat-icon>
            <input
              type="search"
              [formControl]="searchControl"
              placeholder="Título o tipo de informe…"
              aria-label="Buscar informes"
            />
          </label>
          <label class="rpt-filter">
            <span>Tipo</span>
            <select [formControl]="typeFilterControl" aria-label="Filtrar por tipo">
              <option value="">Todos</option>
              @for (t of typeOptions; track t.id) {
                <option [value]="t.id">{{ t.label }}</option>
              }
            </select>
          </label>
        }
      </div>

      @if (view() === 'reports') {
        <div class="rpt-grid">
          @for (row of filteredReports(); track row.id) {
            <article class="rpt-card" [attr.data-cloud]="row.cloud">
              <header class="rpt-card__head">
                <app-brand-logo class="rpt-card__logo" [logo]="row.cloud" size="xl" />
                <div class="rpt-card__titles">
                  <span class="rpt-card__type">
                    <mat-icon>{{ typeIcon(row.type) }}</mat-icon>
                    {{ typeLabel(row.type) }}
                  </span>
                  <h3>{{ row.name }}</h3>
                </div>
              </header>

              <dl class="rpt-card__meta">
                <div><dt>Periodo</dt><dd>{{ row.period }}</dd></div>
                <div><dt>Generado</dt><dd>{{ row.generatedAt | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
                <div><dt>Estado</dt><dd><app-status-badge [value]="row.status" /></dd></div>
                <div><dt>Ref.</dt><dd class="mono">{{ row.id }}</dd></div>
              </dl>

              <footer class="rpt-card__foot">
                <button type="button" class="rpt-btn rpt-btn--primary rpt-btn--sm" (click)="openReport(row)">
                  <mat-icon>article</mat-icon>
                  Leer informe
                </button>
                <button
                  type="button"
                  class="rpt-icon-btn"
                  [matMenuTriggerFor]="reportMenu"
                  aria-label="Acciones del informe"
                  (click)="selectedRow.set(row)"
                >
                  <mat-icon>more_vert</mat-icon>
                </button>
              </footer>
            </article>
          } @empty {
            <p class="rpt-empty">No hay informes que coincidan con los filtros.</p>
          }
        </div>
      }

      @if (view() === 'templates') {
        <div class="rpt-grid rpt-grid--tpl">
          @for (tpl of templateRows; track tpl['id']) {
            <article class="rpt-tpl">
              <header>
                <span class="rpt-tpl__type">
                  <mat-icon>{{ typeIcon(tplType(tpl)) }}</mat-icon>
                  {{ typeLabel(tplType(tpl)) }}
                </span>
                <span class="rpt-tpl__format">{{ tpl['format'] }}</span>
              </header>
              <h3>{{ tpl['name'] }}</h3>
              <p>{{ tpl['sections'] }}</p>
              <button type="button" class="rpt-btn rpt-btn--sm" (click)="handleGenerateFromTemplate(tpl)">
                <mat-icon>play_arrow</mat-icon>
                Generar desde plantilla
              </button>
            </article>
          }
        </div>
      }

      <mat-menu #reportMenu="matMenu">
        <button mat-menu-item type="button" (click)="openReport(selectedRow()!)">
          <mat-icon>visibility</mat-icon>
          Ver documento
        </button>
        <button mat-menu-item type="button" (click)="downloadReport(selectedRow()!)">
          <mat-icon>picture_as_pdf</mat-icon>
          Descargar PDF
        </button>
        <button mat-menu-item type="button" (click)="handleScheduleRow(selectedRow()!)">
          <mat-icon>event</mat-icon>
          Programar
        </button>
      </mat-menu>
    </div>
    </app-pro-config-gate>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .rpt-page {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      color: #0f172a;
      font-size: 0.8125rem;
    }
    .rpt-intro {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .rpt-intro__eyebrow {
      display: block;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
      margin-bottom: 0.2rem;
    }
    .rpt-intro__title {
      margin: 0 0 0.35rem;
      font-size: 1.05rem;
      font-weight: 700;
    }
    .rpt-intro__desc {
      margin: 0;
      max-width: 40rem;
      font-size: 0.72rem;
      color: #64748b;
      line-height: 1.55;
    }
    .rpt-intro__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      align-items: flex-start;
      height: fit-content;
      padding: 0;
      flex-shrink: 0;
    }
    .rpt-clouds {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
    }
    .rpt-cloud-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.65rem;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      background: #fff;
      font: inherit;
      font-size: 0.68rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .rpt-cloud-chip:hover { border-color: #cbd5e1; background: #f8fafc; }
    .rpt-cloud-chip--on {
      border-color: var(--cloud-accent, #334155);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--cloud-accent, #334155) 35%, transparent);
      background: color-mix(in srgb, var(--cloud-accent, #334155) 6%, #fff);
    }
    .rpt-cloud-clear {
      border: none;
      background: transparent;
      font: inherit;
      font-size: 0.62rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      text-decoration: underline;
    }
    .rpt-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }
    .rpt-tabs {
      display: flex;
      gap: 0.2rem;
      padding: 0.2rem;
      border-radius: 10px;
      background: #f8fafc;
    }
    .rpt-tabs__tab {
      display: inline-flex;
      align-items: center;
      gap: 0.32rem;
      padding: 0.38rem 0.65rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
    }
    .rpt-tabs__tab mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    .rpt-tabs__tab--on { color: #0f172a; background: #fff; box-shadow: 0 1px 2px rgb(15 23 42 / 0.06); }
    .rpt-tabs__badge {
      padding: 0.05rem 0.35rem;
      border-radius: 999px;
      background: #e0e7ff;
      color: #4338ca;
      font-size: 0.58rem;
      font-weight: 700;
    }
    .rpt-search {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex: 1;
      min-width: 10rem;
      max-width: 18rem;
      padding: 0.35rem 0.55rem;
      border-radius: 9px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      margin-left: auto;
    }
    .rpt-search mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: #94a3b8; }
    .rpt-search input {
      flex: 1;
      border: none;
      background: transparent;
      font: inherit;
      font-size: 0.72rem;
      outline: none;
    }
    .rpt-filter {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.62rem;
      font-weight: 650;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .rpt-filter select {
      padding: 0.35rem 0.5rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #fff;
      font: inherit;
      font-size: 0.68rem;
      color: #334155;
    }
    .rpt-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.65rem;
      align-content: start;
    }
    .rpt-grid--tpl { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
    .rpt-card {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      padding: 0.85rem 0.9rem;
      border-radius: 12px;
      background: #fff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .rpt-card:hover {
      border-color: #cbd5e1;
      box-shadow: 0 4px 14px rgb(15 23 42 / 0.06);
    }
    .rpt-card__head {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
    }
    .rpt-card__logo {
      flex-shrink: 0;
      display: block;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      outline: none !important;
      padding: 0 !important;
      width: auto !important;
      height: auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
    }
    :host ::ng-deep .rpt-card__logo .brand-logo {
      display: block;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      outline: none !important;
    }
    .rpt-card__titles { min-width: 0; }
    .rpt-card__type {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      margin-bottom: 0.2rem;
    }
    .rpt-card__type mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    .rpt-card__titles h3 {
      margin: 0;
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1.35;
      color: #0f172a;
    }
    .rpt-card__meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem 0.5rem;
      margin: 0;
    }
    .rpt-card__meta dt {
      font-size: 0.52rem;
      font-weight: 650;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .rpt-card__meta dd { margin: 0.05rem 0 0; font-size: 0.65rem; color: #334155; }
    .rpt-card__foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.35rem;
      margin-top: auto;
      padding-top: 0.35rem;
      border-top: 1px solid #f1f5f9;
    }
    .rpt-tpl {
      padding: 0.85rem 0.9rem;
      border-radius: 12px;
      background: #fff;
      border: 1px solid #e2e8f0;
    }
    .rpt-tpl header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.35rem;
    }
    .rpt-tpl__type {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .rpt-tpl__type mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    .rpt-tpl__format {
      font-size: 0.58rem;
      font-weight: 600;
      color: #94a3b8;
    }
    .rpt-tpl h3 { margin: 0 0 0.35rem; font-size: 0.82rem; font-weight: 700; }
    .rpt-tpl p { margin: 0 0 0.55rem; font-size: 0.68rem; color: #64748b; line-height: 1.45; }
    .rpt-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      width: fit-content;
      height: fit-content;
      min-height: unset;
      margin: 0;
      padding: 0.42rem 0.55rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #fff;
      font: inherit;
      font-size: 0.76rem;
      font-weight: 600;
      line-height: 1.25;
      box-sizing: border-box;
      color: #475569;
      cursor: pointer;
    }
    .rpt-btn mat-icon { display: block; margin: 0; font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    .rpt-btn--primary { background: #1e293b; border-color: #0f172a; color: #fff; }
    .rpt-btn--sm { padding: 0.32rem 0.45rem; font-size: 0.72rem; }
    .rpt-icon-btn {
      display: inline-flex;
      padding: 0.2rem;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      color: #64748b;
    }
    .rpt-icon-btn mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .rpt-empty {
      grid-column: 1 / -1;
      padding: 2rem;
      text-align: center;
      color: #94a3b8;
      font-size: 0.75rem;
    }
    .mono { font-family: var(--app-font-mono, ui-monospace, monospace); }
  `,
})
export class ReportsPageComponent {
  private readonly actions = inject(PlatformActionService)

  readonly config = REPORTS_CONFIG
  readonly view = signal<ReportsView>('reports')
  readonly cloudFilter = signal<ReportCloudProvider | null>(null)
  readonly selectedRow = signal<ReportRow | null>(null)

  readonly tabs = [
    { id: 'reports' as const, label: 'Informes', icon: 'summarize' },
    { id: 'templates' as const, label: 'Plantillas', icon: 'content_copy' },
  ]

  readonly cloudProviders = (['aws', 'gcp', 'azure'] as ReportCloudProvider[]).map((cloudId) => ({
    ...REPORT_CLOUD_META[cloudId],
    cloudId,
  }))

  readonly typeOptions = Object.entries(REPORT_TYPE_LABELS).map(([id, label]) => ({ id, label }))

  readonly reportRows = (this.config.tabs[0]?.rows ?? []) as ReportRow[]
  readonly templateRows = this.config.tabs[1]?.rows ?? []

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly typeFilterControl = new FormControl('', { nonNullable: true })

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )

  private readonly typeFilter = toSignal(
    this.typeFilterControl.valueChanges.pipe(startWith('')),
    { initialValue: '' },
  )

  readonly filteredReports = computed(() => {
    const q = this.searchTerm().trim().toLowerCase()
    const type = this.typeFilter()
    const cloud = this.cloudFilter()

    return this.reportRows.filter((row) => {
      if (cloud && row.cloud !== cloud) return false
      if (type && row.type !== type) return false
      if (!q) return true
      const haystack = [row.name, row.type, row.period, row.id].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  })

  typeLabel = (type: string): string => REPORT_TYPE_LABELS[type] ?? type
  typeIcon = (type: string): string => REPORT_TYPE_ICONS[type] ?? 'description'
  tplType = (tpl: Record<string, unknown>): string => String(tpl['type'] ?? '')

  toggleCloudFilter = (cloud: ReportCloudProvider): void => {
    this.cloudFilter.update((current) => (current === cloud ? null : cloud))
  }

  openReport = (row: ReportRow): void => {
    this.actions.openReportDocument(row, 'view')
  }

  downloadReport = (row: ReportRow): void => {
    this.actions.openReportDocument(row, 'download')
  }

  handleGenerate = (): void => {
    this.actions.runModuleAction('reports', 'Generar informe', 'Informes')
  }

  handleSchedule = (): void => {
    this.actions.openReportSchedule({
      type: 'cost',
      name: 'Resumen ejecutivo de costes',
      cloud: 'aws',
      id: 'rpt-sched-new',
    })
  }

  handleBulkPdf = (): void => {
    this.actions.runModuleAction('reports', 'Descargar PDF', 'Informes')
  }

  handleScheduleRow = (row: ReportRow): void => {
    this.actions.openReportSchedule(row)
  }

  handleGenerateFromTemplate = (tpl: Record<string, unknown>): void => {
    this.actions.openReportDocument(
      { ...tpl, status: 'success', period: 'Junio 2026', generatedAt: new Date().toISOString() },
      'generate',
    )
  }
}
