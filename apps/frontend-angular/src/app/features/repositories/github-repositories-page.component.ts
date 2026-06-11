import { Component, inject, OnDestroy, OnInit, signal, computed } from '@angular/core'
import { FormControl } from '@angular/forms'
import { MatDialog } from '@angular/material/dialog'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { InventoryService } from '../../core/services/inventory.service'
import {
  GithubService,
  type GithubAccount,
  type GithubConnection,
  type GithubRepo,
} from '../../core/services/github.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { catchError, map, of, type Observable } from 'rxjs'
import { IntegrationConnectionService } from '../../core/services/integration-connection.service'
import { buildGithubInventoryFallback } from './utils/github-inventory-fallback'
import { DeployProjectDialogComponent } from './components/deploy-project-dialog.component'
import { RepositoryDetailDrawerComponent } from './components/repository-detail-drawer.component'
import { GithubLogsPanelComponent } from './components/github-logs-panel.component'
import { GithubSectionComponent } from './sections/github-section.component'
import { GITHUB_NAV_LINKS, REPOSITORIES_SECTION_META } from './repositories-section.config'
import { RepositoriesActionService } from './repositories-action.service'
import { RepositoriesCrossNavComponent } from './components/repositories-cross-nav.component'
import { ToastService } from '../../core/services/toast.service'
import { LiveRepoSyncService } from '../../core/services/live-repo-sync.service'
import { RealtimeService } from '../../core/services/realtime.service'

