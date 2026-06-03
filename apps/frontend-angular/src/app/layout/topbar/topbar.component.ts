import { Component, inject, output, Input, signal, OnInit } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatMenuModule } from '@angular/material/menu'
import { MatBadgeModule } from '@angular/material/badge'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { RouterLink } from '@angular/router'
import { AuthService } from '../../core/services/auth.service'
import { ThemeService } from '../../core/services/theme.service'
import { DemoService } from '../../core/services/demo.service'
import { RealtimeService } from '../../core/services/realtime.service'

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterLink,
  ],
  template: `
    <header class="topbar">
      <button mat-icon-button type="button" aria-label="Toggle navigation" (click)="menuToggle.emit()">
        <mat-icon>menu</mat-icon>
      </button>

      <mat-form-field appearance="outline" class="topbar-search">
        <mat-icon matPrefix>search</mat-icon>
        <input matInput placeholder="Search resources, instances, jobs…" [formControl]="searchControl" />
      </mat-form-field>

      <div class="topbar-pills">
        <mat-form-field appearance="outline" class="topbar-select">
          <mat-select [formControl]="projectControl">
            <mat-option value="default">Default project</mat-option>
            <mat-option value="production">Production</mat-option>
            <mat-option value="staging">Staging</mat-option>
          </mat-select>
        </mat-form-field>

        <span class="mode-pill" [class.mode-pill--demo]="demo.demoMode()" [class.mode-pill--live]="!demo.demoMode()">
          <span class="mode-pill__dot"></span>
          {{ demo.demoMode() ? 'Demo mode' : 'Real mode' }}
        </span>

        <span class="ws-pill" [class.ws-pill--on]="realtime.connected()">
          <mat-icon>{{ realtime.connected() ? 'wifi' : 'wifi_off' }}</mat-icon>
          {{ realtime.connected() ? 'Live' : 'Offline' }}
        </span>
      </div>

      <span class="topbar-spacer"></span>

      <button mat-icon-button type="button" aria-label="Refresh" (click)="refreshClick.emit()">
        <mat-icon>refresh</mat-icon>
      </button>

      <button
        mat-icon-button
        type="button"
        [attr.aria-label]="theme.mode() === 'dark' ? 'Light theme' : 'Dark theme'"
        (click)="handleThemeToggle()"
      >
        <mat-icon>{{ theme.mode() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
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

      <button mat-button type="button" class="user-btn" [matMenuTriggerFor]="userMenu" aria-label="User menu">
        <span class="user-avatar">{{ userInitials() }}</span>
        <span class="user-email">{{ auth.user()?.email }}</span>
        <mat-icon>expand_more</mat-icon>
      </button>

      <mat-menu #userMenu="matMenu">
        <button mat-menu-item type="button" routerLink="/settings">
          <mat-icon>settings</mat-icon> Settings
        </button>
        <button mat-menu-item type="button" routerLink="/audit">
          <mat-icon>history</mat-icon> Audit log
        </button>
        <button mat-menu-item type="button" (click)="handleLogout()">
          <mat-icon>logout</mat-icon> Sign out
        </button>
      </mat-menu>
    </header>
  `,
  styles: `
    .topbar {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 1rem; min-height: 64px;
      background: var(--app-topbar);
      box-shadow: var(--app-shadow-sm);
      position: sticky; top: 0; z-index: 90;
    }
    .topbar-spacer { flex: 1; }
    .topbar-search {
      min-width: 200px; max-width: 340px; flex: 1;
      ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    }
    .topbar-select { width: 150px; ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; } }
    .topbar-pills { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .mode-pill, .ws-pill {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.3rem 0.65rem; border-radius: 999px;
      font-size: 0.72rem; font-weight: 600;
      background: var(--app-elevated); box-shadow: var(--app-shadow-xs);
    }
    .mode-pill__dot { width: 7px; height: 7px; border-radius: 50%; }
    .mode-pill--demo .mode-pill__dot { background: #3b82f6; }
    .mode-pill--live .mode-pill__dot { background: #22c55e; }
    .ws-pill mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .ws-pill--on { color: #16a34a; }
    .user-btn { display: inline-flex; align-items: center; gap: 0.35rem; max-width: 220px; }
    .user-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, var(--app-accent), var(--app-accent-dark));
      color: #fff; font-size: 0.75rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .user-email { display: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.82rem; }
    @media (min-width: 900px) { .user-email { display: inline; max-width: 140px; } }
    @media (max-width: 768px) {
      .topbar-search, .topbar-pills { display: none; }
    }
  `,
})
export class TopbarComponent implements OnInit {
  @Input() notificationCount = 0
  readonly menuToggle = output<void>()
  readonly refreshClick = output<void>()

  readonly auth = inject(AuthService)
  readonly theme = inject(ThemeService)
  readonly demo = inject(DemoService)
  readonly realtime = inject(RealtimeService)

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly projectControl = new FormControl('default', { nonNullable: true })

  ngOnInit(): void {
    this.realtime.connect()
    this.demo.refreshStatus()
  }

  userInitials = (): string => {
    const email = this.auth.user()?.email ?? 'U'
    return email.slice(0, 2).toUpperCase()
  }

  handleThemeToggle = (): void => this.theme.toggle()
  handleLogout = (): void => this.auth.logout()
}
