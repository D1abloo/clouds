import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { MatDialog } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { concatMap, delay, EMPTY, from, map, of, switchMap, take, tap } from 'rxjs'
import { TerraformService } from '../core/services/terraform.service'
import { TerraformRunStore, TerraformWorkspaceItem } from '../core/stores/terraform-run.store'
import { CloudAccountsStore } from '../core/stores/cloud-accounts.store'
import { SettingsStore } from '../core/stores/settings.store'
import { RealtimeService } from '../core/services/realtime.service'
import { ToastService } from '../core/services/toast.service'
import { LaunchInstanceModalComponent } from '../shared/modals/launch-instance/launch-instance-modal.component'
import { TerraformEditorComponent } from './terraform-editor/terraform-editor.component'
import {
  BUILTIN_TEMPLATES,
  HCL_TEMPLATE_AWS,
  HCL_TEMPLATE_AZURE,
  HCL_TEMPLATE_GCP,
} from './terraform-hcl-templates'
import { CloudProvider } from '../core/models/api.models'

interface ProviderStatus {
  provider: 'AWS' | 'GCP' | 'AZURE' | 'ANSIBLE'
  connected: boolean
  count: number
}

@Component({
  selector: 'app-terraform',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, RouterLink, TerraformEditorComponent],
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
  private readonly destroyRef = inject(DestroyRef)
  private readonly route = inject(ActivatedRoute)

  readonly builtinTemplates = BUILTIN_TEMPLATES
  readonly terminalHeight = signal(200)
  readonly destroyConfirm = signal('')
  readonly showDestroyConfirm = signal(false)
  readonly busy = signal(false)
  readonly typing = signal(false)

  readonly editorHcl = computed(() => this.runStore.activeWorkspace()?.hcl ?? '')
  readonly workspaceName = computed(() => this.runStore.activeWorkspace()?.name ?? 'No workspace')
  readonly hasPlan = this.runStore.hasPlan
  readonly terminalLines = this.runStore.terminalLines
  readonly recentRuns = this.runStore.recentRuns

  readonly providerStatuses = computed((): ProviderStatus[] => {
    const counts = this.cloudStore.countByProvider()
    return [
      { provider: 'AWS', connected: counts.AWS > 0, count: counts.AWS },
      { provider: 'GCP', connected: counts.GCP > 0, count: counts.GCP },
      { provider: 'AZURE', connected: counts.AZURE > 0, count: counts.AZURE },
      { provider: 'ANSIBLE', connected: this.settingsStore.ansibleConnected(), count: 1 },
    ]
  })

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
    this.terraform.pageSummary().subscribe({
      next: (data) => {
        const items = (data['items'] as Record<string, unknown>[]) ?? []
        const workspaces: TerraformWorkspaceItem[] = items.length
          ? items.map((w, i) => ({
              id: String(w['id'] ?? `ws-${i}`),
              name: String(w['name'] ?? w['workspaceName'] ?? `workspace-${i}`),
              provider: (w['provider'] as CloudProvider) ?? 'AWS',
              hcl: this.hclForProvider((w['provider'] as CloudProvider) ?? 'AWS'),
              status: 'idle' as const,
            }))
          : this.defaultWorkspaces()
        this.runStore.setWorkspaces(workspaces)
        const runs = (items as Record<string, unknown>[]).slice(0, 5).map((r, i) => ({
          id: String(r['id'] ?? `run-${i}`),
          workspaceName: String(r['name'] ?? 'workspace'),
          provider: 'AWS' as CloudProvider,
          status: String(r['status'] ?? 'PLANNED'),
          createdAt: new Date().toISOString(),
        }))
        if (runs.length) this.runStore.setRuns(runs)
      },
      error: () => this.runStore.setWorkspaces(this.defaultWorkspaces()),
    })
  }

  private defaultWorkspaces = (): TerraformWorkspaceItem[] => [
    { id: 'ws-aws', name: 'aws-production', provider: 'AWS', hcl: HCL_TEMPLATE_AWS, status: 'idle' },
    { id: 'ws-gcp', name: 'gcp-analytics', provider: 'GCP', hcl: HCL_TEMPLATE_GCP, status: 'idle' },
    { id: 'ws-azure', name: 'azure-core', provider: 'AZURE', hcl: HCL_TEMPLATE_AZURE, status: 'idle' },
  ]

  private hclForProvider = (p: CloudProvider): string => {
    if (p === 'GCP') return HCL_TEMPLATE_GCP
    if (p === 'AZURE') return HCL_TEMPLATE_AZURE
    return HCL_TEMPLATE_AWS
  }

  selectWorkspace = (id: string): void => {
    this.runStore.selectWorkspace(id)
    this.runStore.clearTerminal()
    this.runStore.appendTerminal('cloudops-terraform $')
  }

  onEditorChange = (hcl: string): void => {
    this.runStore.setEditorContent(hcl)
  }

  loadTemplate = (hcl: string): void => {
    this.typing.set(true)
    this.runStore.setEditorContent('')
    let acc = ''
    from(hcl.split(''))
      .pipe(
        concatMap((ch) => of(ch).pipe(delay(8))),
        take(hcl.length),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (ch) => {
          acc += ch
          this.runStore.setEditorContent(acc)
        },
        complete: () => {
          this.runStore.setEditorContent(hcl)
          this.typing.set(false)
        },
      })
  }

  openLaunch = (): void => {
    this.dialog
      .open(LaunchInstanceModalComponent, {
        width: '860px',
        maxWidth: '95vw',
        maxHeight: '95vh',
        panelClass: 'launch-instance-dialog-panel',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((v) => {
        if (v?.applied) {
          this.toast.success('Instance provisioned')
          this.loadPage()
        }
      })
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
          this.toast.success('terraform init complete')
        },
        error: () => this.busy.set(false),
      })
  }

  runPlan = (): void => {
    this.busy.set(true)
    this.runStore.appendTerminal('> terraform plan')
    this.ensureRun$()
      .pipe(
        switchMap((runId) => (runId ? this.terraform.plan(runId) : EMPTY)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          const plan = (res as { planOutput?: string })?.planOutput ?? 'Plan: 1 to add, 0 to change, 0 to destroy.'
          this.runStore.setPlanOutput(plan)
          this.runStore.appendTerminal(plan)
          this.busy.set(false)
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
        this.toast.success('terraform apply complete')
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
        this.toast.success('Destroy submitted')
      },
    })
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
