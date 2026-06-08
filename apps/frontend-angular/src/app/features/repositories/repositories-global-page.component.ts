import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { map } from 'rxjs'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { GithubService } from '../../core/services/github.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
import { createPageLoader } from '../../core/utils/page-load.util'
import { catchError, of } from 'rxjs'
import {
  CLIENT_DEMO_DEPLOYMENTS,
  CLIENT_DEMO_GITHUB_PRS,
  CLIENT_DEMO_WEBHOOKS,
} from './utils/github-demo-catalog'
import { CLIENT_DEMO_GITLAB_DEPLOYMENTS, CLIENT_DEMO_GITLAB_WEBHOOKS } from './utils/gitlab-demo-catalog'
import {
  buildGlobalDemoBranches,
  buildGlobalDemoCommits,
  type GlobalBranchRow,
  type GlobalCommitRow,
} from './utils/repositories-global-demo.util'
import {
  REPOSITORIES_SECTION_META,
  type RepositoriesSectionId,
} from './repositories-section.config'
import { GithubLogsPanelComponent } from './components/github-logs-panel.component'
import { WebhooksGlobalSectionComponent } from './sections/webhooks-global-section.component'
import { BranchesGlobalSectionComponent } from './sections/branches-global-section.component'
import { CommitsGlobalSectionComponent } from './sections/commits-global-section.component'
import { PullRequestsGithubSectionComponent } from './sections/pull-requests-github-section.component'
import { DeploymentsGlobalSectionComponent } from './sections/deployments-global-section.component'
import { RepositoriesActionService } from './repositories-action.service'
import { RepositoriesCrossNavComponent } from './components/repositories-cross-nav.component'

