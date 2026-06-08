import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
  ElementRef,
  viewChild,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { MatDialog } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { debounceTime, startWith, concatMap, delay, EMPTY, from, of, switchMap, take, tap, map } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { TerraformService } from '../core/services/terraform.service'
import { TerraformRunStore, TerraformRunItem, TerraformWorkspaceItem } from '../core/stores/terraform-run.store'
import { CloudAccountsStore } from '../core/stores/cloud-accounts.store'
import { SettingsStore } from '../core/stores/settings.store'
import { RealtimeService } from '../core/services/realtime.service'
import { ToastService } from '../core/services/toast.service'
import { DemoActionsService } from '../core/services/demo-actions.service'
import { LaunchInstanceModalComponent } from '../shared/modals/launch-instance/launch-instance-modal.component'
import { TerraformOverviewComponent } from './terraform-overview.component'
import { TerraformWorkspaceHubComponent } from './terraform-workspace-hub.component'
import { TerraformRailPanelComponent } from './terraform-rail-panel.component'
import { TerraformInspectorPanelComponent } from './terraform-inspector-panel.component'
import { TerraformLaunchProgressComponent } from './terraform-launch-progress.component'
import {
  TerraformCreateProjectDialogComponent,
  type CreateProjectDialogData,
  type CreateProjectDialogResult,
} from './terraform-create-project-dialog.component'
import {
  PROJECT_ENV_PRESETS,
  buildStatePreview,
  defaultModulesForProvider,
} from './terraform-create-project.meta'
import {
  defaultTerraformAutomations,
  defaultTerraformDeployments,
  defaultTerraformProjects,
  findProjectByWorkspaceId,
  type TerraformAutomation,
  type TerraformDeploymentRecord,
  type TerraformHubTabId,
  type TerraformProject,
} from './terraform-projects'
import {
  BUILTIN_TEMPLATES,
  HCL_TEMPLATE_AWS,
  HCL_TEMPLATE_AZURE,
  HCL_TEMPLATE_GCP,
} from './terraform-hcl-templates'
import {
  defaultDemoWorkspaces,
  defaultDemoLaunches,
  demoRunsFromSummary,
  mergeTerraformSummary,
  mergeTerraformSummaryPro,
  TERRAFORM_DEMO_SUMMARY,
  TERRAFORM_FOLDERS,
  type TerraformPageSummary,
} from './terraform.demo'
import { ProModeService } from '../core/services/pro-mode.service'
import type { TerraformLaunchRecord } from './terraform-folders'
import {
  defaultTerraformLaunchDetails,
  launchRecordsFromDetails,
  type TerraformLaunchDetail,
  launchDetailFromRecord,
} from './terraform-launches.demo'
import { LoadingStateComponent } from '../shared/components/loading-state/loading-state.component'
import { RunDetailDrawerComponent } from '../features/terraform/components/run-detail-drawer.component'
import { CloudProvider } from '../core/models/api.models'

