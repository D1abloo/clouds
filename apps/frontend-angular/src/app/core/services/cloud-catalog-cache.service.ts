import { Injectable } from '@angular/core'
import { Observable, of, tap } from 'rxjs'

type CacheEntry<T> = { data: T; at: number }

@Injectable({ providedIn: 'root' })
export class CloudCatalogCacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>()
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
    this.store.set(key, { data, at: Date.now() })
  }

  invalidatePrefix = (prefix: string): void => {
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) this.store.delete(k)
    }
  }

  clearAll = (): void => {
    this.store.clear()
  }

  fetch<T>(key: string, factory: () => Observable<T>): Observable<T> {
    const cached = this.get<T>(key)
    if (cached !== null) return of(cached)
    return factory().pipe(tap((data) => this.set(key, data)))
  }
}
