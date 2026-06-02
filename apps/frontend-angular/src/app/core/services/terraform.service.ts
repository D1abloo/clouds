import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { TerraformRun, TerraformTemplate } from '../models/api.models'

@Injectable({ providedIn: 'root' })
export class TerraformService {
  private readonly api = inject(ApiClientService)

  listTemplates = (): Observable<TerraformTemplate[]> =>
    this.api.get<TerraformTemplate[]>('terraform/templates')

  createRun = (body: Record<string, unknown>): Observable<TerraformRun> =>
    this.api.post<TerraformRun>('terraform/runs', body)

  plan = (id: string): Observable<unknown> =>
    this.api.post(`terraform/runs/${id}/plan`)

  apply = (id: string): Observable<unknown> =>
    this.api.post(`terraform/runs/${id}/apply`)

  logs = (id: string): Observable<unknown> =>
    this.api.get(`terraform/runs/${id}/logs`)
}
