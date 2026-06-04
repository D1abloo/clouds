import { ChangeDetectionStrategy, Component, inject, input, computed } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { SidebarGroup } from './sidebar-tree.config'
import { SidebarService } from './sidebar.service'
import { SidebarNavBranchComponent } from './sidebar-nav-branch.component'

@Component({
  selector: 'app-sidebar-nav-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, SidebarNavBranchComponent],
  template: `
    <div class="nav-group">
      <button type="button" class="nav-group__head" (click)="toggle()">
        <span class="nav-group__icon" [class]="'tone-' + group().tone">
          <mat-icon>{{ group().icon }}</mat-icon>
        </span>
        @if (!collapsed()) {
          <span class="nav-group__label">{{ group().label }}</span>
          <mat-icon class="nav-group__chev">{{ open() ? 'expand_less' : 'expand_more' }}</mat-icon>
        }
      </button>
      @if (open() && !collapsed()) {
        <div class="nav-group__body">
          @for (branch of visibleBranches(); track branch.id) {
            <app-sidebar-nav-branch
              [branch]="branch"
              [collapsed]="collapsed()"
              [groupTone]="group().tone"
              [badgeResolver]="badgeResolver()"
            />
          }
        </div>
      }
    </div>
  `,
  styles: `
    .nav-group { margin-bottom: 0.35rem; }
    .nav-group__head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: calc(100% - 0.35rem);
      margin: 0.15rem 0.2rem;
      padding: 0.5rem 0.55rem;
      border: none;
      border-radius: 12px;
      background: color-mix(in srgb, var(--sidebar-primary) 6%, transparent);
      cursor: pointer;
      color: var(--sidebar-text);
      transition: background 0.2s, transform 0.18s;
    }
    .nav-group__head:hover {
      transform: translateX(2px);
      background: color-mix(in srgb, var(--sidebar-primary) 12%, transparent);
    }
    .nav-group__icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
    }
    .tone-violet { background: color-mix(in srgb, #a78bfa 22%, transparent); mat-icon { color: #a78bfa; } }
    .tone-cyan { background: color-mix(in srgb, #22d3ee 22%, transparent); mat-icon { color: #22d3ee; } }
    .tone-blue { background: color-mix(in srgb, #38bdf8 22%, transparent); mat-icon { color: #38bdf8; } }
    .tone-amber { background: color-mix(in srgb, #fbbf24 22%, transparent); mat-icon { color: #fbbf24; } }
    .tone-green { background: color-mix(in srgb, #34d399 22%, transparent); mat-icon { color: #34d399; } }
    .tone-pink { background: color-mix(in srgb, #f472b6 22%, transparent); mat-icon { color: #f472b6; } }
    .tone-indigo { background: color-mix(in srgb, #818cf8 22%, transparent); mat-icon { color: #818cf8; } }
    .tone-orange { background: color-mix(in srgb, #fb923c 22%, transparent); mat-icon { color: #fb923c; } }
    .tone-slate { background: color-mix(in srgb, #94a3b8 18%, transparent); mat-icon { color: #94a3b8; } }
    .nav-group__label {
      flex: 1;
      text-align: left;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .nav-group__chev {
      font-size: 1.15rem !important;
      width: 1.15rem !important;
      height: 1.15rem !important;
      color: var(--sidebar-text-faint);
    }
    .nav-group__body { padding-bottom: 0.25rem; }
  `,
})
export class SidebarNavGroupComponent {
  readonly sidebar = inject(SidebarService)

  readonly group = input.required<SidebarGroup>()
  readonly collapsed = input(false)
  readonly badgeResolver = input.required<(key?: string) => number | null>()

  readonly open = computed(() => this.sidebar.isExpanded(this.group().id))

  readonly visibleBranches = computed(() => {
    const q = this.sidebar.searchQuery()
    if (!q) return this.group().branches
    return this.group().branches.filter(
      (b) =>
        b.label.toLowerCase().includes(q) ||
        b.children.some(
          (c) => c.label.toLowerCase().includes(q) || c.route.toLowerCase().includes(q),
        ),
    )
  })

  toggle = (): void => {
    if (this.collapsed()) return
    this.sidebar.toggleExpanded(this.group().id)
  }
}
