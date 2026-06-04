import { ChangeDetectionStrategy, Component, inject, computed, effect } from '@angular/core'
import { Router, RouterLink, NavigationEnd } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { filter, map, startWith } from 'rxjs'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatMenuModule } from '@angular/material/menu'
import { MatDividerModule } from '@angular/material/divider'
import { SidebarService } from './sidebar.service'
import { OrgSwitcherComponent } from './org-switcher.component'
import {
  SIDEBAR_MAIN_MODULES,
  resolveAreaFromPath,
  flattenAreaNavForSearch,
} from './sidebar-tree.config'
import { SidebarNavGroupComponent } from './sidebar-nav-group.component'
import { SidebarNavLeafComponent } from './sidebar-nav-leaf.component'
import { SidebarSearchComponent } from './sidebar-search.component'
import { AlertsStore } from '../../core/stores/alerts.store'
import { JenkinsStore } from '../../core/stores/jenkins.store'
import { VpsStore } from '../../core/stores/vps.store'
import { AuthStore } from '../../core/stores/auth.store'

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
    OrgSwitcherComponent,
    SidebarNavGroupComponent,
    SidebarNavLeafComponent,
    SidebarSearchComponent,
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

      <div class="sidebar-brand">
        <div class="sidebar-brand__logo">
          <mat-icon>cloud_queue</mat-icon>
        </div>
        @if (!collapsed()) {
          <div class="sidebar-brand__text">
            <strong>CloudOps</strong>
            <span>Control Center</span>
          </div>
        }
      </div>

      <div class="sidebar-org">
        <app-org-switcher />
      </div>

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
      z-index: 100;
      display: flex;
      flex-direction: column;
      height: 100dvh;
      max-height: 100dvh;
      width: 240px;
      flex-shrink: 0;
      overflow: hidden;
      background: var(--sidebar-bg);
      box-shadow: 4px 0 32px rgba(0, 0, 0, 0.22);
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
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 1rem 0.85rem 0.35rem;
    }
    .sidebar-brand__logo {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #818cf8, #6366f1);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
      mat-icon { color: #fff; font-size: 1.2rem; }
    }
    .sidebar-brand__text {
      strong { display: block; font-size: 0.92rem; color: var(--sidebar-text); }
      span { font-size: 0.68rem; color: var(--sidebar-text-faint); }
    }
    .sidebar-org { padding: 0 0.35rem 0.25rem; }
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
      flex: 1;
      padding: 0.25rem 0.4rem 0.5rem;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .sidebar-nav__empty {
      padding: 1rem;
      font-size: 0.78rem;
      color: var(--sidebar-text-muted);
      text-align: center;
    }
    .sidebar-footer { padding: 0.5rem; margin-top: auto; }
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
    @media (max-width: 960px) {
      .app-sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
      }
      .app-sidebar--collapsed {
        transform: translateX(-100%);
        width: 272px;
      }
    }
  `,
})
export class SidebarComponent {
  private readonly router = inject(Router)
  readonly sidebarSvc = inject(SidebarService)
  readonly alertsStore = inject(AlertsStore)
  readonly jenkinsStore = inject(JenkinsStore)
  readonly vpsStore = inject(VpsStore)
  readonly authStore = inject(AuthStore)

  readonly mainModules = SIDEBAR_MAIN_MODULES
  readonly collapsed = this.sidebarSvc.collapsed
  private readonly flatNav = flattenAreaNavForSearch()

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
      const area = resolveAreaFromPath(path)
      if (area) this.sidebarSvc.setExpanded(area.id, true)
      const cloudProvider = path.match(/^\/cloud\/(aws|gcp|azure)/)?.[1]
      if (cloudProvider) this.sidebarSvc.setExpanded(cloudProvider, true)
    })
  }

  readonly searchActive = computed(() => this.sidebarSvc.searchQuery().length > 0)

  readonly visibleModules = computed(() => {
    const q = this.sidebarSvc.searchQuery()
    if (!q) return this.mainModules
    return this.mainModules.filter((m) => {
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

  isModuleActive = (moduleId: string): boolean => {
    const path = this.url().split('?')[0]
    const area = resolveAreaFromPath(path)
    return area?.id === moduleId
  }

  readonly resolveBadge = (key?: string): number | null => {
    if (!key) return null
    const demo: Record<string, number> = {
      alerts: this.alertsStore.activeAlerts() || 12,
      vps: this.vpsStore.totalHosts() || 6,
      jenkins: this.jenkinsStore.failedBuilds() || 3,
      billing: 4,
      notifications: 8,
      approvals: 4,
      incidents: 3,
      logs: 84,
      backups: 2,
      security: 9,
      secrets: 5,
      deployments: 6,
      'command-center': 5,
      cost: 15,
      network: 8,
      health: 4,
      compliance: 14,
      scheduler: 12,
      changes: 47,
      tokens: 2,
      copilot: 1,
      capacity: 7,
      instances: 26,
      'github-repos': 8,
      'github-webhooks': 4,
      'github-deployments': 4,
    }
    const n = demo[key]
    return n && n > 0 ? n : null
  }

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
}
