import { Injectable, inject } from '@angular/core'
import { delay, Observable, of, tap } from 'rxjs'
import { ToastService } from './toast.service'

@Injectable({ providedIn: 'root' })
export class DemoActionsService {
  private readonly toast = inject(ToastService)

  simulate = (
    label: string,
    ms = 600,
    successMsg?: string,
  ): Observable<{ ok: true; action: string }> =>
    of({ ok: true as const, action: label }).pipe(
      delay(ms),
      tap(() => this.toast.success(successMsg ?? `${label} completed (demo)`)),
    )

  simulateError = (label: string, ms = 400): Observable<never> =>
    new Observable((sub) => {
      setTimeout(() => {
        this.toast.error(`${label} failed (demo)`)
        sub.error(new Error(label))
      }, ms)
    })
}
