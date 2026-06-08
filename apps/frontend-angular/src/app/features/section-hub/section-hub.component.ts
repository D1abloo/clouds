import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { ConnectionRequiredComponent } from '../../shared/components/connection-required/connection-required.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
import { metricsHubDescription, metricsHubRows, type MetricsHubRow } from '../../shared/platform/metrics-hub.demo'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

@Component({
  selector: 'app-section-hub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatButtonModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    NavIconComponent,
    ConnectionRequiredComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="page-container section-hub animate-fade-in">
      <app-page-header
        [title]="title()"
        [description]="description()"
        [icon]="section() === 'roles' ? 'badge' : 'monitoring'"
        [actions]="headerActions()"
        (actionClick)="handleAction($event)"
      />

      <div class="hub-quick-actions">
        <button type="button" class="hub-action-chip" (click)="handleAction('Actualizar')"><mat-icon>refresh</mat-icon> Actualizar</button>
        <button type="button" class="hub-action-chip" (click)="handleAction('Exportar')"><mat-icon>download</mat-icon> Exportar</button>
        <button type="button" class="hub-action-chip" (click)="handleAction('Sincronizar')"><mat-icon>sync</mat-icon> Sincronizar</button>
      </div>

      @if (pro.proMode()) {
        <app-connection-required [module]="title()" />
      } @else if (!rows().length) {
        <app-empty-state
          title="Sin datos todavía"
          message="Conecta una integración para comenzar."
          icon="inventory_2"
        />
      } @else {
      @if (isMetrics()) {
        <div class="metrics-bar">
          <app-nav-icon logo="prometheus" size="md" />
          <div>
            <strong>Métricas · Prometheus + Grafana</strong>
            <span>Scrape 15s · retención 30 días · 847 series activas</span>
          </div>
          <div class="metrics-bar__logos">
            @for (logo of metricsLogos; track logo) {
              <span class="metrics-logo-chip"><app-nav-icon [logo]="logo" size="sm" /></span>
            }
          </div>
        </div>
      }

      <div class="table-card section-hub__table">
        <div class="table-toolbar">
          <h3>{{ sectionLabel() }}</h3>
          <span class="section-hub__meta">Dataset demo · {{ rows().length }} filas</span>
        </div>
        <div class="data-table-wrap">
          <table class="premium-table table-row-hover">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Detalle</th>
                @if (isMetrics()) { <th>CPU</th><th>Memoria</th><th>Fuente</th> }
                @else if (showCost()) { <th>Coste</th> }
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.name) {
                <tr>
                  <td><strong>{{ row.name }}</strong></td>
                  <td><app-status-badge [value]="row.status" /></td>
                  <td>{{ row.detail }}</td>
                  @if (isMetrics()) {
                    <td>{{ row.cpu ?? '—' }}</td>
                    <td>{{ row.memory ?? '—' }}</td>
                    <td><span class="source-chip">{{ row.source ?? 'prometheus' }}</span></td>
                  } @else if (showCost()) {
                    <td>{{ row.cost }}</td>
                  }
                  <td>
                    <button type="button" class="hub-link-btn" (click)="viewRow(row)">Ver detalle</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      }
    </div>
  `,
  styles: `
    .section-hub__meta {
      font-size: 0.72rem;
      color: var(--app-text-muted);
    }
    .section-hub__table h3 {
      margin: 0;
      font-size: 0.95rem;
    }
    .hub-link-btn {
      border: none;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      color: var(--app-accent);
      padding: 0.25rem 0.55rem;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
    }
    .metrics-bar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.65rem;
      padding: 0.65rem 0.85rem; margin-bottom: 0.65rem;
      border-left: 3px solid #e6522c; background: color-mix(in srgb, #e6522c 5%, transparent);
      strong { display: block; font-size: 0.82rem; }
      span { font-size: 0.68rem; color: var(--app-text-muted); }
    }
    .metrics-bar__logos { display: flex; gap: 0.35rem; margin-left: auto; }
    .metrics-logo-chip { padding: 0.15rem 0.35rem; border-radius: 6px; background: #fff; border: 1px solid #0000000d; }
    .source-chip { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: #047857; }
  `,
})
export class SectionHubComponent {
  private readonly route = inject(ActivatedRoute)
  private readonly actions = inject(PlatformActionService)
  readonly pro = inject(ProModeService)

  readonly module = computed(() => this.route.snapshot.data['module'] as string ?? 'module')
  readonly section = computed(() => this.route.snapshot.paramMap.get('section') ?? 'overview')
  readonly sectionLabel = computed(() => this.formatSection(this.section()))
  readonly title = computed(() => {
    const parent = this.route.snapshot.data['parentTitle'] as string | undefined
    return parent ? `${parent} — ${this.sectionLabel()}` : this.sectionLabel()
  })
  readonly headerActions = computed(() => [
    { label: 'Exportar', icon: 'download', primary: true },
    { label: 'Actualizar', icon: 'refresh' },
  ])

  readonly description = computed(() => {
    if (this.module() === 'metrics') return metricsHubDescription(this.section())
    return (
      (this.route.snapshot.data['description'] as string) ??
      `Gestiona ${this.sectionLabel()} con filtros, métricas y acciones (modo demo).`
    )
  })

  readonly metricsLogos: NavLogoKey[] = ['prometheus', 'grafana', 'kubernetes', 'docker', 'aws']

  readonly rows = computed((): MetricsHubRow[] => {
    if (!allowsDemoDataFrom(this.pro)) return []
    const s = this.section()
    const mod = this.module()
    if (mod === 'metrics') return metricsHubRows(s)
    return Array.from({ length: 8 }, (_, i) => ({
      name: `${mod}-${s}-${i + 1}`,
      status: i % 4 === 0 ? 'warning' : i % 7 === 0 ? 'error' : 'running',
      detail: `Región eu-west-${i + 1} · demo`,
      cost: `$${120 + i * 15}`,
    }))
  })

  isMetrics = (): boolean => this.module() === 'metrics'

  readonly showCost = computed(() =>
    !this.isMetrics() && ['billing', 'instances', 'cost'].some((k) => this.section().includes(k)),
  )

  formatSection = (slug: string): string =>
    slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

  handleAction = (label: string): void => {
    this.actions.runHubAction(this.module(), this.section(), label)
  }

  viewRow = (row: MetricsHubRow): void => {
    this.actions.runHubAction(this.module(), this.section(), 'Ver detalle', row)
  }
}
