import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { CloudProvider, Instance } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'
import { demoInstances } from '../demo/demo-fallback.data'

@Injectable({ providedIn: 'root' })
export class InstancesService {
  private readonly api = inject(ApiClientService)

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
        return grouped.length ? grouped : demoInstances()
      }),
      catchError(() => of(demoInstances())),
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
    if (Array.isArray(node)) {
      node.forEach((item) => {
        if (item && typeof item === 'object' && 'id' in item) {
          result.push(item as Instance)
        } else {
          walk(item)
        }
      })
    } else if (node && typeof node === 'object') {
      Object.values(node).forEach(walk)
    }
  }
  walk(data)
  return result
}
