import { Injectable, OnDestroy, inject, signal } from '@angular/core'
import { Observable, catchError, finalize, of, tap } from 'rxjs'
import { CloudAccountsService } from './cloud-accounts.service'

@Injectable({ providedIn: 'root' })
export class LiveCloudSyncService implements OnDestroy {
  private readonly accounts = inject(CloudAccountsService)

  private intervalId: ReturnType<typeof setInterval> | null = null
  private pollFn: (() => void) | null = null

  readonly syncing = signal(false)
  readonly lastSyncAt = signal<Date | null>(null)
  readonly error = signal<string | null>(null)

  startPolling = (syncFn: () => void, intervalMs = 60_000): void => {
    this.stopPolling()
    this.pollFn = syncFn

    const tick = (): void => {
      if (typeof document !== 'undefined' && document.hidden) return
      syncFn()
    }

    tick()
    this.intervalId = setInterval(tick, intervalMs)
  }

  stopPolling = (): void => {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.pollFn = null
  }

  syncAllAccounts = (): Observable<{ accounts: number; instances: number }> => {
    this.syncing.set(true)
    this.error.set(null)

    return this.accounts.syncAll().pipe(
      tap(() => this.lastSyncAt.set(new Date())),
      catchError((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Error al sincronizar cuentas cloud'
        this.error.set(message)
        return of({ accounts: 0, instances: 0 })
      }),
      finalize(() => this.syncing.set(false)),
    )
  }

  syncAllAccountsSilent = (): Observable<{ accounts: number; instances: number }> =>
    this.accounts.syncAll().pipe(
      tap(() => this.lastSyncAt.set(new Date())),
      catchError(() => of({ accounts: 0, instances: 0 })),
    )

  ngOnDestroy(): void {
    this.stopPolling()
  }
}
