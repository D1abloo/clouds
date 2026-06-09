import { DatePipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import { securitySeverityLabel, SECURITY_ACCENT, SECURITY_ACCENT_BORDER, SECURITY_ACCENT_LIGHT, SECURITY_ACTION_BTN, SECURITY_ACTION_BTN_ICON, SECURITY_ACTION_BTN_PRIMARY, SECURITY_ACTION_BTN_SM } from './security.config'
import {
  defaultComplianceReports,
  defaultFrameworks,
  defaultRules,
  defaultViolations,
  type ComplianceReport,
  type ComplianceViolation,
} from './compliance.data'
import { ComplianceViolationDetailDialogComponent } from './compliance-violation-detail-dialog.component'
import { ComplianceReportDialogComponent } from './compliance-report-dialog.component'
import { ProConfigGateComponent } from '../../shared/components/pro-config-gate/pro-config-gate.component'

type CompTab = 'violations' | 'rules' | 'frameworks' | 'reports'

@Component({
  selector: 'app-compliance-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, MatButtonModule, MatIconModule, MatMenuModule, MatDialogModule, StatusBadgeComponent, ProConfigGateComponent],
  template: `
    <app-pro-config-gate module="Cumplimiento / Políticas">
    <div class="page-container comp-page animate-fade-in">
      <section class="comp-intro">
        <div class="comp-intro__main">
          <span class="comp-intro__eyebrow">Seguridad · Cumplimiento</span>
          <h2 class="comp-intro__title">Cumplimiento / Políticas</h2>
          <p class="comp-intro__desc">
            Monitoriza violaciones de políticas, reglas activas y marcos SOC2, GDPR e ISO 27001.
            Ejecuta escaneos, remedia hallazgos y genera informes de cumplimiento.
          </p>
        </div>
        <div class="comp-intro__actions">
          <button type="button" class="comp-btn comp-btn--primary" (click)="handleScan()"><mat-icon>radar</mat-icon> Ejecutar escaneo</button>
          <button type="button" class="comp-btn" (click)="handleRemediateAll()"><mat-icon>healing</mat-icon> Remediar todo</button>
          <button type="button" class="comp-btn" (click)="handleExport()"><mat-icon>download</mat-icon> Exportar</button>
        </div>
      </section>

      <div class="comp-bar">
        <nav class="comp-tabs" role="tablist">
          @for (tab of tabs; track tab.id) {
            <button type="button" role="tab" class="comp-tabs__tab" [class.comp-tabs__tab--on]="view() === tab.id" (click)="view.set(tab.id)">
              <mat-icon>{{ tab.icon }}</mat-icon>{{ tab.label }}
            </button>
          }
        </nav>
        @if (view() === 'violations') {
          <label class="comp-search"><mat-icon>search</mat-icon><input type="search" [formControl]="searchControl" placeholder="Regla o recurso…" aria-label="Buscar" /></label>
          <select class="comp-filter" [formControl]="severityControl" aria-label="Severidad">
            <option value="">Todas</option><option value="critical">Crítico</option><option value="warning">Advertencia</option>
          </select>
        }
      </div>

      <div class="comp-content">
        @switch (view()) {
          @case ('violations') {
            <ul class="comp-violations">
              @for (row of filteredViolations(); track row.id) {
                <li>
                  <button type="button" class="comp-vio" (click)="openViolationDetail(row)">
                    <span class="comp-vio__fw">{{ row.framework }}</span>
                    <div class="comp-vio__main">
                      <strong>{{ row.rule }}</strong>
                      <span class="mono">{{ row.resource }}</span>
                      <p>{{ row.description }}</p>
                    </div>
                    <div class="comp-vio__side">
                      <span class="comp-sev" [attr.data-sev]="row.severity">{{ severityLabel(row.severity) }}</span>
                      <app-status-badge [value]="row.status" />
                      <time>{{ row.detectedAt | date: 'dd MMM HH:mm' }}</time>
                    </div>
                  </button>
                  <button type="button" class="comp-icon-btn" [matMenuTriggerFor]="vioMenu" (click)="activeViolation.set(row)" aria-label="Acciones">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                </li>
              } @empty { <li class="comp-empty">Sin violaciones.</li> }
            </ul>
          }
          @case ('rules') {
            <div class="comp-rules">
              @for (rule of rules(); track rule.id) {
                <article class="comp-rule">
                  <header><h3>{{ rule.name }}</h3><app-status-badge [value]="rule.status" /></header>
                  <p>{{ rule.description }}</p>
                  <dl><div><dt>Ámbito</dt><dd>{{ rule.scope }}</dd></div><div><dt>Violaciones</dt><dd>{{ rule.violations }}</dd></div></dl>
                </article>
              }
            </div>
          }
          @case ('frameworks') {
            <div class="comp-frameworks">
              @for (fw of frameworks(); track fw.id) {
                <article class="comp-fw">
                  <header><h3>{{ fw.name }}</h3><strong class="comp-fw__score">{{ fw.score }}%</strong></header>
                  <div class="comp-fw__bar" aria-hidden="true"><span [style.width.%]="fw.score"></span></div>
                  <dl>
                    <div><dt>Controles</dt><dd>{{ fw.controls }}</dd></div>
                    <div><dt>Aprobados</dt><dd>{{ fw.passed }}</dd></div>
                    <div><dt>Fallidos</dt><dd>{{ fw.failed }}</dd></div>
                    <div><dt>Última auditoría</dt><dd>{{ fw.lastAudit | date: 'dd MMM yyyy' }}</dd></div>
                  </dl>
                </article>
              }
            </div>
          }
          @case ('reports') {
            <div class="comp-reports">
              @for (row of reports(); track row.id) {
                <article class="comp-report-card">
                  <header>
                    <span class="comp-report-card__fw">{{ row.framework }}</span>
                    <app-status-badge [value]="row.status" />
                  </header>
                  <h3>{{ row.name }}</h3>
                  <p>{{ row.executiveSummary }}</p>
                  <dl>
                    <div><dt>Periodo</dt><dd>{{ row.period }}</dd></div>
                    <div><dt>Puntuación</dt><dd>{{ row.score }}%</dd></div>
                    <div><dt>Violaciones</dt><dd>{{ row.violationsCount }}</dd></div>
                    <div><dt>Generado</dt><dd>{{ row.generatedAt | date: 'dd MMM yyyy' }}</dd></div>
                  </dl>
                  <div class="comp-report-card__actions">
                    <button type="button" class="comp-btn comp-btn--primary comp-btn--sm" (click)="openReportDetail(row)">
                      <mat-icon>visibility</mat-icon> Ver informe
                    </button>
                    <button type="button" class="comp-btn comp-btn--sm" (click)="openReportDetail(row)">
                      <mat-icon>download</mat-icon> Descargar
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        }
      </div>

      <mat-menu #vioMenu="matMenu">
        <button mat-menu-item type="button" (click)="openViolationDetail(activeViolation()!)"><mat-icon>visibility</mat-icon> Ver detalle</button>
        <button mat-menu-item type="button" (click)="handleRemediateOne(activeViolation()!)"><mat-icon>healing</mat-icon> Remediar</button>
      </mat-menu>
    </div>
    </app-pro-config-gate>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .comp-page { display: flex; flex-direction: column; gap: 0.65rem; overflow-y: auto; scrollbar-width: thin; color: #0f172a; font-size: 0.8125rem; }
    .comp-intro { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem; }
    .comp-intro__eyebrow { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: ${SECURITY_ACCENT}; }
    .comp-intro__title { margin: 0.2rem 0; font-size: 1.05rem; font-weight: 700; }
    .comp-intro__desc { margin: 0; max-width: 40rem; font-size: 0.72rem; color: #64748b; line-height: 1.55; }
    .comp-intro__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: flex-start; height: fit-content; padding: 0; }
    .comp-btn { ${SECURITY_ACTION_BTN} }
    .comp-btn mat-icon { ${SECURITY_ACTION_BTN_ICON} }
    .comp-btn--primary { ${SECURITY_ACTION_BTN_PRIMARY} }
    .comp-btn--sm { ${SECURITY_ACTION_BTN_SM} }
    .comp-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .comp-tabs { display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.2rem; border-radius: 10px; background: ${SECURITY_ACCENT_LIGHT}; }
    .comp-tabs__tab { display: inline-flex; align-items: center; gap: 0.28rem; padding: 0.35rem 0.6rem; border: none; border-radius: 8px; background: transparent; font: inherit; font-size: 0.68rem; font-weight: 600; color: #4338ca; cursor: pointer; }
    .comp-tabs__tab--on { background: #fff; color: ${SECURITY_ACCENT}; }
    .comp-search { display: flex; align-items: center; gap: 0.35rem; flex: 1; max-width: 16rem; padding: 0.35rem 0.55rem; border-radius: 9px; border: 1px solid ${SECURITY_ACCENT_BORDER}; margin-left: auto; }
    .comp-search input { flex: 1; border: none; background: transparent; font: inherit; font-size: 0.72rem; outline: none; }
    .comp-filter { padding: 0.35rem 0.5rem; border-radius: 9px; border: 1px solid ${SECURITY_ACCENT_BORDER}; font: inherit; font-size: 0.68rem; }
    .comp-content { border-radius: 11px; border: 1px solid #e2e8f0; background: #fff; overflow: auto; }
    .comp-table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
    .comp-table th { text-align: left; padding: 0.5rem 0.65rem; font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; background: #f8fafc; }
    .comp-table td { padding: 0.5rem 0.65rem; border-bottom: 1px solid #f1f5f9; }
    .comp-table tr:hover td { background: ${SECURITY_ACCENT_LIGHT}; cursor: pointer; }
    .comp-sev { display: inline-block; padding: 0.12rem 0.4rem; border-radius: 999px; font-size: 0.6rem; font-weight: 700;
      &[data-sev='critical'] { background: #fee2e2; color: #b91c1c; }
      &[data-sev='warning'] { background: #fef3c7; color: #b45309; }
    }
    .comp-empty { text-align: center; color: #94a3b8; padding: 1.5rem !important; }
    .comp-icon-btn { border: none; background: transparent; cursor: pointer; }
    .comp-rules, .comp-frameworks { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.5rem; padding: 0.65rem; }
    .comp-rule, .comp-fw { padding: 0.65rem; border-radius: 10px; border: 1px solid ${SECURITY_ACCENT_BORDER}; background: ${SECURITY_ACCENT_LIGHT}; }
    .comp-rule header, .comp-fw header { display: flex; justify-content: space-between; align-items: center; }
    .comp-rule h3, .comp-fw h3 { margin: 0; font-size: 0.78rem; }
    .comp-rule p { margin: 0.35rem 0; font-size: 0.68rem; color: #64748b; }
    .comp-rule dl, .comp-fw dl { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 0.35rem 0 0; font-size: 0.68rem; dt { color: #94a3b8; } dd { margin: 0; font-weight: 600; } }
    .comp-fw__score { font-size: 1.1rem; color: ${SECURITY_ACCENT}; }
    .comp-fw__bar { height: 6px; border-radius: 999px; background: #e0e7ff; margin: 0.4rem 0; span { display: block; height: 100%; border-radius: inherit; background: ${SECURITY_ACCENT}; } }
    .comp-violations { list-style: none; margin: 0; padding: 0.65rem; display: flex; flex-direction: column; gap: 0.4rem; }
    .comp-violations > li { display: grid; grid-template-columns: 1fr auto; gap: 0.25rem; align-items: start; }
    .comp-vio {
      display: grid; grid-template-columns: auto 1fr auto; gap: 0.65rem; align-items: start; width: 100%;
      padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff;
      text-align: left; font: inherit; cursor: pointer; transition: border-color 0.15s, background 0.15s;
      &:hover { border-color: ${SECURITY_ACCENT_BORDER}; background: ${SECURITY_ACCENT_LIGHT}; }
    }
    .comp-vio__fw { padding: 0.2rem 0.45rem; border-radius: 999px; background: ${SECURITY_ACCENT}; color: #fff; font-size: 0.58rem; font-weight: 700; flex-shrink: 0; margin-top: 0.1rem; }
    .comp-vio__main strong { display: block; font-size: 0.78rem; }
    .comp-vio__main span { display: block; font-size: 0.62rem; color: #64748b; margin-top: 0.08rem; }
    .comp-vio__main p { margin: 0.25rem 0 0; font-size: 0.66rem; color: #475569; line-height: 1.45; }
    .comp-vio__side { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; time { font-size: 0.58rem; color: #94a3b8; } }
    .comp-reports { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.55rem; padding: 0.65rem; }
    .comp-report-card {
      padding: 0.75rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff;
      header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; }
      h3 { margin: 0 0 0.35rem; font-size: 0.82rem; }
      p { margin: 0 0 0.5rem; font-size: 0.68rem; color: #64748b; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      dl { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem; margin: 0 0 0.55rem; font-size: 0.65rem; dt { color: #94a3b8; } dd { margin: 0; font-weight: 600; } }
    }
    .comp-report-card__fw { padding: 0.18rem 0.45rem; border-radius: 999px; background: ${SECURITY_ACCENT_LIGHT}; color: ${SECURITY_ACCENT}; font-size: 0.58rem; font-weight: 700; border: 1px solid ${SECURITY_ACCENT_BORDER}; }
    .comp-report-card__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
  `,
})
export class CompliancePageComponent {
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly view = signal<CompTab>('violations')
  readonly violations = signal(defaultViolations())
  readonly rules = signal(defaultRules())
  readonly frameworks = signal(defaultFrameworks())
  readonly reports = signal(defaultComplianceReports())
  readonly activeViolation = signal<ComplianceViolation | null>(null)

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly severityControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')), { initialValue: '' })
  private readonly severityFilter = toSignal(this.severityControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  readonly tabs = [
    { id: 'violations' as const, label: 'Violaciones', icon: 'gpp_bad' },
    { id: 'rules' as const, label: 'Reglas', icon: 'rule' },
    { id: 'frameworks' as const, label: 'Frameworks', icon: 'fact_check' },
    { id: 'reports' as const, label: 'Informes cumplimiento', icon: 'summarize' },
  ]

  readonly severityLabel = securitySeverityLabel

  filteredViolations = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const sev = this.severityFilter()
    return this.violations().filter((v) => {
      if (sev && v.severity !== sev) return false
      if (!term) return true
      return `${v.rule} ${v.resource}`.toLowerCase().includes(term)
    })
  })

  handleScan = (): void => this.toast.info('Escaneo de cumplimiento iniciado')
  handleRemediateAll = (): void => {
    this.violations.update((rows) => rows.map((v) => (v.severity === 'critical' ? { ...v, status: 'running' } : v)))
    this.toast.success('Remediación masiva programada')
  }
  handleExport = (): void => this.toast.success('Informe de cumplimiento exportado')

  openViolationDetail = (row: ComplianceViolation): void => {
    this.dialog.open(ComplianceViolationDetailDialogComponent, {
      width: 'min(860px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'sec-compliance-violation-dialog-panel',
      data: { violation: row },
    }).afterClosed().subscribe((result) => {
      if (result?.remediated) {
        this.violations.update((rows) => rows.map((v) => (v.id === result.id ? { ...v, status: 'running' } : v)))
      }
    })
  }

  openReportDetail = (row: ComplianceReport): void => {
    this.dialog.open(ComplianceReportDialogComponent, {
      width: 'min(920px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '92vh',
      panelClass: 'sec-compliance-report-dialog-panel',
      data: { report: row, violations: this.violations() },
    })
  }

  handleRemediateOne = (row: ComplianceViolation): void => {
    this.violations.update((rows) => rows.map((v) => (v.id === row.id ? { ...v, status: 'running' } : v)))
    this.toast.success(`Remediación: ${row.resource}`)
  }
}
