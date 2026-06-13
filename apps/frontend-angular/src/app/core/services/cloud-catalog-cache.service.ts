import { Injectable } from '@angular/core'
import { Observable, finalize, of, shareReplay, tap } from 'rxjs'

type CacheEntry<T> = { data: T; at: number }

@Injectable({ providedIn: 'root' })
export class CloudCatalogCacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>()
  private readonly inFlight = new Map<string, Observable<unknown>>()
  private readonly ttlMs = 10 * 60_000

  get<T>(key: string): T | null {
    const hit = this.store.get(key)
    if (!hit) return null
    if (Date.now() - hit.at > this.ttlMs) {
      this.store.delete(key)
      return null
    }
    return hit.data as T
  }

  set<T>(key: string, data: T): void {
    if (Array.isArray(data) && data.length === 0) return
    this.store.set(key, { data, at: Date.now() })
  }

  invalidatePrefix = (prefix: string): void => {
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) this.store.delete(k)
    }
    for (const k of this.inFlight.keys()) {
      if (k.startsWith(prefix)) this.inFlight.delete(k)
    }
  }

  clearAll = (): void => {
    this.store.clear()
    this.inFlight.clear()
  }

  fetch<T>(key: string, factory: () => Observable<T>): Observable<T> {
    const cached = this.get<T>(key)
    if (cached !== null) return of(cached)
    const active = this.inFlight.get(key)
    if (active) return active as Observable<T>
    const request$ = factory().pipe(
      tap((data) => this.set(key, data)),
      finalize(() => this.inFlight.delete(key)),
      shareReplay({ bufferSize: 1, refCount: true }),
    )
    this.inFlight.set(key, request$)
    return request$
  }
}
