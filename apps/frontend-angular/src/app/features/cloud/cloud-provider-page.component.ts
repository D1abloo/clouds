import { PlatformActionService } from '../../shared/platform/platform-action.service'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { catchError, delay, forkJoin, of } from 'rxjs'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatMenuModule } from '@angular/material/menu'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatDialog } from '@angular/material/dialog'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { DetailDialogComponent } from '../../shared/components/detail-dialog/detail-dialog.component'
import { CloudServiceInvoiceDialogComponent } from './cloud-service-invoice-dialog.component'
import { CloudComputeDetailDialogComponent } from './cloud-compute-detail-dialog.component'
import { CloudLaunchDialogComponent } from './cloud-launch-dialog.component'
import { CloudLaunchProgressComponent, type CloudLaunchProgressState } from './cloud-launch-progress.component'
import { RealtimeService } from '../../core/services/realtime.service'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { InstancesService } from '../../core/services/instances.service'
import { LiveCloudSyncService } from '../../core/services/live-cloud-sync.service'
import { CloudPageCacheService } from '../../core/services/cloud-page-cache.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
import { ToastService } from '../../core/services/toast.service'
import { CloudAccountFormDialogComponent } from '../cloud-accounts/cloud-account-form-dialog.component'
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component'
import { IntegrationConnectionService } from '../../core/services/integration-connection.service'
import type { CloudProvider, Instance } from '../../core/models/api.models'
import {
  CLOUD_PROVIDER_CONFIGS,
  buildCloudSnapshot,
  cloudSectionFromSlug,
  cloudSectionsFor,
  cloudSlugFromParam,
  fmtUsd,
  mapApiAccounts,
  sparkPath,
  type CloudAccountRow,
  type CloudBillingPeriod,
  type CloudBillingPeriodBucket,
  type CloudBillingPeriodView,
  type CloudBillingRow,
  type CloudComputeRow,
  type CloudMetricCard,
  type CloudNetworkRow,
  type CloudSection,
  type CloudSlug,
} from './cloud-provider.data'
import { downloadAllCloudInvoicesPdf, downloadCloudInvoicePdf } from './cloud-invoice-download.util'

