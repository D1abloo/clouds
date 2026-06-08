import { Component, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { CookieConsentService } from './cookie-consent.service'
import { SPENDLYX_CONTACT_EMAIL } from './public.constants'
import { PUBLIC_THEME } from './public-theme'

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, FormsModule],
  template: `
    <div class="pub pub-layout">
      <header class="pub-header" [class.pub-header--open]="menuOpen()">
        <div class="pub-wrap pub-header__inner">
          <a routerLink="/" class="pub-logo" aria-label="Spendlyx inicio">
            <span class="pub-logo__mark">S</span>
            <span>Spendlyx</span>
          </a>
          <nav class="pub-nav" aria-label="Principal">
            <a routerLink="/producto" routerLinkActive="active">Producto</a>
            <a routerLink="/casos-de-uso" routerLinkActive="active">Casos de uso</a>
            <a routerLink="/docs" routerLinkActive="active">Docs</a>
            <a routerLink="/planes" routerLinkActive="active">Planes</a>
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
            <a routerLink="/producto" (click)="closeMenu()">Producto</a>
            <a routerLink="/casos-de-uso" (click)="closeMenu()">Casos de uso</a>
            <a routerLink="/docs" (click)="closeMenu()">Docs</a>
            <a routerLink="/planes" (click)="closeMenu()">Planes</a>
            <a routerLink="/contacto" (click)="closeMenu()">Contacto</a>
            <a routerLink="/login" (click)="closeMenu()">Iniciar sesión</a>
            <a routerLink="/registro" (click)="closeMenu()">Crear cuenta</a>
          </nav>
        }
      </header>

      <main><router-outlet /></main>

      <footer class="pub-footer">
        <div class="pub-wrap pub-footer__grid">
          <div>
            <strong class="pub-logo pub-logo--footer">Spendlyx</strong>
            <p>Panel live para gestión cloud, operaciones e infraestructura en un solo lugar.</p>
            <a [href]="'mailto:' + contactEmail">{{ contactEmail }}</a>
          </div>
          <div>
            <h4>Producto</h4>
            <a routerLink="/producto">Panel live</a>
            <a routerLink="/producto">Nubes</a>
            <a routerLink="/producto">Observabilidad</a>
            <a routerLink="/producto">Seguridad</a>
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
    .pub-layout { min-height: 100dvh; display: flex; flex-direction: column; }
    .pub-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,.92); backdrop-filter: blur(12px); border-bottom: 1px solid #e2e8f0; }
    .pub-header__inner { display: flex; align-items: center; gap: 1rem; min-height: 64px; }
    .pub-logo { display: flex; align-items: center; gap: .5rem; text-decoration: none; color: #0f172a; font-weight: 800; font-size: 1.1rem; }
    .pub-logo__mark { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg,#0284c7,#6366f1); color: #fff; display: grid; place-items: center; font-size: .9rem; }
    .pub-nav { display: none; gap: 1.25rem; margin-left: auto; }
    .pub-nav a { text-decoration: none; color: #475569; font-size: .875rem; font-weight: 500; }
    .pub-nav a.active, .pub-nav a:hover { color: #0284c7; }
    .pub-header__actions { display: flex; align-items: center; gap: .5rem; margin-left: auto; }
    .pub-btn--sm { padding: .45rem .85rem; font-size: .78rem; }
    .pub-menu-btn { display: grid; background: none; border: none; cursor: pointer; color: #0f172a; }
    .pub-mobile-nav { display: flex; flex-direction: column; padding: .5rem 1.25rem 1rem; border-top: 1px solid #e2e8f0; }
    .pub-mobile-nav a { padding: .65rem 0; text-decoration: none; color: #334155; font-weight: 500; }
    @media (min-width: 900px) { .pub-nav { display: flex; } .pub-menu-btn, .pub-mobile-nav { display: none; } .pub-header__actions { margin-left: 0; } }
    main { flex: 1; }
    .pub-footer { background: #0f172a; color: #94a3b8; padding: 3rem 0 1.5rem; margin-top: auto; }
    .pub-footer__grid { display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); }
    .pub-footer h4 { color: #e2e8f0; margin: 0 0 .75rem; font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; }
    .pub-footer a { display: block; color: #94a3b8; text-decoration: none; font-size: .85rem; margin-bottom: .4rem; }
    .pub-footer a:hover { color: #fff; }
    .pub-footer p { font-size: .85rem; line-height: 1.55; max-width: 260px; }
    .pub-footer__copy { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #1e293b; font-size: .75rem; }
    .pub-cookie { position: fixed; bottom: 0; left: 0; right: 0; z-index: 60; background: #fff; border-top: 1px solid #e2e8f0; padding: 1rem 1.25rem; box-shadow: 0 -8px 32px rgba(15,23,42,.12); display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; justify-content: space-between; }
    .pub-cookie p { margin: 0; font-size: .875rem; }
    .pub-cookie__actions { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
    .pub-cookie__link { font-size: .78rem; color: #0284c7; }
    .pub-cookie-modal { position: fixed; inset: 0; z-index: 70; background: rgba(15,23,42,.5); display: grid; place-items: center; padding: 1rem; }
    .pub-cookie-modal__panel { background: #fff; border-radius: 14px; padding: 1.5rem; max-width: 400px; width: 100%; display: flex; flex-direction: column; gap: .65rem; }
    .pub-cookie-modal__panel h3 { margin: 0 0 .5rem; }
    .pub-cookie-modal__panel label { font-size: .875rem; display: flex; gap: .5rem; align-items: center; }
    `,
  ],
})
export class PublicLayoutComponent {
  readonly cookies = inject(CookieConsentService)
  readonly contactEmail = SPENDLYX_CONTACT_EMAIL
  readonly menuOpen = signal(false)
  readonly year = new Date().getFullYear()
  prefs = { analytics: false, preferences: false, marketing: false }

  toggleMenu = (): void => {
    this.menuOpen.update((v) => !v)
  }

  closeMenu = (): void => {
    this.menuOpen.set(false)
  }

  savePrefs = (): void => {
    this.cookies.savePreferences(this.prefs)
  }
}
