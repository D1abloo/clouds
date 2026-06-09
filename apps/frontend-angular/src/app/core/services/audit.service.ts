import { Injectable, inject } from '@angular/core'
import { Observable, catchError, map, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { ProModeService } from './pro-mode.service'
import { AuditLog } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'
import { emptyAuditLogs } from '../demo/pro-empty.data'

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly api = inject(ApiClientService)
  private readonly pro = inject(ProModeService)

  list = (): Observable<AuditLog[]> =>
    this.api.get<unknown>('audit').pipe(
      map((res) => {
        const rows = unwrapList<AuditLog>(res)
        if (rows.length) return rows
        return emptyAuditLogs()
      }),
      catchError(() => of(emptyAuditLogs())),
    )
}
