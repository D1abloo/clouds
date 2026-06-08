import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl } from '@angular/forms'
import { MatDialog } from '@angular/material/dialog'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { GitlabService } from '../../core/services/gitlab.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
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
import { IntegrationConnectionService } from '../../core/services/integration-connection.service'
import { GithubLogsPanelComponent } from './components/github-logs-panel.component'
import { REPOSITORIES_SECTION_META } from './repositories-section.config'
import { RepositoriesActionService } from './repositories-action.service'
import { RepositoriesCrossNavComponent } from './components/repositories-cross-nav.component'

@Component({
  selector: 'app-gitlab-repositories-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    LoadingStateComponent,
    GitlabProjectDetailDrawerComponent,
    GitlabSectionComponent,
    GithubLogsPanelComponent,
    RepositoriesCrossNavComponent,
  ],
  template: `
    <div class="page-container page-container--gitlab repo-module-page">
      <app-page-header
        [title]="meta.title"
        [description]="meta.description"
        [actions]="meta.headerActions"
        (actionClick)="handleHeader($event)"
      />

      <app-repositories-cross-nav activeId="gitlab" />

      @if (loading()) {
        <app-loading-state message="Cargando GitLab…" />
      } @else {
        <app-gitlab-section
          [projects]="projects()"
          [groups]="groups()"
          [account]="account()"
          [demoMode]="demoMode()"
          [syncStatus]="syncStatus()"
          [projectControl]="projectControl"
          (addAccount)="openAddAccount()"
          (connectDemo)="connectDemo()"
          (validate)="validate()"
          (sync)="syncProjects()"
          (openDetail)="openDrawer($event)"
          (deploy)="openDeploy($event)"
          (openExternal)="repoActions.openGitlab($event)"
          (viewMrs)="repoActions.viewGitlabMrs()"
          (viewPipelines)="repoActions.viewGitlabPipelines()"
          (createWebhook)="repoActions.createWebhook()"
          (viewLogs)="openGitlabLogs()"
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
      (openExternal)="repoActions.openGitlab($event)"
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
  private readonly pro = inject(ProModeService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)
  private readonly connections = inject(IntegrationConnectionService)
  readonly repoActions = inject(RepositoriesActionService)

  readonly meta = REPOSITORIES_SECTION_META.gitlab
  readonly projectControl = new FormControl<string>('', { nonNullable: true })
  readonly loading = signal(false)
  readonly account = signal<GitlabAccount | null>(null)
  readonly projects = signal<GitlabProject[]>([])
  readonly groups = signal<GitlabGroup[]>([])
  readonly demoMode = signal(allowsDemoDataFrom(this.pro))
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
    if (allowsDemoDataFrom(this.pro)) {
      this.connectDemo()
      return
    }
    this.loadPro()
  }

  private loadPro = (): void => {
    this.loading.set(true)
    this.gitlab.account().subscribe({
      next: (acc) => {
        this.account.set(acc)
        this.loading.set(false)
      },
      error: () => this.loading.set(false),
    })
    this.gitlab.projects().subscribe({
      next: (res) => {
        this.projects.set(res.items ?? [])
        if (res.items?.[0]) this.projectControl.setValue(res.items[0].id)
      },
    })
  }

  connectDemo = (): void => {
    this.loading.set(true)
    this.gitlab.connectDemo().subscribe({
      next: (state) => {
        this.account.set(state.account)
        this.projects.set(state.projects)
        this.groups.set(state.groups)
        if (state.projects[0]) this.projectControl.setValue(state.projects[0].id)
        this.demoMode.set(true)
        this.loading.set(false)
      },
      error: () => {
        if (!allowsDemoDataFrom(this.pro)) {
          this.loading.set(false)
          return
        }
        const boot = buildGitlabDemoBootstrap()
        this.account.set(boot.account)
        this.projects.set(boot.projects)
        this.groups.set(boot.groups)
        if (boot.projects[0]) this.projectControl.setValue(boot.projects[0].id)
        this.loading.set(false)
      },
    })
  }

  validate = (): void => {
    const id = this.account()?.id
    if (!id) return
    this.gitlab.validateAccount(id).subscribe({
      next: (r) => this.runDemo('Validación GitLab', r.message),
    })
  }

  syncProjects = (): void => {
    this.gitlab.syncProjects().subscribe({
      next: (r) => {
        if (r.projects?.length) this.projects.set(r.projects)
        this.account.update((a) => (a ? { ...a, lastSyncAt: r.lastSyncAt } : a))
        this.runDemo('Sincronización GitLab', r.message)
      },
    })
  }

  openAddAccount = (): void => {
    this.connections.openGitlab().subscribe()
  }

  openDrawer = (project: GitlabProject): void => {
    this.drawerProject.set(project)
    this.drawerWebhooks.set(
      allowsDemoDataFrom(this.pro)
        ? CLIENT_DEMO_GITLAB_WEBHOOKS.filter((w) => w['projectPath'] === project.fullPath)
        : [],
    )
    this.drawerOpen.set(true)
  }

  closeDrawer = (): void => {
    this.drawerOpen.set(false)
    this.drawerProject.set(null)
    this.drawerWebhooks.set([])
  }

  openGitlabLogs = (): void => {
    this.logsTitle.set('Logs GitLab — plataforma')
    this.logsText.set(
      `[GitLab] ${new Date().toISOString()} sync proyectos OK\n` +
        '[GitLab] pipeline cloudops-platform/gitlab-payment-service #1842 success\n' +
        '[GitLab] runner shared-runner-01 online · tags docker,linux\n' +
        '[GitLab] MR !42 opened · feat: idempotencia en cobros\n' +
        '[GitLab] environment production actualizado',
    )
    this.logsOpen.set(true)
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
      width: '920px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      data: { project },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result) return
      const summary = [
        result.projectPath,
        `${result.refType}:${result.branch}`,
        result.environment,
        result.strategy,
        result.targetName,
      ].join(' · ')
      this.runDemo('Despliegue GitLab', summary)
      this.gitlab.deploymentLogs('gl-dep-demo').subscribe({
        next: (r) => {
          this.logsText.set(r.logs)
          this.logsTitle.set(`${project.fullPath} → ${result.environment}`)
          this.logsOpen.set(true)
        },
      })
    })
  }

  handleHeader = (label: string): void => {
    if (label.includes('Conectar demo')) this.connectDemo()
    else if (label.includes('Sincronizar')) this.syncProjects()
    else if (label.includes('Validar')) this.validate()
    else if (label.includes('Añadir')) this.openAddAccount()
    else this.runDemo(label)
  }

  runDemo = (label: string, msg?: string): void => {
    this.demoActions.simulate(label, 450, msg ?? `${label} (demo)`).subscribe()
  }
}
