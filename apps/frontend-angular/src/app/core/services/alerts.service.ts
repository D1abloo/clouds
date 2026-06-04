import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { AlertItem } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'
import { demoAlerts } from '../demo/demo-fallback.data'

type RawAlert = {
  id: string
  message?: string
  severity: string
  isResolved?: boolean
  createdAt: string
  rule?: { name?: string }
}

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly api = inject(ApiClientService)

  list = (): Observable<AlertItem[]> =>
    this.api.get<unknown>('alerts').pipe(
      map((res) => {
        const mapped = unwrapList<RawAlert>(res).map((a) => ({
          id: a.id,
          title: a.rule?.name ?? a.message ?? 'Alert',
          severity: a.severity,
          status: a.isResolved ? 'resolved' : 'active',
          createdAt: a.createdAt,
        }))
        return mapped.length ? mapped : demoAlerts()
      }),
      catchError(() => of(demoAlerts())),
    )

  resolve = (id: string): Observable<unknown> =>
    this.api.post(`alerts/${id}/resolve`)
}
