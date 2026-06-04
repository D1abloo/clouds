import { Injectable, inject, signal } from '@angular/core'
import { catchError, forkJoin, of } from 'rxjs'
import { CloudAccountsService } from '../services/cloud-accounts.service'
import { InventoryService } from '../services/inventory.service'
import { RealtimeService } from '../services/realtime.service'

export type ProviderStatus = 'ok' | 'warn' | 'error'

export interface ProviderStat {
  provider: 'AWS' | 'GCP' | 'AZURE'
  accounts: number
  instances: number
  status: ProviderStatus
}

const DEFAULT_STATS: ProviderStat[] = [
  { provider: 'AWS', accounts: 0, instances: 0, status: 'ok' },
  { provider: 'GCP', accounts: 0, instances: 0, status: 'ok' },
  { provider: 'AZURE', accounts: 0, instances: 0, status: 'ok' },
]

const DEMO_INSTANCES: Record<'AWS' | 'GCP' | 'AZURE', number> = {
  AWS: 6,
  GCP: 6,
  AZURE: 6,
}

@Injectable({ providedIn: 'root' })
export class CloudStore {
  private readonly cloudSvc = inject(CloudAccountsService)
  private readonly inventory = inject(InventoryService)
  private readonly realtime = inject(RealtimeService)

  private readonly _stats = signal<ProviderStat[]>(DEFAULT_STATS)
  readonly providerStats = this._stats.asReadonly()

  constructor() {
    this.load()
    this.realtime.on('inventory.updated', () => this.load())
    this.realtime.on('account.updated', () => this.load())
    this.realtime.on('alert.created', () => this.load())
  }

  private load(): void {
    forkJoin({
      accounts: this.cloudSvc.list().pipe(catchError(() => of([]))),
      dashboard: this.inventory.dashboard().pipe(catchError(() => of(null))),
    }).subscribe(({ accounts, dashboard }) => {
      const providers = (dashboard?.providers ?? {}) as Record<string, { instances?: number; alerts?: number }>
      const providersKeys: ('AWS' | 'GCP' | 'AZURE')[] = ['AWS', 'GCP', 'AZURE']

      this._stats.set(
        providersKeys.map((p) => {
          const pAccounts = accounts.filter((a) => a.provider === p)
          const meta = providers[p] ?? providers[p === 'AZURE' ? 'AZURE' : p]
          let status: ProviderStatus = 'ok'
          if (pAccounts.some((a) => a.syncStatus === 'error')) status = 'error'
          else if (
            pAccounts.some((a) => a.syncStatus === 'warning' || a.syncStatus === 'syncing') ||
            (meta?.alerts ?? 0) > 0
          ) {
            status = 'warn'
          }
          return {
            provider: p,
            accounts: pAccounts.length,
            instances: meta?.instances ?? DEMO_INSTANCES[p],
            status,
          }
        }),
      )
    })
  }
}
