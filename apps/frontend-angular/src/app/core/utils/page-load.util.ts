import { signal } from '@angular/core'
import { Observable, finalize } from 'rxjs'

export interface PageLoader {
  loading: ReturnType<typeof signal<boolean>>
  error: ReturnType<typeof signal<string | null>>
  run: <T>(
    source: Observable<T>,
    opts: {
      onSuccess: (data: T) => void
      errorMessage?: string
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
    },
  ): void => {
    loading.set(true)
    error.set(null)
    source.pipe(finalize(() => loading.set(false))).subscribe({
      next: opts.onSuccess,
      error: () =>
        error.set(opts.errorMessage ?? 'No se pudieron cargar los datos. Comprueba que el API esté activo.'),
    })
  }

  return { loading, error, run }
}
