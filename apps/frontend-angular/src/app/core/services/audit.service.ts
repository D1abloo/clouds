import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { AuditLog } from '../models/api.models'

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly api = inject(ApiClientService)

  list = (): Observable<AuditLog[]> => this.api.get<AuditLog[]>('audit')
}
