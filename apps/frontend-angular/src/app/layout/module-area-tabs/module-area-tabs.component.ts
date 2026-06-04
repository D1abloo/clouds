import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core'
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { filter, map, startWith } from 'rxjs'
import { MatIconModule } from '@angular/material/icon'
import {
  resolveAreaFromPath,
  resolveCloudProviderFromPath,
  cloudSectionTabs,
  type SidebarMainModule,
  type AreaNavTab,
} from '../../core/routing/area-nav.config'

@Component({
  selector: 'app-module-area-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    @if (area(); as a) {
      <nav class="module-area-tabs" [attr.aria-label]="a.label + ' sections'">
        <div class="module-area-tabs__head">
          <span class="module-area-tabs__module-icon" [class]="'tone-' + a.tone">
            <mat-icon>{{ a.icon }}</mat-icon>
          </span>
          <div class="module-area-tabs__titles">
            <strong>{{ a.label }}</strong>
            <span>{{ a.description }}</span>
          </div>
        </div>
        <div class="module-area-tabs__scroll">
          @for (tab of sectionTabs(); track tab.id) {
            <a
              class="module-area-tab"
              [routerLink]="tab.route"
              routerLinkActive="module-area-tab--active"
              [routerLinkActiveOptions]="{ paths: 'subset', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' }"
              [attr.aria-label]="tab.label"
            >
              @if (tab.icon) {
                <mat-icon>{{ tab.icon }}</mat-icon>
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
      margin: 0 0 1.25rem;
      padding: 1rem 1.15rem 0.85rem;
      border-radius: var(--app-radius-lg);
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
    }
    .module-area-tabs__head {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.85rem;
    }
    .module-area-tabs__module-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    }
    .tone-violet { background: color-mix(in srgb, #a78bfa 22%, transparent); mat-icon { color: #a78bfa; } }
    .tone-cyan { background: color-mix(in srgb, #22d3ee 22%, transparent); mat-icon { color: #22d3ee; } }
    .tone-blue { background: color-mix(in srgb, #38bdf8 22%, transparent); mat-icon { color: #38bdf8; } }
    .tone-amber { background: color-mix(in srgb, #fbbf24 22%, transparent); mat-icon { color: #fbbf24; } }
    .tone-green { background: color-mix(in srgb, #34d399 22%, transparent); mat-icon { color: #34d399; } }
    .tone-pink { background: color-mix(in srgb, #f472b6 22%, transparent); mat-icon { color: #f472b6; } }
    .tone-slate { background: color-mix(in srgb, #94a3b8 18%, transparent); mat-icon { color: #94a3b8; } }
    .module-area-tabs__titles {
      min-width: 0;
      strong {
        display: block;
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--app-text);
      }
      span {
        display: block;
        font-size: 0.75rem;
        color: var(--app-text-muted);
        line-height: 1.35;
      }
    }
    .module-area-tabs__scroll {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }
    .module-area-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.85rem;
      border-radius: 999px;
      text-decoration: none;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--app-text-muted);
      background: color-mix(in srgb, var(--app-elevated) 90%, transparent);
      box-shadow: var(--app-shadow-xs);
      transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease;
      white-space: nowrap;
      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        opacity: 0.85;
      }
      &:hover {
        transform: translateY(-1px);
        box-shadow: var(--app-shadow-sm);
        color: var(--app-text);
      }
    }
    .module-area-tab--active {
      background: color-mix(in srgb, var(--app-accent) 16%, var(--app-card));
      color: var(--app-accent);
      box-shadow: 0 2px 14px color-mix(in srgb, var(--app-accent) 22%, transparent);
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
        overflow-x: auto;
        padding-bottom: 0.25rem;
        scrollbar-width: thin;
      }
    }
  `,
})
export class ModuleAreaTabsComponent {
  private readonly router = inject(Router)

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
    return a.tabs
  })

  /** Injected from parent via optional callback — set in main layout */
  badgeResolver = (key?: string): number | null => {
    if (!key) return null
    const demo: Record<string, number> = {
      alerts: 12,
      vps: 6,
      jenkins: 3,
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
    }
    const n = demo[key]
    return n && n > 0 ? n : null
  }

  badge = (key?: string): number | null => this.badgeResolver(key)
}
