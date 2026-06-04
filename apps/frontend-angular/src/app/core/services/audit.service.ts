import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { AuditLog } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'
import { demoAuditLogs } from '../demo/demo-fallback.data'

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly api = inject(ApiClientService)

  list = (): Observable<AuditLog[]> =>
    this.api.get<unknown>('audit').pipe(
      map((res) => {
        const rows = unwrapList<AuditLog>(res)
        return rows.length ? rows : demoAuditLogs()
      }),
      catchError(() => of(demoAuditLogs())),
    )
}
