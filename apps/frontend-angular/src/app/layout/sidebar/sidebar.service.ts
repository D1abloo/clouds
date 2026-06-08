import { Injectable, signal, effect, computed } from '@angular/core'
import { DEFAULT_FAVORITES } from './sidebar-tree.config'
import {
  SIDEBAR_MAIN_MODULES,
  resolveAreaFromPath,
  CLOUD_SIDEBAR_BRANCHES,
} from '../../core/routing/area-nav.config'

const COLLAPSED_KEY = 'cloudops_sidebar_collapsed'
const EXPANDED_KEY = 'cloudops_sidebar_expanded'
const FAVORITES_KEY = 'cloudops_sidebar_favorites'
const EXPANDED_MIGRATION_KEY = 'cloudops_sidebar_expanded_v2'

const CLOUD_BRANCH_IDS = CLOUD_SIDEBAR_BRANCHES.map((b) => b.id)
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

const readFavorites = (): string[] => {
  try {
    const raw = readStorage(FAVORITES_KEY)
    return raw ? (JSON.parse(raw) as string[]) : [...DEFAULT_FAVORITES]
  } catch {
    return [...DEFAULT_FAVORITES]
  }
}

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private readonly _collapsed = signal<boolean>(readStorage(COLLAPSED_KEY) === 'true')
  readonly collapsed = this._collapsed.asReadonly()

  private readonly _searchQuery = signal('')
  readonly searchQuery = this._searchQuery.asReadonly()

  private readonly _expanded = signal<Record<string, boolean>>(readExpanded())
  readonly expanded = this._expanded.asReadonly()

  private readonly _favorites = signal<string[]>(readFavorites())
  readonly favorites = this._favorites.asReadonly()

  readonly showFavoritesOnly = computed(() => false)

  constructor() {
    if (typeof localStorage !== 'undefined' && !readStorage(EXPANDED_MIGRATION_KEY)) {
      localStorage.removeItem(EXPANDED_KEY)
      localStorage.setItem(EXPANDED_MIGRATION_KEY, '1')
      this._expanded.set({})
    }

    effect(() => {
      localStorage.setItem(COLLAPSED_KEY, String(this._collapsed()))
    })
    effect(() => {
      localStorage.setItem(EXPANDED_KEY, JSON.stringify(this._expanded()))
    })
    effect(() => {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(this._favorites()))
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
        for (const key of [...MODULE_IDS, ...CLOUD_BRANCH_IDS]) {
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
