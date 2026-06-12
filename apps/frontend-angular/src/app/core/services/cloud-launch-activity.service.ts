import { Injectable, signal } from '@angular/core'
import type { Instance } from '../models/api.models'

export type LaunchActivityProvider = 'AWS' | 'GCP' | 'AZURE' | 'CLOUDING' | 'IONOS'
export type LaunchActivityAction = 'preflight' | 'launch' | 'test' | 'delete' | 'log'
export type LaunchActivityStatus = 'running' | 'success' | 'error' | 'info' | 'terminated'

export interface LaunchInventoryResource {
  id: string
  name: string
  provider: LaunchActivityProvider
  region: string
  zone?: string
  status: string
  publicIp?: string
  instanceType: string
  cpuCores?: number
  ramGb?: number
  diskGb?: number
  imageId?: string
  hourlyCost?: number
  monthlyCost?: number
  createdAt: string
  labels?: Record<string, string>
  logs?: string[]
}

export interface LaunchActivityEvent {
  id: string
  resourceId?: string
  provider: LaunchActivityProvider
  action: LaunchActivityAction
  status: LaunchActivityStatus
  message: string
  resourceName?: string
  region?: string
  zone?: string
  timestamp: string
}

type PersistedLaunchActivity = {
  resources: LaunchInventoryResource[]
  events: LaunchActivityEvent[]
}

const STORAGE_KEY = 'cloudops_ai_infra_launch_activity_v1'
const MAX_EVENTS = 80

const canUseStorage = (): boolean => typeof localStorage !== 'undefined'

const readState = (): PersistedLaunchActivity => {
  if (!canUseStorage()) return { resources: [], events: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { resources: [], events: [] }
    const parsed = JSON.parse(raw) as Partial<PersistedLaunchActivity>
    return {
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    }
  } catch {
    return { resources: [], events: [] }
  }
}

const eventLevel = (status: LaunchActivityStatus): 'info' | 'warning' | 'error' =>
  status === 'error' ? 'error' : status === 'terminated' ? 'warning' : 'info'

@Injectable({ providedIn: 'root' })
export class CloudLaunchActivityService {
  private readonly initial = readState()
  private readonly _resources = signal<LaunchInventoryResource[]>(this.initial.resources)
  private readonly _events = signal<LaunchActivityEvent[]>(this.initial.events)

  readonly resources = this._resources.asReadonly()
  readonly events = this._events.asReadonly()

  upsertResource = (resource: LaunchInventoryResource): void => {
    this._resources.update((rows) => {
      const next = rows.filter((r) => r.id !== resource.id)
      return [resource, ...next].slice(0, 40)
    })
    this.persist()
  }

  markResource = (id: string, status: string, message?: string): void => {
    let updated: LaunchInventoryResource | undefined
    this._resources.update((rows) =>
      rows.map((r) => {
        if (r.id !== id) return r
        updated = {
          ...r,
          status,
          logs: message ? [...(r.logs ?? []), message] : r.logs,
        }
        return updated
      }),
    )
    if (updated && message) {
      this.record({
        resourceId: id,
        provider: updated.provider,
        action: status === 'TERMINATED' ? 'delete' : 'log',
        status: status === 'TERMINATED' ? 'terminated' : 'info',
        resourceName: updated.name,
        region: updated.region,
        zone: updated.zone,
        message,
      })
      return
    }
    this.persist()
  }

  record = (event: Omit<LaunchActivityEvent, 'id' | 'timestamp'> & { timestamp?: string }): LaunchActivityEvent => {
    const full: LaunchActivityEvent = {
      ...event,
      id: `launch-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: event.timestamp ?? new Date().toISOString(),
    }
    this._events.update((events) => [full, ...events].slice(0, MAX_EVENTS))
    this.persist()
    return full
  }

  toInstances = (): Instance[] =>
    this._resources().map((r) => ({
      id: r.id,
      name: r.name,
      provider: r.provider,
      externalId: r.id,
      region: r.zone ? `${r.region} / ${r.zone}` : r.region,
      status: r.status,
      instanceType: r.instanceType,
      publicIp: r.publicIp,
      isVps: r.provider === 'IONOS',
      cpuCores: r.cpuCores,
      ramGb: r.ramGb,
      diskGb: r.diskGb,
      monthlyCost: r.monthlyCost,
      createdAt: r.createdAt,
      metadata: {
        source: 'ai-infra-studio',
        labels: r.labels ?? {},
        hourlyCost: r.hourlyCost,
        imageId: r.imageId,
        zone: r.zone,
      },
    }))

  toLogRows = (): Record<string, unknown>[] =>
    this._events().map((e) => ({
      time: e.timestamp,
      source: 'ai-infra-studio',
      level: eventLevel(e.status),
      message: `${e.provider} · ${e.action}: ${e.message}`,
    }))

  private persist = (): void => {
    if (!canUseStorage()) return
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        resources: this._resources(),
        events: this._events(),
      }),
    )
  }
}
