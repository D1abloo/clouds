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
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { ToastService } from '../../core/services/toast.service'
import {
  IntegrationConnectionService,
  type VpsProviderId,
} from '../../core/services/integration-connection.service'
import {
  buildVpsSnapshot,
  fmtUsd,
  vpsProviderConfig,
  vpsSectionFromSlug,
  vpsSectionsFor,
  vpsSlugFromParam,
  type VpsProviderSlug,
  type VpsSection,
} from './vps-provider.demo'

@Component({
  selector: 'app-vps-provider-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'vps-page-host' },
  imports: [RouterLink, MatButtonModule, MatIconModule, BrandLogoComponent, StatusBadgeComponent],
  template: `
    <div class="vps-page" [style.--vps-accent]="cfg().accent" [style.--vps-accent-soft]="cfg().accentSoft">
      <header class="vps-hero">
        <div class="vps-hero__brand">
          <app-brand-logo [logo]="cfg().logo" size="lg" />
          <div>
            <h1>{{ cfg().title }}</h1>
            <p>{{ cfg().subtitle }}</p>
          </div>
        </div>
        <div class="vps-hero__meta">
          <span class="vps-live"><i aria-hidden="true"></i> Sync {{ data().lastSync }}</span>
          <button mat-stroked-button type="button" (click)="handleSync()">
            <mat-icon>sync</mat-icon>
            Sincronizar
          </button>
          <button mat-flat-button color="primary" type="button" (click)="handleConnectAccount()">
            <mat-icon>link</mat-icon>
            Conectar cuenta
          </button>
        </div>
      </header>

      <nav class="vps-section-nav" [attr.aria-label]="'Secciones ' + cfg().title">
        @for (s of sections(); track s.id) {
          <a
            [routerLink]="s.route"
            class="vps-section-nav__item"
            [class.vps-section-nav__item--active]="section() === s.id"
          >
            <mat-icon>{{ s.icon }}</mat-icon>
            {{ s.label }}
          </a>
        }
      </nav>

      <div class="vps-section-body">
        @switch (section()) {
          @case ('overview') {
            <div class="vps-strip">
              <article><span>Cuentas</span><strong>{{ data().accounts }}</strong></article>
              <article><span>Servidores</span><strong>{{ data().servers }}</strong></article>
              <article><span>Coste mensual</span><strong>{{ fmtUsd(data().monthlyCost) }}</strong></article>
              <article><span>Disponibilidad</span><strong>{{ data().uptimePercent }}%</strong></article>
            </div>
            <section class="vps-panel">
              <header class="vps-panel__head">
                <h3><mat-icon>dns</mat-icon> Servidores recientes</h3>
              </header>
              <div class="vps-table-wrap">
                <table class="vps-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Región</th>
                      <th>Plan</th>
                      <th>Estado</th>
                      <th>IPv4</th>
                      <th>Coste</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of data().serverRows; track row.id) {
                      <tr>
                        <td>{{ row.name }}</td>
                        <td>{{ row.region }}</td>
                        <td>{{ row.plan }}</td>
                        <td><app-status-badge [status]="row.status" /></td>
                        <td class="mono">{{ row.ipv4 }}</td>
                        <td>{{ fmtUsd(row.monthlyCost) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }
          @case ('accounts') {
            <section class="vps-panel">
              <header class="vps-panel__head">
                <h3><mat-icon>corporate_fare</mat-icon> Cuentas conectadas</h3>
                <button mat-stroked-button type="button" (click)="handleConnectAccount()">
                  <mat-icon>add_link</mat-icon>
                  Conectar cuenta
                </button>
              </header>
              <div class="vps-table-wrap">
                <table class="vps-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Región</th>
                      <th>Servidores</th>
                      <th>Estado</th>
                      <th>Última sync</th>
                      <th>Coste MTD</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (acc of data().accountRows; track acc.id) {
                      <tr>
                        <td>{{ acc.name }}</td>
                        <td>{{ acc.region }}</td>
                        <td>{{ acc.servers }}</td>
                        <td><app-status-badge [status]="acc.status" /></td>
                        <td>{{ acc.lastSync }}</td>
                        <td>{{ fmtUsd(acc.monthlyCost) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }
          @case ('servers') {
            <section class="vps-panel">
              <header class="vps-panel__head">
                <h3><mat-icon>dns</mat-icon> Inventario de servidores</h3>
              </header>
              <div class="vps-table-wrap">
                <table class="vps-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Región</th>
                      <th>Plan</th>
                      <th>Estado</th>
                      <th>IPv4</th>
                      <th>Coste</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of data().serverRows; track row.id) {
                      <tr>
                        <td>{{ row.name }}</td>
                        <td>{{ row.region }}</td>
                        <td>{{ row.plan }}</td>
                        <td><app-status-badge [status]="row.status" /></td>
                        <td class="mono">{{ row.ipv4 }}</td>
                        <td>{{ fmtUsd(row.monthlyCost) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }
          @case ('billing') {
            <div class="vps-strip">
              <article><span>Coste estimado MTD</span><strong>{{ fmtUsd(data().monthlyCost) }}</strong></article>
              <article><span>Cuentas activas</span><strong>{{ data().accounts }}</strong></article>
              <article><span>Servidores facturables</span><strong>{{ data().servers }}</strong></article>
            </div>
            <section class="vps-panel">
              <header class="vps-panel__head">
                <h3><mat-icon>account_balance_wallet</mat-icon> Desglose por cuenta</h3>
              </header>
              <div class="vps-table-wrap">
                <table class="vps-table">
                  <thead>
                    <tr>
                      <th>Cuenta</th>
                      <th>Servidores</th>
                      <th>Coste mensual</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (acc of data().accountRows; track acc.id) {
                      <tr>
                        <td>{{ acc.name }}</td>
                        <td>{{ acc.servers }}</td>
                        <td>{{ fmtUsd(acc.monthlyCost) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }
          @case ('metrics') {
            <div class="vps-strip">
              <article><span>CPU media</span><strong>34%</strong></article>
              <article><span>RAM media</span><strong>58%</strong></article>
              <article><span>Disco</span><strong>41%</strong></article>
              <article><span>Red (egress)</span><strong>128 GB</strong></article>
            </div>
            <section class="vps-panel">
              <header class="vps-panel__head">
                <h3><mat-icon>show_chart</mat-icon> Métricas agregadas</h3>
              </header>
              <p class="vps-muted">
                Métricas de CPU, RAM, disco y red sincronizadas desde la API de {{ cfg().title }}.
              </p>
            </section>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .vps-page {
      --vps-accent: #0080ff;
      --vps-accent-soft: color-mix(in srgb, var(--vps-accent) 14%, transparent);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .vps-hero {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.1rem 1.25rem;
      border-radius: 14px;
      border: 1px solid var(--app-border-subtle);
      background: linear-gradient(135deg, var(--vps-accent-soft), transparent 55%);
    }
    .vps-hero__brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      h1 { margin: 0; font-size: 1.35rem; }
      p { margin: 0.25rem 0 0; font-size: 0.86rem; color: var(--app-text-muted); max-width: 520px; }
    }
    .vps-hero__meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }
    .vps-live {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.78rem;
      color: var(--app-text-muted);
      i {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--status-running);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--status-running) 25%, transparent);
      }
    }
    .vps-section-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .vps-section-nav__item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.75rem;
      border-radius: 999px;
      text-decoration: none;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--app-text-muted);
      background: var(--app-surface);
      border: 1px solid var(--app-border-subtle);
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
    .vps-section-nav__item--active {
      color: var(--vps-accent);
      border-color: color-mix(in srgb, var(--vps-accent) 45%, transparent);
      background: var(--vps-accent-soft);
    }
    .vps-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.65rem;
      margin-bottom: 0.85rem;
      article {
        padding: 0.75rem 0.9rem;
        border-radius: 12px;
        border: 1px solid var(--app-border-subtle);
        background: var(--app-card);
        span { display: block; font-size: 0.68rem; text-transform: uppercase; color: var(--app-text-muted); }
        strong { display: block; margin-top: 0.2rem; font-size: 1.1rem; }
      }
    }
    .vps-panel {
      border: 1px solid var(--app-border-subtle);
      border-radius: 14px;
      background: var(--app-card);
      overflow: hidden;
    }
    .vps-panel__head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--app-border-subtle);
      h3 {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.95rem;
        mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: var(--vps-accent); }
      }
    }
    .vps-table-wrap { overflow-x: auto; }
    .vps-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
      th, td { padding: 0.65rem 1rem; text-align: left; border-bottom: 1px solid var(--app-border-subtle); }
      th { font-size: 0.68rem; text-transform: uppercase; color: var(--app-text-muted); font-weight: 700; }
      tbody tr:hover { background: color-mix(in srgb, var(--vps-accent) 4%, transparent); }
    }
    .mono { font-family: ui-monospace, monospace; font-size: 0.78rem; }
    .vps-muted { margin: 0; padding: 1rem; font-size: 0.86rem; color: var(--app-text-muted); }
  `,
})
export class VpsProviderPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)
  private readonly connections = inject(IntegrationConnectionService)
  private readonly demo = inject(DemoActionsService)
  private readonly toast = inject(ToastService)

  readonly fmtUsd = fmtUsd

  readonly slug = signal<VpsProviderSlug>('digitalocean')
  readonly section = signal<VpsSection>('overview')

  readonly cfg = computed(() => vpsProviderConfig(this.slug()))
  readonly sections = computed(() => vpsSectionsFor(this.slug()))
  readonly data = computed(() => buildVpsSnapshot(this.slug()))

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.slug.set(vpsSlugFromParam(params.get('provider')))
      this.section.set(vpsSectionFromSlug(params.get('section')))
    })
  }

  handleSync = (): void => {
    this.demo.simulate(`Sync ${this.cfg().title}`, 900, 'Inventario VPS actualizado').subscribe(() => {
      this.toast.success('Inventario sincronizado')
    })
  }

  handleConnectAccount = (): void => {
    this.connections
      .openVpsProvider(this.cfg().connectionId as VpsProviderId, { preferDialog: true })
      .subscribe((res) => {
      const r = res as { created?: boolean } | null
      if (r?.created) this.toast.success('Cuenta conectada correctamente')
    })
  }
}