@Component({
  selector: 'app-cloud-provider-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'cloud-page-host' },
  imports: [
    RouterLink,
    ReactiveFormsModule,
    LoadingStateComponent,
    BrandLogoComponent,
    StatusBadgeComponent,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatTooltipModule,
    CloudLaunchProgressComponent,
  ],
  template: `
    <div class="cloud-page" [style.--cloud-accent]="cfg().accent" [style.--cloud-accent-soft]="cfg().accentSoft">
      <header class="cloud-hero">
        <div class="cloud-hero__brand">
          <app-brand-logo [logo]="cfg().logo" size="lg" />
          <div>
            <h1>{{ cfg().title }}</h1>
            <p>{{ cfg().subtitle }}</p>
          </div>
        </div>
        <div class="cloud-hero__meta">
          <span class="cloud-live"><i aria-hidden="true"></i> Sync {{ data().lastSync }}</span>
          @if (canOpenStudioLaunch()) {
            <button mat-flat-button color="primary" type="button" (click)="handleLaunch()">
              <mat-icon>rocket_launch</mat-icon>
              {{ launchActionLabel() }}
            </button>
          }
          <button mat-stroked-button type="button" (click)="handleSync()" [disabled]="loading()">
            <mat-icon>sync</mat-icon>
            Sincronizar
          </button>
        </div>
      </header>

      <nav class="cloud-section-nav" [attr.aria-label]="'Secciones ' + cfg().title">
        @for (s of sections(); track s.id) {
          <a
            [routerLink]="s.route"
            class="cloud-section-nav__item"
            [class.cloud-section-nav__item--active]="section() === s.id"
          >
            <mat-icon>{{ s.icon }}</mat-icon>
            {{ s.label }}
          </a>
        }
      </nav>

      @if (pageLaunchProgress()) {
        <app-cloud-launch-progress [progress]="pageLaunchProgress()" />
      }

      @if (loading()) {
        <app-loading-state [message]="'Cargando inventario ' + cfg().title + '…'" />
      } @else {
        <div class="cloud-section-body" [class.cloud-section-body--overview]="section() === 'overview'">
        @switch (section()) {
          @case ('overview') {
            <div class="cloud-strip cloud-strip--overview">
              <article><span>Compliance</span><strong>{{ data().overview.complianceScore }}%</strong><em>Última auditoría {{ data().overview.lastAudit }}</em></article>
              <article><span>Disponibilidad</span><strong>{{ data().overview.uptimePercent }}%</strong><em>SLA multi-región</em></article>
              <article><span>Recursos gestionados</span><strong>{{ data().overview.managedResources }}</strong><em>Monitoreo {{ data().overview.monitoringCoverage }}%</em></article>
              <article><span>Backup</span><strong>{{ data().overview.backupCoverage }}%</strong><em>Cobertura snapshots</em></article>
              <article><span>Incidencias</span><strong [class]="data().overview.openIncidents ? 'text-warn' : ''">{{ data().overview.openIncidents }}</strong><em>Abiertas ahora</em></article>
            </div>

            <div class="cloud-grid cloud-grid--overview">
              <section class="cloud-panel cloud-panel--wide">
                <header class="cloud-panel__head">
                  <h3><mat-icon>public</mat-icon> Regiones activas</h3>
                  <span>{{ data().regions }} regiones · {{ data().instances }} recursos · latencia y utilización</span>
                </header>
                <div class="cloud-regions">
                  @for (r of data().regionList; track r.code) {
                    <article class="cloud-region-card">
                      <div class="cloud-region-card__top">
                        <strong>{{ r.code }}</strong>
                        <em>{{ r.latencyMs }}ms</em>
                      </div>
                      <span>{{ r.name }} · {{ r.zones }} zonas</span>
                      <div class="cloud-region-card__util" aria-hidden="true">
                        <i [style.width.%]="r.utilization"></i>
                      </div>
                      <small>Utilización {{ r.utilization }}%</small>
                      <div class="cloud-region-card__stats">
                        <div><em>{{ cfg().instancesLabel }}</em><b>{{ r.instances }}</b></div>
                        <div><em>Coste MTD</em><b>{{ fmtUsd(r.cost) }}</b></div>
                      </div>
                    </article>
                  }
                </div>
              </section>

              <section class="cloud-panel">
                <header class="cloud-panel__head">
                  <h3><mat-icon>notifications_active</mat-icon> Alertas abiertas</h3>
                  <span>{{ data().alertItems.length }} activas</span>
                </header>
                <ul class="cloud-alerts">
                  @for (a of data().alertItems; track a.id) {
                    <li [class]="'cloud-alerts__item--' + a.severity">
                      <div>
                        <strong>{{ a.title }}</strong>
                        <small>{{ a.source }} · {{ a.region }} · {{ a.since }}</small>
                      </div>
                    </li>
                  }
                </ul>
              </section>

              <section class="cloud-panel">
                <header class="cloud-panel__head">
                  <h3><mat-icon>timeline</mat-icon> Actividad reciente</h3>
                  <span>Eventos de control plane</span>
                </header>
                <ul class="cloud-activity">
                  @for (ev of data().activity; track ev.time + ev.event) {
                    <li [class]="'cloud-activity__item--' + ev.severity">
                      <time>{{ ev.time }}</time>
                      <div>
                        <strong>{{ ev.event }}</strong>
                        <small>{{ ev.resource }} · {{ ev.account }} · {{ ev.region }}</small>
                        <small class="cloud-activity__actor">Por {{ ev.actor }}</small>
                      </div>
                    </li>
                  }
                </ul>
              </section>

              <section class="cloud-panel">
                <header class="cloud-panel__head">
                  <h3><mat-icon>payments</mat-icon> Coste mensual</h3>
                  <span>Presupuesto {{ fmtUsd(data().billingSummary.budget) }} · forecast {{ fmtUsd(data().forecast) }}</span>
                </header>
                <div class="cloud-cost-highlight">
                  <strong>{{ fmtUsd(data().monthlyCost) }}</strong>
                  <span>+{{ data().overview.costVariance }}% vs mes anterior · media {{ fmtUsd(data().billingSummary.dailyAverage) }}/día</span>
                </div>
                <ul class="cloud-cost-bars">
                  @for (svc of data().billingByService.slice(0, 5); track svc.service) {
                    <li>
                      <span>{{ svc.service }}</span>
                      <div class="cloud-bar" aria-hidden="true"><i [style.width.%]="svc.share"></i></div>
                      <em>{{ fmtUsd(svc.cost) }}</em>
                    </li>
                  }
                </ul>
              </section>

              <section class="cloud-panel">
                <header class="cloud-panel__head">
                  <h3><mat-icon>monitoring</mat-icon> Salud compute</h3>
                  <span>{{ data().computeSummary.totalVcpus }} vCPU · {{ data().computeSummary.totalMemoryGb }} GB RAM</span>
                </header>
                <div class="cloud-health-grid">
                  <div><span>CPU media</span><strong [class]="meterClass(data().avgCpu)">{{ data().avgCpu }}%</strong></div>
                  <div><span>RAM media</span><strong [class]="meterClass(data().avgRam)">{{ data().avgRam }}%</strong></div>
                  <div><span>En ejecución</span><strong>{{ data().running }}</strong></div>
                  <div><span>Detenidas</span><strong>{{ data().stopped }}</strong></div>
                  <div><span>Saludables</span><strong class="meter--ok">{{ data().computeSummary.healthy }}</strong></div>
                  <div><span>Con alerta</span><strong class="meter--warn">{{ data().computeSummary.warning + data().computeSummary.critical }}</strong></div>
                </div>
                <p class="cloud-panel__note">Uptime medio {{ data().computeSummary.avgUptime }} · {{ data().computeSummary.spotInstances }} spot/preemptible</p>
              </section>
            </div>
          }

          @case ('accounts') {
            <div class="cloud-strip cloud-strip--accounts">
              <article><span>Total {{ cfg().accountsLabel }}</span><strong>{{ data().accounts }}</strong><em>{{ fmtUsd(totalAccountsCost()) }} MTD</em></article>
              <article><span>Con credenciales</span><strong>{{ accountsWithCredentials() }}</strong><em>IAM / service accounts</em></article>
              <article><span>Sync OK</span><strong>{{ accountsSynced() }}</strong><em>Inventario al día</em></article>
              <article><span>RI / SP activos</span><strong>{{ totalReserved() }}</strong><em>Ahorro reservado</em></article>
            </div>
            <section class="cloud-panel">
              <header class="cloud-panel__head">
                <div>
                  <h3><mat-icon>corporate_fare</mat-icon> {{ cfg().accountsLabel }} conectadas</h3>
                  <p>Organizations · credenciales · export de facturación · políticas IAM</p>
                </div>
                <button mat-flat-button color="primary" type="button" (click)="handleAddAccount()">
                  <mat-icon>add</mat-icon>
                  Añadir {{ cfg().accountsLabel }}
                </button>
              </header>
              <div class="cloud-account-grid">
                @for (acc of data().accountRows; track acc.id) {
                  <article class="cloud-account-card">
                    <header>
                      <div>
                        <strong>{{ acc.name }}</strong>
                        <span class="mono">{{ acc.accountId }}</span>
                      </div>
                      <div class="cloud-account-card__badges">
                        <app-status-badge [value]="acc.status" />
                        @if (acc.hasCredentials) {
                          <span class="cloud-pill cloud-pill--ok">Credenciales OK</span>
                        } @else {
                          <span class="cloud-pill cloud-pill--warn">Sin credenciales</span>
                        }
                      </div>
                    </header>
                    <dl>
                      <div><dt>OU / Org</dt><dd>{{ acc.orgUnit }}</dd></div>
                      <div><dt>Entorno</dt><dd>{{ acc.environment }}</dd></div>
                      <div><dt>Región principal</dt><dd>{{ acc.primaryRegion }}</dd></div>
                      <div><dt>Regiones</dt><dd>{{ acc.regions }} activas</dd></div>
                      <div><dt>{{ cfg().instancesLabel }}</dt><dd>{{ acc.instances }} recursos</dd></div>
                      <div><dt>Coste/mes</dt><dd>{{ fmtUsd(acc.monthlyCost) }}</dd></div>
                      <div><dt>IAM roles</dt><dd>{{ acc.iamRoles }}</dd></div>
                      <div><dt>Políticas</dt><dd>{{ acc.policies }}</dd></div>
                      <div><dt>RI / reservas</dt><dd>{{ acc.reservedInstances }}</dd></div>
                      <div><dt>Savings plan</dt><dd>{{ acc.savingsPlan }}</dd></div>
                      <div><dt>Export billing</dt><dd>{{ acc.billingExport }}</dd></div>
                      <div><dt>Expira cred.</dt><dd>{{ acc.credentialExpires }}</dd></div>
                      <div><dt>Sync</dt><dd>{{ acc.lastSync }} · {{ acc.syncStatus }}</dd></div>
                      <div><dt>Contacto</dt><dd>{{ acc.contact }}</dd></div>
                    </dl>
                    <div class="cloud-tags">
                      @for (tag of acc.tags; track tag) {
                        <span>{{ tag }}</span>
                      }
                    </div>
                    <footer>
                      <button mat-stroked-button type="button" (click)="handleValidateAccount(acc)">Validar</button>
                      <button mat-stroked-button type="button" (click)="handleSyncAccount(acc)">Sync</button>
                      <button mat-stroked-button type="button" (click)="handleSyncBilling(acc)">Facturación</button>
                      <button mat-stroked-button type="button" (click)="handleSyncMetrics(acc)">Métricas</button>
                      <button mat-stroked-button type="button" color="warn" (click)="handleDeleteAccount(acc)">Eliminar</button>
                    </footer>
                  </article>
                }
              </div>
            </section>
          }

          @case ('instances') {
            <div class="cloud-strip cloud-strip--compute">
              <article><span>Total</span><strong>{{ data().instances }}</strong><em>{{ cfg().instancesLabel }}</em></article>
              <article><span>Running</span><strong class="meter--ok">{{ data().running }}</strong><em>En ejecución</em></article>
              <article><span>Saludables</span><strong>{{ data().computeSummary.healthy }}</strong><em>Sin alertas</em></article>
              <article><span>vCPU / RAM</span><strong>{{ data().computeSummary.totalVcpus }} / {{ data().computeSummary.totalMemoryGb }}GB</strong><em>Capacidad</em></article>
              <article><span>Coste on-demand</span><strong>{{ fmtUsd(data().computeSummary.onDemandCost) }}</strong><em>Estimado MTD</em></article>
            </div>
            <section class="cloud-panel">
              <header class="cloud-panel__head">
                <div>
                  <h3><mat-icon>dns</mat-icon> {{ cfg().instancesLabel }}</h3>
                  <p>{{ filteredCompute().length }} recursos · filtros por región, estado y búsqueda</p>
                </div>
                <button mat-stroked-button type="button" (click)="handleLaunch()">
                  <mat-icon>rocket_launch</mat-icon>
                  {{ launchActionLabel() }}
                </button>
              </header>
              <div class="cloud-filters">
                <mat-form-field appearance="fill" subscriptSizing="dynamic">
                  <mat-label>Buscar</mat-label>
                  <input matInput [formControl]="searchControl" placeholder="Nombre, ID, IP…" />
                </mat-form-field>
                <mat-form-field appearance="fill" subscriptSizing="dynamic">
                  <mat-label>Región</mat-label>
                  <mat-select [formControl]="regionControl">
                    <mat-option value="">Todas</mat-option>
                    @for (r of regionOptions(); track r) {
                      <mat-option [value]="r">{{ r }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="fill" subscriptSizing="dynamic">
                  <mat-label>Estado</mat-label>
                  <mat-select [formControl]="statusControl">
                    <mat-option value="">Todos</mat-option>
                    <mat-option value="RUNNING">En ejecución</mat-option>
                    <mat-option value="STOPPED">Detenida</mat-option>
                    <mat-option value="WARNING">Advertencia</mat-option>
                    <mat-option value="TERMINATED">Borradas / Terminadas</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover cloud-ec2-table">
                  <thead>
                    <tr>
                      <th>Instancia</th>
                      <th>ID</th>
                      <th>Cuenta</th>
                      <th>Región / Zona</th>
                      <th>Tipo</th>
                      <th>vCPU/RAM</th>
                      <th>Estado</th>
                      <th>Salud</th>
                      <th>IP / Red</th>
                      <th>CPU/RAM/Disco</th>
                      <th>Coste</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of filteredCompute(); track row.id) {
                      <tr>
                        <td>
                          <strong>{{ row.name }}</strong>
                          <small>{{ row.os }} · {{ row.uptime }} uptime</small>
                          @if (row.autoScaling) { <small class="cloud-pill cloud-pill--info">ASG/MIG</small> }
                        </td>
                        <td class="mono">{{ row.resourceId }}</td>
                        <td>{{ row.account }}</td>
                        <td>{{ row.region }} · {{ row.zone }}</td>
                        <td>
                          <strong>{{ row.instanceType }}</strong>
                          <small>{{ row.storageGb }} GB disco</small>
                        </td>
                        <td>{{ row.vcpus }} vCPU · {{ row.memoryGb }} GB</td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td><span [class]="healthClass(row.health)">{{ healthLabel(row.health) }}</span></td>
                        <td>
                          <span class="mono">{{ row.publicIp }}</span>
                          <small>{{ row.network }}</small>
                        </td>
                        <td>
                          <span [class]="meterClass(row.cpu)">{{ row.cpu }}%</span>
                          <div class="cloud-mini-bar" aria-hidden="true"><i [style.width.%]="row.cpu" [class]="barTone(row.cpu)"></i></div>
                          <small>RAM {{ row.ram }}% · Disco {{ row.disk }}%</small>
                        </td>
                        <td>{{ fmtUsd(row.monthlyCost) }}</td>
                        <td class="cloud-ec2-actions">
                          <button
                            mat-icon-button
                            type="button"
                            matTooltip="Iniciar instancia"
                            [disabled]="!canStart(row) || actionLoading() === row.id + ':start'"
                            (click)="handleInstanceAction(row, 'start')"
                            [attr.aria-label]="'Iniciar ' + row.name"
                          >
                            <mat-icon>play_arrow</mat-icon>
                          </button>
                          <button
                            mat-icon-button
                            type="button"
                            matTooltip="Detener instancia"
                            [disabled]="!canStop(row) || actionLoading() === row.id + ':stop'"
                            (click)="handleInstanceAction(row, 'stop')"
                            [attr.aria-label]="'Detener ' + row.name"
                          >
                            <mat-icon>stop</mat-icon>
                          </button>
                          <button
                            mat-icon-button
                            type="button"
                            matTooltip="Reiniciar instancia"
                            [disabled]="!canRestart(row) || actionLoading() === row.id + ':restart'"
                            (click)="handleInstanceAction(row, 'restart')"
                            [attr.aria-label]="'Reiniciar ' + row.name"
                          >
                            <mat-icon>restart_alt</mat-icon>
                          </button>
                          <button
                            mat-stroked-button
                            type="button"
                            class="cloud-ec2-detail-btn"
                            matTooltip="Inspector de instancia"
                            (click)="showComputeDetail(row)"
                            [attr.aria-label]="'Detalles de ' + row.name"
                          >
                            <mat-icon>open_in_full</mat-icon>
                            Detalles
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }

          @case ('network') {
            <div class="cloud-strip cloud-strip--network">
              <article><span>{{ cfg().networkTitle }}</span><strong>{{ data().networkCount }}</strong><em>Redes virtuales</em></article>
              <article><span>Subnets</span><strong>{{ data().networkSummary.totalSubnets }}</strong><em>Total multi-VPC</em></article>
              <article><span>Reglas SG/FW</span><strong>{{ data().networkSummary.totalSgRules }}</strong><em>Inbound + outbound</em></article>
              <article><span>NAT / Peering</span><strong>{{ data().networkSummary.natGateways }} / {{ data().networkSummary.peeringCount }}</strong><em>Conectividad</em></article>
              <article><span>Exposición</span><strong [class]="data().networkSummary.publicExposure ? 'text-warn' : 'meter--ok'">{{ data().networkSummary.publicExposure }}</strong><em>Reglas alto riesgo</em></article>
            </div>
            <div class="cloud-grid cloud-grid--network">
              <section class="cloud-panel cloud-panel--wide">
                <header class="cloud-panel__head">
                  <h3><mat-icon>lan</mat-icon> {{ cfg().networkTitle }} · configuración</h3>
                  <span>{{ data().networkCount }} redes · subnets, route tables, gateways y peering</span>
                </header>
                <div class="cloud-vpc-grid">
                  @for (vpc of data().networkList; track vpc.id) {
                    <article class="cloud-vpc-card">
                      <header class="cloud-vpc-card__head">
                        <div>
                          <strong>{{ vpc.name }}</strong>
                          <span class="mono">{{ vpc.id }}</span>
                          <div class="cloud-tags cloud-tags--inline">
                            @for (tag of vpc.tags ?? []; track tag) {
                              <span>{{ tag }}</span>
                            }
                          </div>
                        </div>
                        <app-status-badge [value]="vpc.status" />
                      </header>

                      <dl class="cloud-vpc-config">
                        <div><dt>CIDR IPv4</dt><dd class="mono">{{ vpc.cidr }}</dd></div>
                        <div><dt>IPv6</dt><dd class="mono">{{ vpc.ipv6Cidr ?? '—' }}</dd></div>
                        <div><dt>Región</dt><dd>{{ vpc.region }} · {{ vpc.availabilityZones }} zonas</dd></div>
                        <div><dt>Cuenta</dt><dd>{{ vpc.account }}</dd></div>
                        <div><dt>Tenancy</dt><dd>{{ vpc.tenancy }}</dd></div>
                        <div><dt>DNS hostnames</dt><dd>{{ vpc.dnsHostnames ? 'Habilitado' : 'No' }}</dd></div>
                        <div><dt>DNS resolution</dt><dd>{{ vpc.dnsResolution ? 'Habilitado' : 'No' }}</dd></div>
                        <div><dt>DHCP options</dt><dd>{{ vpc.dhcpOptions }}</dd></div>
                        <div><dt>Flow logs</dt><dd>{{ vpc.flowLogs ? 'Activo' : 'Inactivo' }}</dd></div>
                        <div><dt>VPC endpoints</dt><dd>{{ vpc.vpcEndpoints }}</dd></div>
                        <div><dt>Network ACLs</dt><dd>{{ vpc.networkAcls }}</dd></div>
                        <div><dt>{{ cfg().instancesLabel }}</dt><dd>{{ vpc.instances }} adjuntas</dd></div>
                      </dl>

                      <div class="cloud-vpc-block">
                        <h4><mat-icon>account_tree</mat-icon> Subnets ({{ vpc.subnetDetails?.length ?? vpc.subnets }})</h4>
                        <div class="data-table-wrap">
                          <table class="premium-table cloud-vpc-subtable">
                            <thead>
                              <tr>
                                <th>Nombre</th>
                                <th>CIDR</th>
                                <th>Zona</th>
                                <th>Tipo</th>
                                <th>IPs libres</th>
                                <th>Instancias</th>
                                <th>Route table</th>
                              </tr>
                            </thead>
                            <tbody>
                              @for (sn of vpc.subnetDetails ?? []; track sn.id) {
                                <tr>
                                  <td><strong>{{ sn.name }}</strong><small class="mono">{{ sn.id }}</small></td>
                                  <td class="mono">{{ sn.cidr }}</td>
                                  <td>{{ sn.zone }}</td>
                                  <td><span [class]="subnetTypeClass(sn.type)">{{ subnetTypeLabel(sn.type) }}</span></td>
                                  <td>{{ sn.availableIps }}</td>
                                  <td>{{ sn.instances }}</td>
                                  <td class="mono">{{ sn.routeTable }}</td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div class="cloud-vpc-block cloud-vpc-block--split">
                        <div>
                          <h4><mat-icon>route</mat-icon> Route tables</h4>
                          <ul class="cloud-vpc-mini-list">
                            @for (rt of vpc.routeTableDetails ?? []; track rt.id) {
                              <li>
                                <strong>{{ rt.name }}</strong>
                                <span class="mono">{{ rt.id }}</span>
                                <em>{{ rt.defaultRoute }} · {{ rt.routes }} rutas · {{ rt.associations }} assoc.</em>
                                @if (rt.main) { <span class="cloud-pill cloud-pill--info">Main</span> }
                              </li>
                            }
                          </ul>
                        </div>
                        <div>
                          <h4><mat-icon>router</mat-icon> Gateways</h4>
                          <ul class="cloud-vpc-mini-list">
                            @for (gw of vpc.gatewayDetails ?? []; track gw.id) {
                              <li>
                                <strong>{{ gw.name }}</strong>
                                <span>{{ gw.type }} · {{ gw.status }}</span>
                                <em class="mono">{{ gw.attached }}</em>
                              </li>
                            } @empty {
                              <li class="cloud-vpc-mini-list__empty">Sin gateways públicos</li>
                            }
                          </ul>
                        </div>
                      </div>

                      @if ((vpc.peeringDetails?.length ?? 0) > 0) {
                        <div class="cloud-vpc-block">
                          <h4><mat-icon>hub</mat-icon> VPC Peering / conexiones</h4>
                          <ul class="cloud-vpc-mini-list cloud-vpc-mini-list--row">
                            @for (peer of vpc.peeringDetails ?? []; track peer.id) {
                              <li>
                                <strong>{{ peer.name }}</strong>
                                <span>→ {{ peer.peerNetwork }} ({{ peer.peerCidr }})</span>
                                <app-status-badge [value]="peer.status" />
                              </li>
                            }
                          </ul>
                        </div>
                      }

                      <footer class="cloud-vpc-card__foot">
                        <button mat-stroked-button type="button" (click)="showNetworkDetail(vpc)">
                          <mat-icon>settings_ethernet</mat-icon>
                          Configuración completa
                        </button>
                      </footer>
                    </article>
                  }
                </div>
              </section>

              <section class="cloud-panel">
                <header class="cloud-panel__head">
                  <h3><mat-icon>security</mat-icon> {{ cfg().sgLabel }}</h3>
                  <span>{{ data().securityGroups.length }} grupos · auditoría incluida</span>
                </header>
                <ul class="cloud-sg-list">
                  @for (sg of data().securityGroups; track sg.id) {
                    <li [class]="'cloud-sg--' + sg.risk">
                      <div>
                        <strong>{{ sg.name }}</strong>
                        <span class="mono">{{ sg.id }} · {{ sg.network }}</span>
                      </div>
                      <p class="cloud-sg__desc">{{ sg.description }}</p>
                      <div class="cloud-sg__meta">
                        <span>{{ sg.inbound }} in · {{ sg.outbound }} out</span>
                        <span>{{ sg.attached }} recursos</span>
                        <span>Audit {{ sg.lastAudit }}</span>
                        <em>Riesgo {{ sg.risk }}</em>
                      </div>
                    </li>
                  }
                </ul>
              </section>

              <section class="cloud-panel">
                <header class="cloud-panel__head">
                  <h3><mat-icon>balance</mat-icon> {{ cfg().lbLabel }}</h3>
                  <span>{{ data().loadBalancers.length }} balanceadores</span>
                </header>
                <ul class="cloud-lb-list">
                  @for (lb of data().loadBalancers; track lb.name) {
                    <li>
                      <strong>{{ lb.name }}</strong>
                      <span>{{ lb.type }} · {{ lb.scheme }} · {{ lb.region }}</span>
                      <span class="mono">{{ lb.dnsName }}</span>
                      <div class="cloud-lb__meta">
                        <span>{{ lb.healthy }}/{{ lb.targets }} healthy</span>
                        <span>{{ lb.requestsPerSec }} req/s</span>
                        <span>Puertos {{ lb.listenerPorts }}</span>
                        <span>{{ lb.sslCert }}</span>
                      </div>
                      <em>Idle timeout {{ lb.idleTimeout }} · <app-status-badge [value]="lb.status" /></em>
                    </li>
                  }
                </ul>
              </section>
            </div>
          }

          @case ('billing') {
            <section class="cloud-panel cloud-billing-trends">
              <header class="cloud-billing-trends__head">
                <div>
                  <h3><mat-icon>account_balance_wallet</mat-icon> Resumen de facturación</h3>
                  <p>{{ billingPeriodView().label }} · {{ cfg().accountsLabel }} · corte {{ data().billingSummary.invoiceDate }}</p>
                </div>
                <div
                  class="cloud-billing-trends__tabs"
                  role="tablist"
                  aria-label="Periodo de facturación"
                >
                  @for (opt of billingPeriodOptions; track opt.id) {
                    <button
                      type="button"
                      role="tab"
                      class="cloud-billing-trends__tab"
                      [class.cloud-billing-trends__tab--active]="billingPeriod() === opt.id"
                      [attr.aria-selected]="billingPeriod() === opt.id"
                      [attr.tabindex]="billingPeriod() === opt.id ? 0 : -1"
                      (click)="handleBillingPeriodChange(opt.id)"
                      (keydown)="handleBillingPeriodKeydown($event, opt.id)"
                    >
                      {{ opt.label }}
                    </button>
                  }
                </div>
              </header>

              <div class="cloud-billing-trends__body">
                <div class="cloud-billing-trends__metrics">
                  <article class="cloud-billing-trends__metric cloud-billing-trends__metric--primary">
                    <span>Total {{ billingPeriodView().label.toLowerCase() }}</span>
                    <strong>{{ fmtUsd(billingPeriodView().total) }}</strong>
                    <em
                      [class]="periodChangePct(billingPeriodView()) >= 0 ? 'trend-up' : 'trend-down'"
                    >
                      {{ periodChangePct(billingPeriodView()) >= 0 ? '+' : '' }}{{ periodChangePct(billingPeriodView()) }}%
                      {{ billingPeriodView().comparisonLabel }}
                    </em>
                  </article>
                  <article class="cloud-billing-trends__metric">
                    <span>Media</span>
                    <strong>{{ fmtUsd(billingPeriodView().average) }}</strong>
                    <em>{{ billingPeriodAverageHint() }}</em>
                  </article>
                  @if (billingPeriodView().forecast) {
                    <article class="cloud-billing-trends__metric">
                      <span>Forecast</span>
                      <strong>{{ fmtUsd(billingPeriodView().forecast!) }}</strong>
                      <em>Proyección al cierre</em>
                    </article>
                  }
                  <article class="cloud-billing-trends__metric">
                    <span>Presupuesto</span>
                    <strong>{{ fmtUsd(data().billingSummary.budget) }}</strong>
                    <em>{{ budgetUsedPct() }}% consumido MTD</em>
                  </article>
                </div>

                <div class="cloud-billing-trends__chart-wrap">
                  <div class="cloud-billing-trends__chart" role="img" [attr.aria-label]="billingChartAriaLabel()">
                    @for (bucket of billingPeriodView().buckets; track bucket.label) {
                      <div class="cloud-billing-trends__bar-col">
                        <div class="cloud-billing-trends__bar-track" aria-hidden="true">
                          <i [style.height.%]="bucketHeight(bucket.amount, billingPeriodView().buckets)"></i>
                        </div>
                        <span class="cloud-billing-trends__bar-value">{{ fmtUsd(bucket.amount) }}</span>
                        <span class="cloud-billing-trends__bar-label">{{ bucket.label }}</span>
                      </div>
                    }
                  </div>
                </div>

                <aside class="cloud-billing-trends__aside">
                  <h4>Top servicios</h4>
                  <ul class="cloud-billing-trends__services">
                    @for (svc of billingPeriodView().topServices; track svc.name) {
                      <li>
                        <span>{{ svc.name }}</span>
                        <div class="cloud-bar" aria-hidden="true"><i [style.width.%]="svc.share"></i></div>
                        <strong>{{ fmtUsd(svc.amount) }}</strong>
                        <em>{{ svc.share }}%</em>
                      </li>
                    }
                  </ul>

                  <h4>Por cuenta</h4>
                  <ul class="cloud-billing-trends__accounts">
                    @for (acc of billingAccountsForPeriod(); track acc.name) {
                      <li>
                        <span>{{ acc.name }}</span>
                        <div class="cloud-bar" aria-hidden="true"><i [style.width.%]="acc.share"></i></div>
                        <strong>{{ fmtUsd(acc.cost) }}</strong>
                      </li>
                    }
                  </ul>

                  <dl class="cloud-billing-trends__meta">
                    <div><dt>Créditos</dt><dd>{{ fmtUsd(data().billingSummary.credits) }}</dd></div>
                    <div><dt>Ahorro RI/SP</dt><dd>{{ fmtUsd(data().billingSummary.reservedSavings) }}</dd></div>
                    <div><dt>Anomalías</dt><dd>{{ data().billingSummary.anomalies }}</dd></div>
                  </dl>
                </aside>
              </div>
            </section>

            <section class="cloud-panel">
              <header class="cloud-panel__head">
                <div>
                  <h3><mat-icon>receipt_long</mat-icon> Facturas por servicio</h3>
                  <p>{{ data().billingByService.length }} servicios · líneas de factura y totales</p>
                </div>
                <div class="cloud-invoice-list__actions">
                  <span class="mono">Corte {{ data().billingSummary.invoiceDate }}</span>
                  <button
                    mat-stroked-button
                    type="button"
                    (click)="handleDownloadAllInvoices()"
                    [disabled]="invoiceDownloadBusy()"
                    matTooltip="PDF con todas las facturas del periodo"
                  >
                    <mat-icon>{{ invoiceDownloadBusy() ? 'hourglass_empty' : 'download' }}</mat-icon>
                    Descargar todas
                  </button>
                </div>
              </header>
              <div class="cloud-invoice-list">
                @for (svc of data().billingByService; track svc.id ?? svc.service) {
                  <article class="cloud-invoice-card">
                    <header class="cloud-invoice-card__head">
                      <mat-icon>{{ svc.icon }}</mat-icon>
                      <div class="cloud-invoice-card__title">
                        <strong>{{ svc.service }}</strong>
                        <span class="mono">{{ svc.invoiceId }}</span>
                        <em>{{ svc.period }} · {{ svc.share }}% del total</em>
                      </div>
                      <div class="cloud-invoice-card__amount">
                        <strong>{{ fmtUsd(svc.total ?? svc.cost) }}</strong>
                        <span [class]="svc.trend > 0 ? 'trend-up' : 'trend-down'">
                          {{ svc.trend > 0 ? '+' : '' }}{{ svc.trend }}% vs mes ant.
                        </span>
                      </div>
                    </header>

                    <div class="data-table-wrap">
                      <table class="premium-table cloud-invoice-table">
                        <thead>
                          <tr>
                            <th>Concepto</th>
                            <th>Región</th>
                            <th>Cantidad</th>
                            <th>P. unit.</th>
                            <th>Importe</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (line of svc.lineItems ?? []; track line.id) {
                            <tr>
                              <td>{{ line.description }}</td>
                              <td>{{ line.region }}</td>
                              <td>{{ line.quantity }}</td>
                              <td>{{ fmtUsd(line.unitPrice) }}</td>
                              <td><strong>{{ fmtUsd(line.amount) }}</strong></td>
                            </tr>
                          }
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colspan="4">Subtotal</td>
                            <td>{{ fmtUsd(svc.subtotal ?? svc.cost) }}</td>
                          </tr>
                          @if (svc.discount) {
                            <tr class="cloud-invoice-table__credit">
                              <td colspan="4">Descuento RI / SP</td>
                              <td>-{{ fmtUsd(svc.discount) }}</td>
                            </tr>
                          }
                          @if (svc.credits) {
                            <tr class="cloud-invoice-table__credit">
                              <td colspan="4">Créditos aplicados</td>
                              <td>-{{ fmtUsd(svc.credits) }}</td>
                            </tr>
                          }
                          <tr class="cloud-invoice-table__total">
                            <td colspan="4">Total servicio</td>
                            <td><strong>{{ fmtUsd(svc.total ?? svc.cost) }}</strong></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <footer class="cloud-invoice-card__foot">
                      <span class="cloud-invoice-card__foot-meta mono">{{ svc.invoiceId }} · {{ svc.accountName }}</span>
                      <div class="cloud-invoice-card__foot-actions">
                        <button
                          mat-stroked-button
                          type="button"
                          (click)="handleDownloadInvoice(svc)"
                          [disabled]="invoiceDownloadBusy()"
                          matTooltip="Descargar PDF"
                          aria-label="Descargar factura PDF"
                        >
                          <mat-icon>download</mat-icon>
                          PDF
                        </button>
                        <button mat-stroked-button type="button" (click)="showServiceInvoice(svc)">
                          <mat-icon>description</mat-icon>
                          Ver factura completa
                        </button>
                      </div>
                    </footer>
                  </article>
                }
              </div>
            </section>

            <section class="cloud-panel cloud-panel--compact">
              <header class="cloud-panel__head">
                <h3><mat-icon>public</mat-icon> Distribución por región</h3>
              </header>
              <ul class="cloud-billing-regions cloud-billing-regions--compact">
                @for (r of data().billingByRegion; track r.region) {
                  <li>
                    <span>{{ r.region }}</span>
                    <div class="cloud-bar" aria-hidden="true"><i [style.width.%]="r.share"></i></div>
                    <strong>{{ fmtUsd(r.cost) }}</strong>
                    <em>{{ r.share }}%</em>
                  </li>
                }
              </ul>
            </section>
          }

          @case ('metrics') {
            <section class="cloud-panel cloud-panel--wide cloud-metrics">
              <header class="cloud-panel__head">
                <div>
                  <h3><mat-icon>show_chart</mat-icon> Métricas</h3>
                  <p>
                    {{ cfg().instancesLabel }}, red y almacenamiento · {{ data().metrics.length }} series ·
                    agregado multi-cuenta · últimas 6 h
                  </p>
                </div>
                <div class="cloud-metrics__actions">
                  <span class="cloud-live"><i aria-hidden="true"></i> En vivo</span>
                  <button mat-stroked-button type="button" (click)="handleSyncAllMetrics()">
                    <mat-icon>sync</mat-icon>
                    Sincronizar
                  </button>
                </div>
              </header>

              <div class="cloud-metrics__summary">
                @for (stat of metricsSummaryStats(); track stat.label) {
                  <article class="cloud-metrics__stat">
                    <span>{{ stat.label }}</span>
                    <strong>{{ stat.value }}</strong>
                    <em>{{ stat.hint }}</em>
                  </article>
                }
              </div>

              <div class="cloud-metrics__grid">
                @for (m of data().metrics; track m.id) {
                  <article class="cloud-metrics__card" [class]="'cloud-metrics__card--' + (m.status ?? 'ok')">
                    <header class="cloud-metrics__card-head">
                      <div>
                        <strong>{{ m.label }}</strong>
                        <small>{{ m.source }}</small>
                      </div>
                      <span [class]="'cloud-metric-status cloud-metric-status--' + (m.status ?? 'ok')">
                        {{ metricStatusLabel(m.status ?? 'ok') }}
                      </span>
                    </header>
                    <div class="cloud-metrics__value">
                      <strong>{{ m.value }}</strong>
                      <span>{{ m.unit }}</span>
                    </div>
                    <dl class="cloud-metrics__stats">
                      <div><dt>Media</dt><dd>{{ m.avg }}{{ metricUnitSuffix(m) }}</dd></div>
                      <div><dt>P95</dt><dd>{{ m.p95 }}{{ metricUnitSuffix(m) }}</dd></div>
                      <div><dt>Pico</dt><dd>{{ m.peak }}{{ metricUnitSuffix(m) }}</dd></div>
                      <div><dt>Umbral</dt><dd>{{ m.threshold }}{{ metricUnitSuffix(m) }}</dd></div>
                    </dl>
                    <div class="cloud-metrics__chart">
                      <svg viewBox="0 0 120 40" preserveAspectRatio="none" [attr.aria-label]="m.label + ' tendencia 6 h'">
                        <path
                          [attr.d]="metricAreaPath(m.points, 120, 40)"
                          [attr.fill]="m.color"
                          fill-opacity="0.12"
                        />
                        <path
                          [attr.d]="sparkPath(m.points, 120, 40)"
                          fill="none"
                          [attr.stroke]="m.color"
                          stroke-width="2"
                          stroke-linecap="round"
                        />
                      </svg>
                    </div>
                    <footer [class]="'cloud-metrics__trend ' + metricTrendClass(m)">
                      <mat-icon>{{ metricTrendIcon(m) }}</mat-icon>
                      <span>{{ metricTrendLabel(m) }}</span>
                    </footer>
                  </article>
                }
              </div>
            </section>
          }
        }
        </div>
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
      overflow: hidden;
    }

    .cloud-page {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      gap: 0.75rem;
      overflow: hidden;
    }

    .cloud-section-body {
      flex: 1;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-bottom: 1.5rem;
    }

    .cloud-hero {
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: 14px;
      background: linear-gradient(135deg, color-mix(in srgb, var(--cloud-accent, #ff9900) 8%, var(--app-card)), var(--app-card));
      border: 1px solid color-mix(in srgb, var(--cloud-accent, #ff9900) 22%, transparent);
    }
    .cloud-hero__brand {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .cloud-hero__brand h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 850;
      letter-spacing: -0.02em;
    }
    .cloud-hero__brand p {
      margin: 0.15rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
      font-weight: 600;
    }
    .cloud-hero__meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .cloud-live {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.62rem;
      font-weight: 800;
      color: #059669;
    }
    .cloud-live i {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #10b981;
      animation: cloud-pulse 1.8s ease-in-out infinite;
    }
    @keyframes cloud-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .cloud-section-nav {
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      padding: 0.2rem;
      border-radius: 11px;
      background: color-mix(in srgb, var(--app-surface) 30%, var(--app-card));
    }
    .cloud-section-nav__item {
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      padding: 0.38rem 0.7rem;
      border-radius: 8px;
      font-size: 0.68rem;
      font-weight: 780;
      color: var(--app-text-muted);
      text-decoration: none;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .cloud-section-nav__item mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .cloud-section-nav__item--active {
      background: var(--app-card);
      color: var(--cloud-accent-soft, #c2410c);
      box-shadow: 0 1px 4px color-mix(in srgb, var(--app-text) 8%, transparent);
    }

    .cloud-strip {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.45rem;
    }
    .cloud-strip article {
      padding: 0.5rem 0.6rem;
      border-radius: 10px;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .cloud-strip span {
      display: block;
      font-size: 0.52rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }
    .cloud-strip strong {
      display: block;
      font-size: 0.95rem;
      font-weight: 850;
      margin: 0.12rem 0;
    }
    .cloud-strip em {
      font-style: normal;
      font-size: 0.56rem;
      color: var(--app-text-muted);
      font-weight: 600;
    }
    .text-warn { color: #b45309 !important; }

    .cloud-pill {
      display: inline-block;
      font-size: 0.52rem;
      font-weight: 800;
      padding: 0.08rem 0.35rem;
      border-radius: 6px;
      margin-top: 0.15rem;
    }
    .cloud-pill--ok { background: color-mix(in srgb, #10b981 15%, transparent); color: #059669; }
    .cloud-pill--warn { background: color-mix(in srgb, #f59e0b 15%, transparent); color: #b45309; }
    .cloud-pill--info { background: color-mix(in srgb, var(--cloud-accent, #ff9900) 12%, transparent); color: var(--cloud-accent-soft, #c2410c); }

    .cloud-alerts {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .cloud-alerts li {
      padding: 0.45rem 0.5rem;
      border-radius: 8px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
      border-left: 3px solid #94a3b8;
    }
    .cloud-alerts__item--warning { border-left-color: #f59e0b; }
    .cloud-alerts__item--critical { border-left-color: #ef4444; }
    .cloud-alerts strong { display: block; font-size: 0.68rem; line-height: 1.35; }
    .cloud-alerts small { font-size: 0.56rem; color: var(--app-text-muted); }

    .cloud-activity__actor { display: block; font-size: 0.54rem; color: var(--app-text-muted); font-style: italic; }

    .cloud-panel__note {
      margin: 0.55rem 0 0;
      font-size: 0.62rem;
      color: var(--app-text-muted);
      font-weight: 650;
    }

    .cloud-region-card__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cloud-region-card__top em {
      font-style: normal;
      font-size: 0.58rem;
      font-weight: 800;
      color: var(--app-text-muted);
    }
    .cloud-region-card__util {
      height: 4px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      margin: 0.35rem 0 0.15rem;
      overflow: hidden;
    }
    .cloud-region-card__util i {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--cloud-accent, #ff9900), var(--cloud-accent-soft, #c2410c));
    }
    .cloud-region-card small { font-size: 0.54rem; color: var(--app-text-muted); }

    .cloud-account-card__badges {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.2rem;
    }
    .cloud-account-card footer {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .cloud-sg__desc {
      margin: 0.2rem 0 0;
      font-size: 0.6rem;
      color: var(--app-text-muted);
      line-height: 1.35;
    }
    .cloud-lb__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.2rem;
      font-size: 0.56rem;
      color: var(--app-text-muted);
    }

    .cloud-vpc-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .cloud-vpc-card {
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      background: color-mix(in srgb, var(--app-surface) 18%, var(--app-card));
      padding: 0.75rem 0.85rem;
    }
    .cloud-vpc-card__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.55rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .cloud-vpc-card__head strong { display: block; font-size: 0.88rem; font-weight: 850; }
    .cloud-vpc-card__head > div > span.mono { font-size: 0.62rem; color: var(--app-text-muted); }
    .cloud-tags--inline { margin-top: 0.25rem; }

    .cloud-vpc-config {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.35rem 0.65rem;
      margin: 0 0 0.65rem;
    }
    .cloud-vpc-config dt {
      font-size: 0.54rem;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--app-text-muted);
    }
    .cloud-vpc-config dd {
      margin: 0.06rem 0 0;
      font-size: 0.68rem;
      font-weight: 650;
      line-height: 1.35;
    }

    .cloud-vpc-block {
      margin-top: 0.55rem;
      padding-top: 0.5rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .cloud-vpc-block h4 {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0 0 0.4rem;
      font-size: 0.72rem;
      font-weight: 800;
    }
    .cloud-vpc-block h4 mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--cloud-accent-soft, #c2410c);
    }
    .cloud-vpc-block--split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;
    }
    .cloud-vpc-subtable small {
      display: block;
      font-size: 0.54rem;
      color: var(--app-text-muted);
    }
    .subnet-type--public { color: #059669; font-weight: 800; font-size: 0.64rem; }
    .subnet-type--private { color: #0369a1; font-weight: 800; font-size: 0.64rem; }
    .subnet-type--isolated { color: #b45309; font-weight: 800; font-size: 0.64rem; }

    .cloud-vpc-mini-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .cloud-vpc-mini-list--row li {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
    }
    .cloud-vpc-mini-list li {
      display: flex;
      flex-direction: column;
      gap: 0.08rem;
      padding: 0.38rem 0.45rem;
      border-radius: 8px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .cloud-vpc-mini-list strong { font-size: 0.68rem; }
    .cloud-vpc-mini-list span { font-size: 0.58rem; color: var(--app-text-muted); }
    .cloud-vpc-mini-list em {
      font-style: normal;
      font-size: 0.56rem;
      color: var(--app-text-muted);
    }
    .cloud-vpc-mini-list__empty {
      font-size: 0.62rem;
      color: var(--app-text-muted);
      font-style: italic;
    }
    .cloud-vpc-card__foot {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.55rem;
      padding-top: 0.45rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }

    .cloud-account-costs {
      list-style: none;
      margin: 0.65rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .cloud-account-costs li {
      display: grid;
      grid-template-columns: 1fr minmax(80px, 120px) 64px;
      gap: 0.45rem;
      align-items: center;
      font-size: 0.64rem;
    }
    .cloud-billing-row__copy small {
      display: block;
      font-size: 0.56rem;
      color: var(--app-text-muted);
      margin-bottom: 0.2rem;
    }
    .cloud-billing-regions li {
      grid-template-columns: 1fr minmax(80px, 120px) 64px 36px;
    }
    .cloud-billing-regions em {
      font-style: normal;
      font-size: 0.58rem;
      color: var(--app-text-muted);
      font-weight: 700;
    }

    .cloud-metric-card--warning { border-color: color-mix(in srgb, #f59e0b 35%, transparent); }
    .cloud-metric-card--critical { border-color: color-mix(in srgb, #ef4444 35%, transparent); }
    .cloud-metric-card__trend--up { color: #b45309; }
    .cloud-metric-card__trend--down { color: #047857; }
    .cloud-metric-card__trend--flat { color: var(--app-text-muted); }
    .cloud-metric-status {
      font-size: 0.54rem;
      font-weight: 800;
      text-transform: uppercase;
      padding: 0.15rem 0.4rem;
      border-radius: 999px;
    }
    .cloud-metric-status--ok { background: color-mix(in srgb, #10b981 12%, transparent); color: #059669; }
    .cloud-metric-status--warning { background: color-mix(in srgb, #f59e0b 12%, transparent); color: #b45309; }
    .cloud-metric-status--critical { background: color-mix(in srgb, #ef4444 12%, transparent); color: #dc2626; }

    /* ── Métricas (mismo lenguaje visual que el resto de la página) ── */
    .cloud-metrics__actions {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem;
    }
    .cloud-metrics__summary {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.5rem;
      margin-bottom: 0.65rem;
    }
    .cloud-metrics__stat {
      padding: 0.55rem 0.65rem; border-radius: 10px;
      background: color-mix(in srgb, var(--cloud-accent) 6%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--cloud-accent) 14%, transparent);
    }
    .cloud-metrics__stat > span {
      display: block; font-size: 0.52rem; font-weight: 750; text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .cloud-metrics__stat > strong {
      display: block; font-size: 1.05rem; font-weight: 900; margin-top: 0.12rem; letter-spacing: -0.02em;
    }
    .cloud-metrics__stat > em {
      display: block; font-style: normal; font-size: 0.54rem; color: var(--app-text-muted); margin-top: 0.1rem;
    }
    .cloud-metrics__grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem;
    }
    .cloud-metrics__card {
      padding: 0.65rem 0.7rem; border-radius: 12px;
      background: color-mix(in srgb, var(--app-surface) 12%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      display: flex; flex-direction: column; gap: 0.45rem;
    }
    .cloud-metrics__card--warning { border-color: color-mix(in srgb, #f59e0b 28%, transparent); }
    .cloud-metrics__card--critical { border-color: color-mix(in srgb, #ef4444 28%, transparent); }
    .cloud-metrics__card-head {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 0.45rem;
    }
    .cloud-metrics__card-head strong { display: block; font-size: 0.72rem; font-weight: 850; }
    .cloud-metrics__card-head small {
      display: block; font-size: 0.54rem; color: var(--app-text-muted); margin-top: 0.06rem;
    }
    .cloud-metrics__value { display: flex; align-items: baseline; gap: 0.25rem; }
    .cloud-metrics__value strong { font-size: 1.35rem; font-weight: 900; letter-spacing: -0.03em; line-height: 1; }
    .cloud-metrics__value span { font-size: 0.62rem; font-weight: 750; color: var(--app-text-muted); }
    .cloud-metrics__stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.25rem 0.4rem; margin: 0;
    }
    .cloud-metrics__stats dt {
      font-size: 0.48rem; font-weight: 750; text-transform: uppercase; color: var(--app-text-muted);
    }
    .cloud-metrics__stats dd { margin: 0.04rem 0 0; font-size: 0.64rem; font-weight: 850; }
    .cloud-metrics__chart {
      padding: 0.35rem 0.4rem; border-radius: 8px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .cloud-metrics__chart svg { width: 100%; height: 40px; display: block; }
    .cloud-metrics__trend {
      display: inline-flex; align-items: center; gap: 0.25rem;
      font-size: 0.54rem; font-weight: 750; color: var(--app-text-muted);
    }
    .cloud-metrics__trend mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .cloud-metrics__trend.cloud-metric-card__trend--up { color: #b45309; }
    .cloud-metrics__trend.cloud-metric-card__trend--down { color: #047857; }

    .cloud-grid {
      display: grid;
      gap: 0.65rem;
    }
    .cloud-grid--overview {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .cloud-grid--network,
    .cloud-grid--billing {
      grid-template-columns: 1.4fr 1fr;
    }
    .cloud-panel {
      border-radius: 12px;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      padding: 0.75rem 0.85rem;
    }
    .cloud-panel--wide { grid-column: 1 / -1; }
    .cloud-panel__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.65rem;
    }
    .cloud-panel__head h3 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0;
      font-size: 0.82rem;
      font-weight: 800;
    }
    .cloud-panel__head h3 mat-icon { font-size: 17px; width: 17px; height: 17px; color: #ff9900; }
    .cloud-panel__head p {
      margin: 0.15rem 0 0;
      font-size: 0.64rem;
      color: var(--app-text-muted);
      font-weight: 600;
    }
    .cloud-panel__head > span {
      font-size: 0.62rem;
      color: var(--app-text-muted);
      font-weight: 650;
    }

    .cloud-regions {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.5rem;
    }
    .cloud-region-card {
      padding: 0.55rem 0.6rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-surface) 25%, transparent);
    }
    .cloud-region-card strong { display: block; font-size: 0.78rem; }
    .cloud-region-card > span { font-size: 0.58rem; color: var(--app-text-muted); }
    .cloud-region-card__stats {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.4rem;
    }
    .cloud-region-card__stats em {
      display: block;
      font-style: normal;
      font-size: 0.52rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .cloud-region-card__stats b { font-size: 0.72rem; font-weight: 800; }

    .cloud-activity {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .cloud-activity li {
      display: grid;
      grid-template-columns: 52px 1fr;
      gap: 0.45rem;
      padding: 0.4rem 0.45rem;
      border-radius: 8px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .cloud-activity time { font-size: 0.58rem; font-weight: 800; color: var(--app-text-muted); }
    .cloud-activity strong { display: block; font-size: 0.68rem; line-height: 1.35; }
    .cloud-activity small { font-size: 0.58rem; color: var(--app-text-muted); }
    .cloud-activity__item--warning { border-left: 2px solid #f59e0b; }
    .cloud-activity__item--critical { border-left: 2px solid #ef4444; }

    .cloud-cost-highlight {
      margin-bottom: 0.55rem;
    }
    .cloud-cost-highlight strong {
      display: block;
      font-size: 1.35rem;
      font-weight: 850;
      color: #c2410c;
    }
    .cloud-cost-highlight span { font-size: 0.62rem; color: var(--app-text-muted); font-weight: 650; }

    .cloud-cost-bars, .cloud-billing-regions {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .cloud-cost-bars li, .cloud-billing-regions li {
      display: grid;
      grid-template-columns: 1fr minmax(80px, 120px) 64px;
      gap: 0.45rem;
      align-items: center;
      font-size: 0.66rem;
    }
    .cloud-bar {
      height: 6px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      overflow: hidden;
    }
    .cloud-bar i {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #ff9900, #ffb84d);
    }

    .cloud-health-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.45rem;
    }
    .cloud-health-grid div {
      padding: 0.45rem 0.5rem;
      border-radius: 8px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .cloud-health-grid span {
      display: block;
      font-size: 0.56rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .cloud-health-grid strong { font-size: 0.95rem; font-weight: 850; }

    .cloud-account-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.65rem;
    }
    .cloud-account-card {
      border-radius: 11px;
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      padding: 0.65rem 0.7rem;
      background: color-mix(in srgb, var(--app-surface) 20%, var(--app-card));
    }
    .cloud-account-card header {
      display: flex;
      justify-content: space-between;
      gap: 0.35rem;
      margin-bottom: 0.45rem;
    }
    .cloud-account-card header strong { display: block; font-size: 0.82rem; }
    .cloud-account-card dl {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.25rem 0.5rem;
      margin: 0 0 0.45rem;
    }
    .cloud-account-card dt { font-size: 0.58rem; color: var(--app-text-muted); font-weight: 650; }
    .cloud-account-card dd { margin: 0; font-size: 0.68rem; font-weight: 650; }
    .cloud-tags { display: flex; flex-wrap: wrap; gap: 0.2rem; margin-bottom: 0.45rem; }
    .cloud-tags span {
      font-size: 0.55rem;
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 6px;
      background: color-mix(in srgb, #ff9900 10%, transparent);
      color: #c2410c;
    }
    .cloud-account-card footer { display: flex; gap: 0.35rem; }

    .cloud-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-bottom: 0.55rem;
    }
    .cloud-filters mat-form-field { min-width: 140px; margin: 0; flex: 1; }
    .cloud-ec2-table small { display: block; font-size: 0.58rem; color: var(--app-text-muted); }
    .cloud-ec2-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.15rem;
      white-space: nowrap;
    }
    .cloud-ec2-actions button[disabled] { opacity: 0.35; }
    .cloud-ec2-actions mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .cloud-ec2-detail-btn {
      margin-left: 0.15rem;
      font-size: 0.62rem !important;
      min-height: 28px !important;
      padding: 0 0.45rem !important;
      border-color: color-mix(in srgb, #0891b2 35%, transparent) !important;
      color: #0e7490 !important;
    }
    .cloud-ec2-detail-btn mat-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
      margin-right: 0.15rem;
    }
    .cloud-mini-bar {
      height: 3px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      margin-top: 0.15rem;
      overflow: hidden;
    }
    .cloud-mini-bar i { display: block; height: 100%; border-radius: inherit; }
    .bar--ok { background: #10b981; }
    .bar--warn { background: #f59e0b; }
    .bar--crit { background: #ef4444; }
    .meter--ok { color: #059669; }
    .meter--warn { color: #b45309; }
    .meter--crit { color: #dc2626; }

    .cloud-sg-list, .cloud-lb-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .cloud-sg-list li, .cloud-lb-list li {
      padding: 0.45rem 0.55rem;
      border-radius: 9px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
      border-left: 3px solid #94a3b8;
    }
    .cloud-sg--high { border-left-color: #ef4444; }
    .cloud-sg--medium { border-left-color: #f59e0b; }
    .cloud-sg--low { border-left-color: #10b981; }
    .cloud-sg-list strong, .cloud-lb-list strong { display: block; font-size: 0.72rem; }
    .cloud-sg-list span, .cloud-lb-list span { font-size: 0.58rem; color: var(--app-text-muted); }
    .cloud-sg__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.2rem;
      font-size: 0.58rem;
      color: var(--app-text-muted);
    }

    .cloud-billing-trends__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.85rem;
    }
    .cloud-billing-trends__head h3 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0;
      font-size: 0.88rem;
      font-weight: 850;
    }
    .cloud-billing-trends__head h3 mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--cloud-accent, #ff9900);
    }
    .cloud-billing-trends__head p {
      margin: 0.2rem 0 0;
      font-size: 0.62rem;
      color: var(--app-text-muted);
      font-weight: 600;
    }
    .cloud-billing-trends__tabs {
      display: inline-flex;
      padding: 0.2rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-text) 5%, transparent);
      gap: 0.15rem;
    }
    .cloud-billing-trends__tab {
      border: 0;
      background: transparent;
      padding: 0.35rem 0.7rem;
      border-radius: 8px;
      font-size: 0.64rem;
      font-weight: 750;
      color: var(--app-text-muted);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .cloud-billing-trends__tab--active {
      background: var(--app-card);
      color: var(--app-text);
      box-shadow: 0 1px 3px color-mix(in srgb, var(--app-text) 8%, transparent);
    }
    .cloud-billing-trends__body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 240px;
      gap: 1rem;
      align-items: start;
    }
    .cloud-billing-trends__metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      grid-column: 1 / -1;
    }
    .cloud-billing-trends__metric {
      padding: 0.65rem 0.7rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-surface) 35%, transparent);
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .cloud-billing-trends__metric--primary {
      background: color-mix(in srgb, var(--cloud-accent, #ff9900) 8%, var(--app-card));
      border-color: color-mix(in srgb, var(--cloud-accent, #ff9900) 18%, transparent);
    }
    .cloud-billing-trends__metric span {
      display: block;
      font-size: 0.54rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }
    .cloud-billing-trends__metric strong {
      display: block;
      font-size: 1.05rem;
      font-weight: 900;
      letter-spacing: -0.02em;
      margin: 0.12rem 0;
    }
    .cloud-billing-trends__metric--primary strong { color: #c2410c; font-size: 1.35rem; }
    .cloud-billing-trends__metric em {
      font-style: normal;
      font-size: 0.58rem;
      color: var(--app-text-muted);
      font-weight: 650;
    }
    .cloud-billing-trends__chart-wrap {
      padding: 0.65rem 0.75rem 0.5rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--app-surface) 25%, transparent);
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .cloud-billing-trends__chart {
      display: flex;
      align-items: flex-end;
      gap: 0.45rem;
      min-height: 160px;
    }
    .cloud-billing-trends__bar-col {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }
    .cloud-billing-trends__bar-track {
      width: 100%;
      max-width: 42px;
      height: 120px;
      display: flex;
      align-items: flex-end;
      border-radius: 8px 8px 4px 4px;
      background: color-mix(in srgb, var(--app-text) 6%, transparent);
      overflow: hidden;
    }
    .cloud-billing-trends__bar-track i {
      display: block;
      width: 100%;
      border-radius: inherit;
      background: linear-gradient(180deg, var(--cloud-accent-soft, #c2410c), var(--cloud-accent, #ff9900));
      min-height: 4px;
      transition: height 0.25s ease;
    }
    .cloud-billing-trends__bar-value {
      font-size: 0.52rem;
      font-weight: 750;
      color: var(--app-text-muted);
      white-space: nowrap;
    }
    .cloud-billing-trends__bar-label {
      font-size: 0.58rem;
      font-weight: 800;
      color: var(--app-text-muted);
    }
    .cloud-billing-trends__aside {
      padding: 0.65rem 0.7rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--app-surface) 25%, transparent);
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .cloud-billing-trends__aside h4 {
      margin: 0 0 0.4rem;
      font-size: 0.62rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }
    .cloud-billing-trends__aside h4:not(:first-child) { margin-top: 0.75rem; }
    .cloud-billing-trends__services,
    .cloud-billing-trends__accounts {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .cloud-billing-trends__services li,
    .cloud-billing-trends__accounts li {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-rows: auto auto;
      gap: 0.15rem 0.4rem;
      align-items: center;
    }
    .cloud-billing-trends__services li span,
    .cloud-billing-trends__accounts li span {
      grid-column: 1;
      font-size: 0.62rem;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cloud-billing-trends__services li .cloud-bar,
    .cloud-billing-trends__accounts li .cloud-bar {
      grid-column: 1 / -1;
    }
    .cloud-billing-trends__services li strong,
    .cloud-billing-trends__accounts li strong {
      grid-column: 2;
      grid-row: 1;
      font-size: 0.64rem;
      font-weight: 850;
    }
    .cloud-billing-trends__services li em {
      grid-column: 2;
      grid-row: 2;
      font-style: normal;
      font-size: 0.52rem;
      color: var(--app-text-muted);
      font-weight: 700;
      text-align: right;
    }
    .cloud-billing-trends__meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.35rem;
      margin: 0.75rem 0 0;
      padding-top: 0.65rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .cloud-billing-trends__meta dt {
      font-size: 0.52rem;
      font-weight: 750;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .cloud-billing-trends__meta dd {
      margin: 0.05rem 0 0;
      font-size: 0.72rem;
      font-weight: 850;
    }

    .cloud-billing-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .cloud-invoice-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .cloud-invoice-card {
      border-radius: 11px;
      border: 1px solid color-mix(in srgb, var(--app-text) 7%, transparent);
      background: color-mix(in srgb, var(--app-surface) 15%, var(--app-card));
      overflow: hidden;
    }
    .cloud-invoice-card__head {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.55rem;
      align-items: center;
      padding: 0.6rem 0.75rem;
      background: color-mix(in srgb, var(--cloud-accent, #ff9900) 5%, transparent);
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .cloud-invoice-card__head mat-icon {
      color: var(--cloud-accent-soft, #c2410c);
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
    .cloud-invoice-card__title strong {
      display: block;
      font-size: 0.82rem;
      font-weight: 850;
    }
    .cloud-invoice-card__title span {
      display: block;
      font-size: 0.6rem;
      color: var(--app-text-muted);
    }
    .cloud-invoice-card__title em {
      font-style: normal;
      font-size: 0.58rem;
      color: var(--app-text-muted);
      font-weight: 650;
    }
    .cloud-invoice-card__amount {
      text-align: right;
    }
    .cloud-invoice-card__amount strong {
      display: block;
      font-size: 0.95rem;
      font-weight: 900;
    }
    .cloud-invoice-card__amount span {
      font-size: 0.58rem;
      font-weight: 700;
    }
    .cloud-invoice-table {
      font-size: 0.66rem;
    }
    .cloud-invoice-table th {
      font-size: 0.56rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .cloud-invoice-table tfoot td {
      padding-top: 0.35rem;
      color: var(--app-text-muted);
      font-weight: 650;
    }
    .cloud-invoice-table__credit td { color: #059669; }
    .cloud-invoice-table__total td {
      font-weight: 800;
      color: var(--app-text);
      border-top: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
    }
    .cloud-invoice-card__foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.45rem 0.75rem 0.6rem;
    }
    .cloud-invoice-card__foot-meta {
      font-size: 0.58rem;
      color: var(--app-text-muted);
      font-weight: 650;
    }
    .cloud-invoice-card__foot-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .cloud-invoice-list__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }
    .cloud-panel--compact {
      padding: 0.6rem 0.75rem;
    }
    .cloud-panel--compact .cloud-panel__head {
      margin-bottom: 0.4rem;
    }
    .cloud-panel--compact h3 {
      font-size: 0.78rem;
    }
    .cloud-billing-regions--compact li {
      grid-template-columns: 100px 1fr 72px 36px;
      font-size: 0.64rem;
    }

    .cloud-billing-summary article {
      padding: 0.55rem 0.6rem;
      border-radius: 10px;
      background: color-mix(in srgb, #ff9900 6%, var(--app-card));
    }
    .cloud-billing-summary span {
      display: block;
      font-size: 0.56rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .cloud-billing-summary strong { display: block; font-size: 1.1rem; font-weight: 850; margin: 0.1rem 0; }
    .cloud-billing-summary em { font-size: 0.58rem; color: var(--app-text-muted); font-style: normal; }

    .cloud-billing-services {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .cloud-billing-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.55rem;
      align-items: center;
      padding: 0.35rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .cloud-billing-row mat-icon { color: #ff9900; font-size: 18px; width: 18px; height: 18px; }
    .cloud-billing-row__copy strong { display: block; font-size: 0.72rem; margin-bottom: 0.2rem; }
    .cloud-billing-row__nums { text-align: right; }
    .cloud-billing-row__nums strong { display: block; font-size: 0.78rem; }
    .cloud-billing-row__nums span { font-size: 0.58rem; font-weight: 700; }
    .trend-up { color: #dc2626; }
    .trend-down { color: #059669; }

    .mono { font-family: ui-monospace, 'JetBrains Mono', monospace; font-size: 0.68rem; }

    @media (max-width: 1100px) {
      .cloud-strip { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .cloud-grid--overview, .cloud-grid--network, .cloud-grid--billing { grid-template-columns: 1fr; }
      .cloud-regions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .cloud-account-grid { grid-template-columns: 1fr; }
      .cloud-vpc-config { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .cloud-vpc-block--split { grid-template-columns: 1fr; }
      .cloud-billing-trends__metrics { grid-template-columns: repeat(2, 1fr); }
      .cloud-billing-trends__body { grid-template-columns: 1fr; }
      .cloud-billing-hero { grid-template-columns: 1fr; }
      .cloud-metrics__summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .cloud-hero {
        flex-direction: column;
        align-items: stretch;
        gap: 0.65rem;
      }
      .cloud-hero__meta {
        flex-wrap: wrap;
        justify-content: flex-start;
      }
      .cloud-section-nav {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        flex-wrap: nowrap;
        padding-bottom: 0.25rem;
      }
      .cloud-section-nav__item {
        flex-shrink: 0;
      }
      .cloud-filters mat-form-field {
        min-width: min(100%, 140px);
        flex: 1 1 140px;
      }
    }
    @media (max-width: 767px) {
      .cloud-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .cloud-metrics__summary { grid-template-columns: 1fr; }
      .cloud-metrics__grid { grid-template-columns: 1fr; }
      .cloud-metrics__stats { grid-template-columns: repeat(2, 1fr); }
      .cloud-billing-summary { grid-template-columns: 1fr; }
      .cloud-regions { grid-template-columns: 1fr; }
      .cloud-vpc-config { grid-template-columns: 1fr; }
      .cloud-billing-trends__metrics { grid-template-columns: 1fr; }
      .cloud-hero__brand h1 { font-size: clamp(1rem, 4.5vw, 1.25rem); }
    }
  `,
})
export class CloudProviderPageComponent implements OnInit {
  private readonly actions = inject(PlatformActionService)

  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly accountsSvc = inject(CloudAccountsService)
  private readonly instancesSvc = inject(InstancesService)
  readonly liveSync = inject(LiveCloudSyncService)
  private readonly pageCache = inject(CloudPageCacheService)
  private readonly pro = inject(ProModeService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)
  private readonly connections = inject(IntegrationConnectionService)
  private readonly realtime = inject(RealtimeService)
  private readonly destroyRef = inject(DestroyRef)

