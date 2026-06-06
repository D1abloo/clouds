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
import { securitySeverityLabel } from './security.config'
import {
  defaultComplianceReports,
  defaultFrameworks,
  defaultRules,
  defaultViolations,
  type ComplianceViolation,
} from './compliance.demo'
import { ComplianceViolationDetailDialogComponent } from './compliance-violation-detail-dialog.component'

type CompTab = 'violations' | 'rules' | 'frameworks' | 'reports'

@Component({
  selector: 'app-compliance-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, MatButtonModule, MatIconModule, MatMenuModule, MatDialogModule, StatusBadgeComponent],
  template: `
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

      <section class="comp-kpis">
        @for (kpi of kpis; track kpi.label) {
          <article class="comp-kpi" [attr.data-tone]="kpi.tone"><mat-icon>{{ kpi.icon }}</mat-icon><div><span>{{ kpi.label }}</span><strong>{{ kpi.value }}</strong></div></article>
        }
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
            <table class="comp-table" aria-label="Violaciones">
              <thead><tr><th>Regla</th><th>Recurso</th><th>Framework</th><th>Severidad</th><th>Recomendación</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                @for (row of filteredViolations(); track row.id) {
                  <tr (click)="openViolationDetail(row)" tabindex="0" role="button">
                    <td>{{ row.rule }}</td><td class="mono">{{ row.resource }}</td><td>{{ row.framework }}</td>
                    <td><span class="comp-sev" [attr.data-sev]="row.severity">{{ severityLabel(row.severity) }}</span></td>
                    <td>{{ row.recommendation }}</td><td><app-status-badge [value]="row.status" /></td>
                    <td class="comp-table__actions" (click)="$event.stopPropagation()">
                      <button type="button" class="comp-icon-btn" [matMenuTriggerFor]="vioMenu" (click)="activeViolation.set(row)" aria-label="Acciones"><mat-icon>more_vert</mat-icon></button>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="7" class="comp-empty">Sin violaciones.</td></tr> }
              </tbody>
            </table>
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
            <table class="comp-table" aria-label="Informes">
              <thead><tr><th>Informe</th><th>Framework</th><th>Periodo</th><th>Estado</th><th>Generado</th><th></th></tr></thead>
              <tbody>
                @for (row of reports(); track row.id) {
                  <tr>
                    <td>{{ row.name }}</td><td>{{ row.framework }}</td><td>{{ row.period }}</td>
                    <td><app-status-badge [value]="row.status" /></td><td>{{ row.generatedAt | date: 'dd MMM yyyy' }}</td>
                    <td><button type="button" class="comp-btn comp-btn--sm" (click)="handleDownloadReport(row.name)">Descargar</button></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        }
      </div>

      <mat-menu #vioMenu="matMenu">
        <button mat-menu-item type="button" (click)="openViolationDetail(activeViolation()!)"><mat-icon>visibility</mat-icon> Ver detalle</button>
        <button mat-menu-item type="button" (click)="handleRemediateOne(activeViolation()!)"><mat-icon>healing</mat-icon> Remediar</button>
      </mat-menu>
    </div>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .comp-page { display: flex; flex-direction: column; gap: 0.65rem; overflow-y: auto; scrollbar-width: thin; color: #0f172a; font-size: 0.8125rem; }
    .comp-intro { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem; }
    .comp-intro__eyebrow { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: #db2777; }
    .comp-intro__title { margin: 0.2rem 0; font-size: 1.05rem; font-weight: 700; }
    .comp-intro__desc { margin: 0; max-width: 40rem; font-size: 0.72rem; color: #64748b; line-height: 1.55; }
    .comp-intro__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .comp-btn { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.38rem 0.7rem; border-radius: 9px; border: 1px solid #e2e8f0; background: #fff; font: inherit; font-size: 0.7rem; font-weight: 600; cursor: pointer; }
    .comp-btn--primary { background: #ec4899; border-color: #db2777; color: #fff; }
    .comp-btn--sm { padding: 0.25rem 0.5rem; font-size: 0.64rem; }
    .comp-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.5rem; }
    .comp-kpi { display: flex; gap: 0.45rem; padding: 0.55rem 0.65rem; border-radius: 11px; background: #fdf2f8; border: 1px solid #fbcfe8; }
    .comp-kpi mat-icon { color: #db2777; }
    .comp-kpi span { display: block; font-size: 0.55rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
    .comp-kpi strong { font-size: 1rem; font-weight: 700; }
    .comp-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .comp-tabs { display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.2rem; border-radius: 10px; background: #fdf2f8; }
    .comp-tabs__tab { display: inline-flex; align-items: center; gap: 0.28rem; padding: 0.35rem 0.6rem; border: none; border-radius: 8px; background: transparent; font: inherit; font-size: 0.68rem; font-weight: 600; color: #9d174d; cursor: pointer; }
    .comp-tabs__tab--on { background: #fff; color: #831843; }
    .comp-search { display: flex; align-items: center; gap: 0.35rem; flex: 1; max-width: 16rem; padding: 0.35rem 0.55rem; border-radius: 9px; border: 1px solid #fbcfe8; margin-left: auto; }
    .comp-search input { flex: 1; border: none; background: transparent; font: inherit; font-size: 0.72rem; outline: none; }
    .comp-filter { padding: 0.35rem 0.5rem; border-radius: 9px; border: 1px solid #fbcfe8; font: inherit; font-size: 0.68rem; }
    .comp-content { border-radius: 11px; border: 1px solid #e2e8f0; background: #fff; overflow: auto; }
    .comp-table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
    .comp-table th { text-align: left; padding: 0.5rem 0.65rem; font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; background: #f8fafc; }
    .comp-table td { padding: 0.5rem 0.65rem; border-bottom: 1px solid #f1f5f9; }
    .comp-table tr:hover td { background: #fdf2f8; cursor: pointer; }
    .comp-sev { display: inline-block; padding: 0.12rem 0.4rem; border-radius: 999px; font-size: 0.6rem; font-weight: 700;
      &[data-sev='critical'] { background: #fee2e2; color: #b91c1c; }
      &[data-sev='warning'] { background: #fef3c7; color: #b45309; }
    }
    .comp-empty { text-align: center; color: #94a3b8; padding: 1.5rem !important; }
    .comp-icon-btn { border: none; background: transparent; cursor: pointer; }
    .comp-rules, .comp-frameworks { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.5rem; padding: 0.65rem; }
    .comp-rule, .comp-fw { padding: 0.65rem; border-radius: 10px; border: 1px solid #fbcfe8; background: #fdf2f8; }
    .comp-rule header, .comp-fw header { display: flex; justify-content: space-between; align-items: center; }
    .comp-rule h3, .comp-fw h3 { margin: 0; font-size: 0.78rem; }
    .comp-rule p { margin: 0.35rem 0; font-size: 0.68rem; color: #64748b; }
    .comp-rule dl, .comp-fw dl { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 0.35rem 0 0; font-size: 0.68rem; dt { color: #94a3b8; } dd { margin: 0; font-weight: 600; } }
    .comp-fw__score { font-size: 1.1rem; color: #db2777; }
    .comp-fw__bar { height: 6px; border-radius: 999px; background: #fce7f3; margin: 0.4rem 0; span { display: block; height: 100%; border-radius: inherit; background: #ec4899; } }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
    @media (max-width: 900px) { .comp-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
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

  readonly kpis = [
    { label: 'Violaciones', value: 14, icon: 'gpp_bad', tone: 'warn' },
    { label: 'Críticas', value: 3, icon: 'priority_high', tone: 'warn' },
    { label: 'Reglas activas', value: 12, icon: 'rule', tone: 'cyan' },
    { label: 'Puntuación', value: '87%', icon: 'verified', tone: 'success' },
  ]

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
    const ref = this.dialog.open(ComplianceViolationDetailDialogComponent, { width: 'min(540px, 94vw)', data: { violation: row } })
    ref.afterClosed().subscribe((result) => {
      if (result?.remediated) {
        this.violations.update((rows) => rows.map((v) => (v.id === result.id ? { ...v, status: 'running' } : v)))
      }
    })
  }

  handleRemediateOne = (row: ComplianceViolation): void => {
    this.violations.update((rows) => rows.map((v) => (v.id === row.id ? { ...v, status: 'running' } : v)))
    this.toast.success(`Remediación: ${row.resource}`)
  }

  handleDownloadReport = (name: string): void => this.toast.success(`Descargando: ${name}`)
}
