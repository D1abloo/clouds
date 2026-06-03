import { Injectable, inject } from '@angular/core'
import { Observable, map } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { AuditLog } from '../models/api.models'
import { unwrapList } from '../utils/api-response.util'

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly api = inject(ApiClientService)

  list = (): Observable<AuditLog[]> =>
    this.api.get<unknown>('audit').pipe(map((res) => unwrapList<AuditLog>(res)))
}
