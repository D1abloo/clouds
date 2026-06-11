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
import { filter, Subscription } from 'rxjs'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatMenuModule } from '@angular/material/menu'
import { MatTooltipModule } from '@angular/material/tooltip'
import { ThemeService } from '../../core/services/theme.service'
import { NotificationsDropdownComponent } from './notifications-dropdown.component'
import { resolveRouteLabel } from '../../core/routing/route-labels'
import { CommandPaletteComponent } from './command-palette.component'
import { AppLogoComponent } from '../../shared/components/app-logo/app-logo.component'
import { ProModeService } from '../../core/services/pro-mode.service'
import { SidebarService } from '../sidebar/sidebar.service'
import { isCompactNavViewport } from '../layout-breakpoints'
import { ServerTimeService } from '../../core/services/server-time.service'

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
    AppLogoComponent,
    NotificationsDropdownComponent,
  ],
  template: `
    @if (paletteOpen()) {
      <app-command-palette (closeRequest)="paletteOpen.set(false)" />
    }

    <header class="topbar">
      @if (compactNav()) {
        <button
          mat-icon-button
          type="button"
          class="topbar-btn topbar-btn--menu"
          aria-label="Abrir menú de navegación"
          matTooltip="Menú"
          (click)="handleToggleNav()"
        >
          <mat-icon>menu</mat-icon>
        </button>
      }

      <div class="topbar-breadcrumb">
        <app-logo size="sm" class="topbar-logo" />
        <span class="topbar-brand">{{ brandName() }}</span>
        @if (pageLabel()) {
          <mat-icon class="topbar-chevron" aria-hidden="true">chevron_right</mat-icon>
          <span class="topbar-page">{{ pageLabel() }}</span>
        }
      </div>

      <span class="flex-1"></span>

      <span class="topbar-clock" [matTooltip]="'Hora del servidor (' + serverTime.timezone() + ')'" matTooltipPosition="below">
        <mat-icon aria-hidden="true">schedule</mat-icon>
        <time [attr.datetime]="serverTime.now().toISOString()">{{ clockDisplay() }}</time>
      </span>

      <button
        mat-icon-button
        type="button"
        class="topbar-btn"
        aria-label="Buscar (Ctrl+K)"
        matTooltip="Buscar (Ctrl+K)"
        (click)="paletteOpen.set(true)"
      >
        <mat-icon>search</mat-icon>
      </button>

      <app-notifications-dropdown />

      <button
        mat-icon-button
        type="button"
        class="topbar-btn"
        aria-label="Cambiar tema"
        [matTooltip]="theme.mode() === 'dark' ? 'Modo claro' : 'Modo oscuro'"
        (click)="theme.toggle()"
      >
        <mat-icon>{{ theme.mode() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
      </button>

      <button
        mat-icon-button
        type="button"
        class="topbar-btn topbar-btn--help"
        aria-label="Ayuda"
        matTooltip="Configuración"
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
      gap: 0.25rem;
      padding: 0 0.65rem 0 0.5rem;
      height: 52px;
      min-height: 52px;
      background: var(--app-topbar);
      box-shadow: var(--app-shadow-xs);
      flex-shrink: 0;
      z-index: 90;
      backdrop-filter: blur(8px);
    }
    .topbar-breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      min-width: 0;
      font-size: 0.82rem;
    }
    .topbar-brand {
      font-weight: 500;
      color: var(--sidebar-text-muted);
      white-space: nowrap;
    }
    .topbar-chevron {
      flex-shrink: 0;
      width: 1rem !important;
      height: 1rem !important;
      font-size: 0.95rem !important;
      color: var(--sidebar-text-faint);
    }
    .topbar-page {
      font-weight: 600;
      color: var(--sidebar-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
    .topbar-btn {
      width: 44px !important;
      height: 44px !important;
      line-height: 44px !important;
      position: relative;
      flex-shrink: 0;
      mat-icon { font-size: 1.15rem; width: 1.15rem; height: 1.15rem; color: var(--sidebar-text-muted); }
      &:hover mat-icon { color: var(--sidebar-text); }
    }
    .topbar-btn--menu mat-icon { font-size: 1.35rem; width: 1.35rem; height: 1.35rem; }
    @media (min-width: 1024px) {
      .topbar {
        padding: 0 1rem;
        height: 48px;
        min-height: 48px;
        gap: 0.35rem;
      }
      .topbar-btn {
        width: 34px !important;
        height: 34px !important;
        line-height: 34px !important;
      }
    }
    .topbar-clock {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.55rem;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--sidebar-text-muted);
      background: color-mix(in srgb, var(--sidebar-primary) 6%, transparent);
      flex-shrink: 0;
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    }
    @media (max-width: 767px) {
      .topbar-brand { display: none; }
      .topbar-page { max-width: 42vw; }
      .topbar-clock { display: none; }
    }
    @media (max-width: 480px) {
      .topbar-btn--help { display: none; }
    }
  `,
})
export class TopbarComponent implements OnInit, OnDestroy {
  readonly theme = inject(ThemeService)
  readonly pro = inject(ProModeService)
  readonly sidebarSvc = inject(SidebarService)
  readonly serverTime = inject(ServerTimeService)
  private readonly router = inject(Router)

  readonly paletteOpen = signal(false)
  readonly pageLabel = signal<string>('')
  readonly compactNav = signal(isCompactNavViewport())
  readonly clockDisplay = signal('')
  private clockTimer: ReturnType<typeof setInterval> | null = null

  readonly brandName = computed(() =>
    this.pro.proMode() && !this.pro.demoMode() ? 'Spendlyx' : 'CloudOps',
  )

  private routerSub?: Subscription

  @HostListener('window:resize')
  onResize(): void {
    this.compactNav.set(isCompactNavViewport())
  }

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
    this.pro.loadStatus()
    this.updateBreadcrumb(this.router.url)
    this.tickClock()
    this.clockTimer = setInterval(() => this.tickClock(), 1000)
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => this.updateBreadcrumb((e as NavigationEnd).urlAfterRedirects))
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe()
    if (this.clockTimer) clearInterval(this.clockTimer)
  }

  private tickClock = (): void => {
    this.clockDisplay.set(this.serverTime.format())
  }

  handleToggleNav = (): void => {
    this.sidebarSvc.toggle()
  }

  private updateBreadcrumb(url: string): void {
    this.pageLabel.set(resolveRouteLabel(url))
  }
}
