import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { RouterLink } from '@angular/router'
import { forkJoin, of, catchError } from 'rxjs'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { VpsService } from '../../core/services/vps.service'
import { GithubService } from '../../core/services/github.service'
import {
  IntegrationConnectionService,
  type VpsProviderId,
} from '../../core/services/integration-connection.service'
import { ToastService } from '../../core/services/toast.service'
import {
  CLOUD_WIZARD_CARDS,
  VPS_WIZARD_CARDS,
  integrationStatusLabel,
} from '../cloud-accounts/cloud-account-wizard.config'
import type { CloudAccount, CloudProvider } from '../../core/models/api.models'

type HubRow = {
  id: string
  name: string
  provider: string
  providerKey: string
  logo: 'aws' | 'gcp' | 'azure' | 'digitalocean' | 'hetzner' | 'linode' | 'ovh' | 'github' | 'kubernetes' | 'docker'
  status: string
  statusLabel: string
  lastSync: string
  resourceCount: number
  detailRoute: string
  wizardAlias: string
}

const PROVIDER_LOGO: Record<string, HubRow['logo']> = {
  AWS: 'aws',
  GCP: 'gcp',
  AZURE: 'azure',
  DIGITALOCEAN: 'digitalocean',
  HETZNER: 'hetzner',
  LINODE: 'linode',
  OVH: 'ovh',
  GITHUB: 'github',
  KUBERNETES: 'kubernetes',
  DOCKER: 'docker',
}

