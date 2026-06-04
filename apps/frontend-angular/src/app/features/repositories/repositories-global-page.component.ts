import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { GithubService } from '../../core/services/github.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
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
  buildRepositoriesSectionMetrics,
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
    SummaryCardComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    GithubLogsPanelComponent,
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
        <app-error-state [message]="page.error()!" (retry)="init()" />
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
              (newDeploy)="runDemo('Nuevo despliegue — elige GitHub o GitLab en su sección')"
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
  private readonly demoActions = inject(DemoActionsService)

  readonly page = createPageLoader(false)
  readonly githubPullRequests = signal(CLIENT_DEMO_GITHUB_PRS)
  readonly allWebhooks = signal([...CLIENT_DEMO_WEBHOOKS, ...CLIENT_DEMO_GITLAB_WEBHOOKS])
  readonly allDeployments = signal([...CLIENT_DEMO_DEPLOYMENTS, ...CLIENT_DEMO_GITLAB_DEPLOYMENTS])
  readonly globalBranches = signal<GlobalBranchRow[]>(buildGlobalDemoBranches())
  readonly globalCommits = signal<GlobalCommitRow[]>(buildGlobalDemoCommits())
  readonly logsOpen = signal(false)
  readonly logsText = signal('')
  readonly logsTitle = signal('')

  readonly section = computed(
    () => (this.route.snapshot.paramMap.get('section') ?? 'webhooks') as RepositoriesSectionId,
  )

  readonly headerMeta = computed(() => REPOSITORIES_SECTION_META[this.section()])

  readonly sectionMetrics = computed(() =>
    buildRepositoriesSectionMetrics({
      githubRepos: 6,
      githubWebhooks: CLIENT_DEMO_WEBHOOKS.length,
      gitlabWebhooks: CLIENT_DEMO_GITLAB_WEBHOOKS.length,
      deployments: this.allDeployments(),
    }),
  )

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
    if (!GLOBAL_SECTIONS.includes(this.section())) return
    this.init()
  }

  init = (): void => {
    this.page.run(of({ ok: true }), {
      onSuccess: () => undefined,
      fallback: () => ({ ok: true }),
      errorMessage: 'Error al cargar',
    })
    this.reloadTables()
  }

  metric = (key: string): number => this.sectionMetrics()[key] ?? 0

  reloadTables = (): void => {
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
        this.logsText.set('[Global] Registros demo del despliegue')
        this.logsOpen.set(true)
      },
    })
  }

  handleHeader = (label: string): void => this.runDemo(label)

  runDemo = (label: string, msg?: string): void => {
    this.demoActions.simulate(label, 450, msg ?? `${label} (demo)`).subscribe()
  }
}
