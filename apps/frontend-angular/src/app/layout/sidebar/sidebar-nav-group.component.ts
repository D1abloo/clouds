import { ChangeDetectionStrategy, Component, inject, input, computed } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { SidebarService } from './sidebar.service'
import { SidebarNavLeafComponent } from './sidebar-nav-leaf.component'
import { SidebarNavBranchComponent } from './sidebar-nav-branch.component'
import type { SidebarMainModule } from '../../core/routing/area-nav.config'
import { navHintForRoute } from './sidebar-nav-hints.config'
import { collapseExpand, panelReveal } from '../../shared/animations/ui-motion.animations'

@Component({
  selector: 'app-sidebar-nav-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatTooltipModule, RouterLink, SidebarNavLeafComponent, SidebarNavBranchComponent],
  animations: [collapseExpand, panelReveal],
  template: `
    <div class="nav-group" @panelReveal>
      @if (collapsed()) {
        <a
          class="nav-group__collapsed"
          [routerLink]="module().route"
          [class.nav-group__collapsed--active]="active()"
          [matTooltip]="module().label"
          matTooltipPosition="right"
          [attr.aria-label]="module().label"
        >
          <span class="nav-group__icon nav-group__icon--animated" [class]="'tone-' + module().tone" [class.nav-group__icon--active]="active()">
            <mat-icon>{{ module().icon }}</mat-icon>
          </span>
        </a>
      } @else {
      <div class="nav-group__head-row">
        <button
          type="button"
          class="nav-group__head"
          [class.nav-group__head--active]="active()"
          (click)="handleHeadClick()"
          [attr.aria-expanded]="open()"
        >
          <span class="nav-group__icon nav-group__icon--animated" [class]="'tone-' + module().tone" [class.nav-group__icon--active]="active()">
            <mat-icon>{{ module().icon }}</mat-icon>
          </span>
          <span class="nav-group__text">
            <span class="nav-group__label">{{ module().label }}</span>
            @if (module().description) {
              <span class="nav-group__desc">{{ module().description }}</span>
            }
          </span>
          <mat-icon class="nav-group__chev">{{ open() ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>
      </div>
      @if (open()) {
        <div class="nav-group__body" @collapseExpand>
          @if (hasBranches()) {
            @for (branch of visibleBranches(); track branch.id) {
              <app-sidebar-nav-branch
                [branch]="branch"
                [collapsed]="collapsed()"
                [groupTone]="module().tone"
                [badgeResolver]="badgeResolver()"
              />
            }
          } @else {
            @for (tab of visibleTabs(); track tab.id) {
              <app-sidebar-nav-leaf
                [label]="tab.label"
                [hint]="tab.hint ?? navHint(tab.route)"
                [route]="tab.route"
                [icon]="tab.icon"
                [logo]="tab.logo"
                [collapsed]="false"
                [badge]="badgeResolver()(tab.badgeKey)"
                [exactActive]="tab.route === '/dashboard'"
              />
            }
          }
        </div>
      }
      }
    </div>
  `,
  styles: `
    .nav-group { margin-bottom: 0.2rem; }
    .nav-group__head-row { display: flex; }
    .nav-group__head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: calc(100% - 0.3rem);
      margin: 0.12rem 0.15rem;
      padding: 0.48rem 0.55rem;
      border: none;
      border-radius: 12px;
      background: color-mix(in srgb, var(--sidebar-primary) 5%, transparent);
      cursor: pointer;
      color: var(--sidebar-text);
      transition: background 0.2s, color 0.2s, transform 0.18s;
      text-align: left;
    }
    .nav-group__head:hover {
      background: var(--sidebar-item-hover);
      color: var(--sidebar-text);
      transform: translateX(2px);
    }
    .nav-group__head--active {
      background: var(--sidebar-item-active);
      color: var(--sidebar-text);
    }
    .nav-group__icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.22s ease, box-shadow 0.25s ease;
      mat-icon { font-size: 1.05rem; width: 1.05rem; height: 1.05rem; }
    }
    .nav-group__icon--animated:hover {
      transform: scale(1.08);
      box-shadow: 0 0 14px color-mix(in srgb, var(--sidebar-primary) 30%, transparent);
    }
    .nav-group__icon--active {
      animation: groupIconPulse 2.4s ease-in-out infinite;
      box-shadow: 0 0 12px color-mix(in srgb, #6366f1 40%, transparent);
    }
    @keyframes groupIconPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    .tone-violet { background: color-mix(in srgb, #a78bfa 22%, transparent); mat-icon { color: #a78bfa; } }
    .tone-cyan { background: color-mix(in srgb, #22d3ee 22%, transparent); mat-icon { color: #22d3ee; } }
    .tone-blue { background: color-mix(in srgb, #38bdf8 22%, transparent); mat-icon { color: #38bdf8; } }
    .tone-amber { background: color-mix(in srgb, #fbbf24 22%, transparent); mat-icon { color: #fbbf24; } }
    .tone-green { background: color-mix(in srgb, #34d399 22%, transparent); mat-icon { color: #34d399; } }
    .tone-pink { background: color-mix(in srgb, #f472b6 22%, transparent); mat-icon { color: #f472b6; } }
    .tone-slate { background: color-mix(in srgb, #94a3b8 18%, transparent); mat-icon { color: #94a3b8; } }
    .nav-group__text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .nav-group__label {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .nav-group__desc {
      font-size: 0.62rem;
      font-weight: 500;
      line-height: 1.35;
      color: var(--sidebar-text-faint);
      text-transform: none;
      letter-spacing: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .nav-group__chev {
      font-size: 1.1rem !important;
      width: 1.1rem !important;
      height: 1.1rem !important;
      color: var(--sidebar-text-faint);
      flex-shrink: 0;
    }
    .nav-group__body {
      padding: 0.1rem 0 0.2rem;
    }
    .nav-group__collapsed {
      display: flex;
      justify-content: center;
      margin: 0.2rem 0.15rem;
      padding: 0.4rem;
      border-radius: 12px;
      text-decoration: none;
      &--active { background: var(--sidebar-item-active); }
      &:hover { background: var(--sidebar-item-hover); }
    }
  `,
})
export class SidebarNavGroupComponent {
  readonly sidebar = inject(SidebarService)

