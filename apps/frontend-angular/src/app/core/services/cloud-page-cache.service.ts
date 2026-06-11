import { Injectable } from '@angular/core'
import type { CloudSnapshot, CloudSlug } from '../../features/cloud/cloud-provider.data'

type SnapshotEntry = { snapshot: CloudSnapshot; at: number; key: string }

@Injectable({ providedIn: 'root' })
export class CloudPageCacheService {
  private entry: SnapshotEntry | null = null
  private readonly ttlMs = 90_000

  get(slug: CloudSlug, cacheKey: string): CloudSnapshot | null {
    if (!this.entry || this.entry.key !== `${slug}:${cacheKey}`) return null
    if (Date.now() - this.entry.at > this.ttlMs) {
      this.entry = null
      return null
    }
    return this.entry.snapshot
  }

  set(slug: CloudSlug, cacheKey: string, snapshot: CloudSnapshot): void {
    this.entry = { snapshot, at: Date.now(), key: `${slug}:${cacheKey}` }
  }

  invalidate = (): void => {
    this.entry = null
  }
}
