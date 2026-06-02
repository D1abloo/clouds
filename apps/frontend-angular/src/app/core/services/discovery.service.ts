import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'

@Injectable({ providedIn: 'root' })
export class DiscoveryService {
  private readonly api = inject(ApiClientService)

  discoverDocker = (hostRef: string): Observable<unknown> =>
    this.api.post(`docker-discovery/${hostRef}`)

  discoverKubernetes = (hostRef: string): Observable<unknown> =>
    this.api.post(`kubernetes-discovery/kubernetes/${hostRef}`)

  discoverSystem = (hostRef: string): Observable<unknown> =>
    this.api.post(`kubernetes-discovery/system/${hostRef}`)
}
