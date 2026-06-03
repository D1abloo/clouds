import { Component, inject, signal, OnInit } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { SidebarComponent } from '../sidebar/sidebar.component'
import { TopbarComponent } from '../topbar/topbar.component'
import { BreadcrumbsComponent } from '../breadcrumbs/breadcrumbs.component'
import { DemoBannerComponent } from '../../shared/components/demo-banner/demo-banner.component'
import { RealtimeService } from '../../core/services/realtime.service'

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, BreadcrumbsComponent, DemoBannerComponent],
  template: `
    <div class="app-shell layout-root">
      <app-sidebar [collapsed]="sidebarCollapsed()" (navigate)="closeMobileSidebar()" />
      @if (!sidebarCollapsed() && isMobile()) {
        <div class="sidebar-backdrop" (click)="sidebarCollapsed.set(true)" role="presentation"></div>
      }
      <div class="layout-main">
        <app-topbar
          [notificationCount]="3"
          (menuToggle)="toggleSidebar()"
          (refreshClick)="handleGlobalRefresh()"
        />
        <div class="layout-content animate-fade-in">
          <app-breadcrumbs />
          <app-demo-banner />
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: `
    .layout-root {
      display: flex;
      min-height: 100vh;
    }
    .layout-main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      background: var(--app-surface);
    }
    .layout-content {
      flex: 1;
      padding: 1.25rem 1.5rem 2rem;
      max-width: 1480px;
      width: 100%;
      margin: 0 auto;
    }
    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      z-index: 99;
      backdrop-filter: blur(2px);
    }
    @media (max-width: 960px) {
      .layout-content { padding: 1rem; }
    }
  `,
})
export class MainLayoutComponent implements OnInit {
  private readonly realtime = inject(RealtimeService)

  readonly sidebarCollapsed = signal(typeof window !== 'undefined' && window.innerWidth <= 960)

  ngOnInit(): void {
    this.realtime.connect()
  }

  toggleSidebar = (): void => {
    this.sidebarCollapsed.update((v) => !v)
  }

  closeMobileSidebar = (): void => {
    if (this.isMobile()) this.sidebarCollapsed.set(true)
  }

  isMobile = (): boolean => typeof window !== 'undefined' && window.innerWidth <= 960

  handleGlobalRefresh = (): void => {
    window.dispatchEvent(new CustomEvent('cloudops:refresh'))
  }
}
