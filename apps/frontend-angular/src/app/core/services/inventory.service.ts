import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of } from 'rxjs'
import type { GithubRepo } from './github.service'
import { ApiClientService } from './api-client.service'
import { CloudProvider } from '../models/api.models'
import { DockerService } from './docker.service'
import { KubernetesService } from './kubernetes.service'
import { buildDemoDashboard, buildDemoProviderSummary } from '../../features/dashboard/utils/dashboard-demo.util'
import { DashboardData } from '../../features/dashboard/dashboard.models'

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly api = inject(ApiClientService)
  private readonly dockerApi = inject(DockerService)
  private readonly kubernetesApi = inject(KubernetesService)

  dashboard = (): Observable<DashboardData> =>
    this.api
      .get<DashboardData>('inventory/dashboard')
      .pipe(
        map((data) => this.mergeDashboard(data)),
        catchError((): Observable<DashboardData> => of(buildDemoDashboard())),
      )

  docker = (): Observable<Record<string, unknown>> =>
    this.dockerApi.pageData().pipe(
      catchError((): Observable<Record<string, unknown>> => of({ hosts: 0, containers: 0, items: [] })),
    )

  kubernetes = (): Observable<Record<string, unknown>> =>
    this.kubernetesApi.pageData().pipe(
      catchError((): Observable<Record<string, unknown>> => of({ clusters: 0, podItems: [] })),
    )

  terraform = (): Observable<Record<string, unknown>> =>
    this.api
      .get<Record<string, unknown>>('inventory/terraform')
      .pipe(catchError((): Observable<Record<string, unknown>> => of({ workspaces: 0, items: [] })))

  jenkins = (): Observable<Record<string, unknown>> =>
    this.api
      .get<Record<string, unknown>>('inventory/jenkins')
      .pipe(catchError((): Observable<Record<string, unknown>> => of({ jobCount: 0, jobItems: [] })))

  github = (): Observable<Record<string, unknown>> =>
    this.api.get<Record<string, unknown>>('inventory/github').pipe(
      catchError((): Observable<Record<string, unknown>> => {
        return this.api.get<{ count: number; items: GithubRepo[] }>('github/demo/repos').pipe(
          map((r) => ({
            connected: true,
            username: 'cloudops-demo',
            demoMode: true,
            repoCount: r.count,
            branchCount: r.count * 4,
            commitCount: r.count * 4,
            openPullRequests: r.count * 2,
            webhookCount: 4,
            deploymentCount: 4,
            repoItems: r.items,
            lastSyncAt: new Date().toISOString(),
          })),
          catchError(() =>
            of({
              connected: true,
              username: 'cloudops-demo',
              demoMode: true,
              repoCount: 12,
              branchCount: 48,
              commitCount: 48,
              openPullRequests: 24,
              webhookCount: 4,
              deploymentCount: 4,
              repoItems: [],
              lastSyncAt: new Date().toISOString(),
            }),
          ),
        )
      }),
    )

  provider = (p: CloudProvider): Observable<Record<string, unknown>> =>
    this.api
      .get<Record<string, unknown>>(`inventory/provider/${p}`)
      .pipe(catchError((): Observable<Record<string, unknown>> => of(buildDemoProviderSummary(p))))

  private mergeDashboard = (data: DashboardData): DashboardData => {
    const demo = buildDemoDashboard()
    if ((data.instanceList?.length ?? 0) > 0) return data
    return { ...demo, ...data, instanceList: demo.instanceList }
  }
}