const GLOBAL_SECTIONS: RepositoriesSectionId[] = [
  'webhooks',
  'branches',
  'commits',
  'pull-requests',
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

      <app-repositories-cross-nav [activeId]="section()" />

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
              (sync)="actions.syncBranches()"
              (compare)="actions.compareBranches(globalBranches()[0])"
              (viewCommits)="actions.viewBranchCommits($event)"
              (deployBranch)="actions.deployBranch($event)"
            />
          }
          @case ('commits') {
            <app-commits-global-section
              [commits]="globalCommits()"
              (refresh)="actions.refreshCommits()"
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
              [pullRequests]="githubPullRequests()"
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
              (viewLogs)="actions.viewDeployLogs($event)"
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
    .page-container--deployments { --page-accent: #22c55e; }
  `,
})
export class RepositoriesGlobalPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly github = inject(GithubService)
  private readonly pro = inject(ProModeService)
  readonly actions = inject(RepositoriesActionService)

  readonly page = createPageLoader(false)
  readonly githubPullRequests = signal(
    allowsDemoDataFrom(this.pro) ? CLIENT_DEMO_GITHUB_PRS : [],
  )
  readonly allWebhooks = signal(
    allowsDemoDataFrom(this.pro) ? [...CLIENT_DEMO_WEBHOOKS, ...CLIENT_DEMO_GITLAB_WEBHOOKS] : [],
  )
  readonly allDeployments = signal(
    allowsDemoDataFrom(this.pro) ? [...CLIENT_DEMO_DEPLOYMENTS, ...CLIENT_DEMO_GITLAB_DEPLOYMENTS] : [],
  )
  readonly globalBranches = signal<GlobalBranchRow[]>(
    allowsDemoDataFrom(this.pro) ? buildGlobalDemoBranches() : [],
  )
  readonly globalCommits = signal<GlobalCommitRow[]>(
    allowsDemoDataFrom(this.pro) ? buildGlobalDemoCommits() : [],
  )
  readonly logsOpen = signal(false)
  readonly logsText = signal('')
  readonly logsTitle = signal('')

  /** Reactivo al cambiar /repositories/:section — evita mostrar siempre la misma pestaña */
  readonly section = toSignal(
    this.route.paramMap.pipe(
      map((p) => (p.get('section') ?? 'webhooks') as RepositoriesSectionId),
    ),
    {
      initialValue: (this.route.snapshot.paramMap.get('section') ?? 'webhooks') as RepositoriesSectionId,
    },
  )

  readonly headerMeta = computed(() => {
    const s = this.section()
    return REPOSITORIES_SECTION_META[s] ?? REPOSITORIES_SECTION_META.webhooks
  })

  readonly sectionIcon = computed((): string => {
    const icons: Partial<Record<RepositoriesSectionId, string>> = {
      webhooks: 'webhook',
      branches: 'account_tree',
      commits: 'history_edu',
      'pull-requests': 'merge',
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
      deployments: 'Cargando despliegues…',
    }
    return m[this.section()] ?? 'Cargando…'
  })

  ngOnInit(): void {
    if (GLOBAL_SECTIONS.includes(this.section())) this.init()
  }

  init = (): void => {
    this.page.run(of({ ok: true }), {
      onSuccess: () => undefined,
      fallback: () => ({ ok: true }),
      errorMessage: 'Error al cargar',
    })
    this.reloadTables()
  }

  reloadTables = (): void => {
    const allowDemo = allowsDemoDataFrom(this.pro)
    this.github
      .webhooks()
      .pipe(catchError(() => of({ items: [] as Record<string, unknown>[] })))
      .subscribe((w) => {
        const gh = w.items.length ? w.items : allowDemo ? CLIENT_DEMO_WEBHOOKS : []
        const gl = allowDemo ? CLIENT_DEMO_GITLAB_WEBHOOKS : []
        this.allWebhooks.set([...gh, ...gl])
      })
    this.github
      .deployments()
      .pipe(catchError(() => of({ items: [] as Record<string, unknown>[] })))
      .subscribe((d) => {
        const gh = d.items.length ? d.items : allowDemo ? CLIENT_DEMO_DEPLOYMENTS : []
        const gl = allowDemo ? CLIENT_DEMO_GITLAB_DEPLOYMENTS : []
        this.allDeployments.set([...gh, ...gl])
      })
  }

  deployLatestCommit = (): void => {
    const c = this.globalCommits().find((x) => x.deployStatus === 'pending') ?? this.globalCommits()[0]
    if (c) this.actions.deployCommit(c)
  }

  viewLogs = (row: Record<string, unknown>): void => {
    const id = String(row['id'] ?? '')
    this.logsTitle.set(String(row['repoFullName'] ?? row['projectPath'] ?? 'Despliegue'))
    this.github.deploymentLogs(id).subscribe({
      next: (r) => {
        this.logsText.set(r.logs)
        this.logsOpen.set(true)
      },
      error: () => {
        this.logsText.set(
          `[Deploy] ${row['repoFullName'] ?? row['projectPath']}\n` +
            `[${new Date().toISOString()}] INFO  checkout ${row['branch']}\n` +
            `[${new Date().toISOString()}] INFO  build OK · ${row['commitSha'] ?? 'a1b2c3d'}\n` +
            `[${new Date().toISOString()}] INFO  deploy → ${row['targetName']} (${row['targetType']})\n` +
            `[${new Date().toISOString()}] INFO  status=${row['status']}`,
        )
        this.logsOpen.set(true)
      },
    })
  }

  handleHeader = (label: string): void => {
    if (label.includes('Crear webhook')) return this.actions.createWebhook()
    if (label.includes('Probar webhook')) return this.actions.testWebhook()
    if (label.includes('Sincronizar ramas')) return this.actions.syncBranches()
    if (label.includes('Comparar ramas')) return this.actions.compareBranches(this.globalBranches()[0])
    if (label.includes('Actualizar')) return this.actions.refreshCommits()
    if (label.includes('Desplegar commit')) return this.deployLatestCommit()
    if (label.includes('Abrir en GitHub')) {
      const pr = this.githubPullRequests()[0]
      if (pr) return this.actions.openPrGithub(pr)
    }
    if (label.includes('Desplegar preview')) {
      const pr = this.githubPullRequests().find((p) => p['state'] === 'open')
      if (pr) return this.actions.deployPrPreview(pr)
    }
    if (label.includes('Nuevo despliegue')) return this.actions.newDeploy()
    if (label.includes('Ver historial')) return this.actions.deployHistory()
  }
}
