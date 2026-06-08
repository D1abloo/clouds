import { Injectable, signal, effect, computed, inject } from '@angular/core'
import { DEFAULT_FAVORITES } from './sidebar-tree.config'
import {
  SIDEBAR_MAIN_MODULES,
  resolveAreaFromPath,
  CLOUD_SIDEBAR_BRANCHES,
  VPS_SIDEBAR_BRANCHES,
} from '../../core/routing/area-nav.config'
import { AuthService } from '../../core/services/auth.service'

const COLLAPSED_KEY = 'cloudops_sidebar_collapsed'
const EXPANDED_KEY = 'cloudops_sidebar_expanded'
const LEGACY_FAVORITES_KEY = 'cloudops_sidebar_favorites'
const EXPANDED_MIGRATION_KEY = 'cloudops_sidebar_expanded_v2'

const favoritesKeyForUser = (userId: string): string => `cloudops_sidebar_favorites_${userId}`

const CLOUD_BRANCH_IDS = CLOUD_SIDEBAR_BRANCHES.map((b) => b.id)
const VPS_BRANCH_IDS = VPS_SIDEBAR_BRANCHES.map((b) => b.id)
const BRANCH_IDS = [...CLOUD_BRANCH_IDS, ...VPS_BRANCH_IDS]
const MODULE_IDS = SIDEBAR_MAIN_MODULES.map((m) => m.id)

const readStorage = (key: string): string | null => {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(key)
}

const readExpanded = (): Record<string, boolean> => {
  try {
    const raw = readStorage(EXPANDED_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

const parseFavorites = (raw: string): string[] | null => {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.filter((r): r is string => typeof r === 'string')
  } catch {
    return null
  }
}

const readFavoritesForUser = (userId: string): string[] => {
  const userKey = favoritesKeyForUser(userId)
  const userRaw = readStorage(userKey)
  if (userRaw !== null) {
    return parseFavorites(userRaw) ?? [...DEFAULT_FAVORITES]
  }

  const legacyRaw = readStorage(LEGACY_FAVORITES_KEY)
  if (legacyRaw !== null) {
    const legacy = parseFavorites(legacyRaw)
    if (legacy) {
      localStorage.setItem(userKey, JSON.stringify(legacy))
      return legacy
    }
  }

  return [...DEFAULT_FAVORITES]
}

const writeFavoritesForUser = (userId: string, routes: string[]): void => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(favoritesKeyForUser(userId), JSON.stringify(routes))
}

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private readonly auth = inject(AuthService)
  private activeUserId: string | null = null

  private readonly _collapsed = signal<boolean>(readStorage(COLLAPSED_KEY) === 'true')
  readonly collapsed = this._collapsed.asReadonly()

  private readonly _searchQuery = signal('')
  readonly searchQuery = this._searchQuery.asReadonly()

  private readonly _expanded = signal<Record<string, boolean>>(readExpanded())
  readonly expanded = this._expanded.asReadonly()

  private readonly _favorites = signal<string[]>([])
  readonly favorites = this._favorites.asReadonly()

  readonly showFavoritesOnly = computed(() => false)

  constructor() {
    if (typeof localStorage !== 'undefined' && !readStorage(EXPANDED_MIGRATION_KEY)) {
      localStorage.removeItem(EXPANDED_KEY)
      localStorage.setItem(EXPANDED_MIGRATION_KEY, '1')
      this._expanded.set({})
    }

    const initialUserId = this.auth.user()?.id ?? null
    if (initialUserId) {
      this._favorites.set(readFavoritesForUser(initialUserId))
      this.activeUserId = initialUserId
    } else {
      this._favorites.set([...DEFAULT_FAVORITES])
    }

    effect(() => {
      const userId = this.auth.user()?.id ?? null

      if (this.activeUserId !== null && this.activeUserId !== userId) {
        writeFavoritesForUser(this.activeUserId, this._favorites())
      }

      if (userId !== null && userId !== this.activeUserId) {
        this._favorites.set(readFavoritesForUser(userId))
      }

      this.activeUserId = userId
    })

    effect(() => {
      const userId = this.auth.user()?.id
      const routes = this._favorites()
      if (userId) {
        writeFavoritesForUser(userId, routes)
      }
    })

    effect(() => {
      localStorage.setItem(COLLAPSED_KEY, String(this._collapsed()))
    })
    effect(() => {
      localStorage.setItem(EXPANDED_KEY, JSON.stringify(this._expanded()))
    })
  }

  toggle = (): void => {
    this._collapsed.update((v) => !v)
  }

  setCollapsed = (value: boolean): void => {
    this._collapsed.set(value)
  }

  setSearch = (q: string): void => {
    this._searchQuery.set(q.trim().toLowerCase())
  }

  isExpanded = (id: string): boolean => {
    const map = this._expanded()
    if (id in map) return map[id]
    return false
  }

  toggleExpanded = (id: string): void => {
    const mobile = typeof window !== 'undefined' && window.innerWidth <= 960
    const willOpen = !this.isExpanded(id)

    this._expanded.update((m) => {
      if (mobile && willOpen) {
        const next: Record<string, boolean> = {}
        for (const key of [...MODULE_IDS, ...BRANCH_IDS]) {
          next[key] = key === id
        }
        return next
      }
      return { ...m, [id]: willOpen }
    })
  }

  setExpanded = (id: string, open: boolean): void => {
    this._expanded.update((m) => ({ ...m, [id]: open }))
  }

  /** Expande solo la sección activa; en móvil cierra el resto (acordeón). */
  syncNavigationExpand = (path: string): void => {
    const area = resolveAreaFromPath(path)
    const cloud = path.match(/^\/cloud\/(aws|gcp|azure)/)?.[1]
    const vps = path.match(/^\/vps\/(digitalocean|hetzner|linode|ovh)/)?.[1]
    const mobile = typeof window !== 'undefined' && window.innerWidth <= 960

    this._expanded.update((prev) => {
      const next = mobile ? {} : { ...prev }

      for (const id of MODULE_IDS) {
        if (mobile) {
          next[id] = area?.id === id
        } else if (area?.id === id) {
          next[id] = true
        }
      }

      for (const id of CLOUD_BRANCH_IDS) {
        if (mobile) {
          next[id] = cloud === id
        } else if (cloud === id) {
          next[id] = true
        }
      }

      for (const id of VPS_BRANCH_IDS) {
        if (mobile) {
          next[id] = vps === id
        } else if (vps === id) {
          next[id] = true
        }
      }

      return next
    })
  }

  isFavorite = (route: string): boolean => this._favorites().includes(route)

  toggleFavorite = (route: string): void => {
    this._favorites.update((list) =>
      list.includes(route) ? list.filter((r) => r !== route) : [...list, route],
    )
  }
}
