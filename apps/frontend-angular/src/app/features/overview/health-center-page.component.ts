import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { catchError, delay, of } from 'rxjs'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog } from '@angular/material/dialog'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { ToastService } from '../../core/services/toast.service'
import { InstancesService } from '../../core/services/instances.service'
import type { Instance } from '../../core/models/api.models'
import { HealthResourceMetadataPanelComponent } from './health-resource-metadata-panel.component'
import {
  HealthIncidentDetailDialogComponent,
} from './health-incident-detail-dialog.component'
import {
  buildHealthCenterDonutSegments,
  buildHealthRecordsFromInstances,
  buildHealthTimeline,
  filterHealthCenterRecords,
  healthByProvider,
  healthCenterSeverityBuckets,
  instanceProviderTypeLabel,
  severityLabel,
  summarizeHealth,
  type InstanceHealthRecord,
  type InstanceHealthSeverity,
} from './health-center.demo'

const nowTime = (): string =>
  new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

@Component({
  selector: 'app-health-center-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'hlth-page-host',
  },
  imports: [
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    BrandLogoComponent,
    MatButtonModule,
    MatIconModule,
    HealthResourceMetadataPanelComponent,
  ],
  template: `
    <div class="hlth-page animate-fade-in">
      <app-page-header
        icon="monitor_heart"
        title="Centro de salud"
        description="Instancias con incidencia activa: solo críticas y advertencias, con puntuación, métricas e informes resource details and metadata."
        [lastSync]="lastSyncLabel()"
        [actions]="[
          { label: 'Ejecutar chequeo', icon: 'monitor_heart', primary: true },
          { label: 'Exportar informe', icon: 'download' },
          { label: 'Ver instancias', icon: 'dns' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      @if (loading()) {
        <app-loading-state message="Analizando instancias críticas y en advertencia…" />
      } @else if (!records().length) {
        <p class="hlth-empty-page">No hay instancias críticas ni en advertencia. Todas las instancias monitorizadas están dentro de umbral.</p>
      } @else {
        <div class="hlth-toolbar">
          <div class="hlth-filters" role="group" aria-label="Filtrar por severidad">
            @for (f of severityFilters(); track f.key) {
              <button
                type="button"
                class="hlth-filter"
                [class.hlth-filter--active]="severityFilter() === f.key"
                (click)="setSeverityFilter(f.key)"
              >
                {{ f.label }} <em>{{ f.count }}</em>
              </button>
            }
          </div>
          <div class="hlth-filters" role="group" aria-label="Filtrar por proveedor">
            <button
              type="button"
              class="hlth-filter"
              [class.hlth-filter--active]="providerFilter() === ''"
              (click)="setProviderFilter('')"
            >
              Todos <em>{{ records().length }}</em>
            </button>
            @for (p of providers(); track p.provider) {
              <button
                type="button"
                class="hlth-filter"
                [class.hlth-filter--active]="providerFilter() === p.provider"
                (click)="setProviderFilter(p.provider)"
              >
                {{ p.provider }} <em>{{ p.total }}</em>
              </button>
            }
          </div>
        </div>

        <div class="hlth-grid">
          <section class="hlth-panel hlth-donut-panel">
            <h3>Distribución de incidencias</h3>
            <div class="hlth-donut">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="48" fill="none" stroke="color-mix(in srgb, var(--app-text) 8%, transparent)" stroke-width="12" />
                @for (seg of donutSegments(); track seg.color) {
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    [attr.stroke]="seg.color"
                    stroke-width="12"
                    [attr.stroke-dasharray]="seg.dash + ' 302'"
                    [attr.stroke-dashoffset]="seg.offset"
                    stroke-linecap="round"
                    transform="rotate(-90 60 60)"
                  />
                }
              </svg>
              <div class="hlth-donut__center">
                <strong>{{ summary().avgScore }}%</strong>
                <span>Salud media</span>
              </div>
            </div>
            <ul class="hlth-legend">
              @for (b of severityBuckets(); track b.key) {
                <li>
                  <i class="dot" [class]="'dot--' + b.tone"></i>
                  {{ b.label }}
                  <strong>{{ b.count }}</strong>
                  <em>{{ b.pct }}%</em>
                </li>
              }
            </ul>
          </section>

          <section class="hlth-panel">
            <h3>Detalle por severidad</h3>
            <div class="hlth-severity-grid" role="list">
              @for (b of severityBuckets(); track b.key) {
                <article class="hlth-sev-card" [class]="'hlth-sev-card--' + b.tone" role="listitem">
                  <mat-icon>{{ b.icon }}</mat-icon>
                  <div>
                    <strong>{{ b.count }}</strong>
                    <span>{{ b.label }}</span>
                    <p>{{ b.description }}</p>
                  </div>
                  <em>{{ b.pct }}%</em>
                </article>
              }
            </div>
          </section>

          <section class="hlth-panel hlth-panel--wide">
            <h3>Salud por proveedor</h3>
            <div class="hlth-providers">
              @for (p of providers(); track p.provider) {
                <article class="hlth-provider">
                  @if (p.logo) {
                    <app-brand-logo [logo]="p.logo" size="sm" />
                  } @else {
                    <mat-icon>dns</mat-icon>
                  }
                  <div class="hlth-provider__body">
                    <div class="hlth-provider__head">
                      <strong>{{ p.provider }}</strong>
                      <span>{{ p.avgScore }}% salud</span>
                    </div>
                    <div class="hlth-provider__bar" aria-hidden="true">
                      @if (p.warning) {
                        <span class="hlth-provider__seg hlth-provider__seg--warn" [style.flex]="p.warning"></span>
                      }
                      @if (p.critical) {
                        <span class="hlth-provider__seg hlth-provider__seg--crit" [style.flex]="p.critical"></span>
                      }
                    </div>
                    <span class="hlth-provider__meta">
                      {{ p.total }} incid. · {{ p.warning }} adv · {{ p.critical }} crit
                    </span>
                  </div>
                </article>
              }
            </div>
          </section>
        </div>

        <div class="hlth-split">
          <section class="hlth-panel hlth-panel--timeline">
            <h3>Timeline de incidencias</h3>
            <ul class="hlth-timeline">
              @for (ev of timeline(); track ev.time + ev.event) {
                <li [class]="'hlth-timeline__item--' + ev.severity">
                  <time>{{ ev.time }}</time>
                  <span>{{ ev.event }}</span>
                </li>
              } @empty {
                <li class="hlth-timeline__empty">Sin incidencias activas en instancias</li>
              }
            </ul>
          </section>

          <section class="hlth-panel hlth-panel--cards">
            <header class="hlth-panel__head">
              <div>
                <h3>Instancias con incidencia</h3>
                <p>Críticas y advertencias · vista rápida con puntuación</p>
              </div>
              <span class="hlth-count">{{ filteredRecords().length }}</span>
            </header>
            <div class="hlth-instance-cards" role="list">
              @for (inst of filteredRecords(); track inst.id) {
                <button
                  type="button"
                  class="hlth-inst-card"
                  [class]="'hlth-inst-card--' + inst.severity"
                  role="listitem"
                  (click)="viewDetail(inst)"
                >
                  <div class="hlth-inst-card__score" [class]="instScoreClass(inst.healthScore)">
                    <strong>{{ inst.healthScore }}</strong>
                    <span>score</span>
                  </div>
                  <div class="hlth-inst-card__body">
                    <div class="hlth-inst-card__head">
                      @if (inst.logo) {
                        <app-brand-logo [logo]="inst.logo" size="sm" />
                      }
                      <strong>{{ inst.name }}</strong>
                      <span class="sev" [class]="'sev--' + inst.severity">{{ severityLabel(inst.severity) }}</span>
                    </div>
                    <span class="hlth-inst-card__meta">{{ inst.provider }} · {{ inst.region }} · {{ inst.instanceType }}</span>
                    <div class="hlth-inst-card__meters" aria-hidden="true">
                      <span [class]="meterTone(inst.cpuPercent)"><i [style.width.%]="inst.cpuPercent"></i></span>
                      <span [class]="meterTone(inst.ramPercent)"><i [style.width.%]="inst.ramPercent"></i></span>
                      <span [class]="meterTone(inst.diskPercent)"><i [style.width.%]="inst.diskPercent"></i></span>
                    </div>
                    <p class="hlth-inst-card__issue">{{ inst.primaryIssue }}</p>
                  </div>
                </button>
              } @empty {
                <p class="hlth-incidents-empty">Sin resultados con los filtros actuales.</p>
              }
            </div>
          </section>
        </div>

        <section class="hlth-panel hlth-incidents-panel">
          <header class="hlth-panel__head">
            <div>
              <h3>Informe de incidencias</h3>
              <p>Detalle del recurso y metadatos · incidencias activas</p>
            </div>
            <span class="hlth-count">{{ incidentReports().length }}</span>
          </header>

          @if (!incidentReports().length) {
            <p class="hlth-incidents-empty">No hay incidencias activas con los filtros actuales.</p>
          } @else {
            <div class="hlth-incidents">
              @for (row of incidentReports(); track row.id) {
                <article class="hlth-incident-report" [class]="'hlth-incident-report--' + row.severity">
                  <header class="hlth-incident-report__head">
                    <div class="hlth-incident-report__icon">
                      @if (row.logo) {
                        <app-brand-logo [logo]="row.logo" size="md" />
                      } @else {
                        <mat-icon>monitor_heart</mat-icon>
                      }
                    </div>
                    <div class="hlth-incident-report__title">
                      <h4>{{ row.name }}</h4>
                      <p>{{ row.resourceType }} · {{ row.provider }} · {{ row.region }}</p>
                      <div class="hlth-incident-report__badges">
                        <span class="sev" [class]="'sev--' + row.severity">{{ severityLabel(row.severity) }}</span>
                        <span class="hlth-incident-report__score" [class]="scoreToneClass(row.healthScore)">{{ row.healthScore }}% salud</span>
                        <span class="hlth-incident-report__id mono">{{ row.id }}</span>
                      </div>
                    </div>
                    <div class="hlth-incident-report__actions">
                      <button mat-stroked-button type="button" (click)="viewDetail(row)">
                        <mat-icon>visibility</mat-icon>
                        Ver
                      </button>
                      <a mat-stroked-button [routerLink]="row.route">Abrir recurso</a>
                    </div>
                  </header>

                  <app-health-resource-metadata-panel [record]="row" [compact]="true" />
                </article>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      width: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }

    .hlth-page {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      width: 100%;
      flex: 1 0 auto;
      padding-bottom: 1.25rem;
    }
    .hlth-empty-page {
      margin: 0;
      padding: 2rem 1rem;
      text-align: center;
      font-size: 0.82rem;
      color: var(--app-text-muted);
      border-radius: var(--app-radius-md);
      background: var(--app-card);
    }
    .hlth-hero {
      border-radius: var(--app-radius-md);
      background: var(--app-card);
      overflow: hidden;
    }
    .hlth-toolbar { display: flex; flex-direction: column; gap: 0.35rem; }
    .hlth-filters { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .hlth-filter {
      display: inline-flex; align-items: center; gap: 0.25rem;
      padding: 0.28rem 0.55rem; border-radius: 999px; border: none;
      background: color-mix(in srgb, var(--app-surface) 30%, var(--app-card));
      font-size: 0.64rem; font-weight: 750; cursor: pointer; font-family: inherit;
      em { font-style: normal; font-size: 0.58rem; color: var(--app-text-muted); }
    }
    .hlth-filter--active {
      background: color-mix(in srgb, var(--app-accent) 10%, var(--app-card));
      color: var(--app-accent);
    }

    .hlth-grid {
      display: grid;
      grid-template-columns: minmax(220px, 260px) minmax(260px, 1fr) minmax(0, 1.4fr);
      gap: 0.65rem;
    }
    .hlth-panel {
      padding: 0.65rem 0.75rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--app-surface) 18%, var(--app-card));
      min-width: 0;
      h3 { margin: 0 0 0.5rem; font-size: 0.82rem; font-weight: 850; }
      p { margin: 0.15rem 0 0; font-size: 0.6rem; color: var(--app-text-muted); }
    }
    .hlth-panel__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem; h3 { margin: 0; } }
    .hlth-count { font-size: 0.62rem; font-weight: 800; padding: 0.12rem 0.45rem; border-radius: 999px; background: color-mix(in srgb, #f59e0b 12%, transparent); color: #b45309; }

    .hlth-donut { position: relative; width: 130px; margin: 0 auto 0.55rem; }
    .hlth-donut svg { width: 100%; height: auto; display: block; }
    .hlth-donut__center {
      position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
      strong { font-size: 1.3rem; font-weight: 850; }
      span { font-size: 0.58rem; color: var(--app-text-muted); font-weight: 650; }
    }
    .hlth-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
    .hlth-legend li {
      display: flex; align-items: center; gap: 0.35rem; font-size: 0.66rem;
      strong { margin-left: auto; font-weight: 800; }
      em { font-style: normal; font-size: 0.58rem; color: var(--app-text-muted); min-width: 2rem; text-align: right; }
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
    .dot--ok { background: #10b981; }
    .dot--warn { background: #f59e0b; }
    .dot--crit { background: #ef4444; }
    .dot--down { background: #64748b; }

    .hlth-severity-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem; }
    .hlth-sev-card {
      display: flex; gap: 0.4rem; align-items: flex-start; padding: 0.45rem 0.5rem; border-radius: 9px;
      background: color-mix(in srgb, var(--app-card) 85%, transparent);
      border-left: 3px solid transparent;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; margin-top: 0.1rem; }
      strong { display: block; font-size: 1rem; font-weight: 850; line-height: 1; }
      span { display: block; font-size: 0.62rem; font-weight: 750; margin-top: 0.1rem; }
      p { margin: 0.2rem 0 0; font-size: 0.55rem; color: var(--app-text-muted); line-height: 1.35; }
      em { margin-left: auto; font-style: normal; font-size: 0.62rem; font-weight: 800; color: var(--app-text-muted); }
    }
    .hlth-sev-card--ok { border-left-color: #10b981; mat-icon { color: #10b981; } }
    .hlth-sev-card--warn { border-left-color: #f59e0b; mat-icon { color: #f59e0b; } }
    .hlth-sev-card--crit { border-left-color: #ef4444; mat-icon { color: #ef4444; } }
    .hlth-sev-card--down { border-left-color: #64748b; mat-icon { color: #64748b; } }

    .hlth-providers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem; }
    .hlth-provider {
      display: flex; gap: 0.45rem; padding: 0.45rem 0.5rem; border-radius: 9px;
      background: color-mix(in srgb, var(--app-card) 80%, transparent);
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: var(--app-text-muted); }
    }
    .hlth-provider__head { display: flex; justify-content: space-between; gap: 0.35rem; strong { font-size: 0.72rem; } span { font-size: 0.58rem; color: var(--app-accent); font-weight: 750; } }
    .hlth-provider__bar { display: flex; height: 5px; border-radius: 999px; overflow: hidden; margin: 0.3rem 0 0.2rem; background: color-mix(in srgb, var(--app-text) 6%, transparent); }
    .hlth-provider__seg--ok { background: #10b981; }
    .hlth-provider__seg--warn { background: #f59e0b; }
    .hlth-provider__seg--crit { background: #ef4444; }
    .hlth-provider__seg--down { background: #64748b; }
    .hlth-provider__meta { font-size: 0.55rem; color: var(--app-text-muted); font-weight: 600; }

    .hlth-inst-card__issue {
      margin: 0.3rem 0 0;
      font-size: 0.58rem;
      color: #b45309;
      font-weight: 650;
      line-height: 1.35;
    }

    .hlth-incidents-panel { margin-top: 0.15rem; }
    .hlth-incidents-empty {
      margin: 0;
      padding: 1rem 0.5rem;
      font-size: 0.75rem;
      color: var(--app-text-muted);
      font-style: italic;
      text-align: center;
    }
    .hlth-incidents { display: flex; flex-direction: column; gap: 0.75rem; }
    .hlth-incident-report {
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      background: var(--app-card);
      overflow: hidden;
      padding: 0.75rem 0.85rem 0.85rem;
    }
    .hlth-incident-report--warning { border-left: 3px solid #f59e0b; }
    .hlth-incident-report--critical { border-left: 3px solid #ef4444; }
    .hlth-incident-report--down { border-left: 3px solid #64748b; }
    .hlth-incident-report__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 0.65rem 1rem;
      padding: 0.75rem 0 0.65rem;
      margin-bottom: 0.15rem;
    }
    .hlth-incident-report__icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 14%, transparent);
      flex-shrink: 0;
      mat-icon { color: var(--app-accent); }
    }
    .hlth-incident-report__title { flex: 1; min-width: 180px; }
    .hlth-incident-report__title h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 750;
      letter-spacing: -0.02em;
    }
    .hlth-incident-report__title p {
      margin: 0.15rem 0 0;
      font-size: 0.78rem;
      color: var(--app-text-muted);
    }
    .hlth-incident-report__badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.4rem;
    }
    .hlth-incident-report__score {
      font-size: 0.62rem;
      font-weight: 800;
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .hlth-incident-report__id {
      font-size: 0.58rem;
      font-weight: 700;
      padding: 0.12rem 0.4rem;
      border-radius: 6px;
      background: color-mix(in srgb, var(--app-accent) 8%, transparent);
      color: var(--app-accent);
      max-width: 18ch;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mono { font-family: ui-monospace, 'JetBrains Mono', monospace; }
    .hlth-incident-report__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-left: auto;
      button, a { font-size: 0.68rem; min-height: 32px; }
      mat-icon { font-size: 16px; width: 16px; height: 16px; margin-right: 0.1rem; }
    }
    .hlth-split { display: grid; grid-template-columns: minmax(240px, 320px) minmax(0, 1fr); gap: 0.65rem; }
    .hlth-timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .hlth-timeline li {
      display: flex; gap: 0.45rem; font-size: 0.62rem; padding: 0.35rem 0.4rem; border-radius: 8px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
      time { font-weight: 750; color: var(--app-text); min-width: 2.5rem; }
    }
    .hlth-timeline__item--critical { border-left: 2px solid #ef4444; }
    .hlth-timeline__item--warning { border-left: 2px solid #f59e0b; }
    .hlth-timeline__empty { font-style: italic; color: var(--app-text-muted); border-left: none; }

    .hlth-instance-cards { display: flex; flex-direction: column; gap: 0.4rem; }
    .hlth-inst-card {
      display: flex; gap: 0.5rem; padding: 0.45rem 0.5rem; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      background: var(--app-card); cursor: pointer; text-align: left; font-family: inherit; width: 100%;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      &:hover { border-color: color-mix(in srgb, var(--app-accent) 35%, transparent); box-shadow: 0 2px 8px color-mix(in srgb, var(--app-text) 6%, transparent); }
    }
    .hlth-inst-card--warning { border-left: 3px solid #f59e0b; }
    .hlth-inst-card--critical { border-left: 3px solid #ef4444; }
    .hlth-inst-card--down { border-left: 3px solid #64748b; }
    .hlth-inst-card__score {
      flex-shrink: 0; width: 44px; height: 44px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: color-mix(in srgb, #10b981 12%, var(--app-card));
      strong { font-size: 0.85rem; font-weight: 850; line-height: 1; }
      span { font-size: 0.48rem; font-weight: 700; text-transform: uppercase; color: var(--app-text-muted); }
    }
    .hlth-inst-card__score--warn { background: color-mix(in srgb, #f59e0b 14%, var(--app-card)); }
    .hlth-inst-card__score--crit { background: color-mix(in srgb, #ef4444 14%, var(--app-card)); }
    .hlth-inst-card__score--down { background: color-mix(in srgb, #64748b 14%, var(--app-card)); }
    .hlth-inst-card__body { min-width: 0; flex: 1; }
    .hlth-inst-card__head { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; strong { font-size: 0.72rem; } }
    .hlth-inst-card__meta { display: block; font-size: 0.58rem; color: var(--app-text-muted); margin-top: 0.1rem; }
    .hlth-inst-card__meters { display: flex; gap: 3px; margin-top: 0.35rem; }
    .hlth-inst-card__meters span { flex: 1; height: 3px; border-radius: 999px; background: color-mix(in srgb, var(--app-text) 8%, transparent); overflow: hidden; }
    .hlth-inst-card__meters span i { display: block; height: 100%; border-radius: inherit; }
    .hlth-inst-card__meters .hlth-meter--ok i { background: #10b981; }
    .hlth-inst-card__meters .hlth-meter--warn i { background: #f59e0b; }
    .hlth-inst-card__meters .hlth-meter--crit i { background: #ef4444; }
    .hlth-inst-card__signals { display: flex; flex-wrap: wrap; gap: 0.2rem; margin-top: 0.3rem; }

    .hlth-chip { font-size: 0.52rem; font-weight: 750; padding: 0.06rem 0.32rem; border-radius: 999px; }
    .hlth-chip--healthy { background: color-mix(in srgb, #10b981 12%, transparent); color: #059669; }
    .hlth-chip--warning { background: color-mix(in srgb, #f59e0b 12%, transparent); color: #b45309; }
    .hlth-chip--critical, .hlth-chip--down { background: color-mix(in srgb, #ef4444 12%, transparent); color: #dc2626; }
    .hlth-chip--more { background: color-mix(in srgb, var(--app-text) 8%, transparent); color: var(--app-text-muted); }

    .hlth-cell-logo { display: inline-flex; align-items: center; gap: 0.3rem; }
    .hlth-rec { max-width: 22ch; font-size: 0.62rem; line-height: 1.35; }
    .hlth-link { padding: 0.18rem 0.4rem; border-radius: 6px; background: color-mix(in srgb, var(--app-accent) 10%, transparent); color: var(--app-accent); font-size: 0.6rem; font-weight: 700; text-decoration: none; }
    table small { display: block; font-size: 0.58rem; color: var(--app-text-muted); }

    .hlth-score { font-size: 0.72rem; font-weight: 850; font-variant-numeric: tabular-nums; }
    .hlth-score--ok { color: #059669; }
    .hlth-score--warn { color: #b45309; }
    .hlth-score--crit { color: #dc2626; }
    .hlth-score--down { color: #475569; }

    .hlth-meter-cell { min-width: 56px; span:first-child { display: block; font-size: 0.62rem; font-weight: 700; font-variant-numeric: tabular-nums; } }
    .hlth-meter { display: block; height: 3px; border-radius: 999px; margin-top: 0.15rem; background: color-mix(in srgb, var(--app-text) 8%, transparent); overflow: hidden; i { display: block; height: 100%; border-radius: inherit; } }
    .hlth-meter--ok i { background: #10b981; }
    .hlth-meter--warn i { background: #f59e0b; }
    .hlth-meter--crit i { background: #ef4444; }
    .hlth-signal-chips { display: flex; flex-wrap: wrap; gap: 0.15rem; }

    .sev { font-size: 0.58rem; font-weight: 800; padding: 0.12rem 0.4rem; border-radius: 999px; text-transform: uppercase; }
    .sev--healthy { background: color-mix(in srgb, #10b981 12%, transparent); color: #059669; }
    .sev--warning { background: color-mix(in srgb, #f59e0b 12%, transparent); color: #b45309; }
    .sev--critical { background: color-mix(in srgb, #ef4444 12%, transparent); color: #dc2626; }
    .sev--down { background: color-mix(in srgb, #64748b 14%, transparent); color: #475569; }

    @media (max-width: 1100px) {
      .hlth-grid, .hlth-split { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .hlth-severity-grid, .hlth-providers { grid-template-columns: 1fr; }
      .hlth-incident-report__actions { margin-left: 0; width: 100%; }
    }
  `,
})
export class HealthCenterPageComponent implements OnInit {
  private readonly demo = inject(DemoActionsService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)
  private readonly instancesSvc = inject(InstancesService)
  private readonly router = inject(Router)

