import { ChangeDetectionStrategy, Component, inject, computed, effect } from '@angular/core'
import { Router, RouterLink, NavigationEnd } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { filter, map, startWith } from 'rxjs'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatMenuModule } from '@angular/material/menu'
import { MatDividerModule } from '@angular/material/divider'
import { AppLogoComponent } from '../../shared/components/app-logo/app-logo.component'
import { SidebarService } from './sidebar.service'
import {
  SIDEBAR_MAIN_MODULES,
  resolveAreaFromPath,
  flattenAreaNavForSearch,
} from './sidebar-tree.config'
import { SidebarNavGroupComponent } from './sidebar-nav-group.component'
import { SidebarNavLeafComponent } from './sidebar-nav-leaf.component'
import { SidebarSearchComponent } from './sidebar-search.component'
import { AuthStore } from '../../core/stores/auth.store'
import { ProModeService } from '../../core/services/pro-mode.service'
import { NavBadgeService } from '../../core/services/nav-badge.service'
import { navHintForRoute } from './sidebar-nav-hints.config'

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    RouterLink,
    SidebarNavGroupComponent,
    SidebarNavLeafComponent,
    SidebarSearchComponent,
    AppLogoComponent,
  ],
  template: `
    <aside class="app-sidebar" [class.app-sidebar--collapsed]="collapsed()">
      <button
        type="button"
        class="sidebar-toggle"
        [matTooltip]="collapsed() ? 'Expandir barra lateral' : 'Contraer barra lateral'"
        matTooltipPosition="right"
        (click)="sidebarSvc.toggle()"
        aria-label="Toggle sidebar"
      >
        <mat-icon>{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
      </button>

      <div class="sidebar-top">
        <div class="sidebar-brand">
          <app-logo size="md" />
          @if (!collapsed()) {
            <div class="sidebar-brand__text">
              <strong>{{ brandName() }}</strong>
              <span>Panel de operaciones</span>
            </div>
          }
        </div>
      </div>

      <div class="sidebar-scroll">
        <app-sidebar-search [collapsed]="collapsed()" />

        @if (!collapsed() && favoriteEntries().length && !searchActive()) {
          <div class="sidebar-favorites">
            <div class="sidebar-favorites__label">
              <mat-icon>star</mat-icon>
              Acceso rápido
            </div>
            @for (fav of favoriteEntries(); track fav.route) {
              <app-sidebar-nav-leaf
                [label]="fav.label"
                [hint]="navHint(fav.route)"
                [route]="fav.route"
                [icon]="fav.icon ?? 'star'"
                [logo]="fav.logo"
                [collapsed]="false"
              />
            }
          </div>
        }

        <nav class="sidebar-nav" aria-label="Main navigation">
          @if (searchActive()) {
            @for (hit of searchHits(); track hit.route) {
              <app-sidebar-nav-leaf
                [label]="hit.label"
                [hint]="navHint(hit.route)"
                [route]="hit.route"
                [icon]="hit.icon ?? 'chevron_right'"
                [logo]="hit.logo"
                [collapsed]="false"
              />
            }
            @if (searchHits().length === 0) {
              <p class="sidebar-nav__empty">Sin resultados para «{{ sidebarSvc.searchQuery() }}»</p>
            }
          } @else {
            @for (mod of visibleModules(); track mod.id) {
              <app-sidebar-nav-group
                [module]="mod"
                [collapsed]="collapsed()"
                [active]="isModuleActive(mod.id)"
                [badgeResolver]="resolveBadge"
              />
            }
          }
        </nav>
      </div>

      <div class="sidebar-footer">
        <button
          type="button"
          class="sidebar-user"
          [class.sidebar-user--collapsed]="collapsed()"
          [matMenuTriggerFor]="userMenu"
          [matTooltip]="collapsed() ? (authStore.user()?.name ?? 'User') : ''"
          matTooltipPosition="right"
        >
          <span class="sidebar-user__avatar">{{ userInitials() }}</span>
          @if (!collapsed()) {
            <span class="sidebar-user__info">
              <em>{{ authStore.user()?.name ?? authStore.user()?.email }}</em>
              <small>{{ userRole() }}</small>
            </span>
            <mat-icon class="sidebar-user__menu">more_vert</mat-icon>
          }
        </button>
      </div>

      <mat-menu #userMenu="matMenu">
        <button mat-menu-item routerLink="/settings/general"><mat-icon>person</mat-icon> Perfil</button>
        <button mat-menu-item routerLink="/settings/general"><mat-icon>lock</mat-icon> Cambiar contraseña</button>
        <mat-divider />
        <button mat-menu-item (click)="authStore.logout()"><mat-icon>logout</mat-icon> Cerrar sesión</button>
      </mat-menu>
    </aside>
  `,
  styles: `
    :host { display: contents; }
    .app-sidebar {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      height: 100dvh;
      max-height: 100dvh;
      min-height: 0;
      width: 240px;
      flex-shrink: 0;
      overflow: hidden;
      background: var(--sidebar-bg);
      box-shadow: none;
      border: none;
      transition: width 0.28s ease;
    }
    .app-sidebar--collapsed { width: 64px; }
    .sidebar-toggle {
      position: absolute;
      right: -14px;
      top: 1.1rem;
      z-index: 101;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 50%;
      background: var(--sidebar-dropdown-bg);
      color: var(--sidebar-text-muted);
      box-shadow: var(--app-shadow-sm);
      cursor: pointer;
      transition: background 0.2s, color 0.2s, transform 0.2s;
    }
    .sidebar-toggle:hover {
      background: var(--sidebar-primary);
      color: #fff;
      transform: scale(1.06);
    }
    .sidebar-top {
      flex-shrink: 0;
    }
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 1rem 0.85rem 0.65rem;
    }
    .sidebar-brand__text {
      strong { display: block; font-size: 0.92rem; color: var(--sidebar-text); }
      span { font-size: 0.68rem; color: var(--sidebar-text-faint); }
    }
    .sidebar-scroll {
      flex: 1 1 auto;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: color-mix(in srgb, var(--sidebar-text-faint) 55%, transparent) transparent;
    }
    .sidebar-scroll::-webkit-scrollbar {
      width: 5px;
    }
    .sidebar-scroll::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: color-mix(in srgb, var(--sidebar-text-faint) 45%, transparent);
    }
    .sidebar-scroll::-webkit-scrollbar-thumb:hover {
      background: color-mix(in srgb, var(--sidebar-text-muted) 55%, transparent);
    }
    .sidebar-favorites { padding: 0 0.35rem 0.35rem; }
    .sidebar-favorites__label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.55rem;
      font-size: 0.58rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #fbbf24;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    }
    .sidebar-nav {
      padding: 0.15rem 0.4rem 0.65rem;
    }
    .sidebar-nav__empty {
      padding: 1rem;
      font-size: 0.78rem;
      color: var(--sidebar-text-muted);
      text-align: center;
    }
    .sidebar-footer {
      flex-shrink: 0;
      padding: 0.5rem;
      background: var(--sidebar-bg);
    }
    .sidebar-user {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      width: 100%;
      padding: 0.45rem 0.5rem;
      border: none;
      border-radius: 12px;
      background: transparent;
      cursor: pointer;
      transition: background 0.2s;
    }
    .sidebar-user:hover { background: var(--sidebar-item-hover); }
    .sidebar-user--collapsed { justify-content: center; }
    .sidebar-user__avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.62rem;
      font-weight: 800;
      color: #fff;
      background: linear-gradient(135deg, #a78bfa, #6366f1);
    }
    .sidebar-user__info {
      flex: 1;
      min-width: 0;
      text-align: left;
      em {
        display: block;
        font-style: normal;
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--sidebar-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      small { font-size: 0.65rem; color: var(--sidebar-text-muted); }
    }
    .sidebar-user__menu {
      font-size: 1rem !important;
      width: 1rem !important;
      height: 1rem !important;
      color: var(--sidebar-text-muted);
    }
    @media (max-width: 1023px) {
      .app-sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        z-index: 100;
        width: min(280px, 86vw);
        box-shadow: var(--app-shadow-lg);
        transition: transform 0.28s ease, box-shadow 0.28s ease;
      }
      .app-sidebar--collapsed {
        transform: translateX(-100%);
        width: min(280px, 86vw);
        pointer-events: none;
      }
      .app-sidebar:not(.app-sidebar--collapsed) {
        transform: translateX(0);
        pointer-events: auto;
      }
      .sidebar-toggle {
        display: none;
      }
    }
  `,
})
export class SidebarComponent {
  private readonly router = inject(Router)
  readonly sidebarSvc = inject(SidebarService)
  readonly navBadges = inject(NavBadgeService)
  readonly authStore = inject(AuthStore)
  readonly pro = inject(ProModeService)

