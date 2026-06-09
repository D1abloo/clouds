import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { CloudProvider } from '../models/api.models'
import { DockerService } from './docker.service'
import { KubernetesService } from './kubernetes.service'
import { normalizeJenkinsInventory } from '../../features/jenkins/jenkins.util'
import { DashboardData } from '../../features/dashboard/dashboard.models'
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

  dashboard = (): Observable<DashboardData> =>
    this.api.get<DashboardData>('inventory/dashboard').pipe(
      map((data) => this.mergeDashboard(data)),
      catchError(() => of(emptyDashboard())),
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
      catchError(() => of(emptyJenkinsInventory())),
    )

  github = (): Observable<Record<string, unknown>> =>
    this.api.get<Record<string, unknown>>('inventory/github').pipe(
      catchError(() => of(emptyGithubInventory())),
    )

  provider = (p: CloudProvider): Observable<Record<string, unknown>> =>
    this.api.get<Record<string, unknown>>(`inventory/provider/${p}`).pipe(
      catchError(() => of(emptyProviderSummary(p))),
    )

  private mergeDashboard = (data: DashboardData): DashboardData => {
    if ((data.instanceList?.length ?? 0) > 0) return data
    return { ...emptyDashboard(), ...data, instanceList: [] }
  }

  private mergeJenkins = (data: Record<string, unknown>): Record<string, unknown> =>
    normalizeJenkinsInventory(data) as unknown as Record<string, unknown>
}
