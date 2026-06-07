import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import type { ExplorerResourceRich } from '../overview/overview-pages.demo'

export interface ResourceExplorerDetailDialogData {
  resource: ExplorerResourceRich
}

export interface ResourceExplorerDetailDialogResult {
  selectId?: string
}

type MetricRange = '1h' | '6h' | '24h'

interface DashSeries {
  label: string
  color: string
  current: string
  usage?: number
  avg: number
  peak: number
  min: number
  points: number[]
  linePath: string
  areaPath: string
  sparkPath: string
  sparkAreaPath: string
}

@Component({
  selector: 'app-resource-explorer-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    BrandLogoComponent,
    StatusBadgeComponent,
  ],
  template: `
    <div class="exp-detail" [attr.data-health]="resource.health ?? 'unknown'">
      <p class="exp-detail__eyebrow">Detalle completo del recurso</p>

      <header class="exp-detail__head">
        <div class="exp-detail__head-main">
          <div class="exp-detail__title-row">
            @if (resource.logo) {
              <app-brand-logo [logo]="resource.logo" size="lg" />
            } @else {
              <span class="exp-detail__icon-fallback"><mat-icon>dns</mat-icon></span>
            }
            <div class="exp-detail__title-text">
              <h2 mat-dialog-title>{{ resource.name }}</h2>
              <p class="exp-detail__subtitle">{{ resource.type }} · {{ resource.provider }} · {{ resource.region }}</p>
            </div>
            @if (resource.health) {
              <span class="exp-detail__health exp-detail__health--inline" [class]="'exp-detail__health--' + resource.health">
                {{ healthLabel(resource.health) }}
              </span>
            }
          </div>
          <div class="exp-detail__chips">
            <app-status-badge [value]="resource.status" />
            @if (resource.environment) {
              <span class="exp-detail__chip exp-detail__chip--env">{{ envLabel(resource.environment) }}</span>
            }
            @if (resource.risk) {
              <span class="exp-detail__chip" [class]="'exp-detail__chip--risk-' + resource.risk">
                Riesgo {{ riskLabel(resource.risk) }}
              </span>
            }
            @if (resource.alertsActive) {
              <span class="exp-detail__chip exp-detail__chip--alert">
                <mat-icon>notifications_active</mat-icon>
                {{ resource.alertsActive }} alerta{{ resource.alertsActive === 1 ? '' : 's' }}
              </span>
            }
            <span class="exp-detail__chip mono">{{ resource.id }}</span>
          </div>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content class="exp-detail__body">
        @if (metricKpis().length) {
          <section class="exp-detail__section" aria-label="Métricas clave">
            <div class="exp-detail__kpis">
              @for (m of metricKpis(); track m.label) {
                <article class="exp-detail__kpi">
                  <span class="exp-detail__kpi-label">{{ m.label }}</span>
                  <strong>{{ m.value }}</strong>
                  @if (m.usage !== undefined) {
                    <div class="exp-detail__bar" aria-hidden="true">
                      <span [style.width.%]="m.usage" [class]="barTone(m.usage)"></span>
                    </div>
                  }
                </article>
              }
            </div>
          </section>
        }

        <section class="exp-detail__section" aria-label="Información del recurso">
          <div class="exp-detail__grid">
          <section class="exp-detail__panel">
            <h3><mat-icon>badge</mat-icon> Identidad</h3>
            <dl class="exp-detail__dl">
              <dt>Tipo</dt><dd>{{ resource.type }}</dd>
              <dt>Proveedor</dt><dd>{{ resource.provider }}</dd>
              <dt>Cuenta</dt><dd>{{ resource.account ?? '—' }}</dd>
              <dt>Región</dt><dd>{{ resource.region }}</dd>
              <dt>Módulo origen</dt><dd>{{ resource.module ?? '—' }}</dd>
              <dt>ARN / ID cloud</dt><dd class="mono">{{ resource.resourceArn ?? resource.id }}</dd>
              <dt>Creado</dt><dd>{{ resource.createdAt ?? '—' }}</dd>
            </dl>
          </section>

          <section class="exp-detail__panel">
            <h3><mat-icon>settings</mat-icon> Operación</h3>
            <dl class="exp-detail__dl">
              <dt>Estado</dt><dd><app-status-badge [value]="resource.status" /></dd>
              <dt>Salud</dt><dd>{{ resource.health ? healthLabel(resource.health) : '—' }}</dd>
              <dt>Propietario</dt><dd>{{ resource.owner ?? '—' }}</dd>
              <dt>Equipo</dt><dd>{{ resource.team ?? '—' }}</dd>
              <dt>Último sync</dt><dd>{{ resource.lastSync ?? '—' }}</dd>
              <dt>Fuente sync</dt><dd>{{ resource.syncSource ?? '—' }}</dd>
              <dt>Compliance</dt><dd>{{ resource.compliance ?? '—' }}</dd>
            </dl>
          </section>

          <section class="exp-detail__panel">
            <h3><mat-icon>memory</mat-icon> Infraestructura</h3>
            <dl class="exp-detail__dl">
              <dt>Descripción</dt><dd>{{ resource.detail }}</dd>
              <dt>IP</dt><dd class="mono">{{ resource.ip ?? '—' }}</dd>
              <dt>CPU</dt><dd>{{ resource.cpu ?? '—' }}</dd>
              <dt>Memoria</dt><dd>{{ resource.memory ?? '—' }}</dd>
              <dt>Disco</dt><dd>{{ resource.disk ?? '—' }}</dd>
              <dt>Red</dt><dd>{{ resource.network ?? '—' }}</dd>
              <dt>Puertos</dt><dd class="mono">{{ resource.openPorts ?? '—' }}</dd>
              <dt>Uptime</dt><dd>{{ resource.uptime ?? '—' }}</dd>
            </dl>
          </section>

          <section class="exp-detail__panel">
            <h3><mat-icon>payments</mat-icon> Costes</h3>
            <dl class="exp-detail__dl">
              <dt>Coste estimado</dt><dd class="exp-detail__cost">{{ resource.cost ?? '—' }}</dd>
              <dt>Entorno</dt><dd>{{ resource.environment ? envLabel(resource.environment) : '—' }}</dd>
              <dt>Riesgo</dt><dd>{{ resource.risk ? riskLabel(resource.risk) : '—' }}</dd>
            </dl>
            @if (tagList().length) {
              <h4 class="exp-detail__tags-title">Etiquetas</h4>
              <div class="exp-detail__tags">
                @for (tag of tagList(); track tag) {
                  <span class="exp-detail__tag">{{ tag }}</span>
                }
              </div>
            }
          </section>
        </div>
        </section>

        @if (dashboardSeries().length) {
          <section class="rt-section" aria-label="Métricas en tiempo real">
            <header class="rt-section__head">
              <div>
                <h3 class="rt-section__title">
                  <mat-icon>monitoring</mat-icon>
                  Métricas en tiempo real
                </h3>
                <p class="rt-section__sub">Periodo: {{ rangeLabel() }} · Sync {{ resource.lastSync ?? 'ahora' }}</p>
              </div>
              <div class="rt-section__tools">
                <span class="rt-live"><i aria-hidden="true"></i> En vivo</span>
                <div class="rt-range" role="group" aria-label="Rango temporal">
                  @for (r of rangeOptions; track r.key) {
                    <button
                      type="button"
                      class="rt-range__btn"
                      [class.rt-range__btn--active]="metricRange() === r.key"
                      (click)="setMetricRange(r.key)"
                    >
                      {{ r.label }}
                    </button>
                  }
                </div>
              </div>
            </header>

            <div class="rt-cards" role="list">
              @for (s of dashboardSeries(); track s.label) {
                <article class="rt-card" [class]="metricCardTone(s.usage)" role="listitem">
                  <div class="rt-card__top">
                    <span class="rt-card__dot" [style.background]="s.color"></span>
                    <span class="rt-card__label">{{ s.label }}</span>
                  </div>
                  <strong class="rt-card__value">{{ s.current }}</strong>
                  @if (s.usage !== undefined) {
                    <div class="rt-card__bar" aria-hidden="true">
                      <span [style.width.%]="s.usage" [class]="barTone(s.usage)"></span>
                    </div>
                  }
                  <dl class="rt-card__stats">
                    <div><dt>Media</dt><dd>{{ s.avg }}%</dd></div>
                    <div><dt>Pico</dt><dd>{{ s.peak }}%</dd></div>
                    <div><dt>Mín.</dt><dd>{{ s.min }}%</dd></div>
                  </dl>
                  <svg class="rt-card__spark" viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden="true">
                    <path class="rt-card__spark-area" [attr.d]="s.sparkAreaPath" [attr.fill]="s.color" />
                    <path class="rt-card__spark-line" [attr.d]="s.sparkPath" [attr.stroke]="s.color" />
                  </svg>
                </article>
              }
            </div>

            <article class="rt-chart">
              <div class="rt-chart__head">
                <strong>Evolución {{ rangeLabel() }}</strong>
                <span>{{ dashboardSeries().length }} métricas</span>
              </div>
              <div class="rt-chart__body">
                <div class="rt-chart__y" aria-hidden="true">
                  <span>100%</span>
                  <span>50%</span>
                  <span>0%</span>
                </div>
                <div class="rt-chart__plot">
                  <svg viewBox="0 0 520 160" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                    @for (y of chartGridLines; track y) {
                      <line class="rt-chart__grid" x1="0" [attr.y1]="y" x2="520" [attr.y2]="y" />
                    }
                    @for (s of dashboardSeries(); track s.label + '-area') {
                      <path class="rt-chart__area" [attr.d]="s.areaPath" [attr.fill]="s.color" />
                    }
                    @for (s of dashboardSeries(); track s.label + '-line') {
                      <path class="rt-chart__line" [attr.d]="s.linePath" [attr.stroke]="s.color" />
                    }
                  </svg>
                  <div class="rt-chart__x" aria-hidden="true">
                    @for (t of chartTimeLabels(); track t) {
                      <span>{{ t }}</span>
                    }
                  </div>
                </div>
              </div>
              <ul class="rt-chart__legend">
                @for (s of dashboardSeries(); track s.label) {
                  <li>
                    <i [style.background]="s.color"></i>
                    {{ s.label }}
                    <em>media {{ s.avg }}%</em>
                  </li>
                }
              </ul>
            </article>

            <footer class="rt-summary" aria-label="Resumen del periodo">
              <article class="rt-summary__item rt-summary__item--highlight">
                <mat-icon>functions</mat-icon>
                <div>
                  <span>Media global</span>
                  <strong>{{ periodSummary().avg }}%</strong>
                </div>
              </article>
              <article class="rt-summary__item">
                <mat-icon>trending_up</mat-icon>
                <div>
                  <span>Pico máximo</span>
                  <strong>{{ periodSummary().peak }}%</strong>
                </div>
              </article>
              <article class="rt-summary__item">
                <mat-icon>trending_down</mat-icon>
                <div>
                  <span>Mínimo</span>
                  <strong>{{ periodSummary().min }}%</strong>
                </div>
              </article>
              <article class="rt-summary__item">
                <mat-icon>timeline</mat-icon>
                <div>
                  <span>Muestras</span>
                  <strong>{{ periodSummary().samples }}</strong>
                </div>
              </article>
            </footer>
          </section>
        }

        <section class="exp-detail__section" aria-label="Relaciones y eventos">
        <div class="exp-detail__split">
          @if (resource.dependencies?.length) {
            <section class="exp-detail__panel">
              <h3><mat-icon>hub</mat-icon> Recursos relacionados</h3>
              <ul class="exp-detail__relations">
                @for (dep of resource.dependencies!; track dep.id) {
                  <li>
                    <button type="button" class="exp-detail__rel" (click)="handleSelectRelated(dep.id)">
                      <mat-icon>link</mat-icon>
                      <div>
                        <strong>{{ dep.name }}</strong>
                        <span>{{ dep.relation }}</span>
                      </div>
                      <mat-icon class="exp-detail__rel-arrow">chevron_right</mat-icon>
                    </button>
                  </li>
                }
              </ul>
            </section>
          }

          @if (resource.events?.length) {
            <section class="exp-detail__panel">
              <h3><mat-icon>history</mat-icon> Eventos recientes</h3>
              <ul class="exp-detail__events">
                @for (ev of resource.events!; track ev.time + ev.message) {
                  <li [class]="'exp-detail__event--' + ev.severity">
                    <time>{{ ev.time }}</time>
                    <span>{{ ev.message }}</span>
                  </li>
                }
              </ul>
            </section>
          }
        </div>
        </section>
      </mat-dialog-content>

      <mat-dialog-actions class="exp-detail__actions">
        <button mat-stroked-button type="button" (click)="handleCopyId()">
          <mat-icon>content_copy</mat-icon>
          Copiar ID
        </button>
        @if (resource.route) {
          <a mat-stroked-button [routerLink]="resource.route" mat-dialog-close>
            <mat-icon>open_in_new</mat-icon>
            Abrir módulo
          </a>
        }
        <button mat-flat-button color="primary" type="button" mat-dialog-close>
          Cerrar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding-top: 0.65rem;
    }
    :host ::ng-deep .mat-mdc-dialog-title::before { display: none; }
    .exp-detail { min-width: min(920px, 94vw); }
    .exp-detail__eyebrow {
      margin: 0 0 1rem;
      padding: 0.15rem 0 0;
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1.45;
      letter-spacing: 0.01em;
      color: var(--app-text-muted);
    }
    .exp-detail__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0 0.5rem 1.15rem 0;
      margin-bottom: 0.25rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
    }
    .exp-detail__head-main { flex: 1; min-width: 0; }
    .exp-detail__title-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .exp-detail__title-text { flex: 1; min-width: 0; }
    .exp-detail__health--inline { margin-left: auto; flex-shrink: 0; }
    .exp-detail__health {
      font-size: 0.58rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      text-transform: uppercase;
    }
    .exp-detail__health--healthy { background: color-mix(in srgb, #10b981 14%, transparent); color: #059669; }
    .exp-detail__health--warning { background: color-mix(in srgb, #f59e0b 14%, transparent); color: #b45309; }
    .exp-detail__health--critical { background: color-mix(in srgb, #ef4444 14%, transparent); color: #dc2626; }
    h2[mat-dialog-title] {
      margin: 0;
      padding: 0;
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      line-height: 1.3;
      overflow: visible;
    }
    .exp-detail__icon-fallback {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 10%, var(--app-card));
    }
    .exp-detail__subtitle {
      margin: 0.15rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
      font-weight: 650;
    }
    .exp-detail__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.5rem;
      align-items: center;
    }
    .exp-detail__chip {
      font-size: 0.6rem;
      font-weight: 750;
      padding: 0.18rem 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 5%, var(--app-card));
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .exp-detail__chip--env { background: color-mix(in srgb, #3b82f6 10%, transparent); color: #2563eb; }
    .exp-detail__chip--risk-low { background: color-mix(in srgb, #10b981 10%, transparent); color: #059669; }
    .exp-detail__chip--risk-medium { background: color-mix(in srgb, #f59e0b 10%, transparent); color: #b45309; }
    .exp-detail__chip--risk-high { background: color-mix(in srgb, #ef4444 10%, transparent); color: #dc2626; }
    .exp-detail__chip--alert { background: color-mix(in srgb, #ef4444 10%, transparent); color: #dc2626; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; word-break: break-all; }
    :host ::ng-deep mat-dialog-content.exp-detail__body {
      padding: 1rem 0 0.35rem;
      max-height: min(74vh, 720px);
      display: flex;
      flex-direction: column;
      gap: 1.35rem;
    }
    .exp-detail__section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .exp-detail__section-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .exp-detail__section-head h3 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0;
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
      mat-icon { font-size: 17px; width: 17px; height: 17px; }
    }
    .exp-detail__section-sub {
      margin: 0.2rem 0 0;
      font-size: 0.65rem;
      color: var(--app-text-muted);
      font-weight: 600;
    }

    /* —— Métricas en tiempo real (rediseño) —— */
    .rt-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem 1.05rem;
      border-radius: 14px;
      background: color-mix(in srgb, var(--app-surface) 20%, var(--app-card));
    }
    .rt-section__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .rt-section__title {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0;
      font-size: 0.82rem;
      font-weight: 800;
      color: inherit;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--app-accent); }
    }
    .rt-section__sub {
      margin: 0.25rem 0 0;
      font-size: 0.68rem;
      color: var(--app-text-muted);
      font-weight: 600;
    }
    .rt-section__tools {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-wrap: wrap;
    }
    .rt-live {
      display: inline-flex;
      align-items: center;
      gap: 0.32rem;
      font-size: 0.62rem;
      font-weight: 750;
      color: #059669;
    }
    .rt-live i {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #10b981;
      animation: rt-pulse 1.8s ease-in-out infinite;
    }
    @keyframes rt-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }
    .rt-range {
      display: inline-flex;
      gap: 0.15rem;
      padding: 0.18rem;
      border-radius: 9px;
      background: color-mix(in srgb, var(--app-text) 5%, var(--app-card));
    }
    .rt-range__btn {
      padding: 0.28rem 0.55rem;
      border: none;
      border-radius: 7px;
      background: transparent;
      font-size: 0.65rem;
      font-weight: 750;
      cursor: pointer;
      color: var(--app-text-muted);
    }
    .rt-range__btn--active {
      background: var(--app-card);
      color: var(--app-accent);
      box-shadow: 0 1px 3px color-mix(in srgb, var(--app-text) 8%, transparent);
    }

    .rt-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
      gap: 0.65rem;
    }
    .rt-card {
      padding: 0.65rem 0.7rem 0.55rem;
      border-radius: 11px;
      background: var(--app-card);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .rt-card--warn { background: color-mix(in srgb, #f59e0b 5%, var(--app-card)); }
    .rt-card--crit { background: color-mix(in srgb, #ef4444 5%, var(--app-card)); }
    .rt-card__top {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .rt-card__dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      flex-shrink: 0;
    }
    .rt-card__label {
      font-size: 0.65rem;
      font-weight: 750;
      color: var(--app-text-muted);
    }
    .rt-card__value {
      font-size: 1.05rem;
      font-weight: 850;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .rt-card__bar {
      height: 6px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      overflow: hidden;
    }
    .rt-card__bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      min-width: 3px;
    }
    .rt-card__stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.25rem;
      margin: 0.15rem 0 0;
      padding-top: 0.4rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .rt-card__stats div { text-align: center; }
    .rt-card__stats dt {
      display: block;
      font-size: 0.52rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-text-muted);
      letter-spacing: 0.03em;
    }
    .rt-card__stats dd {
      margin: 0.1rem 0 0;
      font-size: 0.72rem;
      font-weight: 850;
    }
    .rt-card__spark {
      width: 100%;
      height: 28px;
      margin-top: 0.15rem;
      display: block;
    }
    .rt-card__spark-area { opacity: 0.12; }
    .rt-card__spark-line {
      fill: none;
      stroke-width: 1.75;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .rt-chart {
      padding: 0.75rem 0.8rem;
      border-radius: 11px;
      background: var(--app-card);
    }
    .rt-chart__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 0.55rem;
      strong { font-size: 0.74rem; font-weight: 800; }
      span { font-size: 0.62rem; color: var(--app-text-muted); font-weight: 650; }
    }
    .rt-chart__body {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 0.35rem;
      align-items: stretch;
    }
    .rt-chart__y {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 4px 0 22px;
      span { font-size: 0.52rem; font-weight: 700; color: var(--app-text-muted); text-align: right; }
    }
    .rt-chart__plot svg {
      width: 100%;
      height: auto;
      min-height: 140px;
      display: block;
    }
    .rt-chart__grid {
      stroke: color-mix(in srgb, var(--app-text) 8%, transparent);
      stroke-width: 1;
      stroke-dasharray: 4 6;
    }
    .rt-chart__area { opacity: 0.1; }
    .rt-chart__line {
      fill: none;
      stroke-width: 2.25;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .rt-chart__x {
      display: flex;
      justify-content: space-between;
      margin-top: 0.35rem;
      padding: 0 0.15rem;
      span { font-size: 0.55rem; color: var(--app-text-muted); font-weight: 650; }
    }
    .rt-chart__legend {
      list-style: none;
      margin: 0.65rem 0 0;
      padding: 0.65rem 0 0;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      li {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.65rem;
        font-weight: 700;
        i { width: 8px; height: 8px; border-radius: 999px; }
        em { font-style: normal; font-size: 0.58rem; color: var(--app-text-muted); font-weight: 650; margin-left: 0.15rem; }
      }
    }

    .rt-summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.55rem;
      padding-top: 0.85rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 7%, transparent);
    }
    .rt-summary__item {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 0.6rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-text) 3%, var(--app-card));
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--app-accent); opacity: 0.8; }
      span { display: block; font-size: 0.55rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--app-text-muted); }
      strong { display: block; font-size: 0.88rem; font-weight: 850; margin-top: 0.1rem; letter-spacing: -0.02em; }
    }
    .rt-summary__item--highlight {
      background: color-mix(in srgb, var(--app-accent) 8%, var(--app-card));
      strong { color: var(--app-accent); font-size: 1rem; }
    }
    .exp-detail__kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-surface) 25%, var(--app-card));
      overflow: hidden;
    }
    .exp-detail__kpi {
      padding: 0.45rem 0.55rem;
      position: relative;
    }
    .exp-detail__kpi:not(:last-child) {
      border-right: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .exp-detail__kpi-label {
      display: block;
      font-size: 0.55rem;
      font-weight: 750;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .exp-detail__kpi strong {
      display: block;
      font-size: 0.95rem;
      font-weight: 850;
      margin: 0.1rem 0 0.25rem;
    }
    .exp-detail__bar {
      height: 8px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 10%, transparent);
      overflow: hidden;
      margin-top: 0.15rem;
    }
    .exp-detail__bar--lg { height: 10px; margin-top: 0.35rem; }
    .exp-detail__bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      transition: width 0.3s ease;
      min-width: 4px;
    }
    .exp-detail__bar span.bar--ok { background: linear-gradient(90deg, #059669, #10b981); }
    .exp-detail__bar span.bar--warn { background: linear-gradient(90deg, #d97706, #f59e0b); }
    .exp-detail__bar span.bar--crit { background: linear-gradient(90deg, #dc2626, #ef4444); }
    .exp-detail__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }
    .exp-detail__panel {
      padding: 0.7rem 0.75rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-surface) 18%, var(--app-card));
    }
    .exp-detail__panel--wide { grid-column: 1 / -1; }
    .exp-detail__panel h3 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.45rem;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .exp-detail__dl {
      display: grid;
      grid-template-columns: minmax(100px, 120px) 1fr;
      gap: 0.35rem 0.65rem;
      margin: 0;
    }
    .exp-detail__dl dt {
      font-size: 0.62rem;
      font-weight: 700;
      color: var(--app-text-muted);
    }
    .exp-detail__dl dd {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 650;
      word-break: break-word;
    }
    .exp-detail__cost { font-size: 0.85rem !important; font-weight: 800 !important; color: var(--app-accent); }
    .exp-detail__tags-title {
      margin: 0.55rem 0 0.35rem;
      font-size: 0.62rem;
      font-weight: 750;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .exp-detail__tags { display: flex; flex-wrap: wrap; gap: 0.28rem; }
    .exp-detail__tag {
      font-size: 0.58rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: 6px;
      background: color-mix(in srgb, var(--app-accent) 8%, transparent);
      color: var(--app-accent);
    }
    .exp-detail__split {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }
    .exp-detail__relations {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.28rem;
    }
    .exp-detail__rel {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      width: 100%;
      padding: 0.35rem 0.45rem;
      border: none;
      border-radius: 8px;
      background: color-mix(in srgb, var(--app-text) 4%, transparent);
      cursor: pointer;
      text-align: left;
      color: inherit;
      strong { display: block; font-size: 0.72rem; }
      span { font-size: 0.58rem; color: var(--app-text-muted); font-weight: 650; }
      mat-icon:first-child { font-size: 16px; width: 16px; height: 16px; color: var(--app-accent); }
    }
    .exp-detail__rel:hover { background: color-mix(in srgb, var(--app-accent) 8%, transparent); }
    .exp-detail__rel-arrow { margin-left: auto; opacity: 0.5; font-size: 18px !important; width: 18px !important; height: 18px !important; }
    .exp-detail__events {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .exp-detail__events li {
      display: grid;
      grid-template-columns: 52px 1fr;
      gap: 0.45rem;
      align-items: start;
      font-size: 0.68rem;
      padding: 0.3rem 0.4rem;
      border-radius: 6px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .exp-detail__events time {
      font-size: 0.58rem;
      font-weight: 800;
      color: var(--app-text-muted);
    }
    .exp-detail__event--warning { border-left: 2px solid #f59e0b; }
    .exp-detail__event--critical { border-left: 2px solid #ef4444; }
    .exp-detail__event--info { border-left: 2px solid #3b82f6; }
    .exp-detail__actions {
      padding: 1rem 0 0.35rem;
      margin-top: 0.35rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      gap: 0.35rem;
    }
    @media (max-width: 760px) {
      .exp-detail { min-width: auto; }
      .exp-detail__grid, .exp-detail__split, .exp-detail__kpis, .rt-summary, .rt-cards {
        grid-template-columns: 1fr;
      }
      .exp-detail__kpi { border-right: none !important; }
    }
  `,
})
export class ResourceExplorerDetailDialogComponent {
  readonly data = inject<ResourceExplorerDetailDialogData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<ResourceExplorerDetailDialogComponent, ResourceExplorerDetailDialogResult>)
  private readonly toast = inject(ToastService)

  readonly resource = this.data.resource
  readonly metricRange = signal<MetricRange>('1h')
  readonly chartGridLines = [40, 80, 120]
  readonly rangeOptions: { key: MetricRange; label: string }[] = [
    { key: '1h', label: '1 h' },
    { key: '6h', label: '6 h' },
    { key: '24h', label: '24 h' },
  ]

  private readonly seriesColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

  metricKpis = (): { label: string; value: string; usage?: number }[] => {
    const r = this.resource
    const items: { label: string; value: string; usage?: number }[] = []
    if (r.cpu) items.push({ label: 'CPU', value: r.cpu, usage: parseInt(r.cpu, 10) || undefined })
    if (r.memory) items.push({ label: 'Memoria', value: r.memory })
    if (r.uptime) items.push({ label: 'Uptime', value: r.uptime })
    if (r.cost) items.push({ label: 'Coste', value: r.cost })
    if (!items.length && r.alertsActive !== undefined) {
      items.push({ label: 'Alertas', value: String(r.alertsActive) })
    }
    return items.slice(0, 4)
  }

  tagList = (): string[] => {
    if (!this.resource.tags) return []
    return this.resource.tags.split(',').map((t) => t.trim()).filter(Boolean)
  }

  setMetricRange = (range: MetricRange): void => {
    this.metricRange.set(range)
  }

  rangeLabel = (): string => {
    const map: Record<MetricRange, string> = { '1h': 'última hora', '6h': 'últimas 6 h', '24h': 'últimas 24 h' }
    return map[this.metricRange()]
  }

  chartTimeLabels = (): string[] => {
    const range = this.metricRange()
    if (range === '24h') return ['00:00', '06:00', '12:00', '18:00', 'Ahora']
    if (range === '6h') return ['-6 h', '-4 h', '-2 h', 'Ahora']
    return ['-60 m', '-45 m', '-30 m', '-15 m', 'Ahora']
  }

  dashboardSeries = (): DashSeries[] => {
    const metrics = this.resolveMetrics()
    if (!metrics.length) return []
    const range = this.metricRange()
    const pointCount = range === '24h' ? 24 : range === '6h' ? 18 : 12
    return metrics.map((m, idx) => {
      const usage = m.usage ?? this.parseUsage(m.value)
      const points = this.generatePoints(m.label, usage, pointCount, range)
      const avg = Math.round(points.reduce((a, b) => a + b, 0) / points.length)
      const peak = Math.max(...points)
      const min = Math.min(...points)
      const main = this.buildSeriesPaths(points, 520, 160)
      const spark = this.buildSeriesPaths(points, 120, 28)
      return {
        label: m.label,
        color: this.seriesColors[idx % this.seriesColors.length],
        current: m.value,
        usage,
        avg,
        peak,
        min,
        points,
        linePath: main.line,
        areaPath: main.area,
        sparkPath: spark.line,
        sparkAreaPath: spark.area,
      }
    })
  }

  periodSummary = (): { avg: number; peak: number; min: number; samples: number } => {
    const series = this.dashboardSeries()
    const allPoints = series.flatMap((s) => s.points)
    const range = this.metricRange()
    const samples = range === '24h' ? 288 : range === '6h' ? 72 : 60
    if (!allPoints.length) return { avg: 0, peak: 0, min: 0, samples }
    return {
      avg: Math.round(allPoints.reduce((a, b) => a + b, 0) / allPoints.length),
      peak: Math.max(...allPoints),
      min: Math.min(...allPoints),
      samples,
    }
  }

  metricCardTone = (usage?: number): string => {
    if (usage === undefined) return ''
    if (usage >= 85) return 'rt-card--crit'
    if (usage >= 65) return 'rt-card--warn'
    return ''
  }

  barTone = (usage: number): string => {
    if (usage >= 85) return 'bar--crit'
    if (usage >= 65) return 'bar--warn'
    return 'bar--ok'
  }

  private resolveMetrics = (): { label: string; value: string; usage?: number }[] => {
    if (this.resource.metrics?.length) return this.resource.metrics
    const fallback: { label: string; value: string; usage?: number }[] = []
    if (this.resource.cpu) fallback.push({ label: 'CPU', value: this.resource.cpu, usage: this.parseUsage(this.resource.cpu) })
    if (this.resource.memory) fallback.push({ label: 'Memoria', value: this.resource.memory, usage: this.parseUsage(this.resource.memory) })
    if (this.resource.uptime) fallback.push({ label: 'Disponibilidad', value: this.resource.uptime, usage: 96 })
    return fallback.slice(0, 4)
  }

  private parseUsage = (value: string): number | undefined => {
    const match = value.match(/([\d.]+)\s*%/)
    return match ? Math.round(Number(match[1])) : undefined
  }

  private seedFrom = (label: string): number => {
    const base = `${this.resource.id}-${label}`.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    return base % 997
  }

  private generatePoints = (label: string, endUsage: number | undefined, count: number, range: MetricRange): number[] => {
    const seed = this.seedFrom(label)
    const end = endUsage ?? 40 + (seed % 35)
    const variance = range === '24h' ? 18 : range === '6h' ? 14 : 10
    const points: number[] = []
    for (let i = 0; i < count; i++) {
      const wave = Math.sin((i + seed % 7) * 0.65) * variance * 0.35
      const drift = ((i / Math.max(count - 1, 1)) - 0.5) * variance * 0.4
      const noise = ((seed * (i + 3)) % 11) - 5
      const value = end + wave + drift + noise * 0.35
      points.push(Math.max(4, Math.min(100, Math.round(value))))
    }
    points[points.length - 1] = Math.max(4, Math.min(100, Math.round(end)))
    return points
  }

  private buildSeriesPaths = (points: number[], width: number, height: number): { line: string; area: string } => {
    const padX = 8
    const padY = height <= 40 ? 3 : 12
    const max = 100
    const min = 0
    const chartH = height - padY * 2
    const coords = points.map((p, i) => {
      const x = padX + (i / Math.max(points.length - 1, 1)) * (width - padX * 2)
      const y = padY + (1 - (p - min) / (max - min || 1)) * chartH
      return { x, y }
    })
    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
    const baseline = height - padY
    const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${baseline} L ${coords[0].x.toFixed(1)} ${baseline} Z`
    return { line, area }
  }

  healthLabel = (h: string): string => {
    const map: Record<string, string> = { healthy: 'Sana', warning: 'Advertencia', critical: 'Crítica' }
    return map[h] ?? h
  }

  envLabel = (e: string): string => {
    const map: Record<string, string> = { production: 'Producción', staging: 'Staging', development: 'Desarrollo' }
    return map[e] ?? e
  }

  riskLabel = (r: string): string => {
    const map: Record<string, string> = { low: 'bajo', medium: 'medio', high: 'alto' }
    return map[r] ?? r
  }

  handleCopyId = (): void => {
    const text = this.resource.resourceArn ?? this.resource.id
    void navigator.clipboard.writeText(text).then(() => {
      this.toast.success('ID copiado al portapapeles')
    })
  }

  handleSelectRelated = (id: string): void => {
    this.dialogRef.close({ selectId: id })
  }
}
