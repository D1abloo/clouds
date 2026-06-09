import { Injectable, inject, signal, computed } from '@angular/core'
import { catchError, of, tap } from 'rxjs'
import { ApiClientService } from './api-client.service'
import { environment } from '../../../environments/environment'

export type PlatformStatusDto = {
  demoMode: boolean
  proMode: boolean
  appEnv?: string
  authUrl: string
  appUrl?: string
  oauth: { google: boolean; github: boolean }
  message: string
  database?: { connected: boolean; latencyMs: number | null; error?: string }
  counts?: { users: number; instances: number; alerts: number }
}

@Injectable({ providedIn: 'root' })
export class ProModeService {
  private readonly api = inject(ApiClientService)

  readonly status = signal<PlatformStatusDto | null>(null)
  readonly loaded = signal(false)

  readonly proMode = computed(() => this.status()?.proMode ?? environment.proMode)
  readonly demoMode = computed(() => this.status()?.demoMode ?? environment.demoMode)
  readonly showDemoLogin = computed(() => {
    if (environment.proMode && !environment.demoMode) return false
    if (this.proMode() && !this.demoMode()) return false
    return this.demoMode()
  })
  readonly databaseConnected = computed(() => this.status()?.database?.connected ?? false)
  readonly oauthGithubEnabled = computed(() => this.status()?.oauth?.github ?? false)

  loadStatus = (): void => {
    this.api
      .get<PlatformStatusDto>('platform/status')
      .pipe(
        tap((s) => {
          this.status.set(s)
          this.loaded.set(true)
        }),
        catchError(() => {
          this.status.set({
            demoMode: environment.demoMode,
            proMode: environment.proMode,
            authUrl: environment.authUrl ?? 'http://localhost:4200',
            oauth: { google: false, github: false },
            message: environment.proMode
              ? 'Modo PRO — conecta tus integraciones en Configuración'
              : 'Entorno local — backend no disponible',
          })
          this.loaded.set(true)
          return of(null)
        }),
      )
      .subscribe()
  }
}
