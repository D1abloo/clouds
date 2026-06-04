import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { GitlabService } from '../../core/services/gitlab.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import {
  buildGitlabDemoBootstrap,
  CLIENT_DEMO_GITLAB_MRS,
  CLIENT_DEMO_GITLAB_WEBHOOKS,
  type GitlabAccount,
  type GitlabGroup,
  type GitlabProject,
} from './utils/gitlab-demo-catalog'
import { GitlabProjectDetailDrawerComponent } from './components/gitlab-project-detail-drawer.component'
import { GitlabSectionComponent } from './sections/gitlab-section.component'
import { GitlabDeployDialogComponent } from './components/gitlab-deploy-dialog.component'
import { GithubLogsPanelComponent } from './components/github-logs-panel.component'
import { REPOSITORIES_SECTION_META } from './repositories-section.config'

@Component({
  selector: 'app-gitlab-repositories-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    SummaryCardComponent,
    LoadingStateComponent,
    GitlabProjectDetailDrawerComponent,
    GitlabSectionComponent,
    GithubLogsPanelComponent,
  ],
  template: `
    <div class="page-container page-container--gitlab">
      <app-page-header
        [title]="meta.title"
        [description]="meta.description"
        [actions]="meta.headerActions"
        (actionClick)="handleHeader($event)"
      />

      @if (loading()) {
        <app-loading-state message="Cargando GitLab…" />
      } @else {
        <div class="summary-grid app-section-panel stagger-children">
          @for (card of meta.summaryCards; track card.title) {
            <app-summary-card [title]="card.title" [value]="metric(card.valueKey)" [icon]="card.icon" variant="elevated" />
          }
        </div>

        <app-gitlab-section
          [projects]="projects()"
          [groups]="groups()"
          [account]="account()"
          [demoMode]="demoMode()"
          [syncStatus]="syncStatus()"
          (addAccount)="runDemo('Añadir cuenta GitLab')"
          (connectDemo)="connectDemo()"
          (validate)="validate()"
          (sync)="syncProjects()"
          (openDetail)="openDrawer($event)"
          (deploy)="openDeploy($event)"
          (openExternal)="runDemo('Abrir en GitLab')"
          (viewMrs)="runDemo('Ver merge requests')"
          (viewPipelines)="runDemo('Ver pipelines')"
          (createWebhook)="runDemo('Crear webhook GitLab')"
        />
      }
    </div>

    <app-gitlab-project-detail-drawer
      [open]="drawerOpen()"
      [project]="drawerProject()"
      [webhooks]="drawerWebhooks()"
      [lastSyncAt]="account()?.lastSyncAt ?? null"
      (close)="closeDrawer()"
      (sync)="syncProjects()"
      (deploy)="openDeploy($event)"
      (viewDeploymentLogs)="viewDeploymentLogs($event)"
    />

    <app-github-logs-panel
      [open]="logsOpen()"
      [logs]="logsText()"
      [title]="logsTitle()"
      (close)="logsOpen.set(false)"
    />
  `,
})
export class GitlabRepositoriesPageComponent implements OnInit {
  private readonly gitlab = inject(GitlabService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)

  readonly meta = REPOSITORIES_SECTION_META.gitlab
  readonly loading = signal(false)
  readonly account = signal<GitlabAccount | null>(null)
  readonly projects = signal<GitlabProject[]>([])
  readonly groups = signal<GitlabGroup[]>([])
  readonly demoMode = signal(true)
  readonly drawerOpen = signal(false)
  readonly drawerProject = signal<GitlabProject | null>(null)
  readonly drawerWebhooks = signal<Record<string, unknown>[]>([])
  readonly logsOpen = signal(false)
  readonly logsText = signal('')
  readonly logsTitle = signal('Logs GitLab')

  readonly syncStatus = computed((): 'connected' | 'disconnected' =>
    this.account()?.status === 'connected' ? 'connected' : 'disconnected',
  )

  ngOnInit(): void {
    this.connectDemo()
  }

  metric = (key: string): number => {
    const map: Record<string, number> = {
      gitlabProjectCount: this.projects().length,
      gitlabPipelineCount: 4,
      gitlabOpenMrs: CLIENT_DEMO_GITLAB_MRS.filter((m) => m['state'] === 'opened').length,
      gitlabRunnerCount: 3,
    }
    return map[key] ?? 0
  }

  connectDemo = (): void => {
    this.loading.set(true)
    this.gitlab.connectDemo().subscribe({
      next: (state) => {
        this.account.set(state.account)
        this.projects.set(state.projects)
        this.groups.set(state.groups)
        this.demoMode.set(true)
        this.loading.set(false)
      },
      error: () => {
        const boot = buildGitlabDemoBootstrap()
        this.account.set(boot.account)
        this.projects.set(boot.projects)
        this.groups.set(boot.groups)
        this.loading.set(false)
      },
    })
  }

  validate = (): void => {
    this.gitlab.validateAccount().subscribe({
      next: (r) => this.runDemo('Validación GitLab', r.message),
    })
  }

  syncProjects = (): void => {
    this.gitlab.syncProjects().subscribe({
      next: (r) => {
        this.account.update((a) => (a ? { ...a, lastSyncAt: r.lastSyncAt } : a))
        this.runDemo('Sincronización GitLab', r.message)
      },
    })
  }

  openDrawer = (project: GitlabProject): void => {
    this.drawerProject.set(project)
    this.drawerWebhooks.set(
      CLIENT_DEMO_GITLAB_WEBHOOKS.filter((w) => w['projectPath'] === project.fullPath),
    )
    this.drawerOpen.set(true)
  }

  closeDrawer = (): void => {
    this.drawerOpen.set(false)
    this.drawerProject.set(null)
    this.drawerWebhooks.set([])
  }

  viewDeploymentLogs = (d: { id: string }): void => {
    this.logsTitle.set(this.drawerProject()?.fullPath ?? 'GitLab')
    this.gitlab.deploymentLogs(d.id).subscribe({
      next: (r) => {
        this.logsText.set(r.logs)
        this.logsOpen.set(true)
      },
      error: () => {
        this.logsText.set('[GitLab] Registros demo del despliegue\n[OK] Pipeline deploy\n[OK] Environment actualizado')
        this.logsOpen.set(true)
      },
    })
  }

  openDeploy = (project: GitlabProject): void => {
    const ref = this.dialog.open(GitlabDeployDialogComponent, {
      width: '440px',
      data: { projectPath: project.fullPath, defaultBranch: project.defaultBranch },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result) return
      this.runDemo(
        'Despliegue GitLab',
        `${project.name} → ${result.environment} @ ${result.targetType}`,
      )
      this.gitlab.deploymentLogs('gl-dep-demo').subscribe({
        next: (r) => {
          this.logsText.set(r.logs)
          this.logsTitle.set(project.fullPath)
          this.logsOpen.set(true)
        },
      })
    })
  }

  handleHeader = (label: string): void => {
    if (label.includes('Conectar demo')) this.connectDemo()
    else if (label.includes('Sincronizar')) this.syncProjects()
    else if (label.includes('Validar')) this.validate()
    else if (label.includes('Añadir')) this.runDemo(label)
    else this.runDemo(label)
  }

  runDemo = (label: string, msg?: string): void => {
    this.demoActions.simulate(label, 450, msg ?? `${label} (demo)`).subscribe()
  }
}
