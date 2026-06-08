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
import { NotificationsStore } from '../../core/stores/notifications.store'
import { resolveRouteLabel } from '../../core/routing/route-labels'
import { CommandPaletteComponent } from './command-palette.component'
import { AppLogoComponent } from '../../shared/components/app-logo/app-logo.component'
import { ProModeService } from '../../core/services/pro-mode.service'

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
  ],
  template: `
    @if (paletteOpen()) {
      <app-command-palette (closeRequest)="paletteOpen.set(false)" />
    }

    <header class="topbar">
      <div class="flex items-center gap-1 text-[0.82rem]">
        <app-logo size="sm" class="topbar-logo" />
        <span class="font-medium text-[color:var(--sidebar-text-muted)]">{{ brandName() }}</span>
        @if (pageLabel()) {
          <mat-icon class="!h-4 !w-4 !text-[0.95rem] text-[color:var(--sidebar-text-faint)]">chevron_right</mat-icon>
          <span class="font-semibold text-[color:var(--sidebar-text)]">{{ pageLabel() }}</span>
        }
      </div>

      <span class="flex-1"></span>

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

      <button
        mat-icon-button
        type="button"
        class="topbar-btn topbar-btn--notif"
        [class.topbar-btn--notif-active]="notificationsStore.unreadTotal() > 0"
        aria-label="Notificaciones"
        matTooltip="Notificaciones"
        routerLink="/notifications/all"
      >
        <mat-icon>notifications</mat-icon>
        @if (notificationsStore.unreadTotal() > 0) {
          <span class="notif-dot" aria-hidden="true"></span>
        }
      </button>

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
        class="topbar-btn"
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
      gap: 0.35rem;
      padding: 0 1rem;
      height: 48px;
      min-height: 48px;
      background: var(--app-topbar);
      box-shadow: var(--app-shadow-xs);
      flex-shrink: 0;
      z-index: 90;
      backdrop-filter: blur(8px);
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
  `,
})
export class TopbarComponent implements OnInit, OnDestroy {
  readonly theme = inject(ThemeService)
  readonly pro = inject(ProModeService)
  readonly notificationsStore = inject(NotificationsStore)
  private readonly router = inject(Router)

  readonly paletteOpen = signal(false)
  readonly pageLabel = signal<string>('')

  readonly brandName = computed(() =>
    this.pro.proMode() && !this.pro.demoMode() ? 'Spendlyx' : 'CloudOps',
  )

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
    this.pro.loadStatus()
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
