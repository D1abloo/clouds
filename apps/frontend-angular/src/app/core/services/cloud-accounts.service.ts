import { Injectable, inject } from '@angular/core'
import { Observable, map } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { CloudAccount, CloudProvider } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'

@Injectable({ providedIn: 'root' })
export class CloudAccountsService {
  private readonly api = inject(ApiClientService)

  list = (projectId?: string): Observable<CloudAccount[]> =>
    this.api
      .get<unknown>('cloud-accounts', { projectId })
      .pipe(map((res) => unwrapList<CloudAccount>(res)))

  listByProvider = (
    provider: CloudProvider,
    projectId?: string,
  ): Observable<CloudAccount[]> =>
    this.api.get<CloudAccount[]>('cloud-accounts', { projectId }).pipe(
      // client-side filter when backend returns all
    ) as Observable<CloudAccount[]>

  create = (body: Partial<CloudAccount>): Observable<CloudAccount> =>
    this.api.post<CloudAccount>('cloud-accounts', body)

  validate = (id: string): Observable<unknown> =>
    this.api.post(`cloud-accounts/${id}/validate`)

  sync = (id: string): Observable<unknown> =>
    this.api.post(`cloud-accounts/${id}/sync`)

  regions = (id: string): Observable<string[]> =>
    this.api.get<string[]>(`cloud-accounts/${id}/regions`)
}
