import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  computed,
  HostListener,
} from '@angular/core'
import { Router, NavigationEnd, RouterLink } from '@angular/router'
import { filter } from 'rxjs/operators'
import { Subscription } from 'rxjs'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatMenuModule } from '@angular/material/menu'
import { MatTooltipModule } from '@angular/material/tooltip'
import { AuthService } from '../../core/services/auth.service'
import { ThemeService } from '../../core/services/theme.service'
import { DemoService } from '../../core/services/demo.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { AlertsStore } from '../../core/stores/alerts.store'
import { resolveRouteLabel } from '../../core/routing/route-labels'
import { CommandPaletteComponent } from './command-palette.component'

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    RouterLink,
    CommandPaletteComponent,
  ],
  template: `
    <!-- Command Palette overlay -->
    @if (paletteOpen()) {
      <app-command-palette (closeRequest)="paletteOpen.set(false)" />
    }

    <header class="topbar">
      <div class="flex items-center gap-1 text-[0.82rem]">
        <span class="font-medium text-[color:var(--sidebar-text-muted)]">CloudOps</span>
        @if (pageLabel()) {
          <mat-icon class="!h-4 !w-4 !text-[0.95rem] text-[color:var(--sidebar-text-faint)]">chevron_right</mat-icon>
          <span class="font-semibold text-[color:var(--sidebar-text)]">{{ pageLabel() }}</span>
        }
      </div>

      <span class="flex-1"></span>

      <!-- Status pills (compact) -->
      <div class="topbar-pills">
        <span class="mode-pill" [class.mode-pill--demo]="demo.demoMode()">
          <span class="mode-dot"></span>
          {{ demo.demoMode() ? 'Demo' : 'Live' }}
        </span>
        <span
          class="ws-pill"
          [class.ws-pill--on]="realtime.connected()"
          [matTooltip]="realtime.connected() ? 'WebSocket connected' : 'WebSocket offline'"
        >
          <mat-icon>{{ realtime.connected() ? 'wifi' : 'wifi_off' }}</mat-icon>
        </span>
      </div>

      <!-- Right icon buttons -->
      <button
        mat-icon-button
        type="button"
        class="topbar-btn"
        aria-label="Search (Ctrl+K)"
        matTooltip="Search (Ctrl+K)"
        (click)="paletteOpen.set(true)"
      >
        <mat-icon>search</mat-icon>
      </button>

      <button
        mat-icon-button
        type="button"
        class="topbar-btn topbar-btn--notif"
        [class.topbar-btn--notif-active]="alertsStore.activeAlerts() > 0"
        aria-label="Notifications"
        matTooltip="Alerts"
        routerLink="/alerts"
      >
        <mat-icon>notifications</mat-icon>
        @if (alertsStore.activeAlerts() > 0) {
          <span class="notif-dot"></span>
        }
      </button>

      <button
        mat-icon-button
        type="button"
        class="topbar-btn"
        aria-label="Toggle theme"
        [matTooltip]="theme.mode() === 'dark' ? 'Light mode' : 'Dark mode'"
        (click)="theme.toggle()"
      >
        <mat-icon>{{ theme.mode() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
      </button>

      <button
        mat-icon-button
        type="button"
        class="topbar-btn"
        aria-label="Help"
        matTooltip="Settings & documentation"
        routerLink="/settings/general"
      >
        <mat-icon>help_outline</mat-icon>
      </button>
    </header>
  `,
  styles: `
    .topbar {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0 1rem;
      height: 48px;
      min-height: 48px;
      background: var(--app-topbar);
      box-shadow: var(--app-shadow-xs);
      position: sticky;
      top: 0;
      z-index: 90;
      backdrop-filter: blur(8px);
    }

    .topbar-spacer { flex: 1; }

    .topbar-breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.82rem;
    }

    .breadcrumb-root {
      color: var(--sidebar-text-muted);
      font-weight: 500;
    }

    .breadcrumb-sep {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: var(--sidebar-text-faint);
    }

    .breadcrumb-leaf {
      color: var(--sidebar-text);
      font-weight: 600;
    }

    .topbar-pills {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .mode-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 600;
      background: var(--sidebar-item-hover);
      color: var(--sidebar-text-muted);
    }

    .mode-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--sidebar-text-faint);
    }

    .mode-pill--demo .mode-dot { background: #60a5fa; }

    .ws-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem;
      border-radius: 6px;
      color: var(--sidebar-text-faint);

      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }

      &.ws-pill--on { color: #4caf50; }
    }

    .topbar-btn {
      width: 34px !important;
      height: 34px !important;
      line-height: 34px !important;
      position: relative;

      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: var(--sidebar-text-muted); }

      &:hover mat-icon { color: var(--sidebar-text); }
    }

    .topbar-btn--notif { position: relative; }

    .notif-dot {
      position: absolute;
      top: 5px;
      right: 5px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #f44336;
      border: 1.5px solid var(--app-topbar);
    }

    @media (max-width: 640px) {
      .topbar-pills { display: none; }
    }
  `,
})
export class TopbarComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService)
  readonly theme = inject(ThemeService)
  readonly demo = inject(DemoService)
  readonly realtime = inject(RealtimeService)
  readonly alertsStore = inject(AlertsStore)
  private readonly router = inject(Router)

  readonly paletteOpen = signal(false)
  readonly pageLabel = signal<string>('')

  private routerSub?: Subscription

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      this.paletteOpen.update((v) => !v)
    }
    if (e.key === 'Escape' && this.paletteOpen()) {
      this.paletteOpen.set(false)
    }
  }

  ngOnInit(): void {
    this.realtime.connect()
    this.demo.refreshStatus()
    this.updateBreadcrumb(this.router.url)
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => this.updateBreadcrumb((e as NavigationEnd).urlAfterRedirects))
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe()
  }

  private updateBreadcrumb(url: string): void {
    this.pageLabel.set(resolveRouteLabel(url))
  }
}
