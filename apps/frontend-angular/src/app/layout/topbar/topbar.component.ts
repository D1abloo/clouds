import { Component, inject, output, Input } from '@angular/core'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatMenuModule } from '@angular/material/menu'
import { MatBadgeModule } from '@angular/material/badge'
import { RouterLink } from '@angular/router'
import { AuthService } from '../../core/services/auth.service'
import { ThemeService } from '../../core/services/theme.service'

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    RouterLink,
  ],
  template: `
    <mat-toolbar class="topbar">
      <button
        mat-icon-button
        type="button"
        aria-label="Toggle navigation"
        (click)="menuToggle.emit()"
      >
        <mat-icon>menu</mat-icon>
      </button>

      <span class="topbar-spacer"></span>

      <button
        mat-icon-button
        type="button"
        [attr.aria-label]="
          theme.mode() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
        "
        (click)="handleThemeToggle()"
      >
        <mat-icon>{{
          theme.mode() === 'dark' ? 'light_mode' : 'dark_mode'
        }}</mat-icon>
      </button>

      <a
        mat-icon-button
        routerLink="/notifications"
        aria-label="Notifications"
        [matBadge]="notificationCount"
        [matBadgeHidden]="!notificationCount"
        matBadgeColor="warn"
        matBadgeSize="small"
      >
        <mat-icon>notifications</mat-icon>
      </a>

      <button
        mat-button
        type="button"
        [matMenuTriggerFor]="userMenu"
        aria-label="User menu"
      >
        <mat-icon>account_circle</mat-icon>
        <span class="user-email">{{ auth.user()?.email }}</span>
      </button>

      <mat-menu #userMenu="matMenu">
        <button mat-menu-item type="button" routerLink="/settings">
          <mat-icon>settings</mat-icon>
          Settings
        </button>
        <button mat-menu-item type="button" (click)="handleLogout()">
          <mat-icon>logout</mat-icon>
          Sign out
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: `
    .topbar {
      background: var(--app-card);
      border-bottom: 1px solid var(--app-border);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .topbar-spacer { flex: 1; }
    .user-email {
      margin-left: 0.5rem;
      display: none;
    }
    @media (min-width: 768px) {
      .user-email { display: inline; }
    }
  `,
})
export class TopbarComponent {
  @Input() notificationCount = 0
  readonly menuToggle = output<void>()

  readonly auth = inject(AuthService)
  readonly theme = inject(ThemeService)

  handleThemeToggle = (): void => this.theme.toggle()
  handleLogout = (): void => this.auth.logout()
}
