import { PlatformActionService } from '../../shared/platform/platform-action.service'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  effect,
} from '@angular/core'
import { Router } from '@angular/router'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { startWith, delay, of, switchMap, map, catchError, finalize, tap, forkJoin } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { DecimalPipe } from '@angular/common'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { IntegrationConnectionService } from '../../core/services/integration-connection.service'
import { ToastService } from '../../core/services/toast.service'
import { CloudAccountsStore } from '../../core/stores/cloud-accounts.store'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { InstancesService } from '../../core/services/instances.service'
import { VpsService } from '../../core/services/vps.service'
import type { CloudAccount, CloudProvider, Instance } from '../../core/models/api.models'
import { RunbookExecuteDialogComponent } from '../runbooks/runbook-execute-dialog.component'
import { defaultRunbooks } from '../runbooks/runbooks.data'
import { buildRunbookTargets } from '../runbooks/runbook-target.util'
import {
  TopologyNodeDetailDialogComponent,
  type TopologyNodeDetailDialogData,
} from './topology-node-detail-dialog.component'
import {
  TOPOLOGY_NODES,
  TOPOLOGY_EDGES,
  TOPOLOGY_SCOPES,
  KIND_LABELS,
  KIND_ICONS,
  KIND_THEME,
  STATUS_LABELS,
  providerLogo,
  nodeLogoKey,
  buildAncestorChain,
  nodeIdsOnPathToFocus,
  buildEdgeGeometry,
  type TopologyEdgeGeometry,
  resolveScopeForCloudAccount,
  layoutScopedTopology,
  patchAccountNodeLabel,
  accountNodeIdForScope,
  enrichTopologyNodes,
  getNodeConnections,
  topologyCostTotal,
  scopeMetricAverages,
  nodeCardFact,
  nodeCardTags,
  metricAverage,
  mergeAccountInstancesIntoScope,
  filterInstancesForAccount,
  normalizeCloudInstanceRow,
  instanceOptionsFromScope,
  patchRegionNodeLabel,
  primaryRegionForInstances,
  REGION_NODE_ID,
  type TopologyInstanceOption,
  resolveNodeModuleRoute,
  resolveNodeMetricsRoute,
  resolveRunbookIdForNode,
  type TopologyNode,
  type TopologyEdge,
  type TopologyNodeKind,
  type TopologyColumnMeta,
} from './topology-map.data'

