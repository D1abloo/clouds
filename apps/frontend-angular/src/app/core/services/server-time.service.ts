import { Injectable, inject, signal, OnDestroy } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'

interface ServerTimeResponse {
  serverTime: string
  timezone: string
}

@Injectable({ providedIn: 'root' })
export class ServerTimeService implements OnDestroy {
  private readonly http = inject(HttpClient)
  private syncTimer: ReturnType<typeof setInterval> | null = null

  readonly offsetMs = signal(0)
  readonly timezone = signal('UTC')
  readonly synced = signal(false)

  init = async (): Promise<void> => {
    await this.sync()
    this.syncTimer = setInterval(() => void this.sync(), 60_000)
  }

  now = (): Date => new Date(Date.now() + this.offsetMs())

  format = (locale = 'es-ES'): string => {
    const d = this.now()
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: this.timezone(),
    }).format(d)
  }

  private sync = async (): Promise<void> => {
    try {
      const res = await firstValueFrom(
        this.http.get<ServerTimeResponse>(`${environment.apiUrl}/platform/server-time`),
      )
      const serverMs = new Date(res.serverTime).getTime()
      this.offsetMs.set(serverMs - Date.now())
      this.timezone.set(res.timezone)
      this.synced.set(true)
    } catch {
      this.synced.set(false)
    }
  }

  ngOnDestroy(): void {
    if (this.syncTimer) clearInterval(this.syncTimer)
  }
}
