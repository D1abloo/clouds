import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl } from '@angular/forms'
import { MatDialog } from '@angular/material/dialog'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { InventoryService } from '../../core/services/inventory.service'
import {
  GithubService,
  type GithubAccount,
  type GithubConnection,
  type GithubRepo,
} from '../../core/services/github.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { catchError, map, of, switchMap, type Observable } from 'rxjs'
import { GithubAccountDialogComponent } from './components/github-account-dialog.component'
import { buildGithubInventoryFallback } from './utils/github-inventory-fallback'
import {
  buildClientGithubDemoState,
  CLIENT_DEMO_DEPLOYMENTS,
  CLIENT_DEMO_GITHUB_PRS,
  CLIENT_DEMO_WEBHOOKS,
} from './utils/github-demo-catalog'
import type { GithubDemoConnectResult } from '../../core/services/github.service'
import { DeployProjectDialogComponent } from './components/deploy-project-dialog.component'
import { RepositoryDetailDrawerComponent } from './components/repository-detail-drawer.component'
import { GithubLogsPanelComponent } from './components/github-logs-panel.component'
import { GithubSectionComponent } from './sections/github-section.component'
import { REPOSITORIES_SECTION_META } from './repositories-section.config'

@Component({
  selector: 'app-github-repositories-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    SummaryCardComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    RepositoryDetailDrawerComponent,
    GithubLogsPanelComponent,
    GithubSectionComponent,
  ],
  template: `
    <div class="page-container page-container--github">
      <app-page-header
        [title]="meta.title"
        [description]="meta.description"
        [actions]="meta.headerActions"
        (actionClick)="handleHeader($event)"
      />

      @if (page.loading()) {
        <app-loading-state message="Cargando GitHub…" />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="summary-grid app-section-panel stagger-children">
          @for (card of meta.summaryCards; track card.title) {
            <app-summary-card [title]="card.title" [value]="metric(card.valueKey)" [icon]="card.icon" variant="elevated" />
          }
        </div>

        <app-github-section
          [repos]="repos()"
          [account]="primaryAccount()"
          [connection]="connection()"
          [demoMode]="demoMode()"
          [syncStatus]="syncStatus()"
          [repoControl]="repoControl"
          (addAccount)="openAddAccount()"
          (connectDemo)="handleQuickConnect()"
          (validate)="handleValidate()"
          (sync)="handleSync()"
          (viewActions)="runDemo('Ver GitHub Actions')"
          (createWebhook)="runDemo('Crear webhook GitHub')"
          (viewLogs)="openGithubLogs()"
          (openDetail)="openDrawer($event)"
          (deploy)="openDeploy($event)"
          (openExternal)="runDemo('Abrir en GitHub')"
        />
      }
    </div>

    <app-repository-detail-drawer
      [open]="drawerOpen()"
      [repo]="drawerRepo()"
      [branches]="branches()"
      [commits]="commits()"
      [pullRequests]="githubPullRequests()"
      [webhooks]="drawerWebhooks()"
      [deployments]="githubDeployments()"
      [lastSyncAt]="connection()?.lastSyncAt ?? primaryAccount()?.lastSyncAt ?? null"
      [demoMode]="demoMode()"
      (close)="closeDrawer()"
      (sync)="handleRepoSync($event)"
      (deploy)="openDeploy($event)"
      (viewDeploymentLogs)="viewLogs($event)"
    />

    <app-github-logs-panel
      [open]="logsOpen()"
      [logs]="logsText()"
      [title]="logsTitle()"
      (close)="logsOpen.set(false)"
    />
  `,
})
export class GithubRepositoriesPageComponent implements OnInit {
  private readonly github = inject(GithubService)
  private readonly inventory = inject(InventoryService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)

  readonly meta = REPOSITORIES_SECTION_META.github
  readonly page = createPageLoader(false)
  readonly connection = signal<GithubConnection | null>(null)
  readonly accounts = signal<GithubAccount[]>([])
  readonly repos = signal<GithubRepo[]>([])
  readonly branches = signal<Record<string, unknown>[]>([])
  readonly commits = signal<Record<string, unknown>[]>([])
  readonly githubPullRequests = signal(CLIENT_DEMO_GITHUB_PRS)
  readonly githubDeployments = signal<Record<string, unknown>[]>(CLIENT_DEMO_DEPLOYMENTS)
  readonly drawerOpen = signal(false)
  readonly drawerRepo = signal<GithubRepo | null>(null)
  readonly drawerWebhooks = signal<Record<string, unknown>[]>([])
  readonly logsOpen = signal(false)
  readonly logsText = signal('')
  readonly logsTitle = signal('Logs GitHub')
  readonly demoMode = signal(false)
  readonly repoControl = new FormControl<string>('', { nonNullable: true })

  readonly primaryAccount = computed(() => this.accounts()[0] ?? null)

  readonly syncStatus = computed((): 'connected' | 'pending' | 'invalid' | 'disconnected' => {
    if (this.connection()?.connected) return 'connected'
    const acc = this.primaryAccount()
    if (!acc) return 'disconnected'
    if (acc.status === 'connected') return 'connected'
    if (acc.status === 'invalid') return 'invalid'
    return 'pending'
  })

  ngOnInit(): void {
    this.bootstrapGithubDemo()
    this.load()
    this.refreshDemoFromApi()
    this.repoControl.valueChanges.subscribe((id) => {
      if (id) this.loadRepoDetails(id)
    })
  }

  metric = (key: string): number => {
    const map: Record<string, number> = {
      githubRepoCount: this.repos().length,
      githubActionsCount: 6,
      githubOpenPrs: this.githubPullRequests().filter((p) => p['state'] === 'open').length,
      githubWebhookCount: CLIENT_DEMO_WEBHOOKS.length,
    }
    return map[key] ?? 0
  }

