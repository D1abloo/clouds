import { PlatformActionService } from '../../../shared/platform/platform-action.service'
import { Component, Input, inject, signal, computed, output } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatTooltipModule } from '@angular/material/tooltip'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import { DashboardInstanceRow } from '../dashboard.models'
import {
  computeInstanceCostPerMinute,
  formatCostPerMinute,
  costPerMinuteBreakdown,
} from '../utils/dashboard-instance-cost.util'
import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'

interface FleetRow extends DashboardInstanceRow {
  instanceId: string
  cpuPct: number
  ramPct: number
  diskPct: number
  costPerMinute: number
  costPerMinuteLabel: string
  costBreakdown: string
  alertSeverity?: string
  providerLogo?: NavLogoKey
  providerColor: string
}

interface FleetRecommendation {
  title: string
  detail: string
  icon: string
  impact: 'high' | 'medium' | 'perf'
  impactLabel: string
}

interface ProviderMeta {
  logo?: NavLogoKey
  color: string
  label: string
}

const PROVIDER_META: Record<string, ProviderMeta> = {
  AWS: { logo: 'aws', color: '#ff9900', label: 'AWS' },
  GCP: { logo: 'gcp', color: '#4285f4', label: 'GCP' },
  AZURE: { logo: 'azure', color: '#0078d4', label: 'Azure' },
  VPS: { color: '#64748b', label: 'VPS' },
}

