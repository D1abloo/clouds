import { Injectable, inject } from '@angular/core'
import { Observable, catchError, forkJoin, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { CloudProvider, TerraformRun, TerraformTemplate } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'
import { RealtimeService } from './realtime.service'

export interface LaunchInstanceTerraformPayload {
  provider: CloudProvider
  region: string
  instanceType: string
  name?: string
  cloudAccountId?: string
  workspaceName?: string
  config?: Record<string, unknown>
}

export interface TerraformPreviewResult {
  hcl: string
  plan: string
}

@Injectable({ providedIn: 'root' })
export class TerraformService {
  private readonly api = inject(ApiClientService)
  private readonly realtime = inject(RealtimeService)

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

  preview = (body: LaunchInstanceTerraformPayload): Observable<TerraformPreviewResult> =>
    this.api.post<TerraformPreviewResult>('terraform/preview', body)

  createRun = (body: Record<string, unknown>): Observable<TerraformRun> =>
    this.api.post<TerraformRun>('terraform/runs', body)

  init = (id: string): Observable<unknown> =>
    this.api.post(`terraform/runs/${id}/init`, {})

  plan = (id: string): Observable<unknown> =>
    this.api.post(`terraform/runs/${id}/plan`, {})

  apply = (id: string, confirmed = true): Observable<unknown> =>
    this.api.post(`terraform/runs/${id}/apply`, { confirmed })

  destroy = (id: string, confirmed: boolean, reinforced: boolean): Observable<unknown> =>
    this.api.post(`terraform/runs/${id}/destroy`, { confirmed, reinforced })

  logs = (id: string): Observable<unknown> =>
    this.api.get(`terraform/runs/${id}/logs`)

  saveTemplate = (name: string, provider: CloudProvider, config: Record<string, unknown>): Observable<unknown> =>
    this.api.post('terraform/templates', { name, provider, config })

  /** Subscribe to log lines for a run via WebSocket */
  streamLogs = (runId: string): Observable<string> =>
    new Observable((subscriber) => {
      const handler = (payload: unknown): void => {
        const data = payload as { runId?: string; line?: string; message?: string }
        if (data.runId && data.runId !== runId) return
        const line = data.line ?? data.message
        if (line) subscriber.next(line)
      }
      this.realtime.on('terraform.run.log', handler)
      return () => this.realtime.off('terraform.run.log', handler)
    })
}
