import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { CloudProvider, Instance } from '../models/api.models'

@Injectable({ providedIn: 'root' })
export class InstancesService {
  private readonly api = inject(ApiClientService)

  list = (filters?: {
    projectId?: string
    provider?: CloudProvider
    cloudAccountId?: string
    region?: string
  }): Observable<Instance[] | Record<string, unknown>> =>
    this.api.get('instances', filters as Record<string, string>)

  getOne = (id: string): Observable<Instance> =>
    this.api.get<Instance>(`instances/${id}`)

  start = (id: string): Observable<unknown> =>
    this.api.post(`instances/${id}/start`)

  stop = (id: string): Observable<unknown> =>
    this.api.post(`instances/${id}/stop`)

  restart = (id: string): Observable<unknown> =>
    this.api.post(`instances/${id}/restart`)
}
