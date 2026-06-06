import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDialogModule } from '@angular/material/dialog'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute } from '@angular/router'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { AuditService } from '../../core/services/audit.service'
import { ToastService } from '../../core/services/toast.service'
import { AuditLog } from '../../core/models/api.models'
import { createPageLoader } from '../../core/utils/page-load.util'
import {
  defaultAuditExports,
  defaultComplianceTrail,
  defaultSecurityEvents,
} from '../security/audit-security.demo'

type AuditView = 'activity' | 'security' | 'compliance' | 'exports'

@Component({
  selector: 'app-audit-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
  ],
  template: `
    <div class="page-container aud-page animate-fade-in">
      <app-page-header
        title="Auditoría"
        description="Trazabilidad de actividad, eventos de seguridad, cumplimiento y exportaciones"
        icon="manage_search"
        [demoMode]="true"
        [actions]="[
          { label: 'Exportar CSV', icon: 'download', primary: true },
          { label: 'Actualizar', icon: 'refresh' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      <section class="aud-kpis">
        @for (kpi of kpis; track kpi.label) {
          <article class="aud-kpi"><mat-icon>{{ kpi.icon }}</mat-icon><div><span>{{ kpi.label }}</span><strong>{{ kpi.value }}</strong></div></article>
        }
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
            </button>
          }
        </nav>
        @if (view() === 'activity') {
          <div class="aud-filters">
            <mat-form-field appearance="outline" class="aud-filter-field">
              <mat-label>Buscar</mat-label>
              <input matInput [formControl]="searchControl" placeholder="Acción o recurso…" aria-label="Filtrar registros" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="aud-filter-field">
              <mat-label>Acción</mat-label>
              <mat-select [formControl]="actionControl">
                <mat-option value="">Todas</mat-option>
                @for (a of actionOptions(); track a) {
                  <mat-option [value]="a">{{ a }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        }
      </div>

      <div class="aud-content table-card">
        @if (view() === 'activity') {
          @if (page.loading()) {
            <app-loading-state />
          } @else if (page.error()) {
            <app-error-state [message]="page.error()!" (retry)="load()" />
          } @else if (filtered().length === 0) {
            <app-empty-state title="Sin registros de auditoría" />
          } @else {
            <div class="data-table-wrap">
              <table mat-table [dataSource]="filtered()" class="premium-table table-row-hover aud-table">
                <ng-container matColumnDef="action">
                  <th mat-header-cell *matHeaderCellDef>Acción</th>
                  <td mat-cell *matCellDef="let row">
                    <button mat-button type="button" class="link-btn" (click)="showDetail(row)">{{ row.action }}</button>
                  </td>
                </ng-container>
                <ng-container matColumnDef="resource">
                  <th mat-header-cell *matHeaderCellDef>Recurso</th>
                  <td mat-cell *matCellDef="let row">{{ row.resource }}</td>
                </ng-container>
                <ng-container matColumnDef="ipAddress">
                  <th mat-header-cell *matHeaderCellDef>IP</th>
                  <td mat-cell *matCellDef="let row" class="mono">{{ row.ipAddress ?? '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef>Hora</th>
                  <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'medium' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let row; columns: cols" class="table-row-hover"></tr>
              </table>
            </div>
          }
        }

        @if (view() === 'security') {
          <table class="aud-native-table" aria-label="Eventos de seguridad">
            <thead><tr><th>Evento</th><th>Fuente</th><th>Severidad</th><th>Usuario</th><th>IP</th><th>Hora</th><th>Estado</th></tr></thead>
            <tbody>
              @for (ev of securityEvents(); track ev.id) {
                <tr>
                  <td>{{ ev.event }}</td><td>{{ ev.source }}</td>
                  <td><span class="aud-sev" [attr.data-sev]="ev.severity">{{ ev.severity }}</span></td>
                  <td>{{ ev.user }}</td><td class="mono">{{ ev.ip }}</td>
                  <td>{{ ev.at | date: 'dd MMM HH:mm' }}</td>
                  <td><app-status-badge [value]="ev.status" /></td>
                </tr>
              }
            </tbody>
          </table>
        }

        @if (view() === 'compliance') {
          <table class="aud-native-table" aria-label="Trail de cumplimiento">
            <thead><tr><th>Acción</th><th>Actor</th><th>Recurso</th><th>Framework</th><th>Resultado</th><th>Hora</th></tr></thead>
            <tbody>
              @for (ct of complianceTrail(); track ct.id) {
                <tr>
                  <td>{{ ct.action }}</td><td>{{ ct.actor }}</td><td>{{ ct.resource }}</td>
                  <td>{{ ct.framework }}</td><td>{{ ct.outcome }}</td>
                  <td>{{ ct.at | date: 'dd MMM HH:mm' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }

        @if (view() === 'exports') {
          <table class="aud-native-table" aria-label="Exportaciones">
            <thead><tr><th>Informe</th><th>Formato</th><th>Registros</th><th>Solicitado por</th><th>Estado</th><th>Generado</th><th></th></tr></thead>
            <tbody>
              @for (ex of exports(); track ex.id) {
                <tr>
                  <td>{{ ex.name }}</td><td>{{ ex.format }}</td><td>{{ ex.records }}</td>
                  <td>{{ ex.requestedBy }}</td><td><app-status-badge [value]="ex.status" /></td>
                  <td>{{ ex.generatedAt | date: 'dd MMM HH:mm' }}</td>
                  <td>
                    @if (ex.status === 'success') {
                      <button mat-stroked-button type="button" (click)="handleDownloadExport(ex.name)">Descargar</button>
                    } @else {
                      <button mat-stroked-button type="button" (click)="handleNewExport()">Nueva exportación</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .aud-page { display: flex; flex-direction: column; gap: 0.65rem; color: #0f172a; }
    .link-btn { padding: 0; min-width: 0; text-transform: none; }
    .aud-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.5rem; }
    .aud-kpi {
      display: flex; gap: 0.45rem; padding: 0.55rem 0.65rem; border-radius: 11px;
      background: #fdf2f8; border: 1px solid #fbcfe8;
    }
    .aud-kpi mat-icon { color: #db2777; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .aud-kpi span { display: block; font-size: 0.55rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
    .aud-kpi strong { font-size: 1rem; font-weight: 700; }
    .aud-bar { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.5rem; }
    .aud-tabs { display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.2rem; border-radius: 10px; background: #fdf2f8; }
    .aud-tabs__tab {
      display: inline-flex; align-items: center; gap: 0.28rem; padding: 0.35rem 0.6rem;
      border: none; border-radius: 8px; background: transparent; font: inherit; font-size: 0.68rem;
      font-weight: 600; color: #9d174d; cursor: pointer;
    }
    .aud-tabs__tab--on { background: #fff; color: #831843; box-shadow: 0 1px 2px rgb(190 24 93 / 0.08); }
    .aud-tabs__tab mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    .aud-filters { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-left: auto; }
    .aud-filter-field { min-width: 10rem; font-size: 0.78rem; }
    .aud-content { border-radius: 11px; overflow: auto; }
    .aud-native-table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
    .aud-native-table th {
      text-align: left; padding: 0.5rem 0.65rem; font-size: 0.58rem; font-weight: 700;
      text-transform: uppercase; color: #94a3b8; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .aud-native-table td { padding: 0.5rem 0.65rem; border-bottom: 1px solid #f1f5f9; }
    .aud-native-table tr:hover td { background: #fdf2f8; }
    .aud-sev { font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      &[data-sev='critical'] { color: #b91c1c; }
      &[data-sev='warning'] { color: #b45309; }
      &[data-sev='info'] { color: #0369a1; }
    }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
    @media (max-width: 900px) { .aud-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `,
})
export class AuditPageComponent implements OnInit {
  private readonly service = inject(AuditService)
  private readonly toast = inject(ToastService)
  private readonly route = inject(ActivatedRoute)

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly actionControl = new FormControl('', { nonNullable: true })
  readonly page = createPageLoader(true)
  readonly logs = signal<AuditLog[]>([])
  readonly securityEvents = signal(defaultSecurityEvents())
  readonly complianceTrail = signal(defaultComplianceTrail())
  readonly exports = signal(defaultAuditExports())
  readonly cols = ['action', 'resource', 'ipAddress', 'createdAt']
  readonly view = signal<AuditView>('activity')

