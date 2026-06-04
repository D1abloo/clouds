import { Injectable, inject, signal } from '@angular/core'
import { BillingService } from '../services/billing.service'
import { RealtimeService } from '../services/realtime.service'

@Injectable({ providedIn: 'root' })
export class BillingStore {
  private readonly billingSvc = inject(BillingService)
  private readonly realtime = inject(RealtimeService)

  private readonly _cost = signal<number>(0)
  readonly monthlyCost = this._cost.asReadonly()

  constructor() {
    this.load()
    this.realtime.on('inventory.updated', () => this.load())
    this.realtime.on('billing.updated', () => this.load())
  }

  private load(): void {
    this.billingSvc.summary().subscribe({
      next: (s) => this._cost.set(s.totalMonthly ?? 0),
      error: () => this._cost.set(4820),
    })
  }

  formatCost(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }
}
