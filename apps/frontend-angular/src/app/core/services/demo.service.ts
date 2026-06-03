import { Injectable, inject, signal, computed } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { ApiClientService } from './api-client.service'
import { ToastService } from './toast.service'
import { AuthService } from './auth.service'
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

@Injectable({ providedIn: 'root' })
export class DemoService {
  private readonly api = inject(ApiClientService)
  private readonly toast = inject(ToastService)
  private readonly auth = inject(AuthService)

  readonly loading = signal(false)
  readonly status = signal<DemoStatus | null>(null)

  /** Server-side demo flag (preferred) with env fallback for UI hints */
  readonly demoMode = computed(() => this.status()?.enabled ?? environment.demoMode)

  readonly canManageDemo = computed(() => {
    const roles = this.auth.user()?.roles ?? []
    return roles.includes('super_admin') || roles.includes('admin')
  })

  refreshStatus = (): void => {
    this.api.get<DemoStatus>('demo/status').subscribe({
      next: (s) => this.status.set(s),
      error: () => this.status.set(null),
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
