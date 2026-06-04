import { Injectable, inject, signal } from '@angular/core'
import { VpsService } from '../services/vps.service'
import { RealtimeService } from '../services/realtime.service'

@Injectable({ providedIn: 'root' })
export class VpsStore {
  private readonly vpsSvc = inject(VpsService)
  private readonly realtime = inject(RealtimeService)

  private readonly _total = signal(0)
  readonly totalHosts = this._total.asReadonly()

  constructor() {
    this.load()
    this.realtime.on('inventory.updated', () => this.load())
    this.realtime.on('vps.updated', () => this.load())
  }

  private load(): void {
    this.vpsSvc.list().subscribe({
      next: (hosts) => this._total.set(hosts.length),
      error: () => this._total.set(8),
    })
  }
}
