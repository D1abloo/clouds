import { Injectable, inject, signal, computed } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { ApiClientService } from './api-client.service'
import { ToastService } from './toast.service'
import { AuthService } from './auth.service'
import { ProModeService } from './pro-mode.service'
import { finalize } from 'rxjs'
import { environment } from '../../../environments/environment'

export interface DemoStatus {
  enabled: boolean
  instances: number
  vps: number
  alerts: number
  metrics: number
  message: string
}

/** Valores estimados cuando el backend no responde (UI demo autónoma). */
const DEMO_FALLBACK_STATUS: DemoStatus = {
  enabled: environment.demoMode,
  instances: 48,
  vps: 12,
  alerts: 32,
  metrics: 1240,
  message: 'Modo demo local — backend no disponible; contadores estimados del dataset',
}

@Injectable({ providedIn: 'root' })
export class DemoService {
  private readonly api = inject(ApiClientService)
  private readonly toast = inject(ToastService)
  private readonly auth = inject(AuthService)
  private readonly proModeSvc = inject(ProModeService)

  readonly loading = signal(false)
  readonly statusLoading = signal(false)
  readonly statusOffline = signal(false)
  readonly status = signal<DemoStatus | null>(null)

  readonly demoMode = computed(
    () => this.proModeSvc.status()?.demoMode ?? this.status()?.enabled ?? environment.demoMode,
  )

  readonly canManageDemo = computed(() => {
    const roles = this.auth.user()?.roles ?? []
    return (
      roles.includes('superadministrador') ||
      roles.includes('administrador') ||
      roles.includes('super_admin') ||
      roles.includes('admin')
    )
  })

  refreshStatus = (): void => {
    this.statusLoading.set(true)
    this.api
      .get<DemoStatus>('demo/status')
      .pipe(finalize(() => this.statusLoading.set(false)))
      .subscribe({
        next: (s) => {
          this.statusOffline.set(false)
          this.status.set(s)
        },
        error: () => {
          this.statusOffline.set(true)
          this.status.set(DEMO_FALLBACK_STATUS)
        },
      })
  }

  loadDemo = (): void => {
    if (!this.canManageDemo()) {
      this.toast.error('Solo usuarios admin pueden cargar datos demo')
      return
    }
    this.loading.set(true)
    this.api
      .post<DemoStatus>('demo/seed')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.toast.success(`Demo cargado (${res.instances ?? 0} instancias, ${res.vps ?? 0} VPS)`)
          this.refreshStatus()
          window.location.reload()
        },
        error: (err: HttpErrorResponse) =>
          this.toast.error(this.extractError(err, 'No se pudieron cargar los datos demo')),
      })
  }

  resetDemo = (): void => {
    if (!this.canManageDemo()) {
      this.toast.error('Solo usuarios admin pueden resetear datos demo')
      return
    }
    this.loading.set(true)
    this.api
      .post<DemoStatus>('demo/reset')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.toast.success(`Demo reseteado (${res.instances} instancias, ${res.vps} VPS)`)
          this.refreshStatus()
          window.location.reload()
        },
        error: (err: HttpErrorResponse) =>
          this.toast.error(this.extractError(err, 'No se pudo resetear el demo')),
      })
  }

  private extractError = (err: HttpErrorResponse, fallback: string): string => {
    const msg = err.error?.message
    if (Array.isArray(msg)) return msg.join(', ')
    if (typeof msg === 'string') return msg
    return fallback
  }
}
