import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of, shareReplay } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { ProModeService } from './pro-mode.service'
import { CloudAccount, CloudProvider } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'

export type CloudKeyPairRow = { id: string; name: string; region: string; fingerprint?: string }

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
  tags?: Record<string, string>
  availabilityZone?: string
  resourceGroup?: string
  keyPair?: string
  publicIp?: boolean
  diskGb?: number
  diskType?: string
  userData?: string
  monitoring?: boolean
}

export type LaunchPreflightCheck = {
  id: string
  level: 'error' | 'warning' | 'ok'
  message: string
  field?: string
  suggestion?: string
}

export type LaunchPreflightResult = {
  valid: boolean
  checks: LaunchPreflightCheck[]
  resolvedSubnetId?: string
  resolvedVpcId?: string
}

export type CreateSubnetPayload = {
  region: string
  vpcId: string
  availabilityZone: string
  cidrBlock: string
  name?: string
  mapPublicIpOnLaunch?: boolean
}

@Injectable({ providedIn: 'root' })
export class CloudAccountsService {
  private readonly api = inject(ApiClientService)
  private readonly pro = inject(ProModeService)
  private defaultProject$?: Observable<{ id: string; name: string; slug: string }>

  defaultProject = (): Observable<{ id: string; name: string; slug: string }> => {
    if (!this.defaultProject$) {
      this.defaultProject$ = this.api
        .get<{ id: string; name: string; slug: string }>('cloud-accounts/meta/default-project')
        .pipe(shareReplay(1))
    }
    return this.defaultProject$
  }

  list = (projectId?: string, provider?: CloudProvider): Observable<CloudAccount[]> =>
    this.api.get<unknown>('cloud-accounts', { projectId, provider }).pipe(
      map((res) => {
        const rows = unwrapList<CloudAccount>(res)
        if (rows.length) return rows
        return []
      }),
      catchError(() => of([])),
    )

  get = (id: string): Observable<CloudAccount> => this.api.get<CloudAccount>(`cloud-accounts/${id}`)

  create = (body: CreateCloudAccountPayload): Observable<CloudAccount> =>
    this.api.post<CloudAccount>('cloud-accounts', body)

  validate = (id: string): Observable<{ valid: boolean; message?: string; permissions?: string[] }> =>
    this.api.post(`cloud-accounts/${id}/validate`)

  validatePreview = (
    body: CreateCloudAccountPayload,
  ): Observable<{ valid: boolean; message?: string; permissions?: string[] }> =>
    this.api.post('cloud-accounts/validate-preview', body)

  sync = (id: string): Observable<{ synced: number; regions: number; instances: number }> =>
    this.api.post(`cloud-accounts/${id}/sync`)

  syncAll = (): Observable<{ accounts: number; instances: number }> =>
    this.api.post('cloud-accounts/sync-all')

  regions = (id: string): Observable<{ id: string; name: string }[]> =>
    this.api
      .get<unknown>(`cloud-accounts/${id}/regions`, undefined, { timeoutMs: 60_000 })
      .pipe(map((res) => unwrapList<{ id: string; name: string }>(res)))

  networks = (id: string, region?: string): Observable<unknown[]> =>
    this.api
      .get<unknown>(`cloud-accounts/${id}/networks`, { region }, { timeoutMs: 60_000 })
      .pipe(map((res) => unwrapList(res)))

  securityGroups = (id: string, region?: string): Observable<unknown[]> =>
    this.api
      .get<unknown>(`cloud-accounts/${id}/security-groups`, { region }, { timeoutMs: 60_000 })
      .pipe(map((res) => unwrapList(res)))

  images = (id: string, region?: string): Observable<unknown[]> =>
    this.api
      .get<unknown>(`cloud-accounts/${id}/images`, region ? { region } : undefined, { timeoutMs: 90_000 })
      .pipe(map((res) => unwrapList(res)))

  instanceTypes = (id: string, region?: string): Observable<unknown[]> =>
    this.api
      .get<unknown>(`cloud-accounts/${id}/instance-types`, region ? { region } : undefined, { timeoutMs: 90_000 })
      .pipe(map((res) => unwrapList(res)))

  keyPairs = (id: string, region?: string): Observable<CloudKeyPairRow[]> =>
    this.api
      .get<unknown>(`cloud-accounts/${id}/key-pairs`, region ? { region } : undefined, { timeoutMs: 60_000 })
      .pipe(map((res) => unwrapList<CloudKeyPairRow>(res)))

  listInstances = (id: string, region?: string): Observable<unknown[]> =>
    this.api
      .get<unknown>(`cloud-accounts/${id}/instances`, region ? { region } : undefined)
      .pipe(map((res) => unwrapList(res)))

  launch = (id: string, body: LaunchInstancePayload): Observable<unknown> =>
    this.api.post(`cloud-accounts/${id}/instances`, body)

  validateLaunch = (id: string, body: LaunchInstancePayload): Observable<LaunchPreflightResult> =>
    this.api.post<LaunchPreflightResult>(`cloud-accounts/${id}/validate-launch`, body)

  createSubnet = (id: string, body: CreateSubnetPayload): Observable<unknown> =>
    this.api.post(`cloud-accounts/${id}/networks/subnets`, body)

  availabilityZones = (id: string, region: string): Observable<string[]> =>
    this.api
      .get<unknown>(`cloud-accounts/${id}/availability-zones`, { region }, { timeoutMs: 30_000 })
      .pipe(
        map((res) => {
          if (Array.isArray(res)) return res as string[]
          return unwrapList<string>(res)
        }),
      )

  syncMetrics = (id: string): Observable<unknown> => this.api.post(`cloud-accounts/${id}/sync-metrics`)

  syncBilling = (id: string): Observable<unknown> => this.api.post(`cloud-accounts/${id}/sync-billing`)

  delete = (id: string): Observable<{ deleted: boolean; message: string }> =>
    this.api.delete<{ deleted: boolean; message: string }>(`cloud-accounts/${id}`)
}
