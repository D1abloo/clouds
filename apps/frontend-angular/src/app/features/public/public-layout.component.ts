import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { filter } from 'rxjs'
import { MatIconModule } from '@angular/material/icon'
import { CookieConsentService } from './cookie-consent.service'
import { SPENDLYX_CONTACT_EMAIL } from './public.constants'
import { bindPublicScroll, scrollPublicAnchor, scrollPublicToTop } from './public-scroll.util'
import { PUBLIC_THEME } from './public-theme'

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, FormsModule],
  template: `
    <div class="pub pub-layout" [class.pub-layout--cookie]="cookies.bannerVisible()">
      <header class="pub-header" [class.pub-header--scrolled]="headerScrolled()">
        <div class="pub-wrap pub-header__inner">
          <a routerLink="/" class="pub-logo" aria-label="Spendlyx inicio">
            <span class="pub-logo__mark">S</span>
            <span>Spendlyx</span>
          </a>
          <nav class="pub-nav" aria-label="Principal">
            <a routerLink="/producto" fragment="ai-infra-studio" routerLinkActive="active">AI Studio</a>
            <a href="/#funciones" (click)="handleAnchor($event, 'funciones')">Funciones</a>
            <a routerLink="/producto" routerLinkActive="active">Producto</a>
            <a href="/#precios" (click)="handleAnchor($event, 'precios')">Precios</a>
            <a routerLink="/docs" routerLinkActive="active">Docs</a>
            <a href="/#faq" (click)="handleAnchor($event, 'faq')">FAQ</a>
            <a routerLink="/contacto" routerLinkActive="active">Contacto</a>
          </nav>
          <div class="pub-header__actions">
            <a routerLink="/login" class="pub-btn pub-btn--outline pub-btn--sm">Iniciar sesión</a>
            <a routerLink="/registro" class="pub-btn pub-btn--primary pub-btn--sm">Crear cuenta</a>
            <button type="button" class="pub-menu-btn" (click)="toggleMenu()" [attr.aria-expanded]="menuOpen()" aria-label="Menú">
              <mat-icon>{{ menuOpen() ? 'close' : 'menu' }}</mat-icon>
            </button>
          </div>
        </div>
        @if (menuOpen()) {
          <nav class="pub-mobile-nav" aria-label="Menú móvil">
            <a routerLink="/producto" fragment="ai-infra-studio" (click)="closeMenu()">AI Studio</a>
            <a href="/#funciones" (click)="handleAnchor($event, 'funciones')">Funciones</a>
            <a routerLink="/producto" (click)="closeMenu()">Producto</a>
            <a href="/#precios" (click)="handleAnchor($event, 'precios')">Precios</a>
            <a routerLink="/docs" (click)="closeMenu()">Docs</a>
            <a href="/#faq" (click)="handleAnchor($event, 'faq')">FAQ</a>
            <a routerLink="/contacto" (click)="closeMenu()">Contacto</a>
            <a routerLink="/login" (click)="closeMenu()">Iniciar sesión</a>
            <a routerLink="/registro" (click)="closeMenu()">Crear cuenta</a>
          </nav>
        }
      </header>

      <main class="pub-main"><router-outlet /></main>

      <footer class="pub-footer">
        <div class="pub-wrap pub-footer__grid">
          <div class="pub-footer__brand">
            <strong class="pub-logo pub-logo--footer">Spendlyx</strong>
            <p>Plataforma cloud e IA para lanzar, observar y automatizar infraestructura desde un solo lugar.</p>
            <a [href]="'mailto:' + contactEmail">{{ contactEmail }}</a>
          </div>
          <div>
            <h4>Producto</h4>
            <a routerLink="/producto" fragment="ai-infra-studio">AI Infra Studio</a>
            <a routerLink="/producto" fragment="providers">Nubes y VPS</a>
            <a routerLink="/producto" fragment="inventory">Inventario</a>
            <a routerLink="/producto" fragment="security">Seguridad</a>
          </div>
          <div>
            <h4>Recursos</h4>
            <a routerLink="/docs">Documentación</a>
            <a routerLink="/casos-de-uso">Casos de uso</a>
            <a routerLink="/contacto">Contacto</a>
          </div>
          <div>
            <h4>Legal</h4>
            <a routerLink="/privacidad">Privacidad</a>
            <a routerLink="/cookies">Cookies</a>
            <a routerLink="/terminos">Términos</a>
            <a routerLink="/aviso-legal">Aviso legal</a>
          </div>
          <div>
            <h4>Cuenta</h4>
            <a routerLink="/login">Iniciar sesión</a>
            <a routerLink="/registro">Crear cuenta</a>
          </div>
        </div>
        <div class="pub-wrap pub-footer__copy">© {{ year }} Spendlyx. Todos los derechos reservados.</div>
      </footer>

      @if (cookies.bannerVisible()) {
        <aside class="pub-cookie" role="dialog" aria-label="Consentimiento de cookies">
          <p>Usamos cookies para mejorar tu experiencia.</p>
          <div class="pub-cookie__actions">
            <button type="button" class="pub-btn pub-btn--primary pub-btn--sm" (click)="cookies.acceptAll()">Aceptar todas</button>
            <button type="button" class="pub-btn pub-btn--outline pub-btn--sm" (click)="cookies.rejectNonEssential()">Rechazar no esenciales</button>
            <button type="button" class="pub-btn pub-btn--outline pub-btn--sm" (click)="cookies.openConfig()">Configurar</button>
            <a routerLink="/cookies" class="pub-cookie__link">Política de cookies</a>
          </div>
        </aside>
      }

      @if (cookies.configOpen()) {
        <div class="pub-cookie-modal" role="dialog" aria-label="Configurar cookies">
          <div class="pub-cookie-modal__panel">
            <h3>Configurar cookies</h3>
            <label><input type="checkbox" checked disabled /> Necesarias</label>
            <label><input type="checkbox" [(ngModel)]="prefs.analytics" /> Analíticas</label>
            <label><input type="checkbox" [(ngModel)]="prefs.preferences" /> Preferencias</label>
            <label><input type="checkbox" [(ngModel)]="prefs.marketing" /> Marketing</label>
            <div class="pub-cookie__actions">
              <button type="button" class="pub-btn pub-btn--primary pub-btn--sm" (click)="savePrefs()">Guardar preferencias</button>
              <button type="button" class="pub-btn pub-btn--outline pub-btn--sm" (click)="cookies.closeConfig()">Cancelar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    PUBLIC_THEME,
    `
    .pub-layout { min-height: 100dvh; display: flex; flex-direction: column; background: #fff; }
    .pub-layout--cookie .pub-main { padding-bottom: 5.5rem; }
    .pub-main { flex: 1; width: 100%; }
    .pub-header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid transparent;
      transition: box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
    }
    .pub-header--scrolled {
      background: rgba(255, 255, 255, 0.96);
      border-bottom-color: #e2e8f0;
      box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
    }
    .pub-header__inner { display: flex; align-items: center; gap: 1rem; min-height: 68px; }
    .pub-logo { display: flex; align-items: center; gap: 0.55rem; text-decoration: none; color: #0f172a; font-weight: 800; font-size: 1.12rem; }
    .pub-logo__mark {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: linear-gradient(135deg, #0284c7, #6366f1);
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 0.92rem;
      box-shadow: 0 6px 16px rgba(2, 132, 199, 0.3);
    }
    .pub-nav { display: none; gap: 1.35rem; margin-left: auto; }
    .pub-nav a {
      text-decoration: none;
      color: #475569;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.35rem 0;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
    }
    .pub-nav a.active { color: #0284c7; border-bottom-color: #0284c7; font-weight: 600; }
    .pub-nav a:hover { color: #0284c7; }
    .pub-header__actions { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; }
    .pub-btn--sm { padding: 0.48rem 0.9rem; font-size: 0.78rem; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }
    .pub-menu-btn {
      display: grid;
      place-items: center;
      background: none;
      border: none;
      cursor: pointer;
      color: #0f172a;
      padding: 0.35rem;
      min-width: 44px;
      min-height: 44px;
      border-radius: 10px;
    }
    .pub-mobile-nav {
      display: flex;
      flex-direction: column;
      padding: 0.5rem 1.35rem 1rem;
      border-top: 1px solid #e2e8f0;
      background: #fff;
      max-height: min(70dvh, 420px);
      overflow-y: auto;
    }
    .pub-mobile-nav a { padding: 0.7rem 0; text-decoration: none; color: #334155; font-weight: 500; border-bottom: 1px solid #f1f5f9; }
    @media (min-width: 900px) {
      .pub-nav { display: flex; }
      .pub-menu-btn, .pub-mobile-nav { display: none; }
      .pub-header__actions { margin-left: 0; }
    }
    @media (max-width: 899px) {
      .pub-header__actions .pub-btn { display: none; }
      .pub-header__inner { min-height: 60px; }
    }
    .pub-footer {
      background: linear-gradient(180deg, #0f172a 0%, #020617 100%);
      color: #94a3b8;
      padding: 3.5rem 0 1.75rem;
      margin-top: auto;
    }
    .pub-footer__grid { display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
    .pub-footer__brand p { font-size: 0.875rem; line-height: 1.6; max-width: 280px; margin: 0.65rem 0; }
    .pub-footer h4 { color: #e2e8f0; margin: 0 0 0.85rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; }
    .pub-footer a { display: block; color: #94a3b8; text-decoration: none; font-size: 0.85rem; margin-bottom: 0.45rem; transition: color 0.15s; }
    .pub-footer a:hover { color: #fff; }
    .pub-logo--footer { color: #fff; font-size: 1.1rem; }
    .pub-footer__copy { margin-top: 2.25rem; padding-top: 1.15rem; border-top: 1px solid #1e293b; font-size: 0.75rem; opacity: 0.85; }
    .pub-cookie {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 60;
      background: rgba(255, 255, 255, 0.97);
      backdrop-filter: blur(12px);
      border-top: 1px solid #e2e8f0;
      padding: 1rem 1.35rem;
      box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.1);
      display: flex;
      flex-wrap: wrap;
      gap: 0.85rem;
      align-items: center;
      justify-content: space-between;
    }
    .pub-cookie p { margin: 0; font-size: 0.875rem; color: #334155; }
    .pub-cookie__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .pub-cookie__link { font-size: 0.78rem; color: #0284c7; text-decoration: none; }
    .pub-cookie-modal { position: fixed; inset: 0; z-index: 70; background: rgba(15, 23, 42, 0.55); display: grid; place-items: center; padding: 1rem; }
    .pub-cookie-modal__panel { background: #fff; border-radius: 16px; padding: 1.5rem; max-width: 400px; width: 100%; display: flex; flex-direction: column; gap: 0.65rem; box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2); }
    .pub-cookie-modal__panel h3 { margin: 0 0 0.5rem; }
    .pub-cookie-modal__panel label { font-size: 0.875rem; display: flex; gap: 0.5rem; align-items: center; }
    `,
  ],
})
export class PublicLayoutComponent implements OnInit {
  readonly cookies = inject(CookieConsentService)
  readonly contactEmail = SPENDLYX_CONTACT_EMAIL
  readonly menuOpen = signal(false)
  readonly headerScrolled = signal(false)
  readonly year = new Date().getFullYear()
  prefs = { analytics: false, preferences: false, marketing: false }

  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private unbindScroll?: () => void

  ngOnInit(): void {
    this.unbindScroll = bindPublicScroll()
    this.destroyRef.onDestroy(() => this.unbindScroll?.())

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        scrollPublicToTop()
        this.closeMenu()
      })

    const onScroll = (): void => {
      this.headerScrolled.set(window.scrollY > 12)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll))
  }

  toggleMenu = (): void => {
    this.menuOpen.update((v) => !v)
  }

  closeMenu = (): void => {
    this.menuOpen.set(false)
  }

  savePrefs = (): void => {
    this.cookies.savePreferences(this.prefs)
  }

  handleAnchor = (event: Event, id: string): void => {
    event.preventDefault()
    this.closeMenu()
    const onHome = this.router.url === '/' || this.router.url.startsWith('/#')
    if (!onHome) {
      void this.router.navigate(['/']).then(() => {
        requestAnimationFrame(() => scrollPublicAnchor(id))
      })
      return
    }
    scrollPublicAnchor(id)
  }
}
