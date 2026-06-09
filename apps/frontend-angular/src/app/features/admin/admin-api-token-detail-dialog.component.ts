import { DatePipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import {
  ADMIN_TOKENS_ACCENT,
  ADMIN_TOKENS_ACCENT_BORDER,
  ADMIN_TOKENS_ACCENT_LIGHT,
  adminRelativeTime,
  adminScopeLabel,
} from './admin.config'
import { enrichTokenProfile, type ApiTokenRow } from './admin-api-tokens.data'
import {
  AdminApiTokenActionDialogComponent,
  type ApiTokenActionMode,
} from './admin-api-token-action-dialog.component'

export interface AdminApiTokenDetailData {
  token: ApiTokenRow
}

type DetailTab = 'overview' | 'usage' | 'security'

@Component({
  selector: 'app-admin-api-token-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="tok-det">
      <header class="tok-det__head">
        <div class="tok-det__identity">
          <span class="tok-det__icon"><mat-icon>vpn_key</mat-icon></span>
          <div>
            <span class="tok-det__label">Token API · {{ profile().id }}</span>
            <h2>{{ profile().name }}</h2>
            <p>{{ profile().owner }} · {{ profile().environment ?? 'Sin entorno' }}</p>
          </div>
        </div>
        <div class="tok-det__head-meta">
          <span class="tok-det__risk" [attr.data-level]="profile().riskLevel">
            <mat-icon>{{ profile().riskLevel === 'high' ? 'warning' : profile().riskLevel === 'medium' ? 'info' : 'verified_user' }}</mat-icon>
            Riesgo {{ profile().riskLevel === 'high' ? 'alto' : profile().riskLevel === 'medium' ? 'medio' : 'bajo' }}
          </span>
          <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
        </div>
      </header>

      <div class="tok-det__badges">
        <app-status-badge [value]="profile().status" />
        <span class="tok-det__scope">{{ scopeLabel(profile().scope) }}</span>
        @if (profile().environment) {
          <span class="tok-det__env" [attr.data-env]="profile().environment">{{ profile().environment }}</span>
        }
        <span class="tok-det__policy"><mat-icon>policy</mat-icon> {{ profile().rotationPolicy }}</span>
        @if (profile().daysUntilExpiry != null) {
          <span class="tok-det__expiry" [class.tok-det__expiry--warn]="profile().daysUntilExpiry! <= 14">
            <mat-icon>schedule</mat-icon> Expira en {{ profile().daysUntilExpiry }} d
          </span>
        }
      </div>

      <nav class="tok-det__tabs" role="tablist" aria-label="Secciones del token">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            role="tab"
            class="tok-det__tab"
            [class.tok-det__tab--on]="view() === tab.id"
            [attr.aria-selected]="view() === tab.id"
            (click)="view.set(tab.id)"
          >
            <mat-icon>{{ tab.icon }}</mat-icon>{{ tab.label }}
          </button>
        }
      </nav>

      <mat-dialog-content class="tok-det__body">
        @switch (view()) {
          @case ('overview') {
            <div class="tok-det__split">
              <section class="tok-det__panel">
                <h3><mat-icon>tune</mat-icon> Configuración</h3>
                <div class="tok-det__prefix-row">
                  <span class="tok-det__prefix mono">{{ profile().prefix }}</span>
                  <button type="button" class="tok-det__copy-btn" (click)="openAction('copy')" aria-label="Copiar prefijo">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                </div>
                <div class="tok-det__scopes">
                  <span class="tok-det__scopes-label">Alcances concedidos</span>
                  <ul>
                    @for (s of scopeList(); track s) {
                      <li><code>{{ s }}</code></li>
                    }
                  </ul>
                </div>
                <dl class="tok-det__grid">
                  <div><dt>Propietario</dt><dd>{{ profile().owner }}</dd></div>
                  <div><dt>Creado</dt><dd>{{ profile().created | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
                  <div><dt>Último uso</dt><dd>{{ relativeTime(profile().lastUsed) }}</dd></div>
                  @if (profile().expires) {
                    <div><dt>Expira</dt><dd>{{ profile().expires | date: 'dd MMM yyyy' }}</dd></div>
                  }
                  <div><dt>Rate limit</dt><dd>{{ profile().rateLimit }}</dd></div>
                  <div><dt>Política rotación</dt><dd>{{ profile().rotationPolicy }}</dd></div>
                  @if (profile().calls24h != null) {
                    <div><dt>Llamadas (24h)</dt><dd>{{ profile().calls24h }}</dd></div>
                  }
                  @if (profile().revokedBy) {
                    <div><dt>Revocado por</dt><dd>{{ profile().revokedBy }}</dd></div>
                  }
                  @if (profile().reason) {
                    <div class="tok-det__full"><dt>Motivo revocación</dt><dd>{{ profile().reason }}</dd></div>
                  }
                </dl>
              </section>
              <section class="tok-det__panel tok-det__panel--meta">
                <h3><mat-icon>hub</mat-icon> Integraciones</h3>
                <ul class="tok-det__integrations">
                  @for (i of profile().integrations; track i) {
                    <li><mat-icon>link</mat-icon>{{ i }}</li>
                  }
                </ul>
                <h3 class="tok-det__sub"><mat-icon>https</mat-icon> Uso en API</h3>
                <p class="tok-det__hint-code">Authorization: Bearer &lt;token&gt;</p>
                <ul class="tok-det__hints">
                  <li><mat-icon>security</mat-icon> Solo cabecera HTTP — nunca en query strings</li>
                  <li><mat-icon>receipt_long</mat-icon> Cada llamada queda registrada en auditoría</li>
                </ul>
              </section>
            </div>
          }
          @case ('usage') {
            <section class="tok-det__panel">
              <h3><mat-icon>monitoring</mat-icon> Actividad reciente</h3>
              @if (profile().calls24h != null) {
                <div class="tok-det__stat-row">
                  <div class="tok-det__stat">
                    <strong>{{ profile().calls24h }}</strong>
                    <span>Llamadas (24h)</span>
                  </div>
                  <div class="tok-det__stat">
                    <strong>{{ profile().rateLimit }}</strong>
                    <span>Límite configurado</span>
                  </div>
                  <div class="tok-det__stat">
                    <strong>{{ relativeTime(profile().lastUsed) }}</strong>
                    <span>Último uso</span>
                  </div>
                </div>
              }
              @if (profile().lastEndpoints.length) {
                <h4 class="tok-det__subheading">Endpoints recientes</h4>
                <ul class="tok-det__endpoints">
                  @for (ep of profile().lastEndpoints; track ep) {
                    <li><mat-icon>link</mat-icon><code>{{ ep }}</code></li>
                  }
                </ul>
              } @else {
                <p class="tok-det__empty">Sin actividad registrada en las últimas 24 horas.</p>
              }
              @if (profile().userAgent) {
                <h4 class="tok-det__subheading">User-Agent detectado</h4>
                <p class="mono tok-det__ua">{{ profile().userAgent }}</p>
              }
              @if (profile().endpoint) {
                <h4 class="tok-det__subheading">Última petición auditada</h4>
                <p class="mono">{{ profile().endpoint }}</p>
              }
            </section>
          }
          @case ('security') {
            <div class="tok-det__split">
              <section class="tok-det__panel">
                <h3><mat-icon>shield</mat-icon> Postura de seguridad</h3>
                <dl class="tok-det__grid">
                  <div><dt>Nivel de riesgo</dt><dd [attr.data-risk]="profile().riskLevel">{{ profile().riskLevel === 'high' ? 'Alto' : profile().riskLevel === 'medium' ? 'Medio' : 'Bajo' }}</dd></div>
                  <div><dt>Alcance</dt><dd>{{ scopeLabel(profile().scope) }}</dd></div>
                  <div><dt>Entorno</dt><dd>{{ profile().environment ?? '—' }}</dd></div>
                  <div><dt>Política rotación</dt><dd>{{ profile().rotationPolicy }}</dd></div>
                  @if (profile().daysUntilExpiry != null) {
                    <div><dt>Días hasta expiración</dt><dd [class.tok-det__warn]="profile().daysUntilExpiry! <= 14">{{ profile().daysUntilExpiry }}</dd></div>
                  }
                </dl>
                <aside class="tok-det__warn">
                  <mat-icon>info</mat-icon>
                  <div>
                    <strong>Buenas prácticas</strong>
                    <p>Revoca de inmediato si el token pudo filtrarse. Los prefijos <code>co_live_</code> / <code>co_rev_</code> no revelan el secreto completo. Rota cada 90 días si aplica política CI/CD.</p>
                  </div>
                </aside>
              </section>
              <section class="tok-det__panel tok-det__panel--warn">
                <h3><mat-icon>gpp_maybe</mat-icon> Recomendaciones</h3>
                <ul class="tok-det__recs">
                  @if (profile().riskLevel === 'high') {
                    <li><mat-icon>warning</mat-icon> Alcance amplio — considera reducir permisos</li>
                  }
                  @if (profile().daysUntilExpiry != null && profile().daysUntilExpiry! <= 14) {
                    <li><mat-icon>schedule</mat-icon> Expira pronto — programa rotación</li>
                  }
                  <li><mat-icon>autorenew</mat-icon> Rota periódicamente según política</li>
                  <li><mat-icon>visibility_off</mat-icon> No almacenar en repositorios ni logs</li>
                </ul>
              </section>
            </div>
          }
        }
      </mat-dialog-content>

      <section class="tok-det__actions-panel">
        <h3>Acciones administrativas</h3>
        <div class="tok-det__action-cards">
          <button type="button" class="tok-det__action-card tok-det__action-card--primary" (click)="openAction('rotate')">
            <mat-icon>autorenew</mat-icon>
            <div><strong>Rotar token</strong><span>Emite nuevo secreto con opción de ventana de gracia</span></div>
          </button>
          <button type="button" class="tok-det__action-card" (click)="openAction('copy')">
            <mat-icon>content_copy</mat-icon>
            <div><strong>Copiar prefijo</strong><span>Identificador parcial para logs y auditoría</span></div>
          </button>
          @if (profile().status !== 'stopped') {
            <button type="button" class="tok-det__action-card tok-det__action-card--danger" (click)="openAction('revoke')">
              <mat-icon>block</mat-icon>
              <div><strong>Revocar token</strong><span>Invalida de inmediato — integraciones dejarán de autenticarse</span></div>
            </button>
          }
        </div>
      </section>

      <mat-dialog-actions align="start" class="tok-det__footer">
        <button type="button" class="page-action-btn" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    :host { display: block; }
    .tok-det { width: 100%; max-width: 100%; color: #0f172a; padding: 1.15rem 1.35rem 1.2rem; box-sizing: border-box; }
    .tok-det__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.85rem; padding: 0.85rem 1rem; margin-bottom: 0.55rem; border-radius: 12px; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; background: linear-gradient(135deg, ${ADMIN_TOKENS_ACCENT_LIGHT}, #fff); }
    .tok-det__identity { display: flex; gap: 0.7rem; align-items: center; min-width: 0; flex: 1; }
    .tok-det__icon { display: flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border-radius: 11px; background: ${ADMIN_TOKENS_ACCENT}; color: #fff; flex-shrink: 0; mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; } }
    .tok-det__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
    .tok-det__head h2 { margin: 0.15rem 0 0; font-size: 1.05rem; font-weight: 700; line-height: 1.25; }
    .tok-det__head p { margin: 0.2rem 0 0; font-size: 0.72rem; color: #64748b; }
    .tok-det__head-meta { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
    .tok-det__risk { display: inline-flex; align-items: center; gap: 0.28rem; font-size: 0.62rem; font-weight: 700; padding: 0.2rem 0.45rem; border-radius: 999px; background: #f0fdf4; color: #15803d; &[data-level='medium'] { background: #fef3c7; color: #b45309; } &[data-level='high'] { background: #fef2f2; color: #dc2626; } mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; } }
    .tok-det__badges { display: flex; flex-wrap: wrap; gap: 0.32rem; margin-bottom: 0.55rem; align-items: center; }
    .tok-det__scope, .tok-det__env, .tok-det__policy, .tok-det__expiry { display: inline-flex; align-items: center; gap: 0.22rem; font-size: 0.62rem; font-weight: 600; padding: 0.12rem 0.42rem; border-radius: 999px; background: #f1f5f9; color: #475569; mat-icon { font-size: 0.78rem; width: 0.78rem; height: 0.78rem; } }
    .tok-det__env[data-env='production'] { background: #dcfce7; color: #15803d; }
    .tok-det__env[data-env='staging'] { background: #fef3c7; color: #b45309; }
    .tok-det__policy { background: ${ADMIN_TOKENS_ACCENT_LIGHT}; color: ${ADMIN_TOKENS_ACCENT}; }
    .tok-det__expiry--warn { background: #fef3c7; color: #b45309; }
    .tok-det__tabs { display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.18rem; margin-bottom: 0.55rem; border-radius: 10px; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; }
    .tok-det__tab { display: inline-flex; align-items: center; gap: 0.28rem; padding: 0.32rem 0.55rem; border: none; border-radius: 8px; background: transparent; font: inherit; font-size: 0.66rem; font-weight: 600; color: #6d28d9; cursor: pointer; mat-icon { font-size: 0.88rem; width: 0.88rem; height: 0.88rem; } }
    .tok-det__tab--on { background: #fff; color: ${ADMIN_TOKENS_ACCENT}; box-shadow: 0 1px 2px rgb(124 58 237 / 0.08); }
    .tok-det__body { padding: 0 !important; max-height: min(52vh, 440px); overflow-y: auto; scrollbar-width: thin; }
    .tok-det__split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(200px, 240px); gap: 0.65rem; align-items: start; }
    .tok-det__panel { padding: 0.75rem 0.9rem; border-radius: 11px; border: 1px solid #e2e8f0; background: #fafbfc; h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.55rem; font-size: 0.74rem; font-weight: 700; color: ${ADMIN_TOKENS_ACCENT}; mat-icon { font-size: 1rem; width: 1rem; height: 1rem; } } }
    .tok-det__panel--meta h3.tok-det__sub { margin-top: 0.65rem; }
    .tok-det__panel--warn { border-color: ${ADMIN_TOKENS_ACCENT_BORDER}; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; }
    .tok-det__prefix-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; margin-bottom: 0.55rem; }
    .tok-det__prefix { padding: 0.35rem 0.55rem; border-radius: 8px; font-size: 0.74rem; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; word-break: break-all; flex: 1; min-width: 0; }
    .tok-det__copy-btn { display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: 8px; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; background: #fff; cursor: pointer; color: ${ADMIN_TOKENS_ACCENT}; mat-icon { font-size: 1rem; width: 1rem; height: 1rem; } &:hover { background: ${ADMIN_TOKENS_ACCENT_LIGHT}; } }
    .tok-det__scopes { margin-bottom: 0.65rem; padding: 0.55rem 0.65rem; border-radius: 9px; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; }
    .tok-det__scopes-label { display: block; font-size: 0.56rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; margin-bottom: 0.35rem; }
    .tok-det__scopes ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.32rem; }
    .tok-det__scopes li code { font-size: 0.64rem; padding: 0.1rem 0.35rem; border-radius: 6px; background: #fff; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; color: ${ADMIN_TOKENS_ACCENT}; }
    .tok-det__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem 0.75rem; margin: 0; dt { font-size: 0.56rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; } dd { margin: 0.06rem 0 0; font-size: 0.74rem; font-weight: 500; } .tok-det__warn { color: #d97706; font-weight: 700; } }
    .tok-det__full { grid-column: 1 / -1; }
    .tok-det__integrations { list-style: none; margin: 0 0 0.5rem; padding: 0; display: flex; flex-direction: column; gap: 0.28rem; li { display: flex; align-items: center; gap: 0.32rem; font-size: 0.68rem; color: #475569; mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: ${ADMIN_TOKENS_ACCENT}; } } }
    .tok-det__hint-code { font-family: ui-monospace, monospace; font-size: 0.62rem; padding: 0.35rem 0.45rem; border-radius: 6px; background: #fff; border: 1px solid #e2e8f0; margin: 0 0 0.4rem; word-break: break-word; }
    .tok-det__hints { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.28rem; li { display: flex; align-items: flex-start; gap: 0.32rem; font-size: 0.64rem; color: #475569; line-height: 1.45; mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: ${ADMIN_TOKENS_ACCENT}; flex-shrink: 0; } } }
    .tok-det__stat-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.45rem; margin-bottom: 0.65rem; }
    .tok-det__stat { padding: 0.55rem 0.65rem; border-radius: 9px; border: 1px solid #e2e8f0; background: #fff; text-align: center; strong { display: block; font-size: 0.88rem; font-weight: 800; color: ${ADMIN_TOKENS_ACCENT}; } span { display: block; font-size: 0.56rem; color: #94a3b8; text-transform: uppercase; margin-top: 0.12rem; } }
    .tok-det__subheading { margin: 0.55rem 0 0.35rem; font-size: 0.64rem; font-weight: 700; color: #475569; text-transform: uppercase; }
    .tok-det__endpoints { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.28rem; li { display: flex; align-items: center; gap: 0.32rem; mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: #94a3b8; } code { font-size: 0.66rem; } } }
    .tok-det__empty { margin: 0; font-size: 0.68rem; color: #94a3b8; font-style: italic; }
    .tok-det__ua { word-break: break-word; line-height: 1.45; font-size: 0.66rem; margin: 0; }
    .tok-det__warn { display: flex; gap: 0.45rem; padding: 0.6rem 0.7rem; border-radius: 9px; margin-top: 0.55rem; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; mat-icon { flex-shrink: 0; color: ${ADMIN_TOKENS_ACCENT}; font-size: 1rem; width: 1rem; height: 1rem; } strong { display: block; font-size: 0.7rem; margin-bottom: 0.15rem; } p { margin: 0; font-size: 0.64rem; color: #475569; line-height: 1.55; code { font-size: 0.6rem; } } }
    .tok-det__recs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.32rem; li { display: flex; align-items: flex-start; gap: 0.32rem; font-size: 0.66rem; color: #475569; line-height: 1.45; mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: ${ADMIN_TOKENS_ACCENT}; flex-shrink: 0; } } }
    .tok-det__actions-panel { margin-top: 0.55rem; padding-top: 0.55rem; border-top: 1px solid #e2e8f0; h3 { margin: 0 0 0.4rem; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.04em; } }
    .tok-det__action-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.4rem; }
    .tok-det__action-card { display: flex; align-items: flex-start; gap: 0.45rem; padding: 0.55rem 0.65rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; text-align: left; font: inherit; transition: border-color 0.15s, box-shadow 0.15s; &:hover { border-color: ${ADMIN_TOKENS_ACCENT_BORDER}; box-shadow: 0 2px 8px rgb(124 58 237 / 0.08); } mat-icon { color: ${ADMIN_TOKENS_ACCENT}; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; margin-top: 0.05rem; } strong { display: block; font-size: 0.74rem; color: #0f172a; } span { display: block; font-size: 0.62rem; color: #64748b; line-height: 1.45; margin-top: 0.12rem; } &--danger { border-color: #fecaca; mat-icon { color: #dc2626; } &:hover { border-color: #f87171; } } &--primary { border-color: ${ADMIN_TOKENS_ACCENT_BORDER}; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; } }
    .tok-det__footer { display: flex; flex-wrap: wrap; gap: 0.35rem; padding-top: 0.55rem; margin: 0; min-height: unset; border-top: none; }
    .mono { font-family: ui-monospace, monospace; }
    @media (max-width: 720px) { .tok-det { padding: 1rem; } .tok-det__split { grid-template-columns: 1fr; } .tok-det__grid { grid-template-columns: 1fr; } .tok-det__stat-row { grid-template-columns: 1fr; } .tok-det__action-cards { grid-template-columns: 1fr; } }
  `,
})
export class AdminApiTokenDetailDialogComponent {
  readonly data = inject<AdminApiTokenDetailData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<AdminApiTokenDetailDialogComponent>)
  private readonly dialog = inject(MatDialog)

  readonly view = signal<DetailTab>('overview')
  readonly profile = computed(() => enrichTokenProfile(this.data.token))
  readonly scopeList = computed(() =>
    this.data.token.scope.split(',').map((s) => s.trim()).filter(Boolean),
  )

  relativeTime = adminRelativeTime
  scopeLabel = adminScopeLabel

  readonly tabs: { id: DetailTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Resumen', icon: 'dashboard' },
    { id: 'usage', label: 'Uso', icon: 'monitoring' },
    { id: 'security', label: 'Seguridad', icon: 'shield' },
  ]

  openAction = (mode: ApiTokenActionMode): void => {
    const ref = this.dialog.open(AdminApiTokenActionDialogComponent, {
      width: 'min(560px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'admin-token-action-dialog-panel',
      data: { token: this.data.token, mode },
    })
    ref.afterClosed().subscribe((result) => {
      if (result?.action === 'revoke' || result?.action === 'rotate') {
        this.dialogRef.close(result)
      }
    })
  }
}
