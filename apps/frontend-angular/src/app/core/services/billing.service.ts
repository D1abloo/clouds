import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { BillingSummary, CloudProvider } from '../models/api.models'

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly api = inject(ApiClientService)

  summary = (): Observable<BillingSummary> =>
    this.api.get<BillingSummary>('billing/summary')

  sync = (provider: CloudProvider, accountId: string): Observable<unknown> =>
    this.api.post(`billing/sync/${provider}/${accountId}`)
}
