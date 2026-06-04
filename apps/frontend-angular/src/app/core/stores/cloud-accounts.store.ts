import { Injectable, inject, signal, computed } from '@angular/core'
import { CloudAccountsService } from '../services/cloud-accounts.service'
import { CloudAccount, CloudProvider } from '../models/api.models'
import { RealtimeService } from '../services/realtime.service'

@Injectable({ providedIn: 'root' })
export class CloudAccountsStore {
  private readonly cloudSvc = inject(CloudAccountsService)
  private readonly realtime = inject(RealtimeService)

  private readonly _accounts = signal<CloudAccount[]>([])
  private readonly _loading = signal(false)
  readonly accounts = this._accounts.asReadonly()
  readonly loading = this._loading.asReadonly()

  constructor() {
    this.load()
    this.realtime.on('account.updated', () => this.load())
    this.realtime.on('inventory.updated', () => this.load())
  }

  accountsByProvider = (provider: CloudProvider): CloudAccount[] =>
    this._accounts().filter((a) => a.provider === provider)

  countByProvider = computed(() => {
    const counts: Record<string, number> = { AWS: 0, GCP: 0, AZURE: 0 }
    for (const a of this._accounts()) {
      if (a.provider in counts) counts[a.provider]++
    }
    return counts as Record<'AWS' | 'GCP' | 'AZURE', number>
  })

  load = (): void => {
    this._loading.set(true)
    this.cloudSvc.list().subscribe({
      next: (list) => {
        this._accounts.set(list)
        this._loading.set(false)
      },
      error: () => {
        this._accounts.set(this.demoAccounts())
        this._loading.set(false)
      },
    })
  }

  private demoAccounts = (): CloudAccount[] => [
    { id: 'demo-aws', name: 'AWS Production', provider: 'AWS', defaultRegion: 'eu-west-1', syncStatus: 'ok' },
    { id: 'demo-gcp', name: 'GCP Analytics', provider: 'GCP', defaultRegion: 'europe-west1-b', syncStatus: 'ok' },
    { id: 'demo-azure', name: 'Azure Core', provider: 'AZURE', defaultRegion: 'westeurope', syncStatus: 'ok' },
  ]
}
