import { Component, inject, OnDestroy, OnInit, signal, computed, effect } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { map } from 'rxjs'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { GithubService } from '../../core/services/github.service'
import { GitlabService } from '../../core/services/gitlab.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
import { createPageLoader } from '../../core/utils/page-load.util'
import { catchError, forkJoin, of, switchMap } from 'rxjs'
import { ToastService } from '../../core/services/toast.service'
import {
  CLIENT_DEMO_DEPLOYMENTS,
  CLIENT_DEMO_GITHUB_PRS,
  CLIENT_DEMO_WEBHOOKS,
} from './utils/github.data'
import { CLIENT_DEMO_GITLAB_DEPLOYMENTS, CLIENT_DEMO_GITLAB_MRS, CLIENT_DEMO_GITLAB_WEBHOOKS } from './utils/gitlab.data'
import {
  buildGlobalDemoBranches,
  buildGlobalDemoCommits,
  mapApiBranchRow,
  mapApiCommitRow,
  type GlobalBranchRow,
  type GlobalCommitRow,
} from './utils/repositories-global.util'
import {
  providerNavLinks,
  providerSectionMeta,
  type RepositoriesSectionId,
  type RepositoryProvider,
} from './repositories-section.config'
import { GithubLogsPanelComponent } from './components/github-logs-panel.component'
import { WebhooksGlobalSectionComponent } from './sections/webhooks-global-section.component'
import { BranchesGlobalSectionComponent } from './sections/branches-global-section.component'
import { CommitsGlobalSectionComponent } from './sections/commits-global-section.component'
import { PullRequestsGithubSectionComponent } from './sections/pull-requests-github-section.component'
import { DeploymentsGlobalSectionComponent } from './sections/deployments-global-section.component'
import { RepositoriesActionService } from './repositories-action.service'
import { RepositoriesCrossNavComponent } from './components/repositories-cross-nav.component'
import { LiveRepoSyncService } from '../../core/services/live-repo-sync.service'

const RESOURCE_SECTIONS: RepositoriesSectionId[] = [
  'webhooks',
  'branches',
  'commits',
  'pull-requests',
  'merge-requests',
  'deployments',
]

