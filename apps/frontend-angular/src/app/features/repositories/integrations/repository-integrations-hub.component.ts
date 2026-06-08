import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { GithubService, type GithubAccount } from '../../../core/services/github.service'
import { GitlabService, type GitlabAccount } from '../../../core/services/gitlab.service'
import { IntegrationConnectionService } from '../../../core/services/integration-connection.service'
import { ToastService } from '../../../core/services/toast.service'
import { catchError, forkJoin, of } from 'rxjs'
import { providerConnectRoute } from './repository-connection-wizard.config'

type HubCard = {
  id: string
  provider: 'github' | 'gitlab'
  label: string
  username: string
  status: string
  statusLabel: string
  repoCount: number
  lastSyncAt: string | null
  avatarUrl?: string | null
}

@Component({
  selector: 'app-repository-integrations-hub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    PageHeaderComponent,
    LoadingStateComponent,
    BrandLogoComponent,
    StatusBadgeComponent,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Integraciones de repositorios"
        description="Gestiona cuentas GitHub y GitLab conectadas: sincronizar, editar o eliminar conexiones multi-cuenta."
        [actions]="headerActions"
        (actionClick)="handleHeader($event)"
      />

      @if (loading()) {
        <app-loading-state message="Cargando integraciones…" />
      } @else if (!cards().length) {
        <div class="hub-empty">
          <mat-icon>hub</mat-icon>
          <h3>Sin conexiones de repositorio</h3>
          <p>Conecta GitHub o GitLab con el asistente guiado. Los tokens se cifran y nunca se redirige fuera del panel.</p>
          <div class="hub-empty__actions">
            <button mat-flat-button color="primary" type="button" (click)="openWizard('github')">
              <app-brand-logo logo="github" size="sm" /> Conectar GitHub
            </button>
            <button mat-stroked-button type="button" (click)="openWizard('gitlab')">
              <app-brand-logo logo="gitlab" size="sm" /> Conectar GitLab
            </button>
          </div>
        </div>
      } @else {
        <div class="hub-grid">
          @for (card of cards(); track card.id) {
            <article class="hub-card">
              <div class="hub-card__head">
                <app-brand-logo [logo]="card.provider" size="md" />
                <div>
                  <strong>{{ card.label }}</strong>
                  <div>{{ card.username }}</div>
                </div>
                <app-status-badge [status]="card.status" [value]="card.statusLabel" />
              </div>
              <dl class="hub-card__meta">
                <div><dt>Repos</dt><dd>{{ card.repoCount }}</dd></div>
                <div><dt>Última sync</dt><dd>{{ card.lastSyncAt ?? '—' }}</dd></div>
              </dl>
              <div class="hub-card__actions">
                <button mat-stroked-button type="button" [routerLink]="['/repositories', card.provider, card.id]">
                  Ver detalle
                </button>
                <button mat-icon-button type="button" [matMenuTriggerFor]="menu" aria-label="Acciones">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item type="button" (click)="sync(card)">
                    <mat-icon>sync</mat-icon> Sincronizar
                  </button>
                  <button mat-menu-item type="button" (click)="remove(card)">
                    <mat-icon>delete</mat-icon> Eliminar
                  </button>
                </mat-menu>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .hub-empty {
      text-align: center;
      padding: 3rem 1rem;
      border: 1px dashed var(--app-border-subtle);
      border-radius: var(--app-radius-lg, 12px);
    }
    .hub-empty mat-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; opacity: 0.6; }
    .hub-empty__actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin-top: 1rem; }
    .hub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .hub-card {
      border: 1px solid var(--app-border-subtle);
      border-radius: var(--app-radius-md, 8px);
      padding: 1rem;
      background: var(--app-surface);
    }
    .hub-card__head { display: flex; align-items: center; gap: 0.75rem; }
    .hub-card__head > div { flex: 1; min-width: 0; }
    .hub-card__meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin: 0.85rem 0; font-size: 0.85rem; }
    .hub-card__meta dt { opacity: 0.65; margin: 0; }
    .hub-card__meta dd { margin: 0; font-weight: 600; }
    .hub-card__actions { display: flex; align-items: center; gap: 0.35rem; }
  `,
})
export class RepositoryIntegrationsHubComponent implements OnInit {
  private readonly github = inject(GithubService)
  private readonly gitlab = inject(GitlabService)
  private readonly connections = inject(IntegrationConnectionService)
  private readonly toast = inject(ToastService)
  private readonly router = inject(Router)

  readonly loading = signal(true)
  readonly cards = signal<HubCard[]>([])
  readonly headerActions = [
    { label: 'Conectar GitHub', icon: 'add', primary: true },
    { label: 'Conectar GitLab', icon: 'add' },
  ]

  ngOnInit(): void {
    this.load()
  }

  load = (): void => {
    this.loading.set(true)
    forkJoin({
      gh: this.github.accounts().pipe(catchError(() => of({ items: [] as GithubAccount[] }))),
      gl: this.gitlab.accounts().pipe(catchError(() => of({ items: [] as GitlabAccount[] }))),
    }).subscribe(({ gh, gl }) => {
      const ghCards: HubCard[] = (gh.items ?? []).map((a) => ({
        id: a.id,
        provider: 'github',
        label: a.connectionName ?? a.label,
        username: a.username,
        status: a.status,
        statusLabel: a.statusLabel ?? a.status,
        repoCount: a.repoCount ?? 0,
        lastSyncAt: a.lastSyncAt ?? null,
        avatarUrl: a.avatarUrl,
      }))
      const glCards: HubCard[] = (gl.items ?? []).map((a) => ({
        id: a.id,
        provider: 'gitlab',
        label: a.connectionName ?? a.label,
        username: a.username,
        status: a.status,
        statusLabel: a.statusLabel ?? a.status,
        repoCount: a.repoCount ?? 0,
        lastSyncAt: a.lastSyncAt ?? null,
        avatarUrl: a.avatarUrl,
      }))
      this.cards.set([...ghCards, ...glCards])
      this.loading.set(false)
    })
  }

  openWizard = (provider: 'github' | 'gitlab'): void => {
    void this.router.navigateByUrl(providerConnectRoute(provider))
  }

  handleHeader = (label: string): void => {
    if (label.includes('GitHub')) this.openWizard('github')
    else if (label.includes('GitLab')) this.openWizard('gitlab')
  }

  sync = (card: HubCard): void => {
    if (card.provider === 'github') {
      this.github.syncAccount(card.id).subscribe({
        next: (r) => {
          this.toast.success(r.message)
          this.load()
        },
        error: () => this.toast.error('Error al sincronizar'),
      })
      return
    }
    this.gitlab.syncAccount(card.id).subscribe({
      next: (r) => {
        this.toast.success(r.message)
        this.load()
      },
      error: () => this.toast.error('Error al sincronizar'),
    })
  }

  remove = (card: HubCard): void => {
    const req =
      card.provider === 'github'
        ? this.github.deleteAccount(card.id)
        : this.gitlab.deleteAccount(card.id)
    req.subscribe({
      next: (r) => {
        this.toast.success(r.message)
        this.load()
      },
      error: () => this.toast.error('No se pudo eliminar'),
    })
  }
}
