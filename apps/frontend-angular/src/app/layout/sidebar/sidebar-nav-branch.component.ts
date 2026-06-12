import { ChangeDetectionStrategy, Component, inject, input, computed } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { sidebarBrandToLogo } from '../../shared/theme/nav-logo.types'
import { SidebarService } from './sidebar.service'
import { SidebarNavLeafComponent } from './sidebar-nav-leaf.component'
import type { SidebarNavBranch } from '../../core/routing/area-nav.config'
import { navHintForRoute } from './sidebar-nav-hints.config'
import { SIDEBAR_BRANCH_HINTS, branchTooltip } from './sidebar-nav-branch-hints.config'
import { collapseExpand, panelReveal } from '../../shared/animations/ui-motion.animations'

@Component({
  selector: 'app-sidebar-nav-branch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatTooltipModule, NavIconComponent, BrandLogoComponent, SidebarNavLeafComponent],
  animations: [collapseExpand, panelReveal],
  template: `
    <div class="nav-branch" @panelReveal>
      <button
        type="button"
        class="nav-branch__head"
        [class.nav-branch__head--open]="open()"
        (click)="handleToggle()"
        [attr.aria-expanded]="open()"
        [matTooltip]="collapsed() ? branch().label : branchTooltipText()"
        [matTooltipDisabled]="!collapsed() && !branchTooltipText()"
        matTooltipPosition="right"
      >
        @if (branchLogo()) {
          <span class="nav-branch__logo-wrap nav-branch__logo-wrap--animated" [class]="'nav-branch__logo-wrap--' + branch().brand">
            <app-brand-logo [logo]="branchLogo()!" size="md" [active]="open()" />
          </span>
        } @else if (branch().icon) {
          <span class="nav-branch__icon-wrap" [class]="toneClass()">
            <mat-icon>{{ branch().icon }}</mat-icon>
          </span>
        }
        @if (!collapsed()) {
          <span class="nav-branch__text">
            <span class="nav-branch__label">{{ branch().label }}</span>
            @if (branchHint()) {
              <span class="nav-branch__hint">{{ branchHint() }}</span>
            }
          </span>
          @if (branchBadge()) {
            <span class="nav-branch__badge">{{ branchBadge() }}</span>
          }
          <mat-icon class="nav-branch__chev">{{ open() ? 'expand_less' : 'expand_more' }}</mat-icon>
        }
      </button>
      @if (open() && !collapsed()) {
        <div class="nav-branch__children" @collapseExpand>
          @for (leaf of visibleChildren(); track leaf.id) {
            <app-sidebar-nav-leaf
              [label]="leaf.label"
              [hint]="leaf.hint ?? navHint(leaf.route)"
              [route]="leaf.route"
              [icon]="leaf.icon"
              [logo]="leaf.logo"
              [collapsed]="collapsed()"
              [badge]="leafBadge(leaf.badgeKey)"
            />
          }
        </div>
      }
    </div>
  `,
  styles: `
    .nav-branch { margin-bottom: 2px; }
    .nav-branch__head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: calc(100% - 0.5rem);
      margin: 0 0.25rem;
      padding: 0.45rem 0.55rem;
      border: none;
      border-radius: 11px;
      background: transparent;
      cursor: pointer;
      color: var(--sidebar-text);
      transition: background 0.2s, transform 0.18s;
    }
    .nav-branch__head:hover {
      background: var(--sidebar-item-hover);
      color: var(--sidebar-text);
    }
    .nav-branch__head--open {
      background: color-mix(in srgb, var(--sidebar-primary) 10%, transparent);
      color: var(--sidebar-text);
    }
    .nav-branch__logo-wrap {
      width: 30px;
      height: 30px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      padding: 4px;
      transition: transform 0.22s ease, box-shadow 0.25s ease;
    }
    .nav-branch__logo-wrap--animated:hover {
      transform: scale(1.1);
      box-shadow: 0 0 14px color-mix(in srgb, var(--sidebar-primary) 35%, transparent);
    }
    .nav-branch__logo-wrap--aws { background: color-mix(in srgb, #ff9900 22%, transparent); }
    .nav-branch__logo-wrap--gcp { background: color-mix(in srgb, #4285f4 22%, transparent); }
    .nav-branch__logo-wrap--azure { background: color-mix(in srgb, #0078d4 22%, transparent); }
    .nav-branch__logo-wrap--digitalocean { background: color-mix(in srgb, #0080ff 22%, transparent); }
    .nav-branch__logo-wrap--hetzner { background: color-mix(in srgb, #d50c2d 22%, transparent); }
    .nav-branch__logo-wrap--linode { background: color-mix(in srgb, #00b3a4 22%, transparent); }
    .nav-branch__logo-wrap--ovh { background: color-mix(in srgb, #123f6d 22%, transparent); }
    .nav-branch__logo-wrap--clouding { background: color-mix(in srgb, #6366f1 22%, transparent); }
    .nav-branch__logo-wrap--ionos { background: color-mix(in srgb, #003d8f 22%, transparent); }
    .nav-branch__logo-wrap--vultr { background: color-mix(in srgb, #007bfc 22%, transparent); }
    .nav-branch__logo-wrap--scaleway { background: color-mix(in srgb, #4f0599 22%, transparent); }
    .nav-branch__icon-wrap {
      width: 30px;
      height: 30px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--sidebar-primary) 12%, transparent);
      mat-icon { font-size: 1rem; color: var(--sidebar-primary); }
    }
    .tone-orange mat-icon { color: #fb923c; }
    .tone-blue mat-icon { color: #38bdf8; }
    .tone-cyan mat-icon { color: #22d3ee; }
    .tone-indigo mat-icon { color: #818cf8; }
    .tone-amber mat-icon { color: #fbbf24; }
    .tone-violet mat-icon { color: #a78bfa; }
    .tone-green mat-icon { color: #34d399; }
    .tone-pink mat-icon { color: #f472b6; }
    .nav-branch__text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
      text-align: left;
    }
    .nav-branch__label {
      font-size: 0.8rem;
      font-weight: 700;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .nav-branch__hint {
      font-size: 0.62rem;
      font-weight: 500;
      line-height: 1.35;
      color: var(--sidebar-text-faint);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .nav-branch__badge {
      font-size: 0.58rem;
      font-weight: 800;
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      background: linear-gradient(135deg, #ef4444, #f97316);
      color: #fff;
    }
    .nav-branch__chev {
      font-size: 1.1rem !important;
      width: 1.1rem !important;
      height: 1.1rem !important;
      opacity: 0.7;
    }
    .nav-branch__children { overflow: hidden; }
  `,
})
export class SidebarNavBranchComponent {
  readonly sidebar = inject(SidebarService)

