import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core'
import { DatePipe, DecimalPipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute } from '@angular/router'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { AuditService } from '../../core/services/audit.service'
import { ToastService } from '../../core/services/toast.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
import { createPageLoader } from '../../core/utils/page-load.util'
import type { AuditLog } from '../../core/models/api.models'
import {
  AUDIT_ACCENT,
  AUDIT_ACCENT_BORDER,
  AUDIT_ACCENT_LIGHT,
  auditSeverityLabel,
  downloadBlob,
} from './audit.config'
import {
  defaultAuditActivities,
  defaultAuditExports,
  defaultComplianceTrail,
  defaultSecurityEvents,
  type AuditActivityEntry,
  type AuditExport,
  type ComplianceTrailEntry,
  type SecurityEvent,
} from './audit.demo'
import { AuditActivityLogComponent } from './audit-activity-log.component'
import { AuditActivityDetailDialogComponent } from './audit-activity-detail-dialog.component'
import { AuditSecurityEventDetailDialogComponent } from './audit-security-event-detail-dialog.component'
import { AuditComplianceTrailDetailDialogComponent } from './audit-compliance-trail-detail-dialog.component'
import { AuditExportDetailDialogComponent } from './audit-export-detail-dialog.component'

type AuditView = 'activity' | 'security' | 'compliance' | 'exports'

const mapAuditLogToEntry = (log: AuditLog): AuditActivityEntry => ({
  id: log.id,
  action: log.action,
  resource: log.resource,
  userId: log.userId,
  ipAddress: log.ipAddress,
  createdAt: log.createdAt,
  category: 'actividad',
  module: log.resource,
  status: 'completed',
  description: `${log.action} · ${log.resource}`,
})

