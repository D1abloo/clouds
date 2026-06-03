import { Injectable, inject } from '@angular/core'
import { Observable, map } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { BillingSummary, CloudProvider } from '../models/api.models'

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly api = inject(ApiClientService)

  summary = (): Observable<BillingSummary> =>
    this.api.get<Record<string, unknown>>('billing/summary').pipe(
      map((raw) => {
        const byProvider = (raw['byProvider'] as Record<string, number>) ?? {}
        const totalMonthly =
          (raw['totalMonthly'] as number) ??
          (raw['totalCost'] as number) ??
          Object.values(byProvider).reduce((s, v) => s + v, 0)
        return {
          totalCost: totalMonthly,
          byProvider,
          currency: (raw['currency'] as string) ?? 'USD',
          period: (raw['period'] as string) ?? 'Current month',
        } satisfies BillingSummary
      }),
    )

  sync = (provider: CloudProvider, accountId: string): Observable<unknown> =>
    this.api.post(`billing/sync/${provider}/${accountId}`)
}
