import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core'
import { DecimalPipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
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

@Component({
  selector: 'app-topology-node-inspector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.inspector-host--sidebar]': 'layout() === "sidebar"',
    '[class.inspector-host--dialog]': 'layout() === "dialog"',
  },
  imports: [DecimalPipe, MatButtonModule, MatIconModule, MatTabsModule, BrandLogoComponent],
  template: `
    @if (!node()) {
      <aside class="insp insp--empty" role="complementary">
        <div class="insp-empty__icon"><mat-icon>account_tree</mat-icon></div>
        <h3>Inspector de topología</h3>
        <p>Selecciona un nodo en el diagrama para ver identidad, red, métricas, conexiones y eventos recientes.</p>
        <ul class="insp-empty__tips">
          <li><mat-icon>touch_app</mat-icon> Clic en nodo para inspeccionar</li>
          <li><mat-icon>filter_list</mat-icon> Usa filtros de capa y estado</li>
          <li><mat-icon>open_in_full</mat-icon> Abre detalle completo ampliado</li>
        </ul>
      </aside>
    } @else {
      <aside class="insp" role="complementary" aria-label="Detalle del nodo seleccionado">
        <header class="insp__head">
          <div class="insp__icon" [class]="'insp__icon--' + node()!.status">
            @if (providerLogoKey(); as lg) {
              <app-brand-logo [logo]="lg" size="md" />
            } @else {
              <mat-icon>{{ kindIcon(node()!.kind) }}</mat-icon>
            }
          </div>
          <div class="insp__titles">
            <span class="insp__kind">{{ kindLabel(node()!.kind) }}</span>
            <h3>{{ node()!.label }}</h3>
            <p>{{ node()!.detail.subtitle }}</p>
          </div>
          @if (layout() === 'sidebar') {
            <div class="insp__head-actions">
              <button
                mat-stroked-button
                type="button"
                class="insp__expand"
                (click)="expandDetail.emit()"
                aria-label="Abrir detalle completo"
              >
                <mat-icon>open_in_full</mat-icon>
                Detalle
              </button>
              <button mat-icon-button type="button" aria-label="Cerrar panel" (click)="close.emit()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }
        </header>

        <div class="insp__badges">
          <span class="insp-badge" [class]="'insp-badge--' + node()!.status">{{ statusLabel(node()!.status) }}</span>
          @if (node()!.detail.healthScore != null) {
            <span class="insp-badge insp-badge--score">Salud {{ node()!.detail.healthScore }}%</span>
          }
          @if (node()!.detail.monthlyCost != null) {
            <span class="insp-badge insp-badge--cost">{{ node()!.detail.monthlyCost | number:'1.0-0' }} €/mes</span>
          }
          @if (node()!.detail.alertsActive) {
            <span class="insp-badge insp-badge--alert">
              <mat-icon>notifications</mat-icon>{{ node()!.detail.alertsActive }}
            </span>
          }
        </div>

        @if (metricKpis().length) {
          <div class="insp__kpis" role="list">
            @for (k of metricKpis(); track k.label) {
              <article class="insp-kpi" role="listitem">
                <span>{{ k.label }}</span>
                <strong>{{ k.value }}</strong>
                @if (k.usage != null) {
                  <div class="insp-kpi__bar" aria-hidden="true">
                    <span [style.width.%]="k.usage" [class]="barTone(k.usage)"></span>
                  </div>
                }
              </article>
            }
          </div>
        }

        @if (ancestors().length) {
          <nav class="insp__crumbs" aria-label="Jerarquía">
            @for (a of ancestors(); track a.id; let last = $last) {
              <button type="button" class="insp-crumb" (click)="selectAncestor.emit(a.id)">{{ a.label }}</button>
              @if (!last) { <mat-icon>chevron_right</mat-icon> }
            }
            <mat-icon>chevron_right</mat-icon>
            <span class="insp-crumb insp-crumb--current">{{ node()!.label }}</span>
          </nav>
        }

        <mat-tab-group class="insp-tabs" animationDuration="200ms">
          <mat-tab label="Resumen">
            <div class="insp-panel">
              @if (node()!.detail.description) {
                <p class="insp-desc">{{ node()!.detail.description }}</p>
              }
              <dl class="insp-dl">
                <div><dt>ID recurso</dt><dd class="mono">{{ node()!.detail.resourceId }}</dd></div>
                <div><dt>Proveedor</dt><dd>{{ node()!.provider }}</dd></div>
                @if (node()!.detail.region) { <div><dt>Región</dt><dd>{{ node()!.detail.region }}</dd></div> }
                @if (node()!.detail.zone) { <div><dt>Zona</dt><dd>{{ node()!.detail.zone }}</dd></div> }
                @if (node()!.detail.account) { <div><dt>Cuenta</dt><dd class="mono">{{ node()!.detail.account }}</dd></div> }
                @if (node()!.detail.owner) { <div><dt>Propietario</dt><dd>{{ node()!.detail.owner }}</dd></div> }
                @if (node()!.detail.team) { <div><dt>Equipo</dt><dd>{{ node()!.detail.team }}</dd></div> }
                @if (node()!.detail.environment) { <div><dt>Entorno</dt><dd>{{ node()!.detail.environment }}</dd></div> }
                @if (node()!.detail.os) { <div><dt>Sistema</dt><dd>{{ node()!.detail.os }}</dd></div> }
                @if (node()!.detail.instanceType) { <div><dt>Tipo</dt><dd>{{ node()!.detail.instanceType }}</dd></div> }
                @if (node()!.detail.uptime) { <div><dt>Uptime</dt><dd>{{ node()!.detail.uptime }}</dd></div> }
                @if (node()!.detail.lastSync) { <div><dt>Último sync</dt><dd>{{ node()!.detail.lastSync }}</dd></div> }
                @if (node()!.detail.syncSource) { <div><dt>Fuente</dt><dd>{{ node()!.detail.syncSource }}</dd></div> }
                @if (node()!.detail.compliance) { <div><dt>Compliance</dt><dd>{{ node()!.detail.compliance }}</dd></div> }
              </dl>
              @if (tagEntries().length) {
                <div class="insp-tags-block">
                  <span class="insp-block-title">Etiquetas</span>
                  <div class="insp-tags">
                    @for (t of tagEntries(); track t.key) {
                      <span class="insp-tag"><strong>{{ t.key }}</strong> {{ t.value }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          </mat-tab>

          <mat-tab label="Red">
            <div class="insp-panel">
              <dl class="insp-dl">
                @if (node()!.detail.vpc) { <div><dt>VPC / red</dt><dd class="mono">{{ node()!.detail.vpc }}</dd></div> }
                @if (node()!.detail.subnet) { <div><dt>Subred</dt><dd>{{ node()!.detail.subnet }}</dd></div> }
                <div><dt>IP privada</dt><dd class="mono">{{ node()!.detail.privateIp ?? '—' }}</dd></div>
                <div><dt>IP pública</dt><dd class="mono">{{ node()!.detail.publicIp ?? '—' }}</dd></div>
                @if (node()!.detail.openPorts) { <div><dt>Puertos</dt><dd class="mono">{{ node()!.detail.openPorts }}</dd></div> }
              </dl>
              @if (node()!.detail.securityGroups?.length) {
                <span class="insp-block-title">Security groups</span>
                <ul class="insp-list">
                  @for (sg of node()!.detail.securityGroups!; track sg) {
                    <li><mat-icon>shield</mat-icon>{{ sg }}</li>
                  }
                </ul>
              }
              @if (node()!.detail.volumes?.length) {
                <span class="insp-block-title">Volúmenes</span>
                <ul class="insp-list">
                  @for (v of node()!.detail.volumes!; track v.id) {
                    <li>
                      <code>{{ v.id }}</code>
                      <span>{{ v.size }} · {{ v.type }}</span>
                      @if (v.attached) { <mat-icon>link</mat-icon> }
                    </li>
                  }
                </ul>
              }
            </div>
          </mat-tab>

          <mat-tab label="Métricas">
            <div class="insp-panel">
              @if (hasMetrics()) {
                @if (node()!.detail.cpuPercent != null) {
                  <div class="insp-metric">
                    <div class="insp-metric__head"><span>CPU</span><strong>{{ node()!.detail.cpuPercent }}%</strong></div>
                    <div class="insp-metric__bar"><span [style.width.%]="node()!.detail.cpuPercent!" [class]="barTone(node()!.detail.cpuPercent!)"></span></div>
                  </div>
                }
                @if (node()!.detail.memoryPercent != null) {
                  <div class="insp-metric">
                    <div class="insp-metric__head"><span>Memoria</span><strong>{{ node()!.detail.memoryPercent }}%</strong></div>
                    <div class="insp-metric__bar"><span [style.width.%]="node()!.detail.memoryPercent!" [class]="barTone(node()!.detail.memoryPercent!)"></span></div>
                  </div>
                }
                @if (metricsAvg() != null) {
                  <article class="insp-avg">
                    <mat-icon>functions</mat-icon>
                    <div>
                      <span>Media CPU + memoria</span>
                      <strong>{{ metricsAvg() }}%</strong>
                    </div>
                  </article>
                }
                @if (node()!.detail.networkInMbps != null) {
                  <dl class="insp-dl insp-dl--compact">
                    <div><dt>Tráfico entrante</dt><dd>{{ node()!.detail.networkInMbps }} Mbps</dd></div>
                    <div><dt>Tráfico saliente</dt><dd>{{ node()!.detail.networkOutMbps }} Mbps</dd></div>
                  </dl>
                }
                @if (node()!.detail.vcpu != null) {
                  <div class="insp-specs">
                    <div><mat-icon>memory</mat-icon><strong>{{ node()!.detail.vcpu }}</strong><small>vCPU</small></div>
                    <div><mat-icon>storage</mat-icon><strong>{{ node()!.detail.memoryGb ?? '—' }}</strong><small>GB RAM</small></div>
                    <div><mat-icon>sd_card</mat-icon><strong>{{ node()!.detail.diskGb ?? '—' }}</strong><small>GB disco</small></div>
                  </div>
                }
              } @else {
                <p class="insp-hint">Sin métricas de compute para este tipo de nodo. Selecciona una instancia, servicio o cluster.</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="Conexiones">
            <div class="insp-panel">
              @if (connections().length) {
                <ul class="insp-conn">
                  @for (c of connections(); track c.node.id + c.direction) {
                    <li>
                      <button type="button" class="insp-conn__btn" (click)="selectConnection.emit(c.node.id)">
                        <mat-icon>{{ c.direction === 'in' ? 'arrow_downward' : 'arrow_upward' }}</mat-icon>
                        <div>
                          <strong>{{ c.node.label }}</strong>
                          <span>{{ kindLabel(c.node.kind) }} · {{ c.edgeLabel ?? (c.direction === 'in' ? 'origen' : 'destino') }}</span>
                        </div>
                        <span class="insp-conn__status" [class]="'insp-conn__status--' + c.node.status"></span>
                        <mat-icon class="insp-conn__go">chevron_right</mat-icon>
                      </button>
                    </li>
                  }
                </ul>
              } @else {
                <p class="insp-hint">Sin conexiones visibles en el ámbito actual.</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="Eventos">
            <div class="insp-panel">
              @if (node()!.detail.events?.length) {
                <ul class="insp-events">
                  @for (ev of node()!.detail.events!; track ev.time + ev.message) {
                    <li [class]="'insp-events__item--' + ev.severity">
                      <time>{{ ev.time }}</time>
                      <span>{{ ev.message }}</span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="insp-hint">No hay eventos recientes registrados.</p>
              }
            </div>
          </mat-tab>
        </mat-tab-group>

        <footer class="insp__actions">
          <button
            mat-stroked-button
            type="button"
            [disabled]="!metricsRoute()"
            [attr.title]="metricsRoute() ?? 'Sin ruta de métricas'"
            (click)="action.emit('Ver métricas')"
          >
            <mat-icon>monitoring</mat-icon> Métricas
          </button>
          <button
            mat-stroked-button
            type="button"
            [disabled]="!moduleRoute()"
            [attr.title]="moduleRoute() ?? 'Sin módulo vinculado'"
            (click)="action.emit('Abrir recurso')"
          >
            <mat-icon>open_in_new</mat-icon> Abrir
          </button>
          <button mat-flat-button color="primary" type="button" (click)="action.emit('Ejecutar runbook')">
            <mat-icon>menu_book</mat-icon> Runbook
          </button>
        </footer>
        @if (moduleRoute() || metricsRoute()) {
          <p class="insp__routes">
            @if (moduleRoute(); as route) {
              <span><mat-icon>link</mat-icon> {{ route }}</span>
            }
            @if (metricsRoute(); as mroute) {
              <span><mat-icon>monitoring</mat-icon> {{ mroute }}</span>
            }
          </p>
        }
      </aside>
    }
  `,
  styles: `
    :host.inspector-host--sidebar {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    :host.inspector-host--dialog { display: block; width: 100%; }

    .insp {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      background: var(--app-card);
    }
    :host.inspector-host--dialog .insp { min-height: min(72vh, 680px); }

    .insp__head {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      padding: 0.85rem 0.85rem 0.45rem;
    }
    .insp__icon {
      width: 44px;
      height: 44px;
      border-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 10%, var(--app-surface));
      flex-shrink: 0;
      mat-icon { color: var(--app-accent); }
    }
    .insp__icon--healthy { box-shadow: inset 0 0 0 2px color-mix(in srgb, #22c55e 40%, transparent); }
    .insp__icon--warning { box-shadow: inset 0 0 0 2px color-mix(in srgb, #f59e0b 45%, transparent); }
    .insp__icon--critical { box-shadow: inset 0 0 0 2px color-mix(in srgb, #ef4444 50%, transparent); }
    .insp__titles {
      flex: 1;
      min-width: 0;
      h3 { margin: 0; font-size: 1rem; font-weight: 800; letter-spacing: -0.02em; }
      p { margin: 0.15rem 0 0; font-size: 0.72rem; color: var(--app-text-muted); font-weight: 650; }
    }
    .insp__kind {
      font-size: 0.58rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    .insp__head-actions { display: flex; align-items: center; gap: 0.2rem; flex-shrink: 0; }
    .insp__expand {
      min-width: 0;
      height: 32px;
      font-size: 0.68rem;
      padding: 0 0.45rem;
      mat-icon { font-size: 15px; width: 15px; height: 15px; margin-right: 0.1rem; }
    }

    .insp__badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      padding: 0 0.85rem 0.55rem;
    }
    .insp-badge {
      font-size: 0.58rem;
      font-weight: 800;
      padding: 0.18rem 0.45rem;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      background: color-mix(in srgb, var(--app-text) 5%, var(--app-card));
      mat-icon { font-size: 12px; width: 12px; height: 12px; }
    }
    .insp-badge--healthy { background: color-mix(in srgb, #10b981 12%, transparent); color: #059669; }
    .insp-badge--warning { background: color-mix(in srgb, #f59e0b 12%, transparent); color: #b45309; }
    .insp-badge--critical { background: color-mix(in srgb, #ef4444 12%, transparent); color: #dc2626; }
    .insp-badge--score { background: color-mix(in srgb, #3b82f6 10%, transparent); color: #2563eb; }
    .insp-badge--cost { background: color-mix(in srgb, #8b5cf6 10%, transparent); color: #6d28d9; }
    .insp-badge--alert { background: color-mix(in srgb, #ef4444 10%, transparent); color: #dc2626; }

    .insp__kpis {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0;
      margin: 0 0.85rem 0.55rem;
      border-radius: 9px;
      overflow: hidden;
      background: color-mix(in srgb, var(--app-surface) 25%, var(--app-card));
    }
    .insp-kpi {
      padding: 0.4rem 0.45rem;
      text-align: center;
      &:not(:last-child) { border-right: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent); }
      span { display: block; font-size: 0.52rem; font-weight: 750; text-transform: uppercase; color: var(--app-text-muted); }
      strong { display: block; font-size: 0.82rem; font-weight: 850; margin: 0.08rem 0 0.2rem; }
    }
    .insp-kpi__bar {
      height: 4px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      overflow: hidden;
      span { display: block; height: 100%; border-radius: inherit; min-width: 2px; }
      .bar--ok { background: #10b981; }
      .bar--warn { background: #f59e0b; }
      .bar--crit { background: #ef4444; }
    }

    .insp__crumbs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.1rem;
      padding: 0 0.85rem 0.55rem;
      font-size: 0.65rem;
      mat-icon { font-size: 13px; width: 13px; height: 13px; color: var(--app-text-muted); }
    }
    .insp-crumb {
      border: none;
      background: none;
      color: var(--app-accent);
      cursor: pointer;
      padding: 0.08rem 0.2rem;
      font-size: inherit;
      font-weight: 650;
      &:hover { text-decoration: underline; }
    }
    .insp-crumb--current { color: var(--app-text); font-weight: 800; cursor: default; }

    .insp-tabs { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
    :host ::ng-deep .insp-tabs .mat-mdc-tab-body-wrapper { flex: 1; min-height: 0; }
    :host ::ng-deep .insp-tabs .mat-mdc-tab-body-content { overflow-y: auto; }

    .insp-panel { padding: 0.65rem 0.85rem 0.85rem; }
    .insp-desc {
      margin: 0 0 0.55rem;
      font-size: 0.72rem;
      line-height: 1.45;
      color: var(--app-text-muted);
    }
    .insp-dl {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.45rem 0.65rem;
      margin: 0;
      dt { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: var(--app-text-muted); margin: 0; }
      dd { margin: 0.1rem 0 0; font-size: 0.74rem; font-weight: 650; }
    }
    .insp-dl--compact { margin-top: 0.55rem; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; word-break: break-all; }
    .insp-block-title {
      display: block;
      margin: 0.65rem 0 0.35rem;
      font-size: 0.58rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }
    .insp-tags { display: flex; flex-wrap: wrap; gap: 0.28rem; }
    .insp-tag {
      font-size: 0.62rem;
      padding: 0.15rem 0.4rem;
      border-radius: 6px;
      background: color-mix(in srgb, var(--app-accent) 7%, transparent);
      strong { margin-right: 0.2rem; }
    }

    .insp-list {
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 0.72rem;
      li {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.32rem 0;
        border-bottom: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
        code { font-size: 0.65rem; }
        span { color: var(--app-text-muted); margin-left: auto; font-size: 0.62rem; }
        mat-icon { font-size: 15px; width: 15px; height: 15px; color: var(--app-accent); }
      }
    }

    .insp-metric { margin-bottom: 0.55rem; }
    .insp-metric__head {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.25rem;
      span { font-size: 0.65rem; font-weight: 750; color: var(--app-text-muted); }
      strong { font-size: 0.78rem; font-weight: 850; }
    }
    .insp-metric__bar {
      height: 7px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      overflow: hidden;
      span { display: block; height: 100%; border-radius: inherit; }
      .bar--ok { background: linear-gradient(90deg, #059669, #10b981); }
      .bar--warn { background: linear-gradient(90deg, #d97706, #f59e0b); }
      .bar--crit { background: linear-gradient(90deg, #dc2626, #ef4444); }
    }
    .insp-avg {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.45rem 0.55rem;
      margin: 0.55rem 0;
      border-radius: 9px;
      background: color-mix(in srgb, var(--app-accent) 7%, var(--app-card));
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--app-accent); }
      span { display: block; font-size: 0.55rem; font-weight: 750; text-transform: uppercase; color: var(--app-text-muted); }
      strong { display: block; font-size: 0.95rem; font-weight: 850; color: var(--app-accent); margin-top: 0.08rem; }
    }
    .insp-specs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.4rem;
      margin-top: 0.55rem;
      div {
        text-align: center;
        padding: 0.4rem 0.3rem;
        border-radius: 8px;
        background: color-mix(in srgb, var(--app-text) 3%, transparent);
        mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--app-accent); }
        strong { display: block; font-size: 0.85rem; font-weight: 850; margin-top: 0.15rem; }
        small { font-size: 0.55rem; color: var(--app-text-muted); font-weight: 700; text-transform: uppercase; }
      }
    }
    .insp-hint { margin: 0; font-size: 0.72rem; color: var(--app-text-muted); line-height: 1.45; }

    .insp-conn { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
    .insp-conn__btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      width: 100%;
      padding: 0.4rem 0.45rem;
      border: none;
      border-radius: 8px;
      background: color-mix(in srgb, var(--app-text) 4%, transparent);
      cursor: pointer;
      text-align: left;
      color: inherit;
      strong { display: block; font-size: 0.72rem; font-weight: 800; }
      span { display: block; font-size: 0.58rem; color: var(--app-text-muted); font-weight: 650; }
      mat-icon:first-child { font-size: 16px; width: 16px; height: 16px; color: var(--app-accent); opacity: 0.85; }
    }
    .insp-conn__btn:hover { background: color-mix(in srgb, var(--app-accent) 8%, transparent); }
    .insp-conn__status {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      margin-left: auto;
      flex-shrink: 0;
    }
    .insp-conn__status--healthy { background: #22c55e; }
    .insp-conn__status--warning { background: #f59e0b; }
    .insp-conn__status--critical { background: #ef4444; }
    .insp-conn__go { font-size: 16px !important; width: 16px !important; height: 16px !important; opacity: 0.45; }

    .insp-events { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .insp-events li {
      display: grid;
      grid-template-columns: 48px 1fr;
      gap: 0.4rem;
      padding: 0.35rem 0.45rem;
      border-radius: 7px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
      font-size: 0.68rem;
      time { font-size: 0.58rem; font-weight: 800; color: var(--app-text-muted); }
    }
    .insp-events__item--warning { border-left: 2px solid #f59e0b; }
    .insp-events__item--critical { border-left: 2px solid #ef4444; }
    .insp-events__item--info { border-left: 2px solid #3b82f6; }

    .insp__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      padding: 0.65rem 0.85rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .insp__routes {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      margin: 0;
      padding: 0 0.85rem 0.65rem;
      font-size: 0.58rem;
      color: var(--app-text-muted);
      span {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-family: ui-monospace, monospace;
        font-weight: 650;
      }
      mat-icon { font-size: 12px; width: 12px; height: 12px; opacity: 0.7; }
    }

    .insp--empty {
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem 1.25rem;
      color: var(--app-text-muted);
      height: 100%;
    }
    .insp-empty__icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 8%, var(--app-card));
      margin-bottom: 0.75rem;
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--app-accent); opacity: 0.7; }
    }
    .insp--empty h3 { margin: 0 0 0.45rem; color: var(--app-text); font-size: 0.95rem; font-weight: 800; }
    .insp--empty p { margin: 0; font-size: 0.75rem; line-height: 1.5; max-width: 260px; }
    .insp-empty__tips {
      list-style: none;
      margin: 1rem 0 0;
      padding: 0;
      text-align: left;
      width: 100%;
      max-width: 260px;
      li {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.65rem;
        font-weight: 650;
        padding: 0.28rem 0;
        mat-icon { font-size: 14px; width: 14px; height: 14px; color: var(--app-accent); opacity: 0.75; }
      }
    }
  `,
})
export class TopologyNodeInspectorComponent {
  readonly node = input<TopologyNode | null>(null)
  readonly ancestors = input<TopologyNode[]>([])
  readonly connections = input<TopologyConnection[]>([])
  readonly layout = input<'sidebar' | 'dialog'>('sidebar')

