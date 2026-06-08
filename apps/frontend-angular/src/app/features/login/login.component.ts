import { Component, inject, OnInit } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatIconModule } from '@angular/material/icon'
import { AuthService } from '../../core/services/auth.service'
import { ToastService } from '../../core/services/toast.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { environment } from '../../../environments/environment'

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
  ],
  template: `
    <div class="login-bg" aria-hidden="true">
      <div class="login-bg__cloud login-bg__cloud--1"></div>
      <div class="login-bg__cloud login-bg__cloud--2"></div>
      <div class="login-bg__cloud login-bg__cloud--3"></div>
    </div>

    <main class="login-page">
      <section class="login-card" aria-labelledby="login-title">
        <header class="login-card__head">
          <img src="/assets/logos/cloudops-mark.svg" alt="" class="login-card__mark" width="40" height="40" />
          <div>
            <h1 id="login-title">CloudOps</h1>
            <p>Acceso seguro al panel de administración</p>
          </div>
        </header>

        <div class="login-oauth">
          <button
            type="button"
            class="login-oauth__btn"
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
            [disabled]="oauthLoading !== null"
            (click)="handleOAuth('github')"
            aria-label="Continuar con GitHub"
          >
            <img src="/assets/logos/github.svg" alt="" width="20" height="20" />
            Continuar con GitHub
          </button>
        </div>

        <div class="login-divider" role="separator"><span>o correo</span></div>

        <form [formGroup]="form" (ngSubmit)="handleSubmit()" class="login-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Correo electrónico</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="username" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Contraseña</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="current-password" />
          </mat-form-field>
          @if (error) {
            <p class="login-error" role="alert">{{ error }}</p>
          }
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading" class="full-width login-submit">
            @if (loading) {
              <mat-spinner diameter="20" aria-label="Cargando..." />
              <span>Cargando...</span>
            } @else {
              Iniciar sesión
            }
          </button>
        </form>

        @if (pro.showDemoLogin()) {
          <button type="button" class="login-demo" [disabled]="loading || oauthLoading !== null" (click)="handleDemoLogin()">
            <mat-icon>science</mat-icon>
            Entrar en modo demo
          </button>
        }

        @if (pro.showDemoLogin()) {
          <aside class="login-hint" role="note">
            <strong>Credenciales demo</strong>
            <p>Admin: <code>admin&#64;cloudops.local</code> / <code>Admin123!</code></p>
            <p>Demo: <code>demo&#64;cloudops.local</code> / <code>Demo1234!</code></p>
          </aside>
        }
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; position: relative; overflow: hidden; }

    .login-bg {
      position: fixed; inset: 0; z-index: 0;
      background: linear-gradient(160deg, #0c4a6e 0%, #0f172a 45%, #1e1b4b 100%);
    }
    .login-bg__cloud {
      position: absolute; border-radius: 50%; filter: blur(40px); opacity: 0.35;
      background: radial-gradient(circle, #fff 0%, transparent 70%);
    }
    .login-bg__cloud--1 { width: 420px; height: 220px; top: 8%; left: -5%; animation: drift 28s ease-in-out infinite; }
    .login-bg__cloud--2 { width: 520px; height: 260px; top: 55%; right: -8%; animation: drift 34s ease-in-out infinite reverse; }
    .login-bg__cloud--3 { width: 300px; height: 160px; bottom: 10%; left: 30%; animation: drift 22s ease-in-out infinite; }
    @keyframes drift {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(24px, -12px); }
    }

    .login-page {
      position: relative; z-index: 1; min-height: 100dvh;
      display: grid; place-items: center; padding: 1.5rem;
    }

    .login-card {
      width: 100%; max-width: 420px; padding: 1.75rem 1.5rem 1.25rem;
      border-radius: 16px; background: rgba(255, 255, 255, 0.97);
      box-shadow: 0 24px 64px rgba(15, 23, 42, 0.35);
    }

    .login-card__head {
      display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.25rem;
      h1 { margin: 0; font-size: 1.35rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
      p { margin: 0.15rem 0 0; font-size: 0.78rem; color: #64748b; }
    }
    .login-card__mark { flex-shrink: 0; }

    .login-oauth { display: flex; flex-direction: column; gap: 0.5rem; }
    .login-oauth__btn {
      display: flex; align-items: center; justify-content: center; gap: 0.55rem;
      width: 100%; padding: 0.65rem 1rem; border-radius: 10px;
      border: 1px solid #e2e8f0; background: #fff; font: inherit; font-size: 0.82rem; font-weight: 600;
      color: #0f172a; cursor: pointer; transition: background 0.15s, border-color 0.15s;
      &:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
      &--github { background: #24292f; border-color: #24292f; color: #fff; img { filter: brightness(0) invert(1); }
        &:hover:not(:disabled) { background: #1b1f23; }
      }
    }

    .login-divider {
      display: flex; align-items: center; gap: 0.65rem; margin: 1rem 0 0.85rem;
      color: #94a3b8; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em;
      &::before, &::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
    }

    .login-form .full-width { width: 100%; }
    .login-submit {
      width: 100%; min-height: 44px; margin-top: 0.35rem;
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    }

    .login-error { color: #dc2626; font-size: 0.78rem; margin: 0 0 0.5rem; }

    .login-demo {
      display: flex; align-items: center; justify-content: center; gap: 0.35rem;
      width: 100%; margin-top: 0.75rem; padding: 0.55rem; border: none; background: transparent;
      font: inherit; font-size: 0.76rem; font-weight: 600; color: #b45309; cursor: pointer;
      border-radius: 8px;
      &:hover:not(:disabled) { background: #fffbeb; }
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }

    .login-hint {
      margin-top: 1rem; padding: 0.65rem 0.75rem; border-radius: 10px;
      background: #f1f5f9; font-size: 0.68rem; color: #475569;
      strong { display: block; margin-bottom: 0.25rem; font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
      p { margin: 0.15rem 0; }
      code { font-size: 0.65rem; background: #fff; padding: 0.05rem 0.25rem; border-radius: 4px; }
    }
  `],
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder)
  private readonly auth = inject(AuthService)
  private readonly router = inject(Router)
  private readonly toast = inject(ToastService)
  readonly pro = inject(ProModeService)

  loading = false
  oauthLoading: 'google' | 'github' | null = null
  error = ''

  form = this.fb.group({
    email: ['admin@cloudops.local', [Validators.required, Validators.email]],
    password: ['Admin123!', [Validators.required, Validators.minLength(8)]],
  })

  ngOnInit(): void {
    this.pro.loadStatus()
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
        this.error = this.pro.showDemoLogin()
          ? 'Error al iniciar sesión con OAuth. Usa modo demo o correo.'
          : 'Error al iniciar sesión con OAuth. Comprueba la configuración o usa correo y contraseña.'
      },
    })
  }

  private handleAuthError = (err: HttpErrorResponse): void => {
    this.loading = false
    if (err.status === 0) {
      this.error = `No se puede conectar con la API (${environment.apiUrl}). Comprueba que el backend esté en marcha.`
      return
    }
    const msg = err.error?.message
    this.error =
      typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : 'Error al iniciar sesión'
  }
}
