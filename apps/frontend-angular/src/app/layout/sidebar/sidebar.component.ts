import { Component, Input, output } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'

export interface NavItem {
  label: string
  icon: string
  route: string
  badge?: number
}

export interface NavSection {
  title: string
  items: NavItem[]
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  template: `
    <aside class="sidebar animate-slide-in" [class.collapsed]="collapsed">
      <div class="sidebar-brand">
        <div class="sidebar-brand__logo">
          <mat-icon>cloud_queue</mat-icon>
        </div>
        @if (!collapsed) {
          <div class="sidebar-brand__text">
            <strong>CloudOps</strong>
            <span>Control Center</span>
          </div>
        }
      </div>

      <nav class="sidebar-nav">
        @for (section of sections; track section.title) {
          @if (!collapsed) {
            <div class="nav-section-title">{{ section.title }}</div>
          }
          @for (item of section.items; track item.route) {
            <a
              class="nav-item"
              [routerLink]="item.route"
              routerLinkActive="active"
              [matTooltip]="collapsed ? item.label : ''"
              matTooltipPosition="right"
              [attr.aria-label]="item.label"
              (click)="navigate.emit()"
            >
              <mat-icon>{{ item.icon }}</mat-icon>
              @if (!collapsed) {
                <span>{{ item.label }}</span>
                @if (item.badge) {
                  <span class="nav-badge">{{ item.badge }}</span>
                }
              }
            </a>
          }
        }
      </nav>

      <div class="sidebar-footer">
        @if (!collapsed) {
          <span class="sidebar-version">v0.1 · Demo ready</span>
        }
      </div>
    </aside>
  `,
  styles: `
    .sidebar {
      width: 268px;
      min-height: 100vh;
      background: var(--app-sidebar);
      box-shadow: var(--app-shadow-md);
      display: flex;
      flex-direction: column;
      transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 100;
      &.collapsed { width: 76px; }
    }
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 1.35rem 1rem 1.15rem;
      margin-bottom: 0.25rem;
    }
    .sidebar-brand__logo {
      width: 42px; height: 42px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--app-accent), var(--app-accent-dark));
      box-shadow: 0 4px 14px color-mix(in srgb, var(--app-accent) 35%, transparent);
      mat-icon { color: #fff; }
    }
    .sidebar-brand__text {
      strong { display: block; font-size: 1.05rem; letter-spacing: -0.02em; }
      span { font-size: 0.72rem; color: var(--app-text-muted); }
    }
    .sidebar-nav { flex: 1; padding: 0 0.65rem; overflow-y: auto; }
    .nav-section-title {
      font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--app-text-muted);
      padding: 1rem 0.65rem 0.35rem;
    }
    .nav-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.65rem 0.85rem; margin-bottom: 0.2rem;
      border-radius: var(--app-radius-md);
      color: inherit; text-decoration: none;
      font-size: 0.875rem; font-weight: 500;
      transition: all 0.2s ease;
      mat-icon { font-size: 1.25rem; width: 1.25rem; height: 1.25rem; opacity: 0.85; }
      &:hover {
        background: color-mix(in srgb, var(--app-accent) 8%, transparent);
        transform: translateX(2px);
      }
      &.active {
        background: color-mix(in srgb, var(--app-accent) 14%, transparent);
        color: var(--app-accent);
        box-shadow: var(--app-shadow-xs);
        mat-icon { opacity: 1; }
      }
    }
    .collapsed .nav-item { justify-content: center; padding: 0.75rem; }
    .nav-badge {
      margin-left: auto; font-size: 0.65rem; font-weight: 700;
      padding: 0.1rem 0.45rem; border-radius: 999px;
      background: var(--app-danger); color: #fff;
    }
    .sidebar-footer {
      padding: 1rem; border-top: 1px solid var(--app-divider);
    }
    .sidebar-version { font-size: 0.68rem; color: var(--app-text-muted); }
    @media (max-width: 960px) {
      .sidebar {
        position: fixed; left: 0; top: 0; bottom: 0;
        transform: translateX(0);
      }
      .sidebar.collapsed { transform: translateX(-100%); width: 268px; }
    }
  `,
})
export class SidebarComponent {
  @Input() collapsed = false
  readonly navigate = output<void>()

  readonly sections: NavSection[] = [
    {
      title: 'Overview',
      items: [{ label: 'Dashboard', icon: 'dashboard', route: '/dashboard' }],
    },
    {
      title: 'Clouds',
      items: [
        { label: 'AWS', icon: 'cloud', route: '/accounts/aws' },
        { label: 'GCP', icon: 'cloud_circle', route: '/accounts/gcp' },
        { label: 'Azure', icon: 'cloud_queue', route: '/accounts/azure' },
      ],
    },
    {
      title: 'Infrastructure',
      items: [
        { label: 'VPS / Bare Metal', icon: 'dns', route: '/vps' },
        { label: 'Instances', icon: 'memory', route: '/instances' },
        { label: 'Docker', icon: 'view_in_ar', route: '/docker' },
        { label: 'Kubernetes', icon: 'hub', route: '/kubernetes' },
      ],
    },
    {
      title: 'Automation',
      items: [
        { label: 'Jenkins', icon: 'build', route: '/jenkins' },
        { label: 'Terraform', icon: 'architecture', route: '/terraform' },
        { label: 'Terminal', icon: 'terminal', route: '/terminal' },
      ],
    },
    {
      title: 'Observability',
      items: [
        { label: 'Billing', icon: 'payments', route: '/billing' },
        { label: 'Alerts', icon: 'warning', route: '/alerts', badge: 3 },
        { label: 'Notifications', icon: 'notifications', route: '/notifications' },
      ],
    },
    {
      title: 'Admin',
      items: [
        { label: 'Audit', icon: 'history', route: '/audit' },
        { label: 'Settings', icon: 'settings', route: '/settings' },
      ],
    },
  ]
}
