import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'

@Injectable({ providedIn: 'root' })
export class DiscoveryService {
  private readonly api = inject(ApiClientService)

  discoverDocker = (hostRef: string): Observable<unknown> =>
    this.api.post(`discovery/docker/${encodeURIComponent(hostRef)}`)

  discoverKubernetes = (hostRef: string): Observable<unknown> =>
    this.api.post(`discovery/kubernetes/${encodeURIComponent(hostRef)}`)

  discoverSystem = (hostRef: string): Observable<unknown> =>
    this.api.post(`discovery/system/${encodeURIComponent(hostRef)}`)

  discoverInstance = (instanceId: string): Observable<unknown> =>
    this.api.post(`instances/${instanceId}/discover`)
}