  readonly loading = signal(true)
  readonly lastSync = signal(nowTime())
  readonly severityFilter = signal('')
  readonly providerFilter = signal('')
  readonly records = signal<InstanceHealthRecord[]>([])

  readonly summary = computed(() => summarizeHealth(this.records()))
  readonly severityBuckets = computed(() => healthCenterSeverityBuckets(this.summary()))
  readonly providers = computed(() => healthByProvider(this.records()))
  readonly timeline = computed(() => buildHealthTimeline(this.records()))
  readonly donutSegments = computed(() => buildHealthCenterDonutSegments(this.summary()))

  readonly incidentReports = computed(() => this.filteredRecords())

  readonly severityFilters = computed(() => {
    const s = this.summary()
    return [
      { key: '', label: 'Todas', count: s.total },
      { key: 'critical', label: 'Críticas', count: s.critical },
      { key: 'warning', label: 'Advertencias', count: s.warning },
    ]
  })

  readonly filteredRecords = computed(() => {
    let list = this.records()
    const sev = this.severityFilter()
    const prov = this.providerFilter()
    if (sev) list = list.filter((r) => r.severity === sev)
    if (prov) list = list.filter((r) => r.provider === prov)
    return [...list].sort((a, b) => {
      const order: Record<InstanceHealthSeverity, number> = { critical: 0, down: 1, warning: 2, healthy: 3 }
      return order[a.severity] - order[b.severity] || a.healthScore - b.healthScore
    })
  })

