import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { DecimalPipe } from '@angular/common'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import {
  KIND_ICONS,
  KIND_LABELS,
  STATUS_LABELS,
  metricAverage,
  nodeLogoKey,
  type TopologyConnection,
  type TopologyNode,
  type TopologyNodeKind,
} from './topology-map.demo'

export interface TopologyNodeDetailDialogData {
  node: TopologyNode
  ancestors: TopologyNode[]
  connections: TopologyConnection[]
  onAction?: (label: string) => void
}

export interface TopologyNodeDetailDialogResult {
  selectId?: string
}

@Component({
  selector: 'app-topology-node-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    BrandLogoComponent,
  ],
  template: `
    <div class="node-detail" [attr.data-status]="data.node.status">
      <p class="node-detail__eyebrow">Detalle completo del nodo</p>

      <header class="node-detail__hero">
        <div class="node-detail__hero-main">
          <div class="node-detail__identity">
            <div class="node-detail__logo" [class]="'node-detail__logo--' + data.node.status">
              @if (logoKey(); as lg) {
                <app-brand-logo [logo]="lg" size="lg" />
              } @else {
                <mat-icon>{{ kindIcon(data.node.kind) }}</mat-icon>
              }
            </div>
            <div class="node-detail__titles">
              <span class="node-detail__kind">{{ kindLabel(data.node.kind) }}</span>
              <h2 mat-dialog-title>{{ data.node.label }}</h2>
              <p>{{ data.node.detail.subtitle }}</p>
            </div>
            <span class="node-detail__status-pill" [class]="'node-detail__status-pill--' + data.node.status">
              {{ statusLabel(data.node.status) }}
            </span>
          </div>

          <div class="node-detail__chips">
            @if (data.node.detail.healthScore != null) {
              <span class="node-detail__chip node-detail__chip--score">
                <mat-icon>favorite</mat-icon> Salud {{ data.node.detail.healthScore }}%
              </span>
            }
            @if (data.node.detail.monthlyCost != null) {
              <span class="node-detail__chip node-detail__chip--cost">
                {{ data.node.detail.monthlyCost | number:'1.0-0' }} €/mes
              </span>
            }
            @if (data.node.detail.alertsActive) {
              <span class="node-detail__chip node-detail__chip--alert">
                <mat-icon>notifications_active</mat-icon>
                {{ data.node.detail.alertsActive }} alerta{{ data.node.detail.alertsActive === 1 ? '' : 's' }}
              </span>
            }
            @if (data.node.detail.environment) {
              <span class="node-detail__chip">{{ data.node.detail.environment }}</span>
            }
            <span class="node-detail__chip mono">{{ data.node.detail.resourceId }}</span>
          </div>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar" class="node-detail__close">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      @if (metricKpis().length) {
        <div class="node-detail__kpis" role="list">
          @for (k of metricKpis(); track k.label) {
            <article class="node-detail__kpi" role="listitem">
              <span>{{ k.label }}</span>
              <strong>{{ k.value }}</strong>
              @if (k.usage != null) {
                <div class="node-detail__kpi-bar" aria-hidden="true">
                  <span [style.width.%]="k.usage" [class]="barTone(k.usage)"></span>
                </div>
              }
            </article>
          }
        </div>
      }

      @if (chainSteps().length) {
        <nav class="node-detail__chain" aria-label="Cadena de dependencias">
          @for (step of chainSteps(); track step.id; let last = $last) {
            <button
              type="button"
              class="node-detail__chain-step"
              [class.node-detail__chain-step--current]="step.current"
              [disabled]="step.current"
              (click)="handleNavigate(step.id)"
            >
              @if (step.logo; as lg) {
                <app-brand-logo [logo]="lg" size="sm" />
              } @else {
                <mat-icon>{{ kindIcon(step.kind) }}</mat-icon>
              }
              <span>{{ step.label }}</span>
            </button>
            @if (!last) {
              <mat-icon class="node-detail__chain-arrow" aria-hidden="true">arrow_forward</mat-icon>
            }
          }
        </nav>
      }

      <mat-dialog-content class="node-detail__body">
        <div class="node-detail__grid">
          <section class="node-detail__panel">
            <h3><mat-icon>badge</mat-icon> Identidad</h3>
            <dl class="node-detail__dl">
              <dt>Proveedor</dt><dd>{{ data.node.provider }}</dd>
              <dt>ID recurso</dt><dd class="mono">{{ data.node.detail.resourceId }}</dd>
              @if (data.node.detail.region) { <dt>Región</dt><dd>{{ data.node.detail.region }}</dd> }
              @if (data.node.detail.zone) { <dt>Zona</dt><dd>{{ data.node.detail.zone }}</dd> }
              @if (data.node.detail.account) { <dt>Cuenta</dt><dd class="mono">{{ data.node.detail.account }}</dd> }
              @if (data.node.detail.instanceType) { <dt>Tipo</dt><dd>{{ data.node.detail.instanceType }}</dd> }
              @if (data.node.detail.os) { <dt>Sistema</dt><dd>{{ data.node.detail.os }}</dd> }
              @if (data.node.detail.platform) { <dt>Plataforma</dt><dd>{{ data.node.detail.platform }}</dd> }
            </dl>
          </section>

          <section class="node-detail__panel">
            <h3><mat-icon>settings</mat-icon> Operación</h3>
            <dl class="node-detail__dl">
              <dt>Estado</dt><dd>{{ statusLabel(data.node.status) }}</dd>
              @if (data.node.detail.owner) { <dt>Propietario</dt><dd>{{ data.node.detail.owner }}</dd> }
              @if (data.node.detail.team) { <dt>Equipo</dt><dd>{{ data.node.detail.team }}</dd> }
              @if (data.node.detail.uptime) { <dt>Uptime</dt><dd>{{ data.node.detail.uptime }}</dd> }
              @if (data.node.detail.lastSync) { <dt>Último sync</dt><dd>{{ data.node.detail.lastSync }}</dd> }
              @if (data.node.detail.syncSource) { <dt>Fuente</dt><dd>{{ data.node.detail.syncSource }}</dd> }
              @if (data.node.detail.compliance) { <dt>Compliance</dt><dd>{{ data.node.detail.compliance }}</dd> }
            </dl>
          </section>

          <section class="node-detail__panel">
            <h3><mat-icon>lan</mat-icon> Red</h3>
            <dl class="node-detail__dl">
              @if (data.node.detail.vpc) { <dt>VPC / red</dt><dd class="mono">{{ data.node.detail.vpc }}</dd> }
              @if (data.node.detail.subnet) { <dt>Subred</dt><dd>{{ data.node.detail.subnet }}</dd> }
              <dt>IP privada</dt><dd class="mono">{{ data.node.detail.privateIp ?? '—' }}</dd>
              <dt>IP pública</dt><dd class="mono">{{ data.node.detail.publicIp ?? '—' }}</dd>
              @if (data.node.detail.openPorts) { <dt>Puertos</dt><dd class="mono">{{ data.node.detail.openPorts }}</dd> }
            </dl>
            @if (data.node.detail.securityGroups?.length) {
              <ul class="node-detail__list">
                @for (sg of data.node.detail.securityGroups!; track sg) {
                  <li><mat-icon>shield</mat-icon>{{ sg }}</li>
                }
              </ul>
            }
          </section>

          <section class="node-detail__panel">
            <h3><mat-icon>monitoring</mat-icon> Compute y coste</h3>
            @if (hasMetrics()) {
              @if (data.node.detail.cpuPercent != null) {
                <div class="node-detail__metric">
                  <div class="node-detail__metric-head"><span>CPU</span><strong>{{ data.node.detail.cpuPercent }}%</strong></div>
                  <div class="node-detail__metric-bar">
                    <span [style.width.%]="data.node.detail.cpuPercent!" [class]="barTone(data.node.detail.cpuPercent!)"></span>
                  </div>
                </div>
              }
              @if (data.node.detail.memoryPercent != null) {
                <div class="node-detail__metric">
                  <div class="node-detail__metric-head"><span>Memoria</span><strong>{{ data.node.detail.memoryPercent }}%</strong></div>
                  <div class="node-detail__metric-bar">
                    <span [style.width.%]="data.node.detail.memoryPercent!" [class]="barTone(data.node.detail.memoryPercent!)"></span>
                  </div>
                </div>
              }
              @if (metricsAvg() != null) {
                <p class="node-detail__avg">Media CPU + RAM: <strong>{{ metricsAvg() }}%</strong></p>
              }
              @if (data.node.detail.vcpu != null) {
                <div class="node-detail__specs">
                  <div><strong>{{ data.node.detail.vcpu }}</strong><small>vCPU</small></div>
                  <div><strong>{{ data.node.detail.memoryGb ?? '—' }}</strong><small>GB RAM</small></div>
                  <div><strong>{{ data.node.detail.diskGb ?? '—' }}</strong><small>GB disco</small></div>
                </div>
              }
            } @else {
              <p class="node-detail__hint">Sin métricas de compute para este tipo de nodo.</p>
            }
          </section>
        </div>

        @if (data.node.detail.description) {
          <section class="node-detail__panel node-detail__panel--wide">
            <h3><mat-icon>info</mat-icon> Descripción</h3>
            <p class="node-detail__desc">{{ data.node.detail.description }}</p>
          </section>
        }

        @if (tagEntries().length) {
          <section class="node-detail__panel node-detail__panel--wide">
            <h3><mat-icon>label</mat-icon> Etiquetas</h3>
            <div class="node-detail__tags">
              @for (t of tagEntries(); track t.key) {
                <span class="node-detail__tag"><strong>{{ t.key }}</strong> {{ t.value }}</span>
              }
            </div>
          </section>
        }

        @if (data.connections.length) {
          <section class="node-detail__panel node-detail__panel--wide">
            <h3><mat-icon>hub</mat-icon> Conexiones ({{ data.connections.length }})</h3>
            <div class="node-detail__conn-grid">
              @for (c of data.connections; track c.node.id + c.direction) {
                <button type="button" class="node-detail__conn" (click)="handleNavigate(c.node.id)">
                  <span class="node-detail__conn-dir" [class]="'node-detail__conn-dir--' + c.direction">
                    <mat-icon>{{ c.direction === 'in' ? 'south_west' : 'north_east' }}</mat-icon>
                    {{ c.direction === 'in' ? 'Entrada' : 'Salida' }}
                  </span>
                  <div class="node-detail__conn-body">
                    @if (connLogo(c.node); as lg) {
                      <app-brand-logo [logo]="lg" size="sm" />
                    } @else {
                      <mat-icon>{{ kindIcon(c.node.kind) }}</mat-icon>
                    }
                    <div>
                      <strong>{{ c.node.label }}</strong>
                      <span>{{ kindLabel(c.node.kind) }} · {{ statusLabel(c.node.status) }}</span>
                    </div>
                  </div>
                  <mat-icon class="node-detail__conn-go">chevron_right</mat-icon>
                </button>
              }
            </div>
          </section>
        }

        @if (data.node.detail.events?.length) {
          <section class="node-detail__panel node-detail__panel--wide">
            <h3><mat-icon>history</mat-icon> Eventos recientes</h3>
            <ul class="node-detail__events">
              @for (ev of data.node.detail.events!; track ev.time + ev.message) {
                <li [class]="'node-detail__event--' + ev.severity">
                  <time>{{ ev.time }}</time>
                  <span>{{ ev.message }}</span>
                </li>
              }
            </ul>
          </section>
        }

        @if (data.node.detail.volumes?.length) {
          <section class="node-detail__panel node-detail__panel--wide">
            <h3><mat-icon>storage</mat-icon> Volúmenes</h3>
            <ul class="node-detail__list node-detail__list--vol">
              @for (v of data.node.detail.volumes!; track v.id) {
                <li>
                  <code>{{ v.id }}</code>
                  <span>{{ v.size }} · {{ v.type }}</span>
                  @if (v.attached) { <mat-icon>link</mat-icon> }
                </li>
              }
            </ul>
          </section>
        }
      </mat-dialog-content>

      <footer class="node-detail__footer">
        <div class="node-detail__routes">
          @if (moduleRoute(); as route) {
            <span matTooltip="Módulo vinculado"><mat-icon>link</mat-icon>{{ route }}</span>
          }
          @if (metricsRoute(); as mroute) {
            <span matTooltip="Métricas"><mat-icon>monitoring</mat-icon>{{ mroute }}</span>
          }
        </div>
        <div class="node-detail__actions">
          <button
            mat-stroked-button
            type="button"
            [disabled]="!metricsRoute()"
            (click)="handleAction('Ver métricas')"
          >
            <mat-icon>monitoring</mat-icon> Métricas
          </button>
          <button
            mat-stroked-button
            type="button"
            [disabled]="!moduleRoute()"
            (click)="handleAction('Abrir recurso')"
          >
            <mat-icon>open_in_new</mat-icon> Abrir módulo
          </button>
          <button mat-flat-button color="primary" type="button" (click)="handleAction('Ejecutar runbook')">
            <mat-icon>menu_book</mat-icon> Runbook
          </button>
        </div>
      </footer>
    </div>
  `,
  styles: `
    :host { display: block; }

    .node-detail {
      --nd-accent: #6366f1;
      padding-bottom: 0.25rem;
    }
    .node-detail[data-status='healthy'] { --nd-accent: #10b981; }
    .node-detail[data-status='warning'] { --nd-accent: #f59e0b; }
    .node-detail[data-status='critical'] { --nd-accent: #ef4444; }

    .node-detail__eyebrow {
      margin: 0;
      padding: 1rem 1.25rem 0.85rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      line-height: 1.45;
      color: var(--app-text-muted);
    }

    .node-detail__hero {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0 1.25rem 1rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 7%, transparent);
    }
    .node-detail__hero-main { flex: 1; min-width: 0; }
    .node-detail__identity {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      flex-wrap: wrap;
    }
    .node-detail__logo {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--nd-accent) 10%, var(--app-card));
      flex-shrink: 0;
      mat-icon { color: var(--nd-accent); font-size: 26px; width: 26px; height: 26px; }
    }
    .node-detail__logo--healthy { box-shadow: inset 0 0 0 2px color-mix(in srgb, #22c55e 35%, transparent); }
    .node-detail__logo--warning { box-shadow: inset 0 0 0 2px color-mix(in srgb, #f59e0b 40%, transparent); }
    .node-detail__logo--critical { box-shadow: inset 0 0 0 2px color-mix(in srgb, #ef4444 45%, transparent); }

    .node-detail__titles {
      flex: 1;
      min-width: 0;
      h2 {
        margin: 0.12rem 0 0;
        padding: 0;
        font-size: 1.35rem;
        font-weight: 850;
        letter-spacing: -0.03em;
        line-height: 1.15;
      }
      p { margin: 0.2rem 0 0; font-size: 0.78rem; color: var(--app-text-muted); font-weight: 650; }
    }
    .node-detail__kind {
      display: block;
      font-size: 0.6rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--app-text-muted);
    }
    .node-detail__status-pill {
      align-self: center;
      font-size: 0.62rem;
      font-weight: 800;
      padding: 0.22rem 0.55rem;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .node-detail__status-pill--healthy { background: color-mix(in srgb, #10b981 14%, transparent); color: #059669; }
    .node-detail__status-pill--warning { background: color-mix(in srgb, #f59e0b 14%, transparent); color: #b45309; }
    .node-detail__status-pill--critical { background: color-mix(in srgb, #ef4444 14%, transparent); color: #dc2626; }

    .node-detail__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.75rem;
    }
    .node-detail__chip {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.62rem;
      font-weight: 750;
      padding: 0.2rem 0.45rem;
      border-radius: 7px;
      background: color-mix(in srgb, var(--app-text) 5%, var(--app-card));
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }
    .node-detail__chip--score { background: color-mix(in srgb, #3b82f6 10%, transparent); color: #2563eb; }
    .node-detail__chip--cost { background: color-mix(in srgb, #8b5cf6 10%, transparent); color: #6d28d9; }
    .node-detail__chip--alert { background: color-mix(in srgb, #ef4444 10%, transparent); color: #dc2626; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.58rem; word-break: break-all; }

    .node-detail__kpis {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0;
      margin: 0 1.25rem 0.85rem;
      border-radius: 10px;
      overflow: hidden;
      background: color-mix(in srgb, var(--app-surface) 30%, var(--app-card));
    }
    .node-detail__kpi {
      padding: 0.5rem 0.65rem;
      text-align: center;
      &:not(:last-child) { border-right: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent); }
      span { display: block; font-size: 0.55rem; font-weight: 750; text-transform: uppercase; color: var(--app-text-muted); }
      strong { display: block; font-size: 0.95rem; font-weight: 850; margin: 0.1rem 0 0.25rem; }
    }
    .node-detail__kpi-bar {
      height: 4px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      overflow: hidden;
      span { display: block; height: 100%; border-radius: inherit; min-width: 2px; }
      .bar--ok { background: #10b981; }
      .bar--warn { background: #f59e0b; }
      .bar--crit { background: #ef4444; }
    }

    .node-detail__chain {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem;
      margin: 0 1.25rem 0.85rem;
      padding: 0.45rem 0.55rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--nd-accent) 5%, var(--app-card));
    }
    .node-detail__chain-step {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.28rem 0.45rem;
      border: none;
      border-radius: 8px;
      background: color-mix(in srgb, var(--app-text) 4%, transparent);
      cursor: pointer;
      font-size: 0.65rem;
      font-weight: 750;
      color: inherit;
      max-width: 140px;
      span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      mat-icon { font-size: 15px; width: 15px; height: 15px; color: var(--nd-accent); }
      &:hover:not(:disabled) { background: color-mix(in srgb, var(--nd-accent) 10%, transparent); }
    }
    .node-detail__chain-step--current {
      background: color-mix(in srgb, var(--nd-accent) 14%, transparent);
      color: var(--nd-accent);
      cursor: default;
      font-weight: 850;
    }
    .node-detail__chain-arrow {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
      color: var(--app-text-muted);
      opacity: 0.6;
    }

    :host ::ng-deep .node-detail__body {
      padding: 0 1.25rem 1rem;
      max-height: min(58vh, 560px);
      overflow-y: auto;
    }

    .node-detail__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;
    }
    .node-detail__panel {
      padding: 0.65rem 0.75rem;
      border-radius: 11px;
      background: color-mix(in srgb, var(--app-surface) 22%, var(--app-card));
      h3 {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin: 0 0 0.55rem;
        font-size: 0.68rem;
        font-weight: 850;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--app-text-muted);
        mat-icon { font-size: 15px; width: 15px; height: 15px; color: var(--nd-accent); }
      }
    }
    .node-detail__panel--wide {
      margin-top: 0.65rem;
      grid-column: 1 / -1;
    }

    .node-detail__dl {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.45rem 0.75rem;
      margin: 0;
      dt { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: var(--app-text-muted); margin: 0; }
      dd { margin: 0.08rem 0 0; font-size: 0.76rem; font-weight: 650; }
    }

    .node-detail__desc {
      margin: 0;
      font-size: 0.76rem;
      line-height: 1.55;
      color: var(--app-text-muted);
    }
    .node-detail__hint { margin: 0; font-size: 0.74rem; color: var(--app-text-muted); }

    .node-detail__tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .node-detail__tag {
      font-size: 0.64rem;
      padding: 0.18rem 0.42rem;
      border-radius: 6px;
      background: color-mix(in srgb, var(--nd-accent) 8%, transparent);
      strong { margin-right: 0.2rem; }
    }

    .node-detail__metric { margin-bottom: 0.5rem; }
    .node-detail__metric-head {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.22rem;
      span { font-size: 0.62rem; font-weight: 750; color: var(--app-text-muted); }
      strong { font-size: 0.82rem; font-weight: 850; }
    }
    .node-detail__metric-bar {
      height: 7px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      overflow: hidden;
      span { display: block; height: 100%; border-radius: inherit; }
      .bar--ok { background: linear-gradient(90deg, #059669, #10b981); }
      .bar--warn { background: linear-gradient(90deg, #d97706, #f59e0b); }
      .bar--crit { background: linear-gradient(90deg, #dc2626, #ef4444); }
    }
    .node-detail__avg {
      margin: 0.45rem 0 0;
      font-size: 0.68rem;
      color: var(--app-text-muted);
      strong { color: var(--nd-accent); font-weight: 850; }
    }
    .node-detail__specs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.35rem;
      margin-top: 0.45rem;
      div {
        text-align: center;
        padding: 0.35rem 0.25rem;
        border-radius: 8px;
        background: color-mix(in srgb, var(--app-text) 3%, transparent);
        strong { display: block; font-size: 0.88rem; font-weight: 850; }
        small { font-size: 0.52rem; color: var(--app-text-muted); font-weight: 700; text-transform: uppercase; }
      }
    }

    .node-detail__list {
      list-style: none;
      margin: 0.45rem 0 0;
      padding: 0;
      font-size: 0.72rem;
      li {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.28rem 0;
        border-bottom: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
        code { font-size: 0.65rem; }
        span { margin-left: auto; font-size: 0.62rem; color: var(--app-text-muted); }
        mat-icon { font-size: 14px; width: 14px; height: 14px; color: var(--nd-accent); }
      }
    }

    .node-detail__conn-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.4rem;
    }
    .node-detail__conn {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.35rem;
      padding: 0.45rem 0.5rem;
      border: none;
      border-radius: 9px;
      background: color-mix(in srgb, var(--app-text) 4%, transparent);
      cursor: pointer;
      text-align: left;
      color: inherit;
      position: relative;
      &:hover { background: color-mix(in srgb, var(--nd-accent) 8%, transparent); }
    }
    .node-detail__conn-dir {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.52rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
      mat-icon { font-size: 12px; width: 12px; height: 12px; }
    }
    .node-detail__conn-dir--in { color: #2563eb; }
    .node-detail__conn-dir--out { color: #059669; }
    .node-detail__conn-body {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      strong { display: block; font-size: 0.74rem; font-weight: 800; }
      span { display: block; font-size: 0.58rem; color: var(--app-text-muted); font-weight: 650; }
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--nd-accent); }
    }
    .node-detail__conn-go {
      position: absolute;
      top: 0.45rem;
      right: 0.35rem;
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      opacity: 0.4;
    }

    .node-detail__events {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      li {
        display: grid;
        grid-template-columns: 52px 1fr;
        gap: 0.45rem;
        padding: 0.4rem 0.5rem;
        border-radius: 8px;
        background: color-mix(in srgb, var(--app-text) 3%, transparent);
        font-size: 0.72rem;
        time { font-size: 0.6rem; font-weight: 800; color: var(--app-text-muted); }
      }
    }
    .node-detail__event--warning { border-left: 3px solid #f59e0b; }
    .node-detail__event--critical { border-left: 3px solid #ef4444; }
    .node-detail__event--info { border-left: 3px solid #3b82f6; }

    .node-detail__footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
      padding: 0.75rem 1.25rem 1rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 7%, transparent);
      background: color-mix(in srgb, var(--app-surface) 15%, var(--app-card));
    }
    .node-detail__routes {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
      span {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.58rem;
        font-family: ui-monospace, monospace;
        color: var(--app-text-muted);
        font-weight: 650;
      }
      mat-icon { font-size: 12px; width: 12px; height: 12px; opacity: 0.65; }
    }
    .node-detail__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-left: auto;
    }

    @media (max-width: 720px) {
      .node-detail__grid { grid-template-columns: 1fr; }
      .node-detail__kpis { grid-template-columns: 1fr; }
      .node-detail__kpi:not(:last-child) { border-right: none; border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent); }
      .node-detail__footer { flex-direction: column; align-items: stretch; }
      .node-detail__actions { margin-left: 0; justify-content: stretch; }
    }
  `,
})
export class TopologyNodeDetailDialogComponent {
  readonly data = inject<TopologyNodeDetailDialogData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<TopologyNodeDetailDialogComponent, TopologyNodeDetailDialogResult>)

  readonly logoKey = computed(() => nodeLogoKey(this.data.node))

  readonly moduleRoute = computed(() => this.data.node.detail.moduleRoute ?? null)
  readonly metricsRoute = computed(() => this.data.node.detail.metricsRoute ?? null)

  readonly tagEntries = computed((): { key: string; value: string }[] => {
    const tags = this.data.node.detail.tags
    if (!tags) return []
    return Object.entries(tags).map(([key, value]) => ({ key, value: String(value) }))
  })

  readonly metricKpis = computed((): { label: string; value: string; usage?: number }[] => {
    const d = this.data.node.detail
    const items: { label: string; value: string; usage?: number }[] = []
    if (d.cpuPercent != null) items.push({ label: 'CPU', value: `${d.cpuPercent}%`, usage: d.cpuPercent })
    if (d.memoryPercent != null) items.push({ label: 'RAM', value: `${d.memoryPercent}%`, usage: d.memoryPercent })
    if (d.uptime) items.push({ label: 'Uptime', value: d.uptime })
    return items.slice(0, 3)
  })

  readonly metricsAvg = computed((): number | null =>
    metricAverage([this.data.node.detail.cpuPercent, this.data.node.detail.memoryPercent]),
  )

  readonly chainSteps = computed(() => {
    const ancestors = this.data.ancestors.map((n) => ({
      id: n.id,
      label: n.label,
      kind: n.kind,
      logo: nodeLogoKey(n),
      current: false,
    }))
    return [
      ...ancestors,
      {
        id: this.data.node.id,
        label: this.data.node.label,
        kind: this.data.node.kind,
        logo: nodeLogoKey(this.data.node),
        current: true,
      },
    ]
  })

  kindLabel = (k: TopologyNodeKind): string => KIND_LABELS[k]
  kindIcon = (k: TopologyNodeKind): string => KIND_ICONS[k]
  statusLabel = (s: TopologyNode['status']): string => STATUS_LABELS[s]
  connLogo = (n: TopologyNode) => nodeLogoKey(n)

  hasMetrics = (): boolean => {
    const d = this.data.node.detail
    return d.cpuPercent != null || d.memoryPercent != null || d.vcpu != null
  }

  barTone = (usage: number): string => {
    if (usage >= 85) return 'bar--crit'
    if (usage >= 65) return 'bar--warn'
    return 'bar--ok'
  }

  handleNavigate = (id: string): void => {
    this.dialogRef.close({ selectId: id })
  }

  handleAction = (label: string): void => {
    this.data.onAction?.(label)
    this.dialogRef.close()
  }
}
