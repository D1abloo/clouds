import { Injectable, inject } from '@angular/core'
import { Observable, map } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { TerraformRun, TerraformTemplate } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'

@Injectable({ providedIn: 'root' })
export class TerraformService {
  private readonly api = inject(ApiClientService)

  listTemplates = (): Observable<TerraformTemplate[]> =>
    this.api
      .get<unknown>('terraform/templates')
      .pipe(map((res) => unwrapList<TerraformTemplate>(res)))

  createRun = (body: Record<string, unknown>): Observable<TerraformRun> =>
    this.api.post<TerraformRun>('terraform/runs', body)

  plan = (id: string): Observable<unknown> =>
    this.api.post(`terraform/runs/${id}/plan`)

  apply = (id: string): Observable<unknown> =>
    this.api.post(`terraform/runs/${id}/apply`)

  logs = (id: string): Observable<unknown> =>
    this.api.get(`terraform/runs/${id}/logs`)
}