@Component({
  selector: 'app-dashboard-fleet-table',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    StatusBadgeComponent,
    BrandLogoComponent,
  ],
  template: `
    <section class="fleet-section" aria-label="Instancias multi-cloud e infraestructura">
      <div class="fleet-section__layout">
        <div class="fleet-main">
          <header class="fleet-header">
            <div class="fleet-header__copy">
              <div class="fleet-header__title-row">
                <div class="fleet-header__logos" aria-hidden="true">
                  @for (p of providerPills(); track p.key) {
                    <span class="fleet-header__logo-chip" [style.--chip-color]="p.color">
                      @if (p.logo) {
                        <app-brand-logo [logo]="p.logo" size="sm" />
                      } @else {
                        <mat-icon>dns</mat-icon>
                      }
                    </span>
                  }
                </div>
                <div>
                  <h3>Instancias multi-cloud ({{ fleetRows().length }})</h3>
                  <p>AWS, GCP, Azure y VPS — activas y monitorizadas</p>
                </div>
              </div>
            </div>
            <div class="fleet-header__actions">
              <mat-form-field appearance="outline" class="fleet-field fleet-field--provider">
                <mat-label>Proveedor</mat-label>
                <mat-select [formControl]="providerControl" aria-label="Filtrar por proveedor">
                  <mat-option value="">Todos los proveedores</mat-option>
                  @for (p of providerPills(); track p.key) {
                    <mat-option [value]="p.key">{{ p.label }} ({{ p.count }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="fleet-field fleet-field--status">
                <mat-label>Estado</mat-label>
                <mat-select [formControl]="statusControl" aria-label="Filtrar por estado">
                  <mat-option value="">Todos los estados</mat-option>
                  <mat-option value="RUNNING">RUNNING</mat-option>
                  <mat-option value="WARNING">UNSTABLE</mat-option>
                  <mat-option value="ERROR">ERROR</mat-option>
                  <mat-option value="STOPPED">STOPPED</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="fleet-field fleet-field--limit">
                <mat-label>Mostrar</mat-label>
                <mat-select [formControl]="displayLimitControl" aria-label="Límite de instancias visibles">
                  <mat-option value="5">5 instancias</mat-option>
                  <mat-option value="10">10 instancias (máx.)</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="fleet-field fleet-field--search">
                <mat-label>Buscar instancias</mat-label>
                <mat-icon matPrefix aria-hidden="true">search</mat-icon>
                <input matInput [formControl]="searchControl" placeholder="Nombre, ID, cuenta, zona…" />
              </mat-form-field>
              <button
                mat-stroked-button
                type="button"
                class="fleet-header__export"
                aria-label="Exportar instancias"
                (click)="handleExport()"
              >
                <mat-icon>download</mat-icon>
                Exportar
              </button>
            </div>
          </header>

          <div class="fleet-provider-pills" role="toolbar" aria-label="Filtro rápido por proveedor">
            <button
              type="button"
              class="fleet-pill"
              [class.fleet-pill--active]="!provider()"
              (click)="setProvider('')"
            >
              Todos
              <span>{{ fleetRows().length }}</span>
            </button>
            @for (p of providerPills(); track p.key) {
              <button
                type="button"
                class="fleet-pill"
                [class.fleet-pill--active]="provider() === p.key"
                [style.--pill-color]="p.color"
                (click)="setProvider(p.key)"
              >
                @if (p.logo) {
                  <app-brand-logo [logo]="p.logo" size="sm" />
                } @else {
                  <mat-icon>dns</mat-icon>
                }
                {{ p.label }}
                <span>{{ p.count }}</span>
              </button>
            }
          </div>

          <div class="fleet-table-panel">
            <div class="fleet-table-scroll">
              <table class="fleet-table">
                <thead>
                  <tr>
                    <th>Proveedor</th>
                    <th>Nombre</th>
                    <th>ID de instancia</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>CPU</th>
                    <th>Memoria</th>
                    <th>Disco</th>
                    <th>Coste/min</th>
                    <th>Zona</th>
                    <th>Alerta</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of visibleRows(); track row.id) {
                    <tr
                      class="fleet-table__row"
                      [class.fleet-table__row--alert]="row.alertSeverity"
                      tabindex="0"
                      role="button"
                      [attr.aria-label]="'Ver detalle de ' + row.name"
                      (click)="handleRowSelect(row)"
                      (keydown.enter)="handleRowSelect(row)"
                      (keydown.space)="$event.preventDefault(); handleRowSelect(row)"
                    >
                      <td>
                        <span class="fleet-table__provider" [style.--prov-color]="row.providerColor">
                          @if (row.providerLogo) {
                            <app-brand-logo [logo]="row.providerLogo" size="sm" />
                          } @else {
                            <mat-icon>dns</mat-icon>
                          }
                          {{ row.provider }}
                        </span>
                      </td>
                      <td>
                        <div class="fleet-table__name">
                          <span class="fleet-table__dot" [class]="statusDotClass(row.status)"></span>
                          <div>
                            <strong>{{ row.name }}</strong>
                            @if (row.accountName) {
                              <small>{{ row.accountName }}</small>
                            }
                          </div>
                        </div>
                      </td>
                      <td class="fleet-table__mono">{{ row.instanceId }}</td>
                      <td><span class="fleet-table__type">{{ row.instanceType }}</span></td>
                      <td><app-status-badge [value]="row.status" /></td>
                      <td>
                        <div class="usage-cell">
                          <div class="usage-bar" [class]="usageTone(row.cpuPct)">
                            <i [style.width.%]="row.cpuPct"></i>
                          </div>
                          <span>{{ row.cpuPct }}%</span>
                        </div>
                      </td>
                      <td>
                        <div class="usage-cell">
                          <div class="usage-bar" [class]="usageTone(row.ramPct)">
                            <i [style.width.%]="row.ramPct"></i>
                          </div>
                          <span>{{ row.ramPct }}%</span>
                        </div>
                      </td>
                      <td>
                        <div class="usage-cell">
                          <div class="usage-bar" [class]="usageTone(row.diskPct)">
                            <i [style.width.%]="row.diskPct"></i>
                          </div>
                          <span>{{ row.diskPct }}%</span>
                        </div>
                      </td>
                      <td>
                        <span
                          class="fleet-table__cost"
                          [matTooltip]="row.costBreakdown"
                          matTooltipPosition="above"
                        >
                          {{ row.costPerMinuteLabel }}
                        </span>
                      </td>
                      <td><span class="fleet-table__zone">{{ row.region }}</span></td>
                      <td>
                        @if (row.alertSeverity) {
                          <span class="alert-badge alert-badge--critical">{{ row.alertSeverity }}</span>
                        } @else {
                          <span class="alert-badge alert-badge--ok">OK</span>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="11" class="fleet-table__empty">No hay instancias que coincidan con los filtros.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <footer class="fleet-table-footer">
              <span>
                Mostrando {{ visibleRows().length }} de {{ filtered().length }} instancias
                @if (hiddenCount() > 0) {
                  · {{ hiddenCount() }} ocultas por límite (máx. {{ displayLimit() }})
                }
                · Coste visible: {{ visibleCostPerMinute() }}/min
              </span>
              <button mat-button type="button" class="fleet-table-footer__link" (click)="handleViewDetails()">
                Ver todas en Instancias
                <mat-icon>arrow_forward</mat-icon>
              </button>
            </footer>
          </div>
        </div>

        <aside class="fleet-reco" aria-label="Recomendaciones de optimización">
          <header class="fleet-reco__head">
            <div>
              <h4>Recomendaciones de optimización</h4>
              <p>Oportunidades detectadas en tu flota multi-cloud</p>
            </div>
            <mat-icon aria-hidden="true">auto_awesome</mat-icon>
          </header>
          <ul class="fleet-reco__list">
            @for (r of recommendations; track r.title) {
              <li [class]="'fleet-reco__item fleet-reco__item--' + r.impact">
                <span class="fleet-reco__icon" aria-hidden="true">
                  <mat-icon>{{ r.icon }}</mat-icon>
                </span>
                <div class="fleet-reco__copy">
                  <strong>{{ r.title }}</strong>
                  <small>{{ r.detail }}</small>
                  <span class="fleet-reco__tag">{{ r.impactLabel }}</span>
                </div>
              </li>
            }
          </ul>
        </aside>
      </div>
    </section>
  `,
  styles: `
    .fleet-section {
      padding: 1rem 1.1rem 1.1rem;
      border-radius: 16px;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      box-shadow: 0 8px 32px color-mix(in srgb, var(--app-text) 4%, transparent);
    }
    .fleet-section__layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(260px, 300px);
      gap: 1rem;
      align-items: start;
    }
    .fleet-main {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 0;
    }
    .fleet-header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem 1rem;
      padding-bottom: 0.75rem;
    }
    .fleet-header__title-row {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      h3 {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1.2;
      }
      p {
        margin: 0.15rem 0 0;
        font-size: 0.68rem;
        color: var(--app-text-muted);
      }
    }
    .fleet-header__logos {
      display: flex;
      gap: 0.25rem;
      flex-shrink: 0;
      padding-top: 0.15rem;
    }
    .fleet-header__logo-chip {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--chip-color) 12%, transparent);
    }
    .fleet-header__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 0.55rem;
      margin-left: auto;
    }
    .fleet-field { margin: 0; font-size: 0.72rem; }
    .fleet-field--provider { width: 168px; }
    .fleet-field--status { width: 148px; }
    .fleet-field--limit { width: 148px; }
    .fleet-field--search { width: min(220px, 100%); }
    .fleet-header__export {
      height: 40px;
      font-size: 0.72rem;
      font-weight: 650;
      white-space: nowrap;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; margin-right: 0.25rem; }
    }
    .fleet-provider-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .fleet-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      border: none;
      background: color-mix(in srgb, var(--app-text) 4%, var(--app-card));
      font-size: 0.65rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 2px 8px color-mix(in srgb, var(--app-text) 3%, transparent);
      span:last-child {
        font-size: 0.58rem;
        padding: 0.1rem 0.35rem;
        border-radius: 999px;
        background: color-mix(in srgb, var(--app-text) 6%, transparent);
        font-variant-numeric: tabular-nums;
      }
    }
    .fleet-pill:hover { background: color-mix(in srgb, var(--pill-color, var(--app-accent)) 8%, var(--app-card)); }
    .fleet-pill--active {
      background: color-mix(in srgb, var(--pill-color, var(--app-accent)) 12%, var(--app-card));
      box-shadow: 0 4px 14px color-mix(in srgb, var(--pill-color, var(--app-accent)) 18%, transparent);
    }
    .fleet-table-panel {
      border-radius: 12px;
      overflow: hidden;
      background: color-mix(in srgb, var(--app-surface) 25%, var(--app-card));
      box-shadow: inset 0 1px 0 color-mix(in srgb, white 50%, transparent);
    }
    .fleet-table-scroll { overflow-x: auto; }
    .fleet-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.72rem;
      min-width: 1080px;
    }
    .fleet-table thead { background: color-mix(in srgb, var(--app-text) 3.5%, var(--app-card)); }
    .fleet-table th {
      text-align: left;
      font-size: 0.58rem;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
      padding: 0.6rem 0.7rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      white-space: nowrap;
    }
    .fleet-table td {
      padding: 0.65rem 0.7rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 4%, transparent);
      vertical-align: middle;
      height: 52px;
    }
    .fleet-table__row {
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .fleet-table__row:hover,
    .fleet-table__row:focus-visible {
      background: color-mix(in srgb, var(--app-accent) 5%, transparent);
      outline: none;
    }
    .fleet-table tbody tr:last-child td { border-bottom: none; }
    .fleet-table__row--alert { background: color-mix(in srgb, #ef4444 3%, transparent); }
    .fleet-table__row--alert:hover { background: color-mix(in srgb, #ef4444 6%, transparent); }
    .fleet-table__provider {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.62rem;
      font-weight: 750;
      padding: 0.2rem 0.45rem;
      border-radius: 8px;
      background: color-mix(in srgb, var(--prov-color) 10%, transparent);
      color: color-mix(in srgb, var(--prov-color) 90%, var(--app-text));
    }
    .fleet-table__name {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      strong { display: block; font-weight: 700; font-size: 0.74rem; }
      small { display: block; font-size: 0.58rem; color: var(--app-text-muted); margin-top: 0.05rem; }
    }
    .fleet-table__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      flex-shrink: 0;
    }
    .fleet-table__dot--warn { background: #f59e0b; }
    .fleet-table__dot--error { background: #ef4444; }
    .fleet-table__dot--stopped { background: #94a3b8; }
    .fleet-table__mono {
      font-family: ui-monospace, 'Cascadia Code', monospace;
      font-size: 0.65rem;
      color: var(--app-text-muted);
    }
    .fleet-table__type, .fleet-table__zone {
      font-size: 0.68rem;
      color: color-mix(in srgb, var(--app-text) 78%, transparent);
    }
    .fleet-table__cost {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 750;
      font-variant-numeric: tabular-nums;
      padding: 0.2rem 0.45rem;
      border-radius: 8px;
      background: color-mix(in srgb, #10b981 10%, transparent);
      color: #059669;
      white-space: nowrap;
      cursor: help;
    }
    .fleet-table__empty {
      text-align: center;
      padding: 2rem 1rem !important;
      color: var(--app-text-muted);
      font-size: 0.75rem;
    }
    .usage-cell {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      min-width: 108px;
      span {
        font-size: 0.65rem;
        font-weight: 650;
        font-variant-numeric: tabular-nums;
        min-width: 2rem;
        text-align: right;
      }
    }
    .usage-bar {
      flex: 1;
      height: 7px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      overflow: hidden;
      min-width: 56px;
      i {
        display: block;
        height: 100%;
        border-radius: inherit;
        transition: width 0.35s ease;
        box-shadow: inset 0 -1px 0 color-mix(in srgb, black 6%, transparent);
      }
    }
    .usage-bar--ok i { background: linear-gradient(90deg, #10b981, #34d399); }
    .usage-bar--warn i { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .usage-bar--high i { background: linear-gradient(90deg, #ef4444, #f87171); }
    .alert-badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.55rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .alert-badge--critical {
      background: color-mix(in srgb, #ef4444 14%, transparent);
      color: #dc2626;
    }
    .alert-badge--ok {
      background: color-mix(in srgb, #10b981 12%, transparent);
      color: #059669;
      font-weight: 700;
    }
    .fleet-table-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.55rem 0.75rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      background: color-mix(in srgb, var(--app-text) 2%, var(--app-card));
      font-size: 0.65rem;
      color: var(--app-text-muted);
    }
    .fleet-table-footer__link {
      font-size: 0.65rem;
      min-height: 32px;
      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; margin-left: 0.15rem; }
    }
    .fleet-reco {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      padding: 0.85rem 0.9rem;
      border-radius: 14px;
      background: color-mix(in srgb, var(--app-surface) 35%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      box-shadow: 0 4px 20px color-mix(in srgb, var(--app-text) 4%, transparent);
      min-height: 100%;
    }
    .fleet-reco__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      padding-bottom: 0.55rem;
      h4 { margin: 0; font-size: 0.82rem; font-weight: 800; }
      p { margin: 0.2rem 0 0; font-size: 0.62rem; color: var(--app-text-muted); }
      > mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: #8b5cf6; }
    }
    .fleet-reco__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .fleet-reco__item {
      display: flex;
      gap: 0.6rem;
      padding: 0.6rem 0.65rem;
      border-radius: 11px;
      background: color-mix(in srgb, var(--app-card) 85%, transparent);
      box-shadow: 0 2px 10px color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .fleet-reco__icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
    .fleet-reco__item--high .fleet-reco__icon { background: color-mix(in srgb, #10b981 14%, transparent); color: #059669; }
    .fleet-reco__item--medium .fleet-reco__icon { background: color-mix(in srgb, #f59e0b 14%, transparent); color: #d97706; }
    .fleet-reco__item--perf .fleet-reco__icon { background: color-mix(in srgb, #8b5cf6 14%, transparent); color: #7c3aed; }
    .fleet-reco__copy {
      min-width: 0;
      strong { display: block; font-size: 0.72rem; font-weight: 750; }
      small { display: block; margin-top: 0.12rem; font-size: 0.62rem; color: var(--app-text-muted); }
    }
    .fleet-reco__tag {
      display: inline-block;
      margin-top: 0.35rem;
      font-size: 0.52rem;
      font-weight: 800;
      padding: 0.15rem 0.42rem;
      border-radius: 999px;
      text-transform: uppercase;
    }
    .fleet-reco__item--high .fleet-reco__tag { background: color-mix(in srgb, #10b981 14%, transparent); color: #059669; }
    .fleet-reco__item--medium .fleet-reco__tag { background: color-mix(in srgb, #f59e0b 14%, transparent); color: #d97706; }
    .fleet-reco__item--perf .fleet-reco__tag { background: color-mix(in srgb, #8b5cf6 14%, transparent); color: #7c3aed; }
    @media (max-width: 1100px) {
      .fleet-section__layout { grid-template-columns: 1fr; }
      .fleet-reco { order: -1; }
    }
    @media (max-width: 640px) {
      .fleet-section { padding: 0.85rem; }
      .fleet-header__actions { width: 100%; flex-direction: column; align-items: stretch; }
      .fleet-field--provider, .fleet-field--status, .fleet-field--limit, .fleet-field--search, .fleet-header__export { width: 100%; }
    }
  `,
})
export class DashboardFleetTableComponent {
  private readonly actions = inject(PlatformActionService)