  readonly fmtUsd = fmtUsd
  readonly sparkPath = sparkPath

  readonly slug = signal<CloudSlug>('aws')
  readonly cfg = computed(() => CLOUD_PROVIDER_CONFIGS[this.slug()])
  readonly sections = computed(() => cloudSectionsFor(this.slug()))

  readonly loading = signal(true)
  readonly section = signal<CloudSection>('overview')
  readonly snapshot = signal(buildCloudSnapshot('aws'))
  readonly actionLoading = signal<string | null>(null)
  readonly billingPeriod = signal<CloudBillingPeriod>('month')
  readonly invoiceDownloadBusy = signal(false)
  readonly pageLaunchProgress = signal<CloudLaunchProgressState | null>(null)

  readonly billingPeriodOptions: { id: CloudBillingPeriod; label: string }[] = [
    { id: 'day', label: 'Día' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'year', label: 'Año' },
  ]

  readonly billingPeriodView = computed((): CloudBillingPeriodView => this.data().billingTrends[this.billingPeriod()])

  readonly billingAccountsForPeriod = computed(() => {
    const accounts = this.data().accountRows
    const totalAccounts = accounts.reduce((s, a) => s + a.monthlyCost, 0)
    const ratio = this.billingPeriodView().total / Math.max(this.data().monthlyCost, 1)
    return accounts.map((a) => ({
      name: a.name,
      cost: Math.round(a.monthlyCost * ratio),
      share: Math.round((a.monthlyCost / Math.max(totalAccounts, 1)) * 100),
    }))
  })

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly regionControl = new FormControl('', { nonNullable: true })
  readonly statusControl = new FormControl('', { nonNullable: true })

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )
  private readonly regionFilter = toSignal(this.regionControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly statusFilter = toSignal(this.statusControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  readonly data = computed(() => this.snapshot())

  readonly regionOptions = computed(() => [...new Set(this.data().computeRows.map((r) => r.region))])

  totalAccountsCost = (): number => this.data().accountRows.reduce((s, a) => s + a.monthlyCost, 0)

  accountsWithCredentials = (): number => this.data().accountRows.filter((a) => a.hasCredentials).length

  accountsSynced = (): number => this.data().accountRows.filter((a) => a.syncStatus === 'synced').length

  totalReserved = (): number => this.data().accountRows.reduce((s, a) => s + (a.reservedInstances ?? 0), 0)

  budgetUsedPct = (): number =>
    Math.round((this.data().monthlyCost / Math.max(this.data().billingSummary.budget, 1)) * 100)

  handleBillingPeriodChange = (period: CloudBillingPeriod): void => {
    this.billingPeriod.set(period)
  }

  handleBillingPeriodKeydown = (event: KeyboardEvent, period: CloudBillingPeriod): void => {
    const order: CloudBillingPeriod[] = ['day', 'week', 'month', 'year']
    const idx = order.indexOf(period)
    if (event.key === 'ArrowRight' && idx < order.length - 1) {
      event.preventDefault()
      this.billingPeriod.set(order[idx + 1])
    }
    if (event.key === 'ArrowLeft' && idx > 0) {
      event.preventDefault()
      this.billingPeriod.set(order[idx - 1])
    }
  }

  bucketHeight = (amount: number, buckets: CloudBillingPeriodBucket[]): number => {
    const max = Math.max(...buckets.map((b) => b.amount), 1)
    return Math.round((amount / max) * 100)
  }

  periodChangePct = (view: CloudBillingPeriodView): number => {
    if (!view.previous) return 0
    return Math.round(((view.total - view.previous) / view.previous) * 100)
  }

  billingPeriodAverageHint = (): string => {
    const hints: Record<CloudBillingPeriod, string> = {
      day: 'Por hora activa',
      week: 'Por día',
      month: 'Por día · MTD',
      year: 'Por mes',
    }
    return hints[this.billingPeriod()]
  }

  billingChartAriaLabel = (): string => {
    const view = this.billingPeriodView()
    return `Gráfico de gasto ${view.label.toLowerCase()}: total ${fmtUsd(view.total)}`
  }

  metricsInWarning = (): number => this.data().metrics.filter((m) => m.status !== 'ok').length

  metricsHealthScore = (): number => {
    const total = this.data().metrics.length
    if (!total) return 100
    return Math.round(((total - this.metricsInWarning()) / total) * 100)
  }

  metricsSummaryStats = () => {
    const d = this.data()
    return [
      {
        label: 'Cobertura',
        value: `${d.overview.monitoringCoverage}%`,
        hint: `${d.overview.managedResources} recursos activos`,
        level: this.meterLevel(d.overview.monitoringCoverage),
        pct: d.overview.monitoringCoverage,
      },
      {
        label: 'Salud series',
        value: `${this.metricsHealthScore()}%`,
        hint: `${d.metrics.length - this.metricsInWarning()}/${d.metrics.length} en OK`,
        level: this.meterLevel(this.metricsHealthScore()),
        pct: this.metricsHealthScore(),
      },
      {
        label: 'CPU media',
        value: `${d.avgCpu}%`,
        hint: `Agregado ${this.cfg().instancesLabel} · 6 h`,
        level: this.meterLevel(d.avgCpu),
        pct: d.avgCpu,
      },
      {
        label: 'RAM media',
        value: `${d.avgRam}%`,
        hint: `${this.metricsInWarning()} alertas · sync ${d.lastSync}`,
        level: this.meterLevel(d.avgRam),
        pct: d.avgRam,
      },
    ]
  }

  meterLevel = (value: number): string => {
    if (value >= 85) return 'crit'
    if (value >= 70) return 'warn'
    return 'ok'
  }

  metricUnitSuffix = (m: CloudMetricCard): string => (m.unit === '%' ? '%' : m.unit ? ` ${m.unit}` : '')

  metricTrendDelta = (m: CloudMetricCard): number => {
    const pts = m.points
    if (pts.length < 2) return 0
    return pts[pts.length - 1] - pts[0]
  }

  metricTrendLabel = (m: CloudMetricCard): string => {
    const delta = this.metricTrendDelta(m)
    if (Math.abs(delta) < 1) return 'Estable vs inicio ventana'
    return `${delta > 0 ? '+' : ''}${Math.round(delta)} pts vs inicio ventana`
  }

  metricTrendClass = (m: CloudMetricCard): string => {
    const delta = this.metricTrendDelta(m)
    if (delta >= 5) return 'cloud-metric-card__trend--up'
    if (delta <= -5) return 'cloud-metric-card__trend--down'
    return 'cloud-metric-card__trend--flat'
  }

  metricTrendIcon = (m: CloudMetricCard): string => {
    const delta = this.metricTrendDelta(m)
    if (delta >= 5) return 'trending_up'
    if (delta <= -5) return 'trending_down'
    return 'trending_flat'
  }

  metricAreaPath = (points: number[], w = 120, h = 40): string => {
    if (!points.length) return ''
    const line = this.sparkPath(points, w, h)
    const pad = 2
    const lastX = pad + ((points.length - 1) / Math.max(points.length - 1, 1)) * (w - pad * 2)
    return `${line} L ${lastX.toFixed(1)} ${h} L ${pad} ${h} Z`
  }

  healthClass = (health: CloudComputeRow['health']): string => {
    if (health === 'critical') return 'meter--crit'
    if (health === 'warning') return 'meter--warn'
    return 'meter--ok'
  }

  healthLabel = (health: CloudComputeRow['health']): string => {
    if (health === 'critical') return 'Crítica'
    if (health === 'warning') return 'Advertencia'
    return 'Saludable'
  }

  metricStatusLabel = (status: 'ok' | 'warning' | 'critical'): string => {
    if (status === 'critical') return 'Crítico'
    if (status === 'warning') return 'Alerta'
    return 'OK'
  }

  subnetTypeLabel = (type: 'public' | 'private' | 'isolated'): string => {
    if (type === 'public') return 'Pública'
    if (type === 'isolated') return 'Aislada'
    return 'Privada'
  }

  subnetTypeClass = (type: 'public' | 'private' | 'isolated'): string => {
    if (type === 'public') return 'subnet-type--public'
    if (type === 'isolated') return 'subnet-type--isolated'
    return 'subnet-type--private'
  }

  showNetworkDetail = (vpc: CloudNetworkRow): void => {
    const c = this.cfg()
    const subnetRows =
      vpc.subnetDetails?.map((sn) => `${sn.name} (${sn.cidr}) · ${sn.zone} · ${this.subnetTypeLabel(sn.type)}`) ?? []
    this.dialog.open(DetailDialogComponent, {
      width: '580px',
      maxWidth: '95vw',
      data: {
        title: vpc.name,
        rows: [
          { label: 'Resource ID', value: vpc.id },
          { label: c.networkTitle, value: vpc.name },
          { label: 'CIDR IPv4', value: vpc.cidr },
          { label: 'IPv6', value: vpc.ipv6Cidr ?? '—' },
          { label: 'Región', value: `${vpc.region} · ${vpc.availabilityZones} zonas` },
          { label: c.accountsLabel, value: vpc.account ?? '—' },
          { label: 'Estado', value: vpc.status },
          { label: 'Tenancy', value: vpc.tenancy ?? 'default' },
          { label: 'DNS hostnames', value: vpc.dnsHostnames ? 'Sí' : 'No' },
          { label: 'DNS resolution', value: vpc.dnsResolution ? 'Sí' : 'No' },
          { label: 'DHCP options', value: vpc.dhcpOptions ?? '—' },
          { label: 'Flow logs', value: vpc.flowLogs ? 'Activo' : 'Inactivo' },
          { label: 'VPC endpoints', value: String(vpc.vpcEndpoints ?? 0) },
          { label: 'Network ACLs', value: String(vpc.networkAcls ?? 0) },
          { label: 'NAT gateways', value: String(vpc.natGateways ?? 0) },
          { label: 'Peering', value: String(vpc.peerings ?? 0) },
          { label: c.instancesLabel, value: `${vpc.instances} recursos` },
          { label: 'Subnets', value: subnetRows.join('\n') || `${vpc.subnets} subnets` },
          { label: 'Tags', value: (vpc.tags ?? []).join(', ') || '—' },
        ],
      },
    })
  }

  showServiceInvoice = (svc: CloudBillingRow): void => {
    this.dialog.open(CloudServiceInvoiceDialogComponent, {
      width: '960px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      data: {
        invoice: svc,
        provider: this.cfg(),
      },
    })
  }

  handleDownloadInvoice = (svc: CloudBillingRow): void => {
    if (this.invoiceDownloadBusy()) return
    this.invoiceDownloadBusy.set(true)
    try {
      downloadCloudInvoicePdf(svc, this.cfg())
      this.toast.success(`Factura ${svc.invoiceId} descargada`)
    } catch {
      this.toast.error('No se pudo generar el PDF de la factura')
    } finally {
      this.invoiceDownloadBusy.set(false)
    }
  }

  handleDownloadAllInvoices = (): void => {
    if (this.invoiceDownloadBusy()) return
    const invoices = this.data().billingByService
    if (!invoices.length) {
      this.toast.warning('No hay facturas para descargar')
      return
    }
    this.invoiceDownloadBusy.set(true)
    try {
      const filename = downloadAllCloudInvoicesPdf(invoices, this.cfg())
      this.toast.success(`${invoices.length} facturas exportadas · ${filename}`)
    } catch {
      this.toast.error('No se pudo generar el PDF consolidado')
    } finally {
      this.invoiceDownloadBusy.set(false)
    }
  }

  readonly filteredCompute = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const region = this.regionFilter()
    const status = this.statusFilter()
    return this.data().computeRows.filter((row) => {
      const matchTerm =
        !term ||
        row.name.toLowerCase().includes(term) ||
        row.resourceId.toLowerCase().includes(term) ||
        row.publicIp.includes(term)
      const matchRegion = !region || row.region === region
      const matchStatus = !status || row.status === status
      return matchTerm && matchRegion && matchStatus
    })
  })

  private readonly onLaunchProgress = (payload: unknown): void => {
    const p = payload as {
      accountId?: string
      percent?: number
      step?: string
      log?: string
      status?: string
    }
    const accountIds = this.data().accountRows.map((a) => a.id)
    if (p.accountId && accountIds.length && !accountIds.includes(p.accountId)) return
    const status = (p.status as CloudLaunchProgressState['status']) ?? 'running'
    this.pageLaunchProgress.set({
      percent: p.percent ?? 0,
      step: p.step ?? '',
      log: p.log,
      status,
      provider: this.cfg().provider,
      region: this.data().accountRows.find((a) => a.id === p.accountId)?.primaryRegion,
    })
    if (status === 'success') {
      this.toast.success('Instancia provisionada correctamente')
      this.load({ silent: true })
      setTimeout(() => this.pageLaunchProgress.set(null), 4000)
    }
    if (status === 'error') {
      setTimeout(() => this.pageLaunchProgress.set(null), 5000)
    }
  }

  ngOnInit(): void {
    this.realtime.connect()
    this.realtime.on('instance.launch.progress', this.onLaunchProgress)
    this.destroyRef.onDestroy(() => this.realtime.off('instance.launch.progress', this.onLaunchProgress))

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const sectionParam = params.get('section')
      if (sectionParam === 'images') {
        const provider = params.get('provider') ?? 'aws'
        void this.router.navigateByUrl(`/cloud/${provider}/instances`, { replaceUrl: true })
        return
      }
      const nextSlug = cloudSlugFromParam(params.get('provider'))
      if (nextSlug !== this.slug()) {
        this.slug.set(nextSlug)
        this.load()
      }
      this.section.set(cloudSectionFromSlug(sectionParam))
    })
    const connect = this.route.snapshot.queryParamMap.get('connect')?.trim().toLowerCase()
    if (connect) {
      this.connections.openForProviderAlias(connect).subscribe()
    }
    this.load()
    this.statusControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load())
    this.liveSync.startPolling(() => this.load({ silent: true }), 90_000)
    this.destroyRef.onDestroy(() => this.liveSync.stopPolling())
  }

  private instanceListFilters = (): { provider: CloudProvider; status?: string } => {
    const provider = CLOUD_PROVIDER_CONFIGS[this.slug()].provider
    const status = this.statusControl.value
    if (status === 'TERMINATED') return { provider, status: 'TERMINATED' }
    if (status) return { provider, status }
    return { provider }
  }

  private load = (opts?: { silent?: boolean; force?: boolean }): void => {
    const slug = this.slug()
    const listFilters = this.instanceListFilters()
    const cacheKey = `${listFilters.provider}:${this.statusControl.value ?? ''}`
    if (!opts?.force) {
      const cached = this.pageCache.get(slug, cacheKey)
      if (cached) {
        this.snapshot.set(cached)
        if (!opts?.silent) this.loading.set(false)
        return
      }
    }
    if (!opts?.silent) this.loading.set(true)
    forkJoin({
      instances: this.instancesSvc.list(listFilters).pipe(catchError(() => of([] as Instance[]))),
      accounts: this.accountsSvc.list(undefined, listFilters.provider).pipe(catchError(() => of([]))),
    }).subscribe(({ instances, accounts }) => {
      const next = buildCloudSnapshot(
        slug,
        instances,
        mapApiAccounts(
          slug,
          accounts.map((a) => ({
            id: a.id,
            name: a.name,
            accountId: a.accountId,
            projectId: (a as { projectId?: string }).projectId,
            syncStatus: (a as { syncStatus?: string }).syncStatus,
            hasCredentials: (a as { hasCredentials?: boolean }).hasCredentials,
          })),
        ),
        allowsDemoDataFrom(this.pro),
      )
      this.pageCache.set(slug, cacheKey, next)
      this.snapshot.set(next)
      if (!opts?.silent) {
        of(true)
          .pipe(delay(250))
          .subscribe(() => this.loading.set(false))
      }
    })
  }

  meterClass = (v: number): string => {
    if (v >= 85) return 'meter--crit'
    if (v >= 70) return 'meter--warn'
    return 'meter--ok'
  }

  barTone = (v: number): string => {
    if (v >= 85) return 'bar--crit'
    if (v >= 70) return 'bar--warn'
    return 'bar--ok'
  }

  handleSync = (): void => {
    this.loading.set(true)
    this.pageCache.invalidate()
    this.accountsSvc
      .syncAll()
      .pipe(
        catchError(() => {
          if (allowsDemoDataFrom(this.pro)) {
            this.actions.simulate(`Sync ${this.cfg().title}`, 900, 'Inventario actualizado').subscribe()
          }
          return of({ accounts: 0, instances: 0 })
        }),
      )
      .subscribe(() => {
        this.toast.success('Inventario sincronizado')
        this.load({ force: true })
      })
  }

  handleAddAccount = (): void => {
    this.dialog
      .open(CloudAccountFormDialogComponent, {
        ...CloudAccountFormDialogComponent.dialogConfig,
        data: { suggestedProvider: this.cfg().provider, scope: 'cloud' },
      })
      .afterClosed()
      .subscribe((res) => {
        if (res?.created) this.load()
      })
  }

  handleLaunch = (): void => {
    if (this.canOpenStudioLaunch()) {
      void this.router.navigate(['/automation/ai-infra-studio'], { queryParams: { provider: this.slug() } })
      return
    }
    void this.router.navigate(['/cloud', this.slug(), 'launch'])
  }

  canOpenStudioLaunch = (): boolean => this.slug() === 'aws' || this.slug() === 'gcp'

  launchActionLabel = (): string => {
    if (this.slug() === 'aws') return 'Lanzar instancia AWS'
    if (this.slug() === 'gcp') return 'Lanzar instancia GCP'
    return 'Lanzar instancia'
  }

  openLaunchDialog = (preselectedImageId?: string): void => {
    const acc =
      this.data().accountRows.find((a) => a.hasCredentials) ?? this.data().accountRows[0]
    if (!acc) {
      this.toast.error('Conecta una cuenta cloud antes de lanzar instancias')
      void this.router.navigate(['/cloud', this.slug(), 'accounts'])
      return
    }
    this.dialog
      .open(CloudLaunchDialogComponent, {
        width: '960px',
        maxWidth: '96vw',
        maxHeight: '92vh',
        panelClass: 'cloud-launch-panel',
        data: {
          accountId: acc.id,
          accountName: acc.name,
          provider: this.cfg().provider,
          slug: this.slug(),
          defaultRegion: acc.primaryRegion,
          preselectedImageId,
        },
      })
      .afterClosed()
      .subscribe((res) => {
        if (res?.launched) this.load()
      })
  }

  handleValidateAccount = (acc: CloudAccountRow): void => {
    this.accountsSvc
      .validate(acc.id)
      .pipe(
        catchError(() => {
          this.actions.simulate(`Validar ${acc.name}`, 600, 'Credenciales válidas').subscribe()
          return of({ valid: true, message: 'Demo: credenciales válidas' })
        }),
      )
      .subscribe((res) => {
        if (res.valid) this.toast.success(res.message ?? `Credenciales de ${acc.name} válidas`)
        else this.toast.error(res.message ?? `Error validando ${acc.name}`)
      })
  }

  handleSyncAccount = (acc: CloudAccountRow): void => {
    this.accountsSvc
      .sync(acc.id)
      .pipe(
        catchError(() => {
          this.actions.simulate(`Sync ${acc.name}`, 800, 'Inventario sincronizado').subscribe()
          return of({ synced: 1, regions: acc.regions, instances: acc.instances })
        }),
      )
      .subscribe((res) => {
        this.toast.success(`Sync ${acc.name}: ${res.instances} instancias`)
        this.load()
      })
  }

  handleSyncBilling = (acc: CloudAccountRow): void => {
    this.accountsSvc
      .syncBilling(acc.id)
      .pipe(
        catchError(() => {
          this.actions.simulate(`Facturación ${acc.name}`, 700, 'CUR actualizado').subscribe()
          return of({})
        }),
      )
      .subscribe(() => {
        this.toast.success(`Facturación de ${acc.name} sincronizada`)
        this.load()
      })
  }

  handleSyncMetrics = (acc: CloudAccountRow): void => {
    this.accountsSvc
      .syncMetrics(acc.id)
      .pipe(
        catchError(() => {
          this.actions.simulate(`Métricas ${acc.name}`, 700, 'Métricas actualizadas').subscribe()
          return of({})
        }),
      )
      .subscribe(() => {
        this.toast.success(`Métricas de ${acc.name} sincronizadas`)
        this.load()
      })
  }

  handleDeleteAccount = (acc: CloudAccountRow): void => {
    const data: ConfirmDialogData = {
      title: 'Eliminar cuenta cloud',
      message: `¿Eliminar «${acc.name}»? Las instancias vinculadas se marcarán como terminadas.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true,
    }
    this.dialog
      .open(ConfirmDialogComponent, { width: '440px', data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return
        this.accountsSvc.delete(acc.id).subscribe({
          next: (res) => {
            this.toast.success(res.message ?? 'Cuenta eliminada')
            this.load()
          },
          error: () => this.toast.error(`No se pudo eliminar ${acc.name}`),
        })
      })
  }

  handleSyncAllMetrics = (): void => {
    const acc = this.data().accountRows[0]
    if (!acc) {
      this.toast.error('No hay cuentas conectadas')
      return
    }
    this.handleSyncMetrics(acc)
  }

  canStart = (row: CloudComputeRow): boolean =>
    row.status === 'STOPPED' || row.status === 'ERROR'

  canStop = (row: CloudComputeRow): boolean =>
    row.status === 'RUNNING' || row.status === 'WARNING'

  canRestart = (row: CloudComputeRow): boolean =>
    row.status === 'RUNNING' || row.status === 'WARNING' || row.status === 'ERROR'

  private applyComputeAction = (row: CloudComputeRow, action: 'start' | 'stop' | 'restart'): void => {
    this.snapshot.update((snap) => {
      const computeRows = snap.computeRows.map((r) => {
        if (r.id !== row.id) return r
        if (action === 'start') {
          return {
            ...r,
            status: 'RUNNING',
            health: 'healthy' as const,
            cpu: r.cpu > 0 ? r.cpu : 28,
            ram: r.ram > 0 ? r.ram : 42,
          } satisfies CloudComputeRow
        }
        if (action === 'stop') {
          return { ...r, status: 'STOPPED', cpu: 0, ram: 0 } satisfies CloudComputeRow
        }
        return { ...r, status: 'RUNNING', health: 'healthy' as const } satisfies CloudComputeRow
      })
      const running = computeRows.filter((e) => e.status === 'RUNNING').length
      const stopped = computeRows.filter((e) => e.status === 'STOPPED').length
      return {
        ...snap,
        computeRows,
        running,
        stopped,
        computeSummary: {
          ...snap.computeSummary,
          healthy: computeRows.filter((e) => e.health === 'healthy').length,
          warning: computeRows.filter((e) => e.health === 'warning').length,
          critical: computeRows.filter((e) => e.health === 'critical').length,
        },
      }
    })
  }

  handleInstanceAction = (row: CloudComputeRow, action: 'start' | 'stop' | 'restart'): void => {
    const labels = { start: 'Iniciada', stop: 'Detenida', restart: 'Reiniciada' }
    const loadingKey = `${row.id}:${action}`
    this.actionLoading.set(loadingKey)
    const ops = {
      start: this.instancesSvc.start(row.id),
      stop: this.instancesSvc.stop(row.id),
      restart: this.instancesSvc.restart(row.id),
    }
    ops[action]
      .pipe(
        catchError(() => {
          this.applyComputeAction(row, action)
          return of({ demo: true })
        }),
      )
      .subscribe((res) => {
        this.actionLoading.set(null)
        this.toast.success(`Instancia ${row.name} ${labels[action].toLowerCase()}`)
        if (!(res as { demo?: boolean }).demo) {
          this.load()
        }
      })
  }

  showComputeDetail = (row: CloudComputeRow): void => {
    this.dialog.open(CloudComputeDetailDialogComponent, {
      width: '1000px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      panelClass: 'cloud-ec2-inspector-panel',
      data: {
        instance: row,
        provider: this.cfg(),
        canStart: this.canStart(row),
        canStop: this.canStop(row),
        canRestart: this.canRestart(row),
        actionLoading: this.actionLoading(),
        getActionLoading: () => this.actionLoading(),
        getInstance: () => this.data().computeRows.find((r) => r.id === row.id) ?? row,
        onAction: (action: 'start' | 'stop' | 'restart') => this.handleInstanceAction(row, action),
      },
    })
  }
}
