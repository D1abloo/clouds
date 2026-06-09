import { Injectable, signal, effect, computed, inject } from '@angular/core'
import {
  SIDEBAR_MAIN_MODULES,
  resolveAreaFromPath,
  CLOUD_SIDEBAR_BRANCHES,
  VPS_SIDEBAR_BRANCHES,
} from '../../core/routing/area-nav.config'
import { AuthService } from '../../core/services/auth.service'
import { UserShortcutsService } from '../../core/services/user-shortcuts.service'
import { ToastService } from '../../core/services/toast.service'

const COLLAPSED_KEY = 'cloudops_sidebar_collapsed'
const EXPANDED_KEY = 'cloudops_sidebar_expanded'
const LEGACY_FAVORITES_KEY = 'cloudops_sidebar_favorites'
const EXPANDED_MIGRATION_KEY = 'cloudops_sidebar_expanded_v2'

const favoritesKeyForUser = (userId: string): string => `cloudops_sidebar_favorites_${userId}`

const CLOUD_BRANCH_IDS = CLOUD_SIDEBAR_BRANCHES.map((b) => b.id)
const VPS_BRANCH_IDS = VPS_SIDEBAR_BRANCHES.map((b) => b.id)
const BRANCH_IDS = [...CLOUD_BRANCH_IDS, ...VPS_BRANCH_IDS]
const MODULE_IDS = SIDEBAR_MAIN_MODULES.map((m) => m.id)

export interface ShortcutMeta {
  label: string
  section?: string
  icon?: string
}

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
    return parseFavorites(userRaw) ?? []
  }

  const legacyRaw = readStorage(LEGACY_FAVORITES_KEY)
  if (legacyRaw !== null) {
    const legacy = parseFavorites(legacyRaw)
    if (legacy) {
      localStorage.setItem(userKey, JSON.stringify(legacy))
      localStorage.removeItem(LEGACY_FAVORITES_KEY)
      return legacy
    }
  }

  return []
}

const writeFavoritesForUser = (userId: string, routes: string[]): void => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(favoritesKeyForUser(userId), JSON.stringify(routes))
}

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private readonly auth = inject(AuthService)
  private readonly shortcutsApi = inject(UserShortcutsService)
  private readonly toast = inject(ToastService)
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
      this.activeUserId = initialUserId
      this.loadShortcutsFromApi(initialUserId)
    } else {
      this._favorites.set([])
    }

    effect(() => {
      const userId = this.auth.user()?.id ?? null

      if (this.activeUserId !== null && this.activeUserId !== userId) {
        writeFavoritesForUser(this.activeUserId, this._favorites())
      }

      if (userId !== null && userId !== this.activeUserId) {
        this.activeUserId = userId
        this.loadShortcutsFromApi(userId)
      } else if (userId === null && this.activeUserId !== null) {
        this.activeUserId = null
        this._favorites.set([])
      }
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

  private loadShortcutsFromApi = (userId: string): void => {
    const cached = readFavoritesForUser(userId)
    if (cached.length) {
      this._favorites.set(cached)
    } else {
      this._favorites.set([])
    }

    this.shortcutsApi.list().subscribe({
      next: (items) => {
        const routes = items.map((i) => i.route)
        this._favorites.set(routes)
        writeFavoritesForUser(userId, routes)
      },
      error: () => {
        this._favorites.set(cached)
      },
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

  toggleFavorite = (route: string, meta?: ShortcutMeta): void => {
    const list = this._favorites()
    const isOn = list.includes(route)

    if (isOn) {
      this._favorites.update((items) => items.filter((r) => r !== route))
      this.toast.info('Eliminado de acceso rápido')
      this.shortcutsApi.removeByRoute(route).subscribe({
        error: () => {
          this._favorites.update((items) => [...items, route])
          this.toast.error('No se pudo quitar el acceso rápido')
        },
      })
      return
    }

    this._favorites.update((items) => [...items, route])
    this.toast.success('Añadido a acceso rápido')
    this.shortcutsApi
      .add({
        route,
        label: meta?.label ?? route,
        section: meta?.section,
        icon: meta?.icon,
      })
      .subscribe({
        error: () => {
          this._favorites.update((items) => items.filter((r) => r !== route))
          this.toast.error('No se pudo añadir a acceso rápido')
        },
      })
  }
}
