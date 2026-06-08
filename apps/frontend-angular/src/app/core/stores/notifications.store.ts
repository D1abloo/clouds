import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core'
import { NotificationsService } from '../services/notifications.service'
import { RealtimeService } from '../services/realtime.service'

export interface NotificationUnreadSummary {
  total: number
  bySection: Record<string, number>
}

@Injectable({ providedIn: 'root' })
export class NotificationsStore implements OnDestroy {
  private readonly notificationsSvc = inject(NotificationsService)
  private readonly realtime = inject(RealtimeService)

  private readonly _summary = signal<NotificationUnreadSummary>({ total: 0, bySection: {} })
  readonly summary = this._summary.asReadonly()
  readonly unreadTotal = computed(() => this._summary().total)

  private intervalId?: ReturnType<typeof setInterval>

  constructor() {
    this.load()
    this.intervalId = setInterval(() => this.load(), 60_000)
    this.realtime.on('inventory.updated', () => this.load())
  }

  unreadForSection = (section?: string): number => {
    if (!section) return 0
    return this._summary().bySection[section] ?? 0
  }

  load = (): void => {
    this.notificationsSvc.unreadSummary().subscribe({
      next: (data) => this._summary.set(data),
      error: () => this._summary.set({ total: 0, bySection: {} }),
    })
  }

  markRead = (id: string): void => {
    this.notificationsSvc.markRead(id).subscribe({
      next: () => this.load(),
      error: () => this.load(),
    })
  }

  markAllRead = (): void => {
    this.notificationsSvc.markAllRead().subscribe({
      next: () => this.load(),
      error: () => this.load(),
    })
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId)
  }
}
