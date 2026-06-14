import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { Component, inject, OnInit, signal, computed, DestroyRef } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { bindSectionTabs } from '../../core/routing/section-tab.util'
import { FormControl } from '@angular/forms'
import { MatDialog } from '@angular/material/dialog'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { JenkinsOverviewComponent } from './jenkins-overview.component'
import { JenkinsSidebarComponent } from './jenkins-sidebar.component'
import { JenkinsJobWorkspaceComponent } from './jenkins-job-workspace.component'
import {
  JenkinsLaunchDetailDialogComponent,
  JenkinsLaunchDialogComponent,
  type JenkinsLaunchDetailData,
} from './jenkins-launch-dialog.component'
import { launchDetailKey } from './jenkins-launch-detail-panel.component'
import { InventoryService } from '../../core/services/inventory.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import {
  JenkinsCreateJobDialogComponent,
} from './jenkins-create-job-dialog.component'
import { JenkinsConnectDialogComponent } from './jenkins-connect-dialog.component'
import { JenkinsService } from '../../core/services/jenkins.service'
import { ToastService } from '../../core/services/toast.service'
import { jobToRow, normalizeJenkinsInventory } from './jenkins.util'
import { ProModeService } from '../../core/services/pro-mode.service'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
import { ConnectionRequiredComponent } from '../../shared/components/connection-required/connection-required.component'
import type { JenkinsBuild, JenkinsInventory, JenkinsJob } from './jenkins.models'
import { jenkinsSectionToTab } from './jenkins.models'

@Component({
  selector: 'app-jenkins-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    JenkinsOverviewComponent,
    JenkinsSidebarComponent,
    JenkinsJobWorkspaceComponent,
    ConnectionRequiredComponent,
  ],
  template: `
    <div class="page-container jenkins-page">
      <app-page-header
        title="Jenkins"
        description="Automatización CI/CD — controladores, pipelines, cola de builds y agentes"
        [actions]="[
          { label: 'Crear job', icon: 'playlist_add', primary: true },
          { label: 'Añadir controlador', icon: 'dns' },
          { label: 'Validar conexión', icon: 'verified' },
          { label: 'Sincronizar jobs', icon: 'sync' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      @if (page.loading()) {
        <app-loading-state />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else if (requiresJenkinsConfig()) {
        <app-connection-required moduleId="jenkins" />
      } @else if (inventory()) {
        @let inv = inventory()!;
        <app-jenkins-overview
          [inventory]="inv"
          [executorPercent]="executorPercent()"
          (buildSelect)="handleOverviewBuild($event)"
          (jobSelect)="handleJobSelect($event)"
        />

        <div class="jenkins-workspace-layout">
          <app-jenkins-sidebar
            [inventory]="inv"
            [filteredJobs]="filteredJobs()"
            [selectedServerId]="selectedServerId()"
            [selectedJobName]="selectedJob()?.name ?? ''"
            (serverSelect)="handleServerSelect($event)"
            (jobSelect)="handleJobSelect($event)"
            (searchChange)="searchControl.setValue($event)"
            (createJob)="openCreateJobDialog()"
          />
          <main class="jenkins-workspace-main">
            <app-jenkins-job-workspace
              [job]="selectedJob()"
              [inventory]="inv"
              [agents]="inv.agents"
              [workspaceTab]="workspaceTab()"
              [selectedBuild]="selectedBuild()"
              [jobLaunches]="launchesForSelectedJob()"
              [jobLaunch]="launchForSelectedJob()"
              [consoleLog]="consoleLog()"
              (buildNow)="launchJob($event)"
              (action)="handleJobAction($event)"
              (workspaceTabChange)="workspaceTab.set($event)"
              (buildSelect)="handleBuildSelect($event)"
              (openLaunchDetail)="openLaunchDetailDialog($event)"
            />
          </main>
        </div>

      }
    </div>
  `,
  styles: `
    .jenkins-workspace-layout {
      display: grid;
      grid-template-columns: minmax(260px, 300px) 1fr;
      gap: 1rem;
      min-height: 560px;
      align-items: stretch;
    }
    @media (max-width: 1024px) {
      .jenkins-workspace-layout { grid-template-columns: 1fr; }
    }
    .jenkins-workspace-main {
      min-width: 0;
      border-radius: var(--app-radius-lg);
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      overflow: hidden;
    }
  `,
})
export class JenkinsPageComponent implements OnInit {
  private readonly actions = inject(PlatformActionService)

