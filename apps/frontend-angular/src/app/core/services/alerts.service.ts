import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { AlertItem } from '../models/api.models'

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly api = inject(ApiClientService)

  list = (): Observable<AlertItem[]> => this.api.get<AlertItem[]>('alerts')

  resolve = (id: string): Observable<unknown> =>
    this.api.post(`alerts/${id}/resolve`)
}