  bootstrapGithubDemo = (): void => {
    const state = buildClientGithubDemoState()
    this.demoMode.set(true)
    this.accounts.set([state.account])
    this.connection.set(state.connection)
    this.repos.set(state.repos)
    if (state.repos.length) {
      this.repoControl.setValue(state.repos[0].id)
      this.loadRepoDetails(state.repos[0].id)
    }
  }

  refreshDemoFromApi = (): void => {
    this.github
      .connectDemo()
      .pipe(catchError(() => of(buildClientGithubDemoState())))
      .subscribe((state) => {
        this.accounts.set([state.account])
        this.connection.set(state.connection)
        this.repos.set(state.repos)
      })
  }

  load = (): void => {
    this.page.run(this.inventory.github(), {
      onSuccess: (d) => {
        const items = (d['repoItems'] as GithubRepo[]) ?? []
        if (items.length) this.repos.set(items)
      },
      fallback: () => buildGithubInventoryFallback(),
      errorMessage: 'No se pudo cargar GitHub',
    })
  }

  loadRepoDetails = (repoId: string): void => {
    const repo = this.drawerRepo() ?? this.repos().find((r) => r.id === repoId) ?? null
    this.github.branches(repoId).pipe(catchError(() => of({ items: [] }))).subscribe((b) => this.branches.set(b.items))
    this.github.commits(repoId).pipe(catchError(() => of({ items: [] }))).subscribe((c) => this.commits.set(c.items))
    this.github
      .repoWebhooks(repoId)
      .pipe(
        catchError(() => of({ items: [] })),
        map((w) =>
          w.items.length ? w.items : CLIENT_DEMO_WEBHOOKS.filter((wh) => wh['repoFullName'] === repo?.fullName),
        ),
      )
      .subscribe((items) => this.drawerWebhooks.set(items))
  }

  openDrawer = (repo: GithubRepo): void => {
    this.repoControl.setValue(repo.id, { emitEvent: false })
    this.loadRepoDetails(repo.id)
    this.drawerRepo.set(repo)
    this.drawerOpen.set(true)
  }

  closeDrawer = (): void => {
    this.drawerOpen.set(false)
    this.drawerRepo.set(null)
    this.drawerWebhooks.set([])
  }

  openDeploy = (repo: GithubRepo): void => {
    const ref = this.dialog.open(DeployProjectDialogComponent, {
      width: '420px',
      data: { repoName: repo.fullName, defaultBranch: repo.defaultBranch },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result) return
      this.github.deployRepository(repo.id, result).subscribe({
        next: (res) => this.runDemo('Despliegue GitHub', res.message),
      })
    })
  }

  openGithubLogs = (): void => {
    this.logsText.set('[GitHub] Sync OK\n[GitHub] Actions workflow success\n[GitHub] Webhook delivered')
    this.logsOpen.set(true)
  }

  viewLogs = (row: Record<string, unknown>): void => {
    const id = String(row['id'] ?? '')
    this.logsTitle.set(String(row['repoFullName'] ?? 'GitHub'))
    this.github.deploymentLogs(id).subscribe({
      next: (r) => {
        this.logsText.set(r.logs)
        this.logsOpen.set(true)
      },
      error: () => {
        this.logsText.set('[GitHub] Registros demo del despliegue')
        this.logsOpen.set(true)
      },
    })
  }

  openAddAccount = (): void => {
    const ref = this.dialog.open(GithubAccountDialogComponent, { width: '440px' })
    ref.afterClosed().subscribe((body) => {
      if (!body) return
      this.github
        .createAccount(body)
        .pipe(
          switchMap((acc) =>
            this.github.validateAccount(acc.id).pipe(switchMap(() => this.github.syncAccount(acc.id))),
          ),
        )
        .subscribe({ next: () => this.handleSync() })
    })
  }

  handleQuickConnect = (): void => {
    this.bootstrapGithubDemo()
    this.runDemo('Demo GitHub conectada')
    this.refreshDemoFromApi()
  }

  handleValidate = (): void => {
    const acc = this.primaryAccount()
    if (!acc) return
    this.github.validateAccount(acc.id).pipe(catchError(() => of({ message: 'OK demo' }))).subscribe({
      next: (r) => this.runDemo('Validación GitHub', (r as { message?: string }).message),
    })
  }

  handleSync = (): void => {
    const acc = this.primaryAccount()
    const sync$: Observable<{ synced: number; repos?: GithubRepo[] }> = acc
      ? this.github.syncAccount(acc.id).pipe(map((r) => ({ synced: r.synced, repos: this.repos() })))
      : this.github.connectDemo().pipe(map((s) => ({ synced: s.synced, repos: s.repos })))
    sync$
      .pipe(catchError(() => this.github.demoRepos().pipe(map((r) => ({ synced: r.count, repos: r.items })))))
      .subscribe({
        next: (res) => {
          if (res.repos?.length) this.repos.set(res.repos)
          this.runDemo('Sincronización GitHub', `${res.synced} repositorios`)
        },
      })
  }

  handleRepoSync = (repoId: string): void => {
    this.github.syncRepository(repoId).subscribe({
      next: () => {
        this.loadRepoDetails(repoId)
        this.runDemo('Repositorio GitHub sincronizado')
      },
    })
  }

  handleHeader = (label: string): void => {
    if (label.includes('Sincronizar')) this.handleSync()
    else if (label.includes('Añadir')) this.openAddAccount()
    else if (label === 'Desplegar') {
      const repo = this.repos()[0]
      if (repo) this.openDeploy(repo)
    } else this.runDemo(label)
  }

  runDemo = (label: string, msg?: string): void => {
    this.demoActions.simulate(label, 450, msg ?? `${label} (demo)`).subscribe()
  }
}
