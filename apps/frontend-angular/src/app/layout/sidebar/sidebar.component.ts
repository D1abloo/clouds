import { Component, Input, output } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { MatListModule } from '@angular/material/list'
import { MatIconModule } from '@angular/material/icon'
import { MatExpansionModule } from '@angular/material/expansion'

export interface NavItem {
  label: string
  icon: string
  route: string
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatListModule,
    MatIconModule,
    MatExpansionModule,
  ],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed">
      <div class="sidebar-brand">
        <mat-icon>cloud_queue</mat-icon>
        @if (!collapsed) {
          <span>CloudOps</span>
        }
      </div>

      <mat-nav-list>
        @for (item of mainNav; track item.route) {
          <a
            mat-list-item
            [routerLink]="item.route"
            routerLinkActive="active"
            [attr.aria-label]="item.label"
            (click)="navigate.emit()"
          >
            <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
            @if (!collapsed) {
              <span matListItemTitle>{{ item.label }}</span>
            }
          </a>
        }
      </mat-nav-list>

      @if (!collapsed) {
        <mat-expansion-panel class="nav-group" expanded>
          <mat-expansion-panel-header>
            <mat-panel-title>Cloud Accounts</mat-panel-title>
          </mat-expansion-panel-header>
          <mat-nav-list>
            @for (item of cloudNav; track item.route) {
              <a
                mat-list-item
                [routerLink]="item.route"
                routerLinkActive="active"
                (click)="navigate.emit()"
              >
                <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            }
          </mat-nav-list>
        </mat-expansion-panel>
      }

      <mat-nav-list>
        @for (item of opsNav; track item.route) {
          <a
            mat-list-item
            [routerLink]="item.route"
            routerLinkActive="active"
            (click)="navigate.emit()"
          >
            <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
            @if (!collapsed) {
              <span matListItemTitle>{{ item.label }}</span>
            }
          </a>
        }
      </mat-nav-list>
    </aside>
  `,
  styles: `
    .sidebar {
      width: 260px;
      min-height: 100vh;
      background: var(--app-card);
      border-right: 1px solid var(--app-border);
      display: flex;
      flex-direction: column;
      transition: width 0.2s ease;
      &.collapsed { width: 72px; }
    }
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.25rem 1rem;
      font-weight: 700;
      font-size: 1.125rem;
      border-bottom: 1px solid var(--app-border);
    }
    .nav-group {
      box-shadow: none;
      background: transparent;
      margin: 0 0.5rem;
    }
    a.active {
      background: rgba(59, 130, 246, 0.12);
      border-radius: 8px;
    }
    @media (max-width: 960px) {
      .sidebar {
        position: fixed;
        z-index: 100;
        transform: translateX(0);
      }
      .sidebar.collapsed {
        transform: translateX(-100%);
        width: 260px;
      }
    }
  `,
})
export class SidebarComponent {
  @Input() collapsed = false
  readonly navigate = output<void>()

  readonly mainNav: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Instances', icon: 'dns', route: '/instances' },
    { label: 'VPS', icon: 'storage', route: '/vps' },
    { label: 'Terminal', icon: 'terminal', route: '/terminal' },
  ]

  readonly cloudNav: NavItem[] = [
    { label: 'AWS', icon: 'cloud', route: '/accounts/aws' },
    { label: 'GCP', icon: 'cloud', route: '/accounts/gcp' },
    { label: 'Azure', icon: 'cloud', route: '/accounts/azure' },
  ]

  readonly opsNav: NavItem[] = [
    { label: 'Docker', icon: 'view_in_ar', route: '/docker' },
    { label: 'Kubernetes', icon: 'hub', route: '/kubernetes' },
    { label: 'Jenkins', icon: 'build', route: '/jenkins' },
    { label: 'Terraform', icon: 'architecture', route: '/terraform' },
    { label: 'Billing', icon: 'payments', route: '/billing' },
    { label: 'Alerts', icon: 'warning', route: '/alerts' },
    { label: 'Notifications', icon: 'notifications', route: '/notifications' },
    { label: 'Audit', icon: 'history', route: '/audit' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
  ]
}