  readonly branch = input.required<SidebarNavBranch>()
  readonly collapsed = input(false)
  readonly groupTone = input<string>('violet')
  readonly badgeResolver = input.required<(key?: string) => number | null>()

  readonly open = computed(() => this.sidebar.isExpanded(this.branch().id))

  readonly visibleChildren = computed(() => {
    const q = this.sidebar.searchQuery()
    const children = this.branch().children
    if (!q) return children
    return children.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.route.toLowerCase().includes(q) ||
        (c.hint ?? navHintForRoute(c.route) ?? '').toLowerCase().includes(q) ||
        this.branch().label.toLowerCase().includes(q) ||
        (this.branchHint() ?? '').toLowerCase().includes(q),
    )
  })

  toneClass = (): string => {
    const t = this.branch().tone ?? this.groupTone()
    return `tone-${t} nav-branch__icon-wrap`
  }

  branchLogo = () => sidebarBrandToLogo(this.branch().brand)

  branchBadge = (): number | null => this.badgeResolver()(this.branch().badgeKey)

  leafBadge = (key?: string): number | null => this.badgeResolver()(key)

  navHint = (route: string): string | undefined => navHintForRoute(route)

  branchHint = (): string | undefined => {
    const brand = this.branch().brand
    if (brand && SIDEBAR_BRANCH_HINTS[brand]) return SIDEBAR_BRANCH_HINTS[brand]
    return this.branch().description
  }

  branchTooltipText = (): string => {
    const brand = this.branch().brand
    if (brand) return branchTooltip(brand)
    const desc = this.branch().description ?? ''
    return desc.length <= 120 ? desc : `${desc.slice(0, 117)}…`
  }

  handleToggle = (): void => {
    if (this.collapsed()) return
    this.sidebar.toggleExpanded(this.branch().id)
  }
}
