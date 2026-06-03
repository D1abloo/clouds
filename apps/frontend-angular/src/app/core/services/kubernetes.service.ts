import { Injectable, inject } from '@angular/core'
import { Observable, catchError, forkJoin, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { unwrapList } from '../utils/api-response.util'

export type KubernetesPodRow = Record<string, unknown>
export type KubernetesPageData = Record<string, unknown>

@Injectable({ providedIn: 'root' })
export class KubernetesService {
  private readonly api = inject(ApiClientService)

  overview = (): Observable<Record<string, unknown>> =>
    this.api.get<Record<string, unknown>>('kubernetes/overview')

  clusters = (): Observable<Record<string, unknown>[]> =>
    this.api.get<unknown>('kubernetes/clusters').pipe(map((res) => unwrapList(res)))

  nodes = (): Observable<Record<string, unknown>[]> =>
    this.api.get<unknown>('kubernetes/nodes').pipe(map((res) => unwrapList(res)))

  namespaces = (): Observable<Record<string, unknown>[]> =>
    this.api.get<unknown>('kubernetes/namespaces').pipe(map((res) => unwrapList(res)))

  pods = (namespace?: string): Observable<KubernetesPodRow[]> =>
    this.api
      .get<unknown>('kubernetes/pods', namespace ? { namespace } : undefined)
      .pipe(map((res) => unwrapList<KubernetesPodRow>(res)))

  deployments = (namespace?: string): Observable<Record<string, unknown>[]> =>
    this.api
      .get<unknown>('kubernetes/deployments', namespace ? { namespace } : undefined)
      .pipe(map((res) => unwrapList(res)))

  services = (namespace?: string): Observable<Record<string, unknown>[]> =>
    this.api
      .get<unknown>('kubernetes/services', namespace ? { namespace } : undefined)
      .pipe(map((res) => unwrapList(res)))

  events = (): Observable<Record<string, unknown>[]> =>
    this.api.get<unknown>('kubernetes/events').pipe(map((res) => unwrapList(res)))

  metrics = (): Observable<Record<string, unknown>> =>
    this.api.get<Record<string, unknown>>('kubernetes/metrics')

  /** Aggregates overview + resource lists for the Kubernetes page. */
  pageData = (): Observable<KubernetesPageData> =>
    forkJoin({
      overview: this.overview().pipe(catchError(() => of({}))),
      podItems: this.pods().pipe(catchError(() => of([] as KubernetesPodRow[]))),
      clusterRows: this.clusters().pipe(catchError(() => of([]))),
      nodeRows: this.nodes().pipe(catchError(() => of([]))),
      namespaceRows: this.namespaces().pipe(catchError(() => of([]))),
      deploymentRows: this.deployments().pipe(catchError(() => of([]))),
      serviceRows: this.services().pipe(catchError(() => of([]))),
      eventRows: this.events().pipe(catchError(() => of([]))),
    }).pipe(
      map(({ overview, podItems, clusterRows, nodeRows, namespaceRows, deploymentRows, serviceRows, eventRows }) => {
        const o = overview as Record<string, unknown>
        return {
          clusters: o['clusters'] ?? clusterRows.length,
          namespaceCount: o['namespaces'] ?? namespaceRows.length,
          podCount: o['pods'] ?? podItems.length,
          deployments: o['deployments'] ?? deploymentRows.length,
          services: o['services'] ?? serviceRows.length,
          podsWithError: o['podsWithError'] ?? 0,
          nodes: o['nodes'] ?? nodeRows.length,
          health: o['health'],
          podItems,
          clusterRows,
          nodeRows,
          namespaceRows,
          deploymentRows,
          serviceRows,
          eventRows,
        }
      }),
    )
}
