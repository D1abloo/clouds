import { DatePipe } from '@angular/common'
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { GithubService } from '../../core/services/github.service'
import { GitlabService } from '../../core/services/gitlab.service'
import { IntegrationConnectionService } from '../../core/services/integration-connection.service'
import { LiveRepoSyncService } from '../../core/services/live-repo-sync.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { catchError, forkJoin, of } from 'rxjs'

type ProviderKey = 'github' | 'gitlab'

interface HubAccount {
  provider: ProviderKey
  label: string
  status: string
  repoCount: number
  lastSyncAt: string | null
}

interface HubDeployment {
  id: string
  provider: ProviderKey
  repo: string
  environment: string
  status: string
  createdAt: string
}

interface HubActivity {
  id: string
  provider: ProviderKey
  title: string
  detail: string
  createdAt: string
}

@Component({
  selector: 'app-repositories-hub-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  template: `
    <div class="page-container repo-hub animate-fade-in">
      <app-page-header
        title="Repositorios"
        description="Vista unificada de GitHub y GitLab — cuentas conectadas, actividad reciente y estado de despliegues."
        icon="folder_special"
        [actions]="[
          { label: 'Conectar GitHub', icon: 'link', primary: true },
          { label: 'Conectar GitLab', icon: 'link' },
          { label: 'Sincronizar todo', icon: 'sync' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      @if (page.loading()) {
        <app-loading-state message="Cargando repositorios…" />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <section class="repo-hub__kpis">
          @for (kpi of kpis(); track kpi.label) {
            <article class="repo-hub__kpi" [style.--kpi-accent]="kpi.color">
              <mat-icon>{{ kpi.icon }}</mat-icon>
              <div>
                <strong>{{ kpi.value }}</strong>
                <span>{{ kpi.label }}</span>
              </div>
            </article>
          }
        </section>

        <div class="repo-hub__grid">
          <section class="repo-hub__panel">
            <header>
              <h2><mat-icon>hub</mat-icon> Cuentas conectadas</h2>
              <span>{{ accounts().length }} activas</span>
            </header>
            @if (accounts().length === 0) {
              <p class="repo-hub__empty">Sin cuentas conectadas. Usa «Conectar GitHub» o «Conectar GitLab».</p>
            } @else {
              <ul class="repo-hub__accounts">
                @for (acc of accounts(); track acc.provider + acc.label) {
                  <li>
                    <a [routerLink]="providerRoute(acc.provider)" class="repo-hub__account">
                      <span class="repo-hub__prov" [attr.data-prov]="acc.provider">{{ acc.provider === 'github' ? 'GitHub' : 'GitLab' }}</span>
                      <div>
                        <strong>{{ acc.label }}</strong>
                        <span>{{ acc.repoCount }} repos · {{ acc.lastSyncAt ? (acc.lastSyncAt | date: 'dd MMM HH:mm') : 'Sin sync' }}</span>
                      </div>
                      <app-status-badge [value]="acc.status" />
                    </a>
                  </li>
                }
              </ul>
            }
          </section>

          <section class="repo-hub__panel">
            <header>
              <h2><mat-icon>rocket_launch</mat-icon> Despliegues recientes</h2>
              <a routerLink="/repositories/github/deployments">Ver todos</a>
            </header>
            @if (deployments().length === 0) {
              <p class="repo-hub__empty">Sin despliegues registrados.</p>
            } @else {
              <ul class="repo-hub__deploys">
                @for (d of deployments(); track d.id) {
                  <li class="repo-hub__deploy">
                    <span class="repo-hub__prov" [attr.data-prov]="d.provider">{{ d.provider === 'github' ? 'GH' : 'GL' }}</span>
                    <div>
                      <strong>{{ d.repo }}</strong>
                      <span>{{ d.environment }} · {{ d.createdAt | date: 'dd MMM HH:mm' }}</span>
                    </div>
                    <app-status-badge [value]="d.status" />
                  </li>
                }
              </ul>
            }
          </section>

          <section class="repo-hub__panel repo-hub__panel--wide">
            <header>
              <h2><mat-icon>history</mat-icon> Actividad reciente</h2>
            </header>
            @if (activity().length === 0) {
              <p class="repo-hub__empty">Sin actividad reciente en repositorios.</p>
            } @else {
              <ul class="repo-hub__activity">
                @for (ev of activity(); track ev.id) {
                  <li>
                    <span class="repo-hub__activity-icon" [attr.data-prov]="ev.provider">
                      <mat-icon>{{ ev.provider === 'github' ? 'code' : 'merge' }}</mat-icon>
                    </span>
                    <div>
                      <strong>{{ ev.title }}</strong>
                      <span>{{ ev.detail }}</span>
                    </div>
                    <time>{{ ev.createdAt | date: 'dd MMM HH:mm' }}</time>
                  </li>
                }
              </ul>
            }
          </section>

          <section class="repo-hub__panel repo-hub__panel--chart">
            <header>
              <h2><mat-icon>pie_chart</mat-icon> Estado de despliegues</h2>
            </header>
            <div class="repo-hub__chart">
              @for (seg of deployMix(); track seg.label) {
                <div class="repo-hub__bar">
                  <header>
                    <span>{{ seg.label }}</span>
                    <strong>{{ seg.count }}</strong>
                  </header>
                  <div class="repo-hub__bar-track">
                    <i [style.width.%]="seg.pct" [style.background]="seg.color"></i>
                  </div>
                </div>
              }
            </div>
            <div class="repo-hub__shortcuts">
              <a routerLink="/repositories/github" class="repo-hub__shortcut repo-hub__shortcut--gh">
                <mat-icon>code</mat-icon> GitHub
              </a>
              <a routerLink="/repositories/gitlab" class="repo-hub__shortcut repo-hub__shortcut--gl">
                <mat-icon>merge</mat-icon> GitLab
              </a>
            </div>
          </section>
        </div>
      }
    </div>
  `,
  styles: `
    .repo-hub {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      max-width: 100%;
      overflow-y: auto;
      scrollbar-width: thin;
      padding-bottom: 0.5rem;
      --page-accent: #6366f1;
    }
    .repo-hub__kpis {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
      gap: 0.55rem;
    }
    .repo-hub__kpi {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.7rem 0.85rem;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--kpi-accent) 25%, #e2e8f0);
      background: linear-gradient(135deg, color-mix(in srgb, var(--kpi-accent) 8%, #fff), #fff);
      mat-icon { color: var(--kpi-accent); font-size: 1.35rem; width: 1.35rem; height: 1.35rem; }
      strong { display: block; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
      span { display: block; font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; margin-top: 0.08rem; }
    }
    .repo-hub__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
    }
    .repo-hub__panel {
      padding: 0.75rem 0.9rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #fff;
      min-height: 12rem;
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.55rem;
        h2 {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin: 0;
          font-size: 0.78rem;
          font-weight: 700;
          color: #312e81;
          mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #6366f1; }
        }
        a, span { font-size: 0.64rem; font-weight: 600; color: #6366f1; text-decoration: none; }
      }
      &--wide { grid-column: 1 / -1; }
      &--chart { grid-column: span 1; }
    }
    .repo-hub__empty {
      margin: 0;
      padding: 1.25rem 0.5rem;
      text-align: center;
      font-size: 0.72rem;
      color: #94a3b8;
    }
    .repo-hub__accounts, .repo-hub__deploys, .repo-hub__activity {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .repo-hub__account, .repo-hub__deploy {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.5rem 0.55rem;
      border-radius: 9px;
      border: 1px solid #f1f5f9;
      text-decoration: none;
      color: inherit;
      &:hover { border-color: #c7d2fe; background: #fafbff; }
      strong { display: block; font-size: 0.72rem; font-weight: 700; }
      span { display: block; font-size: 0.62rem; color: #64748b; margin-top: 0.08rem; }
    }
    .repo-hub__prov {
      font-size: 0.58rem;
      font-weight: 800;
      padding: 0.15rem 0.4rem;
      border-radius: 6px;
      flex-shrink: 0;
      &[data-prov='github'] { background: #f3f4f6; color: #24292f; }
      &[data-prov='gitlab'] { background: #fff7ed; color: #c2410c; }
    }
    .repo-hub__activity li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.55rem;
      align-items: center;
      padding: 0.45rem 0;
      border-bottom: 1px solid #f1f5f9;
      strong { display: block; font-size: 0.72rem; }
      span { display: block; font-size: 0.62rem; color: #64748b; }
      time { font-size: 0.58rem; color: #94a3b8; white-space: nowrap; }
    }
    .repo-hub__activity-icon {
      width: 2rem;
      height: 2rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      &[data-prov='github'] { background: #f3f4f6; mat-icon { color: #24292f; } }
      &[data-prov='gitlab'] { background: #fff7ed; mat-icon { color: #c2410c; } }
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
    .repo-hub__bar header {
      display: flex;
      justify-content: space-between;
      font-size: 0.64rem;
      margin-bottom: 0.2rem;
      span { color: #64748b; font-weight: 600; }
      strong { color: #0f172a; }
    }
    .repo-hub__bar-track {
      height: 8px;
      border-radius: 999px;
      background: #e2e8f0;
      overflow: hidden;
      i { display: block; height: 100%; border-radius: inherit; min-width: 4px; }
    }
    .repo-hub__shortcuts {
      display: flex;
      gap: 0.45rem;
      margin-top: 0.75rem;
    }
    .repo-hub__shortcut {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      padding: 0.45rem;
      border-radius: 9px;
      font-size: 0.68rem;
      font-weight: 700;
      text-decoration: none;
      &--gh { background: #f3f4f6; color: #24292f; }
      &--gl { background: #fff7ed; color: #c2410c; }
    }
    @media (max-width: 900px) {
      .repo-hub__grid { grid-template-columns: 1fr; }
      .repo-hub__panel--wide, .repo-hub__panel--chart { grid-column: 1; }
    }
  `,
})
export class RepositoriesHubPageComponent implements OnInit, OnDestroy {
  private readonly github = inject(GithubService)
  private readonly gitlab = inject(GitlabService)
  private readonly connections = inject(IntegrationConnectionService)
  private readonly liveSync = inject(LiveRepoSyncService)

  readonly page = createPageLoader(true)
  readonly accounts = signal<HubAccount[]>([])
  readonly deployments = signal<HubDeployment[]>([])
  readonly activity = signal<HubActivity[]>([])

  readonly kpis = computed(() => {
    const accs = this.accounts()
    const deps = this.deployments()
    const openPrs = this.activity().filter((a) => a.title.toLowerCase().includes('pull') || a.title.toLowerCase().includes('merge')).length
    return [
      { label: 'Cuentas', value: accs.length, icon: 'link', color: '#6366f1' },
      { label: 'Repositorios', value: accs.reduce((s, a) => s + a.repoCount, 0), icon: 'folder', color: '#0ea5e9' },
      { label: 'Despliegues', value: deps.length, icon: 'rocket_launch', color: '#22c55e' },
      { label: 'PR/MR abiertos', value: openPrs, icon: 'merge', color: '#f59e0b' },
    ]
  })

  readonly deployMix = computed(() => {
    const deps = this.deployments()
    const buckets = new Map<string, number>()
    for (const d of deps) {
      const key = String(d.status ?? 'unknown').toLowerCase()
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
    const total = deps.length || 1
    const colors: Record<string, string> = {
      success: '#22c55e',
      running: '#3b82f6',
      failed: '#ef4444',
      pending: '#f59e0b',
    }
    const labels: Record<string, string> = {
      success: 'Correctos',
      running: 'En curso',
      failed: 'Fallidos',
      pending: 'Pendientes',
    }
    return [...buckets.entries()].map(([key, count]) => ({
      label: labels[key] ?? key,
      count,
      pct: Math.round((count / total) * 100),
      color: colors[key] ?? '#94a3b8',
    }))
  })

  ngOnInit(): void {
    this.load()
    this.liveSync.startLive(() => this.loadData(), 'github', 25_000)
  }

  ngOnDestroy(): void {
    this.liveSync.stopLive()
  }

  load = (): void => {
    this.page.run(of({ ok: true }), {
      onSuccess: () => this.loadData(),
      fallback: () => ({ ok: true }),
      errorMessage: 'No se pudieron cargar los repositorios',
    })
  }

  loadData = (): void => {
    forkJoin({
      ghAccounts: this.github.accounts().pipe(catchError(() => of({ items: [] }))),
      glAccounts: this.gitlab.accounts().pipe(catchError(() => of({ items: [] }))),
      ghDeploys: this.github.deployments().pipe(catchError(() => of({ items: [] }))),
      glDeploys: this.gitlab.deployments().pipe(catchError(() => of({ items: [] }))),
      ghPrs: this.github.allPullRequests().pipe(catchError(() => of({ items: [] }))),
      glMrs: this.gitlab.mergeRequests().pipe(catchError(() => of({ items: [] }))),
      ghCommits: this.github.allCommits().pipe(catchError(() => of({ items: [] }))),
    }).subscribe({
      next: (res) => {
        const accounts: HubAccount[] = [
          ...(res.ghAccounts.items ?? [])
            .filter((a) => a.status === 'connected')
            .map((a) => ({
              provider: 'github' as const,
              label: a.label ?? a.username ?? a.id,
              status: a.status,
              repoCount: Number((a as { repoCount?: number }).repoCount ?? 0),
              lastSyncAt: a.lastSyncAt ?? null,
            })),
          ...(res.glAccounts.items ?? [])
            .filter((a) => a.status === 'connected')
            .map((a) => ({
              provider: 'gitlab' as const,
              label: a.label ?? a.username ?? a.id,
              status: a.status,
              repoCount: Number((a as { repoCount?: number }).repoCount ?? 0),
              lastSyncAt: a.lastSyncAt ?? null,
            })),
        ]
        this.accounts.set(accounts)

        const mapDeploy = (items: Record<string, unknown>[], provider: ProviderKey): HubDeployment[] =>
          items.slice(0, 6).map((row, i) => ({
            id: String(row['id'] ?? `${provider}-${i}`),
            provider,
            repo: String(row['repoFullName'] ?? row['projectPath'] ?? row['repo'] ?? '—'),
            environment: String(row['environment'] ?? row['env'] ?? 'production'),
            status: String(row['status'] ?? 'unknown'),
            createdAt: String(row['createdAt'] ?? row['updatedAt'] ?? new Date().toISOString()),
          }))

        const allDeploys = [
          ...mapDeploy(res.ghDeploys.items ?? [], 'github'),
          ...mapDeploy(res.glDeploys.items ?? [], 'gitlab'),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        this.deployments.set(allDeploys.slice(0, 8))

        const acts: HubActivity[] = []
        for (const pr of (res.ghPrs.items ?? []).slice(0, 4)) {
          acts.push({
            id: `gh-pr-${pr['id']}`,
            provider: 'github',
            title: `PR #${pr['number'] ?? '—'}: ${pr['title'] ?? ''}`,
            detail: String(pr['repoFullName'] ?? pr['repository'] ?? ''),
            createdAt: String(pr['createdAt'] ?? new Date().toISOString()),
          })
        }
        for (const mr of (res.glMrs.items ?? []).slice(0, 4)) {
          acts.push({
            id: `gl-mr-${mr['id']}`,
            provider: 'gitlab',
            title: `MR !${mr['iid'] ?? mr['id']}: ${mr['title'] ?? ''}`,
            detail: String(mr['projectPath'] ?? ''),
            createdAt: String(mr['createdAt'] ?? new Date().toISOString()),
          })
        }
        for (const c of (res.ghCommits.items ?? []).slice(0, 3)) {
          acts.push({
            id: `gh-c-${c['sha'] ?? c['id']}`,
            provider: 'github',
            title: `Commit ${String(c['sha'] ?? '').slice(0, 7)}`,
            detail: String(c['message'] ?? c['repoFullName'] ?? ''),
            createdAt: String(c['committedAt'] ?? c['createdAt'] ?? new Date().toISOString()),
          })
        }
        acts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        this.activity.set(acts.slice(0, 10))
      },
    })
  }

  providerRoute = (p: ProviderKey): string =>
    p === 'github' ? '/repositories/github' : '/repositories/gitlab'

  handleHeader = (label: string): void => {
    if (label.includes('GitHub')) {
      this.connections.openGithub({ preferDialog: true }).subscribe(() => this.loadData())
      return
    }
    if (label.includes('GitLab')) {
      this.connections.openGitlab({ preferDialog: true }).subscribe(() => this.loadData())
      return
    }
    this.loadData()
  }
}
