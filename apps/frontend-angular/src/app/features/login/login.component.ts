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
      <section class="login-showcase" aria-labelledby="login-showcase-title" @cardZone>
        <div class="login-showcase__lines" aria-hidden="true" @backgroundLineMove>
          <svg class="login-showcase__line-svg" viewBox="0 0 800 600" preserveAspectRatio="none">
            <path d="M0 120 Q200 80 400 140 T800 100" fill="none" stroke="#0284c7" stroke-width="1.5" stroke-opacity="0.35" />
            <path d="M0 480 Q250 520 500 460 T800 500" fill="none" stroke="#0078FF" stroke-width="1.5" stroke-opacity="0.28" stroke-dasharray="8 6" />
            <path d="M80 0 Q120 200 60 400 T100 600" fill="none" stroke="#0284c7" stroke-width="1" stroke-opacity="0.22" />
            <path d="M720 0 Q680 220 740 380 T700 600" fill="none" stroke="#0078FF" stroke-width="1" stroke-opacity="0.22" stroke-dasharray="6 8" />
          </svg>
        </div>
        <div class="login-showcase__inner">
          <p class="login-showcase__eyebrow">CONTROL CLOUD EN TIEMPO REAL</p>
          <h2 class="login-showcase__title" id="login-showcase-title">Controla tu infraestructura multi-cloud desde un solo panel</h2>
          <p class="login-showcase__text">
            Centraliza inventario, costes, métricas, automatización, seguridad y operaciones cloud en tiempo real desde tu workspace privado.
          </p>
          <ul class="login-benefits" aria-label="Capacidades principales">
            <li><mat-icon aria-hidden="true">inventory_2</mat-icon><span>Inventario multi-cloud</span></li>
            <li><mat-icon aria-hidden="true">query_stats</mat-icon><span>Costes y alertas en tiempo real</span></li>
            <li><mat-icon aria-hidden="true">auto_awesome</mat-icon><span>Automatización con IA</span></li>
            <li><mat-icon aria-hidden="true">dns</mat-icon><span>VPS y cloud servers</span></li>
            <li><mat-icon aria-hidden="true">encrypted</mat-icon><span>Workspace privado con credenciales cifradas</span></li>
            <li><mat-icon aria-hidden="true">monitor_heart</mat-icon><span>Observabilidad integrada</span></li>
          </ul>
          <figure class="login-hero" @softFloat>
            <div class="cloud-console" aria-label="Vista previa de consola multi-cloud">
              <header class="cloud-console__header">
                <span class="cloud-console__dot"></span>
                <div>
                  <strong>Spendlyx Cloud Console</strong>
                  <small>AWS · GCP · Azure · IONOS · VPS</small>
                </div>
                <span class="cloud-console__live">Live</span>
              </header>
              <div class="cloud-console__providers" aria-hidden="true">
                <article class="provider-card provider-card--aws">
                  <span>AWS</span>
                  <strong>24</strong>
                  <small>EC2 / VPC</small>
                </article>
                <article class="provider-card provider-card--gcp">
                  <span>GCP</span>
                  <strong>11</strong>
                  <small>Compute</small>
                </article>
                <article class="provider-card provider-card--azure">
                  <span>Azure</span>
                  <strong>8</strong>
                  <small>VMs</small>
                </article>
                <article class="provider-card provider-card--ionos">
                  <span>IONOS</span>
                  <strong>6</strong>
                  <small>VPS</small>
                </article>
              </div>
              <div class="cloud-console__mesh" aria-hidden="true">
                <span class="mesh-node mesh-node--primary">AI</span>
                <span class="mesh-node mesh-node--left">DO</span>
                <span class="mesh-node mesh-node--top">HTZ</span>
                <span class="mesh-node mesh-node--right">OVH</span>
                <span class="mesh-node mesh-node--bottom">VUL</span>
                <svg viewBox="0 0 320 150" preserveAspectRatio="none">
                  <path d="M160 75 L60 95 M160 75 L116 28 M160 75 L252 44 M160 75 L236 118" />
                </svg>
              </div>
              <div class="cloud-console__signals" aria-hidden="true">
                <article>
                  <mat-icon>payments</mat-icon>
                  <span>Coste mensual</span>
                  <strong>-18%</strong>
                </article>
                <article>
                  <mat-icon>monitoring</mat-icon>
                  <span>CPU media</span>
                  <strong>42%</strong>
                </article>
                <article>
                  <mat-icon>security</mat-icon>
                  <span>Secretos</span>
                  <strong>AES</strong>
                </article>
              </div>
            </div>
            <figcaption>Inventario, costes, métricas, seguridad y automatización en una sola vista.</figcaption>
          </figure>
        </div>
      </section>

      <section class="login-card" aria-labelledby="login-title" @cardZone>
        <div class="login-card__inner">
        <header class="login-card__head" @headZone>
          <a class="login-card__mark" routerLink="/" aria-label="Volver al sitio público" @markSpin>S</a>
          <div>
            <h1 id="login-title">Spendlyx</h1>
            <p>Accede a tu panel privado de operaciones cloud y gestión multi-cloud</p>
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
            <span class="login-oauth__icon login-oauth__icon--google" aria-hidden="true">
              <img src="/assets/logos/google.svg" alt="" width="20" height="20" />
            </span>
            <span>Continuar con Google</span>
          </button>
          <button
            type="button"
            class="login-oauth__btn login-oauth__btn--github"
            [@oauthBtn]="oauthLoading === 'github' ? 'loading' : 'idle'"
            [disabled]="oauthLoading !== null"
            (click)="handleOAuth('github')"
            aria-label="Continuar con GitHub"
          >
            <span class="login-oauth__icon login-oauth__icon--github" aria-hidden="true">
              <img src="/assets/logos/github.svg" alt="" width="20" height="20" />
            </span>
            <span>Continuar con GitHub</span>
          </button>
        </div>

        <div class="login-divider" role="separator" @dividerZone><span>o accede con tu correo</span></div>

        <form [formGroup]="form" (ngSubmit)="handleSubmit()" class="login-form" @formStagger>
          <mat-form-field appearance="outline" class="full-width" @formField>
            <mat-label>Correo electrónico</mat-label>
            <mat-icon matPrefix aria-hidden="true">alternate_email</mat-icon>
            <input
              matInput
              type="email"
              formControlName="email"
              autocomplete="username"
              placeholder="tu@empresa.com"
              aria-describedby="login-email-hint"
            />
            <mat-hint id="login-email-hint">Usa el correo asociado a tu workspace</mat-hint>
            @if (form.controls.email.touched && form.controls.email.hasError('email')) {
              <mat-error>Introduce un correo electrónico válido</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width" @formField>
            <mat-label>Contraseña</mat-label>
            <mat-icon matPrefix aria-hidden="true">lock</mat-icon>
            <input
              matInput
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              placeholder="Introduce tu contraseña"
              aria-describedby="login-password-hint"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              class="password-toggle"
              [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              [attr.aria-pressed]="showPassword()"
              (click)="togglePasswordVisibility()"
            >
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-hint id="login-password-hint">Mínimo 8 caracteres</mat-hint>
            @if (form.controls.password.touched && form.controls.password.hasError('minlength')) {
              <mat-error>La contraseña debe tener al menos 8 caracteres</mat-error>
            }
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
            } @else if (form.invalid) {
              Introduce correo y contraseña
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
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host {
      --bg-main: #f6f8fc;
      --bg-soft: #eef6ff;
      --card: #ffffff;
      --primary: #0057d9;
      --primary-hover: #0047b3;
      --primary-soft: #eef4ff;
      --accent: #00c2ff;
      --secondary: #6c63ff;
      --text-main: #101828;
      --text-muted: #667085;
      --text-soft: #98a2b3;
      --border: #d8def0;
      --border-soft: #edf0f7;
      --success: #16a34a;
      --danger: #dc2626;
      display: block;
      min-height: 100dvh;
      background: var(--bg-main);
      color: var(--text-main);
    }

    .login-page {
      min-height: 100dvh;
      display: grid;
      grid-template-columns: 1fr;
      background:
        linear-gradient(115deg, rgba(238, 246, 255, 0.92), rgba(255, 255, 255, 0.98) 42%, rgba(246, 248, 252, 0.96)),
        var(--bg-main);
    }

    .login-showcase {
      display: none;
      background:
        radial-gradient(circle at 20% 12%, rgba(0, 194, 255, 0.18), transparent 32%),
        radial-gradient(circle at 78% 72%, rgba(108, 99, 255, 0.12), transparent 30%),
        linear-gradient(135deg, var(--bg-soft) 0%, #ffffff 52%, #f7fbff 100%);
      color: var(--text-main);
      padding: clamp(2rem, 4vw, 4rem);
      position: relative;
      overflow: hidden;
      border-right: 1px solid var(--border-soft);
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
      animation: backgroundLineMove 14s ease-in-out infinite alternate;
    }

    .login-showcase__inner {
      position: relative;
      z-index: 1;
      max-width: 660px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: center;
      gap: 1.15rem;
    }

    .login-showcase__eyebrow {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--primary);
    }

    .login-showcase__title {
      margin: 0;
      font-size: clamp(2rem, 4.4vw, 3.55rem);
      font-weight: 800;
      line-height: 1.02;
      color: var(--text-main);
    }

    .login-showcase__text {
      margin: 0;
      font-size: clamp(0.98rem, 1.3vw, 1.08rem);
      color: var(--text-muted);
      line-height: 1.6;
      max-width: 560px;
    }

    .login-benefits {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.62rem;
      margin: 0.1rem 0 0;
      padding: 0;
      list-style: none;
      max-width: 620px;
    }

    .login-benefits li {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      min-height: 46px;
      padding: 0.65rem 0.75rem;
      border: 1px solid rgba(216, 222, 240, 0.92);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.78);
      box-shadow: 0 14px 32px rgba(16, 24, 40, 0.05);
      color: var(--text-main);
      font-size: 0.82rem;
      font-weight: 700;
      backdrop-filter: blur(14px);
    }

    .login-benefits mat-icon {
      width: 1.15rem;
      height: 1.15rem;
      font-size: 1.15rem;
      color: var(--primary);
    }

    .login-hero {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      position: relative;
      min-height: 290px;
      align-items: center;
      flex-direction: column;
      gap: 0.7rem;
    }

    .cloud-console {
      position: relative;
      width: min(620px, 92vw);
      border: 1px solid rgba(216, 222, 240, 0.92);
      border-radius: 24px;
      padding: 1rem;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 251, 255, 0.86)),
        var(--card);
      box-shadow: 0 34px 70px rgba(0, 87, 217, 0.15);
      backdrop-filter: blur(18px);
      animation: softFloat 6s ease-in-out infinite;
      overflow: hidden;
    }

    .cloud-console::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(0, 87, 217, 0.08) 1px, transparent 1px),
        linear-gradient(180deg, rgba(0, 87, 217, 0.06) 1px, transparent 1px);
      background-size: 34px 34px;
      mask-image: radial-gradient(circle at 50% 45%, black, transparent 72%);
      pointer-events: none;
    }

    .cloud-console__header,
    .cloud-console__providers,
    .cloud-console__mesh,
    .cloud-console__signals {
      position: relative;
      z-index: 1;
    }

    .cloud-console__header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.65rem;
      align-items: center;
      padding: 0.2rem 0.15rem 0.85rem;
    }

    .cloud-console__dot {
      width: 13px;
      height: 13px;
      border-radius: 999px;
      background: var(--success);
      box-shadow: 0 0 0 6px rgba(22, 163, 74, 0.12);
    }

    .cloud-console__header strong {
      display: block;
      color: var(--text-main);
      font-size: 0.9rem;
    }

    .cloud-console__header small {
      display: block;
      color: var(--text-muted);
      font-size: 0.72rem;
      margin-top: 0.1rem;
    }

    .cloud-console__live {
      padding: 0.32rem 0.58rem;
      border-radius: 999px;
      background: rgba(22, 163, 74, 0.1);
      color: #15803d;
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .cloud-console__providers {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.6rem;
    }

    .provider-card {
      min-height: 86px;
      padding: 0.72rem;
      border: 1px solid var(--border-soft);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.84);
      box-shadow: 0 12px 24px rgba(16, 24, 40, 0.055);
    }

    .provider-card span,
    .provider-card small {
      display: block;
      color: var(--text-muted);
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .provider-card strong {
      display: block;
      margin: 0.32rem 0 0.18rem;
      color: var(--text-main);
      font-size: 1.45rem;
      line-height: 1;
    }

    .provider-card--aws { border-top: 3px solid #ff9900; }
    .provider-card--gcp { border-top: 3px solid #4285f4; }
    .provider-card--azure { border-top: 3px solid #0078d4; }
    .provider-card--ionos { border-top: 3px solid var(--secondary); }

    .cloud-console__mesh {
      min-height: 136px;
      margin: 0.75rem 0;
      border: 1px solid rgba(216, 222, 240, 0.7);
      border-radius: 18px;
      background:
        radial-gradient(circle at center, rgba(0, 87, 217, 0.12), transparent 38%),
        rgba(238, 244, 255, 0.52);
      overflow: hidden;
    }

    .cloud-console__mesh svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .cloud-console__mesh path {
      stroke: rgba(0, 87, 217, 0.28);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-dasharray: 8 10;
      fill: none;
      animation: backgroundLineMove 8s ease-in-out infinite alternate;
    }

    .mesh-node {
      position: absolute;
      z-index: 1;
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border-radius: 16px;
      border: 1px solid rgba(216, 222, 240, 0.95);
      background: rgba(255, 255, 255, 0.93);
      color: var(--primary);
      font-size: 0.76rem;
      font-weight: 900;
      box-shadow: 0 14px 30px rgba(16, 24, 40, 0.09);
    }

    .mesh-node--primary {
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 58px;
      height: 58px;
      border-radius: 20px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: #fff;
      box-shadow: 0 18px 36px rgba(0, 87, 217, 0.22);
    }

    .mesh-node--left { left: 12%; top: 58%; }
    .mesh-node--top { left: 32%; top: 12%; }
    .mesh-node--right { right: 12%; top: 24%; }
    .mesh-node--bottom { right: 18%; bottom: 12%; }

    .cloud-console__signals {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.55rem;
    }

    .cloud-console__signals article {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 0.15rem 0.45rem;
      padding: 0.65rem;
      border: 1px solid var(--border-soft);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.82);
    }

    .cloud-console__signals mat-icon {
      grid-row: span 2;
      width: 1.15rem;
      height: 1.15rem;
      font-size: 1.15rem;
      color: var(--primary);
    }

    .cloud-console__signals span {
      color: var(--text-muted);
      font-size: 0.68rem;
    }

    .cloud-console__signals strong {
      color: var(--text-main);
      font-size: 0.9rem;
      font-weight: 700;
    }

    .login-hero figcaption {
      color: var(--text-muted);
      font-size: 0.8rem;
      font-weight: 700;
      text-align: center;
    }

    .login-card {
      width: 100%;
      margin: 0 auto;
      padding: clamp(0.85rem, 2.5vw, 1.25rem);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: linear-gradient(180deg, #ffffff 0%, var(--bg-main) 100%);
    }

    .login-card__inner {
      width: 100%;
      max-width: 440px;
      padding: clamp(1.35rem, 2.8vw, 1.85rem);
      border-radius: 20px;
      border: 1px solid var(--border);
      background: var(--card);
      box-shadow: 0 24px 70px rgba(16, 24, 40, 0.1);
    }

    .login-card__head {
      display: flex;
      gap: 0.8rem;
      align-items: center;
      margin-bottom: 1.15rem;

      h1 {
        margin: 0;
        font-size: 1.55rem;
        font-weight: 800;
        color: var(--text-main);
      }

      p {
        margin: 0.2rem 0 0;
        font-size: 0.88rem;
        line-height: 1.45;
        color: var(--text-muted);
      }
    }

    .login-card__mark {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 1rem;
      font-weight: 800;
      box-shadow: 0 14px 24px rgba(0, 87, 217, 0.24);
      text-decoration: none;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      &:hover { transform: scale(1.05); box-shadow: 0 18px 28px rgba(0, 87, 217, 0.3); }
      &:focus-visible { outline: 3px solid rgba(0, 194, 255, 0.35); outline-offset: 3px; }
    }

    .login-oauth {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }

    .login-oauth__btn {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.7rem;
      width: 100%;
      min-height: 48px;
      padding: 0.55rem 0.75rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.92)),
        var(--card);
      font: inherit;
      font-size: 0.9rem;
      font-weight: 750;
      color: var(--text-main);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;

      &:hover:not(:disabled) {
        background: var(--primary-soft);
        border-color: rgba(0, 87, 217, 0.32);
        box-shadow: 0 10px 24px rgba(16, 24, 40, 0.08);
        transform: translateY(-1px);

        .login-oauth__icon {
          transform: rotate(-4deg) scale(1.06);
          box-shadow: 0 10px 22px rgba(0, 87, 217, 0.16);
        }
      }

      &:focus-visible { outline: 3px solid rgba(0, 194, 255, 0.35); outline-offset: 3px; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }

      &--github {
        background:
          linear-gradient(180deg, #111827, #0b1220),
          #101828;
        border-color: #101828;
        color: #fff;

        &:hover:not(:disabled) { background: #1d2939; border-color: #1d2939; }
      }
    }

    .login-oauth__icon {
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 999px;
      transition: transform 0.22s ease, box-shadow 0.22s ease;
      animation: socialIconIn 0.55s ease both;
    }

    .login-oauth__icon--google {
      background: #ffffff;
      border: 1px solid rgba(216, 222, 240, 0.9);
      box-shadow: inset 0 0 0 4px rgba(238, 244, 255, 0.8);
    }

    .login-oauth__icon--github {
      background: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.38);
    }

    .login-oauth__icon--github img {
      filter: none;
    }

    .login-divider {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin: 1rem 0 0.85rem;
      color: var(--text-soft);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      transform-origin: center;

      &::before, &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--border), transparent);
      }
    }

    .login-form .full-width { width: 100%; }

    .login-form {
      display: grid;
      gap: 0.12rem;
    }

    .login-form mat-icon[matPrefix] {
      margin-right: 0.35rem;
      color: var(--text-soft);
    }

    :host ::ng-deep .login-form .mat-mdc-form-field {
      --mdc-outlined-text-field-outline-color: var(--border);
      --mdc-outlined-text-field-hover-outline-color: rgba(0, 87, 217, 0.42);
      --mdc-outlined-text-field-focus-outline-color: var(--primary);
      --mdc-outlined-text-field-label-text-color: var(--text-muted);
      --mdc-outlined-text-field-focus-label-text-color: var(--primary);
      --mdc-outlined-text-field-input-text-color: var(--text-main);
      --mdc-outlined-text-field-input-text-placeholder-color: var(--text-soft);
    }

    :host ::ng-deep .login-form .mat-mdc-text-field-wrapper {
      border-radius: 14px;
      transition: box-shadow 0.2s ease, background 0.2s ease;
      background: #ffffff;
    }

    :host ::ng-deep .login-form .mat-mdc-form-field.mat-focused .mat-mdc-text-field-wrapper {
      box-shadow: 0 0 0 4px rgba(0, 87, 217, 0.12);
      background: #fbfdff;
    }

    :host ::ng-deep .login-form .mat-mdc-form-field-error {
      color: var(--danger);
      font-weight: 600;
    }

    .password-toggle {
      margin-right: -0.35rem;
      color: var(--text-muted);

      &:focus-visible {
        outline: 3px solid rgba(0, 194, 255, 0.35);
        outline-offset: 2px;
      }
    }

    .password-toggle mat-icon {
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
    }

    .login-submit {
      width: 100%;
      min-height: 48px;
      margin-top: 0.35rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border-radius: 12px;
      font-weight: 800;
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:not(:disabled) {
        background: var(--primary);
        color: #fff;
      }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        background: var(--primary-hover);
        box-shadow: 0 12px 26px rgba(0, 87, 217, 0.28);
      }

      &:disabled {
        color: #667085;
        background: #eef2f7;
        border: 1px solid var(--border-soft);
      }

      &--loading {
        animation: submitPulse 1.2s ease-in-out infinite;
      }
    }

    @keyframes submitPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.88; }
    }

    @keyframes socialIconIn {
      from { opacity: 0; transform: scale(0.72) rotate(-14deg); }
      to { opacity: 1; transform: scale(1) rotate(0deg); }
    }

    .login-error {
      color: var(--danger);
      font-size: 0.82rem;
      margin: 0 0 0.5rem;
      padding: 0.6rem 0.7rem;
      border-radius: 10px;
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .login-resend {
      display: block;
      font-size: 0.82rem;
      color: var(--primary);
      margin: 0 0 0.75rem;
      text-decoration: none;
      font-weight: 600;
      &:focus-visible { outline: 3px solid rgba(0, 194, 255, 0.35); outline-offset: 3px; }
    }

    .login-demo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      width: 100%;
      margin-top: 0.85rem;
      padding: 0.65rem;
      border: none;
      background: transparent;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      color: #b45309;
      cursor: pointer;
      border-radius: 8px;
      transition: background 0.2s, transform 0.2s;

      &:hover:not(:disabled) {
        background: #fffbeb;
        transform: translateY(-1px);
      }

      &:focus-visible { outline: 3px solid rgba(0, 194, 255, 0.35); outline-offset: 3px; }

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
    }

    .login-footer {
      margin-top: 1.25rem;
      padding-top: 0.95rem;
      border-top: 1px solid var(--border-soft);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.45rem 0.6rem;
      font-size: 0.78rem;
    }

    .login-footer__link {
      color: var(--primary);
      font-weight: 600;
      text-decoration: none;

      &:hover { text-decoration: underline; }
      &:focus-visible { outline: 3px solid rgba(0, 194, 255, 0.35); outline-offset: 3px; }
    }

    .login-footer__sep {
      color: var(--border);
    }

    .login-hint {
      margin-top: 1rem;
      padding: 0.75rem 0.85rem;
      border-radius: 12px;
      background: var(--primary-soft);
      border: 1px solid var(--border-soft);
      font-size: 0.72rem;
      color: var(--text-muted);

      strong {
        display: block;
        margin-bottom: 0.25rem;
        font-size: 0.66rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
      }

      p { margin: 0.15rem 0; }

      code {
        font-size: 0.65rem;
        background: var(--card);
        padding: 0.05rem 0.25rem;
        border-radius: 4px;
      }
    }

    @keyframes softFloat {
      0%, 100% { transform: translate3d(0, 0, 0); }
      50% { transform: translate3d(0, -10px, 0); }
    }

    @keyframes backgroundLineMove {
      0% { transform: translate3d(-10px, -6px, 0) scale(1.02); }
      100% { transform: translate3d(12px, 8px, 0) scale(1.04); }
    }

    @media (max-width: 899px) {
      .login-page {
        background: linear-gradient(180deg, #ffffff 0%, var(--bg-main) 100%);
      }

      .login-card {
        order: 1;
      }

      .login-showcase {
        order: 2;
        display: block;
        padding: 0.7rem 1rem 1.35rem;
        background: #ffffff;
        border-right: none;
        border-top: 1px solid var(--border-soft);
        border-bottom: none;
      }

      .login-showcase__inner {
        max-width: 100%;
        gap: 0.75rem;
      }

      .login-showcase__title { font-size: 1.45rem; line-height: 1.12; }

      .login-showcase__text { font-size: 0.88rem; }

      .login-benefits {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.45rem;
      }

      .login-benefits li {
        min-height: 42px;
        padding: 0.58rem 0.7rem;
        font-size: 0.82rem;
      }

      .login-hero {
        min-height: 0;
      }

      .cloud-console {
        width: 100%;
        border-radius: 18px;
        padding: 0.75rem;
      }

      .cloud-console__providers {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .cloud-console__mesh {
        min-height: 112px;
      }

      .mesh-node {
        width: 38px;
        height: 38px;
        border-radius: 13px;
      }

      .mesh-node--primary {
        width: 48px;
        height: 48px;
        border-radius: 16px;
      }

      .cloud-console__signals {
        display: none;
      }

      .login-card {
        max-width: 100%;
        box-shadow: none;
        padding: 1rem;
        justify-content: start;
      }

      .login-card__inner {
        max-width: 440px;
        padding: 1.15rem;
      }

      .login-footer {
        align-items: stretch;
      }

      .login-footer__sep {
        display: none;
      }
    }

    @media (min-width: 900px) {
      .login-page {
        grid-template-columns: minmax(0, 1.07fr) minmax(440px, 0.93fr);
      }

      .login-showcase { display: flex; align-items: center; }

      .login-card {
        margin: 0;
        min-height: 100dvh;
        border-left: 1px solid var(--border-soft);
      }

      .login-card__inner {
        margin: auto 0;
      }
    }

    @media (max-width: 560px) {
      .login-benefits {
        grid-template-columns: 1fr;
      }

      .provider-card {
        min-height: 74px;
      }

      .provider-card strong {
        font-size: 1.2rem;
      }

      .cloud-console__header {
        grid-template-columns: auto 1fr;
      }

      .cloud-console__live {
        grid-column: 2;
        justify-self: start;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.001ms !important;
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
  readonly showPassword = signal(false)

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

  togglePasswordVisibility = (): void => {
    this.showPassword.update((visible) => !visible)
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