@Component({
  selector: 'app-integrations-hub-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    BrandLogoComponent,
    StatusBadgeComponent,
    LoadingStateComponent,
  ],
  template: `
    <div class="integrations-hub">
      <header class="integrations-hub__head">
        <div>
          <h1>Centro de integraciones</h1>
          <p>Cuentas cloud, VPS, contenedores y repositorios conectados a tu organización</p>
        </div>
        <button mat-flat-button color="primary" type="button" [matMenuTriggerFor]="addMenu">
          <mat-icon>add_link</mat-icon> Nueva conexión
        </button>
        <mat-menu #addMenu="matMenu">
          <button mat-menu-item type="button" (click)="connections.navigateToWizard('aws')">AWS</button>
          <button mat-menu-item type="button" (click)="connections.navigateToWizard('gcp')">Google Cloud</button>
          <button mat-menu-item type="button" (click)="connections.navigateToWizard('azure')">Azure</button>
          <button mat-menu-item type="button" (click)="connections.navigateToWizard('vps')">VPS / Bare metal</button>
          <button mat-menu-item type="button" (click)="connections.navigateToWizard('kubernetes')">Kubernetes</button>
          <button mat-menu-item type="button" (click)="connections.navigateToWizard('docker')">Docker</button>
          <button mat-menu-item type="button" (click)="connections.navigateToWizard('github')">GitHub</button>
        </mat-menu>
      </header>

      @if (loading()) {
        <app-loading-state label="Cargando integraciones…" />
      } @else {
        <section class="integrations-hub__stats">
          <article><span>Conectadas</span><strong>{{ connectedCount() }}</strong></article>
          <article><span>Sincronizando</span><strong>{{ syncingCount() }}</strong></article>
          <article><span>Con error</span><strong>{{ errorCount() }}</strong></article>
        </section>

        @if (rows().length === 0) {
          <section class="integrations-hub__empty">
            <mat-icon>hub</mat-icon>
            <h2>Sin integraciones conectadas</h2>
            <p>Conecta tu primera cuenta cloud, servidor VPS o cluster para empezar a sincronizar recursos.</p>
            <button mat-flat-button color="primary" type="button" (click)="connections.navigateToWizard('aws')">
              Conectar AWS
            </button>
          </section>
        } @else {
          <div class="integrations-hub__table-wrap">
            <table class="integrations-hub__table" aria-label="Integraciones conectadas">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Última sync</th>
                  <th>Recursos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr>
                    <td>
                      <div class="integrations-hub__provider">
                        <app-brand-logo [logo]="row.logo" size="sm" />
                        {{ row.provider }}
                      </div>
                    </td>
                    <td>{{ row.name }}</td>
                    <td><app-status-badge [status]="row.status" /></td>
                    <td>{{ row.lastSync }}</td>
                    <td>{{ row.resourceCount }}</td>
                    <td>
                      <button mat-icon-button type="button" [matMenuTriggerFor]="rowMenu" aria-label="Acciones">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #rowMenu="matMenu">
                        <a mat-menu-item [routerLink]="row.detailRoute">Ver recursos</a>
                        <button mat-menu-item type="button" (click)="handleSync(row)">Sincronizar ahora</button>
                        <button mat-menu-item type="button" (click)="connections.navigateToWizard(row.wizardAlias)">Editar</button>
                        <button mat-menu-item type="button" (click)="handleDelete(row)">Eliminar</button>
                      </mat-menu>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <section class="integrations-hub__sections">
          <h2>Conectar por proveedor</h2>
          <div class="integrations-hub__cards">
            @for (card of cloudCards; track card.id) {
              <article class="integrations-hub__card">
                <app-brand-logo [logo]="card.logo" size="md" />
                <h3>{{ card.shortName }}</h3>
                <p>{{ card.description }}</p>
                <button mat-stroked-button type="button" (click)="connections.navigateToWizard(card.id.toLowerCase())">
                  Conectar {{ card.shortName }}
                </button>
              </article>
            }
            @for (card of vpsCards; track card.id) {
              <article class="integrations-hub__card">
                <app-brand-logo [logo]="card.logo" size="md" />
                <h3>{{ card.shortName }}</h3>
                <p>{{ card.description }}</p>
                <button mat-stroked-button type="button" (click)="handleOpenVpsApi(card.id)">
                  Conectar API
                </button>
              </article>
            }
            <article class="integrations-hub__card">
              <app-brand-logo logo="kubernetes" size="md" />
              <h3>Kubernetes</h3>
              <p>Clusters gestionados o self-hosted</p>
              <button mat-stroked-button type="button" (click)="connections.navigateToWizard('kubernetes')">Conectar cluster</button>
            </article>
            <article class="integrations-hub__card">
              <app-brand-logo logo="docker" size="md" />
              <h3>Docker</h3>
              <p>Hosts Docker Engine con TLS</p>
              <button mat-stroked-button type="button" (click)="connections.navigateToWizard('docker')">Conectar host</button>
            </article>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .integrations-hub { padding: 1rem 1.25rem 2rem; max-width: 1100px; }
    .integrations-hub__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .integrations-hub__head h1 { margin: 0; font-size: 1.45rem; }
    .integrations-hub__head p { margin: 0.35rem 0 0; color: var(--app-text-muted); font-size: 0.88rem; }
    .integrations-hub__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
    .integrations-hub__stats article { padding: 0.85rem 1rem; border: 1px solid var(--app-border-subtle); border-radius: 8px; }
    .integrations-hub__stats span { display: block; font-size: 0.72rem; color: var(--app-text-muted); text-transform: uppercase; }
    .integrations-hub__stats strong { font-size: 1.35rem; }
    .integrations-hub__empty { text-align: center; padding: 2.5rem 1rem; border: 1px dashed var(--app-border-subtle); border-radius: 12px; }
    .integrations-hub__empty mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--app-text-muted); }
    .integrations-hub__table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .integrations-hub__table th, .integrations-hub__table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--app-border-subtle); text-align: left; }
    .integrations-hub__provider { display: flex; align-items: center; gap: 0.5rem; }
    .integrations-hub__sections { margin-top: 2rem; }
    .integrations-hub__sections h2 { font-size: 1.05rem; margin-bottom: 0.85rem; }
    .integrations-hub__cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; }
    .integrations-hub__card { padding: 1rem; border: 1px solid var(--app-border-subtle); border-radius: 10px; display: flex; flex-direction: column; gap: 0.5rem; }
    .integrations-hub__card h3 { margin: 0; font-size: 0.95rem; }
    .integrations-hub__card p { margin: 0; font-size: 0.78rem; color: var(--app-text-muted); flex: 1; }
  `,
})
export class IntegrationsHubPageComponent implements OnInit {
  readonly connections = inject(IntegrationConnectionService)
  private readonly accounts = inject(CloudAccountsService)
  private readonly vps = inject(VpsService)
  private readonly github = inject(GithubService)
  private readonly toast = inject(ToastService)
  private readonly destroyRef = inject(DestroyRef)

