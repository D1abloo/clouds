import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { JenkinsServer } from '../models/api.models'

@Injectable({ providedIn: 'root' })
export class JenkinsService {
  private readonly api = inject(ApiClientService)

  listServers = (): Observable<JenkinsServer[]> =>
    this.api.get<JenkinsServer[]>('jenkins/servers')

  createServer = (body: Partial<JenkinsServer>): Observable<JenkinsServer> =>
    this.api.post<JenkinsServer>('jenkins/servers', body)

  validate = (id: string): Observable<unknown> =>
    this.api.post(`jenkins/servers/${id}/validate`)

  listJobs = (serverId?: string): Observable<Record<string, unknown>[]> =>
    this.api.get<Record<string, unknown>[]>(serverId ? `jenkins/servers/${serverId}/jobs` : 'jenkins/servers/mock/jobs')
}
