import { Injectable, inject } from '@angular/core'
import { Observable, map } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { DashboardStats } from '../models/api.models'

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiClientService)

  getStats = (): Observable<DashboardStats> =>
    this.api.get<Record<string, unknown>>('metrics/dashboard').pipe(
      map((raw) => ({
        totalInstances: raw['totalInstances'] as number | undefined,
        runningInstances: raw['runningInstances'] as number | undefined,
        cloudAccounts: (raw['cloudAccounts'] ?? raw['cloudAccountCount']) as number | undefined,
        vpsHosts: (raw['vpsHosts'] ?? raw['activeVps']) as number | undefined,
        alertsOpen: (raw['alertsOpen'] ?? raw['activeAlerts']) as number | undefined,
        monthlySpend: (raw['monthlySpend'] ?? raw['totalMonthly']) as number | undefined,
      })),
    )
}