  readonly module = input.required<SidebarMainModule>()
  readonly collapsed = input(false)
  readonly active = input(false)
  readonly badgeResolver = input.required<(key?: string) => number | null>()

  readonly open = computed(() => this.sidebar.isExpanded(this.module().id))

  readonly hasBranches = computed(() => (this.module().branches?.length ?? 0) > 0)

  readonly visibleBranches = computed(() => {
    const q = this.sidebar.searchQuery()
    const branches = this.module().branches ?? []
    if (!q) return branches
    return branches.filter(
      (b) =>
        b.label.toLowerCase().includes(q) ||
        this.module().label.toLowerCase().includes(q) ||
        b.children.some(
          (c) =>
            c.label.toLowerCase().includes(q) ||
            c.route.toLowerCase().includes(q) ||
            (navHintForRoute(c.route) ?? '').toLowerCase().includes(q),
        ),
    )
  })

  readonly visibleTabs = computed(() => {
    const q = this.sidebar.searchQuery()
    const tabs = this.module().tabs
    if (!q) return tabs
    return tabs.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.route.toLowerCase().includes(q) ||
        (t.hint ?? navHintForRoute(t.route) ?? '').toLowerCase().includes(q) ||
        this.module().label.toLowerCase().includes(q) ||
        (this.module().description ?? '').toLowerCase().includes(q),
    )
  })

  navHint = (route: string): string | undefined => navHintForRoute(route)

  handleHeadClick = (): void => {
    if (this.collapsed()) return
    this.sidebar.toggleExpanded(this.module().id)
  }
}
