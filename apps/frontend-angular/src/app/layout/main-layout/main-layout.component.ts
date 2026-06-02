import { Component, inject } from '@angular/core'
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatListModule } from '@angular/material/list'
import { MatIconModule } from '@angular/material/icon'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatButtonModule } from '@angular/material/button'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { AuthService } from '../../core/services/auth.service'
import { ThemeService } from '../../core/services/theme.service'
import { BreadcrumbsComponent } from '../breadcrumbs/breadcrumbs.component'

interface NavItem {
  label: string
  path: string
  icon: string
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatListModule, MatIconModule,
    MatToolbarModule, MatButtonModule, MatSlideToggleModule,
    BreadcrumbsComponent,
  ],
  template: `
    <mat-sidenav-container class="layout-container">
      <mat-sidenav mode="side" opened class="sidebar">
        <div class="brand">
          <mat-icon>cloud</mat-icon>
          <span>CloudOps</span>
        </div>
        <mat-nav-list>
          @for (item of navItems; track item.path) {
            <a mat-list-item [routerLink]="item.path" routerLinkActive="active">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content>
        <mat-toolbar class="topbar">
          <span class="spacer"></span>
          <mat-slide-toggle [checked]="theme.isDark()" (change)="theme.toggle()">Dark</mat-slide-toggle>
          <button mat-button (click)="auth.logout()">
            <mat-icon>logout</mat-icon> Logout
          </button>
        </mat-toolbar>
        <main class="content">
          <app-breadcrumbs />
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .layout-container { height: 100vh; }
    .sidebar { width: 260px; background: var(--surface); border-right: 1px solid var(--border); }
    .brand { display: flex; align-items: center; gap: 8px; padding: 20px 16px; font-weight: 700; font-size: 1.1rem; }
    .topbar { background: var(--surface); border-bottom: 1px solid var(--border); }
    .spacer { flex: 1; }
    .content { padding: 24px; max-width: 1400px; }
    a.active { background: rgba(59, 130, 246, 0.12); }
  `],
})
export class MainLayoutComponent {
  auth = inject(AuthService)
  theme = inject(ThemeService)

  navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'AWS Accounts', path: '/aws', icon: 'cloud' },
    { label: 'GCP Accounts', path: '/gcp', icon: 'cloud_queue' },
    { label: 'Azure Accounts', path: '/azure', icon: 'cloud_circle' },
    { label: 'VPS / Bare Metal', path: '/vps', icon: 'dns' },
    { label: 'Instances', path: '/instances', icon: 'memory' },
    { label: 'Terminal', path: '/terminal', icon: 'terminal' },
    { label: 'Docker', path: '/docker', icon: 'view_in_ar' },
    { label: 'Kubernetes', path: '/kubernetes', icon: 'hub' },
    { label: 'Jenkins', path: '/jenkins', icon: 'build' },
    { label: 'Terraform', path: '/terraform', icon: 'architecture' },
    { label: 'Billing', path: '/billing', icon: 'payments' },
    { label: 'Alerts', path: '/alerts', icon: 'warning' },
    { label: 'Notifications', path: '/notifications', icon: 'notifications' },
    { label: 'Audit', path: '/audit', icon: 'history' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
  ]
}
