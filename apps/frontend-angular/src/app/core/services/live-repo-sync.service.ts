import { Injectable, OnDestroy, inject, signal } from '@angular/core'
import { catchError, forkJoin, of } from 'rxjs'
import { GithubService } from './github.service'
import { GitlabService } from './gitlab.service'
import { RealtimeService } from './realtime.service'

export type RepoSyncProvider = 'github' | 'gitlab' | 'both'

@Injectable({ providedIn: 'root' })
export class LiveRepoSyncService implements OnDestroy {
  private readonly github = inject(GithubService)
  private readonly gitlab = inject(GitlabService)
  private readonly realtime = inject(RealtimeService)

  private intervalId: ReturnType<typeof setInterval> | null = null
  private refreshFn: (() => void) | null = null
  private wsBound = false

  readonly syncing = signal(false)
  readonly lastSyncAt = signal<Date | null>(null)

  startLive = (refreshFn: () => void, provider: RepoSyncProvider = 'both', intervalMs = 45_000): void => {
    this.stopLive()
    this.refreshFn = refreshFn
    this.bindRealtime()

    const tick = (): void => {
      if (typeof document !== 'undefined' && document.hidden) return
      this.syncSilent(provider).subscribe(() => refreshFn())
    }

    tick()
    this.intervalId = setInterval(tick, intervalMs)
  }

  stopLive = (): void => {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.refreshFn = null
  }

  syncSilent = (provider: RepoSyncProvider = 'both') => {
    this.syncing.set(true)
    const jobs = []

    if (provider === 'github' || provider === 'both') {
      jobs.push(
        this.github.accounts().pipe(
          catchError(() => of({ items: [] as { id: string; status: string }[] })),
        ),
      )
    } else {
      jobs.push(of({ items: [] }))
    }

    if (provider === 'gitlab' || provider === 'both') {
      jobs.push(
        this.gitlab.accounts().pipe(
          catchError(() => of({ items: [] as { id: string; status: string }[] })),
        ),
      )
    } else {
      jobs.push(of({ items: [] }))
    }

    return forkJoin(jobs).pipe(
      catchError(() => of([])),
    )
  }

  triggerRefresh = (): void => {
    this.lastSyncAt.set(new Date())
    this.refreshFn?.()
  }

  private bindRealtime = (): void => {
    if (this.wsBound) return
    this.wsBound = true
    this.realtime.connect()

    const events = [
      'github.synced',
      'github.sync.progress',
      'github.deployment',
      'github.deployment.progress',
      'gitlab.synced',
      'gitlab.deployment',
      'gitlab.sync.progress',
    ] as const

    events.forEach((ev) => {
      this.realtime.on(ev, () => {
        this.lastSyncAt.set(new Date())
        this.refreshFn?.()
      })
    })
  }

  ngOnDestroy(): void {
    this.stopLive()
  }
}