@Component({
  selector: 'app-audit-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    StatusBadgeComponent,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    AuditActivityLogComponent,
  ],
  template: `
    <div class="page-container aud-page animate-fade-in">
      <section class="aud-intro">
        <div class="aud-intro__main">
          <span class="aud-intro__eyebrow">Plataforma · Trazabilidad</span>
          <h2 class="aud-intro__title">Auditoría</h2>
          <p class="aud-intro__desc">
            Registro inmutable de actividad, eventos de seguridad, trail de cumplimiento y exportaciones.
            Cada acción queda correlacionada con usuario, IP, sesión y metadatos para investigación forense.
          </p>
        </div>
        <div class="aud-intro__actions">
          <button type="button" class="page-action-btn page-action-btn--primary" (click)="handleExportCsv()">
            <mat-icon>download</mat-icon> Exportar CSV
          </button>
          <button type="button" class="page-action-btn" (click)="handleRefresh()">
            <mat-icon>refresh</mat-icon> Actualizar
          </button>
        </div>
      </section>

      <div class="aud-bar">
        <nav class="aud-tabs" role="tablist" aria-label="Vistas de auditoría">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              class="aud-tabs__tab"
              [class.aud-tabs__tab--on]="view() === tab.id"
              [attr.aria-selected]="view() === tab.id"
              (click)="view.set(tab.id)"
            >
              <mat-icon>{{ tab.icon }}</mat-icon>
              {{ tab.label }}
              <span class="aud-tabs__count">{{ tabCount(tab.id) }}</span>
            </button>
          }
        </nav>
        @if (view() === 'security') {
          <select class="aud-filter" [formControl]="severityControl" aria-label="Filtrar severidad">
            <option value="">Todas las severidades</option>
            <option value="critical">Crítico</option>
            <option value="warning">Advertencia</option>
            <option value="info">Informativo</option>
          </select>
        }
      </div>

      <div class="aud-content">
        @switch (view()) {
          @case ('activity') {
            <app-audit-activity-log
              [activities]="activities()"
              [loading]="page.loading()"
              [error]="page.error()"
              (detail)="openActivityDetail($event)"
              (refresh)="load()"
              (copyCorrelation)="handleCopyCorrelation($event)"
            />
          }
          @case ('security') {
            <ul class="aud-list">
              @for (ev of filteredSecurity(); track ev.id) {
                <li>
                  <button type="button" class="aud-card aud-card--sev" (click)="openSecurityDetail(ev)">
                    <div class="aud-card__main">
                      <header>
                        <strong>{{ ev.event }}</strong>
                        <span class="aud-sev" [attr.data-sev]="ev.severity">{{ severityLabel(ev.severity) }}</span>
                      </header>
                      <p>{{ ev.description }}</p>
                      <div class="aud-card__meta">
                        <span><mat-icon>source</mat-icon>{{ ev.source }}</span>
                        <span><mat-icon>person</mat-icon>{{ ev.user }}</span>
                        <span class="mono"><mat-icon>link</mat-icon>{{ ev.correlationId }}</span>
                      </div>
                    </div>
                    <div class="aud-card__side">
                      <app-status-badge [value]="ev.status" />
                      <time>{{ ev.at | date: 'dd MMM HH:mm' }}</time>
                      <span class="mono">{{ ev.ip }}</span>
                    </div>
                  </button>
                </li>
              } @empty {
                <li class="aud-empty">Sin eventos de seguridad.</li>
              }
            </ul>
          }
          @case ('compliance') {
            <div class="aud-trail-grid">
              @for (ct of complianceTrail(); track ct.id) {
                <article class="aud-trail-card">
                  <header>
                    <span class="aud-trail-card__fw">{{ ct.framework }}</span>
                    <span class="aud-trail-card__outcome" [attr.data-outcome]="ct.outcome">{{ ct.outcome }}</span>
                  </header>
                  <h3>{{ ct.action }}</h3>
                  <p>{{ ct.description }}</p>
                  <dl>
                    <div><dt>Control</dt><dd class="mono">{{ ct.controlId }}</dd></div>
                    <div><dt>Actor</dt><dd>{{ ct.actor }}</dd></div>
                    <div><dt>Recurso</dt><dd class="mono">{{ ct.resource }}</dd></div>
                    <div><dt>Registrado</dt><dd>{{ ct.at | date: 'dd MMM HH:mm' }}</dd></div>
                  </dl>
                  <button type="button" class="page-action-btn page-action-btn--primary page-action-btn--sm" (click)="openComplianceDetail(ct)">
                    <mat-icon>visibility</mat-icon> Ver evidencia
                  </button>
                </article>
              }
            </div>
          }
          @case ('exports') {
            <div class="aud-export-grid">
              @for (ex of exports(); track ex.id) {
                <article class="aud-export-card">
                  <header>
                    <span class="aud-export-card__fmt">{{ ex.format }}</span>
                    <app-status-badge [value]="ex.status" />
                  </header>
                  <h3>{{ ex.name }}</h3>
                  <dl>
                    <div><dt>Periodo</dt><dd>{{ ex.period }}</dd></div>
                    <div><dt>Registros</dt><dd>{{ ex.records | number }}</dd></div>
                    <div><dt>Solicitante</dt><dd>{{ ex.requestedBy }}</dd></div>
                    <div><dt>Generado</dt><dd>{{ ex.generatedAt | date: 'dd MMM HH:mm' }}</dd></div>
                  </dl>
                  <div class="aud-export-card__actions">
                    <button type="button" class="page-action-btn page-action-btn--primary page-action-btn--sm" (click)="openExportDetail(ex)">
                      <mat-icon>visibility</mat-icon> Ver detalle
                    </button>
                    @if (ex.status === 'success') {
                      <button type="button" class="page-action-btn page-action-btn--sm" (click)="openExportDetail(ex)">
                        <mat-icon>download</mat-icon> Descargar
                      </button>
                    }
                  </div>
                </article>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .aud-page { display: flex; flex-direction: column; gap: 0.65rem; overflow-y: auto; scrollbar-width: thin; color: #0f172a; font-size: 0.8125rem; }
    .aud-intro { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem; }
    .aud-intro__eyebrow { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: ${AUDIT_ACCENT}; }
    .aud-intro__title { margin: 0.2rem 0; font-size: 1.05rem; font-weight: 700; }
    .aud-intro__desc { margin: 0; max-width: 42rem; font-size: 0.72rem; color: #64748b; line-height: 1.55; }
    .aud-intro__actions { display: flex; gap: 0.35rem; flex-shrink: 0; flex-wrap: wrap; align-items: flex-start; height: fit-content; padding: 0; }
    .aud-page .page-action-btn--primary {
      background: ${AUDIT_ACCENT};
      border-color: #0e7490;
      &:hover:not(:disabled) { background: #0e7490; border-color: #0c4a6e; }
    }
    .aud-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .aud-tabs { display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.2rem; border-radius: 10px; background: ${AUDIT_ACCENT_LIGHT}; }
    .aud-tabs__tab { display: inline-flex; align-items: center; gap: 0.28rem; padding: 0.35rem 0.6rem; border: none; border-radius: 8px; background: transparent; font: inherit; font-size: 0.68rem; font-weight: 600; color: #0e7490; cursor: pointer; }
    .aud-tabs__tab--on { background: #fff; color: ${AUDIT_ACCENT}; box-shadow: 0 1px 2px rgb(8 145 178 / 0.08); }
    .aud-tabs__tab mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    .aud-tabs__count { font-size: 0.58rem; font-weight: 700; padding: 0.05rem 0.35rem; border-radius: 999px; background: ${AUDIT_ACCENT_BORDER}; color: ${AUDIT_ACCENT}; }
    .aud-search { display: flex; align-items: center; gap: 0.35rem; flex: 1; max-width: 16rem; padding: 0.35rem 0.55rem; border-radius: 9px; border: 1px solid ${AUDIT_ACCENT_BORDER}; margin-left: auto; }
    .aud-search input { flex: 1; border: none; background: transparent; font: inherit; font-size: 0.72rem; outline: none; }
    .aud-search mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: #94a3b8; }
    .aud-filter { padding: 0.35rem 0.5rem; border-radius: 9px; border: 1px solid ${AUDIT_ACCENT_BORDER}; font: inherit; font-size: 0.68rem; }
    .aud-content { border-radius: 11px; border: 1px solid #e2e8f0; background: #fff; overflow: auto; }
    .aud-list { list-style: none; margin: 0; padding: 0.65rem; display: flex; flex-direction: column; gap: 0.4rem; }
    .aud-card {
      display: grid; grid-template-columns: 1fr auto; gap: 0.65rem; align-items: start; width: 100%;
      padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid ${AUDIT_ACCENT_BORDER}; background: ${AUDIT_ACCENT_LIGHT};
      text-align: left; font: inherit; color: inherit; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
    }
    .aud-card:hover { border-color: ${AUDIT_ACCENT}; box-shadow: 0 2px 8px rgb(8 145 178 / 0.08); }
    .aud-card header { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; margin-bottom: 0.15rem; }
    .aud-card header strong { font-size: 0.82rem; }
    .aud-card__resource { font-size: 0.66rem; color: #64748b; }
    .aud-card p { margin: 0.25rem 0 0.35rem; font-size: 0.68rem; color: #64748b; line-height: 1.45; }
    .aud-card__meta { display: flex; flex-wrap: wrap; gap: 0.5rem 0.75rem; font-size: 0.62rem; color: #94a3b8; }
    .aud-card__meta span { display: inline-flex; align-items: center; gap: 0.2rem; }
    .aud-card__meta mat-icon { font-size: 0.75rem; width: 0.75rem; height: 0.75rem; }
    .aud-card__side { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; font-size: 0.64rem; color: #94a3b8; white-space: nowrap; }
    .aud-sev { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; padding: 0.1rem 0.4rem; border-radius: 999px;
      &[data-sev='critical'] { background: #fee2e2; color: #b91c1c; }
      &[data-sev='warning'] { background: #fef3c7; color: #b45309; }
      &[data-sev='info'] { background: #e0f2fe; color: #0369a1; }
    }
    .aud-trail-grid, .aud-export-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.5rem; padding: 0.65rem; }
    .aud-trail-card, .aud-export-card { padding: 0.75rem; border-radius: 10px; border: 1px solid ${AUDIT_ACCENT_BORDER}; background: ${AUDIT_ACCENT_LIGHT}; display: flex; flex-direction: column; gap: 0.35rem; }
    .aud-trail-card header, .aud-export-card header { display: flex; justify-content: space-between; align-items: center; }
    .aud-trail-card h3, .aud-export-card h3 { margin: 0; font-size: 0.82rem; }
    .aud-trail-card p, .aud-export-card p { margin: 0; font-size: 0.68rem; color: #64748b; line-height: 1.45; }
    .aud-trail-card dl, .aud-export-card dl { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; margin: 0; font-size: 0.66rem; dt { color: #94a3b8; } dd { margin: 0; font-weight: 600; } }
    .aud-trail-card__fw { font-size: 0.62rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 999px; background: ${AUDIT_ACCENT}; color: #fff; }
    .aud-trail-card__outcome { font-size: 0.6rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 999px;
      &[data-outcome='Aprobado'], &[data-outcome='Completado'], &[data-outcome='Cerrado'] { background: #dcfce7; color: #15803d; }
      &[data-outcome='Pendiente'] { background: #fef3c7; color: #b45309; }
    }
    .aud-export-card__fmt { font-size: 0.62rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 999px; background: ${AUDIT_ACCENT}; color: #fff; }
    .aud-export-card__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.15rem; }
    .aud-empty { text-align: center; color: #94a3b8; padding: 1.5rem; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
  `,
})
export class AuditPageComponent implements OnInit {
  private readonly service = inject(AuditService)
  private readonly toast = inject(ToastService)
  private readonly route = inject(ActivatedRoute)
  private readonly dialog = inject(MatDialog)
  private readonly pro = inject(ProModeService)