@Component({
  selector: 'app-repositories-global-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    GithubLogsPanelComponent,
    WebhooksGlobalSectionComponent,
    BranchesGlobalSectionComponent,
    CommitsGlobalSectionComponent,
    PullRequestsGithubSectionComponent,
    DeploymentsGlobalSectionComponent,
    RepositoriesCrossNavComponent,
  ],
  template: `
    <div class="page-container repo-module-page" [class]="'page-container--' + section()">
      <app-page-header
        [title]="headerMeta().title"
        [description]="headerMeta().description"
        [icon]="sectionIcon()"
        [actions]="headerMeta().headerActions"
        (actionClick)="handleHeader($event)"
      />

      <app-repositories-cross-nav [activeId]="section()" [links]="navLinks()" />

      @if (page.loading()) {
        <app-loading-state [message]="loadingMessage()" />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="init()" />
      } @else {
        @switch (section()) {
          @case ('webhooks') {
            <app-webhooks-global-section
              [allWebhooks]="allWebhooks()"
              (create)="actions.createWebhook()"
              (test)="actions.testWebhook()"
              (viewPayload)="actions.viewPayload($event)"
              (toggle)="actions.toggleWebhook($event)"
              (retry)="actions.retryWebhook($event)"
            />
          }
          @case ('branches') {
            <app-branches-global-section
              [branches]="globalBranches()"
              [provider]="provider()"
              (sync)="handleSyncBranches()"
              (compare)="actions.compareBranches(globalBranches()[0])"
              (viewCommits)="actions.viewBranchCommits($event)"
              (deployBranch)="actions.deployBranch($event)"
            />
          }
          @case ('commits') {
            <app-commits-global-section
              [commits]="globalCommits()"
              (refresh)="handleRefreshCommits()"
              (deployLatest)="deployLatestCommit()"
              (viewDetail)="actions.viewCommitDetail($event)"
              (viewDiff)="actions.viewCommitDiff($event)"
              (viewCi)="actions.viewCommitCi($event)"
              (copySha)="actions.copyCommitSha($event)"
              (deploy)="actions.deployCommit($event)"
              (openSource)="actions.openCommitSource($event)"
            />
          }
          @case ('pull-requests') {
            <app-pull-requests-github-section
              [pullRequests]="pullRequests()"
              (viewPr)="actions.viewPr($event)"
              (viewCommits)="actions.viewPrCommits($event)"
              (viewChecks)="actions.viewPrChecks($event)"
              (viewGithubActions)="actions.viewPrGithubActions($event)"
              (deployPreview)="actions.deployPrPreview($event)"
              (openGithub)="actions.openPrGithub($event)"
              (requestReview)="actions.requestPrReview($event)"
              (mergePr)="actions.mergePr($event)"
            />
          }
          @case ('merge-requests') {
            <app-pull-requests-github-section
              [pullRequests]="pullRequests()"
              (viewPr)="actions.viewPr($event)"
              (viewCommits)="actions.viewPrCommits($event)"
              (viewChecks)="actions.viewPrChecks($event)"
              (viewGithubActions)="actions.viewPrGithubActions($event)"
              (deployPreview)="actions.deployPrPreview($event)"
              (openGithub)="actions.openPrGithub($event)"
              (requestReview)="actions.requestPrReview($event)"
              (mergePr)="actions.mergePr($event)"
            />
          }
          @case ('deployments') {
            <app-deployments-global-section
              [deployments]="allDeployments()"
              (newDeploy)="actions.newDeploy()"
              (viewHistory)="actions.deployHistory()"
              (viewLogs)="viewLogs($event)"
              (viewTarget)="actions.viewDeployTarget($event)"
              (viewCommit)="actions.viewDeployCommit($event)"
              (viewPipeline)="actions.viewDeployPipeline($event)"
              (retry)="actions.retryDeploy($event)"
              (rollback)="actions.rollbackDeploy($event)"
            />
          }
        }
      }
    </div>

    <app-github-logs-panel
      [open]="logsOpen()"
      [logs]="logsText()"
      [title]="logsTitle()"
      (close)="logsOpen.set(false)"
    />
  `,
  styles: `
    .page-container--webhooks { --page-accent: #6366f1; }
    .page-container--branches { --page-accent: #0ea5e9; }
    .page-container--commits { --page-accent: #8b5cf6; }
    .page-container--pull-requests { --page-accent: #24292f; }
    .page-container--merge-requests { --page-accent: #fc6d26; }
    .page-container--deployments { --page-accent: #22c55e; }
  `,
})
export class RepositoriesGlobalPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute)
  private readonly github = inject(GithubService)
  private readonly gitlab = inject(GitlabService)
  private readonly pro = inject(ProModeService)
  private readonly toast = inject(ToastService)
  private readonly liveSync = inject(LiveRepoSyncService)

  readonly actions = inject(RepositoriesActionService)

  readonly page = createPageLoader(false)
  readonly pullRequests = signal<Record<string, unknown>[]>([])
  readonly allWebhooks = signal<Record<string, unknown>[]>([])
  readonly allDeployments = signal<Record<string, unknown>[]>([])
  readonly globalBranches = signal<GlobalBranchRow[]>([])
  readonly globalCommits = signal<GlobalCommitRow[]>([])
  readonly logsOpen = signal(false)
  readonly logsText = signal('')
  readonly logsTitle = signal('')

  readonly provider = toSignal(
    this.route.data.pipe(
      map((d) => (d['provider'] as RepositoryProvider) ?? 'github'),
    ),
    { initialValue: (this.route.snapshot.data['provider'] as RepositoryProvider) ?? 'github' },
  )

  readonly section = toSignal(
    this.route.paramMap.pipe(
      map((p) => (p.get('section') ?? 'webhooks') as RepositoriesSectionId),
    ),
    { initialValue: (this.route.snapshot.paramMap.get('section') ?? 'webhooks') as RepositoriesSectionId },
  )

  readonly navLinks = computed(() => providerNavLinks(this.provider()))

  readonly headerMeta = computed(() => providerSectionMeta(this.provider(), this.section()))

  readonly sectionIcon = computed((): string => {
    const icons: Partial<Record<RepositoriesSectionId, string>> = {
      webhooks: 'webhook',
      branches: 'account_tree',
      commits: 'history_edu',
      'pull-requests': 'merge',
      'merge-requests': 'call_merge',
      deployments: 'rocket_launch',
    }
    return icons[this.section()] ?? 'folder_special'
  })

  readonly loadingMessage = computed(() => {
    const m: Record<string, string> = {
      webhooks: 'Cargando webhooks…',
      branches: 'Cargando ramas…',
      commits: 'Cargando commits…',
      'pull-requests': 'Cargando Pull Requests…',
      'merge-requests': 'Cargando Merge Requests…',
      deployments: 'Cargando despliegues…',
    }
    return m[this.section()] ?? 'Cargando…'
  })

  constructor() {
    effect(() => {
      const s = this.section()
      const p = this.provider()
      if (RESOURCE_SECTIONS.includes(s)) this.reloadTables(p, s)
    })
  }

  ngOnInit(): void {
    if (RESOURCE_SECTIONS.includes(this.section())) this.init()
    const provider = this.provider()
    this.liveSync.startLive(
      () => this.reloadTables(this.provider(), this.section()),
      provider === 'gitlab' ? 'gitlab' : 'github',
      20000,
    )
  }

  ngOnDestroy(): void {
    this.liveSync.stopLive()
  }

  init = (): void => {
    this.page.run(of({ ok: true }), {
      onSuccess: () => undefined,
      fallback: () => ({ ok: true }),
      errorMessage: 'Error al cargar',
    })
    this.reloadTables(this.provider(), this.section())
  }

  reloadTables = (provider: RepositoryProvider, section: RepositoriesSectionId): void => {
    const allowDemo = allowsDemoDataFrom(this.pro)
    const empty = { items: [] as Record<string, unknown>[] }

    if (provider === 'github') {
      if (section === 'webhooks') {
        this.github.webhooks().pipe(catchError(() => of(empty))).subscribe((w) => {
          this.allWebhooks.set(w.items.length ? w.items : allowDemo ? CLIENT_DEMO_WEBHOOKS : [])
        })
      }
      if (section === 'deployments') {
        this.github.deployments().pipe(catchError(() => of(empty))).subscribe((d) => {
          this.allDeployments.set(d.items.length ? d.items : allowDemo ? CLIENT_DEMO_DEPLOYMENTS : [])
        })
      }
      if (section === 'branches') {
        this.github.allBranches().pipe(catchError(() => of(empty))).subscribe((b) => {
          const rows = b.items.length ? b.items.map(mapApiBranchRow) : allowDemo ? buildGlobalDemoBranches().filter((r) => r.provider === 'github') : []
          this.globalBranches.set(rows)
        })
      }
      if (section === 'commits') {
        this.github.allCommits().pipe(catchError(() => of(empty))).subscribe((c) => {
          const rows = c.items.length ? c.items.map(mapApiCommitRow) : allowDemo ? buildGlobalDemoCommits().filter((r) => r.provider === 'github') : []
          this.globalCommits.set(rows)
        })
      }
      if (section === 'pull-requests') {
        this.github.allPullRequests().pipe(catchError(() => of(empty))).subscribe((pr) => {
          this.pullRequests.set(pr.items.length ? pr.items : allowDemo ? CLIENT_DEMO_GITHUB_PRS : [])
        })
      }
      return
    }

    if (section === 'webhooks') {
      this.gitlab.webhooks().pipe(catchError(() => of(empty))).subscribe((w) => {
        this.allWebhooks.set(w.items.length ? w.items : allowDemo ? CLIENT_DEMO_GITLAB_WEBHOOKS : [])
      })
    }
    if (section === 'deployments') {
      this.gitlab.deployments().pipe(catchError(() => of(empty))).subscribe((d) => {
        this.allDeployments.set(d.items.length ? d.items : allowDemo ? CLIENT_DEMO_GITLAB_DEPLOYMENTS : [])
      })
    }
    if (section === 'branches') {
      this.gitlab.branches().pipe(catchError(() => of(empty))).subscribe((b) => {
        const rows = b.items?.length ? b.items.map(mapApiBranchRow) : allowDemo ? buildGlobalDemoBranches().filter((r) => r.provider === 'gitlab') : []
        this.globalBranches.set(rows)
      })
    }
    if (section === 'commits') {
      this.gitlab.commits().pipe(catchError(() => of(empty))).subscribe((c) => {
        const rows = c.items.length ? c.items.map(mapApiCommitRow) : allowDemo ? buildGlobalDemoCommits().filter((r) => r.provider === 'gitlab') : []
        this.globalCommits.set(rows)
      })
    }
    if (section === 'merge-requests') {
      this.gitlab.mergeRequests().pipe(catchError(() => of(empty))).subscribe((mr) => {
        this.pullRequests.set(mr.items.length ? mr.items : allowDemo ? CLIENT_DEMO_GITLAB_MRS : [])
      })
    }
  }

  handleSyncBranches = (): void => {
    const provider = this.provider()
    this.toast.info('Sincronizando ramas…')
    if (provider === 'github') {
      this.github
        .accounts()
        .pipe(
          switchMap((res) => {
            const accounts = (res.items ?? []).filter((a) => a.status === 'connected')
            if (!accounts.length) return of([])
            return forkJoin(accounts.map((a) => this.github.syncAccount(a.id).pipe(catchError(() => of(null)))))
          }),
        )
        .subscribe({
          next: () => {
            this.reloadTables(provider, 'branches')
            this.toast.success('Ramas sincronizadas')
          },
          error: () => this.toast.error('No se pudieron sincronizar las ramas'),
        })
      return
    }
    this.gitlab
      .accounts()
      .pipe(
        switchMap((res) => {
          const accounts = (res.items ?? []).filter((a) => a.status === 'connected')
          if (!accounts.length) return of([])
          return forkJoin(accounts.map((a) => this.gitlab.syncAccount(a.id).pipe(catchError(() => of(null)))))
        }),
      )
      .subscribe({
        next: () => {
          this.reloadTables(provider, 'branches')
          this.toast.success('Ramas sincronizadas')
        },
        error: () => this.toast.error('No se pudieron sincronizar las ramas'),
      })
  }

  handleRefreshCommits = (): void => {
    const provider = this.provider()
    this.toast.info('Actualizando commits…')
    if (provider === 'github') {
      this.github
        .accounts()
        .pipe(
          switchMap((res) => {
            const accounts = (res.items ?? []).filter((a) => a.status === 'connected')
            if (!accounts.length) return of([])
            return forkJoin(accounts.map((a) => this.github.syncAccount(a.id).pipe(catchError(() => of(null)))))
          }),
        )
        .subscribe({
          next: () => {
            this.reloadTables(provider, 'commits')
            this.toast.success('Commits actualizados')
          },
          error: () => this.toast.error('No se pudieron actualizar los commits'),
        })
      return
    }
    this.gitlab
      .accounts()
      .pipe(
        switchMap((res) => {
          const accounts = (res.items ?? []).filter((a) => a.status === 'connected')
          if (!accounts.length) return of([])
          return forkJoin(accounts.map((a) => this.gitlab.syncAccount(a.id).pipe(catchError(() => of(null)))))
        }),
      )
      .subscribe({
        next: () => {
          this.reloadTables(provider, 'commits')
          this.toast.success('Commits actualizados')
        },
        error: () => this.toast.error('No se pudieron actualizar los commits'),
      })
  }

  deployLatestCommit = (): void => {
    const c = this.globalCommits().find((x) => x.deployStatus === 'pending') ?? this.globalCommits()[0]
    if (c) this.actions.deployCommit(c)
  }

  viewLogs = (row: Record<string, unknown>): void => {
    const id = String(row['id'] ?? '')
    this.logsTitle.set(String(row['repoFullName'] ?? row['projectPath'] ?? 'Despliegue'))
    const logs$ =
      this.provider() === 'gitlab'
        ? this.gitlab.deploymentLogs(id)
        : this.github.deploymentLogs(id)
    logs$.subscribe({
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

  handleHeader = (label: string): void => {
    if (label.includes('Crear webhook')) return this.actions.createWebhook()
    if (label.includes('Probar webhook')) return this.actions.testWebhook()
    if (label.includes('Sincronizar ramas')) return this.handleSyncBranches()
    if (label.includes('Comparar ramas')) return this.actions.compareBranches(this.globalBranches()[0])
    if (label.includes('Actualizar')) return this.handleRefreshCommits()
    if (label.includes('Desplegar commit')) return this.deployLatestCommit()
    if (label.includes('Abrir en GitHub') || label.includes('Abrir en GitLab')) {
      const pr = this.pullRequests()[0]
      if (pr) return this.actions.openPrGithub(pr)
    }
    if (label.includes('Desplegar preview')) {
      const pr = this.pullRequests().find((p) => p['state'] === 'open' || p['state'] === 'opened')
      if (pr) return this.actions.deployPrPreview(pr)
    }
    if (label.includes('Nuevo despliegue')) return this.actions.newDeploy()
    if (label.includes('Ver historial')) return this.actions.deployHistory()
  }
}
