import { Component, inject, OnInit, signal, computed, DestroyRef } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { bindSectionTabs } from '../../core/routing/section-tab.util'
import { DatePipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component'
import { AlertsService } from '../../core/services/alerts.service'
import { ToastService } from '../../core/services/toast.service'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { AlertItem } from '../../core/models/api.models'
import { createPageLoader } from '../../core/utils/page-load.util'
import {
  ALERTS_HISTORY,
  ALERTS_NOTIFICATIONS,
  ALERTS_RULES,
  ALERTS_SILENCED,
} from './alerts.demo'

@Component({
  selector: 'app-alert-rule-dialog',
  standalone: true,
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, ReactiveFormsModule, NavIconComponent],
  template: `
    <div class="alert-rule-dlg">
      <header class="alert-rule-dlg__head">
        <app-nav-icon logo="prometheus" size="lg" />
        <div>
          <span class="alert-rule-dlg__eyebrow">Alertmanager · Prometheus</span>
          <h2 mat-dialog-title>Crear regla de alerta</h2>
          <p>Define umbral, severidad, ventana y canales de notificación</p>
        </div>
      </header>
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full"><mat-label>Nombre</mat-label><input matInput [formControl]="name" /></mat-form-field>
        <mat-form-field appearance="outline" class="full"><mat-label>Métrica / query PromQL</mat-label>
          <mat-select [formControl]="metric">
            <mat-option value="cpu">cpu_usage &gt; 90% (5m)</mat-option>
            <mat-option value="cost">cloud_cost_daily_spike &gt; 20%</mat-option>
            <mat-option value="disk">disk_usage &gt; 85%</mat-option>
            <mat-option value="latency">http_latency_p99 &gt; 500ms</mat-option>
          </mat-select>
        </mat-form-field>
        <div class="alert-rule-dlg__grid">
          <mat-form-field appearance="outline"><mat-label>Severidad</mat-label>
            <mat-select [formControl]="severity"><mat-option value="critical">Crítica</mat-option><mat-option value="warning">Advertencia</mat-option><mat-option value="info">Info</mat-option></mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Ventana</mat-label>
            <mat-select [formControl]="window"><mat-option value="5m">5 minutos</mat-option><mat-option value="15m">15 minutos</mat-option><mat-option value="1h">1 hora</mat-option></mat-select>
          </mat-form-field>
        </div>
        <article class="alert-rule-dlg__channels">
          <h3><mat-icon>notifications</mat-icon> Canales</h3>
          <p>Slack #alerts · Email infra · Webhook PagerDuty · In-app</p>
        </article>
        <div class="alert-rule-dlg__logos">
          <app-nav-icon logo="grafana" size="sm" />
          <app-nav-icon logo="kubernetes" size="sm" />
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cancelar</button>
        <button mat-flat-button class="alert-rule-dlg__cta" type="button" [mat-dialog-close]="true">Crear regla</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .alert-rule-dlg__head { display: flex; gap: 0.75rem; margin-bottom: 0.5rem; padding-bottom: 0.65rem; border-bottom: 2px solid #e6522c33; }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.05rem; font-weight: 800; }
    .alert-rule-dlg__eyebrow { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #e6522c; }
    .alert-rule-dlg__head p { margin: 0.2rem 0 0; font-size: 0.78rem; color: var(--app-text-muted); }
    .full { width: 100%; }
    .alert-rule-dlg__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .alert-rule-dlg__channels { margin-top: 0.5rem; padding: 0.5rem 0.6rem; border-left: 3px solid #f59e0b; background: #f59e0b0a; font-size: 0.76rem;
      h3 { display: flex; align-items: center; gap: 0.25rem; margin: 0 0 0.25rem; font-size: 0.72rem; text-transform: uppercase; color: var(--app-text-muted); mat-icon { font-size: 1rem; width: 1rem; height: 1rem; } }
      p { margin: 0; }
    }
    .alert-rule-dlg__logos { display: flex; gap: 0.35rem; margin-top: 0.5rem; }
    .alert-rule-dlg__cta { background: #e6522c !important; color: #fff !important; }
  `,
})
export class AlertRuleDialogComponent {
  readonly name = new FormControl('CPU alto prod', { nonNullable: true })
  readonly metric = new FormControl('cpu', { nonNullable: true })
  readonly severity = new FormControl('warning', { nonNullable: true })
  readonly window = new FormControl('5m', { nonNullable: true })
}