  private readonly inventorySvc = inject(InventoryService)
  private readonly jenkinsApi = inject(JenkinsService)
  private readonly toast = inject(ToastService)
  private readonly pro = inject(ProModeService)
  private readonly dialog = inject(MatDialog)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)

  readonly page = createPageLoader(true)
  readonly inventory = signal<JenkinsInventory | null>(null)
  readonly selectedServerId = signal('all')
  readonly selectedJob = signal<JenkinsJob | null>(null)
  readonly selectedBuild = signal<JenkinsBuild | null>(null)
  readonly workspaceTab = signal(0)
  readonly launchHistory = signal<JenkinsLaunchDetailData[]>([])
  readonly activeLaunchKey = signal<string | null>(null)
  readonly searchControl = new FormControl('', { nonNullable: true })

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )

  readonly launchesForSelectedJob = computed(() => {
    const job = this.selectedJob()
    if (!job) return []
    return this.launchHistory().filter((l) => l.jobName === job.name)
  })

  readonly launchForSelectedJob = computed(() => {
    const launches = this.launchesForSelectedJob()
    if (launches.length === 0) return null
    const key = this.activeLaunchKey()
    if (key) {
      const match = launches.find((l) => launchDetailKey(l) === key)
      if (match) return match
    }
    return launches[0]
  })

  readonly filteredJobs = computed(() => {
    const inv = this.inventory()
    if (!inv) return []
    const term = (this.searchTerm() ?? '').toLowerCase()
    const server = this.selectedServerId()
    return inv.jobItems.filter((j) => {
      const matchServer = server === 'all' || j.serverId === server
      const matchTerm =
        !term ||
        j.name.toLowerCase().includes(term) ||
        j.folder.toLowerCase().includes(term) ||
        j.server.toLowerCase().includes(term)
      return matchServer && matchTerm
    })
  })

  readonly consoleLog = computed(() => {
    const job = this.selectedJob()
    const inv = this.inventory()
    if (!job || !inv) return ''
    return inv.logsByJob[job.name] ?? ''
  })

  ngOnInit(): void {
    bindSectionTabs(this.route, this.destroyRef, this.workspaceTab, 'jenkins', jenkinsSectionToTab)
    this.load()
  }

  executorPercent = (): number => {
    const inv = this.inventory()
    if (!inv || inv.executorTotal === 0) return 0
    return Math.round((inv.executorBusy / inv.executorTotal) * 100)
  }

  handleOverviewBuild = (build: JenkinsBuild): void => {
    const job = this.inventory()?.jobItems.find((j) => j.name === build.jobName)
    if (job) this.handleJobSelect(job)
    this.selectedBuild.set(build)
    this.workspaceTab.set(1)
  }

  requiresJenkinsConfig = (): boolean => {
    const inv = this.inventory()
    if (!this.pro.proMode() || !inv) return false
    return inv.serverCount === 0 && inv.servers.length === 0
  }

  load = (): void => {
    this.page.run(this.inventorySvc.jenkins(), {
      onSuccess: (d) => {
        const inv = normalizeJenkinsInventory(d)
        this.inventory.set(inv)
        const jobs = inv.jobItems
        if (jobs.length > 0 && !this.selectedJob()) {
          const pick = jobs.find((j) => j.status === 'RUNNING') ?? jobs[0]
          this.selectedJob.set(pick)
          const build = inv.builds.find((b) => b.jobName === pick.name)
          if (build) this.selectedBuild.set(build)
        }
      },
      errorMessage: 'No se pudo cargar Jenkins',
    })
  }

  private pushLaunch = (detail: JenkinsLaunchDetailData): void => {
    const key = launchDetailKey(detail)
    const rest = this.launchHistory().filter((l) => launchDetailKey(l) !== key)
    this.launchHistory.set([detail, ...rest])
    this.activeLaunchKey.set(key)
  }

  handleServerSelect = (id: string): void => {
    this.selectedServerId.set(id)
  }

  handleJobSelect = (job: JenkinsJob): void => {
    this.selectedJob.set(job)
    const build = this.inventory()?.builds.find((b) => b.jobName === job.name)
    this.selectedBuild.set(build ?? null)
    this.workspaceTab.set(0)
    const launch = this.launchHistory().find((l) => l.jobName === job.name)
    this.activeLaunchKey.set(launch ? launchDetailKey(launch) : null)
  }

  handleBuildSelect = (build: JenkinsBuild): void => {
    this.selectedBuild.set(build)
    this.workspaceTab.set(2)
  }

  openConnectDialog = (): void => {
    this.dialog
      .open(JenkinsConnectDialogComponent, {
        width: 'min(480px, 94vw)',
        maxWidth: '94vw',
        panelClass: 'jenkins-connect-dialog-panel',
      })
      .afterClosed()
      .subscribe((server) => {
        if (!server) return
        this.load()
      })
  }

  validateFirstServer = (): void => {
    this.jenkinsApi.listServers().subscribe({
      next: (servers) => {
        const server = servers[0]
        if (!server) {
          this.toast.info('Añade un controlador Jenkins primero')
          this.openConnectDialog()
          return
        }
        this.jenkinsApi.validate(server.id).subscribe({
          next: (res) => {
            const msg = (res as { message?: string })?.message ?? 'Conexión OK'
            this.toast.success(msg)
            this.load()
          },
          error: () => this.toast.error('No se pudo validar la conexión'),
        })
      },
      error: () => this.toast.error('No se pudieron listar controladores'),
    })
  }

  openCreateJobDialog = (): void => {
    const inv = this.inventory()
    if (!inv) return
    this.dialog
      .open(JenkinsCreateJobDialogComponent, {
        width: '980px',
        maxWidth: '98vw',
        maxHeight: '94vh',
        data: { servers: inv.servers, folders: inv.folders },
      })
      .afterClosed()
      .subscribe((job) => {
        if (!job) return
        const logs = { ...inv.logsByJob, [job.name]: `[Pipeline] Job creado — ${job.name}\n` }
        const servers = inv.servers.map((s) =>
          s.id === job.serverId ? { ...s, jobs: s.jobs + 1 } : s,
        )
        this.inventory.set({
          ...inv,
          jobItems: [...inv.jobItems, job],
          jobCount: inv.jobItems.length + 1,
          servers,
          logsByJob: logs,
        })
        this.selectedJob.set(job)
        this.selectedServerId.set(job.serverId)
        this.toast.success(`Job ${job.name} añadido al workspace`)
      })
  }

  handleHeader = (label: string): void => {
    if (label === 'Crear job') {
      this.openCreateJobDialog()
      return
    }
    if (label === 'Añadir controlador') {
      this.openConnectDialog()
      return
    }
    if (label === 'Validar conexión') {
      this.validateFirstServer()
      return
    }
    this.load()
  }

  launchJob = (job: JenkinsJob): void => {
    const row = jobToRow(job)
    this.dialog
      .open(JenkinsLaunchDialogComponent, {
        width: '920px',
        maxWidth: '96vw',
        maxHeight: '94vh',
        data: { job: row },
      })
      .afterClosed()
      .subscribe((detail) => {
        if (!detail) return
        const inv = this.inventory()
        const launched = inv?.jobItems.find((j) => j.name === detail.jobName)
        if (!launched?.serverId) {
          this.toast.error('No se pudo resolver el controlador Jenkins del job')
          return
        }
        const parameters = Object.fromEntries(
          detail.parameters.map((p: { key: string; value: string }) => [p.key, p.value === '—' ? '' : p.value]),
        )
        this.jenkinsApi.triggerBuild(launched.serverId, detail.jobName, parameters).subscribe({
          next: (res) => {
            const liveDetail = {
              ...detail,
              buildNum: res.build.number,
              status: res.build.status,
              buildUrl: String((res.build as { queueUrl?: string }).queueUrl ?? detail.buildUrl),
            }
            this.selectedJob.set(launched)
            this.selectedBuild.set({
              jobName: liveDetail.jobName,
              buildNum: liveDetail.buildNum,
              status: liveDetail.status,
              createdAt: liveDetail.startedAt,
              duration: '—',
              branch: liveDetail.params.branch,
              triggeredBy: liveDetail.triggeredBy,
            })
            this.pushLaunch(liveDetail)
            this.registerLaunchBuild(liveDetail)
            this.openLaunchDetailDialog(liveDetail)
            this.toast.success(`Jenkins aceptó ${liveDetail.jobName} #${liveDetail.buildNum}`)
          },
          error: (err) => this.toast.error(err?.error?.message ?? 'Jenkins no pudo encolar el despliegue'),
        })
      })
  }

  private registerLaunchBuild = (detail: JenkinsLaunchDetailData): void => {
    const inv = this.inventory()
    if (!inv) return
    const build: JenkinsBuild = {
      jobName: detail.jobName,
      buildNum: detail.buildNum,
      status: detail.status,
      createdAt: detail.startedAt,
      duration: '—',
      branch: detail.params.branch,
      triggeredBy: detail.triggeredBy,
      commit: 'nuevo',
    }
    this.inventory.set({
      ...inv,
      builds: [build, ...inv.builds],
      buildsRunning: inv.buildsRunning + 1,
      queueSize: inv.queueSize + 1,
    })
  }

  handleJobAction = (ev: { job: JenkinsJob; type: 'poll' | 'stop' | 'replay' }): void => {
    const labels = { poll: 'Poll SCM', stop: 'Detener build', replay: 'Replay' }
    this.actions.simulate(`${labels[ev.type]} — ${ev.job.name}`, 800).subscribe()
  }

  openLaunchDetailDialog = (detail?: JenkinsLaunchDetailData): void => {
    const data = detail ?? this.launchForSelectedJob()
    if (!data) return
    this.activeLaunchKey.set(launchDetailKey(data))
    this.dialog.open(JenkinsLaunchDetailDialogComponent, {
      width: '940px',
      maxWidth: '98vw',
      maxHeight: '94vh',
      panelClass: 'jenkins-launch-detail-dialog-panel',
      data,
    })
  }
}