  readonly mainModules = SIDEBAR_MAIN_MODULES
  readonly collapsed = this.sidebarSvc.collapsed
  private readonly flatNav = flattenAreaNavForSearch()

  readonly brandName = computed(() =>
    this.pro.proMode() && !this.pro.demoMode() ? 'Spendlyx' : 'CloudOps',
  )

  readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  )

  constructor() {
    effect(() => {
      const path = this.url().split('?')[0]
      this.sidebarSvc.syncNavigationExpand(path)
    })
  }

  readonly searchActive = computed(() => this.sidebarSvc.searchQuery().length > 0)

  readonly visibleModules = computed(() => {
    const q = this.sidebarSvc.searchQuery()
    const modules = this.filterDemoNavItem(this.mainModules)
    if (!q) return modules
    return modules.filter((m) => {
      if (m.label.toLowerCase().includes(q)) return true
      if (m.branches?.length) {
        return m.branches.some(
          (b) =>
            b.label.toLowerCase().includes(q) ||
            b.children.some(
              (c) =>
                c.label.toLowerCase().includes(q) ||
                c.route.toLowerCase().includes(q),
            ),
        )
      }
      return m.tabs.some(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.route.toLowerCase().includes(q),
      )
    })
  })

  readonly searchHits = computed(() => {
    const q = this.sidebarSvc.searchQuery()
    if (!q) return []
    return this.flatNav
      .filter(
        (e) =>
          e.label.toLowerCase().includes(q) ||
          e.route.toLowerCase().includes(q) ||
          e.group.toLowerCase().includes(q),
      )
      .slice(0, 12)
  })

  readonly favoriteEntries = computed(() => {
    const routes = this.sidebarSvc.favorites()
    return routes
      .map((route) => this.flatNav.find((e) => e.route === route))
      .filter((e): e is NonNullable<typeof e> => !!e)
  })

  private filterDemoNavItem = (modules: typeof SIDEBAR_MAIN_MODULES) => {
    if (!this.pro.proMode() || this.pro.demoMode()) return modules
    return modules.map((m) => ({
      ...m,
      tabs: m.tabs.filter((t) => t.id !== 'demo-mode'),
    }))
  }

  isModuleActive = (moduleId: string): boolean => {
    const path = this.url().split('?')[0]
    const area = resolveAreaFromPath(path)
    return area?.id === moduleId
  }

  readonly resolveBadge = (key?: string): number | null => this.navBadges.resolve(key)

  readonly userInitials = computed(() => {
    const u = this.authStore.user()
    if (!u) return 'U'
    const name = u.name ?? u.email ?? 'U'
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  })

  readonly userRole = computed(() => {
    const roles = this.authStore.user()?.roles
    if (!roles?.length) return ''
    return roles[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  })

  navHint = (route: string): string | undefined => navHintForRoute(route)
}