@Component({
  selector: 'app-alerts-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    NavIconComponent,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Alertas"
        description="Incidentes activos, reglas, silencios y enrutamiento de notificaciones"
        icon="notifications_active"
        [demoMode]="true"
        [actions]="[
          { label: 'Crear regla', icon: 'add', primary: true },
          { label: 'Actualizar', icon: 'refresh' },
          { label: 'Exportar', icon: 'download' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      <div class="alerts-bar">
        <app-nav-icon logo="prometheus" size="md" />
        <div>
          <strong>Alertmanager · Prometheus</strong>
          <span>3 activas · 8 reglas · enrutamiento Slack + PagerDuty</span>
        </div>
        <div class="alerts-bar__logos">
          <app-nav-icon logo="grafana" size="sm" />
          <app-nav-icon logo="kubernetes" size="sm" />
        </div>
      </div>

      <div class="table-card">
      <mat-tab-group
        class="soft-tabs"
        animationDuration="280ms"
        [selectedIndex]="tabIndex()"
        (selectedIndexChange)="tabIndex.set($event)"
      >
        <mat-tab label="Activas">
          <div class="tab-panel">
            <div class="filter-row">
              <mat-form-field appearance="outline">
                <mat-label>Buscar alertas</mat-label>
                <input matInput [formControl]="searchControl" placeholder="Título de la alerta…" aria-label="Filtrar alertas" />
                <mat-hint>Filtra por título; combina con el filtro de severidad</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Severidad</mat-label>
                <mat-select [formControl]="severityControl">
                  <mat-option value="">Todas</mat-option>
                  <mat-option value="critical">Crítica</mat-option>
                  <mat-option value="warning">Advertencia</mat-option>
                  <mat-option value="info">Info</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            @if (page.loading()) {
              <app-loading-state message="Cargando alertas…" />
            } @else if (page.error()) {
              <app-error-state [message]="page.error()!" (retry)="load()" />
            } @else if (filtered().length === 0) {
              <app-empty-state icon="check_circle" title="Todo en orden" description="No hay alertas activas." />
            } @else {
              <div class="data-table-wrap">
              <table mat-table [dataSource]="filtered()" class="premium-table table-row-hover">
                <ng-container matColumnDef="severity">
                  <th mat-header-cell *matHeaderCellDef>Severidad</th>
                  <td mat-cell *matCellDef="let row"><span class="severity-pill severity-pill--{{ row.severity }}">{{ row.severity }}</span></td>
                </ng-container>
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Alerta</th>
                  <td mat-cell *matCellDef="let row">{{ row.title }}</td>
                </ng-container>
                <ng-container matColumnDef="resource">
                  <th mat-header-cell *matHeaderCellDef>Recurso</th>
                  <td mat-cell *matCellDef="let row">{{ row.resource ?? '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status" /></td>
                </ng-container>
                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef>Fecha</th>
                  <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'short' }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    <button mat-icon-button [matMenuTriggerFor]="alertMenu" aria-label="Acciones" (click)="selectedAlert.set(row)"><mat-icon>more_vert</mat-icon></button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let row; columns: cols" class="table-row-hover"></tr>
              </table>
              </div>
            }
          </div>
        </mat-tab>

        <mat-tab label="Historial">
          <div class="tab-panel">
            <div class="data-table-wrap">
              <table class="premium-table table-row-hover">
                <thead>
                  <tr>
                    <th>Severidad</th><th>Alerta</th><th>Recurso</th><th>Duración</th><th>Resuelta</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of history; track row.id) {
                    <tr>
                      <td><span class="severity-pill severity-pill--{{ row.severity }}">{{ row.severity }}</span></td>
                      <td>{{ row.title }}</td>
                      <td>{{ row.resource }}</td>
                      <td>{{ row.duration }}</td>
                      <td>{{ row.resolvedAt | date:'short' }}</td>
                      <td><button mat-icon-button type="button" [matMenuTriggerFor]="historyMenu" (click)="selectedHistory.set(row)" aria-label="Acciones"><mat-icon>more_vert</mat-icon></button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Reglas">
          <div class="tab-panel">
            <div class="data-table-wrap">
              <table class="premium-table table-row-hover">
                <thead>
                  <tr><th>Nombre</th><th>Métrica</th><th>Umbral</th><th>Severidad</th><th>Canales</th><th>Estado</th><th></th></tr>
                </thead>
                <tbody>
                  @for (row of rules; track row.id) {
                    <tr>
                      <td>{{ row.name }}</td>
                      <td class="mono">{{ row.metric }}</td>
                      <td>{{ row.threshold }}</td>
                      <td><span class="severity-pill severity-pill--{{ row.severity }}">{{ row.severity }}</span></td>
                      <td>{{ row.channels }}</td>
                      <td><app-status-badge [value]="row.status" /></td>
                      <td><button mat-icon-button type="button" [matMenuTriggerFor]="ruleMenu" (click)="selectedRule.set(row)" aria-label="Acciones"><mat-icon>more_vert</mat-icon></button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Silenciadas">
          <div class="tab-panel">
            @if (silenced.length === 0) {
              <app-empty-state title="Sin alertas silenciadas" icon="notifications" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover">
                  <thead><tr><th>Alerta</th><th>Silenciada por</th><th>Hasta</th><th>Motivo</th><th></th></tr></thead>
                  <tbody>
                    @for (row of silenced; track row.id) {
                      <tr>
                        <td>{{ row.title }}</td>
                        <td>{{ row.silencedBy }}</td>
                        <td>{{ row.until | date:'short' }}</td>
                        <td>{{ row.reason }}</td>
                        <td><button mat-stroked-button type="button" (click)="runAlertAction('reactivate', row, 'Reactivar alerta')">Reactivar</button></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </mat-tab>

        <mat-tab label="Notificaciones">
          <div class="tab-panel">
            <div class="data-table-wrap">
              <table class="premium-table table-row-hover">
                <thead><tr><th>Canal</th><th>Destino</th><th>Severidades</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  @for (row of notificationRoutes; track row.id) {
                    <tr>
                      <td>{{ row.channel }}</td>
                      <td>{{ row.destination }}</td>
                      <td>{{ row.severities }}</td>
                      <td><app-status-badge [value]="row.status" /></td>
                      <td><button mat-icon-button type="button" (click)="runAlertAction('channel-test', row, 'Probar canal')" aria-label="Probar"><mat-icon>send</mat-icon></button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
      </div>
    </div>

    <mat-menu #alertMenu="matMenu">
      <button mat-menu-item type="button" (click)="runOnSelected('resolve', 'Resolver alerta')"><mat-icon>check_circle</mat-icon> Resolver</button>
      <button mat-menu-item type="button" (click)="runOnSelected('silence', 'Silenciar alerta')"><mat-icon>notifications_off</mat-icon> Silenciar</button>
      <button mat-menu-item type="button" (click)="runOnSelected('detail', 'Ver recurso')"><mat-icon>open_in_new</mat-icon> Ver recurso</button>
      <button mat-menu-item type="button" (click)="runOnSelected('escalate', 'Escalar alerta')"><mat-icon>priority_high</mat-icon> Escalar</button>
    </mat-menu>

    <mat-menu #historyMenu="matMenu">
      <button mat-menu-item type="button" (click)="runHistoryAction('detail', 'Ver detalle')"><mat-icon>visibility</mat-icon> Ver detalle</button>
      <button mat-menu-item type="button" (click)="runHistoryAction('export', 'Exportar')"><mat-icon>download</mat-icon> Exportar</button>
    </mat-menu>

    <mat-menu #ruleMenu="matMenu">
      <button mat-menu-item type="button" (click)="runRuleAction('detail', 'Ver regla')"><mat-icon>visibility</mat-icon> Ver regla</button>
      <button mat-menu-item type="button" (click)="runRuleAction('edit', 'Editar regla')"><mat-icon>edit</mat-icon> Editar</button>
      <button mat-menu-item type="button" (click)="runRuleAction('disable', 'Desactivar regla')"><mat-icon>pause</mat-icon> Desactivar</button>
    </mat-menu>
  `,
  styles: `
    .severity-pill {
      display: inline-flex; padding: 0.15rem 0.5rem; border-radius: 999px;
      font-size: 0.68rem; font-weight: 800; text-transform: uppercase;
    }
    .severity-pill--critical { color: #ef4444; background: color-mix(in srgb, #ef4444 22%, transparent); }
    .severity-pill--warning { color: #f59e0b; background: color-mix(in srgb, #f59e0b 22%, transparent); }
    .severity-pill--info { color: #38bdf8; background: color-mix(in srgb, #38bdf8 22%, transparent); }
    .mono { font-family: ui-monospace, monospace; font-size: 0.82rem; }
    .alerts-bar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.65rem;
      padding: 0.65rem 0.85rem; margin-bottom: 0.85rem;
      border-left: 3px solid #e6522c; background: color-mix(in srgb, #e6522c 5%, transparent);
      strong { display: block; font-size: 0.82rem; }
      span { font-size: 0.68rem; color: var(--app-text-muted); }
    }
    .alerts-bar__logos { display: flex; gap: 0.35rem; margin-left: auto; }
  `,
})
export class AlertsPageComponent implements OnInit {
  private readonly service = inject(AlertsService)
  private readonly toast = inject(ToastService)
  private readonly actions = inject(PlatformActionService)
  private readonly dialog = inject(MatDialog)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)

  readonly tabIndex = signal(0)
  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly severityControl = new FormControl('', { nonNullable: true })
  readonly page = createPageLoader(true)
  readonly alerts = signal<AlertItem[]>([])
  readonly selectedAlert = signal<AlertItem | null>(null)
  readonly selectedHistory = signal<object | null>(null)
  readonly selectedRule = signal<object | null>(null)
  readonly cols = ['severity', 'title', 'resource', 'status', 'createdAt', 'actions']

  readonly history = ALERTS_HISTORY
  readonly rules = ALERTS_RULES
  readonly silenced = ALERTS_SILENCED
  readonly notificationRoutes = ALERTS_NOTIFICATIONS

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )
  private readonly severityFilter = toSignal(this.severityControl.valueChanges.pipe(startWith('')), {
    initialValue: '',
  })

  filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const sev = this.severityFilter()
    return this.alerts().filter((a) => {
      const matchTerm = !term || a.title.toLowerCase().includes(term)
      const matchSev = !sev || a.severity.toLowerCase() === sev
      return matchTerm && matchSev
    })
  })

  ngOnInit(): void {
    bindSectionTabs(this.route, this.destroyRef, this.tabIndex, 'alerts')
    const section = this.route.snapshot.paramMap.get('section')
    if (section === 'critical') this.severityControl.setValue('critical')
    if (section === 'warning') this.severityControl.setValue('warning')
    if (section === 'info') this.severityControl.setValue('info')
    this.load()
  }

  load = (): void => {
    this.page.run(this.service.list(), {
      onSuccess: (data) => this.alerts.set(data),
      errorMessage: 'No se pudieron cargar las alertas',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Crear regla') {
      this.dialog.open(AlertRuleDialogComponent, { width: '420px' }).afterClosed().subscribe((ok) => {
        if (ok) this.actions.runPageAction('alerts', 'create-rule', 'Regla creada')
      })
      return
    }
    if (label === 'Actualizar') {
      this.load()
      return
    }
    this.actions.runPageAction('alerts', 'export', label)
  }

  runOnSelected = (actionId: string, label: string): void => {
    const alert = this.selectedAlert()
    if (!alert) return
    if (actionId === 'resolve') {
      this.service.resolve(alert.id).subscribe({
        next: () => {
          this.toast.success('Alerta resuelta')
          this.actions.runPageAction('alerts', 'resolve', label, { row: alert as unknown as Record<string, unknown> })
          this.load()
        },
        error: () => {
          this.actions.runPageAction('alerts', 'resolve', label, { row: alert as unknown as Record<string, unknown> })
          this.load()
        },
      })
      return
    }
    this.actions.runPageAction('alerts', actionId, label, { row: alert as unknown as Record<string, unknown> })
  }

  runAlertAction = (actionId: string, row: object, label: string): void => {
    this.actions.runPageAction('alerts', actionId, label, { row: row as Record<string, unknown> })
  }

  runHistoryAction = (actionId: string, label: string): void => {
    const row = this.selectedHistory()
    if (!row) return
    this.actions.runPageAction('alerts', actionId, label, { row: row as Record<string, unknown> })
  }

  runRuleAction = (actionId: string, label: string): void => {
    const row = this.selectedRule()
    if (!row) return
    this.actions.runPageAction('alerts', actionId, label, { row: row as Record<string, unknown> })
  }
}
