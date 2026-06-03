import { Injectable, inject } from '@angular/core'
import { Observable, map } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { VpsHost } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'

@Injectable({ providedIn: 'root' })
export class VpsService {
  private readonly api = inject(ApiClientService)

  list = (): Observable<VpsHost[]> =>
    this.api.get<unknown>('vps').pipe(map((res) => unwrapList<VpsHost>(res)))

  getOne = (id: string): Observable<VpsHost> =>
    this.api.get<VpsHost>(`vps/${id}`)

  create = (body: Partial<VpsHost>): Observable<VpsHost> =>
    this.api.post<VpsHost>('vps', body)

  validate = (id: string): Observable<unknown> =>
    this.api.post(`vps/${id}/validate`)

  execute = (id: string, command: string): Observable<unknown> =>
    this.api.post(`vps/${id}/execute`, { command })
}