  readonly severityControl = new FormControl('', { nonNullable: true })
  readonly page = createPageLoader(true)
  readonly activities = signal<AuditActivityEntry[]>([])
  readonly securityEvents = signal<SecurityEvent[]>([])
  readonly complianceTrail = signal<ComplianceTrailEntry[]>([])
  readonly exports = signal<AuditExport[]>([])
  readonly view = signal<AuditView>('activity')

  readonly severityLabel = auditSeverityLabel

  readonly tabs = [
    { id: 'activity' as const, label: 'Registro actividad', icon: 'history' },
    { id: 'security' as const, label: 'Eventos seguridad', icon: 'security' },
    { id: 'compliance' as const, label: 'Trail cumplimiento', icon: 'gavel' },
    { id: 'exports' as const, label: 'Exportaciones', icon: 'download' },
  ]

  private readonly severityFilter = toSignal(this.severityControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  filteredSecurity = computed(() => {
    const sev = this.severityFilter()
    return this.securityEvents().filter((e) => !sev || e.severity === sev)
  })

  tabCount = (id: AuditView): number => {
    switch (id) {
      case 'activity': return this.activities().length
      case 'security': return this.securityEvents().length
      case 'compliance': return this.complianceTrail().length
      case 'exports': return this.exports().length
    }
  }

  ngOnInit(): void {
    const section = this.route.snapshot.paramMap.get('section')
    if (section === 'security-events') this.view.set('security')
    else if (section === 'compliance-trail') this.view.set('compliance')
    else if (section === 'exports') this.view.set('exports')
    if (allowsDemoDataFrom(this.pro)) {
      this.activities.set(defaultAuditActivities())
      this.securityEvents.set(defaultSecurityEvents())
      this.complianceTrail.set(defaultComplianceTrail())
      this.exports.set(defaultAuditExports())
    }
    this.load()
  }

  load = (): void => {
    this.page.run(this.service.list(), {
      onSuccess: (logs) => {
        this.activities.set(logs.map(mapAuditLogToEntry))
      },
      errorMessage: 'Error al cargar el registro de auditoría',
    })
  }

  handleRefresh = (): void => {
    this.load()
    this.toast.info('Registro de auditoría actualizado')
  }

  handleExportCsv = (): void => {
    const rows = this.activities()
    const header = 'id,action,resource,user,ip,timestamp,module,status,environment,outcome,correlationId\n'
    const body = rows.map((r) =>
      `${r.id},${r.action},${r.resource},${r.userId ?? ''},${r.ipAddress ?? ''},${r.createdAt},${r.module},${r.status},${r.environment ?? ''},${r.outcome ?? ''},${r.correlationId ?? ''}`,
    ).join('\n')
    downloadBlob(header + body, `audit-activity-${Date.now()}.csv`, 'text/csv')
    this.toast.success(`Exportados ${rows.length} registros (CSV)`)
  }

  handleCopyCorrelation = (id: string): void => {
    navigator.clipboard?.writeText(id).then(() => this.toast.success('ID de correlación copiado'))
  }

  openActivityDetail = (entry: AuditActivityEntry): void => {
    this.dialog.open(AuditActivityDetailDialogComponent, {
      width: 'min(920px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '92vh',
      panelClass: 'aud-activity-dialog-panel',
      data: { entry },
    })
  }

  openSecurityDetail = (event: SecurityEvent): void => {
    this.dialog.open(AuditSecurityEventDetailDialogComponent, {
      width: 'min(860px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'aud-security-dialog-panel',
      data: { event },
    })
  }

  openComplianceDetail = (entry: ComplianceTrailEntry): void => {
    this.dialog.open(AuditComplianceTrailDetailDialogComponent, {
      width: 'min(820px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '90vh',
      panelClass: 'aud-compliance-dialog-panel',
      data: { entry },
    })
  }

  openExportDetail = (exp: AuditExport): void => {
    this.dialog.open(AuditExportDetailDialogComponent, {
      width: 'min(720px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '88vh',
      panelClass: 'aud-export-dialog-panel',
      data: { export: exp },
    })
  }
}
