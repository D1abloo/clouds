import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { ProModeService } from './pro-mode.service'
import { CloudProvider } from '../models/api.models'
import { DockerService } from './docker.service'
import { KubernetesService } from './kubernetes.service'
import { demoJenkinsInventory, normalizeJenkinsInventory } from '../../features/jenkins/jenkins.demo'
import { buildDemoDashboard, buildDemoProviderSummary } from '../../features/dashboard/utils/dashboard-demo.util'
import { DashboardData } from '../../features/dashboard/dashboard.models'
import { allowsDemoDataFrom } from '../utils/demo-runtime.util'
import {
  emptyDashboard,
  emptyGithubInventory,
  emptyJenkinsInventory,
  emptyProviderSummary,
} from '../demo/pro-empty.data'

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly api = inject(ApiClientService)
  private readonly dockerApi = inject(DockerService)
  private readonly kubernetesApi = inject(KubernetesService)
  private readonly pro = inject(ProModeService)

  dashboard = (): Observable<DashboardData> =>
    this.api.get<DashboardData>('inventory/dashboard').pipe(
      map((data) => this.mergeDashboard(data)),
      catchError(() =>
        of(allowsDemoDataFrom(this.pro) ? buildDemoDashboard() : emptyDashboard()),
      ),
    )

  docker = (): Observable<Record<string, unknown>> =>
    this.dockerApi.pageData().pipe(
      catchError(() => of({ hosts: 0, containers: 0, items: [] })),
    )

  kubernetes = (): Observable<Record<string, unknown>> =>
    this.kubernetesApi.pageData().pipe(
      catchError(() => of({ clusters: 0, podItems: [] })),
    )

  terraform = (): Observable<Record<string, unknown>> =>
    this.api.get<Record<string, unknown>>('inventory/terraform').pipe(
      catchError(() => of({ workspaces: 0, items: [] })),
    )

  jenkins = (): Observable<Record<string, unknown>> =>
    this.api.get<Record<string, unknown>>('inventory/jenkins').pipe(
      map((data) => this.mergeJenkins(data)),
      catchError(() =>
        of(
          allowsDemoDataFrom(this.pro)
            ? (demoJenkinsInventory() as unknown as Record<string, unknown>)
            : emptyJenkinsInventory(),
        ),
      ),
    )

  github = (): Observable<Record<string, unknown>> =>
    this.api.get<Record<string, unknown>>('inventory/github').pipe(
      catchError(() => of(emptyGithubInventory())),
    )

  provider = (p: CloudProvider): Observable<Record<string, unknown>> =>
    this.api.get<Record<string, unknown>>(`inventory/provider/${p}`).pipe(
      catchError(() =>
        of(allowsDemoDataFrom(this.pro) ? buildDemoProviderSummary(p) : emptyProviderSummary(p)),
      ),
    )

  private mergeDashboard = (data: DashboardData): DashboardData => {
    if ((data.instanceList?.length ?? 0) > 0) return data
    if (!allowsDemoDataFrom(this.pro)) return { ...emptyDashboard(), ...data, instanceList: [] }
    const demo = buildDemoDashboard()
    return { ...demo, ...data, instanceList: demo.instanceList }
  }

  private mergeJenkins = (data: Record<string, unknown>): Record<string, unknown> =>
    normalizeJenkinsInventory(data, allowsDemoDataFrom(this.pro)) as unknown as Record<string, unknown>
}