@Component({
  selector: 'app-terraform',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    LoadingStateComponent,
    TerraformOverviewComponent,
    TerraformWorkspaceHubComponent,
    TerraformRailPanelComponent,
    TerraformInspectorPanelComponent,
    TerraformLaunchProgressComponent,
    RunDetailDrawerComponent,
  ],
  templateUrl: './terraform.component.html',
  styleUrl: './terraform.component.scss',
})
export class TerraformComponent implements OnInit {
  private readonly terraform = inject(TerraformService)
  readonly runStore = inject(TerraformRunStore)
  private readonly cloudStore = inject(CloudAccountsStore)
  private readonly settingsStore = inject(SettingsStore)
  private readonly realtime = inject(RealtimeService)
  private readonly dialog = inject(MatDialog)
  private readonly toast = inject(ToastService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly route = inject(ActivatedRoute)
  private readonly pro = inject(ProModeService)

  readonly inspectorRef = viewChild<ElementRef<HTMLElement>>('inspectorPane')
  readonly builtinTemplates = BUILTIN_TEMPLATES

  readonly projects = signal<TerraformProject[]>(defaultTerraformProjects())
  readonly automations = signal<TerraformAutomation[]>(defaultTerraformAutomations())
  readonly deployments = signal<TerraformDeploymentRecord[]>(defaultTerraformDeployments())
  readonly activeProjectId = signal<string | null>('proj-api-gateway')
  readonly hubTab = signal<TerraformHubTabId>('launches')
  readonly launchDetails = signal<TerraformLaunchDetail[]>(defaultTerraformLaunchDetails())
  readonly selectedLaunchId = signal<string | null>('launch-4')

  readonly terminalHeight = signal(300)
  readonly destroyConfirm = signal('')
  readonly showDestroyConfirm = signal(false)
  readonly busy = signal(false)
  readonly loading = signal(true)
  readonly summary = signal<TerraformPageSummary>(TERRAFORM_DEMO_SUMMARY)
  readonly drawerOpen = signal(false)
  readonly selectedRun = signal<Record<string, unknown> | null>(null)
  readonly drawerPlan = signal('')
  readonly drawerLogs = signal('')

  readonly wsSearch = new FormControl('', { nonNullable: true })
  readonly expandedFolders = signal<Set<string>>(new Set(['apps', 'infra']))
  readonly folders = TERRAFORM_FOLDERS

  readonly wsSearchTerm = toSignal(
    this.wsSearch.valueChanges.pipe(debounceTime(150), startWith('')),
    { initialValue: '' },
  )

  readonly editorHcl = computed(() => this.runStore.activeWorkspace()?.hcl ?? '')
  readonly workspaceName = computed(() => this.runStore.activeWorkspace()?.name ?? 'Sin workspace')
  readonly hasPlan = this.runStore.hasPlan
  readonly planOutput = this.runStore.planOutput
  readonly terminalLines = this.runStore.terminalLines
  readonly activeWorkspace = this.runStore.activeWorkspace

  readonly activeProject = computed(() => {
    const id = this.activeProjectId()
    if (!id) return null
    return this.projects().find((p) => p.id === id) ?? null
  })

  readonly selectedLaunch = computed(() => {
    const id = this.selectedLaunchId()
    if (!id) return null
    return this.launchDetails().find((l) => l.id === id) ?? null
  })

  readonly projectAutomations = computed(() => {
    const proj = this.activeProject()
    if (!proj) return this.automations()
    return this.automations().filter((a) => a.projectId === proj.id)
  })

  readonly providerChips = computed(() => {
    const counts = this.cloudStore.countByProvider()
    return [
      { provider: 'AWS', connected: counts.AWS > 0, count: counts.AWS },
      { provider: 'GCP', connected: counts.GCP > 0, count: counts.GCP },
      { provider: 'Azure', connected: counts.AZURE > 0, count: counts.AZURE },
      { provider: 'Ansible', connected: this.settingsStore.ansibleConnected(), count: 1 },
    ]
  })

  readonly filteredWorkspaces = computed(() => this.runStore.workspaces())

  readonly planResources = computed(() => parsePlanResources(this.planOutput() ?? ''))

  readonly activeProviderConnected = computed(() => {
    const ws = this.runStore.activeWorkspace()
    if (!ws) return true
    const counts = this.cloudStore.countByProvider()
    return (counts[ws.provider as 'AWS' | 'GCP' | 'AZURE'] ?? 0) > 0
  })

  readonly actionsDisabled = computed(() => !this.activeProviderConnected() || this.busy())

  ngOnInit(): void {
    this.realtime.connect()
    this.cloudStore.load()
    this.loadPage()
    if (this.route.snapshot.data['openLaunch']) {
      setTimeout(() => this.openLaunch(), 300)
    }
  }

  loadPage = (): void => {
    this.loading.set(true)
    this.terraform.pageSummary().subscribe({
      next: (data) => {
        const merged = this.pro.proMode()
          ? mergeTerraformSummaryPro(data)
          : mergeTerraformSummary(data)
        this.summary.set(merged)
        this.hydrateFromSummary(merged)
        this.loading.set(false)
      },
      error: () => {
        if (this.pro.proMode()) {
          this.summary.set(mergeTerraformSummaryPro({}))
          this.loading.set(false)
          return
        }
        this.summary.set(TERRAFORM_DEMO_SUMMARY)
        this.hydrateFromSummary(TERRAFORM_DEMO_SUMMARY)
        this.loading.set(false)
      },
    })
  }

  private hydrateFromSummary = (merged: TerraformPageSummary): void => {
    const items = merged.items
    const wsRows = items.filter((w) => !w['createdAt'])
    const workspaces: TerraformWorkspaceItem[] = wsRows.length
      ? wsRows.map((w, i) => ({
          id: String(w['id'] ?? `ws-${i}`),
          name: String(w['name'] ?? w['workspaceName'] ?? `workspace-${i}`),
          folderId: String(w['folderId'] ?? inferFolderId(String(w['name'] ?? ''))),
          provider: (w['provider'] as CloudProvider) ?? 'AWS',
          hcl: this.hclForProvider((w['provider'] as CloudProvider) ?? 'AWS'),
          status: mapWorkspaceStatus(String(w['status'] ?? 'idle')),
        }))
      : defaultDemoWorkspaces()

    this.runStore.setWorkspaces(dedupeWorkspaces(workspaces))
    const launches = defaultTerraformLaunchDetails()
    this.launchDetails.set(launches)
    this.runStore.setLaunches(launchRecordsFromDetails(launches))
    if (!this.selectedLaunchId()) this.selectedLaunchId.set(launches[0]?.id ?? null)

    const activeProj = this.activeProject()
    if (activeProj) {
      const ids = activeProj.workspaceIds?.length
        ? activeProj.workspaceIds
        : [activeProj.workspaceId]
      const target = ids.find((wid) => workspaces.some((w) => w.id === wid)) ?? activeProj.workspaceId
      if (workspaces.some((w) => w.id === target)) this.runStore.selectWorkspace(target)
    }

    const runs = demoRunsFromSummary(items)
    if (runs.length) {
      this.runStore.setRuns(
        runs.map((r) => ({
          ...r,
          folderId: r.folderId ?? inferFolderId(r.workspaceName),
        })),
      )
    }
  }

  handleToggleFolder = (folderId: string): void => {
    this.expandedFolders.update((set) => {
      const next = new Set(set)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  handleLaunchFromTree = (launch: TerraformLaunchRecord): void => {
    this.selectedLaunchId.set(launch.id)
    this.setHubTab('launches')
    if (launch.workspaceId) this.selectWorkspace(launch.workspaceId)
  }

  handleLaunchSelect = (launchId: string): void => {
    this.selectedLaunchId.set(launchId)
    const launch = this.launchDetails().find((l) => l.id === launchId)
    if (launch?.workspaceId) this.selectWorkspace(launch.workspaceId)
  }

  focusInspector = (): void => {
    this.inspectorRef()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  providerLetter = (p: CloudProvider): string => {
    if (p === 'AWS') return 'A'
    if (p === 'GCP') return 'G'
    if (p === 'AZURE') return 'Z'
    return p.slice(0, 1)
  }

  workspaceStatusLabel = (status: TerraformWorkspaceItem['status']): string => {
    const labels: Record<TerraformWorkspaceItem['status'], string> = {
      idle: 'Inactivo',
      planning: 'Planificando',
      planned: 'Plan listo',
      applying: 'Aplicando',
      applied: 'Aplicado',
      error: 'Error',
    }
    return labels[status] ?? status
  }

  private hclForProvider = (p: CloudProvider): string => {
    if (p === 'GCP') return HCL_TEMPLATE_GCP
    if (p === 'AZURE') return HCL_TEMPLATE_AZURE
    return HCL_TEMPLATE_AWS
  }

  setHubTab = (tab: TerraformHubTabId): void => {
    this.hubTab.set(tab)
  }

  selectProject = (id: string): void => {
    this.activeProjectId.set(id)
    const proj = this.projects().find((p) => p.id === id)
    if (proj) {
      const ids = proj.workspaceIds.length ? proj.workspaceIds : [proj.workspaceId]
      const existing = this.runStore.workspaces()
      const target = ids.find((wid) => existing.some((w) => w.id === wid)) ?? proj.workspaceId
      this.selectWorkspace(target)
      this.setHubTab('project')
    }
  }

  selectWorkspace = (id: string): void => {
    this.runStore.selectWorkspace(id)
    const proj = findProjectByWorkspaceId(this.projects(), id)
    if (proj) this.activeProjectId.set(proj.id)
    this.runStore.clearTerminal()
    this.runStore.appendTerminal('cloudops-terraform $ terraform workspace select ' + this.workspaceName())
  }

  selectProjectEnvironment = (workspaceId: string): void => {
    this.selectWorkspace(workspaceId)
    this.setHubTab('deploy')
  }

  openCreateProject = (): void => {
    const dialogData: CreateProjectDialogData = { workspaces: this.runStore.workspaces() }
    this.dialog
      .open(TerraformCreateProjectDialogComponent, {
        width: 'min(1040px, 96vw)',
        maxWidth: '96vw',
        maxHeight: '95vh',
        panelClass: 'terraform-create-project-dialog-panel',
        autoFocus: true,
        data: dialogData,
      })
      .afterClosed()
      .subscribe((result: CreateProjectDialogResult | undefined) => {
        if (!result) return
        this.applyCreateProjectResult(result)
      })
  }

  private applyCreateProjectResult = (result: CreateProjectDialogResult): void => {
    const id = `proj-${Date.now()}`
    const slug = result.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const linkedWs = result.linkWorkspaceId
      ? this.runStore.workspaces().find((w) => w.id === result.linkWorkspaceId)
      : null
    const sourceHcl = linkedWs?.hcl ?? this.hclForProvider(result.provider)

    const envRows = result.environments.map((envId, index) => {
      const preset = PROJECT_ENV_PRESETS.find((e) => e.id === envId)
      const wsId =
        index === 0 && linkedWs
          ? linkedWs.id
          : `ws-${id}-${envId}`
      const wsName =
        index === 0 && linkedWs
          ? linkedWs.name
          : `${slug}-${preset?.workspaceSuffix ?? envId}`
      return {
        id: envId,
        label: preset?.label.toLowerCase() ?? envId,
        workspace: wsName,
        workspaceId: wsId,
        status: 'DRAFT',
      }
    })

    const workspaceIds = envRows.map((e) => e.workspaceId)
    const primaryWsId = envRows[0]?.workspaceId ?? `ws-${id}-dev`
    const complianceTag =
      result.complianceTier !== 'standard' ? result.complianceTier : null
    const tags = [...result.tags]
    if (complianceTag && !tags.includes(complianceTag)) tags.push(complianceTag)
    if (!tags.length) tags.push('nuevo')

    const newProj: TerraformProject = {
      id,
      name: result.name,
      folderId: result.folderId,
      workspaceId: primaryWsId,
      workspaceIds,
      description: result.description,
      providers: [result.provider],
      stateBackend: result.stateBackend,
      complianceTier: result.complianceTier,
      environments: envRows,
      modules: defaultModulesForProvider(result.provider),
      automationsCount: 0,
      deploymentsCount: 0,
      lastDeploy: new Date().toISOString(),
      savedAt: new Date().toISOString(),
      status: 'draft',
      tags: tags.length ? tags : ['nuevo'],
    }

    const existingIds = new Set(this.runStore.workspaces().map((w) => w.id))
    const newWorkspaces: TerraformWorkspaceItem[] = envRows
      .filter((env) => !existingIds.has(env.workspaceId))
      .map((env) => ({
        id: env.workspaceId,
        name: env.workspace,
        folderId: result.folderId,
        provider: result.provider,
        hcl: sourceHcl,
        status: 'idle' as const,
      }))

    if (result.createStarterAutomation) {
      const stagingEnv =
        envRows.find((e) => e.id === 'staging') ?? envRows.find((e) => e.id === 'stg') ?? envRows[0]
      const auto: TerraformAutomation = {
        id: `auto-${id}`,
        projectId: id,
        projectName: result.name,
        folderId: result.folderId,
        name: 'Plan nocturno (staging)',
        trigger: 'cron',
        schedule: '0 3 * * *',
        action: 'plan',
        environment: stagingEnv?.label ?? 'staging',
        enabled: true,
        lastRun: new Date().toISOString(),
        nextRun: 'Mañana 03:00',
        status: 'SUCCESS',
      }
      this.automations.update((list) => [...list, auto])
      newProj.automationsCount = 1
    }

    this.projects.update((list) => [...list, newProj])
    if (newWorkspaces.length) {
      this.runStore.setWorkspaces([...this.runStore.workspaces(), ...newWorkspaces])
    }
    this.activeProjectId.set(id)
    this.selectWorkspace(primaryWsId)
    this.expandedFolders.update((s) => new Set(s).add(result.folderId))
    this.setHubTab('project')

    const extras: string[] = []
    if (result.createStarterAutomation) extras.push('automatización')
    if (linkedWs) extras.push(`vinculado a ${linkedWs.name}`)
    const extraMsg = extras.length ? ` · ${extras.join(' · ')}` : ''
    this.toast.success(`Proyecto «${result.name}» creado con ${envRows.length} entorno(s)${extraMsg}`)
  }

  handleSaveProject = (): void => {
    const proj = this.activeProject()
    if (!proj) {
      this.toast.info('Selecciona un proyecto para guardar')
      return
    }
    this.demoActions.simulate('Guardar proyecto', 900, 'Estado y HCL persistidos').subscribe(() => {
      this.projects.update((list) =>
        list.map((p) =>
          p.id === proj.id ? { ...p, savedAt: new Date().toISOString(), status: p.status === 'draft' ? 'healthy' : p.status } : p,
        ),
      )
      this.toast.success(`Proyecto «${proj.name}» guardado`)
    })
  }

  handleCreateAutomation = (): void => {
    const proj = this.activeProject()
    if (!proj) {
      this.toast.info('Selecciona un proyecto primero')
      return
    }
    const auto: TerraformAutomation = {
      id: `auto-${Date.now()}`,
      projectId: proj.id,
      projectName: proj.name,
      folderId: proj.folderId,
      name: 'Plan programado',
      trigger: 'cron',
      schedule: '0 3 * * *',
      action: 'plan',
      environment: proj.environments[0]?.label ?? 'staging',
      enabled: true,
      lastRun: new Date().toISOString(),
      nextRun: 'Mañana 03:00',
      status: 'SUCCESS',
    }
    this.automations.update((list) => [...list, auto])
    this.projects.update((list) =>
      list.map((p) => (p.id === proj.id ? { ...p, automationsCount: p.automationsCount + 1 } : p)),
    )
    this.toast.success('Automatización creada')
    this.setHubTab('automate')
  }

  handleToggleAutomation = (id: string): void => {
    this.automations.update((list) =>
      list.map((a) =>
        a.id === id
          ? { ...a, enabled: !a.enabled, status: !a.enabled ? 'SUCCESS' : 'DISABLED' }
          : a,
      ),
    )
  }

  handleDeploymentSelect = (dep: TerraformDeploymentRecord): void => {
    this.openRunDetail({
      id: dep.id,
      workspaceName: dep.projectName,
      provider: 'AWS',
      status: dep.status,
      createdAt: dep.createdAt,
    })
  }

  onEditorChange = (hcl: string): void => {
    this.runStore.setEditorContent(hcl)
  }

  loadTemplate = (hcl: string): void => {
    this.runStore.setEditorContent('')
    let acc = ''
    from(hcl.split(''))
      .pipe(
        concatMap((ch) => of(ch).pipe(delay(6))),
        take(hcl.length),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (ch) => {
          acc += ch
          this.runStore.setEditorContent(acc)
        },
        complete: () => this.runStore.setEditorContent(hcl),
      })
  }

  openLaunch = (): void => {
    this.dialog
      .open(LaunchInstanceModalComponent, {
        width: 'min(1040px, 96vw)',
        maxWidth: '95vw',
        maxHeight: '95vh',
        panelClass: 'launch-instance-dialog-panel',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((v) => {
        if (!v?.applied) return
        const launch = v.launch as TerraformLaunchRecord | undefined
        if (!launch) return
        this.runStore.addLaunch(launch)
        const detail = launchDetailFromRecord(launch)
        this.launchDetails.update((list) => [detail, ...list])
        this.selectedLaunchId.set(launch.id)
        this.setHubTab('launches')
        this.toast.success('Instancia aprovisionada — guardada en carpeta')
        if (launch.workspaceId) this.selectWorkspace(launch.workspaceId)
      })
  }

  openRunDetail = (run: TerraformRunItem): void => {
    this.selectedRun.set({
      id: run.id,
      workspaceName: run.workspaceName,
      provider: run.provider,
      status: run.status,
      createdAt: run.createdAt,
    })
    this.drawerOpen.set(true)
    this.drawerPlan.set(this.planOutput() ?? '')
    this.drawerLogs.set('')
    if (run.id) {
      this.terraform.logs(run.id).subscribe({
        next: (logs) => {
          this.drawerLogs.set(typeof logs === 'string' ? logs : JSON.stringify(logs, null, 2))
        },
      })
    }
  }

  closeDrawer = (): void => {
    this.drawerOpen.set(false)
    this.selectedRun.set(null)
  }

  runInit = (): void => {
    this.busy.set(true)
    this.runStore.appendTerminal('> terraform init')
    this.ensureRun$()
      .pipe(
        switchMap((runId) => (runId ? this.terraform.init(runId) : EMPTY)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.busy.set(false)
          this.runStore.appendTerminal('Terraform has been successfully initialized!')
          this.toast.success('terraform init completado')
        },
        error: () => this.busy.set(false),
      })
  }

  runPlan = (): void => {
    this.busy.set(true)
    this.runStore.appendTerminal('> terraform plan')
    const ws = this.runStore.activeWorkspace()
    if (ws) this.runStore.selectWorkspace(ws.id)
    this.ensureRun$()
      .pipe(
        switchMap((runId) => (runId ? this.terraform.plan(runId) : EMPTY)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          const plan =
            (res as { planOutput?: string })?.planOutput ??
            'Plan: 1 to add, 0 to change, 0 to destroy.\n  # module.web_instance.aws_instance.this will be created'
          this.runStore.setPlanOutput(plan)
          this.runStore.appendTerminal(plan)
          if (ws) {
            this.runStore.setWorkspaces(
              this.runStore.workspaces().map((w) =>
                w.id === ws.id ? { ...w, status: 'planned' as const } : w,
              ),
            )
          }
          this.busy.set(false)
          this.toast.success('Plan generado — revisa el panel derecho')
        },
        error: () => this.busy.set(false),
      })
  }

  runApply = (): void => {
    if (!this.hasPlan()) return
    const runId = this.runStore.activeRunId()
    if (!runId) return
    this.busy.set(true)
    this.terraform.apply(runId, true).subscribe({
      next: () => {
        this.busy.set(false)
        this.runStore.appendTerminal('Apply complete! Resources: 1 added, 0 changed, 0 destroyed.')
        this.toast.success('terraform apply completado')
      },
      error: () => this.busy.set(false),
    })
  }

  toggleDestroy = (): void => {
    this.showDestroyConfirm.update((v) => !v)
  }

  runDestroy = (): void => {
    if (this.destroyConfirm() !== 'DESTROY') return
    const runId = this.runStore.activeRunId()
    if (!runId) return
    this.terraform.destroy(runId, true, true).subscribe({
      next: () => {
        this.showDestroyConfirm.set(false)
        this.destroyConfirm.set('')
        this.toast.success('Destroy enviado')
      },
    })
  }

  statePreview = (): string => {
    const proj = this.activeProject()
    const ws = this.runStore.activeWorkspace()
    if (!proj) {
      return buildStatePreview('terraform-cloud', 'sin-proyecto', ws?.name ?? 'default')
    }
    return buildStatePreview(proj.stateBackend, proj.name, ws?.name ?? proj.environments[0]?.workspace ?? 'default')
  }

  private ensureRun$ = () => {
    const existing = this.runStore.activeRunId()
    if (existing) return of(existing)
    const ws = this.runStore.activeWorkspace()
    if (!ws) return of('')
    return this.terraform.createRun({ provider: ws.provider, workspaceName: ws.name, config: {} }).pipe(
      tap((run) => this.runStore.setActiveRun(run.id)),
      map((run) => run.id),
    )
  }

  lineClass = (line: string): string => {
    if (line.includes('will be created') || line.includes('+ ')) return 'tf-line--add'
    if (line.includes('will be destroyed') || line.includes('- ')) return 'tf-line--del'
    if (line.includes('will be modified') || line.includes('~ ')) return 'tf-line--mod'
    return 'tf-line--info'
  }

  startResize = (event: MouseEvent): void => {
    event.preventDefault()
    const startY = event.clientY
    const startH = this.terminalHeight()
    const onMove = (e: MouseEvent): void => {
      const delta = startY - e.clientY
      this.terminalHeight.set(Math.min(560, Math.max(140, startH + delta)))
    }
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
}

const mapWorkspaceStatus = (raw: string): TerraformWorkspaceItem['status'] => {
  const s = raw.toUpperCase()
  if (s.includes('PLAN')) return 'planned'
  if (s.includes('APPL')) return 'applied'
  if (s.includes('FAIL') || s.includes('ERR')) return 'error'
  if (s.includes('RUN')) return 'applying'
  return 'idle'
}

const inferFolderId = (name: string): string => {
  const n = name.toLowerCase()
  if (n.includes('sec') || n.includes('scan')) return 'security'
  if (n.includes('data') || n.includes('postgres') || n.includes('db')) return 'data'
  if (n.includes('gcp') || n.includes('azure') || n.includes('infra')) return 'infra'
  return 'apps'
}

const dedupeWorkspaces = (list: TerraformWorkspaceItem[]): TerraformWorkspaceItem[] => {
  const seen = new Set<string>()
  return list.filter((w) => {
    if (seen.has(w.name)) return false
    seen.add(w.name)
    return true
  })
}

const parsePlanResources = (
  plan: string,
): { type: string; name: string; change: string }[] => {
  if (!plan.trim()) return []
  const rows: { type: string; name: string; change: string }[] = []
  if (plan.includes('to add') || plan.includes('will be created')) {
    rows.push({ type: 'aws_instance', name: 'web', change: 'create' })
  }
  if (plan.includes('to change') || plan.includes('will be modified')) {
    rows.push({ type: 'aws_security_group', name: 'web_sg', change: 'update' })
  }
  if (plan.includes('to destroy') || plan.includes('will be destroyed')) {
    rows.push({ type: 'aws_eip', name: 'legacy', change: 'delete' })
  }
  return rows
}
