import { ChangeDetectionStrategy, Component, inject, input, computed } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { SidebarService } from './sidebar.service'
import { SidebarNavLeafComponent } from './sidebar-nav-leaf.component'
import type { SidebarNavBranch } from '../../core/routing/area-nav.config'

@Component({
  selector: 'app-sidebar-nav-branch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, SidebarNavLeafComponent],
  template: `
    <div class="nav-branch">
      <button
        type="button"
        class="nav-branch__head"
        [class.nav-branch__head--open]="open()"
        (click)="handleToggle()"
        [attr.aria-expanded]="open()"
      >
        @if (branch().brand) {
          <span class="nav-branch__brand" [class]="'nav-branch__brand--' + branch().brand">{{ brandText() }}</span>
        } @else if (branch().icon) {
          <span class="nav-branch__icon-wrap" [class]="toneClass()">
            <mat-icon>{{ branch().icon }}</mat-icon>
          </span>
        }
        @if (!collapsed()) {
          <span class="nav-branch__label">{{ branch().label }}</span>
          @if (branchBadge()) {
            <span class="nav-branch__badge">{{ branchBadge() }}</span>
          }
          <mat-icon class="nav-branch__chev">{{ open() ? 'expand_less' : 'expand_more' }}</mat-icon>
        }
      </button>
      @if (open() && !collapsed()) {
        <div class="nav-branch__children">
          @for (leaf of visibleChildren(); track leaf.id) {
            <app-sidebar-nav-leaf
              [label]="leaf.label"
              [route]="leaf.route"
              [icon]="leaf.icon"
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
      color: var(--sidebar-text-muted);
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
    .nav-branch__brand {
      width: 30px;
      height: 30px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6rem;
      font-weight: 800;
      flex-shrink: 0;
      border: none;
    }
    .nav-branch__brand--aws { color: #ff9900; background: color-mix(in srgb, #ff9900 22%, transparent); }
    .nav-branch__brand--gcp { color: #4285f4; background: color-mix(in srgb, #4285f4 22%, transparent); }
    .nav-branch__brand--azure { color: #0078d4; background: color-mix(in srgb, #0078d4 22%, transparent); }
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
    .nav-branch__label {
      flex: 1;
      text-align: left;
      font-size: 0.8rem;
      font-weight: 700;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
    .nav-branch__children {
      animation: branchIn 0.22s ease;
    }
    @keyframes branchIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
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
        this.branch().label.toLowerCase().includes(q),
    )
  })

  toneClass = (): string => {
    const t = this.branch().tone ?? this.groupTone()
    return `tone-${t} nav-branch__icon-wrap`
  }

  brandText = (): string => {
    const b = this.branch().brand
    if (b === 'aws') return 'AWS'
    if (b === 'gcp') return 'GCP'
    return 'Az'
  }

  branchBadge = (): number | null => this.badgeResolver()(this.branch().badgeKey)

  leafBadge = (key?: string): number | null => this.badgeResolver()(key)

  handleToggle = (): void => {
    if (this.collapsed()) return
    this.sidebar.toggleExpanded(this.branch().id)
  }
}