  readonly kpis = [
    { label: 'Eventos (24h)', value: '1.2k', icon: 'receipt_long' },
    { label: 'Seguridad', value: 89, icon: 'shield' },
    { label: 'Cumplimiento', value: 42, icon: 'fact_check' },
    { label: 'Exportaciones', value: 3, icon: 'download' },
  ]

  readonly tabs = [
    { id: 'activity' as const, label: 'Registro de actividad', icon: 'history' },
    { id: 'security' as const, label: 'Eventos seguridad', icon: 'security' },
    { id: 'compliance' as const, label: 'Trail cumplimiento', icon: 'gavel' },
    { id: 'exports' as const, label: 'Exportaciones', icon: 'download' },
  ]

  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')), { initialValue: '' })
  private readonly actionFilter = toSignal(this.actionControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  actionOptions = computed(() => [...new Set(this.logs().map((l) => l.action))])

  filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const action = this.actionFilter()
    return this.logs().filter((l) => {
      const matchTerm = !term || l.action.toLowerCase().includes(term) || l.resource.toLowerCase().includes(term)
      const matchAction = !action || l.action === action
      return matchTerm && matchAction
    })
  })

  ngOnInit(): void {
    const section = this.route.snapshot.paramMap.get('section')
    if (section === 'security-events') this.view.set('security')
    else if (section === 'compliance-trail') this.view.set('compliance')
    else if (section === 'exports') this.view.set('exports')
    this.load()
  }

  load = (): void => {
    this.page.run(this.service.list(), {
      onSuccess: (data) => this.logs.set(data),
      errorMessage: 'Error al cargar el registro de auditoría',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Exportar CSV') {
      this.toast.success(`Exportados ${this.filtered().length} registros (CSV)`)
      return
    }
    this.load()
    this.toast.info('Registro de auditoría actualizado')
  }

  showDetail = (row: AuditLog): void => {
    this.toast.info(`Evento: ${row.action} · ${row.resource}`)
  }

  handleDownloadExport = (name: string): void => {
    this.toast.success(`Descargando: ${name}`)
  }

  handleNewExport = (): void => {
    this.exports.update((rows) => [{
      id: `exp-${Date.now()}`,
      name: 'Exportación personalizada',
      format: 'CSV',
      records: this.logs().length,
      status: 'running',
      generatedAt: new Date().toISOString(),
      requestedBy: 'admin@cloudops',
    }, ...rows])
    this.toast.info('Exportación en curso…')
  }
}