  readonly cloudCards = CLOUD_WIZARD_CARDS
  readonly vpsCards = VPS_WIZARD_CARDS

  readonly loading = signal(true)
  readonly rows = signal<HubRow[]>([])

  readonly connectedCount = computed(() => this.rows().filter((r) => r.status !== 'error' && r.status !== 'pending').length)
  readonly syncingCount = computed(() => this.rows().filter((r) => r.status === 'syncing').length)
  readonly errorCount = computed(() => this.rows().filter((r) => r.status === 'error').length)

  ngOnInit(): void {
    this.load()
  }

  load = (): void => {
    this.loading.set(true)
    forkJoin({
      cloud: this.accounts.list().pipe(catchError(() => of([] as CloudAccount[]))),
      vps: this.vps.list().pipe(catchError(() => of([]))),
      github: this.github.accounts().pipe(catchError(() => of({ items: [] }))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ cloud, vps, github }) => {
        const hubRows: HubRow[] = []

        for (const acc of cloud) {
          const prov = acc.provider as CloudProvider
          hubRows.push({
            id: acc.id,
            name: acc.name,
            provider: prov,
            providerKey: prov.toLowerCase(),
            logo: PROVIDER_LOGO[prov] ?? 'aws',
            status: this.mapStatus(acc.syncStatus),
            statusLabel: integrationStatusLabel(acc.syncStatus ?? 'idle'),
            lastSync: acc.lastSyncedAt ? new Date(acc.lastSyncedAt).toLocaleString('es-ES') : '—',
            resourceCount: 0,
            detailRoute: `/cloud/${prov.toLowerCase()}/accounts`,
            wizardAlias: prov.toLowerCase(),
          })
        }

        for (const host of vps) {
          hubRows.push({
            id: host.id,
            name: host.name,
            provider: 'VPS',
            providerKey: 'vps',
            logo: 'hetzner',
            status: host.status === 'connected' ? 'running' : 'pending',
            statusLabel: integrationStatusLabel(host.status ?? 'pending'),
            lastSync: '—',
            resourceCount: 1,
            detailRoute: '/vps/digitalocean/servers',
            wizardAlias: 'vps',
          })
        }

        for (const gh of github.items ?? []) {
          hubRows.push({
            id: gh.id,
            name: gh.label || gh.username,
            provider: 'GitHub',
            providerKey: 'github',
            logo: 'github',
            status: gh.status === 'connected' ? 'running' : 'pending',
            statusLabel: integrationStatusLabel(gh.status),
            lastSync: gh.lastSyncAt ? new Date(gh.lastSyncAt).toLocaleString('es-ES') : '—',
            resourceCount: 0,
            detailRoute: '/repositories/github',
            wizardAlias: 'github',
          })
        }

        this.rows.set(hubRows)
        this.loading.set(false)
      })
  }

  private mapStatus = (sync?: string): string => {
    const s = (sync ?? 'idle').toLowerCase()
    if (s === 'syncing' || s === 'sync') return 'syncing'
    if (s === 'error' || s === 'failed') return 'error'
    if (s === 'idle' || s === 'connected') return 'running'
    return 'pending'
  }

  handleSync = (row: HubRow): void => {
    if (row.providerKey === 'vps') {
      this.vps.validate(row.id).subscribe({
        next: () => {
          this.toast.success('Validación SSH completada')
          this.load()
        },
        error: () => this.toast.error('No se pudo sincronizar el servidor'),
      })
      return
    }
    if (['aws', 'gcp', 'azure'].includes(row.providerKey)) {
      this.accounts.sync(row.id).subscribe({
        next: (r) => {
          this.toast.success(`Sincronizado: ${r.instances} recursos`)
          this.load()
        },
        error: () => this.toast.error('Error al sincronizar la cuenta'),
      })
      return
    }
    this.toast.info('Sincronización manual para este proveedor')
  }

  handleDelete = (row: HubRow): void => {
    this.toast.info(`Eliminación de ${row.name} — contacta al administrador para desactivar credenciales`)
  }

  handleOpenVpsApi = (id: string): void => {
    this.connections.openVpsProvider(id as VpsProviderId, { preferDialog: true }).subscribe()
  }
}