  readonly lastSyncLabel = computed(() => `Chequeo ${this.lastSync()}`)
  readonly severityLabel = severityLabel
  readonly instanceProviderTypeLabel = instanceProviderTypeLabel

  ngOnInit(): void {
    this.loadInstances()
  }

  private loadInstances = (onDone?: () => void): void => {
    this.instancesSvc
      .list()
      .pipe(catchError(() => of([] as Instance[])))
      .subscribe((instances) => {
        this.records.set(filterHealthCenterRecords(buildHealthRecordsFromInstances(instances)))
        of(true)
          .pipe(delay(200))
          .subscribe(() => {
            this.loading.set(false)
            onDone?.()
          })
      })
  }

  setSeverityFilter = (key: string): void => this.severityFilter.set(key)
  setProviderFilter = (key: string): void => this.providerFilter.set(key)

  scoreToneClass = (score: number): string => {
    if (score >= 85) return 'hlth-score--ok'
    if (score >= 65) return 'hlth-score--warn'
    if (score >= 40) return 'hlth-score--crit'
    return 'hlth-score--down'
  }

  instScoreClass = (score: number): string => {
    if (score >= 85) return 'hlth-inst-card__score'
    if (score >= 65) return 'hlth-inst-card__score hlth-inst-card__score--warn'
    if (score >= 40) return 'hlth-inst-card__score hlth-inst-card__score--crit'
    return 'hlth-inst-card__score hlth-inst-card__score--down'
  }

  meterTone = (usage: number): string => {
    if (usage >= 88) return 'hlth-meter--crit'
    if (usage >= 72) return 'hlth-meter--warn'
    return 'hlth-meter--ok'
  }

  handleHeader = (label: string): void => {
    if (label === 'Ver instancias') {
      void this.router.navigateByUrl('/instances/all-instances')
      return
    }
    if (label === 'Ejecutar chequeo') {
      this.loading.set(true)
      this.loadInstances(() => {
        this.lastSync.set(nowTime())
        const s = this.summary()
        this.toast.success(`Chequeo completado · ${s.total} incidencias · salud media ${s.avgScore}%`)
      })
      return
    }
    this.demo.simulate(`Centro de salud: ${label}`, 600, `${label} completado`).subscribe()
  }

  viewDetail = (row: InstanceHealthRecord): void => {
    this.dialog.open(HealthIncidentDetailDialogComponent, {
      width: 'min(860px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      data: { record: row },
    })
  }
}
