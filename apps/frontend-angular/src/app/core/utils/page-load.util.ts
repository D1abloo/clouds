import { signal } from '@angular/core'
import { Observable, finalize, timeout, catchError, of, throwError } from 'rxjs'

const LOAD_TIMEOUT_MS = 20_000

export interface PageLoader {
  loading: ReturnType<typeof signal<boolean>>
  error: ReturnType<typeof signal<string | null>>
  run: <T>(
    source: Observable<T>,
    opts: {
      onSuccess: (data: T) => void
      errorMessage?: string
      fallback?: () => T
    },
  ) => void
}

export const createPageLoader = (initialLoading = false): PageLoader => {
  const loading = signal(initialLoading)
  const error = signal<string | null>(null)

  const run = <T>(
    source: Observable<T>,
    opts: {
      onSuccess: (data: T) => void
      errorMessage?: string
      fallback?: () => T
    },
  ): void => {
    loading.set(true)
    error.set(null)
    source
      .pipe(
        timeout(LOAD_TIMEOUT_MS),
        catchError((err) => {
          if (opts.fallback) {
            return of(opts.fallback())
          }
          return throwError(() => err)
        }),
        finalize(() => loading.set(false)),
      )
      .subscribe({
        next: opts.onSuccess,
        error: () =>
          error.set(
            opts.errorMessage ??
              'No se pudieron cargar los datos. Comprueba que el API esté activo o activa el modo demo.',
          ),
      })
  }

  return { loading, error, run }
}
