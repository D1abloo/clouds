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
    <div
      class="login-bg"
      aria-hidden="true"
      [style.--mx]="bgShift().x"
      [style.--my]="bgShift().y"
    >
      <div class="login-bg__mesh"></div>
      <div class="login-bg__orb login-bg__orb--1" @bgOrb></div>
      <div class="login-bg__orb login-bg__orb--2" @bgOrb></div>
      <div class="login-bg__orb login-bg__orb--3" @bgOrb></div>
      <div class="login-bg__cloud login-bg__cloud--1"></div>
      <div class="login-bg__cloud login-bg__cloud--2"></div>
      <div class="login-bg__cloud login-bg__cloud--3"></div>
      <div class="login-bg__grid"></div>
    </div>

    <main class="login-page" @pageZone>
      <section class="login-card" aria-labelledby="login-title" @cardZone>
        <header class="login-card__head" @headZone>
          <img
            src="/assets/logos/cloudops-mark.svg"
            alt=""
            class="login-card__mark"
            width="40"
            height="40"
            @markSpin
          />
          <div>
            <h1 id="login-title">CloudOps</h1>
            <p>Acceso seguro al panel de administración</p>
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
            <input matInput type="email" formControlName="email" autocomplete="username" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width" @formField>
            <mat-label>Contraseña</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="current-password" />
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
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100dvh;
      position: relative;
      overflow: hidden;
      --mx: 0;
      --my: 0;
    }

    .login-bg {
      position: fixed;
      inset: 0;
      z-index: 0;
      background: linear-gradient(160deg, #0c4a6e 0%, #0f172a 45%, #1e1b4b 100%);
      overflow: hidden;
    }

    .login-bg__mesh {
      position: absolute;
      inset: -20%;
      background:
        radial-gradient(circle at 20% 30%, rgba(56, 189, 248, 0.18) 0%, transparent 45%),
        radial-gradient(circle at 80% 70%, rgba(129, 140, 248, 0.14) 0%, transparent 42%);
      transform: translate(calc(var(--mx) * 0.4px), calc(var(--my) * 0.4px));
      transition: transform 0.35s ease-out;
      will-change: transform;
    }

    .login-bg__orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(48px);
      opacity: 0.45;
      will-change: transform;
    }

    .login-bg__orb--1 {
      width: 280px;
      height: 280px;
      top: 12%;
      left: 8%;
      background: radial-gradient(circle, #38bdf8 0%, transparent 70%);
      animation: orbFloat 18s ease-in-out infinite;
    }

    .login-bg__orb--2 {
      width: 360px;
      height: 360px;
      bottom: 8%;
      right: 6%;
      background: radial-gradient(circle, #818cf8 0%, transparent 70%);
      animation: orbFloat 24s ease-in-out infinite reverse;
    }

    .login-bg__orb--3 {
      width: 200px;
      height: 200px;
      top: 48%;
      left: 42%;
      background: radial-gradient(circle, #22d3ee 0%, transparent 70%);
      animation: orbFloat 20s ease-in-out infinite 2s;
    }

    .login-bg__cloud {
      position: absolute;
      border-radius: 50%;
      filter: blur(40px);
      opacity: 0.28;
      background: radial-gradient(circle, #fff 0%, transparent 70%);
    }

    .login-bg__cloud--1 {
      width: 420px;
      height: 220px;
      top: 8%;
      left: -5%;
      animation: drift 28s ease-in-out infinite;
    }

    .login-bg__cloud--2 {
      width: 520px;
      height: 260px;
      top: 55%;
      right: -8%;
      animation: drift 34s ease-in-out infinite reverse;
    }

    .login-bg__cloud--3 {
      width: 300px;
      height: 160px;
      bottom: 10%;
      left: 30%;
      animation: drift 22s ease-in-out infinite;
    }

    .login-bg__grid {
      position: absolute;
      inset: 0;
      opacity: 0.06;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(ellipse at center, #000 20%, transparent 75%);
      animation: gridPulse 8s ease-in-out infinite;
    }

    @keyframes drift {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(24px, -12px); }
    }

    @keyframes orbFloat {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(16px, -20px) scale(1.05); }
      66% { transform: translate(-12px, 10px) scale(0.95); }
    }

    @keyframes gridPulse {
      0%, 100% { opacity: 0.05; }
      50% { opacity: 0.09; }
    }

    .login-page {
      position: relative;
      z-index: 1;
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 1.75rem 1.5rem 1.25rem;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.97);
      box-shadow:
        0 24px 64px rgba(15, 23, 42, 0.35),
        0 0 0 1px rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
    }

    .login-card__head {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1.25rem;

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

    .login-card__mark { flex-shrink: 0; }

    .login-oauth {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .login-oauth__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      width: 100%;
      padding: 0.65rem 1rem;
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
      margin: 1rem 0 0.85rem;
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
      min-height: 44px;
      margin-top: 0.35rem;
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

    @media (prefers-reduced-motion: reduce) {
      .login-bg__orb,
      .login-bg__cloud,
      .login-bg__grid {
        animation: none !important;
      }

      .login-bg__mesh,
      .login-bg__orb {
        transform: none !important;
        transition: none !important;
      }
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
