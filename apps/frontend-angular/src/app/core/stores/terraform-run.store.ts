import { Injectable, inject, signal, computed } from '@angular/core'
import { TerraformService } from '../services/terraform.service'
import { RealtimeService } from '../services/realtime.service'
import { CloudProvider } from '../models/api.models'

export interface TerraformWorkspaceItem {
  id: string
  name: string
  provider: CloudProvider
  hcl: string
  status: 'idle' | 'planning' | 'planned' | 'applying' | 'applied' | 'error'
}

export interface TerraformRunItem {
  id: string
  workspaceName: string
  provider: CloudProvider
  status: string
  createdAt: string
}

export interface LaunchProgress {
  step: string
  percent: number
  log: string
}

@Injectable({ providedIn: 'root' })
export class TerraformRunStore {
  private readonly terraform = inject(TerraformService)
  private readonly realtime = inject(RealtimeService)

  private readonly _runs = signal<TerraformRunItem[]>([])
  private readonly _workspaces = signal<TerraformWorkspaceItem[]>([])
  private readonly _activeWorkspaceId = signal<string | null>(null)
  private readonly _activeRunId = signal<string | null>(null)
  private readonly _planOutput = signal<string | null>(null)
  private readonly _hasPlan = signal(false)
  private readonly _applyStatus = signal<string | null>(null)
  private readonly _terminalLines = signal<string[]>([])
  private readonly _launchProgress = signal<LaunchProgress | null>(null)

  readonly runs = this._runs.asReadonly()
  readonly workspaces = this._workspaces.asReadonly()
  readonly activeWorkspaceId = this._activeWorkspaceId.asReadonly()
  readonly activeRunId = this._activeRunId.asReadonly()
  readonly planOutput = this._planOutput.asReadonly()
  readonly hasPlan = this._hasPlan.asReadonly()
  readonly applyStatus = this._applyStatus.asReadonly()
  readonly terminalLines = this._terminalLines.asReadonly()
  readonly launchProgress = this._launchProgress.asReadonly()

  readonly activeWorkspace = computed(() => {
    const id = this._activeWorkspaceId()
    return this._workspaces().find((w) => w.id === id) ?? null
  })

  readonly recentRuns = computed(() => this._runs().slice(0, 5))

  constructor() {
    this.realtime.on('terraform.updated', (payload) => this.handleTerraformUpdated(payload))
    this.realtime.on('terraform.run.progress', (payload) => this.handleProgress(payload))
    this.realtime.on('terraform.run.log', (payload) => this.handleLog(payload))
  }

  setWorkspaces = (items: TerraformWorkspaceItem[]): void => {
    this._workspaces.set(items)
    if (!this._activeWorkspaceId() && items.length > 0) {
      this._activeWorkspaceId.set(items[0].id)
    }
  }

  selectWorkspace = (id: string): void => {
    this._activeWorkspaceId.set(id)
    this._planOutput.set(null)
    this._hasPlan.set(false)
    this._applyStatus.set(null)
  }

  setEditorContent = (hcl: string): void => {
    const id = this._activeWorkspaceId()
    if (!id) return
    this._workspaces.update((list) =>
      list.map((w) => (w.id === id ? { ...w, hcl } : w)),
    )
  }

  setRuns = (runs: TerraformRunItem[]): void => {
    this._runs.set(runs)
  }

  setActiveRun = (runId: string | null): void => {
    this._activeRunId.set(runId)
  }

  setPlanOutput = (plan: string | null): void => {
    this._planOutput.set(plan)
    this._hasPlan.set(!!plan)
  }

  appendTerminal = (line: string): void => {
    this._terminalLines.update((lines) => [...lines, line])
  }

  clearTerminal = (): void => {
    this._terminalLines.set([])
  }

  setLaunchProgress = (p: LaunchProgress | null): void => {
    this._launchProgress.set(p)
  }

  private handleTerraformUpdated = (payload: unknown): void => {
    const data = payload as { runId?: string; status?: string; planOutput?: string }
    if (data.planOutput) {
      this._planOutput.set(data.planOutput)
      this._hasPlan.set(true)
    }
    if (data.status) this._applyStatus.set(data.status)
    if (data.runId) this._activeRunId.set(data.runId)
  }

  private handleProgress = (payload: unknown): void => {
    const data = payload as LaunchProgress
    if (data.step) this._launchProgress.set(data)
  }

  private handleLog = (payload: unknown): void => {
    const data = payload as { message?: string; line?: string }
    const line = data.line ?? data.message
    if (line) this.appendTerminal(line)
  }
}
