import { Component, inject, OnDestroy, OnInit, signal, computed } from '@angular/core'
import { FormControl } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatDialog } from '@angular/material/dialog'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { GitlabService } from '../../core/services/gitlab.service'
import type { GitlabAccount, GitlabGroup, GitlabProject } from './utils/gitlab.types'
import { GitlabProjectDetailDrawerComponent } from './components/gitlab-project-detail-drawer.component'
import { GitlabSectionComponent } from './sections/gitlab-section.component'
import { GitlabDeployDialogComponent } from './components/gitlab-deploy-dialog.component'
import { IntegrationConnectionService } from '../../core/services/integration-connection.service'
import { ToastService } from '../../core/services/toast.service'
import { GithubLogsPanelComponent } from './components/github-logs-panel.component'
import { GITLAB_NAV_LINKS, REPOSITORIES_SECTION_META } from './repositories-section.config'
import { RepositoriesActionService } from './repositories-action.service'
import { RepositoriesCrossNavComponent } from './components/repositories-cross-nav.component'
import { LiveRepoSyncService } from '../../core/services/live-repo-sync.service'

@Component({
  selector: 'app-gitlab-repositories-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    LoadingStateComponent,
    MatButtonModule,
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

      <app-repositories-cross-nav activeId="gitlab" [links]="gitlabNavLinks" />

      @if (loading()) {
        <app-loading-state message="Cargando GitLab…" />
      } @else if (!account()) {
        <div class="repo-empty" style="padding:2rem;text-align:center">
          <p>No hay cuenta GitLab conectada.</p>
          <button mat-flat-button class="gitlab-primary" type="button" (click)="openAddAccount()">
            Conectar GitLab
          </button>
          <p style="margin-top:1rem;color:var(--app-text-muted);font-size:0.85rem">
            Usa un Personal Access Token (scopes: read_api, read_repository) o OAuth si está configurado en el servidor.
          </p>
        </div>
      } @else {
        <app-gitlab-section
          [projects]="projects()"
          [groups]="groups()"
          [account]="account()"
          [demoMode]="false"
          [syncStatus]="syncStatus()"
          [projectControl]="projectControl"
          (addAccount)="openAddAccount()"
          (connectDemo)="openAddAccount()"
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
export class GitlabRepositoriesPageComponent implements OnInit, OnDestroy {

  private readonly gitlab = inject(GitlabService)
  private readonly dialog = inject(MatDialog)
  private readonly toast = inject(ToastService)
  private readonly connections = inject(IntegrationConnectionService)
  private readonly liveSync = inject(LiveRepoSyncService)
  readonly repoActions = inject(RepositoriesActionService)

  readonly meta = REPOSITORIES_SECTION_META.gitlab
  readonly gitlabNavLinks = GITLAB_NAV_LINKS
  readonly projectControl = new FormControl<string>('', { nonNullable: true })
  readonly loading = signal(false)
  readonly account = signal<GitlabAccount | null>(null)
  readonly projects = signal<GitlabProject[]>([])
  readonly groups = signal<GitlabGroup[]>([])
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
    this.loadPro()
    this.liveSync.startLive(() => this.loadPro(), 'gitlab', 20000)
  }

  ngOnDestroy(): void {
    this.liveSync.stopLive()
  }

  private loadPro = (): void => {
    this.loading.set(true)
    this.gitlab.accounts().subscribe({
      next: (res) => {
        const items = Array.isArray(res.items) ? res.items : []
        const acc = items.find((a) => a.status === 'connected') ?? items[0] ?? null
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

  validate = (): void => {
    const id = this.account()?.id
    if (!id) return
    this.gitlab.validateAccount(id).subscribe({
      next: (r) => this.toast.success(r.message),
    })
  }

  syncProjects = (): void => {
    const acc = this.account()
    if (!acc?.id) {
      this.toast.error('Conecta una cuenta GitLab primero')
      this.openAddAccount()
      return
    }
    this.toast.info('Sincronizando proyectos GitLab…')
    this.gitlab.syncAccount(acc.id).subscribe({
      next: (r) => {
        if (r.projects?.length) this.projects.set(r.projects)
        this.account.update((a) => (a ? { ...a, lastSyncAt: r.lastSyncAt, repoCount: r.synced } : a))
        this.toast.success(r.message)
      },
      error: () => this.toast.error('No se pudo sincronizar GitLab'),
    })
  }

  openAddAccount = (): void => {
    this.connections.openGitlab().subscribe()
  }

  openDrawer = (project: GitlabProject): void => {
    this.drawerProject.set(project)
    this.drawerWebhooks.set([])
    this.drawerOpen.set(true)
  }

  closeDrawer = (): void => {
    this.drawerOpen.set(false)
    this.drawerProject.set(null)
    this.drawerWebhooks.set([])
  }

  openGitlabLogs = (): void => {
    this.logsTitle.set('Logs GitLab — plataforma')
    this.logsText.set('Sin registros disponibles.')
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
        this.logsText.set('Sin registros de despliegue disponibles.')
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
      this.toast.info('Iniciando pipeline GitLab…')
      this.gitlab.deployProject(project.id, {
        branch: result.branch,
        environment: result.environment,
        strategy: result.strategy,
        targetName: result.targetName,
        targetType: result.targetType,
        notes: result.description,
      }).subscribe({
        next: (res) => {
          this.toast.success(res.message)
          if (res.deployment?.['logs']) {
            this.logsTitle.set(project.fullPath)
            this.logsText.set(String(res.deployment['logs']))
            this.logsOpen.set(true)
          }
        },
        error: () => this.toast.error('No se pudo iniciar el despliegue GitLab'),
      })
    })
  }

  handleHeader = (label: string): void => {
    if (label.includes('Sincronizar')) this.syncProjects()
    else if (label.includes('Validar')) this.validate()
    else if (label.includes('Añadir')) this.openAddAccount()
    else this.toast.info(label)
  }
}
