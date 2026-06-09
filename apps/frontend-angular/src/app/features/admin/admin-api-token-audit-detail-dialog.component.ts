import { DatePipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog'
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
import {
  enrichAuditEntry,
  findTokenForAudit,
  type ApiTokenRow,
} from './admin-api-tokens.data'
import { AdminApiTokenDetailDialogComponent } from './admin-api-token-detail-dialog.component'
import {
  AdminApiTokenAuditActionDialogComponent,
  type ApiTokenAuditActionMode,
} from './admin-api-token-audit-action-dialog.component'

export interface AdminApiTokenAuditDetailData {
  entry: ApiTokenRow
}

type AuditTab = 'overview' | 'request' | 'security'

@Component({
  selector: 'app-admin-api-token-audit-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="tok-aud">
      <header class="tok-aud__head">
        <div class="tok-aud__identity">
          <span class="tok-aud__method-badge" [attr.data-method]="profile().method">{{ profile().method }}</span>
          <div>
            <span class="tok-aud__label">Llamada API · {{ profile().requestId }}</span>
            <h2 class="mono">{{ profile().endpoint }}</h2>
            <p>{{ profile().name }} · {{ profile().prefix }}</p>
          </div>
        </div>
        <div class="tok-aud__head-meta">
          <span class="tok-aud__threat" [attr.data-level]="profile().threatLevel">
            <mat-icon>{{ profile().threatLevel === 'high' ? 'warning' : profile().threatLevel === 'medium' ? 'info' : 'verified_user' }}</mat-icon>
            Amenaza {{ profile().threatLevel === 'high' ? 'alta' : profile().threatLevel === 'medium' ? 'media' : 'baja' }}
          </span>
          <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
        </div>
      </header>

      <div class="tok-aud__badges">
        <app-status-badge [value]="profile().status" />
        @if (profile().httpStatus) {
          <span class="tok-aud__http" [attr.data-code]="profile().httpStatus">{{ profile().httpStatus }}</span>
        }
        @if (profile().responseMs != null) {
          <span class="tok-aud__latency" [attr.data-bucket]="profile().latencyBucket">{{ profile().responseMs }} ms</span>
        }
        @if (profile().cacheHit) {
          <span class="tok-aud__cache"><mat-icon>cached</mat-icon> Cache hit</span>
        }
        <span class="tok-aud__region"><mat-icon>public</mat-icon> {{ profile().region }}</span>
      </div>

      <nav class="tok-aud__tabs" role="tablist" aria-label="Secciones de la llamada">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            role="tab"
            class="tok-aud__tab"
            [class.tok-aud__tab--on]="view() === tab.id"
            [attr.aria-selected]="view() === tab.id"
            (click)="view.set(tab.id)"
          >
            <mat-icon>{{ tab.icon }}</mat-icon>{{ tab.label }}
          </button>
        }
      </nav>

      <mat-dialog-content class="tok-aud__body">
        @switch (view()) {
          @case ('overview') {
            <div class="tok-aud__split">
              <section class="tok-aud__panel">
                <h3><mat-icon>receipt_long</mat-icon> Resumen de la llamada</h3>
                <div class="tok-aud__stat-row">
                  <div class="tok-aud__stat">
                    <strong>{{ profile().httpStatus ?? '—' }}</strong>
                    <span>HTTP status</span>
                  </div>
                  <div class="tok-aud__stat">
                    <strong>{{ profile().responseMs ?? '—' }}<small>ms</small></strong>
                    <span>Latencia</span>
                  </div>
                  <div class="tok-aud__stat">
                    <strong>{{ profile().payloadSize }}</strong>
                    <span>Payload</span>
                  </div>
                </div>
                <dl class="tok-aud__grid">
                  <div><dt>Timestamp</dt><dd>{{ profile().lastUsed | date: 'dd MMM yyyy, HH:mm:ss' }}</dd></div>
                  <div><dt>Hace</dt><dd>{{ relativeTime(profile().lastUsed) }}</dd></div>
                  <div><dt>Propietario token</dt><dd>{{ profile().owner }}</dd></div>
                  <div><dt>Alcance usado</dt><dd>{{ scopeLabel(profile().scope) }}</dd></div>
                  <div><dt>Autenticación</dt><dd>{{ profile().authMethod }}</dd></div>
                  <div><dt>Request ID</dt><dd class="mono">{{ profile().requestId }}</dd></div>
                </dl>
              </section>
              <section class="tok-aud__panel tok-aud__panel--meta">
                <h3><mat-icon>vpn_key</mat-icon> Token asociado</h3>
                <ul class="tok-aud__token-info">
                  <li><mat-icon>label</mat-icon><span>{{ profile().name }}</span></li>
                  <li><mat-icon>fingerprint</mat-icon><span class="mono">{{ profile().prefix }}</span></li>
                  <li><mat-icon>person</mat-icon><span>{{ profile().owner }}</span></li>
                </ul>
                @if (linkedToken()) {
                  <button type="button" class="tok-aud__link-btn" (click)="openLinkedToken()">
                    <mat-icon>open_in_new</mat-icon> Ver ficha del token
                  </button>
                }
                <h3 class="tok-aud__sub"><mat-icon>lan</mat-icon> Origen</h3>
                <dl class="tok-aud__grid tok-aud__grid--compact">
                  <div><dt>IP</dt><dd class="mono">{{ profile().ip ?? '—' }}</dd></div>
                  <div><dt>Llamadas IP (24h)</dt><dd>{{ profile().callsFromIp24h }}</dd></div>
                </dl>
              </section>
            </div>
          }
          @case ('request') {
            <section class="tok-aud__panel">
              <h3><mat-icon>http</mat-icon> Detalle de la petición</h3>
              <div class="tok-aud__request-line">
                <span class="tok-aud__method-chip" [attr.data-method]="profile().method">{{ profile().method }}</span>
                <code class="mono">{{ profile().endpoint }}</code>
                <button type="button" class="tok-aud__inline-copy" (click)="openAction('copy-endpoint')" aria-label="Copiar endpoint">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
              <dl class="tok-aud__grid">
                <div><dt>Método</dt><dd>{{ profile().method ?? '—' }}</dd></div>
                <div><dt>Ruta</dt><dd class="mono">{{ profile().endpoint ?? '—' }}</dd></div>
                <div><dt>Payload</dt><dd>{{ profile().payloadSize }}</dd></div>
                <div><dt>Cache</dt><dd>{{ profile().cacheHit ? 'Hit' : 'Miss' }}</dd></div>
              </dl>
              @if (profile().userAgent) {
                <h4 class="tok-aud__subheading">User-Agent</h4>
                <p class="mono tok-aud__ua">{{ profile().userAgent }}</p>
              }
              <h4 class="tok-aud__subheading">Cabeceras relevantes</h4>
              <ul class="tok-aud__headers">
                <li><span>Authorization</span><code>Bearer {{ profile().prefix }}</code></li>
                <li><span>Content-Type</span><code>{{ profile().method === 'POST' ? 'application/json' : '—' }}</code></li>
                <li><span>X-Request-Id</span><code class="mono">{{ profile().requestId }}</code></li>
              </ul>
            </section>
          }
          @case ('security') {
            <div class="tok-aud__split">
              <section class="tok-aud__panel">
                <h3><mat-icon>shield</mat-icon> Análisis de seguridad</h3>
                <dl class="tok-aud__grid">
                  <div><dt>Nivel de amenaza</dt><dd [attr.data-threat]="profile().threatLevel">{{ profile().threatLevel === 'high' ? 'Alto' : profile().threatLevel === 'medium' ? 'Medio' : 'Bajo' }}</dd></div>
                  <div><dt>IP origen</dt><dd class="mono">{{ profile().ip ?? '—' }}</dd></div>
                  <div><dt>Región</dt><dd>{{ profile().region }}</dd></div>
                  <div><dt>Eventos misma IP</dt><dd>{{ profile().relatedFromIp }}</dd></div>
                  <div><dt>Llamadas IP (24h)</dt><dd>{{ profile().callsFromIp24h }}</dd></div>
                  <div><dt>Resultado</dt><dd [attr.data-fail]="profile().status === 'failed'">{{ profile().status === 'failed' ? 'Fallida' : 'Exitosa' }}</dd></div>
                </dl>
                @if (profile().status === 'failed') {
                  <aside class="tok-aud__warn tok-aud__warn--danger">
                    <mat-icon>warning</mat-icon>
                    <div>
                      <strong>Petición rechazada</strong>
                      <p>HTTP {{ profile().httpStatus }} — revisa alcances del token, rate limits o políticas de acceso por IP.</p>
                    </div>
                  </aside>
                }
              </section>
              <section class="tok-aud__panel tok-aud__panel--warn">
                <h3><mat-icon>gpp_maybe</mat-icon> Recomendaciones</h3>
                <ul class="tok-aud__recs">
                  @if (profile().threatLevel === 'high') {
                    <li><mat-icon>block</mat-icon> Considera bloquear la IP de origen</li>
                  }
                  @if (profile().httpStatus === 403) {
                    <li><mat-icon>vpn_key</mat-icon> Verifica alcances del token</li>
                  }
                  @if (profile().httpStatus === 429) {
                    <li><mat-icon>speed</mat-icon> Rate limit excedido — revisa cuotas</li>
                  }
                  @if (profile().callsFromIp24h > 20) {
                    <li><mat-icon>monitoring</mat-icon> Volumen elevado desde esta IP</li>
                  }
                  <li><mat-icon>receipt_long</mat-icon> Correlaciona con request ID en SIEM</li>
                </ul>
              </section>
            </div>
          }
        }
      </mat-dialog-content>

      <section class="tok-aud__actions-panel">
        <h3>Acciones</h3>
        <div class="tok-aud__action-cards">
          <button type="button" class="tok-aud__action-card tok-aud__action-card--danger" (click)="openAction('block-ip')">
            <mat-icon>shield</mat-icon>
            <div><strong>Bloquear IP</strong><span>Impide peticiones desde {{ profile().ip }} en el período elegido</span></div>
          </button>
          <button type="button" class="tok-aud__action-card" (click)="openAction('copy-endpoint')">
            <mat-icon>content_copy</mat-icon>
            <div><strong>Copiar endpoint</strong><span>Método y ruta para logs o tickets</span></div>
          </button>
          @if (linkedToken()) {
            <button type="button" class="tok-aud__action-card tok-aud__action-card--primary" (click)="openLinkedToken()">
              <mat-icon>vpn_key</mat-icon>
              <div><strong>Ver token</strong><span>Ficha completa del token asociado</span></div>
            </button>
          }
        </div>
      </section>

      <mat-dialog-actions align="start" class="tok-aud__footer">
        <button type="button" class="page-action-btn" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    :host { display: block; }
    .tok-aud { width: 100%; color: #0f172a; padding: 1.15rem 1.35rem 1.2rem; box-sizing: border-box; }
    .tok-aud__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.85rem; padding: 0.85rem 1rem; margin-bottom: 0.55rem; border-radius: 12px; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; background: linear-gradient(135deg, ${ADMIN_TOKENS_ACCENT_LIGHT}, #fff); }
    .tok-aud__identity { display: flex; gap: 0.65rem; align-items: flex-start; min-width: 0; flex: 1; }
    .tok-aud__method-badge { display: flex; align-items: center; justify-content: center; min-width: 3rem; padding: 0.35rem 0.5rem; border-radius: 9px; font-size: 0.68rem; font-weight: 800; background: ${ADMIN_TOKENS_ACCENT}; color: #fff; flex-shrink: 0; &[data-method='GET'] { background: #059669; } &[data-method='DELETE'] { background: #dc2626; } }
    .tok-aud__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
    .tok-aud__head h2 { margin: 0.15rem 0 0; font-size: 0.88rem; font-weight: 700; line-height: 1.35; word-break: break-word; }
    .tok-aud__head p { margin: 0.2rem 0 0; font-size: 0.72rem; color: #64748b; }
    .tok-aud__head-meta { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
    .tok-aud__threat { display: inline-flex; align-items: center; gap: 0.28rem; font-size: 0.62rem; font-weight: 700; padding: 0.2rem 0.45rem; border-radius: 999px; background: #f0fdf4; color: #15803d; &[data-level='medium'] { background: #fef3c7; color: #b45309; } &[data-level='high'] { background: #fef2f2; color: #dc2626; } mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; } }
    .tok-aud__badges { display: flex; flex-wrap: wrap; gap: 0.32rem; margin-bottom: 0.55rem; align-items: center; }
    .tok-aud__http { font-size: 0.62rem; font-weight: 700; padding: 0.12rem 0.42rem; border-radius: 999px; background: #dcfce7; color: #15803d; &[data-code='403'], &[data-code='429'] { background: #fee2e2; color: #b91c1c; } }
    .tok-aud__latency { font-size: 0.62rem; font-weight: 600; padding: 0.12rem 0.42rem; border-radius: 999px; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; color: ${ADMIN_TOKENS_ACCENT}; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; &[data-bucket='slow'] { background: #fef3c7; color: #b45309; border-color: #fde68a; } }
    .tok-aud__cache, .tok-aud__region { display: inline-flex; align-items: center; gap: 0.22rem; font-size: 0.62rem; font-weight: 600; padding: 0.12rem 0.42rem; border-radius: 999px; background: #f1f5f9; color: #475569; mat-icon { font-size: 0.78rem; width: 0.78rem; height: 0.78rem; } }
    .tok-aud__tabs { display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.18rem; margin-bottom: 0.55rem; border-radius: 10px; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; }
    .tok-aud__tab { display: inline-flex; align-items: center; gap: 0.28rem; padding: 0.32rem 0.55rem; border: none; border-radius: 8px; background: transparent; font: inherit; font-size: 0.66rem; font-weight: 600; color: #6d28d9; cursor: pointer; mat-icon { font-size: 0.88rem; width: 0.88rem; height: 0.88rem; } }
    .tok-aud__tab--on { background: #fff; color: ${ADMIN_TOKENS_ACCENT}; box-shadow: 0 1px 2px rgb(124 58 237 / 0.08); }
    .tok-aud__body { padding: 0 !important; max-height: min(52vh, 440px); overflow-y: auto; scrollbar-width: thin; }
    .tok-aud__split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(200px, 240px); gap: 0.65rem; align-items: start; }
    .tok-aud__panel { padding: 0.75rem 0.9rem; border-radius: 11px; border: 1px solid #e2e8f0; background: #fafbfc; h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.55rem; font-size: 0.74rem; font-weight: 700; color: ${ADMIN_TOKENS_ACCENT}; mat-icon { font-size: 1rem; width: 1rem; height: 1rem; } } }
    .tok-aud__panel--meta h3.tok-aud__sub { margin-top: 0.65rem; }
    .tok-aud__panel--warn { border-color: ${ADMIN_TOKENS_ACCENT_BORDER}; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; }
    .tok-aud__stat-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.45rem; margin-bottom: 0.65rem; }
    .tok-aud__stat { padding: 0.55rem 0.65rem; border-radius: 9px; border: 1px solid #e2e8f0; background: #fff; text-align: center; strong { display: block; font-size: 0.88rem; font-weight: 800; color: ${ADMIN_TOKENS_ACCENT}; small { font-size: 0.55rem; font-weight: 600; } } span { display: block; font-size: 0.56rem; color: #94a3b8; text-transform: uppercase; margin-top: 0.12rem; } }
    .tok-aud__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem 0.75rem; margin: 0; dt { font-size: 0.56rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; } dd { margin: 0.06rem 0 0; font-size: 0.74rem; font-weight: 500; &[data-threat='high'] { color: #dc2626; font-weight: 700; } &[data-threat='medium'] { color: #d97706; font-weight: 700; } &[data-fail='true'] { color: #dc2626; } } &--compact { margin-top: 0.35rem; } }
    .tok-aud__token-info { list-style: none; margin: 0 0 0.5rem; padding: 0; display: flex; flex-direction: column; gap: 0.28rem; li { display: flex; align-items: center; gap: 0.32rem; font-size: 0.68rem; color: #475569; mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: ${ADMIN_TOKENS_ACCENT}; } } }
    .tok-aud__link-btn { display: inline-flex; align-items: center; gap: 0.28rem; padding: 0.35rem 0.55rem; border-radius: 8px; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; background: #fff; font: inherit; font-size: 0.64rem; font-weight: 600; color: ${ADMIN_TOKENS_ACCENT}; cursor: pointer; margin-bottom: 0.5rem; mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; } &:hover { background: ${ADMIN_TOKENS_ACCENT_LIGHT}; } }
    .tok-aud__request-line { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; padding: 0.55rem 0.65rem; border-radius: 9px; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; margin-bottom: 0.65rem; code { flex: 1; min-width: 0; font-size: 0.72rem; word-break: break-word; } }
    .tok-aud__method-chip { font-size: 0.62rem; font-weight: 800; padding: 0.15rem 0.4rem; border-radius: 6px; background: ${ADMIN_TOKENS_ACCENT}; color: #fff; &[data-method='GET'] { background: #059669; } }
    .tok-aud__inline-copy { display: flex; align-items: center; justify-content: center; width: 1.85rem; height: 1.85rem; border-radius: 7px; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; background: #fff; cursor: pointer; color: ${ADMIN_TOKENS_ACCENT}; mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; } }
    .tok-aud__subheading { margin: 0.55rem 0 0.35rem; font-size: 0.64rem; font-weight: 700; color: #475569; text-transform: uppercase; }
    .tok-aud__ua { word-break: break-word; line-height: 1.45; font-size: 0.66rem; margin: 0 0 0.5rem; }
    .tok-aud__headers { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.32rem; li { display: grid; grid-template-columns: 7rem 1fr; gap: 0.45rem; align-items: baseline; font-size: 0.66rem; span { color: #94a3b8; font-weight: 600; } code { font-size: 0.64rem; word-break: break-all; } } }
    .tok-aud__warn { display: flex; gap: 0.45rem; padding: 0.6rem 0.7rem; border-radius: 9px; margin-top: 0.55rem; mat-icon { flex-shrink: 0; color: #dc2626; font-size: 1rem; width: 1rem; height: 1rem; } strong { display: block; font-size: 0.7rem; margin-bottom: 0.15rem; } p { margin: 0; font-size: 0.64rem; color: #475569; line-height: 1.55; } }
    .tok-aud__warn--danger { background: #fef2f2; border: 1px solid #fecaca; strong { color: #991b1b; } }
    .tok-aud__recs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.32rem; li { display: flex; align-items: flex-start; gap: 0.32rem; font-size: 0.66rem; color: #475569; line-height: 1.45; mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: ${ADMIN_TOKENS_ACCENT}; flex-shrink: 0; } } }
    .tok-aud__actions-panel { margin-top: 0.55rem; padding-top: 0.55rem; border-top: 1px solid #e2e8f0; h3 { margin: 0 0 0.4rem; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.04em; } }
    .tok-aud__action-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.4rem; }
    .tok-aud__action-card { display: flex; align-items: flex-start; gap: 0.45rem; padding: 0.55rem 0.65rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; text-align: left; font: inherit; transition: border-color 0.15s, box-shadow 0.15s; &:hover { border-color: ${ADMIN_TOKENS_ACCENT_BORDER}; box-shadow: 0 2px 8px rgb(124 58 237 / 0.08); } mat-icon { color: ${ADMIN_TOKENS_ACCENT}; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; margin-top: 0.05rem; } strong { display: block; font-size: 0.74rem; color: #0f172a; } span { display: block; font-size: 0.62rem; color: #64748b; line-height: 1.45; margin-top: 0.12rem; } &--danger { border-color: #fecaca; mat-icon { color: #dc2626; } &:hover { border-color: #f87171; } } &--primary { border-color: ${ADMIN_TOKENS_ACCENT_BORDER}; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; } }
    .tok-aud__footer { display: flex; flex-wrap: wrap; gap: 0.35rem; padding-top: 0.55rem; margin: 0; min-height: unset; border-top: none; }
    .mono { font-family: ui-monospace, monospace; }
    @media (max-width: 720px) { .tok-aud { padding: 1rem; } .tok-aud__split { grid-template-columns: 1fr; } .tok-aud__grid { grid-template-columns: 1fr; } .tok-aud__stat-row { grid-template-columns: 1fr; } .tok-aud__action-cards { grid-template-columns: 1fr; } .tok-aud__headers li { grid-template-columns: 1fr; } }
  `,
})
export class AdminApiTokenAuditDetailDialogComponent {
  readonly data = inject<AdminApiTokenAuditDetailData>(MAT_DIALOG_DATA)
  private readonly dialog = inject(MatDialog)

  readonly view = signal<AuditTab>('overview')
  readonly profile = computed(() => enrichAuditEntry(this.data.entry))
  readonly linkedToken = computed(() => findTokenForAudit(this.data.entry))

  relativeTime = adminRelativeTime
  scopeLabel = adminScopeLabel

  readonly tabs: { id: AuditTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Resumen', icon: 'dashboard' },
    { id: 'request', label: 'Petición', icon: 'http' },
    { id: 'security', label: 'Seguridad', icon: 'shield' },
  ]

  openAction = (mode: ApiTokenAuditActionMode): void => {
    this.dialog.open(AdminApiTokenAuditActionDialogComponent, {
      width: 'min(560px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'admin-token-audit-action-dialog-panel',
      data: { entry: this.data.entry, mode },
    })
  }

  openLinkedToken = (): void => {
    const token = this.linkedToken()
    if (!token) return
    this.dialog.open(AdminApiTokenDetailDialogComponent, {
      width: 'min(820px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '92vh',
      panelClass: 'admin-token-dialog-panel',
      data: { token },
    })
  }
}