  readonly close = output<void>()
  readonly action = output<string>()
  readonly selectAncestor = output<string>()
  readonly selectConnection = output<string>()
  readonly expandDetail = output<void>()

  readonly providerLogoKey = computed(() => {
    const n = this.node()
    if (!n) return null
    return nodeLogoKey(n)
  })

  readonly moduleRoute = computed(() => this.node()?.detail.moduleRoute ?? null)
  readonly metricsRoute = computed(() => this.node()?.detail.metricsRoute ?? null)

  readonly tagEntries = computed((): { key: string; value: string }[] => {
    const n = this.node()
    if (!n?.detail.tags) return []
    return Object.entries(n.detail.tags).map(([key, value]) => ({ key, value: String(value) }))
  })

  readonly metricKpis = computed((): { label: string; value: string; usage?: number }[] => {
    const n = this.node()
    if (!n) return []
    const d = n.detail
    const items: { label: string; value: string; usage?: number }[] = []
    if (d.cpuPercent != null) items.push({ label: 'CPU', value: `${d.cpuPercent}%`, usage: d.cpuPercent })
    if (d.memoryPercent != null) items.push({ label: 'RAM', value: `${d.memoryPercent}%`, usage: d.memoryPercent })
    if (d.uptime) items.push({ label: 'Uptime', value: d.uptime })
    return items.slice(0, 3)
  })

  readonly metricsAvg = computed((): number | null => {
    const n = this.node()
    if (!n) return null
    return metricAverage([n.detail.cpuPercent, n.detail.memoryPercent])
  })

  kindLabel = (k: TopologyNodeKind): string => KIND_LABELS[k]
  kindIcon = (k: TopologyNodeKind): string => KIND_ICONS[k]
  statusLabel = (s: TopologyNode['status']): string => STATUS_LABELS[s]

  hasMetrics = (): boolean => {
    const d = this.node()?.detail
    if (!d) return false
    return d.cpuPercent != null || d.memoryPercent != null || d.vcpu != null
  }

  barTone = (usage: number): string => {
    if (usage >= 85) return 'bar--crit'
    if (usage >= 65) return 'bar--warn'
    return 'bar--ok'
  }
}
