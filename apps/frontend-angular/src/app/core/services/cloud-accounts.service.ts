import { Injectable, inject } from '@angular/core'
import { Observable, map } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { CloudAccount, CloudProvider } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'

export interface CreateCloudAccountPayload {
  projectId: string
  name: string
  provider: CloudProvider
  accountId?: string
  defaultRegion?: string
  config?: Record<string, unknown>
  credentials: Record<string, string | undefined>
}

export interface LaunchInstancePayload {
  name: string
  region: string
  instanceType: string
  imageId: string
  subnetId?: string
  securityGroupIds?: string[]
}

@Injectable({ providedIn: 'root' })
export class CloudAccountsService {
  private readonly api = inject(ApiClientService)

  defaultProject = (): Observable<{ id: string; name: string; slug: string }> =>
    this.api.get('cloud-accounts/meta/default-project')

  list = (projectId?: string, provider?: CloudProvider): Observable<CloudAccount[]> =>
    this.api
      .get<unknown>('cloud-accounts', { projectId, provider })
      .pipe(map((res) => unwrapList<CloudAccount>(res)))

  get = (id: string): Observable<CloudAccount> => this.api.get<CloudAccount>(`cloud-accounts/${id}`)

  create = (body: CreateCloudAccountPayload): Observable<CloudAccount> =>
    this.api.post<CloudAccount>('cloud-accounts', body)

  validate = (id: string): Observable<{ valid: boolean; message?: string; permissions?: string[] }> =>
    this.api.post(`cloud-accounts/${id}/validate`)

  sync = (id: string): Observable<{ synced: number; regions: number; instances: number }> =>
    this.api.post(`cloud-accounts/${id}/sync`)

  syncAll = (): Observable<{ accounts: number; instances: number }> =>
    this.api.post('cloud-accounts/sync-all')

  regions = (id: string): Observable<{ id: string; name: string }[]> =>
    this.api.get(`cloud-accounts/${id}/regions`)

  networks = (id: string, region?: string): Observable<unknown[]> =>
    this.api.get(`cloud-accounts/${id}/networks`, { region })

  securityGroups = (id: string, region?: string): Observable<unknown[]> =>
    this.api.get(`cloud-accounts/${id}/security-groups`, { region })

  images = (id: string, region: string): Observable<unknown[]> =>
    this.api.get(`cloud-accounts/${id}/images`, { region })

  instanceTypes = (id: string, region: string): Observable<unknown[]> =>
    this.api.get(`cloud-accounts/${id}/instance-types`, { region })

  launch = (id: string, body: LaunchInstancePayload): Observable<unknown> =>
    this.api.post(`cloud-accounts/${id}/instances`, body)

  syncMetrics = (id: string): Observable<unknown> => this.api.post(`cloud-accounts/${id}/sync-metrics`)

  syncBilling = (id: string): Observable<unknown> => this.api.post(`cloud-accounts/${id}/sync-billing`)
}
