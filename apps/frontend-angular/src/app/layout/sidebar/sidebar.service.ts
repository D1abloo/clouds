import { Injectable, signal, effect, computed } from '@angular/core'
import { DEFAULT_FAVORITES } from './sidebar-tree.config'

const COLLAPSED_KEY = 'cloudops_sidebar_collapsed'
const EXPANDED_KEY = 'cloudops_sidebar_expanded'
const FAVORITES_KEY = 'cloudops_sidebar_favorites'

export interface OrgInfo {
  id: string
  name: string
  initials: string
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

  private readonly _currentOrg = signal<OrgInfo>({
    id: 'default',
    name: 'CloudOps Demo',
    initials: 'CO',
  })
  readonly currentOrg = this._currentOrg.asReadonly()

  readonly availableOrgs: OrgInfo[] = [
    { id: 'default', name: 'CloudOps Demo', initials: 'CO' },
    { id: 'prod', name: 'Production', initials: 'PR' },
    { id: 'stg', name: 'Staging Env', initials: 'ST' },
  ]

  readonly showFavoritesOnly = computed(() => false)

  constructor() {
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
    return true
  }

  toggleExpanded = (id: string): void => {
    this._expanded.update((m) => ({ ...m, [id]: !this.isExpanded(id) }))
  }

  setExpanded = (id: string, open: boolean): void => {
    this._expanded.update((m) => ({ ...m, [id]: open }))
  }

  isFavorite = (route: string): boolean => this._favorites().includes(route)

  toggleFavorite = (route: string): void => {
    this._favorites.update((list) =>
      list.includes(route) ? list.filter((r) => r !== route) : [...list, route],
    )
  }

  setOrg = (org: OrgInfo): void => {
    this._currentOrg.set(org)
  }
}