@Component({
  selector: 'app-topology-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    LoadingStateComponent,
    BrandLogoComponent,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  template: `
    <div class="page-container topology-page animate-fade-in">
      <app-page-header
        icon="account_tree"
        title="Mapa de topología"
        description="Cadena visual de recursos por cuenta cloud: región, red VPC, instancias, clusters K8s, servicios y contenedores Docker — con estado en tiempo real."
        [lastSync]="lastSyncLabel()"
        [actions]="[
          { label: 'Actualizar', icon: 'refresh', primary: true },
          { label: 'Ajustar vista', icon: 'fit_screen' },
          { label: 'Exportar', icon: 'download' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      @if (loading()) {
        <app-loading-state message="Cargando topología…" />
      } @else {
        <div class="topology-workspace">
          <div class="topology-main">
            <header class="topology-bar">
              <mat-form-field appearance="fill" class="topology-bar__field" subscriptSizing="dynamic">
                <mat-label>Cuenta</mat-label>
                <mat-select [formControl]="accountControl" [disabled]="!cloudAccounts().length">
                  <mat-select-trigger>
                    @if (selectedAccount(); as acc) {
                      <span class="account-trigger">
                        @if (providerLogo(acc.provider); as lg) {
                          <app-brand-logo [logo]="lg" size="sm" />
                        }
                        <span>{{ acc.name }}</span>
                      </span>
                    }
                  </mat-select-trigger>
                  @for (acc of cloudAccounts(); track acc.id) {
                    <mat-option [value]="acc.id">
                      <span class="account-option">
                        @if (providerLogo(acc.provider); as lg) {
                          <app-brand-logo [logo]="lg" size="sm" />
                        }
                        {{ acc.name }}
                      </span>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (instanceOptions().length) {
                <mat-form-field appearance="fill" class="topology-bar__field" subscriptSizing="dynamic">
                  <mat-label>Instancia</mat-label>
                  <mat-select [formControl]="instanceControl">
                    @for (inst of instanceOptions(); track inst.id) {
                      <mat-option [value]="inst.id">{{ inst.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }

              @if (selectedAccount(); as acc) {
                <div class="topology-bar__meta">
                  @if (providerLogo(acc.provider); as lg) {
                    <app-brand-logo [logo]="lg" size="md" />
                  }
                  <div>
                    <strong>{{ acc.name }}</strong>
                    <span>{{ acc.provider }} · {{ acc.defaultRegion ?? 'multi-región' }}</span>
                  </div>
                </div>
              }

              <div class="topology-bar__stats">
                <span>{{ accountInstances().length }} instancias</span>
                <span>{{ filteredNodes().length }}/{{ layoutNodes().length }} nodos</span>
                <span class="stat-dot stat-dot--ok"></span>{{ healthyCount() }} ok
                @if (issueCount()) {
                  <span class="stat-dot stat-dot--warn"></span>{{ issueCount() }} alerta
                }
              </div>

              <button
                mat-stroked-button
                type="button"
                class="topology-bar__detail"
                [disabled]="!selected()"
                (click)="openDetailDialog()"
              >
                <mat-icon>open_in_new</mat-icon>
                Detalle
              </button>
            </header>

            @if (scopedLayout()) {
              <div class="topo-scope-strip" role="list" aria-label="Resumen del scope">
                <article class="topo-scope-strip__item" role="listitem">
                  <mat-icon>payments</mat-icon>
                  <div>
                    <span>Coste ruta</span>
                    <strong>{{ scopeCostLabel() }}</strong>
                  </div>
                </article>
                <article class="topo-scope-strip__item" role="listitem">
                  <mat-icon>speed</mat-icon>
                  <div>
                    <span>CPU media</span>
                    <strong>{{ scopeAvgCpuLabel() }}</strong>
                  </div>
                </article>
                <article class="topo-scope-strip__item" role="listitem">
                  <mat-icon>memory</mat-icon>
                  <div>
                    <span>RAM media</span>
                    <strong>{{ scopeAvgMemoryLabel() }}</strong>
                  </div>
                </article>
                <article class="topo-scope-strip__item" role="listitem">
                  <mat-icon>favorite</mat-icon>
                  <div>
                    <span>Salud media</span>
                    <strong>{{ scopeAvgHealthLabel() }}</strong>
                  </div>
                </article>
                <article class="topo-scope-strip__item topo-scope-strip__item--sync" role="listitem">
                  <mat-icon>sync</mat-icon>
                  <div>
                    <span>Última sync</span>
                    <strong>{{ lastSync() }}</strong>
                  </div>
                </article>
              </div>
            }

            @if (selected(); as sel) {
              <div class="topo-focus-head">
                <div class="topo-focus-head__main">
                  <div>
                    <h2 class="topo-focus-head__title">{{ sel.label }}</h2>
                    <p
                      class="topo-focus-head__sub"
                      [class.topo-focus-head__sub--warn]="sel.status === 'warning'"
                      [class.topo-focus-head__sub--crit]="sel.status === 'critical'"
                    >
                      {{ kindLabel(sel.kind) }} · {{ statusLabel(sel.status) }}
                      · {{ sel.detail.subtitle }}
                    </p>
                  </div>
                  <div class="topo-focus-head__chips">
                    <span class="topo-chip mono">{{ sel.detail.resourceId }}</span>
                    @if (sel.detail.region) {
                      <span class="topo-chip"><mat-icon>public</mat-icon>{{ sel.detail.region }}</span>
                    }
                    @if (sel.detail.owner) {
                      <span class="topo-chip"><mat-icon>person</mat-icon>{{ sel.detail.owner }}</span>
                    }
                    @if (sel.detail.team) {
                      <span class="topo-chip"><mat-icon>groups</mat-icon>{{ sel.detail.team }}</span>
                    }
                    @if (sel.detail.environment) {
                      <span class="topo-chip topo-chip--env">{{ sel.detail.environment }}</span>
                    }
                    @if (sel.detail.monthlyCost != null) {
                      <span class="topo-chip topo-chip--cost">{{ sel.detail.monthlyCost | number:'1.0-0' }} €/mes</span>
                    }
                    @if (sel.detail.alertsActive) {
                      <span class="topo-chip topo-chip--alert">
                        <mat-icon>notifications</mat-icon>{{ sel.detail.alertsActive }} alerta{{ sel.detail.alertsActive === 1 ? '' : 's' }}
                      </span>
                    }
                  </div>
                </div>
                @if (selectedFocusMetrics().length) {
                  <div class="topo-focus-head__metrics" role="list">
                    @for (m of selectedFocusMetrics(); track m.label) {
                      <article class="topo-focus-metric" role="listitem">
                        <span>{{ m.label }}</span>
                        <strong>{{ m.value }}</strong>
                        @if (m.usage != null) {
                          <div class="topo-focus-metric__bar" aria-hidden="true">
                            <span [style.width.%]="m.usage" [class]="metricBarTone(m.usage)"></span>
                          </div>
                        }
                      </article>
                    }
                  </div>
                }
              </div>

              @if (pathChain().length) {
                <nav class="topo-path" aria-label="Cadena de dependencias">
                  @for (step of pathChain(); track step.id; let last = $last) {
                    <button
                      type="button"
                      class="topo-path__step"
                      [class.topo-path__step--current]="step.current"
                      [disabled]="step.current"
                      (click)="selectNodeById(step.id)"
                    >
                      @if (step.logo; as lg) {
                        <app-brand-logo [logo]="lg" size="sm" />
                      } @else {
                        <mat-icon>{{ kindIcon(step.kind) }}</mat-icon>
                      }
                      <span>{{ step.label }}</span>
                    </button>
                    @if (!last) {
                      <mat-icon class="topo-path__arrow" aria-hidden="true">chevron_right</mat-icon>
                    }
                  }
                </nav>
              }
            }

            @if (!cloudAccounts().length) {
              <div class="topology-empty" role="status">
                <mat-icon>cloud_off</mat-icon>
                <p>Sin datos todavía. Conecta una cuenta cloud para visualizar la topología.</p>
                <button
                  type="button"
                  class="topology-empty__cta"
                  aria-label="Conectar nube"
                  (click)="handleConnectCloud()"
                >
                  Conectar nube
                </button>
              </div>
            } @else if (!scopedLayout()) {
              <div class="topology-empty" role="status">
                <mat-icon>account_tree</mat-icon>
                <p>Topología no disponible para esta cuenta.</p>
              </div>
            } @else {
              <div
                #canvasShell
                class="topology-canvas"
                [style.--scope-accent]="scopeAccent()"
              >
                <div class="topo-zoom-rail" role="group" aria-label="Zoom del diagrama">
                  <button mat-icon-button type="button" aria-label="Alejar" (click)="zoomOut()">
                    <mat-icon>remove</mat-icon>
                  </button>
                  <span class="topo-zoom-rail__pct">{{ zoomPercentLabel() }}</span>
                  <button mat-icon-button type="button" aria-label="Acercar" (click)="zoomIn()">
                    <mat-icon>add</mat-icon>
                  </button>
                  <button mat-icon-button type="button" aria-label="Ajustar vista" (click)="handleFitView()">
                    <mat-icon>fit_screen</mat-icon>
                  </button>
                </div>

                <div
                  class="topology-canvas__scale"
                  [style.width.px]="stageWidth()"
                  [style.height.px]="stageHeight()"
                  [style.transform]="fitTransform()"
                >
                  <div
                    class="topology-stage"
                    [style.width.px]="stageWidth()"
                    [style.height.px]="stageHeight()"
                  >
                    <div class="topo-col-heads" aria-hidden="true">
                      @for (col of layoutColumns(); track col.depth) {
                        <header
                          class="topo-col-head"
                          [style.left.px]="col.x"
                          [style.width.px]="col.width"
                        >
                          <span class="topo-col-head__num">{{ col.depth + 1 }}</span>
                          <span class="topo-col-head__label">{{ col.label }}</span>
                          <span class="topo-col-head__count">{{ col.nodeCount }}</span>
                        </header>
                      }
                    </div>

                    <svg
                      class="topology-svg"
                      [attr.viewBox]="viewBox()"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <defs>
                        <pattern id="topo-grid" width="18" height="18" patternUnits="userSpaceOnUse">
                          <circle cx="1" cy="1" r="0.75" class="grid-dot" />
                        </pattern>
                        <marker id="topo-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                          <path d="M0,0 L7,3.5 L0,7 Z" class="arrow-fill" />
                        </marker>
                        <marker id="topo-arrow-warn" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                          <path d="M0,0 L7,3.5 L0,7 Z" class="arrow-fill-warn" />
                        </marker>
                      </defs>
                      <rect class="grid-bg" x="0" y="0" [attr.width]="stageWidth()" [attr.height]="stageHeight()" fill="url(#topo-grid)" />
                      <g class="edges">
                        @for (edge of visibleEdges(); track edge.from + edge.to) {
                          @if (edgeGeometry(edge); as geom) {
                            <path
                              [attr.d]="geom.path"
                              class="edge-line"
                              [class.edge-line--path]="edgeOnPath(edge)"
                              [class.edge-line--warn]="edgePathWarn(edge)"
                              [class.edge-line--dim]="edgeDimmed(edge)"
                              [attr.marker-end]="edgePathWarn(edge) ? 'url(#topo-arrow-warn)' : (edgeOnPath(edge) ? 'url(#topo-arrow)' : 'url(#topo-arrow)')"
                            />
                            @if (geom.label && edgeOnPath(edge)) {
                              <g class="edge-label" [attr.transform]="'translate(' + geom.labelX + ',' + geom.labelY + ')'">
                                <rect class="edge-label__bg" [attr.x]="-edgeLabelWidth(geom.label) / 2" y="-8" [attr.width]="edgeLabelWidth(geom.label)" height="14" rx="3" />
                                <text class="edge-label__text" text-anchor="middle" y="1">{{ geom.label }}</text>
                              </g>
                            }
                          }
                        }
                      </g>
                    </svg>

                    <div class="topology-nodes">
                      @for (node of filteredNodes(); track node.id) {
                        <button
                          type="button"
                          class="pipe-node"
                          [class.pipe-node--selected]="selected()?.id === node.id"
                          [class.pipe-node--focus]="focusNodeId() === node.id"
                          [class.pipe-node--dim]="selected() && selected()!.id !== node.id"
                          [class.pipe-node--warn]="node.status === 'warning'"
                          [class.pipe-node--crit]="node.status === 'critical'"
                          [style.left.px]="node.x"
                          [style.top.px]="node.y"
                          [style.width.px]="node.w"
                          [style.height.px]="node.h"
                          [style.--node-accent]="kindAccent(node.kind)"
                          [matTooltip]="nodeTooltip(node)"
                          matTooltipClass="topo-node-tooltip"
                          matTooltipPosition="above"
                          (click)="handleNodeClick(node, $event)"
                        >
                          <span class="pipe-node__index">{{ nodeStepLabel(node) }}</span>
                          @if (node.status === 'warning' || node.status === 'critical') {
                            <span class="pipe-node__alert" [attr.aria-label]="statusLabel(node.status)">
                              <mat-icon>error</mat-icon>
                            </span>
                          } @else {
                            <span class="pipe-node__dot pipe-node__dot--ok" aria-label="Saludable"></span>
                          }
                          <div class="pipe-node__icon" [class]="'pipe-node__icon--' + node.kind">
                            @if (nodeLogoKey(node); as lg) {
                              <app-brand-logo [logo]="lg" size="topo" />
                            } @else {
                              <mat-icon>{{ kindIcon(node.kind) }}</mat-icon>
                            }
                          </div>
                          <span class="pipe-node__title">{{ node.label }}</span>
                          <span class="pipe-node__subtitle">{{ node.detail.subtitle }}</span>
                          @if (nodeCardFact(node); as fact) {
                            <span class="pipe-node__fact">{{ fact }}</span>
                          }
                          @if (nodeCardTags(node).length) {
                            <div class="pipe-node__tags">
                              @for (tag of nodeCardTags(node); track tag) {
                                <span class="pipe-node__tag">{{ tag }}</span>
                              }
                            </div>
                          }
                          @if (node.detail.cpuPercent != null || node.detail.memoryPercent != null) {
                            <div class="pipe-node__meters" aria-hidden="true">
                              @if (node.detail.cpuPercent != null) {
                                <span class="pipe-node__meter" [class]="metricBarTone(node.detail.cpuPercent)">
                                  <i [style.width.%]="node.detail.cpuPercent"></i>
                                </span>
                              }
                              @if (node.detail.memoryPercent != null) {
                                <span class="pipe-node__meter" [class]="metricBarTone(node.detail.memoryPercent)">
                                  <i [style.width.%]="node.detail.memoryPercent"></i>
                                </span>
                              }
                            </div>
                          }
                        </button>
                      }
                    </div>
                  </div>
                </div>
              </div>
            }

            @if (selected(); as sel) {
              <aside class="topo-tray" aria-label="Detalle rápido del nodo">
                <div class="topo-tray__grid">
                  <div class="topo-tray__block">
                    <h4><mat-icon>badge</mat-icon> Identidad</h4>
                    <dl>
                      <dt>ID</dt><dd class="mono">{{ sel.detail.resourceId }}</dd>
                      <dt>Proveedor</dt><dd>{{ sel.provider }}</dd>
                      @if (sel.detail.account) { <dt>Cuenta</dt><dd>{{ sel.detail.account }}</dd> }
                      @if (sel.detail.compliance) { <dt>Compliance</dt><dd>{{ sel.detail.compliance }}</dd> }
                    </dl>
                  </div>
                  <div class="topo-tray__block">
                    <h4><mat-icon>lan</mat-icon> Red</h4>
                    <dl>
                      @if (sel.detail.vpc) { <dt>VPC</dt><dd class="mono">{{ sel.detail.vpc }}</dd> }
                      @if (sel.detail.subnet) { <dt>Subred</dt><dd>{{ sel.detail.subnet }}</dd> }
                      <dt>IP privada</dt><dd class="mono">{{ sel.detail.privateIp ?? '—' }}</dd>
                      <dt>IP pública</dt><dd class="mono">{{ sel.detail.publicIp ?? '—' }}</dd>
                    </dl>
                  </div>
                  <div class="topo-tray__block">
                    <h4><mat-icon>memory</mat-icon> Compute</h4>
                    <dl>
                      @if (sel.detail.instanceType) { <dt>Tipo</dt><dd>{{ sel.detail.instanceType }}</dd> }
                      @if (sel.detail.vcpu != null) { <dt>vCPU</dt><dd>{{ sel.detail.vcpu }}</dd> }
                      @if (sel.detail.memoryGb != null) { <dt>RAM</dt><dd>{{ sel.detail.memoryGb }} GB</dd> }
                      @if (sel.detail.uptime) { <dt>Uptime</dt><dd>{{ sel.detail.uptime }}</dd> }
                      @if (sel.detail.lastSync) { <dt>Sync</dt><dd>{{ sel.detail.lastSync }}</dd> }
                    </dl>
                  </div>
                  <div class="topo-tray__block">
                    <h4><mat-icon>history</mat-icon> Eventos</h4>
                    @if (sel.detail.events?.length) {
                      <ul class="topo-tray__events">
                        @for (ev of sel.detail.events!.slice(0, 3); track ev.time + ev.message) {
                          <li [class]="'topo-tray__event--' + ev.severity">
                            <time>{{ ev.time }}</time>
                            <span>{{ ev.message }}</span>
                          </li>
                        }
                      </ul>
                    } @else {
                      <p class="topo-tray__empty">Sin eventos recientes</p>
                    }
                  </div>
                </div>
                <div class="topo-tray__actions">
                  <span class="topo-tray__hint">
                    <mat-icon>hub</mat-icon>{{ selectedConnections().length }} conexiones · sync {{ sel.detail.syncSource ?? '—' }}
                  </span>
                  <button mat-stroked-button type="button" (click)="nodeActionFor(sel, 'Ver métricas')" [disabled]="!sel.detail.metricsRoute">
                    <mat-icon>monitoring</mat-icon> Métricas
                  </button>
                  <button mat-stroked-button type="button" (click)="nodeActionFor(sel, 'Abrir recurso')" [disabled]="!sel.detail.moduleRoute">
                    <mat-icon>open_in_new</mat-icon> Abrir
                  </button>
                  <button mat-flat-button color="primary" type="button" (click)="nodeActionFor(sel, 'Ejecutar runbook')">
                    <mat-icon>menu_book</mat-icon> Runbook
                  </button>
                  <button mat-stroked-button type="button" (click)="openDetailDialog()">
                    <mat-icon>open_in_full</mat-icon> Detalle completo
                  </button>
                </div>
              </aside>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .topology-page {
      --topo-bg: #f0f2f5;
      --topo-card: #ffffff;
      --topo-accent: #ff9800;
      --topo-line: #cbd5e1;
    }

    .topology-workspace {
      border-radius: 12px;
      overflow: hidden;
      background: var(--topo-card);
      box-shadow: 0 1px 8px color-mix(in srgb, var(--app-text) 5%, transparent);
      min-height: 520px;
    }

    .topology-main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 520px;
    }

    .topology-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
      padding: 0.65rem 1rem;
      background: var(--topo-card);
      border-bottom: 1px solid #e8ecf0;
    }

    .topology-bar__field {
      width: min(180px, 100%);
      margin: 0;
      font-size: 0.82rem;
    }

    .topology-bar ::ng-deep .topology-bar__field.mat-mdc-form-field-appearance-fill {
      .mat-mdc-form-field-infix {
        min-height: 38px;
        padding-top: 14px;
        padding-bottom: 6px;
      }
      .mat-mdc-floating-label,
      .mat-mdc-select-value,
      .mat-mdc-select-min-line { font-size: 0.8rem; }
      .mat-mdc-form-field-subscript-wrapper { display: none; }
    }

    .account-option,
    .account-trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }

    .account-trigger span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .topology-bar__meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.65rem;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e8ecf0;
    }

    .topology-bar__meta strong {
      display: block;
      font-size: 0.78rem;
      color: #1e293b;
      line-height: 1.2;
    }

    .topology-bar__meta span {
      font-size: 0.68rem;
      color: #64748b;
    }

    .topology-bar__stats {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin-left: auto;
      font-size: 0.78rem;
      font-weight: 600;
      color: #64748b;
    }

    .topology-bar__detail {
      margin-left: 0.25rem;
      font-size: 0.78rem;
      font-weight: 650;
      mat-icon { font-size: 16px; width: 16px; height: 16px; margin-right: 0.15rem; }
    }

    .stat-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
    }
    .stat-dot--ok { background: #4caf50; }
    .stat-dot--warn { background: #ff9800; }

    .mono {
      font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
      font-size: 0.92em;
    }

    .topo-scope-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 0;
      padding: 0 1rem;
      background: #f8fafc;
      border-bottom: 1px solid #eef1f4;
    }
    .topo-scope-strip__item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 1rem 0.55rem 0;
      margin-right: 1rem;
      border-right: 1px solid #e2e8f0;
      min-width: 0;
    }
    .topo-scope-strip__item:last-child {
      border-right: none;
      margin-right: 0;
    }
    .topo-scope-strip__item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #64748b;
      flex-shrink: 0;
    }
    .topo-scope-strip__item span {
      display: block;
      font-size: 0.62rem;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
      line-height: 1.2;
    }
    .topo-scope-strip__item strong {
      display: block;
      font-size: 0.82rem;
      font-weight: 800;
      color: #1e293b;
      font-variant-numeric: tabular-nums;
    }
    .topo-scope-strip__item--sync strong { color: #475569; }

    .topo-focus-head {
      padding: 0.85rem 1rem 0.65rem;
      background: var(--topo-card);
      border-bottom: 1px solid #eef1f4;
    }
    .topo-focus-head__main {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 0.75rem 1.25rem;
      justify-content: space-between;
    }
    .topo-focus-head__title {
      margin: 0;
      font-size: 1.65rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #1e293b;
      line-height: 1.15;
    }
    .topo-focus-head__sub {
      margin: 0.2rem 0 0;
      font-size: 0.82rem;
      font-weight: 650;
      color: #64748b;
    }
    .topo-focus-head__sub--warn { color: #e65100; }
    .topo-focus-head__sub--crit { color: #c62828; }

    .topo-focus-head__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      align-items: center;
      max-width: min(100%, 520px);
    }
    .topo-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.18rem 0.45rem;
      border-radius: 6px;
      font-size: 0.68rem;
      font-weight: 650;
      color: #475569;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      line-height: 1.2;
    }
    .topo-chip mat-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
      color: #64748b;
    }
    .topo-chip--env {
      background: #ecfdf5;
      border-color: #a7f3d0;
      color: #047857;
    }
    .topo-chip--cost {
      background: #fff7ed;
      border-color: #fed7aa;
      color: #c2410c;
    }
    .topo-chip--alert {
      background: #fff3e0;
      border-color: #ffcc80;
      color: #e65100;
    }

    .topo-focus-head__metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.65rem;
      padding-top: 0.65rem;
      border-top: 1px solid #f1f5f9;
    }
    .topo-focus-metric {
      flex: 1 1 72px;
      min-width: 72px;
      max-width: 120px;
      padding: 0.35rem 0.5rem;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #eef1f4;
    }
    .topo-focus-metric span {
      display: block;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }
    .topo-focus-metric strong {
      display: block;
      font-size: 0.88rem;
      font-weight: 800;
      color: #1e293b;
      font-variant-numeric: tabular-nums;
      margin-top: 0.1rem;
    }
    .topo-focus-metric__bar {
      height: 4px;
      margin-top: 0.35rem;
      border-radius: 999px;
      background: #e2e8f0;
      overflow: hidden;
    }
    .topo-focus-metric__bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      transition: width 0.2s ease;
    }

    .topo-path {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.15rem 0.25rem;
      padding: 0.45rem 1rem 0.55rem;
      background: #fafbfc;
      border-bottom: 1px solid #eef1f4;
      overflow-x: auto;
    }
    .topo-path__step {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.28rem 0.55rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      font-size: 0.72rem;
      font-weight: 650;
      color: #334155;
      cursor: pointer;
      font-family: inherit;
      white-space: nowrap;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .topo-path__step:hover:not(:disabled) {
      border-color: #ff9800;
      background: #fff8f0;
    }
    .topo-path__step:disabled { cursor: default; }
    .topo-path__step--current {
      border-color: #ff9800;
      background: #fff3e0;
      color: #e65100;
      font-weight: 750;
    }
    .topo-path__step mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #64748b;
    }
    .topo-path__arrow {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #cbd5e1;
      flex-shrink: 0;
    }

    .bar--ok { background: #4caf50; }
    .bar--warn { background: #ff9800; }
    .bar--crit { background: #ef4444; }

    .topology-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-height: 320px;
      color: #64748b;
      font-size: 0.9rem;
    }
    .topology-empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      opacity: 0.5;
    }
    .topology-empty__cta {
      margin-top: 0.5rem;
      padding: 0;
      border: none;
      background: transparent;
      font-size: 0.82rem;
      font-weight: 700;
      color: #0284c7;
      cursor: pointer;
      text-decoration: underline;
    }

    .topology-canvas {
      position: relative;
      flex: 1;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 340px;
      padding: 1rem 1rem 1.25rem 3.25rem;
      background: var(--topo-bg);
    }

    .topo-zoom-rail {
      position: absolute;
      left: 0.65rem;
      top: 50%;
      transform: translateY(-50%);
      z-index: 5;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
      padding: 0.35rem 0.2rem;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgb(15 23 42 / 8%);
    }
    .topo-zoom-rail__pct {
      font-size: 0.62rem;
      font-weight: 800;
      color: #475569;
      padding: 0.15rem 0;
      font-variant-numeric: tabular-nums;
    }

    .topology-canvas__scale {
      transform-origin: center center;
      transition: transform 0.15s ease;
      flex-shrink: 0;
    }

    .topology-stage {
      position: relative;
      background: #ffffff;
      border-radius: 4px;
      box-shadow: 0 1px 6px rgb(15 23 42 / 6%);
    }

    .topo-col-heads {
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
    }
    .topo-col-head {
      position: absolute;
      top: 0;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
    }
    .topo-col-head__num {
      font-size: 0.72rem;
      font-weight: 850;
      color: var(--topo-accent);
      font-variant-numeric: tabular-nums;
    }
    .topo-col-head__label {
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--topo-accent);
    }
    .topo-col-head__count {
      font-size: 0.58rem;
      font-weight: 700;
      color: #94a3b8;
      font-variant-numeric: tabular-nums;
    }

    .topology-svg {
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: visible;
    }

    .grid-dot { fill: #d8dce3; }
    .grid-bg { pointer-events: none; }

    .arrow-fill { fill: #94a3b8; }
    .arrow-fill-warn { fill: #ff9800; }

    .edge-line {
      fill: none;
      stroke: #cbd5e1;
      stroke-width: 2;
      stroke-linecap: round;
    }
    .edge-line--path {
      stroke: #94a3b8;
      stroke-width: 2;
    }
    .edge-line--warn {
      stroke: #ff9800;
      stroke-width: 3;
    }
    .edge-line--dim { opacity: 0.15; }

    .edge-label__bg {
      fill: #ffffff;
      stroke: #e2e8f0;
      stroke-width: 1;
    }
    .edge-label__text {
      fill: #64748b;
      font-size: 8px;
      font-weight: 700;
      font-family: system-ui, sans-serif;
    }

    .topology-nodes {
      position: absolute;
      inset: 0;
      z-index: 3;
    }

    .pipe-node {
      position: absolute;
      margin: 0;
      padding: 0.5rem 0.45rem 0.4rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 0.15rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      cursor: pointer;
      font-family: inherit;
      text-align: center;
      box-shadow: 0 2px 8px rgb(15 23 42 / 6%);
      transition: box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
      overflow: hidden;
    }

    .pipe-node__index {
      position: absolute;
      top: 7px;
      left: 9px;
      font-size: 0.58rem;
      font-weight: 800;
      color: #94a3b8;
      font-variant-numeric: tabular-nums;
    }

    .pipe-node__dot {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      box-shadow: 0 0 0 2px #fff;
    }
    .pipe-node__dot--ok { background: #4caf50; }

    .pipe-node__alert {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 16px;
      height: 16px;
      border-radius: 999px;
      background: #fff3e0;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: #ff9800;
      }
    }

    .pipe-node__icon {
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: #f8fafc;
      flex-shrink: 0;
      mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--node-accent, #64748b); }
    }
    .pipe-node__icon--network mat-icon { color: #14b8a6; }
    .pipe-node__icon--region mat-icon { color: #3b82f6; }
    .pipe-node__icon--instance mat-icon { color: #ff9800; }
    .pipe-node__icon--cloud,
    .pipe-node__icon--account { background: #fff; }

    .pipe-node__title {
      font-size: 0.68rem;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.2;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 0.2rem;
    }
    .pipe-node__subtitle {
      font-size: 0.58rem;
      font-weight: 600;
      color: #64748b;
      line-height: 1.2;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 0.2rem;
    }
    .pipe-node__fact {
      font-size: 0.56rem;
      font-weight: 650;
      font-family: ui-monospace, monospace;
      color: #475569;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pipe-node__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.2rem;
      justify-content: center;
      max-width: 100%;
    }
    .pipe-node__tag {
      padding: 0.05rem 0.3rem;
      border-radius: 4px;
      font-size: 0.52rem;
      font-weight: 700;
      color: #64748b;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      line-height: 1.3;
    }
    .pipe-node__meters {
      display: flex;
      gap: 3px;
      width: 100%;
      padding: 0.15rem 0.35rem 0;
      margin-top: auto;
    }
    .pipe-node__meter {
      flex: 1;
      height: 3px;
      border-radius: 999px;
      background: #e2e8f0;
      overflow: hidden;
    }
    .pipe-node__meter i {
      display: block;
      height: 100%;
      border-radius: inherit;
    }

    .pipe-node:hover {
      box-shadow: 0 4px 14px rgb(15 23 42 / 10%);
    }

    .pipe-node--selected,
    .pipe-node--focus {
      border-color: #ff9800;
      border-width: 2.5px;
      box-shadow: 0 4px 16px rgb(255 152 0 / 18%);
      z-index: 4;
    }

    .pipe-node--warn.pipe-node--selected,
    .pipe-node--warn.pipe-node--focus,
    .pipe-node--warn {
      border-color: #ff9800;
    }

    .pipe-node--crit {
      border-color: #ef4444;
    }

    .pipe-node--dim {
      opacity: 0.4;
    }

    .topo-tray {
      border-top: 1px solid #eef1f4;
      background: #fafbfc;
      padding: 0.75rem 1rem;
    }
    .topo-tray__grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem 1rem;
    }
    .topo-tray__block h4 {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0 0 0.4rem;
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .topo-tray__block h4 mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .topo-tray__block dl {
      margin: 0;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.15rem 0.65rem;
      font-size: 0.72rem;
    }
    .topo-tray__block dt {
      margin: 0;
      color: #94a3b8;
      font-weight: 650;
    }
    .topo-tray__block dd {
      margin: 0;
      color: #1e293b;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .topo-tray__events {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .topo-tray__events li {
      display: flex;
      flex-direction: column;
      gap: 0.05rem;
      padding: 0.3rem 0.45rem;
      border-radius: 6px;
      background: #fff;
      border: 1px solid #eef1f4;
      font-size: 0.68rem;
    }
    .topo-tray__events time {
      font-size: 0.58rem;
      font-weight: 700;
      color: #94a3b8;
      font-variant-numeric: tabular-nums;
    }
    .topo-tray__event--warning { border-left: 3px solid #ff9800; }
    .topo-tray__event--critical { border-left: 3px solid #ef4444; }
    .topo-tray__event--info { border-left: 3px solid #3b82f6; }
    .topo-tray__empty {
      margin: 0;
      font-size: 0.72rem;
      color: #94a3b8;
      font-style: italic;
    }
    .topo-tray__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem;
      margin-top: 0.65rem;
      padding-top: 0.65rem;
      border-top: 1px solid #eef1f4;
    }
    .topo-tray__hint {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-right: auto;
      font-size: 0.72rem;
      font-weight: 650;
      color: #64748b;
    }
    .topo-tray__hint mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .topo-tray__actions button {
      font-size: 0.75rem;
      mat-icon { font-size: 16px; width: 16px; height: 16px; margin-right: 0.1rem; }
    }

    @media (max-width: 960px) {
      .topology-bar__stats { margin-left: 0; flex-basis: 100%; }
      .topology-bar__detail { margin-left: auto; }
      .topo-focus-head__title { font-size: 1.35rem; }
      .topo-tray__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .topology-canvas { padding-left: 3rem; min-height: 280px; }
    }
    @media (max-width: 600px) {
      .topo-scope-strip__item { flex: 1 1 45%; border-right: none; margin-right: 0; }
      .topo-tray__grid { grid-template-columns: 1fr; }
    }
  `,
})
export class TopologyMapComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly actions = inject(PlatformActionService)

  private readonly toast = inject(ToastService)
  private readonly cloudStore = inject(CloudAccountsStore)
  private readonly cloudAccountsSvc = inject(CloudAccountsService)
  private readonly instancesSvc = inject(InstancesService)
  private readonly vpsSvc = inject(VpsService)
  private readonly dialog = inject(MatDialog)
  private readonly router = inject(Router)
  private readonly connections = inject(IntegrationConnectionService)

  @ViewChild('canvasShell') private canvasShell?: ElementRef<HTMLElement>

  readonly accountControl = new FormControl('', { nonNullable: true })
  readonly instanceControl = new FormControl('', { nonNullable: true })
  readonly loading = signal(true)
  readonly lastSync = signal(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }))
  readonly fitScale = signal(1)
  readonly userZoom = signal(1)
  readonly selected = signal<TopologyNode | null>(null)
  readonly kindFilter = signal('')
  readonly statusFilter = signal('')
  readonly cloudAccounts = this.cloudStore.accounts
  readonly accountInstances = signal<Instance[]>([])
  readonly instancesLoading = signal(false)

  private resizeObserver?: ResizeObserver

  readonly layerLegend: { kind: TopologyNodeKind; label: string; color: string }[] = [
    { kind: 'cloud', label: 'Proveedor', color: '#64748b' },
    { kind: 'account', label: 'Cuenta', color: '#8b5cf6' },
    { kind: 'region', label: 'Región', color: '#0ea5e9' },
    { kind: 'network', label: 'Red', color: '#14b8a6' },
    { kind: 'instance', label: 'Instancia', color: '#3b82f6' },
    { kind: 'k8s', label: 'K8s', color: '#326ce5' },
    { kind: 'service', label: 'Servicio', color: '#ec4899' },
    { kind: 'docker', label: 'Docker', color: '#06b6d4' },
    { kind: 'vps', label: 'VPS', color: '#f97316' },
  ]

  readonly statusFilters = [
    { key: '', label: 'Todos', count: () => this.layoutNodes().length },
    { key: 'healthy', label: 'Ok', count: () => this.healthyCount() },
    { key: 'warning', label: 'Adv.', count: () => this.layoutNodes().filter((n) => n.status === 'warning').length },
    { key: 'critical', label: 'Crít.', count: () => this.layoutNodes().filter((n) => n.status === 'critical').length },
  ]

  readonly lastSyncLabel = computed(() => `Topología ${this.lastSync()}`)

  private readonly accountFilter = toSignal(this.accountControl.valueChanges.pipe(startWith('')), {
    initialValue: '',
  })
  private readonly instanceFilter = toSignal(this.instanceControl.valueChanges.pipe(startWith('')), {
    initialValue: '',
  })

  readonly selectedAccount = computed((): CloudAccount | null => {
    const id = this.accountFilter()
    if (!id) return null
    return this.cloudAccounts().find((a) => a.id === id) ?? null
  })

  readonly activeScope = computed(() => {
    const account = this.selectedAccount()
    if (!account) return null
    const scopeId = resolveScopeForCloudAccount(account)
    if (!scopeId) return null
    return TOPOLOGY_SCOPES[scopeId]
  })

  readonly accountInstancesForScope = computed(() => {
    const account = this.selectedAccount()
    if (!account) return []
    return filterInstancesForAccount(this.accountInstances(), account, this.cloudAccounts())
  })

  readonly topologySource = computed(() => {
    const account = this.selectedAccount()
    const scope = this.activeScope()
    if (!account || !scope) return null

    const merged = mergeAccountInstancesIntoScope(
      scope,
      TOPOLOGY_NODES,
      TOPOLOGY_EDGES,
      this.accountInstancesForScope(),
      account,
    )

    const regionNodeId = REGION_NODE_ID[scope.id]
    const primaryRegion = primaryRegionForInstances(
      this.accountInstancesForScope(),
      account.defaultRegion,
    )
    let nodes = merged.nodes
    if (regionNodeId && primaryRegion) {
      nodes = patchRegionNodeLabel(nodes, regionNodeId, primaryRegion)
    }

    return { ...merged, nodes }
  })

  readonly instanceOptions = computed((): TopologyInstanceOption[] => {
    const scope = this.activeScope()
    if (!scope) return []
    return instanceOptionsFromScope(scope, TOPOLOGY_NODES, this.accountInstancesForScope())
  })

  readonly focusNodeId = computed(() => {
    const id = this.instanceFilter()
    const opts = this.instanceOptions()
    if (id && opts.some((n) => n.id === id)) return id
    return opts[0]?.id ?? null
  })

  readonly scopedLayout = computed(() => {
    const account = this.selectedAccount()
    const source = this.topologySource()
    const focusId = this.focusNodeId()
    if (!account || !source || !focusId) return null

    let layout = layoutScopedTopology(source.scope, source.nodes, source.edges, focusId)
    const accNodeId = accountNodeIdForScope(source.scope.id)
    if (accNodeId) {
      layout = {
        ...layout,
        nodes: patchAccountNodeLabel(layout.nodes, accNodeId, account.name),
      }
    }
    return {
      ...layout,
      nodes: enrichTopologyNodes(layout.nodes),
    }
  })

  readonly stageWidth = computed(() => this.scopedLayout()?.width ?? 560)
  readonly stageHeight = computed(() => this.scopedLayout()?.height ?? 200)
  readonly viewBox = computed(() => `0 0 ${this.stageWidth()} ${this.stageHeight()}`)
  readonly scopeAccent = computed(() => this.scopedLayout()?.accent ?? '#6366f1')

  readonly layoutNodes = computed(() => this.scopedLayout()?.nodes ?? [])
  readonly layoutEdges = computed(() => this.scopedLayout()?.edges ?? [])
  readonly layoutColumns = computed((): TopologyColumnMeta[] => this.scopedLayout()?.columns ?? [])
  readonly laneHeaderHeight = computed(() => this.scopedLayout()?.headerHeight ?? 40)

  readonly focusPathIds = computed((): Set<string> => {
    const focusId = this.focusNodeId()
    const source = this.topologySource()
    if (!focusId || !source) return new Set()
    return new Set(
      nodeIdsOnPathToFocus(focusId, source.scope.nodeIds, source.nodes, source.edges),
    )
  })

  readonly COL_GAP = 96

  readonly filteredNodes = computed(() => {
    const kind = this.kindFilter()
    const status = this.statusFilter()
    return this.layoutNodes().filter((n) => {
      const matchKind = !kind || n.kind === kind
      const matchStatus = !status || n.status === status
      return matchKind && matchStatus
    })
  })

  readonly visibleNodes = computed(() => this.filteredNodes())
  readonly visibleEdges = computed(() => this.layoutEdges())

  readonly selectedAncestors = computed(() => {
    const sel = this.selected()
    if (!sel) return []
    return buildAncestorChain(sel.id, this.layoutNodes(), this.layoutEdges())
  })

  readonly selectedConnections = computed(() => {
    const sel = this.selected()
    if (!sel) return []
    return getNodeConnections(sel.id, this.layoutNodes(), this.layoutEdges())
  })

  readonly layerCount = computed(() => new Set(this.layoutNodes().map((n) => n.kind)).size)

  readonly scopeCostLabel = computed(() => {
    const total = topologyCostTotal(this.layoutNodes())
    if (!total) return '—'
    return `${Math.round(total).toLocaleString('es-ES')} €`
  })

  readonly scopeMetrics = computed(() => scopeMetricAverages(this.layoutNodes()))

  readonly scopeMetricSamples = computed(() => {
    const nodes = this.layoutNodes()
    return {
      cpu: nodes.filter((n) => n.detail.cpuPercent != null).length,
      memory: nodes.filter((n) => n.detail.memoryPercent != null).length,
    }
  })

  readonly scopeAvgCpuLabel = computed(() => {
    const v = this.scopeMetrics().avgCpu
    return v != null ? `${Math.round(v)}%` : '—'
  })

  readonly scopeAvgMemoryLabel = computed(() => {
    const v = this.scopeMetrics().avgMemory
    return v != null ? `${Math.round(v)}%` : '—'
  })

  readonly scopeAvgHealthLabel = computed(() => {
    const v = this.scopeMetrics().avgHealth
    return v != null ? `${Math.round(v)}%` : '—'
  })

  readonly zoomPercentLabel = computed(() => `${Math.round(this.fitScale() * this.userZoom() * 100)}%`)

  readonly hasActiveFilters = computed(() => Boolean(this.kindFilter() || this.statusFilter()))

  readonly fitTransform = computed(() => `scale(${this.fitScale() * this.userZoom()})`)

  readonly selectedFocusMetrics = computed((): { label: string; value: string; usage?: number }[] => {
    const sel = this.selected()
    if (!sel) return []
    const d = sel.detail
    const items: { label: string; value: string; usage?: number }[] = []
    if (d.cpuPercent != null) items.push({ label: 'CPU', value: `${d.cpuPercent}%`, usage: d.cpuPercent })
    if (d.memoryPercent != null) items.push({ label: 'RAM', value: `${d.memoryPercent}%`, usage: d.memoryPercent })
    if (d.healthScore != null) items.push({ label: 'Salud', value: `${d.healthScore}%`, usage: d.healthScore })
    if (d.uptime) items.push({ label: 'Uptime', value: d.uptime })
    return items.slice(0, 4)
  })

  readonly pathChain = computed(() => {
    const sel = this.selected()
    if (!sel) return []
    const ancestors = this.selectedAncestors().map((n) => ({
      id: n.id,
      label: n.label,
      kind: n.kind,
      logo: nodeLogoKey(n),
      current: false,
    }))
    return [
      ...ancestors,
      {
        id: sel.id,
        label: sel.label,
        kind: sel.kind,
        logo: nodeLogoKey(sel),
        current: true,
      },
    ]
  })

  readonly providerLogo = providerLogo
  readonly nodeLogoKey = nodeLogoKey
  readonly nodeCardFact = nodeCardFact
  readonly nodeCardTags = nodeCardTags
  readonly kindLabel = (k: TopologyNode['kind']): string => KIND_LABELS[k]
  readonly kindIcon = (k: TopologyNode['kind']): string => KIND_ICONS[k]
  readonly kindAccent = (k: TopologyNode['kind']): string => KIND_THEME[k].accent
  readonly kindSoft = (k: TopologyNode['kind']): string => KIND_THEME[k].soft
  readonly statusLabel = (s: TopologyNode['status']): string => STATUS_LABELS[s]

  constructor() {
    effect(() => {
      const accounts = this.cloudAccounts()
      const current = this.accountFilter()
      if (!accounts.length) return
      if (!current || !accounts.some((a) => a.id === current)) {
        this.accountControl.setValue(accounts[0].id, { emitEvent: true })
      }
    })

    effect(() => {
      const opts = this.instanceOptions()
      const current = this.instanceFilter()
      if (!opts.length) {
        this.instanceControl.setValue('', { emitEvent: false })
        return
      }
      if (!current || !opts.some((n) => n.id === current)) {
        this.instanceControl.setValue(opts[0].id, { emitEvent: true })
      }
    })

    effect(() => {
      this.scopedLayout()
      this.focusNodeId()
      queueMicrotask(() => {
        this.syncSelectionToFocus()
        this.attachResizeObserver()
        this.updateFitScale()
      })
    })
  }

  healthyCount = (): number => this.layoutNodes().filter((n) => n.status === 'healthy').length
  issueCount = (): number => this.layoutNodes().filter((n) => n.status !== 'healthy').length

  toggleKindFilter = (kind: TopologyNodeKind): void => {
    this.kindFilter.update((k) => (k === kind ? '' : kind))
  }

  clearFilters = (): void => {
    this.kindFilter.set('')
    this.statusFilter.set('')
  }

  zoomIn = (): void => {
    this.userZoom.update((z) => Math.min(2.5, +(z + 0.12).toFixed(2)))
  }

  zoomOut = (): void => {
    this.userZoom.update((z) => Math.max(0.45, +(z - 0.12).toFixed(2)))
  }

  resetZoom = (): void => {
    this.userZoom.set(1)
  }

  handleConnectCloud = (): void => {
    this.connections.openDataSource().subscribe()
  }

  handleFitView = (): void => {
    this.resetZoom()
    this.updateFitScale()
  }

  nodeMeta = (node: TopologyNode): string | null => {
    const d = node.detail
    if (d.privateIp && d.privateIp !== '—') return d.privateIp
    if (d.cpuPercent != null) return `CPU ${d.cpuPercent}%`
    if (d.region) return d.region
    return null
  }

  nodeTooltip = (node: TopologyNode): string => {
    const d = node.detail
    const parts = [
      `${node.label} · ${KIND_LABELS[node.kind]}`,
      d.subtitle,
      d.resourceId,
      d.region ? `Región ${d.region}` : '',
      d.privateIp && d.privateIp !== '—' ? `IP ${d.privateIp}` : '',
      d.owner ? `Owner ${d.owner}` : '',
      d.cpuPercent != null ? `CPU ${d.cpuPercent}%` : '',
      d.memoryPercent != null ? `RAM ${d.memoryPercent}%` : '',
      STATUS_LABELS[node.status],
    ].filter(Boolean)
    return parts.join(' · ')
  }

  metricBarTone = (usage: number): string => {
    if (usage >= 85) return 'bar--crit'
    if (usage >= 65) return 'bar--warn'
    return 'bar--ok'
  }

  edgeLabelWidth = (label: string): number => Math.max(36, label.length * 5.5 + 12)

  nodeStepLabel = (node: TopologyNode): string => {
    const col = this.layoutColumns().find((c) => node.x >= c.x - 2 && node.x <= c.x + c.width + 2)
    const depth = col?.depth ?? 0
    const siblings = this.layoutNodes()
      .filter((n) => {
        const c = this.layoutColumns().find((col) => n.x >= col.x - 2 && n.x <= col.x + col.width + 2)
        return (c?.depth ?? 0) === depth
      })
      .sort((a, b) => a.y - b.y)
    const idx = siblings.findIndex((n) => n.id === node.id)
    return `${depth + 1}.${idx + 1}`
  }

  edgeOnPath = (edge: TopologyEdge): boolean => {
    const ids = this.focusPathIds()
    return ids.has(edge.from) && ids.has(edge.to)
  }

  edgePathWarn = (edge: TopologyEdge): boolean => {
    if (!this.edgeOnPath(edge)) return false
    const to = this.nodeById(edge.to)
    return to?.status === 'warning' || to?.status === 'critical'
  }

  edgeDimmed = (edge: TopologyEdge): boolean => {
    const ids = this.focusPathIds()
    if (ids.size < 2) return false
    return !ids.has(edge.from) || !ids.has(edge.to)
  }

  private syncSelectionToFocus = (): void => {
    const id = this.focusNodeId()
    if (!id) return
    const node = this.layoutNodes().find((n) => n.id === id)
    if (node) this.selected.set(node)
  }

  ngOnInit(): void {
    this.accountControl.valueChanges.pipe(startWith(this.accountControl.value)).subscribe((id) => {
      this.instanceControl.setValue('', { emitEvent: false })
      this.selected.set(null)
      if (id) this.loadAccountInstances(id)
      else this.accountInstances.set([])
    })
    this.instanceControl.valueChanges.subscribe(() => {
      queueMicrotask(() => this.syncSelectionToFocus())
    })
    of(true)
      .pipe(delay(350))
      .subscribe(() => {
        this.loading.set(false)
        queueMicrotask(() => this.updateFitScale())
      })
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.attachResizeObserver())
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect()
  }

  private attachResizeObserver = (): void => {
    const el = this.canvasShell?.nativeElement
    if (!el || typeof ResizeObserver === 'undefined') return
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.updateFitScale())
    }
    this.resizeObserver.disconnect()
    this.resizeObserver.observe(el)
  }

  private updateFitScale = (): void => {
    const shell = this.canvasShell?.nativeElement
    const layout = this.scopedLayout()
    if (!shell || !layout) {
      this.fitScale.set(1)
      return
    }
    const pad = 16
    const sx = (shell.clientWidth - pad) / layout.width
    const sy = (shell.clientHeight - pad) / layout.height
    if (shell.clientWidth <= 0 || shell.clientHeight <= 0) return
    this.fitScale.set(Math.min(1, sx, sy))
  }

  private nodeById = (id: string): TopologyNode | undefined =>
    this.layoutNodes().find((n) => n.id === id)

  edgeGeometry = (edge: TopologyEdge): TopologyEdgeGeometry | null => {
    const from = this.nodeById(edge.from)
    const to = this.nodeById(edge.to)
    if (!from || !to) return null
    return buildEdgeGeometry(from, to, edge.label)
  }

  edgeActive = (edge: TopologyEdge): boolean => {
    const sel = this.selected()
    if (!sel) return false
    return edge.from === sel.id || edge.to === sel.id
  }

  handleNodeClick = (node: TopologyNode, event: MouseEvent): void => {
    event.stopPropagation()
    this.selected.set(node)
  }

  selectNodeById = (id: string): void => {
    const n = this.nodeById(id)
    if (n) this.selected.set(n)
  }

  private loadAccountInstances = (accountId: string) => {
    const account = this.cloudAccounts().find((a) => a.id === accountId)
    if (!account) {
      this.accountInstances.set([])
      return of([] as Instance[])
    }

    this.instancesLoading.set(true)
    return this.cloudAccountsSvc.listInstances(accountId, account.defaultRegion).pipe(
      map((rows) =>
        rows
          .map((row) => normalizeCloudInstanceRow(row, account))
          .filter((i): i is Instance => !!i),
      ),
      switchMap((list) =>
        list.length
          ? of(list)
          : this.instancesSvc.list({
              cloudAccountId: accountId,
              provider: account.provider as CloudProvider,
            }),
      ),
      map((list) => filterInstancesForAccount(list, account, this.cloudAccounts())),
      catchError(() =>
        this.instancesSvc.list({ provider: account.provider as CloudProvider }).pipe(
          map((list) => filterInstancesForAccount(list, account, this.cloudAccounts())),
          catchError(() => of([] as Instance[])),
        ),
      ),
      tap((list) => this.accountInstances.set(list)),
      finalize(() => this.instancesLoading.set(false)),
    )
  }

  handleHeader = (label: string): void => {
    if (label === 'Ajustar vista') {
      this.handleFitView()
      return
    }
    if (label === 'Actualizar') {
      this.loading.set(true)
      this.cloudStore.load()
      const accountId = this.accountControl.value
      const instances$ = accountId ? this.loadAccountInstances(accountId) : of([] as Instance[])
      instances$.subscribe({
        complete: () => {
          of(true)
            .pipe(delay(400))
            .subscribe(() => {
              this.loading.set(false)
              this.lastSync.set(
                new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
              )
              this.handleFitView()
              this.toast.success('Topología e inventario actualizados')
            })
        },
      })
      return
    }
    if (label === 'Exportar') {
      this.exportTopology()
      return
    }
    this.actions.simulate(`Topología: ${label}`, 600).subscribe()
  }

  private exportTopology = (): void => {
    const layout = this.scopedLayout()
    if (!layout) {
      this.toast.error('No hay topología para exportar')
      return
    }
    const account = this.selectedAccount()
    const slug = (account?.name ?? 'scope').replace(/\s+/g, '-').toLowerCase()
    const metrics = this.scopeMetrics()
    const payload = {
      exportedAt: new Date().toISOString(),
      scope: this.activeScope()?.title,
      account: account?.name,
      provider: account?.provider,
      stats: {
        nodes: layout.nodes.length,
        edges: layout.edges.length,
        healthy: this.healthyCount(),
        issues: this.issueCount(),
        costEurMonth: topologyCostTotal(layout.nodes),
        avgCpu: metrics.avgCpu,
        avgMemory: metrics.avgMemory,
        avgHealth: metrics.avgHealth,
      },
      nodes: layout.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        kind: n.kind,
        provider: n.provider,
        status: n.status,
        logoKey: nodeLogoKey(n),
        moduleRoute: n.detail.moduleRoute,
        metricsRoute: n.detail.metricsRoute,
        detail: n.detail,
      })),
      edges: layout.edges,
    }
    this.downloadBlob(JSON.stringify(payload, null, 2), `topology-${slug}.json`, 'application/json')

    const svg = this.canvasShell?.nativeElement.querySelector('svg.topology-svg')
    if (svg) {
      const clone = svg.cloneNode(true) as SVGSVGElement
      this.downloadBlob(new XMLSerializer().serializeToString(clone), `topology-${slug}.svg`, 'image/svg+xml')
    }

    this.toast.success('Exportación completada (JSON + SVG)')
  }

  private downloadBlob = (content: string, filename: string, mime: string): void => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  nodeAction = (label: string): void => {
    const node = this.selected()
    if (!node) return
    this.nodeActionFor(node, label)
  }

  nodeActionFor = (node: TopologyNode, label: string): void => {
    const normalized = label.toLowerCase()
    if (normalized.includes('abrir')) {
      const route = node.detail.moduleRoute ?? resolveNodeModuleRoute(node)
      if (!route) {
        this.toast.error('Este nodo no tiene módulo vinculado')
        return
      }
      void this.router.navigateByUrl(route)
      return
    }
    if (normalized.includes('métrica') || normalized.includes('metric')) {
      void this.router.navigateByUrl(node.detail.metricsRoute ?? resolveNodeMetricsRoute(node))
      return
    }
    if (normalized.includes('runbook')) {
      this.openRunbookForNode(node)
      return
    }
    this.actions.simulate(`${node.label}: ${label}`, 500).subscribe()
  }

  openRunbookForNode = (node: TopologyNode): void => {
    const preselectedId = node.detail.runbookId ?? resolveRunbookIdForNode(node)
    forkJoin({
      instances: this.instancesSvc.list(),
      accounts: this.cloudAccountsSvc.list(),
      vps: this.vpsSvc.list(),
    }).subscribe({
      next: ({ instances, accounts, vps }) => {
        const targets = buildRunbookTargets(instances, accounts, vps)
        const label = node.label.toLowerCase()
        const match = targets.find((t) => {
          const name = t.name.toLowerCase()
          return name.includes(label) || label.includes(name)
        })
        const ref = this.dialog.open(RunbookExecuteDialogComponent, {
          data: {
            runbooks: defaultRunbooks(),
            instances: targets,
            accounts,
            preselectedId,
            preselectedInstanceId: match?.id,
          },
          width: 'min(1280px, 98vw)',
          maxWidth: '98vw',
          maxHeight: '96vh',
          panelClass: 'runbook-execute-dialog-panel',
        })
        ref.afterClosed().subscribe((result) => {
          if (!result) return
          const rb = defaultRunbooks().find((r) => r.id === result.runbookId)
          this.toast.success(`Runbook «${rb?.name ?? result.runbookId}» preparado para ejecución`)
        })
      },
      error: () => this.toast.error('No se pudieron cargar objetivos del runbook'),
    })
  }

  openDetailDialog = (): void => {
    const node = this.selected()
    if (!node) return
    const ref = this.dialog.open(TopologyNodeDetailDialogComponent, {
      width: 'min(1040px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '94vh',
      panelClass: 'topology-detail-dialog-panel',
      data: {
        node,
        ancestors: this.selectedAncestors(),
        connections: this.selectedConnections(),
        onAction: (label: string) => this.nodeActionFor(node, label),
      } satisfies TopologyNodeDetailDialogData,
    })
    ref.afterClosed().subscribe((result: { selectId?: string } | undefined) => {
      if (result?.selectId) this.selectNodeById(result.selectId)
    })
  }
}
