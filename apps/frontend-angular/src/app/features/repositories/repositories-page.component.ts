import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
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
import { invNum } from '../../core/utils/inventory.util'
import { catchError, map, of, switchMap, type Observable } from 'rxjs'
import { GithubAccountDialogComponent } from './components/github-account-dialog.component'
import { buildGithubInventoryFallback } from './utils/github-inventory-fallback'
import {
  buildClientGithubDemoState,
  CLIENT_DEMO_DEPLOYMENTS,
  CLIENT_DEMO_GITHUB_PRS,
  CLIENT_DEMO_WEBHOOKS,
} from './utils/github-demo-catalog'
import {
  buildGitlabDemoBootstrap,
  CLIENT_DEMO_GITLAB_DEPLOYMENTS,
  CLIENT_DEMO_GITLAB_WEBHOOKS,
  type GitlabAccount,
  type GitlabGroup,
  type GitlabProject,
} from './utils/gitlab-demo-catalog'
import {
  buildGlobalDemoBranches,
  buildGlobalDemoCommits,
  buildRepositoriesSectionMetrics,
  type GlobalBranchRow,
  type GlobalCommitRow,
} from './utils/repositories-global-demo.util'
import {
  REPOSITORIES_SECTION_META,
  type RepositoriesSectionId,
} from './repositories-section.config'
import type { GithubDemoConnectResult } from '../../core/services/github.service'
import { DeployProjectDialogComponent } from './components/deploy-project-dialog.component'
import { RepositoryDetailDrawerComponent } from './components/repository-detail-drawer.component'
import { GitlabProjectDetailDrawerComponent } from './components/gitlab-project-detail-drawer.component'
import { GithubLogsPanelComponent } from './components/github-logs-panel.component'
import { GithubSectionComponent } from './sections/github-section.component'
import { GitlabSectionComponent } from './sections/gitlab-section.component'
import { WebhooksGlobalSectionComponent } from './sections/webhooks-global-section.component'
import { BranchesGlobalSectionComponent } from './sections/branches-global-section.component'
import { CommitsGlobalSectionComponent } from './sections/commits-global-section.component'
import { PullRequestsGithubSectionComponent } from './sections/pull-requests-github-section.component'
import { DeploymentsGlobalSectionComponent } from './sections/deployments-global-section.component'

