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
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { catchError, forkJoin, of } from 'rxjs'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ToastService } from '../../core/services/toast.service'
import { VpsService } from '../../core/services/vps.service'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { LiveCloudSyncService } from '../../core/services/live-cloud-sync.service'
import {
  IntegrationConnectionService,
  type VpsProviderId,
} from '../../core/services/integration-connection.service'
import {
  fmtUsd,
  vpsProviderConfig,
  vpsSectionFromSlug,
  vpsSectionsFor,
  vpsSlugFromParam,
  type VpsAccountRow,
  type VpsProviderSlug,
  type VpsProviderSnapshot,
  type VpsSection,
  type VpsServerRow,
} from './vps-provider.data'
import type { VpsHost } from '../../core/models/api.models'

const formatLastSync = (date: Date | null): string => {
  if (!date) return '—'
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  return `hace ${hours} h`
}

const mapServerRow = (host: VpsHost): VpsServerRow => {
  const meta = (host as { metadata?: Record<string, unknown> }).metadata ?? {}
  return {
    id: host.id,
    name: host.name,
    region: String(meta['region'] ?? '—'),
    plan: String(meta['plan'] ?? meta['instanceType'] ?? '—'),
    status: String((host as { status?: string }).status ?? 'connected'),
    ipv4: host.host,
    monthlyCost: Number(meta['monthlyCost'] ?? 0),
  }
}

@Component({
  selector: 'app-vps-provider-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'vps-page-host' },
  imports: [RouterLink, MatButtonModule, MatIconModule, BrandLogoComponent, StatusBadgeComponent, EmptyStateComponent],
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
          <span class="vps-live">
            <i aria-hidden="true"></i>
            @if (liveSync.syncing()) {
              Sincronizando…
            } @else {
              Última sincronización: {{ lastSyncLabel() }}
            }
          </span>
          <button mat-stroked-button type="button" (click)="handleSync()" [disabled]="liveSync.syncing()">
            <mat-icon>sync</mat-icon>
            Actualizar ahora
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
        @if (data().servers === 0 && data().accounts === 0) {
          <app-empty-state
            title="Sin servidores VPS conectados"
            description="Añade un servidor VPS o Bare Metal para comenzar a gestionarlo desde el panel."
            actionLabel="Añadir servidor VPS"
            (actionClick)="handleAddVps()"
          />
        } @else {
          @switch (section()) {
            @case ('overview') {
              <div class="vps-strip">
                <article><span>Cuentas</span><strong>{{ data().accounts }}</strong></article>
                <article><span>Servidores</span><strong>{{ data().servers }}</strong></article>
                <article><span>Coste mensual</span><strong>{{ fmtUsd(data().monthlyCost) }}</strong></article>
                <article><span>Disponibilidad</span><strong>{{ data().uptimePercent ? data().uptimePercent + '%' : '—' }}</strong></article>
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
            @case ('metrics') {
              <section class="vps-panel">
                <header class="vps-panel__head">
                  <h3><mat-icon>show_chart</mat-icon> Métricas agregadas</h3>
                </header>
                <p class="vps-muted">
                  Métricas de CPU, RAM, disco y red sincronizadas desde la API de {{ cfg().title }} cuando haya servidores conectados.
                </p>
              </section>
            }
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
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private readonly connections = inject(IntegrationConnectionService)
  private readonly toast = inject(ToastService)
  private readonly vpsSvc = inject(VpsService)
  private readonly cloudAccounts = inject(CloudAccountsService)
  readonly liveSync = inject(LiveCloudSyncService)

  readonly fmtUsd = fmtUsd

  readonly slug = signal<VpsProviderSlug>('digitalocean')
  readonly section = signal<VpsSection>('overview')
  readonly data = signal<VpsProviderSnapshot>({
    lastSync: '—',
    accounts: 0,
    servers: 0,
    monthlyCost: 0,
    uptimePercent: 0,
    accountRows: [],
    serverRows: [],
  })

  readonly cfg = computed(() => vpsProviderConfig(this.slug()))
  readonly sections = computed(() => vpsSectionsFor(this.slug()))
  readonly lastSyncLabel = computed(() => formatLastSync(this.liveSync.lastSyncAt()))

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const sectionParam = params.get('section')
      if (sectionParam === 'accounts' || sectionParam === 'billing') {
        const provider = params.get('provider') ?? 'digitalocean'
        void this.router.navigateByUrl(`/vps/${provider}/overview`, { replaceUrl: true })
        return
      }
      this.slug.set(vpsSlugFromParam(params.get('provider')))
      this.section.set(vpsSectionFromSlug(sectionParam))
      this.loadData()
    })

    this.liveSync.startPolling(() => this.loadData(), 45_000)
    this.destroyRef.onDestroy(() => this.liveSync.stopPolling())
  }

  private loadData = (): void => {
    const slug = this.slug()
    forkJoin({
      hosts: this.vpsSvc.list().pipe(catchError(() => of([] as VpsHost[]))),
      accounts: this.cloudAccounts.list().pipe(catchError(() => of([]))),
    }).subscribe(({ hosts, accounts }) => {
      const filteredHosts = hosts.filter((h) => {
        if ((h as { isDemo?: boolean }).isDemo) return false
        if (h.id.startsWith('demo-vps')) return false
        const name = (h.name ?? '').toLowerCase()
        if (/demo|mock|fake|sample|ejemplo/.test(name)) return false
        const meta = (h as { metadata?: Record<string, unknown> }).metadata ?? {}
        const provider = String(meta['provider'] ?? meta['vpsProvider'] ?? '').toLowerCase()
        if (!provider) return false
        return provider.includes(slug)
      })
      const serverRows = filteredHosts.map(mapServerRow)
      const providerAccounts = accounts.filter((a) => {
        const p = String(a.provider ?? '').toLowerCase()
        return p.includes(slug) || p.includes('vps')
      })
      const accountRows: VpsAccountRow[] = providerAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        status: String((a as { syncStatus?: string }).syncStatus ?? 'connected'),
        servers: serverRows.length,
        monthlyCost: 0,
        lastSync: formatLastSync(this.liveSync.lastSyncAt()),
        region: String(a.defaultRegion ?? '—'),
      }))

      this.data.set({
        lastSync: formatLastSync(this.liveSync.lastSyncAt()),
        accounts: accountRows.length,
        servers: serverRows.length,
        monthlyCost: serverRows.reduce((s, r) => s + r.monthlyCost, 0),
        uptimePercent: serverRows.length ? 99.9 : 0,
        accountRows,
        serverRows,
      })
    })
  }

  handleSync = (): void => {
    this.liveSync.syncAllAccounts().subscribe({
      next: () => {
        this.toast.success('Inventario sincronizado')
        this.loadData()
      },
      error: () => this.toast.error('No se pudo sincronizar el inventario'),
    })
  }

  handleAddVps = (): void => {
    void this.router.navigate(['/admin/infraestructura/vps/nuevo'])
  }

  handleConnectAccount = (): void => {
    this.connections
      .openVpsProvider(this.cfg().connectionId as VpsProviderId, { preferDialog: true })
      .subscribe((res) => {
        const r = res as { created?: boolean } | null
        if (r?.created) {
          this.toast.success('Cuenta conectada correctamente')
          this.loadData()
        }
      })
  }
}
