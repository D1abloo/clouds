import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { DecimalPipe } from '@angular/common'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import {
  fmtUsd,
  sparkPath,
  type CloudComputeRow,
  type CloudProviderUiConfig,
} from './cloud-provider.demo'

export interface CloudComputeDetailDialogData {
  instance: CloudComputeRow
  provider: CloudProviderUiConfig
  canStart: boolean
  canStop: boolean
  canRestart: boolean
  actionLoading: string | null
  getActionLoading: () => string | null
  getInstance: () => CloudComputeRow
  onAction: (action: 'start' | 'stop' | 'restart') => void
}

type InspectorTab = 'overview' | 'network' | 'storage' | 'security' | 'metrics' | 'history'

@Component({
  selector: 'app-cloud-compute-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <div class="ec2-inspector" [class]="'ec2-inspector--' + inst().health">
      <aside class="ec2-inspector__rail" aria-label="Resumen de instancia">
        <div class="ec2-inspector__rail-top">
          <div class="ec2-inspector__glyph" aria-hidden="true">
            <mat-icon>developer_board</mat-icon>
            <span class="ec2-inspector__pulse"></span>
          </div>
          <p class="ec2-inspector__eyebrow">{{ data.provider.instancesLabel }} · Inspector</p>
          <h2 mat-dialog-title>{{ inst().name }}</h2>
          <p class="ec2-inspector__id mono">{{ inst().resourceId }}</p>
          <div class="ec2-inspector__badges">
            <app-status-badge [value]="inst().status" />
            <span [class]="healthBadgeClass()">{{ healthLabel() }}</span>
            @if (inst().spotInstance) {
              <span class="ec2-inspector__pill ec2-inspector__pill--spot">Spot</span>
            }
            @if (inst().autoScaling) {
              <span class="ec2-inspector__pill">{{ providerLabels().scalingPill }}</span>
            }
          </div>
        </div>

        <div class="ec2-inspector__gauges">
          @for (g of gaugeItems(); track g.label) {
            <div class="ec2-inspector__gauge" [attr.data-level]="meterLevel(g.value)">
              <div class="ec2-inspector__ring" [style.--pct]="g.value">
                <strong>{{ g.value }}%</strong>
                <span>{{ g.label }}</span>
              </div>
            </div>
          }
        </div>

        <div class="ec2-inspector__cost-strip">
          <div>
            <span>Coste hora</span>
            <strong>{{ fmtUsd(inst().hourlyCost ?? 0) }}</strong>
          </div>
          <div>
            <span>Coste MTD</span>
            <strong>{{ fmtUsd(inst().monthlyCost) }}</strong>
          </div>
          <div>
            <span>Compliance</span>
            <strong [class]="complianceClass()">{{ inst().complianceScore }}%</strong>
          </div>
        </div>

        <dl class="ec2-inspector__quick">
          <div><dt>Tipo</dt><dd>{{ inst().instanceType }}</dd></div>
          <div><dt>vCPU / RAM</dt><dd>{{ inst().vcpus }} · {{ inst().memoryGb }} GB</dd></div>
          <div><dt>Uptime</dt><dd>{{ inst().uptime }}</dd></div>
          <div><dt>Región</dt><dd>{{ inst().region }}</dd></div>
        </dl>

        <div class="ec2-inspector__checks">
          @for (check of inst().statusChecks ?? []; track check.id) {
            <div [class]="'ec2-inspector__check ec2-inspector__check--' + check.status">
              <mat-icon>{{ checkStatusIcon(check.status) }}</mat-icon>
              <div>
                <strong>{{ check.label }}</strong>
                <span>{{ check.detail }}</span>
              </div>
            </div>
          }
        </div>

        <div class="ec2-inspector__rail-actions">
          <button
            type="button"
            class="ec2-inspector__action ec2-inspector__action--start"
            [disabled]="!data.canStart || isActionLoading('start')"
            (click)="handleAction('start')"
            aria-label="Iniciar instancia"
          >
            <mat-icon>play_arrow</mat-icon>
            Iniciar
          </button>
          <button
            type="button"
            class="ec2-inspector__action ec2-inspector__action--stop"
            [disabled]="!data.canStop || isActionLoading('stop')"
            (click)="handleAction('stop')"
            aria-label="Detener instancia"
          >
            <mat-icon>stop</mat-icon>
            Detener
          </button>
          <button
            type="button"
            class="ec2-inspector__action ec2-inspector__action--restart"
            [disabled]="!data.canRestart || isActionLoading('restart')"
            (click)="handleAction('restart')"
            aria-label="Reiniciar instancia"
          >
            <mat-icon>restart_alt</mat-icon>
            Reiniciar
          </button>
        </div>
      </aside>

      <div class="ec2-inspector__main">
        <header class="ec2-inspector__main-head">
          <div>
            <h3>Detalle operativo</h3>
            <p>{{ inst().region }} · {{ inst().zone }} · {{ inst().account }} · {{ inst().os }}</p>
          </div>
          <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar inspector">
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <nav class="ec2-inspector__tabs" role="tablist" aria-label="Secciones del inspector">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              class="ec2-inspector__tab"
              [class.ec2-inspector__tab--active]="activeTab() === tab.id"
              [attr.aria-selected]="activeTab() === tab.id"
              (click)="handleTabChange(tab.id)"
            >
              <mat-icon>{{ tab.icon }}</mat-icon>
              {{ tab.label }}
            </button>
          }
        </nav>

        <mat-dialog-content class="ec2-inspector__content">
          @switch (activeTab()) {
            @case ('overview') {
              <div class="ec2-inspector__overview">
                <section class="ec2-inspector__card ec2-inspector__card--metrics">
                  <h4><mat-icon>show_chart</mat-icon> Utilización · últimas 6 h</h4>
                  <div class="ec2-inspector__spark-grid">
                    @for (m of metricCards(); track m.label) {
                      <article>
                        <header>
                          <span>{{ m.label }}</span>
                          <strong>{{ m.value }}%</strong>
                        </header>
                        <svg viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true">
                          <path [attr.d]="sparkPath(m.points)" [attr.stroke]="m.color" fill="none" stroke-width="2" />
                        </svg>
                        <em>Media {{ m.avg }}% · pico {{ m.peak }}%</em>
                      </article>
                    }
                  </div>
                </section>

                <section class="ec2-inspector__card">
                  <h4><mat-icon>hub</mat-icon> Topología</h4>
                  <div class="ec2-inspector__topo">
                    <div class="ec2-inspector__topo-node ec2-inspector__topo-node--vpc">
                      <mat-icon>lan</mat-icon>
                      <div>
                        <strong>{{ data.provider.networkTitle }}</strong>
                        <span>{{ inst().network }}</span>
                      </div>
                    </div>
                    <div class="ec2-inspector__topo-line"></div>
                    <div class="ec2-inspector__topo-node">
                      <mat-icon>account_tree</mat-icon>
                      <div>
                        <strong>{{ inst().subnetName }}</strong>
                        <span class="mono">{{ inst().subnetCidr }}</span>
                      </div>
                    </div>
                    <div class="ec2-inspector__topo-line"></div>
                    <div class="ec2-inspector__topo-node ec2-inspector__topo-node--active">
                      <mat-icon>developer_board</mat-icon>
                      <div>
                        <strong>{{ inst().name }}</strong>
                        <span class="mono">{{ inst().privateIp }}</span>
                      </div>
                    </div>
                    @if (inst().loadBalancer && inst().loadBalancer !== '—') {
                      <div class="ec2-inspector__topo-branch">
                        <div class="ec2-inspector__topo-line ec2-inspector__topo-line--branch"></div>
                        <div class="ec2-inspector__topo-node">
                          <mat-icon>balance</mat-icon>
                          <div>
                            <strong>{{ inst().loadBalancer }}</strong>
                            <span>{{ inst().targetGroup }}</span>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </section>

                <section class="ec2-inspector__card">
                  <h4><mat-icon>memory</mat-icon> Compute</h4>
                  <div class="ec2-inspector__kv-stack">
                    <div><span>{{ providerLabels().image }}</span><strong class="mono">{{ inst().amiId }}</strong></div>
                    <div><span>Virtualización</span><strong>{{ inst().virtualizationType }} · {{ inst().architecture }}</strong></div>
                    <div><span>Tenancy / Placement</span><strong>{{ inst().tenancy }} · {{ inst().placementGroup }}</strong></div>
                    <div><span>Auto Scaling</span><strong class="mono">{{ inst().autoScalingGroup }}</strong></div>
                    <div><span>Lanzada / Reinicio</span><strong>{{ inst().launchTime }} · {{ inst().lastReboot }}</strong></div>
                  </div>
                </section>

                <section class="ec2-inspector__card">
                  <h4><mat-icon>sell</mat-icon> Tags</h4>
                  @if (inst().tags?.length) {
                    <ul class="ec2-inspector__tags">
                      @for (tag of inst().tags; track tag) {
                        <li class="mono">{{ tag }}</li>
                      }
                    </ul>
                  } @else {
                    <p class="ec2-inspector__empty">Sin tags definidos</p>
                  }
                </section>
              </div>
            }

            @case ('network') {
              <section class="ec2-inspector__card ec2-inspector__card--wide">
                <h4><mat-icon>lan</mat-icon> Interfaces y conectividad</h4>
                <div class="ec2-inspector__table-wrap">
                  <table class="ec2-inspector__table">
                    <thead>
                      <tr>
                        <th>{{ providerLabels().nic }}</th>
                        <th>IP privada</th>
                        <th>IP pública</th>
                        <th>Subnet</th>
                        <th>CIDR</th>
                        <th>{{ providerLabels().publicIp }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="mono">{{ inst().networkInterfaceId }}</td>
                        <td class="mono">{{ inst().privateIp }}</td>
                        <td class="mono">{{ inst().publicIp }}</td>
                        <td class="mono">{{ inst().subnetId }}</td>
                        <td class="mono">{{ inst().subnetCidr }}</td>
                        <td class="mono">{{ inst().elasticIp }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="ec2-inspector__kv-grid ec2-inspector__kv-grid--4">
                  <div><span>{{ data.provider.networkTitle }}</span><strong>{{ inst().network }}</strong></div>
                  <div><span>Source/dest. check</span><strong>{{ inst().sourceDestCheck ? 'Activado' : 'Desactivado' }}</strong></div>
                  <div><span>Metadata</span><strong>{{ inst().metadataOptions }}</strong></div>
                  <div><span>{{ data.provider.sgLabel }}</span><strong>{{ (inst().securityGroups ?? []).length }} adjuntos</strong></div>
                </div>
              </section>
            }

            @case ('storage') {
              <section class="ec2-inspector__card ec2-inspector__card--wide">
                <h4><mat-icon>storage</mat-icon> Volúmenes adjuntos</h4>
                <div class="ec2-inspector__table-wrap">
                  <table class="ec2-inspector__table">
                    <thead>
                      <tr>
                        <th>Volumen</th>
                        <th>ID</th>
                        <th>Tamaño</th>
                        <th>Tipo</th>
                        <th>IOPS</th>
                        <th>Device</th>
                        <th>Cifrado</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (vol of inst().volumes ?? []; track vol.id) {
                        <tr>
                          <td><strong>{{ vol.name }}</strong></td>
                          <td class="mono">{{ vol.id }}</td>
                          <td>{{ vol.sizeGb }} GB</td>
                          <td>{{ vol.type }}</td>
                          <td>{{ vol.iops | number }}</td>
                          <td class="mono">{{ vol.device }}</td>
                          <td>{{ vol.encrypted ? 'KMS' : 'No' }}</td>
                          <td><span class="ec2-inspector__vol-status">{{ vol.status }}</span></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
              <div class="ec2-inspector__split">
                <section class="ec2-inspector__card">
                  <h4><mat-icon>backup</mat-icon> Backups</h4>
                  <div class="ec2-inspector__kv-stack">
                    <div><span>Política</span><strong>{{ inst().backupPolicy }}</strong></div>
                    <div><span>Último snapshot</span><strong>{{ inst().lastSnapshot }}</strong></div>
                    <div><span>{{ providerLabels().diskOptimized }}</span><strong>{{ inst().ebsOptimized ? 'Sí' : 'No' }}</strong></div>
                    <div><span>Parches SO</span><strong>{{ inst().patchLevel }}</strong></div>
                  </div>
                </section>
                <section class="ec2-inspector__card">
                  <h4><mat-icon>speed</mat-icon> Rendimiento raíz</h4>
                  <div class="ec2-inspector__kv-stack">
                    <div><span>Tipo volumen</span><strong>{{ inst().volumeType }}</strong></div>
                    <div><span>IOPS</span><strong>{{ inst().volumeIops | number }}</strong></div>
                    <div><span>Capacidad total</span><strong>{{ inst().storageGb }} GB</strong></div>
                    <div><span>Uso disco</span><strong [class]="meterTextClass(inst().disk)">{{ inst().disk }}%</strong></div>
                  </div>
                </section>
              </div>
            }

            @case ('security') {
              <section class="ec2-inspector__card">
                <h4><mat-icon>verified_user</mat-icon> Identidad</h4>
                <div class="ec2-inspector__kv-stack">
                  <div><span>{{ providerLabels().identity }}</span><strong class="mono">{{ inst().iamRole }}</strong></div>
                  <div><span>Key pair SSH</span><strong class="mono">{{ inst().keyName }}</strong></div>
                  <div><span>Monitorización</span><strong>{{ inst().monitoring ? 'Detallada (1 min)' : 'Básica' }}</strong></div>
                  <div><span>{{ providerLabels().agent }}</span><strong>{{ inst().cloudWatchAgent ? 'Activo' : 'No detectado' }}</strong></div>
                  <div><span>Compliance score</span><strong [class]="complianceClass()">{{ inst().complianceScore }}%</strong></div>
                </div>
              </section>

              @for (sg of inst().securityGroupDetails ?? []; track sg.id) {
                <section class="ec2-inspector__card ec2-inspector__card--sg" [class]="'ec2-inspector__card--risk-' + sg.risk">
                  <header class="ec2-inspector__sg-head">
                    <div>
                      <h4><mat-icon>security</mat-icon> {{ sg.name }}</h4>
                      <p class="mono">{{ sg.id }}</p>
                    </div>
                    <span [class]="'ec2-inspector__risk ec2-inspector__risk--' + sg.risk">Riesgo {{ sg.risk }}</span>
                  </header>
                  <p>{{ sg.description }}</p>
                  <div class="ec2-inspector__sg-meta">
                    <span>{{ sg.inbound }} reglas in</span>
                    <span>{{ sg.outbound }} reglas out</span>
                  </div>
                  <ul class="ec2-inspector__sg-rules">
                    @for (rule of sg.rules; track rule) {
                      <li class="mono">{{ rule }}</li>
                    }
                  </ul>
                </section>
              }
            }

            @case ('metrics') {
              <section class="ec2-inspector__card ec2-inspector__card--wide">
                <h4><mat-icon>notifications_active</mat-icon> {{ providerLabels().alarms }}</h4>
                <div class="ec2-inspector__alarms">
                  @for (alarm of inst().alarms ?? []; track alarm.id) {
                    <article [class]="'ec2-inspector__alarm ec2-inspector__alarm--' + alarm.state.toLowerCase()">
                      <div class="ec2-inspector__alarm-state">
                        <mat-icon>{{ alarmStateIcon(alarm.state) }}</mat-icon>
                        <span>{{ alarm.state }}</span>
                      </div>
                      <div>
                        <strong>{{ alarm.name }}</strong>
                        <p>{{ alarm.metric }} · {{ alarm.threshold }}</p>
                        <em>{{ alarm.since }}</em>
                      </div>
                    </article>
                  }
                </div>
              </section>
              <section class="ec2-inspector__card ec2-inspector__card--wide">
                <h4><mat-icon>network_check</mat-icon> Tráfico de red · 6 h</h4>
                <div class="ec2-inspector__net-spark">
                  <svg viewBox="0 0 120 48" preserveAspectRatio="none" aria-hidden="true">
                    <path [attr.d]="sparkPath(inst().networkHistory ?? [], 120, 48)" stroke="#10b981" fill="none" stroke-width="2" />
                  </svg>
                  <span>Throughput agregado · pico {{ networkPeak() }} Mbps</span>
                </div>
              </section>
            }

            @case ('history') {
              <section class="ec2-inspector__card ec2-inspector__card--wide">
                <h4><mat-icon>history</mat-icon> Historial de eventos</h4>
                <ol class="ec2-inspector__history">
                  @for (ev of inst().recentEvents ?? []; track ev.time + ev.event) {
                    <li [class]="'ec2-inspector__event--' + ev.severity">
                      <div class="ec2-inspector__history-dot"></div>
                      <div>
                        <time>{{ ev.time }}</time>
                        <strong>{{ ev.event }}</strong>
                      </div>
                    </li>
                  }
                </ol>
              </section>
            }
          }
        </mat-dialog-content>

        <mat-dialog-actions class="ec2-inspector__footer">
          <button mat-stroked-button type="button" (click)="handleCopyId()">
            <mat-icon>content_copy</mat-icon>
            Copiar ID
          </button>
          <button mat-stroked-button type="button" (click)="handleCopyPrivateIp()">
            <mat-icon>vpn_key</mat-icon>
            Copiar IP privada
          </button>
          <button mat-stroked-button type="button" (click)="handleCopySsh()">
            <mat-icon>terminal</mat-icon>
            Copiar SSH
          </button>
          <span class="ec2-inspector__footer-spacer"></span>
          <button mat-flat-button color="primary" mat-dialog-close type="button">Cerrar</button>
        </mat-dialog-actions>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    :host ::ng-deep .mat-mdc-dialog-title::before { display: none; }
    :host ::ng-deep .mat-mdc-dialog-content { max-height: none; }
    :host ::ng-deep .mat-mdc-dialog-surface {
      padding: 0 !important;
      overflow: hidden;
      border-radius: 14px;
    }

    .ec2-inspector {
      display: grid;
      grid-template-columns: 300px minmax(0, 1fr);
      min-height: min(680px, 90vh);
      min-width: min(980px, 96vw);
      border-radius: 14px;
      overflow: hidden;
      background: var(--app-card);
    }

    .ec2-inspector__rail {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      padding: 1rem;
      background: linear-gradient(180deg, #0b1220 0%, #111827 55%, #0f172a 100%);
      color: #e2e8f0;
      border-right: 1px solid rgba(148, 163, 184, 0.12);
      overflow-y: auto;
    }

    .ec2-inspector__glyph {
      position: relative;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(34, 211, 238, 0.18), rgba(16, 185, 129, 0.12));
      border: 1px solid rgba(34, 211, 238, 0.25);
      margin-bottom: 0.55rem;
    }
    .ec2-inspector__glyph mat-icon { font-size: 28px; width: 28px; height: 28px; color: #67e8f9; }
    .ec2-inspector--warning .ec2-inspector__glyph { background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.08)); border-color: rgba(245,158,11,0.35); }
    .ec2-inspector--warning .ec2-inspector__glyph mat-icon { color: #fcd34d; }
    .ec2-inspector--critical .ec2-inspector__glyph { background: linear-gradient(135deg, rgba(239,68,68,0.22), rgba(248,113,113,0.08)); border-color: rgba(239,68,68,0.35); }
    .ec2-inspector--critical .ec2-inspector__glyph mat-icon { color: #fca5a5; }

    .ec2-inspector__pulse {
      position: absolute; top: 8px; right: 8px; width: 8px; height: 8px;
      border-radius: 50%; background: #34d399;
      animation: ec2-pulse 2s infinite;
    }
    .ec2-inspector--warning .ec2-inspector__pulse { background: #fbbf24; }
    .ec2-inspector--critical .ec2-inspector__pulse { background: #f87171; }
    @keyframes ec2-pulse {
      0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.55); }
      70% { box-shadow: 0 0 0 8px rgba(52,211,153,0); }
      100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
    }

    .ec2-inspector__eyebrow {
      margin: 0; font-size: 0.58rem; font-weight: 800;
      letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;
    }
    h2[mat-dialog-title] {
      margin: 0.2rem 0 0; padding: 0; font-size: 1.05rem; font-weight: 900;
      letter-spacing: -0.02em; color: #f8fafc; line-height: 1.25;
    }
    .ec2-inspector__id { margin: 0.25rem 0 0; font-size: 0.62rem; color: #94a3b8; }
    .ec2-inspector__badges { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.5rem; }
    .ec2-inspector__pill {
      font-size: 0.54rem; font-weight: 800; padding: 0.18rem 0.42rem; border-radius: 999px;
      background: rgba(148,163,184,0.14); color: #cbd5e1; text-transform: uppercase;
    }
    .ec2-inspector__pill--spot { background: rgba(168,85,247,0.2); color: #d8b4fe; }
    .ec2-inspector__health {
      font-size: 0.58rem; font-weight: 800; padding: 0.18rem 0.45rem; border-radius: 999px;
    }
    .ec2-inspector__health--ok { background: rgba(16,185,129,0.18); color: #6ee7b7; }
    .ec2-inspector__health--warn { background: rgba(245,158,11,0.18); color: #fcd34d; }
    .ec2-inspector__health--crit { background: rgba(239,68,68,0.18); color: #fca5a5; }

    .ec2-inspector__gauges { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
    .ec2-inspector__ring {
      --pct: 0; aspect-ratio: 1; border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: conic-gradient(#22d3ee calc(var(--pct) * 1%), rgba(148,163,184,0.12) 0);
      position: relative;
    }
    .ec2-inspector__ring::before {
      content: ''; position: absolute; inset: 5px; border-radius: 50%; background: #0f172a;
    }
    .ec2-inspector__ring strong, .ec2-inspector__ring span { position: relative; z-index: 1; }
    .ec2-inspector__ring strong { font-size: 0.7rem; font-weight: 900; color: #f1f5f9; }
    .ec2-inspector__ring span { font-size: 0.46rem; font-weight: 750; text-transform: uppercase; color: #64748b; margin-top: 0.08rem; }
    .ec2-inspector__gauge[data-level='warn'] .ec2-inspector__ring { background: conic-gradient(#fbbf24 calc(var(--pct) * 1%), rgba(148,163,184,0.12) 0); }
    .ec2-inspector__gauge[data-level='crit'] .ec2-inspector__ring { background: conic-gradient(#f87171 calc(var(--pct) * 1%), rgba(148,163,184,0.12) 0); }

    .ec2-inspector__cost-strip {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem;
      padding: 0.45rem; border-radius: 10px;
      background: rgba(15,23,42,0.6); border: 1px solid rgba(148,163,184,0.1);
    }
    .ec2-inspector__cost-strip span {
      display: block; font-size: 0.48rem; font-weight: 750; text-transform: uppercase; color: #64748b;
    }
    .ec2-inspector__cost-strip strong { display: block; font-size: 0.68rem; font-weight: 850; margin-top: 0.08rem; }
    .ec2-inspector__cost--ok { color: #6ee7b7; }
    .ec2-inspector__cost--warn { color: #fcd34d; }
    .ec2-inspector__cost--crit { color: #fca5a5; }

    .ec2-inspector__quick {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;
      margin: 0; padding-top: 0.35rem; border-top: 1px solid rgba(148,163,184,0.12);
    }
    .ec2-inspector__quick dt { font-size: 0.48rem; font-weight: 750; text-transform: uppercase; color: #64748b; }
    .ec2-inspector__quick dd { margin: 0.06rem 0 0; font-size: 0.66rem; font-weight: 800; color: #e2e8f0; }

    .ec2-inspector__checks { display: flex; flex-direction: column; gap: 0.35rem; }
    .ec2-inspector__check {
      display: flex; gap: 0.4rem; align-items: flex-start;
      padding: 0.4rem 0.45rem; border-radius: 8px; background: rgba(15,23,42,0.5);
      border: 1px solid rgba(148,163,184,0.1);
    }
    .ec2-inspector__check mat-icon { font-size: 16px; width: 16px; height: 16px; margin-top: 0.1rem; }
    .ec2-inspector__check strong { display: block; font-size: 0.6rem; font-weight: 800; }
    .ec2-inspector__check span { display: block; font-size: 0.54rem; color: #94a3b8; margin-top: 0.08rem; }
    .ec2-inspector__check--passed mat-icon { color: #34d399; }
    .ec2-inspector__check--failed mat-icon { color: #f87171; }
    .ec2-inspector__check--initializing mat-icon { color: #fbbf24; }

    .ec2-inspector__rail-actions {
      display: flex; flex-direction: column; gap: 0.4rem; margin-top: auto;
      padding-top: 0.5rem;
      border-top: 1px solid rgba(148, 163, 184, 0.14);
    }
    .ec2-inspector__action {
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.4rem;
      width: 100%;
      min-height: 36px;
      padding: 0.45rem 0.7rem;
      border-radius: 9px;
      border: 1px solid rgba(148, 163, 184, 0.28);
      background: rgba(30, 41, 59, 0.85);
      color: #f8fafc;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s;
    }
    .ec2-inspector__action mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: inherit;
    }
    .ec2-inspector__action:not(:disabled):hover {
      transform: translateY(-1px);
    }
    .ec2-inspector__action:not(:disabled):active {
      transform: translateY(0);
    }
    .ec2-inspector__action--start:not(:disabled) {
      background: linear-gradient(180deg, #22c55e 0%, #15803d 100%);
      border-color: #4ade80;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.35);
    }
    .ec2-inspector__action--start:not(:disabled):hover {
      background: linear-gradient(180deg, #4ade80 0%, #16a34a 100%);
      box-shadow: 0 3px 10px rgba(74, 222, 128, 0.4);
    }
    .ec2-inspector__action--stop:not(:disabled) {
      background: linear-gradient(180deg, #ef4444 0%, #b91c1c 100%);
      border-color: #f87171;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
    }
    .ec2-inspector__action--stop:not(:disabled):hover {
      background: linear-gradient(180deg, #f87171 0%, #dc2626 100%);
      box-shadow: 0 3px 10px rgba(248, 113, 113, 0.4);
    }
    .ec2-inspector__action--restart:not(:disabled) {
      background: linear-gradient(180deg, #38bdf8 0%, #0284c7 100%);
      border-color: #7dd3fc;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(56, 189, 248, 0.35);
    }
    .ec2-inspector__action--restart:not(:disabled):hover {
      background: linear-gradient(180deg, #7dd3fc 0%, #0ea5e9 100%);
      box-shadow: 0 3px 10px rgba(125, 211, 252, 0.4);
    }
    .ec2-inspector__action:disabled {
      opacity: 1;
      cursor: not-allowed;
      background: rgba(51, 65, 85, 0.55);
      border-color: rgba(100, 116, 139, 0.35);
      color: #64748b;
      box-shadow: none;
      transform: none;
    }
    .ec2-inspector__action:disabled mat-icon {
      color: #64748b;
    }

    .ec2-inspector__main {
      display: flex; flex-direction: column; min-width: 0;
      background: color-mix(in srgb, var(--app-surface) 20%, var(--app-card));
    }
    .ec2-inspector__main-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 0.75rem; padding: 0.75rem 1rem 0.35rem;
    }
    .ec2-inspector__main-head h3 { margin: 0; font-size: 0.92rem; font-weight: 850; }
    .ec2-inspector__main-head p { margin: 0.12rem 0 0; font-size: 0.64rem; color: var(--app-text-muted); font-weight: 650; }

    .ec2-inspector__tabs {
      display: flex; flex-wrap: wrap; gap: 0.2rem;
      padding: 0 1rem 0.5rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .ec2-inspector__tab {
      display: inline-flex; align-items: center; gap: 0.25rem;
      border: 0; background: transparent; padding: 0.35rem 0.6rem;
      border-radius: 8px; font-size: 0.62rem; font-weight: 750;
      color: var(--app-text-muted); cursor: pointer;
    }
    .ec2-inspector__tab mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .ec2-inspector__tab--active {
      background: color-mix(in srgb, #0891b2 10%, var(--app-card));
      color: #0e7490;
      box-shadow: inset 0 -2px 0 #0891b2;
    }

    .ec2-inspector__content { padding: 0.65rem 1rem 0.75rem !important; overflow: auto; flex: 1; }

    .ec2-inspector__overview {
      display: grid; grid-template-columns: 1.4fr 1fr; gap: 0.65rem;
    }
    .ec2-inspector__split { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }

    .ec2-inspector__card {
      padding: 0.7rem 0.75rem; border-radius: 12px;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      margin-bottom: 0.65rem;
    }
    .ec2-inspector__overview .ec2-inspector__card { margin-bottom: 0; }
    .ec2-inspector__card--wide { grid-column: 1 / -1; }
    .ec2-inspector__card--metrics { grid-column: 1 / -1; }
    .ec2-inspector__card h4 {
      display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.55rem;
      font-size: 0.66rem; font-weight: 850; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--app-text-muted);
    }
    .ec2-inspector__card h4 mat-icon { font-size: 15px; width: 15px; height: 15px; color: #0891b2; }

    .ec2-inspector__spark-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.55rem;
    }
    .ec2-inspector__spark-grid article {
      padding: 0.45rem 0.5rem; border-radius: 10px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .ec2-inspector__spark-grid header {
      display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.25rem;
    }
    .ec2-inspector__spark-grid header span { font-size: 0.58rem; font-weight: 750; color: var(--app-text-muted); }
    .ec2-inspector__spark-grid header strong { font-size: 0.82rem; font-weight: 900; }
    .ec2-inspector__spark-grid svg { width: 100%; height: 32px; display: block; }
    .ec2-inspector__spark-grid em { font-style: normal; font-size: 0.52rem; color: var(--app-text-muted); }

    .ec2-inspector__topo { display: flex; flex-direction: column; gap: 0; padding: 0.25rem 0; }
    .ec2-inspector__topo-node {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.45rem 0.55rem; border-radius: 10px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .ec2-inspector__topo-node--vpc { border-color: color-mix(in srgb, #0891b2 20%, transparent); }
    .ec2-inspector__topo-node--active {
      border-color: color-mix(in srgb, #10b981 30%, transparent);
      background: color-mix(in srgb, #10b981 6%, transparent);
    }
    .ec2-inspector__topo-node mat-icon { font-size: 18px; width: 18px; height: 18px; color: #0891b2; }
    .ec2-inspector__topo-node strong { display: block; font-size: 0.68rem; font-weight: 800; }
    .ec2-inspector__topo-node span { display: block; font-size: 0.58rem; color: var(--app-text-muted); }
    .ec2-inspector__topo-line {
      width: 2px; height: 14px; margin-left: 1.1rem;
      background: color-mix(in srgb, var(--app-text) 12%, transparent);
    }
    .ec2-inspector__topo-branch { display: flex; align-items: flex-start; gap: 0.5rem; margin-left: 1.5rem; margin-top: 0.25rem; }
    .ec2-inspector__topo-line--branch { height: 2px; width: 24px; margin-top: 1rem; margin-left: 0; }

    .ec2-inspector__kv-grid {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.55rem 0.75rem;
      margin-top: 0.55rem;
    }
    .ec2-inspector__kv-grid--4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .ec2-inspector__kv-grid span, .ec2-inspector__kv-stack span {
      display: block; font-size: 0.52rem; font-weight: 750; text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .ec2-inspector__kv-grid strong, .ec2-inspector__kv-stack strong {
      display: block; margin-top: 0.1rem; font-size: 0.72rem; font-weight: 800; word-break: break-word;
    }
    .ec2-inspector__kv-stack { display: flex; flex-direction: column; gap: 0.42rem; }

    .ec2-inspector__table-wrap { overflow-x: auto; }
    .ec2-inspector__table {
      width: 100%; border-collapse: collapse; font-size: 0.66rem;
    }
    .ec2-inspector__table th {
      text-align: left; padding: 0.4rem 0.5rem; font-size: 0.52rem; font-weight: 800;
      text-transform: uppercase; color: var(--app-text-muted);
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .ec2-inspector__table td {
      padding: 0.42rem 0.5rem; border-top: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .ec2-inspector__vol-status {
      font-size: 0.58rem; font-weight: 750; padding: 0.1rem 0.35rem; border-radius: 6px;
      background: color-mix(in srgb, #10b981 10%, transparent); color: #047857;
    }

    .ec2-inspector__sg-head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;
      margin-bottom: 0.35rem;
    }
    .ec2-inspector__sg-head h4 { margin: 0; }
    .ec2-inspector__sg-head p { margin: 0.1rem 0 0; font-size: 0.58rem; color: var(--app-text-muted); }
    .ec2-inspector__card--sg p { margin: 0 0 0.35rem; font-size: 0.64rem; color: var(--app-text-muted); line-height: 1.45; }
    .ec2-inspector__sg-meta { display: flex; gap: 0.5rem; font-size: 0.58rem; color: var(--app-text-muted); margin-bottom: 0.35rem; }
    .ec2-inspector__sg-rules {
      list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem;
    }
    .ec2-inspector__sg-rules li {
      font-size: 0.6rem; padding: 0.28rem 0.4rem; border-radius: 6px;
      background: color-mix(in srgb, var(--app-text) 4%, transparent);
    }
    .ec2-inspector__risk {
      font-size: 0.54rem; font-weight: 800; padding: 0.15rem 0.4rem; border-radius: 999px; text-transform: uppercase;
    }
    .ec2-inspector__risk--low { background: color-mix(in srgb, #10b981 12%, transparent); color: #047857; }
    .ec2-inspector__risk--medium { background: color-mix(in srgb, #f59e0b 12%, transparent); color: #b45309; }
    .ec2-inspector__risk--high { background: color-mix(in srgb, #ef4444 12%, transparent); color: #b91c1c; }
    .ec2-inspector__card--risk-high { border-left: 3px solid #ef4444; }

    .ec2-inspector__alarms { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
    .ec2-inspector__alarm {
      display: flex; gap: 0.5rem; padding: 0.55rem 0.6rem; border-radius: 10px;
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .ec2-inspector__alarm--ok { border-color: color-mix(in srgb, #10b981 25%, transparent); background: color-mix(in srgb, #10b981 5%, transparent); }
    .ec2-inspector__alarm--alarm { border-color: color-mix(in srgb, #ef4444 25%, transparent); background: color-mix(in srgb, #ef4444 5%, transparent); }
    .ec2-inspector__alarm-state {
      display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
      font-size: 0.48rem; font-weight: 800; text-transform: uppercase;
    }
    .ec2-inspector__alarm-state mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .ec2-inspector__alarm--ok .ec2-inspector__alarm-state mat-icon { color: #10b981; }
    .ec2-inspector__alarm--alarm .ec2-inspector__alarm-state mat-icon { color: #ef4444; }
    .ec2-inspector__alarm strong { display: block; font-size: 0.68rem; font-weight: 850; }
    .ec2-inspector__alarm p { margin: 0.1rem 0; font-size: 0.58rem; color: var(--app-text-muted); }
    .ec2-inspector__alarm em { font-style: normal; font-size: 0.52rem; color: var(--app-text-muted); }

    .ec2-inspector__net-spark svg { width: 100%; height: 48px; display: block; margin-bottom: 0.35rem; }
    .ec2-inspector__net-spark span { font-size: 0.58rem; color: var(--app-text-muted); font-weight: 650; }

    .ec2-inspector__history {
      list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0;
    }
    .ec2-inspector__history li {
      display: grid; grid-template-columns: 16px 1fr; gap: 0.65rem;
      padding: 0.55rem 0; border-bottom: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .ec2-inspector__history-dot {
      width: 10px; height: 10px; border-radius: 50%; margin-top: 0.25rem;
      background: #0891b2; box-shadow: 0 0 0 3px color-mix(in srgb, #0891b2 15%, transparent);
    }
    .ec2-inspector__event--warning .ec2-inspector__history-dot { background: #f59e0b; box-shadow: 0 0 0 3px color-mix(in srgb, #f59e0b 15%, transparent); }
    .ec2-inspector__event--critical .ec2-inspector__history-dot { background: #ef4444; box-shadow: 0 0 0 3px color-mix(in srgb, #ef4444 15%, transparent); }
    .ec2-inspector__history time { display: block; font-size: 0.56rem; font-weight: 800; color: var(--app-text-muted); }
    .ec2-inspector__history strong { display: block; font-size: 0.68rem; font-weight: 650; line-height: 1.4; margin-top: 0.08rem; }

    .ec2-inspector__tags {
      list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.3rem;
    }
    .ec2-inspector__tags li {
      font-size: 0.58rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 6px;
      background: color-mix(in srgb, #0891b2 8%, transparent); color: #0e7490;
      border: 1px solid color-mix(in srgb, #0891b2 15%, transparent);
    }
    .ec2-inspector__empty { margin: 0; font-size: 0.64rem; color: var(--app-text-muted); }

    .ec2-inspector__meter-warn { color: #b45309; }
    .ec2-inspector__meter-crit { color: #b91c1c; }

    .ec2-inspector__footer {
      padding: 0.65rem 1rem !important;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      margin: 0 !important;
    }
    .ec2-inspector__footer-spacer { flex: 1; }

    @media (max-width: 920px) {
      .ec2-inspector { grid-template-columns: 1fr; min-width: min(96vw, 520px); }
      .ec2-inspector__overview, .ec2-inspector__split, .ec2-inspector__spark-grid, .ec2-inspector__alarms { grid-template-columns: 1fr; }
      .ec2-inspector__kv-grid, .ec2-inspector__kv-grid--4 { grid-template-columns: 1fr 1fr; }
    }
  `,
})
export class CloudComputeDetailDialogComponent {
  readonly data = inject<CloudComputeDetailDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)

  readonly fmtUsd = fmtUsd
  readonly sparkPath = sparkPath
  readonly activeTab = signal<InspectorTab>('overview')

  readonly tabs: { id: InspectorTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Resumen', icon: 'dashboard' },
    { id: 'network', label: 'Red', icon: 'lan' },
    { id: 'storage', label: 'Volúmenes', icon: 'storage' },
    { id: 'security', label: 'Seguridad', icon: 'security' },
    { id: 'metrics', label: 'Métricas', icon: 'monitoring' },
    { id: 'history', label: 'Historial', icon: 'history' },
  ]

  inst = (): CloudComputeRow => this.data.getInstance()

  providerLabels = () => {
    const slug = this.data.provider.slug
    if (slug === 'gcp') {
      return {
        image: 'Image',
        nic: 'NIC',
        publicIp: 'IP estática',
        diskOptimized: 'PD optimized',
        identity: 'Service account',
        agent: 'Ops Agent',
        alarms: 'Alertas Cloud Monitoring',
        scalingPill: 'MIG',
      }
    }
    if (slug === 'azure') {
      return {
        image: 'Image',
        nic: 'NIC',
        publicIp: 'IP pública estática',
        diskOptimized: 'Disk optimized',
        identity: 'Managed identity',
        agent: 'Azure Monitor agent',
        alarms: 'Alertas Azure Monitor',
        scalingPill: 'VMSS',
      }
    }
    return {
      image: 'AMI',
      nic: 'ENI',
      publicIp: 'Elastic IP',
      diskOptimized: 'EBS optimized',
      identity: 'IAM role',
      agent: 'Agente CloudWatch',
      alarms: 'Alarmas CloudWatch',
      scalingPill: 'ASG',
    }
  }

  gaugeItems = () => [
    { label: 'CPU', value: this.inst().cpu },
    { label: 'RAM', value: this.inst().ram },
    { label: 'Disco', value: this.inst().disk },
  ]

  metricCards = () => {
    const i = this.inst()
    const avg = (pts: number[]) => Math.round(pts.reduce((s, v) => s + v, 0) / Math.max(pts.length, 1))
    return [
      { label: 'CPU', value: i.cpu, points: i.cpuHistory ?? [], color: '#22d3ee', avg: avg(i.cpuHistory ?? []), peak: Math.max(...(i.cpuHistory ?? [i.cpu])) },
      { label: 'RAM', value: i.ram, points: i.ramHistory ?? [], color: '#818cf8', avg: avg(i.ramHistory ?? []), peak: Math.max(...(i.ramHistory ?? [i.ram])) },
      { label: 'Disco', value: i.disk, points: i.diskHistory ?? [], color: '#fbbf24', avg: avg(i.diskHistory ?? []), peak: Math.max(...(i.diskHistory ?? [i.disk])) },
    ]
  }

  networkPeak = (): number => Math.max(...(this.inst().networkHistory ?? [0]))

  handleTabChange = (tab: InspectorTab): void => {
    this.activeTab.set(tab)
  }

  healthLabel = (): string => {
    if (this.inst().health === 'critical') return 'Crítica'
    if (this.inst().health === 'warning') return 'Advertencia'
    return 'Saludable'
  }

  healthBadgeClass = (): string => {
    if (this.inst().health === 'critical') return 'ec2-inspector__health ec2-inspector__health--crit'
    if (this.inst().health === 'warning') return 'ec2-inspector__health ec2-inspector__health--warn'
    return 'ec2-inspector__health ec2-inspector__health--ok'
  }

  complianceClass = (): string => {
    const score = this.inst().complianceScore ?? 100
    if (score < 80) return 'ec2-inspector__cost--crit'
    if (score < 90) return 'ec2-inspector__cost--warn'
    return 'ec2-inspector__cost--ok'
  }

  meterLevel = (value: number): string => {
    if (value >= 85) return 'crit'
    if (value >= 70) return 'warn'
    return 'ok'
  }

  meterTextClass = (value: number): string => {
    if (value >= 85) return 'ec2-inspector__meter-crit'
    if (value >= 70) return 'ec2-inspector__meter-warn'
    return ''
  }

  checkStatusIcon = (status: string): string => {
    if (status === 'failed') return 'cancel'
    if (status === 'initializing') return 'hourglass_empty'
    return 'check_circle'
  }

  alarmStateIcon = (state: string): string => {
    if (state === 'ALARM') return 'error'
    if (state === 'INSUFFICIENT_DATA') return 'help_outline'
    return 'check_circle'
  }

  isActionLoading = (action: 'start' | 'stop' | 'restart'): boolean =>
    this.data.getActionLoading() === `${this.inst().id}:${action}`

  handleAction = (action: 'start' | 'stop' | 'restart'): void => {
    this.data.onAction(action)
  }

  handleCopyId = (): void => {
    navigator.clipboard.writeText(this.inst().resourceId).then(() => {
      this.toast.success('ID de instancia copiado')
    })
  }

  handleCopyPrivateIp = (): void => {
    navigator.clipboard.writeText(this.inst().privateIp).then(() => {
      this.toast.success('IP privada copiada')
    })
  }

  handleCopySsh = (): void => {
    const cmd = `ssh -i ~/.ssh/${this.inst().keyName}.pem ec2-user@${this.inst().publicIp !== '—' ? this.inst().publicIp : this.inst().privateIp}`
    navigator.clipboard.writeText(cmd).then(() => {
      this.toast.success('Comando SSH copiado')
    })
  }
}