@Component({
  selector: 'app-github-repositories-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    RepositoryDetailDrawerComponent,
    GithubLogsPanelComponent,
    GithubSectionComponent,
    RepositoriesCrossNavComponent,
  ],
  template: `
    <div class="page-container page-container--github repo-module-page">
      <app-page-header
        [title]="meta.title"
        [description]="meta.description"
        [actions]="meta.headerActions"
        (actionClick)="handleHeader($event)"
      />

      <app-repositories-cross-nav activeId="github" [links]="githubNavLinks" />

      @if (page.loading()) {
        <app-loading-state message="Cargando GitHub…" />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <app-github-section
          [repos]="repos()"
          [account]="primaryAccount()"
          [connection]="connection()"
          [demoMode]="false"
          [syncStatus]="syncStatus()"
          [workflowRuns]="workflowRuns()"
          [deployments]="githubDeployments()"
          [syncLogs]="syncLogsText()"
          [repoControl]="repoControl"
          (addAccount)="openAddAccount()"
          (connectDemo)="openAddAccount()"
          (validate)="handleValidate()"
          (sync)="handleSync()"
          (viewActions)="repoActions.viewGithubActions()"
          (createWebhook)="repoActions.createGithubWebhook()"
          (viewLogs)="openGithubLogs()"
          (openDetail)="openDrawer($event)"
          (deploy)="openDeploy($event)"
          (openExternal)="repoActions.openGithub($event.fullName)"
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
      [demoMode]="false"
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
export class GithubRepositoriesPageComponent implements OnInit, OnDestroy {

  private readonly github = inject(GithubService)
  private readonly inventory = inject(InventoryService)
  private readonly dialog = inject(MatDialog)
  private readonly connections = inject(IntegrationConnectionService)
  private readonly toast = inject(ToastService)
  private readonly liveSync = inject(LiveRepoSyncService)
  private readonly realtime = inject(RealtimeService)
  readonly repoActions = inject(RepositoriesActionService)

  readonly meta = REPOSITORIES_SECTION_META.github
  readonly githubNavLinks = GITHUB_NAV_LINKS
  readonly page = createPageLoader(false)
  readonly connection = signal<GithubConnection | null>(null)
  readonly accounts = signal<GithubAccount[]>([])
  readonly repos = signal<GithubRepo[]>([])
  readonly branches = signal<Record<string, unknown>[]>([])
  readonly commits = signal<Record<string, unknown>[]>([])
  readonly githubPullRequests = signal<Record<string, unknown>[]>([])
  readonly githubDeployments = signal<Record<string, unknown>[]>([])
  readonly workflowRuns = signal<Record<string, unknown>[]>([])
  readonly syncLogsText = signal('[GitHub] Esperando sincronización…')
  readonly drawerOpen = signal(false)
  readonly drawerRepo = signal<GithubRepo | null>(null)
  readonly drawerWebhooks = signal<Record<string, unknown>[]>([])
  readonly logsOpen = signal(false)
  readonly logsText = signal('')
  readonly logsTitle = signal('Logs GitHub')
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
    this.loadAccounts()
    this.load()
    this.loadLiveData()
    this.liveSync.startLive(() => this.refreshLive(), 'github', 20000)
    this.realtime.connect()
    this.repoControl.valueChanges.subscribe((id) => {
      if (id) this.loadRepoDetails(id)
    })
  }

  ngOnDestroy(): void {
    this.liveSync.stopLive()
  }

  refreshLive = (): void => {
    this.loadLiveData()
    if (this.drawerRepo()) this.loadRepoDetails(this.drawerRepo()!.id)
  }

  loadLiveData = (): void => {
    this.github.deployments().pipe(catchError(() => of({ items: [] }))).subscribe((d) => {
      this.githubDeployments.set(d.items ?? [])
    })
    this.github.workflowRuns().pipe(catchError(() => of({ items: [] }))).subscribe((w) => {
      this.workflowRuns.set(w.items ?? [])
    })
  }

  private loadAccounts = (): void => {
    this.github.accounts().pipe(catchError(() => of({ items: [] as GithubAccount[] }))).subscribe((res) => {
      this.accounts.set(res.items)
    })
    this.github.connection().pipe(catchError(() => of(null))).subscribe((conn) => {
      if (conn) this.connection.set(conn)
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
    this.github.branches(repoId).pipe(catchError(() => of({ items: [] }))).subscribe((b) => this.branches.set(b.items))
    this.github.commits(repoId).pipe(catchError(() => of({ items: [] }))).subscribe((c) => this.commits.set(c.items))
    this.github
      .repoWebhooks(repoId)
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((w) => this.drawerWebhooks.set(w.items))
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
      width: '560px',
      maxWidth: '96vw',
      data: { repoName: repo.fullName, defaultBranch: repo.defaultBranch, repoId: repo.id },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result) return
      this.toast.info('Despliegue en curso…')
      this.github.deployRepository(repo.id, result).subscribe({
        next: (res) => {
          this.toast.success(res.message)
          this.refreshLive()
          if (res.deployment?.['logs']) {
            this.logsText.set(String(res.deployment['logs']))
            this.logsTitle.set(repo.fullName)
            this.logsOpen.set(true)
          }
        },
        error: () => this.toast.error('No se pudo iniciar el despliegue'),
      })
    })
  }

  openGithubLogs = (): void => {
    const latest = this.githubDeployments()[0]
    if (latest?.['id']) {
      this.viewLogs(latest)
      return
    }
    this.logsText.set(this.syncLogsText())
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
        this.logsText.set('Sin registros de despliegue disponibles.')
        this.logsOpen.set(true)
      },
    })
  }

  openAddAccount = (): void => {
    this.connections.openGithub().subscribe()
  }

  handleValidate = (): void => {
    const acc = this.primaryAccount()
    if (!acc) return
    this.github.validateAccount(acc.id).pipe(catchError(() => of({ message: 'Validación completada' }))).subscribe({
      next: (r) => this.toast.success((r as { message?: string }).message ?? 'Validación completada'),
    })
  }

  handleSync = (): void => {
    const acc = this.primaryAccount()
    const sync$: Observable<{ synced: number; repos?: GithubRepo[]; message?: string }> = acc
      ? this.github.syncAccount(acc.id)
      : of({ synced: 0, repos: [] })
    sync$.pipe(catchError(() => of({ synced: 0, repos: [] as GithubRepo[], message: 'Error al sincronizar' }))).subscribe({
      next: (res) => {
        if (res.repos?.length) this.repos.set(res.repos)
        this.load()
        this.refreshLive()
        const msg = res.message ?? `${res.synced} repositorios sincronizados`
        this.syncLogsText.set(`[${new Date().toISOString()}] ${msg}`)
        this.toast.success(msg)
      },
    })
  }

  handleRepoSync = (repoId: string): void => {
    this.github.syncRepository(repoId).subscribe({
      next: () => {
        this.loadRepoDetails(repoId)
        this.refreshLive()
        this.toast.success('Repositorio sincronizado')
      },
    })
  }

  handleHeader = (label: string): void => {
    if (label.includes('Sincronizar')) this.handleSync()
    else if (label.includes('Añadir')) this.openAddAccount()
    else if (label === 'Desplegar') {
      const repo = this.repos()[0]
      if (repo) this.openDeploy(repo)
    }     else this.toast.info(label)
  }
}
