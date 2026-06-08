import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core'
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { filter, map, startWith } from 'rxjs'
import { MatIconModule } from '@angular/material/icon'
import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component'
import { NavBadgeService } from '../../core/services/nav-badge.service'
import {
  resolveAreaFromPath,
  resolveCloudProviderFromPath,
  resolveVpsProviderFromPath,
  cloudSectionTabs,
  vpsSectionTabs,
  isRunbooksSectionPath,
  RUNBOOKS_SECTION_TABS,
  type SidebarMainModule,
  type AreaNavTab,
} from '../../core/routing/area-nav.config'

@Component({
  selector: 'app-module-area-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatIconModule, NavIconComponent],
  template: `
    @if (area(); as a) {
      <nav class="module-area-tabs module-area-tabs--centered" [attr.aria-label]="a.label + ' sections'">
        <div class="module-area-tabs__scroll">
          @for (tab of sectionTabs(); track tab.id) {
            <a
              class="module-area-tab"
              [routerLink]="tab.route"
              routerLinkActive="module-area-tab--active"
              [routerLinkActiveOptions]="tab.route === '/dashboard'
                ? { paths: 'exact', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' }
                : { paths: 'subset', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' }"
              [attr.aria-label]="tab.label"
            >
              @if (tab.icon || tab.logo) {
                <app-nav-icon [icon]="tab.icon" [logo]="tab.logo" size="sm" />
              }
              <span>{{ tab.label }}</span>
              @if (badge(tab.badgeKey); as n) {
                <span class="module-area-tab__badge">{{ n > 99 ? '99+' : n }}</span>
              }
            </a>
          }
        </div>
      </nav>
    }
  `,
  styles: `
    .module-area-tabs {
      margin: 0 0 0.65rem;
      padding: 0.25rem 0;
      border: none;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }
    .module-area-tabs--centered .module-area-tabs__scroll {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
    }
    .module-area-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.75rem;
      border: none;
      border-radius: 999px;
      text-decoration: none;
      font-size: 0.78rem;
      font-weight: 600;
      color: #111;
      background: transparent;
      box-shadow: none;
      transition: background 0.15s ease, color 0.15s ease;
      white-space: nowrap;
      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        color: #111;
        opacity: 0.9;
      }
      &:hover {
        background: color-mix(in srgb, #111 6%, transparent);
        color: #111;
      }
    }
    .module-area-tab--active {
      background: color-mix(in srgb, #111 10%, transparent);
      color: #111;
      font-weight: 700;
      box-shadow: none;
    }
    .module-area-tab__badge {
      padding: 0.08rem 0.38rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 800;
      background: linear-gradient(135deg, #ef4444, #f97316);
      color: #fff;
    }
    @media (max-width: 768px) {
      .module-area-tabs__scroll {
        flex-wrap: nowrap;
        justify-content: flex-start;
        overflow-x: auto;
        padding-bottom: 0.25rem;
        scrollbar-width: thin;
      }
    }
  `,
})
export class ModuleAreaTabsComponent {
  private readonly router = inject(Router)
  private readonly navBadges = inject(NavBadgeService)

  readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  )

  readonly area = computed((): SidebarMainModule | null => {
    const path = this.url().split('?')[0]
    return resolveAreaFromPath(path)
  })

  readonly sectionTabs = computed((): AreaNavTab[] => {
    const a = this.area()
    if (!a) return []
    const path = this.url().split('?')[0]
    if (a.id === 'clouds') {
      const provider = resolveCloudProviderFromPath(path)
      if (provider) return cloudSectionTabs(provider)
    }
    if (a.id === 'vps') {
      const provider = resolveVpsProviderFromPath(path)
      if (provider) return vpsSectionTabs(provider)
    }
    if (isRunbooksSectionPath(path)) return RUNBOOKS_SECTION_TABS
    return a.tabs
  })

  badgeResolver = (key?: string): number | null => this.navBadges.resolve(key)

  badge = (key?: string): number | null => this.badgeResolver(key)
}
