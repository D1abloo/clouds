import { Injectable, inject, signal } from '@angular/core'
import { ApiClientService } from './api-client.service'
import { ToastService } from './toast.service'
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

  readonly demoMode = environment.demoMode
  readonly loading = signal(false)
  readonly status = signal<DemoStatus | null>(null)

  refreshStatus = (): void => {
    this.api.get<DemoStatus>('demo/status').subscribe({
      next: (s) => this.status.set(s),
      error: () => this.status.set(null),
    })
  }

  loadDemo = (): void => {
    if (!this.demoMode) {
      this.toast.error('Demo mode is disabled on the server')
      return
    }
    this.loading.set(true)
    this.api
      .post<{ instances: number; vps: number }>('demo/seed')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.toast.success(`Demo data loaded (${res.instances ?? 0} instances)`)
          this.refreshStatus()
          window.location.reload()
        },
        error: () => this.toast.error('Failed to load demo data'),
      })
  }

  resetDemo = (): void => {
    if (!this.demoMode) {
      this.toast.error('Demo mode is disabled on the server')
      return
    }
    this.loading.set(true)
    this.api
      .post<{ instances: number; vps: number }>('demo/reset')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.toast.success(`Demo reset complete (${res.instances} instances)`)
          this.refreshStatus()
          window.location.reload()
        },
        error: () => this.toast.error('Failed to reset demo data'),
      })
  }
}
