import { Injectable, computed, signal } from '@angular/core'
import type { RunbookExecuteDialogResult } from '../runbooks/runbook-execute-dialog.component'
import type { Runbook } from '../runbooks/runbooks.demo'
import type {
  ServiceCatalogLaunch,
  ServiceCatalogTemplate,
} from '../service-catalog/service-catalog.demo'
import type { ServiceCatalogLaunchOptions } from '../service-catalog/service-catalog.util'
import {
  defaultApprovalRequestsSnapshot,
  type ApprovalRequest,
} from './approvals.demo'
import {
  buildLaunchFromApproval,
  buildRunbookApproval,
  buildServiceCatalogApproval,
} from './approvals.util'

@Injectable({ providedIn: 'root' })
export class ApprovalsService {
  readonly requests = signal<ApprovalRequest[]>(defaultApprovalRequestsSnapshot())

  readonly pendingCount = computed(
    () => this.requests().filter((r) => r.status === 'pending').length,
  )

  private readonly approvedLaunchesQueue = signal<ServiceCatalogLaunch[]>([])
  private readonly approvedRunbookExecutions = signal<RunbookExecuteDialogResult[]>([])

  submit = (request: ApprovalRequest): string => {
    this.requests.update((list) => [request, ...list])
    return request.id
  }

  submitServiceCatalogLaunch = (
    tpl: ServiceCatalogTemplate,
    opts: ServiceCatalogLaunchOptions,
    requester?: string,
  ): ApprovalRequest => {
    const request = buildServiceCatalogApproval(tpl, opts, requester)
    this.submit(request)
    return request
  }

  submitRunbookExecution = (
    rb: Runbook,
    opts: RunbookExecuteDialogResult,
    requester?: string,
  ): ApprovalRequest => {
    const request = buildRunbookApproval(rb, opts, requester)
    this.submit(request)
    return request
  }

  approve = (id: string, decidedBy = 'admin@cloudops.io'): ApprovalRequest | null => {
    const req = this.requests().find((r) => r.id === id)
    if (!req || req.status !== 'pending') return null

    const updated: ApprovalRequest = {
      ...req,
      status: 'approved',
      approversCompleted: req.approversRequired,
      decidedAt: new Date().toISOString(),
      decidedBy,
      decisionNote: 'Aprobado — la acción solicitada quedará encolada para ejecución.',
      approvalChain: req.approvalChain.map((s) =>
        s.status === 'pending'
          ? { ...s, status: 'approved' as const, at: new Date().toISOString() }
          : s,
      ),
    }

    this.requests.update((list) => list.map((r) => (r.id === id ? updated : r)))
    this.queueExecution(updated)
    return updated
  }

  reject = (id: string, decidedBy = 'admin@cloudops.io', note?: string): ApprovalRequest | null => {
    const req = this.requests().find((r) => r.id === id)
    if (!req || req.status !== 'pending') return null

    const updated: ApprovalRequest = {
      ...req,
      status: 'rejected',
      decidedAt: new Date().toISOString(),
      decidedBy,
      decisionNote: note ?? 'Rechazado — la acción solicitada no se ejecutará.',
    }
    this.requests.update((list) => list.map((r) => (r.id === id ? updated : r)))
    return updated
  }

  resetDemo = (): void => {
    this.requests.set(defaultApprovalRequestsSnapshot())
    this.approvedLaunchesQueue.set([])
    this.approvedRunbookExecutions.set([])
  }

  drainApprovedLaunches = (): ServiceCatalogLaunch[] => {
    const batch = this.approvedLaunchesQueue()
    this.approvedLaunchesQueue.set([])
    return batch
  }

  drainApprovedRunbookExecutions = (): RunbookExecuteDialogResult[] => {
    const batch = this.approvedRunbookExecutions()
    this.approvedRunbookExecutions.set([])
    return batch
  }

  resolveLaunchFromApproval = (
    req: ApprovalRequest,
    tpl: ServiceCatalogTemplate,
  ): ServiceCatalogLaunch => buildLaunchFromApproval(req, tpl)

  queueLaunchAfterApproval = (launch: ServiceCatalogLaunch): void => {
    this.approvedLaunchesQueue.update((q) => [launch, ...q])
  }

  private queueExecution = (req: ApprovalRequest): void => {
    const exec = req.pendingExecution
    if (!exec) return
    if (exec.kind === 'runbook-execute') {
      this.approvedRunbookExecutions.update((q) => [exec.execute, ...q])
    }
  }
}
