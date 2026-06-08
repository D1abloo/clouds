import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl } from '@angular/forms'
import { MatDialog } from '@angular/material/dialog'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { InventoryService } from '../../core/services/inventory.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
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
import { githubSyncPermissionsPayload } from './utils/github-sync-permissions.util'
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
import { RepositoriesActionService } from './repositories-action.service'
import { RepositoriesCrossNavComponent } from './components/repositories-cross-nav.component'

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

      <app-repositories-cross-nav activeId="github" />

      @if (page.loading()) {
        <app-loading-state message="Cargando GitHub…" />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
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
  private readonly pro = inject(ProModeService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)
  readonly repoActions = inject(RepositoriesActionService)

  readonly meta = REPOSITORIES_SECTION_META.github
  readonly page = createPageLoader(false)
  readonly connection = signal<GithubConnection | null>(null)
  readonly accounts = signal<GithubAccount[]>([])
  readonly repos = signal<GithubRepo[]>([])
  readonly branches = signal<Record<string, unknown>[]>([])
  readonly commits = signal<Record<string, unknown>[]>([])
  readonly githubPullRequests = signal(
    allowsDemoDataFrom(this.pro) ? CLIENT_DEMO_GITHUB_PRS : [],
  )
  readonly githubDeployments = signal<Record<string, unknown>[]>(
    allowsDemoDataFrom(this.pro) ? CLIENT_DEMO_DEPLOYMENTS : [],
  )
  readonly drawerOpen = signal(false)
  readonly drawerRepo = signal<GithubRepo | null>(null)
  readonly drawerWebhooks = signal<Record<string, unknown>[]>([])
  readonly logsOpen = signal(false)
  readonly logsText = signal('')
  readonly logsTitle = signal('Logs GitHub')
  readonly demoMode = signal(allowsDemoDataFrom(this.pro))
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
    if (allowsDemoDataFrom(this.pro)) {
      this.bootstrapGithubDemo()
      this.refreshDemoFromApi()
    } else {
      this.loadAccounts()
    }
    this.load()
    this.repoControl.valueChanges.subscribe((id) => {
      if (id) this.loadRepoDetails(id)
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
      fallback: () => buildGithubInventoryFallback(allowsDemoDataFrom(this.pro)),
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
        map((w) => {
          if (w.items.length) return w.items
          if (!allowsDemoDataFrom(this.pro)) return []
          return CLIENT_DEMO_WEBHOOKS.filter((wh) => wh['repoFullName'] === repo?.fullName)
        }),
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
        this.logsText.set(
          allowsDemoDataFrom(this.pro)
            ? '[GitHub] Registros demo del despliegue'
            : 'Sin registros de despliegue disponibles.',
        )
        this.logsOpen.set(true)
      },
    })
  }

  openAddAccount = (): void => {
    const ref = this.dialog.open(GithubAccountDialogComponent, {
      width: '920px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: 'first-tabbable',
    })
    ref.afterClosed().subscribe((body) => {
      if (!body) return
      this.github
        .createAccount({
          label: body.label,
          username: body.username,
          token: body.token,
          organization: body.organization,
          accountType: body.accountType,
          authMethod: body.authMethod,
          scopes: body.scopes,
          environment: body.environment,
          autoSync: body.autoSync,
          syncInterval: body.syncInterval,
          repoScope: body.repoScope,
          webhookUrl: body.webhookUrl,
          webhookSecret: body.webhookSecret,
          webhookEvents: body.webhookEvents,
          description: body.description,
          contactEmail: body.contactEmail,
          useDemoData: false,
        })
        .pipe(
          switchMap((created) => {
            const afterValidate = body.validateBeforeSave
              ? this.github.validateAccount(created.id).pipe(map(() => created))
              : of(created)
            return afterValidate.pipe(
              switchMap((acc) =>
                body.syncOnConnect
                  ? this.github
                      .syncAccount(acc.id, githubSyncPermissionsPayload(body))
                      .pipe(map((sync) => ({ acc, sync })))
                  : of({ acc, sync: null }),
              ),
            )
          }),
        )
        .subscribe({
          next: ({ acc, sync }) => {
            this.accounts.update((list) => {
              const rest = list.filter((a) => a.id !== acc.id)
              return [acc, ...rest]
            })
            if (sync?.repos?.length) {
              this.repos.set(sync.repos)
              this.repoControl.setValue(sync.repos[0].id)
            } else if (sync) {
              this.runDemo('Sync GitHub', sync.message)
            }
            this.runDemo(
              'Cuenta GitHub añadida',
              sync
                ? `${body.label} · ${sync.synced} repos según permisos`
                : `${body.label} · ${body.authMethod}`,
            )
            if (body.syncOnConnect && sync && !sync.repos?.length) {
              this.handleSync()
            }
          },
        })
    })
  }

  handleQuickConnect = (): void => {
    if (!allowsDemoDataFrom(this.pro)) return
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
    const allowDemo = allowsDemoDataFrom(this.pro)
    const sync$: Observable<{ synced: number; repos?: GithubRepo[] }> = acc
      ? this.github.syncAccount(acc.id).pipe(map((r) => ({ synced: r.synced, repos: this.repos() })))
      : allowDemo
        ? this.github.connectDemo().pipe(map((s) => ({ synced: s.synced, repos: s.repos })))
        : of({ synced: 0, repos: [] })
    sync$
      .pipe(
        catchError(() =>
          allowDemo
            ? this.github.demoRepos().pipe(map((r) => ({ synced: r.count, repos: r.items })))
            : of({ synced: 0, repos: [] }),
        ),
      )
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
