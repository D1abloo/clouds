import { Injectable, computed, signal } from '@angular/core'
import {
  defaultChangeRequestsSnapshot,
  defaultMaintenanceWindowsSnapshot,
  type ChangeRequest,
  type ChangeStatus,
  type MaintenanceWindow,
} from './change-management.demo'
import { OPEN_CHANGE_STATUSES, TERMINAL_CHANGE_STATUSES } from './change-management.config'

export interface CreateChangeInput {
  title: string
  type: ChangeRequest['type']
  windowStart: string
  windowEnd: string
  service: string
  description: string
  risk: ChangeRequest['risk']
  scope: string
  implementationPlan: string
  rollbackPlan: string
  successCriteria: string
  maintenanceWindowId?: string
  templateId?: string
}

@Injectable({ providedIn: 'root' })
export class ChangeManagementService {
  readonly changes = signal<ChangeRequest[]>(defaultChangeRequestsSnapshot())
  readonly maintenanceWindows = signal<MaintenanceWindow[]>(defaultMaintenanceWindowsSnapshot())

  readonly openCount = computed(
    () => this.changes().filter((c) => OPEN_CHANGE_STATUSES.includes(c.status)).length,
  )

  readonly pendingApprovalCount = computed(
    () => this.changes().filter((c) => c.status === 'pending_approval').length,
  )

  readonly criticalCount = computed(
    () =>
      this.changes().filter(
        (c) => c.risk === 'critical' && OPEN_CHANGE_STATUSES.includes(c.status),
      ).length,
  )

  resetDemo = (): void => {
    this.changes.set(defaultChangeRequestsSnapshot())
    this.maintenanceWindows.set(defaultMaintenanceWindowsSnapshot())
  }

  create = (input: CreateChangeInput): ChangeRequest => {
    const id = `CHG-${4900 + this.changes().length + 1}`
    const now = new Date().toISOString()
    const change: ChangeRequest = {
      id,
      title: input.title,
      type: input.type,
      status: 'draft',
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      service: input.service,
      requester: 'admin@cloudops.io',
      requesterTeam: 'Platform Engineering',
      risk: input.risk,
      description: input.description,
      scope: input.scope,
      implementationPlan: input.implementationPlan,
      rollbackPlan: input.rollbackPlan,
      successCriteria: input.successCriteria,
      approvals: [{ role: 'CAB', user: 'cab@cloudops.io', status: 'pending' }],
      affectedResources: [],
      timeline: [{ status: 'draft', label: 'RFC creado', at: now, user: 'admin@cloudops.io' }],
      createdAt: now,
      tags: input.templateId ? ['nuevo', 'plantilla'] : ['nuevo'],
      maintenanceWindowId: input.maintenanceWindowId,
    }

    this.changes.update((list) => [change, ...list])

    if (input.maintenanceWindowId) {
      this.linkChangeToWindow(change.id, input.maintenanceWindowId)
    }

    return change
  }

  private linkChangeToWindow = (changeId: string, windowId: string): void => {
    this.maintenanceWindows.update((list) =>
      list.map((mw) => {
        if (mw.id !== windowId) return mw
        if (mw.linkedChangeIds.includes(changeId)) return mw
        return {
          ...mw,
          changesCount: mw.changesCount + 1,
          linkedChangeIds: [...mw.linkedChangeIds, changeId],
        }
      }),
    )
  }

  addMaintenanceWindow = (
    window: Omit<MaintenanceWindow, 'id' | 'changesCount' | 'status' | 'linkedChangeIds'>,
  ): MaintenanceWindow => {
    const entry: MaintenanceWindow = {
      ...window,
      id: `mw-${100 + this.maintenanceWindows().length + 1}`,
      changesCount: 0,
      linkedChangeIds: [],
      status: 'scheduled',
      preChecks: window.preChecks ?? [],
      postChecks: window.postChecks ?? [],
      notificationChannels: window.notificationChannels ?? [],
    }
    this.maintenanceWindows.update((list) =>
      [...list, entry].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    )
    return entry
  }

  updateStatus = (id: string, status: ChangeStatus, note?: string): ChangeRequest | null => {
    const current = this.changes().find((c) => c.id === id)
    if (!current) return null

    if (TERMINAL_CHANGE_STATUSES.includes(current.status)) return null

    if (status === 'approved' && !['draft', 'pending_approval'].includes(current.status)) {
      return null
    }
    if (status === 'rejected' && !['draft', 'pending_approval'].includes(current.status)) {
      return null
    }
    if (status === 'in_progress' && !['approved', 'scheduled'].includes(current.status)) {
      return null
    }

    const now = new Date().toISOString()
    const statusLabels: Partial<Record<ChangeStatus, string>> = {
      pending_approval: 'Enviado a aprobación',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      scheduled: 'Programado',
      in_progress: 'Ejecución iniciada',
      completed: 'Completado',
      failed: 'Fallido',
      cancelled: 'Cancelado',
    }

    const updated: ChangeRequest = {
      ...current,
      status,
      timeline: [
        ...current.timeline,
        {
          status,
          label: statusLabels[status] ?? status,
          at: now,
          user: 'admin@cloudops.io',
          note,
        },
      ],
      completedAt: ['completed', 'failed', 'cancelled', 'rejected'].includes(status)
        ? now
        : current.completedAt,
    }

    if (status === 'approved') {
      updated.approvals = updated.approvals.map((a) =>
        a.status === 'pending' ? { ...a, status: 'approved' as const, at: now } : a,
      )
    }
    if (status === 'rejected') {
      updated.approvals = updated.approvals.map((a) =>
        a.status === 'pending' ? { ...a, status: 'rejected' as const, at: now } : a,
      )
    }
    if (status === 'cancelled') {
      updated.approvals = updated.approvals.map((a) =>
        a.status === 'pending'
          ? { ...a, status: 'skipped' as const, at: now }
          : a,
      )
      this.unlinkChangeFromWindow(id, current.maintenanceWindowId)
    }

    this.changes.update((list) => list.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  private unlinkChangeFromWindow = (changeId: string, windowId?: string): void => {
    if (!windowId) return
    this.maintenanceWindows.update((list) =>
      list.map((mw) => {
        if (mw.id !== windowId || !mw.linkedChangeIds.includes(changeId)) return mw
        return {
          ...mw,
          changesCount: Math.max(0, mw.changesCount - 1),
          linkedChangeIds: mw.linkedChangeIds.filter((id) => id !== changeId),
        }
      }),
    )
  }

  approve = (id: string): ChangeRequest | null => this.updateStatus(id, 'approved')
  reject = (id: string): ChangeRequest | null => this.updateStatus(id, 'rejected')
  execute = (id: string): ChangeRequest | null => this.updateStatus(id, 'in_progress')
  cancel = (id: string): ChangeRequest | null => this.updateStatus(id, 'cancelled')
  submitForApproval = (id: string): ChangeRequest | null => this.updateStatus(id, 'pending_approval')
}
