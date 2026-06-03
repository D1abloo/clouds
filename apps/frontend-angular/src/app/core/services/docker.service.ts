import { Injectable, inject } from '@angular/core'
import { Observable, catchError, forkJoin, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { unwrapList } from '../utils/api-response.util'

export type DockerContainerRow = Record<string, unknown>
export type DockerPageData = Record<string, unknown>

@Injectable({ providedIn: 'root' })
export class DockerService {
  private readonly api = inject(ApiClientService)

  overview = (): Observable<Record<string, unknown>> =>
    this.api.get<Record<string, unknown>>('docker/overview')

  hosts = (): Observable<Record<string, unknown>[]> =>
    this.api.get<unknown>('docker/hosts').pipe(map((res) => unwrapList(res)))

  containers = (hostId?: string): Observable<DockerContainerRow[]> =>
    this.api
      .get<unknown>('docker/containers', hostId ? { hostId } : undefined)
      .pipe(map((res) => unwrapList<DockerContainerRow>(res)))

  images = (): Observable<Record<string, unknown>[]> =>
    this.api.get<unknown>('docker/images').pipe(map((res) => unwrapList(res)))

  networks = (): Observable<Record<string, unknown>[]> =>
    this.api.get<unknown>('docker/networks').pipe(map((res) => unwrapList(res)))

  volumes = (): Observable<Record<string, unknown>[]> =>
    this.api.get<unknown>('docker/volumes').pipe(map((res) => unwrapList(res)))

  metrics = (): Observable<Record<string, unknown>> =>
    this.api.get<Record<string, unknown>>('docker/metrics')

  /** Aggregates overview + containers for the Docker page. */
  pageData = (): Observable<DockerPageData> =>
    forkJoin({
      overview: this.overview().pipe(catchError(() => of({}))),
      items: this.containers().pipe(catchError(() => of([] as DockerContainerRow[]))),
      hostRows: this.hosts().pipe(catchError(() => of([]))),
      imageRows: this.images().pipe(catchError(() => of([]))),
      networkRows: this.networks().pipe(catchError(() => of([]))),
      volumeRows: this.volumes().pipe(catchError(() => of([]))),
    }).pipe(
      map(({ overview, items, hostRows, imageRows, networkRows, volumeRows }) => ({
        ...overview,
        items,
        hostRows,
        imageRows,
        networkRows,
        volumeRows,
      })),
    )
}
