import { Injectable, inject } from '@angular/core'
import { Observable, catchError, forkJoin, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { CloudProvider, TerraformRun, TerraformTemplate } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'

export interface LaunchInstanceTerraformPayload {
  provider: CloudProvider
  region: string
  instanceType: string
  name?: string
  cloudAccountId?: string
  workspaceName?: string
  config?: Record<string, unknown>
}

@Injectable({ providedIn: 'root' })
export class TerraformService {
  private readonly api = inject(ApiClientService)

  listTemplates = (): Observable<TerraformTemplate[]> =>
    this.api
      .get<unknown>('terraform/templates')
      .pipe(map((res) => unwrapList<TerraformTemplate>(res)))

  pageSummary = (): Observable<Record<string, unknown>> =>
    forkJoin({
      inventory: this.api
        .get<Record<string, unknown>>('inventory/terraform')
        .pipe(catchError(() => of({ workspaces: 0, runs: 0, plans: 0, applies: 0, errors: 0, items: [] }))),
      templates: this.listTemplates().pipe(catchError(() => of([] as TerraformTemplate[]))),
    }).pipe(map(({ inventory, templates }) => ({ ...inventory, templates })))

  estimateLaunch = (body: LaunchInstanceTerraformPayload): Observable<Record<string, unknown>> =>
    this.api.post('terraform/launch-instance/estimate', body)

  planLaunch = (body: LaunchInstanceTerraformPayload): Observable<Record<string, unknown>> =>
    this.api.post('terraform/launch-instance/plan', body)

  applyLaunch = (runId: string, confirmed = true): Observable<Record<string, unknown>> =>
    this.api.post('terraform/launch-instance/apply', { runId, confirmed })

  createRun = (body: Record<string, unknown>): Observable<TerraformRun> =>
    this.api.post<TerraformRun>('terraform/runs', body)

  plan = (id: string): Observable<unknown> =>
    this.api.post(`terraform/runs/${id}/plan`)

  apply = (id: string): Observable<unknown> =>
    this.api.post(`terraform/runs/${id}/apply`)

  logs = (id: string): Observable<unknown> =>
    this.api.get(`terraform/runs/${id}/logs`)

  saveTemplate = (name: string, provider: CloudProvider, config: Record<string, unknown>): Observable<unknown> =>
    this.api.post('terraform/templates', { name, provider, config })
}
