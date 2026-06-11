import {
  Component,
  DestroyRef,
  HostListener,
  inject,
  NgZone,
  OnInit,
  signal,
} from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatIconModule } from '@angular/material/icon'
import { AuthService } from '../../core/services/auth.service'
import { ToastService } from '../../core/services/toast.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { environment } from '../../../environments/environment'
import { loginAnimations } from './login.animations'
import {
  LOGIN_DEMO_ADMIN_EMAIL,
  LOGIN_DEMO_ADMIN_PASSWORD,
  LOGIN_DEMO_BUTTON_LABEL,
  LOGIN_DEMO_HINT_TITLE,
  LOGIN_DEMO_USER_EMAIL,
  LOGIN_DEMO_USER_PASSWORD,
  SHOW_LOGIN_DEMO_PANEL,
} from './login-demo.panel.production'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    RouterLink,
  ],
  animations: loginAnimations,
  template: `
    <main class="login-page" @pageZone>
      <section class="login-showcase" aria-hidden="true" @cardZone>
        <div class="login-showcase__lines" aria-hidden="true">
          <svg class="login-showcase__line-svg" viewBox="0 0 800 600" preserveAspectRatio="none">
            <path d="M0 120 Q200 80 400 140 T800 100" fill="none" stroke="#0284c7" stroke-width="1.5" stroke-opacity="0.35" />
            <path d="M0 480 Q250 520 500 460 T800 500" fill="none" stroke="#0078FF" stroke-width="1.5" stroke-opacity="0.28" stroke-dasharray="8 6" />
            <path d="M80 0 Q120 200 60 400 T100 600" fill="none" stroke="#0284c7" stroke-width="1" stroke-opacity="0.22" />
            <path d="M720 0 Q680 220 740 380 T700 600" fill="none" stroke="#0078FF" stroke-width="1" stroke-opacity="0.22" stroke-dasharray="6 8" />
          </svg>
        </div>
        <div class="login-showcase__inner">
          <p class="login-showcase__eyebrow">Control de costes cloud</p>
          <h2 class="login-showcase__title">Facturación AWS desde el móvil</h2>
          <p class="login-showcase__text">
            Revisa facturas EC2, gasto MTD y alertas de coste en tiempo real. Datos conectados a tu panel Spendlyx.
          </p>
          <figure class="login-hero">
            <img
              src="/assets/images/login-iphone-aws-invoice.png"
              alt="iPhone mostrando factura AWS Billing con instancias EC2, subtotal MTD y métricas flotantes de coste"
              class="login-hero__img"
              width="1024"
              height="1024"
              loading="eager"
            />
          </figure>
        </div>
      </section>

      <section class="login-card" aria-labelledby="login-title" @cardZone>
        <header class="login-card__head" @headZone>
          <a class="login-card__mark" routerLink="/" aria-label="Volver al sitio público" @markSpin>S</a>
          <div>
            <h1 id="login-title">Spendlyx</h1>
            <p>Panel de operaciones cloud con espacio de trabajo privado por cuenta</p>
          </div>
        </header>

        <div class="login-oauth" @oauthStagger>
          <button
            type="button"
            class="login-oauth__btn"
            [@oauthBtn]="oauthLoading === 'google' ? 'loading' : 'idle'"
            [disabled]="oauthLoading !== null"
            (click)="handleOAuth('google')"
            aria-label="Continuar con Google"
          >
            <img src="/assets/logos/google.svg" alt="" width="20" height="20" />
            Continuar con Google
          </button>
          <button
            type="button"
            class="login-oauth__btn login-oauth__btn--github"
            [@oauthBtn]="oauthLoading === 'github' ? 'loading' : 'idle'"
            [disabled]="oauthLoading !== null"
            (click)="handleOAuth('github')"
            aria-label="Continuar con GitHub"
          >
            <img src="/assets/logos/github.svg" alt="" width="20" height="20" />
            Continuar con GitHub
          </button>
        </div>

        <div class="login-divider" role="separator" @dividerZone><span>o correo</span></div>

        <form [formGroup]="form" (ngSubmit)="handleSubmit()" class="login-form" @formStagger>
          <mat-form-field appearance="outline" class="full-width" @formField>
            <mat-label>Correo electrónico</mat-label>
            <input
              matInput
              type="email"
              formControlName="email"
              autocomplete="username"
              placeholder="tu@empresa.com"
              aria-describedby="login-email-hint"
            />
            <mat-hint id="login-email-hint">Usa el correo con el que registraste tu espacio de trabajo</mat-hint>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width" @formField>
            <mat-label>Contraseña</mat-label>
            <input
              matInput
              type="password"
              formControlName="password"
              autocomplete="current-password"
              aria-describedby="login-password-hint"
            />
            <mat-hint id="login-password-hint">Mínimo 8 caracteres. No compartas tu acceso con otros usuarios</mat-hint>
          </mat-form-field>
          @if (error) {
            <p class="login-error" role="alert" @errorZone>{{ error }}</p>
            @if (error.includes('verificada')) {
              <a routerLink="/reenviar-verificacion" class="login-resend">Reenviar verificación</a>
            }
          }
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || loading"
            class="full-width login-submit"
            @submitZone
            [class.login-submit--loading]="loading"
          >
            @if (loading) {
              <mat-spinner diameter="20" aria-label="Cargando..." />
              <span>Cargando...</span>
            } @else {
              Iniciar sesión
            }
          </button>
        </form>

        @if (showLoginDemoPanel && pro.showDemoLogin()) {
          <button
            type="button"
            class="login-demo"
            @demoZone
            [disabled]="loading || oauthLoading !== null"
            (click)="handleDemoLogin()"
          >
            <mat-icon>science</mat-icon>
            {{ loginDemoButtonLabel }}
          </button>
        }

        @if (showLoginDemoPanel && pro.showDemoLogin()) {
          <aside class="login-hint" role="note" @hintZone>
            <strong>{{ loginDemoHintTitle }}</strong>
            <p>Admin: <code>{{ loginDemoAdminEmail }}</code> / <code>{{ loginDemoAdminPassword }}</code></p>
            <p>Demo: <code>{{ loginDemoUserEmail }}</code> / <code>{{ loginDemoUserPassword }}</code></p>
          </aside>
        }

        <footer class="login-footer" @hintZone>
          <a routerLink="/registro" class="login-footer__link">Crear cuenta nueva</a>
          <span class="login-footer__sep" aria-hidden="true">·</span>
          <a routerLink="/docs" class="login-footer__link">Documentación</a>
          <span class="login-footer__sep" aria-hidden="true">·</span>
          <a routerLink="/reenviar-verificacion" class="login-footer__link">Reenviar verificación</a>
        </footer>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100dvh;
      background: #f8fafc;
    }

    .login-page {
      min-height: 100dvh;
      display: grid;
      grid-template-columns: 1fr;
    }

    .login-showcase {
      display: none;
      background: #ffffff;
      color: #0f172a;
      padding: 2.5rem 2rem;
      position: relative;
      overflow: hidden;
      border-right: 1px solid #e2e8f0;
    }

    .login-showcase__lines {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }

    .login-showcase__line-svg {
      width: 100%;
      height: 100%;
    }

    .login-showcase__inner {
      position: relative;
      z-index: 1;
      max-width: 560px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: center;
    }

    .login-showcase__eyebrow {
      margin: 0 0 0.75rem;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #0284c7;
    }

    .login-showcase__title {
      margin: 0 0 0.65rem;
      font-size: clamp(1.5rem, 3vw, 2rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
      color: #0f172a;
    }

    .login-showcase__text {
      margin: 0 0 1.25rem;
      font-size: 0.92rem;
      color: #64748b;
      line-height: 1.6;
      max-width: 420px;
    }

    .login-hero {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
    }

    .login-hero__img {
      width: min(420px, 88vw);
      height: auto;
      display: block;
      object-fit: contain;
    }

    .login-card {
      width: 100%;
      max-width: 380px;
      margin: 0 auto;
      padding: clamp(1rem, 3vw, 1.5rem) clamp(1rem, 3vw, 1.25rem);
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: #fff;
    }

    .login-card__head {
      display: flex;
      gap: 0.65rem;
      align-items: center;
      margin-bottom: 0.85rem;

      h1 {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.02em;
      }

      p {
        margin: 0.15rem 0 0;
        font-size: 0.78rem;
        color: #64748b;
      }
    }

    .login-card__mark {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #0284c7, #6366f1);
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 0.95rem;
      font-weight: 800;
      box-shadow: 0 6px 16px rgba(2, 132, 199, 0.3);
      text-decoration: none;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      &:hover { transform: scale(1.05); box-shadow: 0 8px 20px rgba(2, 132, 199, 0.4); }
    }

    .login-oauth {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .login-oauth__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      width: 100%;
      padding: 0.5rem 0.85rem;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #fff;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      color: #0f172a;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;

      &:hover:not(:disabled) {
        background: #f8fafc;
        border-color: #cbd5e1;
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
      }

      &:disabled { opacity: 0.6; cursor: not-allowed; }

      &--github {
        background: #24292f;
        border-color: #24292f;
        color: #fff;

        img { filter: brightness(0) invert(1); }

        &:hover:not(:disabled) { background: #1b1f23; }
      }
    }

    .login-divider {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin: 0.75rem 0 0.6rem;
      color: #94a3b8;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      transform-origin: center;

      &::before, &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
      }
    }

    .login-form .full-width { width: 100%; }

    .login-submit {
      width: 100%;
      min-height: 40px;
      margin-top: 0.2rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(14, 165, 233, 0.25);
      }

      &--loading {
        animation: submitPulse 1.2s ease-in-out infinite;
      }
    }

    @keyframes submitPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.88; }
    }

    .login-error {
      color: #dc2626;
      font-size: 0.78rem;
      margin: 0 0 0.5rem;
      padding: 0.45rem 0.55rem;
      border-radius: 8px;
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .login-resend {
      display: block;
      font-size: 0.78rem;
      color: #0284c7;
      margin: 0 0 0.75rem;
      text-decoration: none;
      font-weight: 600;
    }

    .login-demo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      width: 100%;
      margin-top: 0.75rem;
      padding: 0.55rem;
      border: none;
      background: transparent;
      font: inherit;
      font-size: 0.76rem;
      font-weight: 600;
      color: #b45309;
      cursor: pointer;
      border-radius: 8px;
      transition: background 0.2s, transform 0.2s;

      &:hover:not(:disabled) {
        background: #fffbeb;
        transform: translateY(-1px);
      }

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
    }

    .login-footer {
      margin-top: 1.15rem;
      padding-top: 0.85rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.35rem 0.5rem;
      font-size: 0.72rem;
    }

    .login-footer__link {
      color: #0284c7;
      font-weight: 600;
      text-decoration: none;

      &:hover { text-decoration: underline; }
    }

    .login-footer__sep {
      color: #cbd5e1;
    }

    .login-hint {
      margin-top: 1rem;
      padding: 0.65rem 0.75rem;
      border-radius: 10px;
      background: #f1f5f9;
      font-size: 0.68rem;
      color: #475569;

      strong {
        display: block;
        margin-bottom: 0.25rem;
        font-size: 0.62rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
      }

      p { margin: 0.15rem 0; }

      code {
        font-size: 0.65rem;
        background: #fff;
        padding: 0.05rem 0.25rem;
        border-radius: 4px;
      }
    }

    @media (max-width: 899px) {
      .login-showcase {
        display: block;
        padding: 1.5rem 1.25rem 0;
        background: #ffffff;
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
      }

      .login-showcase__inner { max-width: 100%; }

      .login-showcase__title { font-size: 1.25rem; }

      .login-showcase__text { font-size: 0.82rem; margin-bottom: 0.75rem; }

      .login-hero__img { width: min(320px, 92vw); }

      .login-card {
        max-width: 100%;
        box-shadow: none;
      }
    }

    @media (min-width: 900px) {
      .login-page {
        grid-template-columns: 1.05fr 0.95fr;
      }

      .login-showcase { display: flex; align-items: center; }

      .login-hero__img {
        width: min(440px, 42vw);
        margin: 0;
      }

      .login-card {
        max-width: none;
        margin: 0;
        min-height: 100dvh;
        box-shadow: -12px 0 48px rgba(15, 23, 42, 0.06);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .login-submit--loading { animation: none !important; }
    }
  `],
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder)
  private readonly auth = inject(AuthService)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly toast = inject(ToastService)
  private readonly ngZone = inject(NgZone)
  private readonly destroyRef = inject(DestroyRef)
  readonly pro = inject(ProModeService)

  readonly showLoginDemoPanel = SHOW_LOGIN_DEMO_PANEL
  readonly loginDemoButtonLabel = LOGIN_DEMO_BUTTON_LABEL
  readonly loginDemoHintTitle = LOGIN_DEMO_HINT_TITLE
  readonly loginDemoAdminEmail = LOGIN_DEMO_ADMIN_EMAIL
  readonly loginDemoAdminPassword = LOGIN_DEMO_ADMIN_PASSWORD
  readonly loginDemoUserEmail = LOGIN_DEMO_USER_EMAIL
  readonly loginDemoUserPassword = LOGIN_DEMO_USER_PASSWORD

  readonly bgShift = signal({ x: 0, y: 0 })

  credentialsCipher = (): string =>
    this.pro.security()?.credentialsEncryption
      ? `Credenciales ${this.pro.security()!.credentialsEncryption}`
      : 'Credenciales AES-256-GCM'

  workspaceLabel = (): string =>
    this.pro.workspaceIsolation() ? 'Workspace aislado por usuario' : 'Espacio de trabajo personal'

  tlsLabel = (): string =>
    this.pro.security()?.tls ? 'Conexión HTTPS/TLS' : 'TLS en producción'

  loading = false
  oauthLoading: 'google' | 'github' | null = null
  error = ''

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  })

  ngOnInit(): void {
    this.pro.loadStatus()
    const oauthError = this.route.snapshot.queryParamMap.get('oauth_error')
    if (oauthError) {
      this.error = decodeURIComponent(oauthError)
    }
    if (environment.demoMode) {
      this.form.patchValue({ email: 'admin@cloudops.local', password: 'Admin123!' })
    }

    this.initParallaxZone()
  }

  @HostListener('document:mousemove', ['$event'])
  handleMouseMove(event: MouseEvent): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    this.scheduleParallaxUpdate(event.clientX, event.clientY)
  }

  private parallaxFrame = 0
  private pendingParallax = { x: 0, y: 0 }

  private initParallaxZone = (): void => {
    this.destroyRef.onDestroy(() => {
      if (this.parallaxFrame) cancelAnimationFrame(this.parallaxFrame)
    })
  }

  private scheduleParallaxUpdate = (clientX: number, clientY: number): void => {
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    this.pendingParallax = {
      x: (clientX - centerX) / centerX,
      y: (clientY - centerY) / centerY,
    }

    if (this.parallaxFrame) return

    this.ngZone.runOutsideAngular(() => {
      this.parallaxFrame = requestAnimationFrame(() => {
        this.parallaxFrame = 0
        this.ngZone.run(() => {
          this.bgShift.set(this.pendingParallax)
        })
      })
    })
  }

  handleSubmit = (): void => {
    if (this.form.invalid) return
    this.loading = true
    this.error = ''
    const { email, password } = this.form.getRawValue()
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.loading = false
        void this.router.navigateByUrl('/dashboard', { replaceUrl: true })
      },
      error: (err: HttpErrorResponse) => this.handleAuthError(err),
    })
  }

  handleDemoLogin = (): void => {
    if (!this.pro.showDemoLogin()) {
      this.error = 'El modo demo no está disponible en producción. Usa OAuth o tus credenciales de administrador.'
      return
    }
    this.form.patchValue({ email: 'demo@cloudops.local', password: 'Demo1234!' })
    this.handleSubmit()
  }

  handleOAuth = (provider: 'google' | 'github'): void => {
    this.oauthLoading = provider
    this.error = ''
    this.auth.startOAuth(provider).subscribe({
      next: (res) => {
        this.oauthLoading = null
        if (res.connectionRequired) {
          this.error = res.message ?? 'Configuración requerida — configure OAuth en modo PRO'
          return
        }
        if (res.redirectUrl) {
          window.location.href = res.redirectUrl
          return
        }
        if (res.demoMode && res.message) {
          this.toast.info(res.message)
          this.handleDemoLogin()
        }
      },
      error: () => {
        this.oauthLoading = null
        this.error = 'Error al iniciar sesión con OAuth. Comprueba la configuración o usa correo y contraseña.'
      },
    })
  }

  private handleAuthError = (err: HttpErrorResponse): void => {
    this.loading = false
    if (err.status === 0) {
      this.error = `No se puede conectar con la API (${environment.apiUrl}). Comprueba que el backend esté en marcha.`
      return
    }
    const body = err.error as { message?: string | { message?: string }; code?: string; email?: string } | undefined
    const code = body?.code ?? (typeof body?.message === 'object' ? (body.message as { code?: string }).code : undefined)
    if (code === 'EMAIL_NOT_VERIFIED' || err.status === 401 && String(body?.message ?? '').includes('verificada')) {
      this.error =
        'Tu cuenta aún no ha sido verificada. Revisa tu correo o solicita un nuevo enlace de validación.'
      return
    }
    const msg = typeof body?.message === 'string' ? body.message : Array.isArray(body?.message) ? body.message.join(', ') : 'Error al iniciar sesión'
    this.error = msg
  }
}
