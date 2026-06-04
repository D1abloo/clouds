import { Component, inject, OnInit } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { SidebarComponent } from '../sidebar/sidebar.component'
import { TopbarComponent } from '../topbar/topbar.component'
import { DemoBannerComponent } from '../../shared/components/demo-banner/demo-banner.component'
import { ModuleAreaTabsComponent } from '../module-area-tabs/module-area-tabs.component'
import { RealtimeService } from '../../core/services/realtime.service'
import { SidebarService } from '../sidebar/sidebar.service'

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, DemoBannerComponent, ModuleAreaTabsComponent],
  template: `
    <div class="app-shell layout-root">
      <app-sidebar />

      @if (!sidebarSvc.collapsed() && isMobile()) {
        <div class="sidebar-backdrop" (click)="sidebarSvc.setCollapsed(true)" role="presentation"></div>
      }

      <div class="layout-main">
        <app-topbar />
        <div class="layout-content animate-fade-in">
          <app-demo-banner />
          <app-module-area-tabs />
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
      max-width: min(100%, 1680px);
      width: 100%;
      margin: 0 auto;
    }
    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      z-index: 99;
      backdrop-filter: blur(3px);
    }
    @media (max-width: 960px) {
      .layout-content { padding: 1rem; }
    }
  `,
})
export class MainLayoutComponent implements OnInit {
  private readonly realtime = inject(RealtimeService)
  readonly sidebarSvc = inject(SidebarService)

  ngOnInit(): void {
    this.realtime.connect()
    if (this.isMobile()) this.sidebarSvc.setCollapsed(true)
  }

  closeMobileSidebar(): void {
    if (this.isMobile()) this.sidebarSvc.setCollapsed(true)
  }

  isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 960
  }
}
