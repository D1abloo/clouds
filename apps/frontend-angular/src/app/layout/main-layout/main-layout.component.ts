import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ElementRef,
  viewChild,
} from '@angular/core'
import { Router, RouterOutlet, NavigationEnd } from '@angular/router'
import { filter, Subscription } from 'rxjs'
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
    <div class="layout-root">
      <app-sidebar />

      @if (!sidebarSvc.collapsed() && isMobile()) {
        <div class="sidebar-backdrop" (click)="sidebarSvc.setCollapsed(true)" role="presentation"></div>
      }

      <div class="layout-main">
        <app-topbar />
        <div class="layout-main-scroll" #mainScroll>
          <app-demo-banner />
          <app-module-area-tabs />
          <main class="layout-page">
            <router-outlet />
          </main>
        </div>
      </div>
    </div>
  `,
  styles: `
    .layout-root {
      display: flex;
      height: 100dvh;
      max-height: 100dvh;
      overflow: hidden;
      background: var(--app-surface);
    }
    .layout-main {
      flex: 1;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--app-surface);
    }
    .layout-main-scroll {
      flex: 1;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 1.25rem 1.5rem 2rem;
      scroll-behavior: auto;
    }
    .layout-page {
      width: 100%;
      max-width: min(100%, 1680px);
      margin: 0 auto;
      min-height: auto;
    }
    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      z-index: 99;
      backdrop-filter: blur(3px);
    }
    @media (max-width: 960px) {
      .layout-main-scroll { padding: 1rem; }
    }
  `,
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private readonly realtime = inject(RealtimeService)
  private readonly router = inject(Router)
  readonly sidebarSvc = inject(SidebarService)

  private readonly mainScrollRef = viewChild<ElementRef<HTMLElement>>('mainScroll')
  private navSub?: Subscription

  ngOnInit(): void {
    this.realtime.connect()
    if (this.isMobile()) this.sidebarSvc.setCollapsed(true)

    this.navSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.resetMainScroll())
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe()
  }

  closeMobileSidebar(): void {
    if (this.isMobile()) this.sidebarSvc.setCollapsed(true)
  }

  isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 960
  }

  private resetMainScroll = (): void => {
    const el = this.mainScrollRef()?.nativeElement
    if (el) {
      el.scrollTop = 0
      el.scrollLeft = 0
    }
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0)
    }
  }
}
