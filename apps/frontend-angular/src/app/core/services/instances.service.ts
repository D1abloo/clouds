import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { ProModeService } from './pro-mode.service'
import { CloudProvider, Instance } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'
import { demoInstances } from '../demo/demo-fallback.data'
import { allowsDemoDataFrom } from '../utils/demo-runtime.util'
import { emptyInstances } from '../demo/pro-empty.data'

@Injectable({ providedIn: 'root' })
export class InstancesService {
  private readonly api = inject(ApiClientService)
  private readonly pro = inject(ProModeService)

  list = (filters?: {
    projectId?: string
    provider?: CloudProvider | 'VPS'
    cloudAccountId?: string
    region?: string
  }): Observable<Instance[]> =>
    this.api.get<unknown>('instances', filters as Record<string, string>).pipe(
      map((res) => {
        const list = unwrapList<Instance>(res)
        if (list.length) return list
        const grouped = flattenGroupedInstances(res)
        if (grouped.length) return grouped
        return allowsDemoDataFrom(this.pro) ? demoInstances() : emptyInstances()
      }),
      catchError(() => of(allowsDemoDataFrom(this.pro) ? demoInstances() : emptyInstances())),
    )

  getOne = (id: string): Observable<Instance> =>
    this.api.get<Instance>(`instances/${id}`)

  start = (id: string): Observable<unknown> =>
    this.api.post(`instances/${id}/start`)

  stop = (id: string): Observable<unknown> =>
    this.api.post(`instances/${id}/stop`)

  restart = (id: string): Observable<unknown> =>
    this.api.post(`instances/${id}/restart`)

  discover = (id: string): Observable<{
    instanceId: string
    hostRef: string
    discoveries: Record<string, unknown>
    discoveredAt: string
  }> => this.api.post(`instances/${id}/discover`)
}

const flattenGroupedInstances = (data: unknown): Instance[] => {
  const result: Instance[] = []
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    const obj = node as Record<string, unknown>
    if (typeof obj['id'] === 'string' && typeof obj['name'] === 'string') {
      result.push(obj as unknown as Instance)
    }
    Object.values(obj).forEach(walk)
  }
  walk(data)
  return result
}