@Component({
  selector: 'app-repositories-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    SummaryCardComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    RepositoryDetailDrawerComponent,
    GitlabProjectDetailDrawerComponent,
    GithubLogsPanelComponent,
    GithubSectionComponent,
    GitlabSectionComponent,
    WebhooksGlobalSectionComponent,
    BranchesGlobalSectionComponent,
    CommitsGlobalSectionComponent,
    PullRequestsGithubSectionComponent,
    DeploymentsGlobalSectionComponent,
  ],
  template: `
    <div class="page-container" [class]="'page-container--' + section()">
      <app-page-header
        [title]="headerMeta().title"
        [description]="headerMeta().description"
        [actions]="headerMeta().headerActions"
        (actionClick)="handleHeader($event)"
      />

      @if (page.loading()) {
        <app-loading-state [message]="loadingMessage()" />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="summary-grid app-section-panel stagger-children">
          @for (card of headerMeta().summaryCards; track card.title) {
            <app-summary-card
              [title]="card.title"
              [value]="metric(card.valueKey)"
              [icon]="card.icon"
              variant="elevated"
            />
          }
        </div>

        @switch (section()) {
          @case ('github') {
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
              (openDetail)="openGithubDrawer($event)"
              (deploy)="openDeploy($event)"
              (openExternal)="runDemo('Abrir en GitHub')"
            />
          }
          @case ('gitlab') {
            <app-gitlab-section
              [projects]="gitlabProjects()"
              [groups]="gitlabGroups()"
              [account]="gitlabAccount()"
              (addAccount)="runDemo('Añadir cuenta GitLab')"
              (connectDemo)="connectGitlabDemo()"
              (validate)="runDemo('Validar GitLab')"
              (sync)="runDemo('Sincronizar proyectos GitLab')"
              (openDetail)="openGitlabDrawer($event)"
              (deploy)="openGitlabDeploy($event)"
              (openExternal)="runDemo('Abrir en GitLab')"
              (viewMrs)="runDemo('Ver merge requests')"
              (viewPipelines)="runDemo('Ver pipelines')"
            />
          }
          @case ('webhooks') {
            <app-webhooks-global-section
              [allWebhooks]="allWebhooks()"
              (create)="runDemo('Crear webhook')"
              (test)="runDemo('Probar webhook')"
              (viewPayload)="runDemo('Ver payload')"
              (toggle)="runDemo('Desactivar webhook demo')"
              (retry)="runDemo('Reintentar evento')"
            />
          }
          @case ('branches') {
            <app-branches-global-section
              [branches]="globalBranches()"
              (sync)="runDemo('Sincronizar ramas')"
              (compare)="runDemo('Comparar ramas')"
              (viewCommits)="runDemo('Ver commits de rama')"
              (deployBranch)="runDemo('Desplegar rama')"
            />
          }
          @case ('commits') {
            <app-commits-global-section
              [commits]="globalCommits()"
              (viewDetail)="runDemo('Ver detalle commit')"
              (copySha)="runDemo('SHA copiado')"
              (deploy)="runDemo('Desplegar commit')"
              (openSource)="runDemo('Abrir origen')"
            />
          }
          @case ('pull-requests') {
            <app-pull-requests-github-section
              [pullRequests]="githubPullRequests()"
              (viewPr)="runDemo('Ver Pull Request')"
              (viewCommits)="runDemo('Ver commits del PR')"
              (viewChecks)="runDemo('Ver checks')"
              (deployPreview)="runDemo('Desplegar preview')"
              (openGithub)="runDemo('Abrir en GitHub')"
            />
          }
          @case ('deployments') {
            <app-deployments-global-section
              [deployments]="allDeployments()"
              (newDeploy)="handleTryDeploy()"
              (viewLogs)="viewLogs($event)"
              (viewTarget)="runDemo('Ver destino')"
              (viewCommit)="runDemo('Ver commit')"
              (viewPipeline)="runDemo('Ver pipeline')"
              (retry)="runDemo('Reintentar despliegue')"
              (rollback)="runDemo('Rollback demo')"
            />
          }
        }
      }
    </div>

    <app-repository-detail-drawer
      [open]="githubDrawerOpen()"
      [repo]="drawerRepo()"
      [branches]="branches()"
      [commits]="commits()"
      [pullRequests]="githubPullRequests()"
      [webhooks]="drawerWebhooks()"
      [deployments]="allDeployments()"
      [lastSyncAt]="connection()?.lastSyncAt ?? primaryAccount()?.lastSyncAt ?? null"
      [demoMode]="demoMode()"
      (close)="closeGithubDrawer()"
      (sync)="handleRepoSync($event)"
      (deploy)="openDeploy($event)"
      (viewDeploymentLogs)="viewLogs($event)"
    />

    <app-gitlab-project-detail-drawer
      [open]="gitlabDrawerOpen()"
      [project]="drawerProject()"
      [webhooks]="drawerGitlabWebhooks()"
      (close)="closeGitlabDrawer()"
      (sync)="runDemo('Proyecto GitLab sincronizado')"
      (deploy)="openGitlabDeploy($event)"
    />

    <app-github-logs-panel
      [open]="logsOpen()"
      [logs]="logsText()"
      [title]="logsTitle()"
      (close)="closeLogs()"
    />
  `,
  styles: `
    .page-container--github { --page-accent: #24292f; }
    .page-container--gitlab { --page-accent: #fc6d26; }
    .page-container--webhooks { --page-accent: #6366f1; }
    .page-container--branches { --page-accent: #0ea5e9; }
    .page-container--commits { --page-accent: #8b5cf6; }
    .page-container--pull-requests { --page-accent: #24292f; }
    .page-container--deployments { --page-accent: #22c55e; }
  `,
})
export class RepositoriesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly github = inject(GithubService)
  private readonly inventory = inject(InventoryService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)

  readonly page = createPageLoader(false)
  readonly data = signal<Record<string, unknown> | null>(null)
  readonly connection = signal<GithubConnection | null>(null)
  readonly accounts = signal<GithubAccount[]>([])
  readonly repos = signal<GithubRepo[]>([])
  readonly branches = signal<Record<string, unknown>[]>([])
  readonly commits = signal<Record<string, unknown>[]>([])
  readonly githubPullRequests = signal<Record<string, unknown>[]>(CLIENT_DEMO_GITHUB_PRS)
  readonly allWebhooks = signal<Record<string, unknown>[]>([
    ...CLIENT_DEMO_WEBHOOKS,
    ...CLIENT_DEMO_GITLAB_WEBHOOKS,
  ])
  readonly allDeployments = signal<Record<string, unknown>[]>([
    ...CLIENT_DEMO_DEPLOYMENTS,
    ...CLIENT_DEMO_GITLAB_DEPLOYMENTS,
  ])
  readonly globalBranches = signal<GlobalBranchRow[]>(buildGlobalDemoBranches())
  readonly globalCommits = signal<GlobalCommitRow[]>(buildGlobalDemoCommits())

  readonly gitlabAccount = signal<GitlabAccount | null>(buildGitlabDemoBootstrap().account)
  readonly gitlabProjects = signal<GitlabProject[]>(buildGitlabDemoBootstrap().projects)
  readonly gitlabGroups = signal<GitlabGroup[]>(buildGitlabDemoBootstrap().groups)

  readonly githubDrawerOpen = signal(false)
  readonly gitlabDrawerOpen = signal(false)
  readonly drawerRepo = signal<GithubRepo | null>(null)
  readonly drawerProject = signal<GitlabProject | null>(null)
  readonly drawerWebhooks = signal<Record<string, unknown>[]>([])
  readonly drawerGitlabWebhooks = signal<Record<string, unknown>[]>([])
  readonly logsOpen = signal(false)
  readonly logsText = signal('')
  readonly logsTitle = signal('')
  readonly demoMode = signal(false)

  readonly repoControl = new FormControl<string>('', { nonNullable: true })

  readonly section = computed(
    () => (this.route.snapshot.paramMap.get('section') ?? 'github') as RepositoriesSectionId,
  )

  readonly headerMeta = computed(() => REPOSITORIES_SECTION_META[this.section()])

  readonly sectionMetrics = computed(() =>
    buildRepositoriesSectionMetrics({
      githubRepos: this.repos().length,
      githubWebhooks: CLIENT_DEMO_WEBHOOKS.length,
      gitlabWebhooks: CLIENT_DEMO_GITLAB_WEBHOOKS.length,
      deployments: this.allDeployments(),
    }),
  )

  readonly primaryAccount = computed(() => {
    const connected = this.accounts().find((a) => a.status === 'connected')
    return connected ?? this.accounts()[0] ?? null
  })

  readonly syncStatus = computed((): 'connected' | 'pending' | 'invalid' | 'disconnected' => {
    if (this.connection()?.connected) return 'connected'
    const acc = this.primaryAccount()
    if (!acc) return 'disconnected'
    if (acc.status === 'connected') return 'connected'
    if (acc.status === 'invalid') return 'invalid'
    return 'pending'
  })

  readonly loadingMessage = computed(() => {
    const m: Record<RepositoriesSectionId, string> = {
      github: 'Cargando GitHub…',
      gitlab: 'Cargando GitLab…',
      webhooks: 'Cargando webhooks…',
      branches: 'Cargando ramas…',
      commits: 'Cargando commits…',
      'pull-requests': 'Cargando Pull Requests…',
      deployments: 'Cargando despliegues…',
    }
    return m[this.section()] ?? 'Cargando…'
  })

  ngOnInit(): void {
    this.applyClientDemoCatalog()
    this.load()
    this.reloadAuxiliaryTables()
    this.refreshDemoFromApi()
    this.repoControl.valueChanges.subscribe((id) => {
      if (id) this.loadRepoDetails(id)
    })
  }

  metric = (key: string): number => {
    const fromMetrics = this.sectionMetrics()[key]
    if (fromMetrics !== undefined) return fromMetrics
    return invNum(this.data(), key)
  }

  applyClientDemoCatalog = (): void => {
    this.applyDemoBootstrap(buildClientGithubDemoState())
  }

  refreshDemoFromApi = (): void => {
    this.github
      .connectDemo()
      .pipe(catchError(() => of(buildClientGithubDemoState())))
      .subscribe((state) => this.applyDemoBootstrap(state))
  }

  applyDemoBootstrap = (state: GithubDemoConnectResult): void => {
    this.demoMode.set(true)
    this.accounts.set([state.account])
    this.connection.set(state.connection)
    this.repos.set(state.repos)
    if (state.repos.length) {
      this.repoControl.setValue(state.repos[0].id)
      this.loadRepoDetails(state.repos[0].id)
    }
    this.data.set({
      connected: true,
      username: state.account.username,
      demoMode: true,
      ...this.sectionMetrics(),
      repoItems: state.repos,
      lastSyncAt: state.connection.lastSyncAt,
    })
  }

  connectGitlabDemo = (): void => {
    const boot = buildGitlabDemoBootstrap()
    this.gitlabAccount.set(boot.account)
    this.gitlabProjects.set(boot.projects)
    this.gitlabGroups.set(boot.groups)
    this.runDemo('Demo GitLab conectada', 'Proyectos y grupos cargados')
  }

  reloadAuxiliaryTables = (): void => {
    this.github
      .webhooks()
      .pipe(catchError(() => of({ items: [] as Record<string, unknown>[] })))
      .subscribe((w) => {
        const gh = w.items.length ? w.items : CLIENT_DEMO_WEBHOOKS
        this.allWebhooks.set([...gh, ...CLIENT_DEMO_GITLAB_WEBHOOKS])
      })
    this.github
      .deployments()
      .pipe(catchError(() => of({ items: [] as Record<string, unknown>[] })))
      .subscribe((d) => {
        const gh = d.items.length ? d.items : CLIENT_DEMO_DEPLOYMENTS
        this.allDeployments.set([...gh, ...CLIENT_DEMO_GITLAB_DEPLOYMENTS])
      })
    this.githubPullRequests.set(CLIENT_DEMO_GITHUB_PRS)
  }

  handleTryDeploy = (): void => {
    const repo = this.repos()[0]
    if (repo) this.openDeploy(repo)
  }

  load = (): void => {
    this.page.run(this.inventory.github(), {
      onSuccess: (d) => this.mergeInventory(d),
      fallback: () => {
        const base = buildGithubInventoryFallback()
        base['repoItems'] = this.repos().length ? this.repos() : base['repoItems']
        return { ...base, ...this.sectionMetrics() }
      },
      errorMessage: 'No se pudo cargar el inventario de repositorios',
    })
  }

  mergeInventory = (d: Record<string, unknown>): void => {
    const items = (d['repoItems'] as GithubRepo[]) ?? []
    if (items.length) this.repos.set(items)
    this.data.set({ ...d, ...this.sectionMetrics(), repoItems: this.repos() })
    this.demoMode.set(!!d['demoMode'] || this.demoMode())
    const first = this.repos()[0]
    if (first && !this.repoControl.value) {
      this.repoControl.setValue(first.id)
      this.loadRepoDetails(first.id)
    }
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
        .subscribe({
          next: () => {
            this.runDemo('Cuenta añadida', 'Validada y sincronizada')
            this.handleSync()
          },
        })
    })
  }

  handleQuickConnect = (): void => {
    this.applyClientDemoCatalog()
    this.runDemo('Vista demo GitHub', 'Repositorios ficticios cargados')
    this.refreshDemoFromApi()
  }

  handleValidate = (): void => {
    const acc = this.primaryAccount()
    if (!acc) return
    this.github
      .validateAccount(acc.id)
      .pipe(catchError(() => of({ valid: true, message: 'Conexión demo validada' })))
      .subscribe({
        next: (r) => this.runDemo('Validación GitHub', r.message ?? 'OK'),
      })
  }

  handleSync = (): void => {
    const acc = this.primaryAccount()
    let sync$: Observable<{ synced: number; repos?: GithubRepo[] }>
    if (acc) {
      sync$ = this.github
        .syncAccount(acc.id)
        .pipe(map((r) => ({ synced: r.synced, repos: this.repos() })))
    } else {
      sync$ = this.github
        .connectDemo()
        .pipe(map((s) => ({ synced: s.synced, repos: s.repos })))
    }
    sync$
      .pipe(
        catchError(() =>
          this.github.demoRepos().pipe(map((r) => ({ synced: r.count, repos: r.items }))),
        ),
      )
      .subscribe({
        next: (res) => {
          const items = res.repos ?? this.repos()
          if (items.length) this.repos.set(items)
          this.connection.update((c) =>
            c ? { ...c, lastSyncAt: new Date().toISOString(), repoCount: res.synced } : c,
          )
          this.load()
          this.reloadAuxiliaryTables()
          this.runDemo('Sincronización GitHub', `${res.synced} repositorios`)
        },
      })
  }

  handleRepoSync = (repoId: string): void => {
    this.github.syncRepository(repoId).subscribe({
      next: () => {
        this.loadRepoDetails(repoId)
        this.runDemo('Repositorio sincronizado')
      },
    })
  }

  loadRepoDetails = (repoId: string): void => {
    const repo = this.drawerRepo() ?? this.repos().find((r) => r.id === repoId) ?? null
    this.github
      .branches(repoId)
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((b) => this.branches.set(b.items))
    this.github
      .commits(repoId)
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((c) => this.commits.set(c.items))
    this.github
      .repoWebhooks(repoId)
      .pipe(
        catchError(() => of({ items: [] })),
        map((w) => {
          if (w.items.length) return w.items
          const fullName = repo?.fullName
          if (!fullName) return []
          return CLIENT_DEMO_WEBHOOKS.filter((wh) => wh['repoFullName'] === fullName)
        }),
      )
      .subscribe((items) => this.drawerWebhooks.set(items))
  }

  openGithubDrawer = (repo: GithubRepo): void => {
    this.repoControl.setValue(repo.id, { emitEvent: false })
    this.loadRepoDetails(repo.id)
    this.drawerRepo.set(repo)
    this.githubDrawerOpen.set(true)
  }

  closeGithubDrawer = (): void => {
    this.githubDrawerOpen.set(false)
    this.drawerRepo.set(null)
    this.drawerWebhooks.set([])
  }

  openGitlabDrawer = (project: GitlabProject): void => {
    this.drawerProject.set(project)
    this.drawerGitlabWebhooks.set(
      CLIENT_DEMO_GITLAB_WEBHOOKS.filter((w) => w['projectPath'] === project.fullPath),
    )
    this.gitlabDrawerOpen.set(true)
  }

  closeGitlabDrawer = (): void => {
    this.gitlabDrawerOpen.set(false)
    this.drawerProject.set(null)
    this.drawerGitlabWebhooks.set([])
  }

  openDeploy = (repo: GithubRepo): void => {
    const ref = this.dialog.open(DeployProjectDialogComponent, {
      width: '420px',
      data: { repoName: repo.fullName, defaultBranch: repo.defaultBranch },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result) return
      this.github.deployRepository(repo.id, result).subscribe({
        next: (res) => {
          this.runDemo('Despliegue desde GitHub', res.message)
          this.reloadAuxiliaryTables()
          if (res.deployment?.['id']) {
            this.viewLogs({ id: res.deployment['id'], repoFullName: repo.fullName })
          }
        },
      })
    })
  }

  openGitlabDeploy = (project: GitlabProject): void => {
    const ref = this.dialog.open(DeployProjectDialogComponent, {
      width: '420px',
      data: { repoName: project.fullPath, defaultBranch: project.defaultBranch },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result) return
      this.runDemo('Despliegue desde GitLab', `Proyecto ${project.name} → ${result.targetType}`)
    })
  }

  viewLogs = (row: Record<string, unknown>): void => {
    const id = String(row['id'] ?? '')
    this.logsTitle.set(String(row['repoFullName'] ?? row['projectPath'] ?? ''))
    if (row['logs']) {
      this.logsText.set(String(row['logs']))
      this.logsOpen.set(true)
      return
    }
    this.github.deploymentLogs(id).subscribe({
      next: (r) => {
        this.logsText.set(r.logs)
        this.logsOpen.set(true)
      },
      error: () => {
        this.logsText.set('Registros demo del despliegue.\n[OK] Health check\n[OK] Rollout')
        this.logsOpen.set(true)
      },
    })
  }

  closeLogs = (): void => this.logsOpen.set(false)

  handleHeader = (label: string): void => {
    if (label.includes('Sincronizar') || label.includes('Actualizar') || label === 'Conectar demo GitLab') {
      if (this.section() === 'gitlab') this.connectGitlabDemo()
      else this.handleSync()
      return
    }
    if (label.includes('Añadir cuenta')) {
      if (this.section() === 'github') this.openAddAccount()
      else this.runDemo(label)
      return
    }
    if (label === 'Desplegar' || label === 'Nuevo despliegue' || label === 'Desplegar commit') {
      this.handleTryDeploy()
      return
    }
    if (label === 'Crear webhook') {
      this.runDemo('Crear webhook')
      return
    }
    this.runDemo(label)
  }

  runDemo = (label: string, msg?: string): void => {
    this.demoActions.simulate(label, 450, msg ?? `${label} (demo)`).subscribe()
  }
}
