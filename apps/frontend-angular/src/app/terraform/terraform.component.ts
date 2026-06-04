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
import { TerraformEditorComponent } from './terraform-editor/terraform-editor.component'
import { TerraformOverviewComponent } from './terraform-overview.component'
import {
  BUILTIN_TEMPLATES,
  HCL_TEMPLATE_AWS,
  HCL_TEMPLATE_AZURE,
  HCL_TEMPLATE_GCP,
} from './terraform-hcl-templates'
import {
  defaultDemoWorkspaces,
  demoRunsFromSummary,
  mergeTerraformSummary,
  TERRAFORM_DEMO_SUMMARY,
  type TerraformPageSummary,
} from './terraform.demo'
import { PageHeaderComponent, type PageHeaderAction } from '../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../shared/components/loading-state/loading-state.component'
import { StatusBadgeComponent } from '../shared/components/status-badge/status-badge.component'
import { RunDetailDrawerComponent } from '../features/terraform/components/run-detail-drawer.component'
import { TerraformPlanViewerComponent } from '../features/terraform/components/terraform-plan-viewer.component'
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
    PageHeaderComponent,
    LoadingStateComponent,
    StatusBadgeComponent,
    TerraformEditorComponent,
    TerraformOverviewComponent,
    RunDetailDrawerComponent,
    TerraformPlanViewerComponent,
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

  readonly inspectorRef = viewChild<ElementRef<HTMLElement>>('inspectorPane')

  readonly builtinTemplates = BUILTIN_TEMPLATES
  readonly headerActions: PageHeaderAction[] = [
    { label: 'Actualizar', icon: 'refresh' },
    { label: 'Nuevo plan', icon: 'description' },
    { label: 'Lanzar instancia', icon: 'rocket_launch', primary: true },
  ]

  readonly terminalHeight = signal(200)
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

  private readonly wsSearchTerm = toSignal(
    this.wsSearch.valueChanges.pipe(debounceTime(150), startWith('')),
    { initialValue: '' },
  )

  readonly editorHcl = computed(() => this.runStore.activeWorkspace()?.hcl ?? '')
  readonly workspaceName = computed(() => this.runStore.activeWorkspace()?.name ?? 'Sin workspace')
  readonly hasPlan = this.runStore.hasPlan
  readonly planOutput = this.runStore.planOutput
  readonly terminalLines = this.runStore.terminalLines
  readonly activeWorkspace = this.runStore.activeWorkspace

  readonly providerChips = computed(() => {
    const counts = this.cloudStore.countByProvider()
    return [
      { provider: 'AWS', connected: counts.AWS > 0, count: counts.AWS },
      { provider: 'GCP', connected: counts.GCP > 0, count: counts.GCP },
      { provider: 'Azure', connected: counts.AZURE > 0, count: counts.AZURE },
      { provider: 'Ansible', connected: this.settingsStore.ansibleConnected(), count: 1 },
    ]
  })

  readonly filteredWorkspaces = computed(() => {
    const term = (this.wsSearchTerm() ?? '').toLowerCase()
    return this.runStore.workspaces().filter((ws) => {
      if (!term) return true
      return ws.name.toLowerCase().includes(term) || ws.provider.toLowerCase().includes(term)
    })
  })

  readonly planResources = computed(() => parsePlanResources(this.planOutput() ?? ''))

  readonly activeProviderConnected = computed(() => {
    const ws = this.runStore.activeWorkspace()
    if (!ws) return true
    const counts = this.cloudStore.countByProvider()
    return (counts[ws.provider as 'AWS' | 'GCP' | 'AZURE'] ?? 0) > 0
  })

  readonly actionsDisabled = computed(() => !this.activeProviderConnected() || this.busy())

  readonly editorHeight = computed(() => `calc(100vh - 320px - ${this.terminalHeight()}px)`)

  ngOnInit(): void {
    this.realtime.connect()
    this.cloudStore.load()
    this.loadPage()
    if (this.route.snapshot.data['openLaunch']) {
      setTimeout(() => this.openLaunch(), 300)
    }
  }

  lastSyncLabel = (): string => {
    const d = this.summary().lastSyncedAt
    return new Date(d).toLocaleString('es-ES')
  }

  loadPage = (): void => {
    this.loading.set(true)
    this.terraform.pageSummary().subscribe({
      next: (data) => {
        const merged = mergeTerraformSummary(data)
        this.summary.set(merged)
        this.hydrateFromSummary(merged)
        this.loading.set(false)
      },
      error: () => {
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
          provider: (w['provider'] as CloudProvider) ?? 'AWS',
          hcl: this.hclForProvider((w['provider'] as CloudProvider) ?? 'AWS'),
          status: mapWorkspaceStatus(String(w['status'] ?? 'idle')),
        }))
      : defaultDemoWorkspaces()

    this.runStore.setWorkspaces(dedupeWorkspaces(workspaces))

    const runs = demoRunsFromSummary(items)
    if (runs.length) this.runStore.setRuns(runs)
  }

  handleHeader = (label: string): void => {
    if (label === 'Actualizar') {
      this.loadPage()
      return
    }
    if (label === 'Nuevo plan') {
      this.demoActions.simulate('Terraform plan', 1400, 'Plan listo — 1 recurso por añadir').subscribe(() => {
        const plan = 'Plan: 1 to add, 0 to change, 0 to destroy.\n  # aws_instance.web will be created'
        this.runStore.setPlanOutput(plan)
        this.runStore.appendTerminal(plan)
        this.toast.success('Plan generado')
      })
      return
    }
    if (label === 'Lanzar instancia') {
      this.openLaunch()
    }
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

  selectWorkspace = (id: string): void => {
    this.runStore.selectWorkspace(id)
    this.runStore.clearTerminal()
    this.runStore.appendTerminal('cloudops-terraform $ terraform workspace select ' + this.workspaceName())
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
        width: '960px',
        maxWidth: '95vw',
        maxHeight: '95vh',
        panelClass: 'launch-instance-dialog-panel',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((v) => {
        if (v?.applied) {
          this.toast.success('Instancia aprovisionada — sincronizando inventario')
          this.loadPage()
        }
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

  statePreview = (): string =>
    `{
  "version": 4,
  "terraform_version": "1.7.0",
  "serial": 12,
  "lineage": "demo-workspace",
  "resources": [
    {
      "type": "aws_instance",
      "name": "web",
      "provider": "provider[\\"registry.terraform.io/hashicorp/aws\\"]"
    }
  ]
}`

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
      this.terminalHeight.set(Math.min(480, Math.max(120, startH + delta)))
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
