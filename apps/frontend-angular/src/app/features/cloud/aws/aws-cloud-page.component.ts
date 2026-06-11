import { PlatformActionService } from '../../../shared/platform/platform-action.service'
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
import { ActivatedRoute, RouterLink } from '@angular/router'
import { catchError, delay, forkJoin, of } from 'rxjs'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatDialog } from '@angular/material/dialog'
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { DetailDialogComponent } from '../../../shared/components/detail-dialog/detail-dialog.component'
import { CloudAccountsService } from '../../../core/services/cloud-accounts.service'
import { InstancesService } from '../../../core/services/instances.service'
import { ToastService } from '../../../core/services/toast.service'
import { CloudAccountFormDialogComponent } from '../../cloud-accounts/cloud-account-form-dialog.component'
import { CloudLaunchDialogComponent } from '../cloud-launch-dialog.component'
import type { Instance } from '../../../core/models/api.models'
import {
  AWS_SECTIONS,
  awsSectionFromSlug,
  buildAwsCloudSnapshot,
  fmtUsd,
  sparkPath,
  type AwsEc2Row,
  type AwsSection,
} from './aws-cloud.data'

@Component({
  selector: 'app-aws-cloud-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'aws-page-host' },
  imports: [
    RouterLink,
    ReactiveFormsModule,
    PageHeaderComponent,
    LoadingStateComponent,
    BrandLogoComponent,
    StatusBadgeComponent,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <div class="aws-page">
      <header class="aws-hero">
        <div class="aws-hero__brand">
          <app-brand-logo logo="aws" size="lg" />
          <div>
            <h1>Amazon Web Services</h1>
            <p>Plano de control AWS · inventario, red, costes y métricas operativas</p>
          </div>
        </div>
        <div class="aws-hero__meta">
          <span class="aws-live"><i aria-hidden="true"></i> Sync {{ data().lastSync }}</span>
          <button mat-stroked-button type="button" (click)="handleSync()">
            <mat-icon>sync</mat-icon>
            Sincronizar
          </button>
        </div>
      </header>

      <nav class="aws-section-nav" aria-label="Secciones AWS">
        @for (s of sections; track s.id) {
          <a
            [routerLink]="s.route"
            class="aws-section-nav__item"
            [class.aws-section-nav__item--active]="section() === s.id"
          >
            <mat-icon>{{ s.icon }}</mat-icon>
            {{ s.label }}
          </a>
        }
      </nav>

      @if (loading()) {
        <app-loading-state message="Cargando inventario AWS…" />
      } @else {
        @switch (section()) {
          @case ('overview') {
            <div class="aws-grid aws-grid--overview">
              <section class="aws-panel aws-panel--wide">
                <header class="aws-panel__head">
                  <h3><mat-icon>public</mat-icon> Regiones activas</h3>
                  <span>{{ data().regions }} regiones · {{ data().instances }} instancias</span>
                </header>
                <div class="aws-regions">
                  @for (r of data().regionList; track r.code) {
                    <article class="aws-region-card">
                      <strong>{{ r.code }}</strong>
                      <span>{{ r.name }}</span>
                      <div class="aws-region-card__stats">
                        <div><em>EC2</em><b>{{ r.instances }}</b></div>
                        <div><em>Coste</em><b>{{ fmtUsd(r.cost) }}</b></div>
                      </div>
                    </article>
                  }
                </div>
              </section>

              <section class="aws-panel">
                <header class="aws-panel__head">
                  <h3><mat-icon>timeline</mat-icon> Actividad reciente</h3>
                </header>
                <ul class="aws-activity">
                  @for (ev of data().activity; track ev.time + ev.event) {
                    <li [class]="'aws-activity__item--' + ev.severity">
                      <time>{{ ev.time }}</time>
                      <div>
                        <strong>{{ ev.event }}</strong>
                        <small>{{ ev.resource }}</small>
                      </div>
                    </li>
                  }
                </ul>
              </section>

              <section class="aws-panel">
                <header class="aws-panel__head">
                  <h3><mat-icon>payments</mat-icon> Coste mensual</h3>
                  <span>Forecast {{ fmtUsd(data().forecast) }}</span>
                </header>
                <div class="aws-cost-highlight">
                  <strong>{{ fmtUsd(data().monthlyCost) }}</strong>
                  <span>+8% vs mes anterior</span>
                </div>
                <ul class="aws-cost-bars">
                  @for (svc of data().billingByService.slice(0, 5); track svc.service) {
                    <li>
                      <span>{{ svc.service }}</span>
                      <div class="aws-bar" aria-hidden="true"><i [style.width.%]="svc.share"></i></div>
                      <em>{{ fmtUsd(svc.cost) }}</em>
                    </li>
                  }
                </ul>
              </section>

              <section class="aws-panel">
                <header class="aws-panel__head">
                  <h3><mat-icon>monitoring</mat-icon> Salud compute</h3>
                </header>
                <div class="aws-health-grid">
                  <div><span>CPU media</span><strong [class]="meterClass(data().avgCpu)">{{ data().avgCpu }}%</strong></div>
                  <div><span>RAM media</span><strong [class]="meterClass(data().avgRam)">{{ data().avgRam }}%</strong></div>
                  <div><span>En ejecución</span><strong>{{ data().running }}</strong></div>
                  <div><span>Detenidas</span><strong>{{ data().stopped }}</strong></div>
                </div>
              </section>
            </div>
          }

          @case ('accounts') {
            <section class="aws-panel">
              <header class="aws-panel__head">
                <div>
                  <h3><mat-icon>corporate_fare</mat-icon> Cuentas conectadas</h3>
                  <p>Organizations · credenciales · sync de inventario</p>
                </div>
                <button mat-flat-button color="primary" type="button" (click)="handleAddAccount()">
                  <mat-icon>add</mat-icon>
                  Añadir cuenta
                </button>
              </header>
              <div class="aws-account-grid">
                @for (acc of data().accountRows; track acc.id) {
                  <article class="aws-account-card">
                    <header>
                      <div>
                        <strong>{{ acc.name }}</strong>
                        <span class="mono">{{ acc.accountId }}</span>
                      </div>
                      <app-status-badge [value]="acc.status" />
                    </header>
                    <dl>
                      <div><dt>OU</dt><dd>{{ acc.orgUnit }}</dd></div>
                      <div><dt>Entorno</dt><dd>{{ acc.environment }}</dd></div>
                      <div><dt>Regiones</dt><dd>{{ acc.regions }}</dd></div>
                      <div><dt>EC2</dt><dd>{{ acc.instances }} instancias</dd></div>
                      <div><dt>Coste/mes</dt><dd>{{ fmtUsd(acc.monthlyCost) }}</dd></div>
                      <div><dt>Sync</dt><dd>{{ acc.lastSync }} · {{ acc.syncStatus }}</dd></div>
                      <div><dt>Root</dt><dd>{{ acc.rootEmail }}</dd></div>
                    </dl>
                    <div class="aws-tags">
                      @for (tag of acc.tags; track tag) {
                        <span>{{ tag }}</span>
                      }
                    </div>
                    <footer>
                      <button mat-stroked-button type="button" (click)="handleValidateAccount(acc.name)">Validar</button>
                      <button mat-stroked-button type="button" (click)="handleSyncAccount(acc.name)">Sync</button>
                    </footer>
                  </article>
                }
              </div>
            </section>
          }

          @case ('instances') {
            <section class="aws-panel">
              <header class="aws-panel__head">
                <div>
                  <h3><mat-icon>dns</mat-icon> Instancias EC2</h3>
                  <p>{{ filteredEc2().length }} instancias · compute en todas las cuentas</p>
                </div>
                <button mat-stroked-button type="button" (click)="handleLaunch()">
                  <mat-icon>rocket_launch</mat-icon>
                  Lanzar instancia
                </button>
              </header>
              <div class="aws-filters">
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
                <table class="premium-table table-row-hover aws-ec2-table">
                  <thead>
                    <tr>
                      <th>Instancia</th>
                      <th>ID</th>
                      <th>Cuenta</th>
                      <th>Región / AZ</th>
                      <th>Tipo</th>
                      <th>Estado</th>
                      <th>IP</th>
                      <th>CPU</th>
                      <th>Coste</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of filteredEc2(); track row.id) {
                      <tr tabindex="0" (click)="showEc2Detail(row)" (keydown.enter)="showEc2Detail(row)">
                        <td>
                          <strong>{{ row.name }}</strong>
                          <small>{{ row.os }}</small>
                        </td>
                        <td class="mono">{{ row.instanceId }}</td>
                        <td>{{ row.account }}</td>
                        <td>{{ row.region }} · {{ row.az }}</td>
                        <td>{{ row.instanceType }}</td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td class="mono">{{ row.publicIp }}</td>
                        <td>
                          <span [class]="meterClass(row.cpu)">{{ row.cpu }}%</span>
                          <div class="aws-mini-bar" aria-hidden="true"><i [style.width.%]="row.cpu" [class]="barTone(row.cpu)"></i></div>
                        </td>
                        <td>{{ fmtUsd(row.monthlyCost) }}</td>
                        <td (click)="$event.stopPropagation()">
                          <a mat-stroked-button [routerLink]="['/instances', row.id]">Abrir</a>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }

          @case ('network') {
            <div class="aws-grid aws-grid--network">
              <section class="aws-panel aws-panel--wide">
                <header class="aws-panel__head">
                  <h3><mat-icon>lan</mat-icon> VPCs</h3>
                  <span>{{ data().vpcCount }} redes virtuales</span>
                </header>
                <div class="data-table-wrap">
                  <table class="premium-table table-row-hover">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>ID</th>
                        <th>CIDR</th>
                        <th>Región</th>
                        <th>Subnets</th>
                        <th>EC2</th>
                        <th>IGW</th>
                        <th>NAT</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (vpc of data().vpcList; track vpc.id) {
                        <tr>
                          <td><strong>{{ vpc.name }}</strong></td>
                          <td class="mono">{{ vpc.id }}</td>
                          <td class="mono">{{ vpc.cidr }}</td>
                          <td>{{ vpc.region }}</td>
                          <td>{{ vpc.subnets }}</td>
                          <td>{{ vpc.instances }}</td>
                          <td>{{ vpc.igw ? 'Sí' : 'No' }}</td>
                          <td>{{ vpc.nat }}</td>
                          <td><app-status-badge [value]="vpc.status" /></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="aws-panel">
                <header class="aws-panel__head">
                  <h3><mat-icon>security</mat-icon> Security Groups</h3>
                </header>
                <ul class="aws-sg-list">
                  @for (sg of data().securityGroups; track sg.id) {
                    <li [class]="'aws-sg--' + sg.risk">
                      <div>
                        <strong>{{ sg.name }}</strong>
                        <span class="mono">{{ sg.id }}</span>
                      </div>
                      <div class="aws-sg__meta">
                        <span>{{ sg.inbound }} in · {{ sg.outbound }} out</span>
                        <span>{{ sg.attached }} recursos</span>
                        <em>Riesgo {{ sg.risk }}</em>
                      </div>
                    </li>
                  }
                </ul>
              </section>

              <section class="aws-panel">
                <header class="aws-panel__head">
                  <h3><mat-icon>balance</mat-icon> Load Balancers</h3>
                </header>
                <ul class="aws-lb-list">
                  @for (lb of data().loadBalancers; track lb.name) {
                    <li>
                      <strong>{{ lb.name }}</strong>
                      <span>{{ lb.type }} · {{ lb.scheme }} · {{ lb.region }}</span>
                      <em>{{ lb.healthy }}/{{ lb.targets }} targets healthy</em>
                    </li>
                  }
                </ul>
              </section>
            </div>
          }

          @case ('billing') {
            <div class="aws-grid aws-grid--billing">
              <section class="aws-panel">
                <header class="aws-panel__head">
                  <h3><mat-icon>account_balance_wallet</mat-icon> Resumen de facturación</h3>
                </header>
                <div class="aws-billing-summary">
                  <article>
                    <span>Gasto actual</span>
                    <strong>{{ fmtUsd(data().monthlyCost) }}</strong>
                    <em>MTD estimado</em>
                  </article>
                  <article>
                    <span>Forecast fin de mes</span>
                    <strong>{{ fmtUsd(data().forecast) }}</strong>
                    <em>+8% vs anterior</em>
                  </article>
                  <article>
                    <span>EC2 compute</span>
                    <strong>{{ fmtUsd(data().billingByService[0].cost) }}</strong>
                    <em>{{ data().billingByService[0].share }}% del total</em>
                  </article>
                </div>
              </section>

              <section class="aws-panel aws-panel--wide">
                <header class="aws-panel__head">
                  <h3><mat-icon>pie_chart</mat-icon> Por servicio AWS</h3>
                </header>
                <div class="aws-billing-services">
                  @for (svc of data().billingByService; track svc.service) {
                    <article class="aws-billing-row">
                      <mat-icon>{{ svc.icon }}</mat-icon>
                      <div class="aws-billing-row__copy">
                        <strong>{{ svc.service }}</strong>
                        <div class="aws-bar" aria-hidden="true"><i [style.width.%]="svc.share"></i></div>
                      </div>
                      <div class="aws-billing-row__nums">
                        <strong>{{ fmtUsd(svc.cost) }}</strong>
                        <span [class]="svc.trend > 0 ? 'trend-up' : 'trend-down'">
                          {{ svc.trend > 0 ? '+' : '' }}{{ svc.trend }}%
                        </span>
                      </div>
                    </article>
                  }
                </div>
              </section>

              <section class="aws-panel">
                <header class="aws-panel__head">
                  <h3><mat-icon>public</mat-icon> Por región</h3>
                </header>
                <ul class="aws-billing-regions">
                  @for (r of data().billingByRegion; track r.region) {
                    <li>
                      <span>{{ r.region }}</span>
                      <div class="aws-bar" aria-hidden="true"><i [style.width.%]="r.share"></i></div>
                      <strong>{{ fmtUsd(r.cost) }}</strong>
                    </li>
                  }
                </ul>
              </section>
            </div>
          }

          @case ('metrics') {
            <section class="aws-panel">
              <header class="aws-panel__head">
                <div>
                  <h3><mat-icon>show_chart</mat-icon> Métricas CloudWatch</h3>
                  <p>Últimas 6 h · agregado multi-cuenta · EC2, red, EBS y ALB</p>
                </div>
                <span class="aws-live"><i aria-hidden="true"></i> En vivo</span>
              </header>
              <div class="aws-metrics-grid">
                @for (m of data().metrics; track m.id) {
                  <article class="aws-metric-card">
                    <header>
                      <span class="aws-metric-card__dot" [style.background]="m.color"></span>
                      <span>{{ m.label }}</span>
                    </header>
                    <strong>{{ m.value }}<small>{{ m.unit }}</small></strong>
                    <svg viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true">
                      <path [attr.d]="sparkPath(m.points)" fill="none" [attr.stroke]="m.color" stroke-width="2" stroke-linecap="round" />
                    </svg>
                    <dl>
                      <div><dt>Media</dt><dd>{{ m.avg }}{{ m.unit === '%' ? '%' : '' }}</dd></div>
                      <div><dt>Pico</dt><dd>{{ m.peak }}{{ m.unit === '%' ? '%' : '' }}</dd></div>
                    </dl>
                  </article>
                }
              </div>
            </section>
          }
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      flex: 1;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .aws-page {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-bottom: 1.5rem;
    }

    .aws-hero {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: 14px;
      background: linear-gradient(135deg, color-mix(in srgb, #ff9900 8%, var(--app-card)), var(--app-card));
      border: 1px solid color-mix(in srgb, #ff9900 22%, transparent);
    }
    .aws-hero__brand {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .aws-hero__brand h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 850;
      letter-spacing: -0.02em;
    }
    .aws-hero__brand p {
      margin: 0.15rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
      font-weight: 600;
    }
    .aws-hero__meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .aws-live {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.62rem;
      font-weight: 800;
      color: #059669;
    }
    .aws-live i {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #10b981;
      animation: aws-pulse 1.8s ease-in-out infinite;
    }
    @keyframes aws-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .aws-section-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      padding: 0.2rem;
      border-radius: 11px;
      background: color-mix(in srgb, var(--app-surface) 30%, var(--app-card));
    }
    .aws-section-nav__item {
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
    .aws-section-nav__item mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .aws-section-nav__item--active {
      background: var(--app-card);
      color: #c2410c;
      box-shadow: 0 1px 4px color-mix(in srgb, var(--app-text) 8%, transparent);
    }

    .aws-grid {
      display: grid;
      gap: 0.65rem;
    }
    .aws-grid--overview {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .aws-grid--network,
    .aws-grid--billing {
      grid-template-columns: 1.4fr 1fr;
    }
    .aws-panel {
      border-radius: 12px;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      padding: 0.75rem 0.85rem;
    }
    .aws-panel--wide { grid-column: 1 / -1; }
    .aws-panel__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.65rem;
    }
    .aws-panel__head h3 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0;
      font-size: 0.82rem;
      font-weight: 800;
    }
    .aws-panel__head h3 mat-icon { font-size: 17px; width: 17px; height: 17px; color: #ff9900; }
    .aws-panel__head p {
      margin: 0.15rem 0 0;
      font-size: 0.64rem;
      color: var(--app-text-muted);
      font-weight: 600;
    }
    .aws-panel__head > span {
      font-size: 0.62rem;
      color: var(--app-text-muted);
      font-weight: 650;
    }

    .aws-regions {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.5rem;
    }
    .aws-region-card {
      padding: 0.55rem 0.6rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-surface) 25%, transparent);
    }
    .aws-region-card strong { display: block; font-size: 0.78rem; }
    .aws-region-card > span { font-size: 0.58rem; color: var(--app-text-muted); }
    .aws-region-card__stats {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.4rem;
    }
    .aws-region-card__stats em {
      display: block;
      font-style: normal;
      font-size: 0.52rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .aws-region-card__stats b { font-size: 0.72rem; font-weight: 800; }

    .aws-activity {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .aws-activity li {
      display: grid;
      grid-template-columns: 52px 1fr;
      gap: 0.45rem;
      padding: 0.4rem 0.45rem;
      border-radius: 8px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .aws-activity time { font-size: 0.58rem; font-weight: 800; color: var(--app-text-muted); }
    .aws-activity strong { display: block; font-size: 0.68rem; line-height: 1.35; }
    .aws-activity small { font-size: 0.58rem; color: var(--app-text-muted); }
    .aws-activity__item--warning { border-left: 2px solid #f59e0b; }
    .aws-activity__item--critical { border-left: 2px solid #ef4444; }

    .aws-cost-highlight {
      margin-bottom: 0.55rem;
    }
    .aws-cost-highlight strong {
      display: block;
      font-size: 1.35rem;
      font-weight: 850;
      color: #c2410c;
    }
    .aws-cost-highlight span { font-size: 0.62rem; color: var(--app-text-muted); font-weight: 650; }

    .aws-cost-bars, .aws-billing-regions {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .aws-cost-bars li, .aws-billing-regions li {
      display: grid;
      grid-template-columns: 1fr minmax(80px, 120px) 64px;
      gap: 0.45rem;
      align-items: center;
      font-size: 0.66rem;
    }
    .aws-bar {
      height: 6px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      overflow: hidden;
    }
    .aws-bar i {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #ff9900, #ffb84d);
    }

    .aws-health-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.45rem;
    }
    .aws-health-grid div {
      padding: 0.45rem 0.5rem;
      border-radius: 8px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .aws-health-grid span {
      display: block;
      font-size: 0.56rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .aws-health-grid strong { font-size: 0.95rem; font-weight: 850; }

    .aws-account-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.65rem;
    }
    .aws-account-card {
      border-radius: 11px;
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      padding: 0.65rem 0.7rem;
      background: color-mix(in srgb, var(--app-surface) 20%, var(--app-card));
    }
    .aws-account-card header {
      display: flex;
      justify-content: space-between;
      gap: 0.35rem;
      margin-bottom: 0.45rem;
    }
    .aws-account-card header strong { display: block; font-size: 0.82rem; }
    .aws-account-card dl {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.25rem 0.5rem;
      margin: 0 0 0.45rem;
    }
    .aws-account-card dt { font-size: 0.58rem; color: var(--app-text-muted); font-weight: 650; }
    .aws-account-card dd { margin: 0; font-size: 0.68rem; font-weight: 650; }
    .aws-tags { display: flex; flex-wrap: wrap; gap: 0.2rem; margin-bottom: 0.45rem; }
    .aws-tags span {
      font-size: 0.55rem;
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 6px;
      background: color-mix(in srgb, #ff9900 10%, transparent);
      color: #c2410c;
    }
    .aws-account-card footer { display: flex; gap: 0.35rem; }

    .aws-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-bottom: 0.55rem;
    }
    .aws-filters mat-form-field { min-width: 140px; margin: 0; flex: 1; }
    .aws-ec2-table small { display: block; font-size: 0.58rem; color: var(--app-text-muted); }
    .aws-mini-bar {
      height: 3px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      margin-top: 0.15rem;
      overflow: hidden;
    }
    .aws-mini-bar i { display: block; height: 100%; border-radius: inherit; }
    .bar--ok { background: #10b981; }
    .bar--warn { background: #f59e0b; }
    .bar--crit { background: #ef4444; }
    .meter--ok { color: #059669; }
    .meter--warn { color: #b45309; }
    .meter--crit { color: #dc2626; }

    .aws-sg-list, .aws-lb-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .aws-sg-list li, .aws-lb-list li {
      padding: 0.45rem 0.55rem;
      border-radius: 9px;
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
      border-left: 3px solid #94a3b8;
    }
    .aws-sg--high { border-left-color: #ef4444; }
    .aws-sg--medium { border-left-color: #f59e0b; }
    .aws-sg--low { border-left-color: #10b981; }
    .aws-sg-list strong, .aws-lb-list strong { display: block; font-size: 0.72rem; }
    .aws-sg-list span, .aws-lb-list span { font-size: 0.58rem; color: var(--app-text-muted); }
    .aws-sg__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.2rem;
      font-size: 0.58rem;
      color: var(--app-text-muted);
    }

    .aws-billing-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }
    .aws-billing-summary article {
      padding: 0.55rem 0.6rem;
      border-radius: 10px;
      background: color-mix(in srgb, #ff9900 6%, var(--app-card));
    }
    .aws-billing-summary span {
      display: block;
      font-size: 0.56rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .aws-billing-summary strong { display: block; font-size: 1.1rem; font-weight: 850; margin: 0.1rem 0; }
    .aws-billing-summary em { font-size: 0.58rem; color: var(--app-text-muted); font-style: normal; }

    .aws-billing-services {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .aws-billing-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.55rem;
      align-items: center;
      padding: 0.35rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .aws-billing-row mat-icon { color: #ff9900; font-size: 18px; width: 18px; height: 18px; }
    .aws-billing-row__copy strong { display: block; font-size: 0.72rem; margin-bottom: 0.2rem; }
    .aws-billing-row__nums { text-align: right; }
    .aws-billing-row__nums strong { display: block; font-size: 0.78rem; }
    .aws-billing-row__nums span { font-size: 0.58rem; font-weight: 700; }
    .trend-up { color: #dc2626; }
    .trend-down { color: #059669; }

    .aws-metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.55rem;
    }
    .aws-metric-card {
      padding: 0.6rem 0.65rem;
      border-radius: 11px;
      background: color-mix(in srgb, var(--app-surface) 22%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .aws-metric-card header {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.64rem;
      font-weight: 750;
      color: var(--app-text-muted);
    }
    .aws-metric-card__dot { width: 8px; height: 8px; border-radius: 999px; }
    .aws-metric-card strong {
      display: block;
      font-size: 1.15rem;
      font-weight: 850;
      margin: 0.25rem 0;
    }
    .aws-metric-card strong small { font-size: 0.62rem; font-weight: 700; margin-left: 0.15rem; }
    .aws-metric-card svg { width: 100%; height: 32px; display: block; margin: 0.15rem 0 0.35rem; }
    .aws-metric-card dl {
      display: flex;
      gap: 0.75rem;
      margin: 0;
    }
    .aws-metric-card dt { font-size: 0.52rem; font-weight: 700; text-transform: uppercase; color: var(--app-text-muted); }
    .aws-metric-card dd { margin: 0.05rem 0 0; font-size: 0.72rem; font-weight: 800; }

    .mono { font-family: ui-monospace, 'JetBrains Mono', monospace; font-size: 0.68rem; }

    @media (max-width: 1100px) {
      .aws-grid--overview, .aws-grid--network, .aws-grid--billing { grid-template-columns: 1fr; }
      .aws-regions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .aws-account-grid { grid-template-columns: 1fr; }
      .aws-metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 640px) {
      .aws-metrics-grid { grid-template-columns: 1fr; }
      .aws-billing-summary { grid-template-columns: 1fr; }
    }
  `,
})
export class AwsCloudPageComponent implements OnInit {
  private readonly actions = inject(PlatformActionService)

  private readonly route = inject(ActivatedRoute)
  private readonly accountsSvc = inject(CloudAccountsService)
  private readonly instancesSvc = inject(InstancesService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)
  private readonly destroyRef = inject(DestroyRef)

  readonly sections = AWS_SECTIONS
  readonly fmtUsd = fmtUsd
  readonly sparkPath = sparkPath

  readonly loading = signal(true)
  readonly section = signal<AwsSection>('overview')
  readonly snapshot = signal(buildAwsCloudSnapshot())

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

  readonly regionOptions = computed(() => [...new Set(this.data().ec2Rows.map((r) => r.region))])

  readonly filteredEc2 = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const region = this.regionFilter()
    const status = this.statusFilter()
    return this.data().ec2Rows.filter((row) => {
      const matchTerm =
        !term ||
        row.name.toLowerCase().includes(term) ||
        row.instanceId.toLowerCase().includes(term) ||
        row.publicIp.includes(term)
      const matchRegion = !region || row.region === region
      const matchStatus = !status || row.status === status
      return matchTerm && matchRegion && matchStatus
    })
  })

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.section.set(awsSectionFromSlug(params.get('section')))
    })
    this.load()
    this.statusControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load())
  }

  private instanceListFilters = (): { provider: 'AWS'; status?: string } => {
    const status = this.statusControl.value
    if (status === 'TERMINATED') return { provider: 'AWS', status: 'TERMINATED' }
    if (status) return { provider: 'AWS', status }
    return { provider: 'AWS' }
  }

  private load = (): void => {
    this.loading.set(true)
    forkJoin({
      instances: this.instancesSvc.list(this.instanceListFilters()).pipe(catchError(() => of([] as Instance[]))),
      accounts: this.accountsSvc.list(undefined, 'AWS').pipe(catchError(() => of([]))),
    }).subscribe(({ instances, accounts }) => {
      this.snapshot.set(
        buildAwsCloudSnapshot(
          instances,
          accounts.map((a) => ({
            id: a.id,
            name: a.name,
            accountId: a.accountId,
            status: (a as { syncStatus?: string }).syncStatus ?? 'active',
            hasCredentials: (a as { hasCredentials?: boolean }).hasCredentials,
          })),
        ),
      )
      of(true)
        .pipe(delay(250))
        .subscribe(() => this.loading.set(false))
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
    this.actions.simulate('Sync AWS', 900, 'Inventario AWS actualizado').subscribe(() => this.load())
  }

  handleAddAccount = (): void => {
    this.dialog
      .open(CloudAccountFormDialogComponent, {
        ...CloudAccountFormDialogComponent.dialogConfig,
        data: { suggestedProvider: 'AWS' as const, scope: 'cloud' },
      })
      .afterClosed()
      .subscribe((res) => {
        if (res?.created) this.load()
      })
  }

  handleLaunch = (): void => {
    const acc = this.data().accountRows[0]
    if (!acc) {
      this.toast.error('Añade una cuenta AWS primero')
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
          provider: 'AWS',
          slug: 'aws',
          defaultRegion: 'eu-west-1',
        },
      })
      .afterClosed()
      .subscribe((res) => {
        if (res?.launched) this.load()
      })
  }

  handleValidateAccount = (name: string): void => {
    this.actions.simulate(`Validar ${name}`, 600, 'Credenciales válidas').subscribe()
  }

  handleSyncAccount = (name: string): void => {
    this.actions.simulate(`Sync ${name}`, 800, 'Inventario sincronizado').subscribe(() => this.load())
  }

  showEc2Detail = (row: AwsEc2Row): void => {
    this.dialog.open(DetailDialogComponent, {
      width: '520px',
      data: {
        title: row.name,
        rows: [
          { label: 'Instance ID', value: row.instanceId },
          { label: 'Cuenta', value: row.account },
          { label: 'Región / AZ', value: `${row.region} · ${row.az}` },
          { label: 'Tipo', value: row.instanceType },
          { label: 'Estado', value: row.status },
          { label: 'VPC', value: row.vpc },
          { label: 'IP pública', value: row.publicIp },
          { label: 'IP privada', value: row.privateIp },
          { label: 'SO', value: row.os },
          { label: 'CPU / RAM / Disco', value: `${row.cpu}% · ${row.ram}% · ${row.disk}%` },
          { label: 'Coste/mes', value: fmtUsd(row.monthlyCost) },
          { label: 'Lanzada', value: row.launchTime },
        ],
      },
    })
  }
}