  readonly instanceSelect = output<DashboardInstanceRow>()

  @Input({ required: true }) set rows(value: DashboardInstanceRow[]) {
    this.rawRows.set(value)
  }

  @Input() byProvider: Record<string, number> = {}
  @Input() cpuByProvider: Record<string, number> = {}
  @Input() costByProvider: Record<string, number> = {}

  private readonly rawRows = signal<DashboardInstanceRow[]>([])

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly statusControl = new FormControl('', { nonNullable: true })
  readonly providerControl = new FormControl('', { nonNullable: true })
  readonly displayLimitControl = new FormControl('10', { nonNullable: true })

  private readonly search = toSignal(this.searchControl.valueChanges.pipe(startWith(''), debounceTime(150)), { initialValue: '' })
  private readonly status = toSignal(this.statusControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  readonly provider = toSignal(this.providerControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  readonly displayLimit = toSignal(this.displayLimitControl.valueChanges.pipe(startWith('10')), { initialValue: '10' })

  readonly recommendations: FleetRecommendation[] = [
    { title: 'Reservas de instancias', detail: 'Ahorro estimado 18%', icon: 'savings', impact: 'high', impactLabel: 'Ahorro alto' },
    { title: 'Instancias sin uso', detail: '4 candidatas', icon: 'power_settings_new', impact: 'medium', impactLabel: 'Ahorro medio' },
    { title: 'Almacenamiento huérfano', detail: '320 GB detectados', icon: 'folder_off', impact: 'medium', impactLabel: 'Ahorro medio' },
    { title: 'Balanceo de carga', detail: 'Optimizar tráfico', icon: 'hub', impact: 'perf', impactLabel: 'Rendimiento' },
  ]

  fleetRows = computed((): FleetRow[] =>
    this.rawRows().map((r, i) => {
      const meta = PROVIDER_META[r.provider] ?? { color: '#64748b', label: r.provider }
      const costPerMinute = computeInstanceCostPerMinute(r)
      return {
        ...r,
        instanceId: this.buildInstanceId(r, i),
        cpuPct: this.metricPct(r, 'cpu', i),
        ramPct: this.metricPct(r, 'ram', i),
        diskPct: this.metricPct(r, 'disk', i),
        costPerMinute,
        costPerMinuteLabel: formatCostPerMinute(costPerMinute),
        costBreakdown: costPerMinuteBreakdown(r),
        alertSeverity: r.alertCount ? 'CRITICAL' : undefined,
        providerLogo: meta.logo,
        providerColor: meta.color,
      }
    }),
  )

  providerPills = computed(() => {
    const counts: Record<string, number> = {}
    this.fleetRows().forEach((r) => {
      counts[r.provider] = (counts[r.provider] ?? 0) + 1
    })
    return Object.keys(PROVIDER_META)
      .filter((k) => counts[k])
      .map((key) => ({
        key,
        label: PROVIDER_META[key].label,
        logo: PROVIDER_META[key].logo,
        color: PROVIDER_META[key].color,
        count: counts[key] ?? this.byProvider[key] ?? 0,
      }))
  })

  filteredAll = computed(() => {
    const prov = this.provider()
    return this.fleetRows().filter((r) => !prov || r.provider === prov)
  })

  filtered = computed(() => {
    const q = this.search().toLowerCase()
    const st = this.status()
    return this.filteredAll().filter((r) => {
      if (st && r.status !== st) return false
      if (!q) return true
      return [r.name, r.instanceId, r.instanceType, r.region, r.provider, r.accountName ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  })

  visibleRows = computed((): FleetRow[] => {
    const limit = Math.min(10, Number(this.displayLimit()) || 10)
    return this.filtered().slice(0, limit)
  })

  hiddenCount = computed(() => Math.max(0, this.filtered().length - this.visibleRows().length))

  visibleCostPerMinute = computed((): string => {
    const total = this.visibleRows().reduce((sum, row) => sum + row.costPerMinute, 0)
    return formatCostPerMinute(total)
  })

  setProvider = (key: string): void => {
    this.providerControl.setValue(key)
  }

  statusDotClass = (status?: string): string => {
    if (status === 'WARNING') return 'fleet-table__dot fleet-table__dot--warn'
    if (status === 'ERROR') return 'fleet-table__dot fleet-table__dot--error'
    if (status === 'STOPPED') return 'fleet-table__dot fleet-table__dot--stopped'
    return 'fleet-table__dot'
  }

  usageTone = (pct: number): string => {
    if (pct > 85) return 'usage-bar--high'
    if (pct > 70) return 'usage-bar--warn'
    return 'usage-bar--ok'
  }

  handleRowSelect = (row: FleetRow): void => {
    this.instanceSelect.emit(row)
  }

  handleExport = (): void => {
    this.actions.simulate('Exportar instancias multi-cloud', 600, 'Inventario exportado (demo CSV)').subscribe()
  }

  handleViewDetails = (): void => {
    this.actions.simulate('Ver listado completo de instancias', 300).subscribe()
  }

  private buildInstanceId = (row: DashboardInstanceRow, i: number): string => {
    const hex = (100000 + i * 7919).toString(16)
    if (row.provider === 'AWS') return `i-0${hex}`
    if (row.provider === 'GCP') return `${1000000000000000000 + i * 7919}`
    if (row.provider === 'AZURE') return `vm-${hex.slice(0, 8)}`
    return `vps-${row.id}`
  }

  private metricPct = (row: DashboardInstanceRow, kind: 'cpu' | 'ram' | 'disk', i: number): number => {
    if (row.status === 'ERROR') return kind === 'cpu' ? 95 : kind === 'ram' ? 88 : 90
    if (row.status === 'WARNING') return kind === 'cpu' ? 92 : kind === 'ram' ? 78 : 85
    if (row.status === 'STOPPED') return 0
    const base = kind === 'cpu' ? 45 : kind === 'ram' ? 52 : 40
    const mod = kind === 'cpu' ? 8 : kind === 'ram' ? 6 : 5
    return base + (i % 4) * mod
  }
}
