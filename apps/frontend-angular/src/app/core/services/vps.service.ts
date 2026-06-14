import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { ProModeService } from './pro-mode.service'
import { VpsHost } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'

@Injectable({ providedIn: 'root' })
export class VpsService {
  private readonly api = inject(ApiClientService)
  private readonly pro = inject(ProModeService)

  list = (): Observable<VpsHost[]> =>
    this.api.get<unknown>('vps').pipe(
      map((res) => {
        const rows = unwrapList<VpsHost>(res)
        if (rows.length) return rows
        return []
      }),
      catchError(() => of([])),
    )

  getOne = (id: string): Observable<VpsHost> =>
    this.api.get<VpsHost>(`vps/${id}`)

  create = (body: Partial<VpsHost> & { password?: string; hostname?: string; username?: string }): Observable<VpsHost> =>
    this.api.post<VpsHost>('vps', body)

  validate = (id: string): Observable<unknown> =>
    this.api.post(`vps/${id}/validate`)

  execute = (id: string, command: string): Observable<unknown> =>
    this.api.post(`vps/${id}/execute`, { command })

  validatePreview = (body: {
    projectId?: string
    name?: string
    hostname: string
    port?: number
    username?: string
    password?: string
  }): Observable<{ valid: boolean; message?: string }> =>
    this.api.post('vps/validate-preview', body)

  detectOsPreview = (body: {
    hostname: string
    port?: number
    username?: string
  }): Observable<{ detected: boolean; osFamily: 'linux' | 'windows'; osName: string; message: string }> =>
    this.api.post('vps/detect-os-preview', body)

  detectRuntime = (
    id: string,
    body: { probeDocker?: boolean; probeKubernetes?: boolean },
  ): Observable<VpsRuntimeProbeResult> =>
    this.api.post<VpsRuntimeProbeResult>(`vps/${id}/detect-runtime`, body)
}

export interface VpsRuntimeContainer {
  name: string
  image: string
  status: string
  cpu: number
  ram: number
  disk: number
  networkMbps: number
}

export interface VpsRuntimeProbeResult {
  docker: boolean
  kubernetes: boolean
  containers: VpsRuntimeContainer[]
  navigationHints: { section: string; label: string; route: string }[]
  message: string
}
