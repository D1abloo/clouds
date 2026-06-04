import { Injectable, inject, signal, OnDestroy } from '@angular/core'
import { AlertsService } from '../services/alerts.service'
import { RealtimeService } from '../services/realtime.service'

@Injectable({ providedIn: 'root' })
export class AlertsStore implements OnDestroy {
  private readonly alertsSvc = inject(AlertsService)
  private readonly realtime = inject(RealtimeService)

  private readonly _active = signal<number>(0)
  readonly activeAlerts = this._active.asReadonly()

  private intervalId?: ReturnType<typeof setInterval>

  constructor() {
    this.load()
    this.intervalId = setInterval(() => this.load(), 60_000)
    this.realtime.on('inventory.updated', () => this.load())
  }

  private load(): void {
    this.alertsSvc.list().subscribe({
      next: (list) => this._active.set(list.filter((a) => a.status === 'active').length),
      error: () => {},
    })
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId)
  }
}
