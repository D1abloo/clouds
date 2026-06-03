import { Injectable, inject } from '@angular/core'
import { Observable, map } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { JenkinsServer } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'

@Injectable({ providedIn: 'root' })
export class JenkinsService {
  private readonly api = inject(ApiClientService)

  listServers = (): Observable<JenkinsServer[]> =>
    this.api
      .get<unknown>('jenkins/servers')
      .pipe(map((res) => unwrapList<JenkinsServer>(res)))

  createServer = (body: Partial<JenkinsServer>): Observable<JenkinsServer> =>
    this.api.post<JenkinsServer>('jenkins/servers', body)

  validate = (id: string): Observable<unknown> =>
    this.api.post(`jenkins/servers/${id}/validate`)

  listJobs = (serverId?: string): Observable<Record<string, unknown>[]> =>
    this.api.get<Record<string, unknown>[]>(serverId ? `jenkins/servers/${serverId}/jobs` : 'jenkins/servers/mock/jobs')
}
