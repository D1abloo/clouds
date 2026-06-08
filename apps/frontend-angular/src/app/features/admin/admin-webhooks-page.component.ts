import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { toSignal } from '@angular/core/rxjs-interop'
import { debounceTime, startWith } from 'rxjs'
import { PageHeaderComponent, type PageHeaderAction } from '../../shared/components/page-header/page-header.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { ToastService } from '../../core/services/toast.service'
import {
  ADMIN_WEBHOOKS_ACCENT,
  ADMIN_WEBHOOKS_ACCENT_BORDER,
  ADMIN_WEBHOOKS_ACCENT_LIGHT,
  adminRelativeTime,
} from './admin.config'
import {
  ADMIN_WEBHOOKS_LIST,
  ADMIN_WEBHOOK_DELIVERIES,
  ADMIN_WEBHOOK_FAILURES,
  ADMIN_WEBHOOK_PAYLOADS,
  ADMIN_WEBHOOK_CONFIG,
  ADMIN_WEBHOOK_EVENT_TYPES,
  type AdminWebhookRow,
  type WebhookDeliveryRow,
  type WebhookFailureRow,
  type WebhookPayloadRow,
} from './admin-webhooks.demo'
import { AdminWebhookDetailDialogComponent } from './admin-webhook-detail-dialog.component'
import { ProConfigGateComponent } from '../../shared/components/pro-config-gate/pro-config-gate.component'
import { AdminWebhookDeliveryDetailDialogComponent } from './admin-webhook-delivery-detail-dialog.component'

type WebhookTab = 'webhooks' | 'deliveries' | 'failures' | 'payloads' | 'config'

@Component({
  selector: 'app-admin-webhooks-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ProConfigGateComponent,
    ReactiveFormsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
  ],
  template: `
    <app-pro-config-gate module="Webhooks">
    <div class="page-container wh-page animate-fade-in">
      <app-page-header
        title="Webhooks"
        description="Endpoints HTTP que reciben eventos POST de CloudOps (alertas, despliegues, facturación)."
        icon="webhook"
        [actions]="headerActions"
        (actionClick)="handleHeader($event)"
      />

      <section class="wh-intro">
        <div class="wh-intro__main">
          <span class="wh-intro__eyebrow">Administración · Entregas salientes</span>
          <h2 class="wh-intro__title">Webhooks HTTP</h2>
          <p class="wh-intro__desc">
            La plataforma firma cada cuerpo con HMAC-SHA256. El receptor debe validar
            <code>X-CloudOps-Signature</code> y responder 2xx en menos de 30 segundos.
          </p>
        </div>
        <ul class="wh-intro__uses">
          <li><mat-icon>notifications</mat-icon><span>Alertas a Slack, PagerDuty o Teams</span></li>
          <li><mat-icon>payments</mat-icon><span>Sincronización con ERP y facturación</span></li>
          <li><mat-icon>security</mat-icon><span>Ingesta de auditoría al SIEM corporativo</span></li>
        </ul>
      </section>

      <div class="wh-bar">
        <nav class="wh-tabs" role="tablist" aria-label="Vistas de webhooks">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              class="wh-tabs__tab"
              [class.wh-tabs__tab--on]="view() === tab.id"
              [attr.aria-selected]="view() === tab.id"
              (click)="view.set(tab.id)"
            >
              <mat-icon>{{ tab.icon }}</mat-icon>
              {{ tab.label }}
              @if (tabCount(tab.id) > 0) {
                <span class="wh-tabs__count">{{ tabCount(tab.id) }}</span>
              }
            </button>
          }
        </nav>
        @if (view() === 'webhooks' || view() === 'deliveries') {
          <label class="wh-search">
            <mat-icon>search</mat-icon>
            <input type="search" [formControl]="searchControl" placeholder="Buscar URL, evento, webhook…" aria-label="Buscar webhooks" />
          </label>
        }
      </div>

      <div class="table-card wh-content">
        @switch (view()) {
          @case ('webhooks') {
            @if (filteredWebhooks().length === 0) {
              <app-empty-state title="Sin webhooks configurados" description="Registra una URL HTTPS y selecciona los tipos de evento." icon="webhook" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover" aria-label="Webhooks configurados">
                  <thead>
                    <tr><th>Nombre</th><th>URL destino</th><th>Eventos</th><th>Éxito</th><th>Activo</th><th>Estado</th><th></th></tr>
                  </thead>
                  <tbody>
                    @for (row of filteredWebhooks(); track row.id) {
                      <tr class="wh-row" (click)="openWebhookDetail(row)">
                        <td><strong>{{ row.name }}</strong></td>
                        <td class="url-cell" [title]="row.url">{{ row.url }}</td>
                        <td class="events-cell">{{ row.events }}</td>
                        <td>{{ row.successRate ?? '—' }}%</td>
                        <td>
                          @if (row.active) {
                            <mat-icon class="active-yes" aria-label="Activo">check_circle</mat-icon>
                          } @else {
                            <mat-icon class="active-no" aria-label="Inactivo">pause_circle</mat-icon>
                          }
                        </td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td (click)="$event.stopPropagation()">
                          <button mat-icon-button type="button" [matMenuTriggerFor]="whMenu" aria-label="Acciones" (click)="selectedWebhook.set(row)">
                            <mat-icon>more_vert</mat-icon>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
          @case ('deliveries') {
            <div class="data-table-wrap">
              <table class="premium-table table-row-hover" aria-label="Entregas recientes">
                <thead>
                  <tr><th>Evento</th><th>Webhook</th><th>HTTP</th><th>Latencia</th><th>Estado</th><th>Hora</th><th></th></tr>
                </thead>
                <tbody>
                  @for (row of filteredDeliveries(); track row.id) {
                    <tr class="wh-row" (click)="openDeliveryDetail(row)">
                      <td><code>{{ row.event }}</code></td>
                      <td>{{ row.webhook }}</td>
                      <td>{{ row.httpCode }}</td>
                      <td>{{ row.latency }}</td>
                      <td><app-status-badge [value]="row.status" /></td>
                      <td>{{ relativeTime(row.at) }}</td>
                      <td (click)="$event.stopPropagation()">
                        <button type="button" class="page-action-btn page-action-btn--sm" (click)="runDeliveryAction('retry', 'Reintentar entrega', row)">
                          <mat-icon>replay</mat-icon>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @case ('failures') {
            <div class="data-table-wrap">
              <table class="premium-table table-row-hover" aria-label="Fallos de entrega">
                <thead>
                  <tr><th>Evento</th><th>Webhook</th><th>Error</th><th>Intentos</th><th>Último intento</th><th></th></tr>
                </thead>
                <tbody>
                  @for (row of failures(); track row.id) {
                    <tr>
                      <td><code>{{ row.event }}</code></td>
                      <td>{{ row.webhook }}</td>
                      <td class="error-cell">{{ row.error }}</td>
                      <td>{{ row.attempts }}</td>
                      <td>{{ relativeTime(row.at) }}</td>
                      <td>
                        <button type="button" class="page-action-btn page-action-btn--sm" (click)="runFailureAction('retry', 'Reintentar ahora', row)">
                          <mat-icon>replay</mat-icon> Reintentar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @case ('payloads') {
            <p class="tab-intro">Vista previa del cuerpo JSON enviado en la última entrega por evento.</p>
            <div class="payload-list">
              @for (p of payloads(); track p.id) {
                <article class="payload-card">
                  <header>
                    <code>{{ p.event }}</code>
                    <span>{{ p.webhook }} · {{ p.size }} · {{ relativeTime(p.at) }}</span>
                    <button type="button" class="page-action-btn page-action-btn--sm" (click)="copyPayload(p)">
                      <mat-icon>content_copy</mat-icon> Copiar
                    </button>
                    <button type="button" class="page-action-btn page-action-btn--sm page-action-btn--primary" (click)="runPayloadAction('detail', 'Ver payload', p)">
                      <mat-icon>visibility</mat-icon> Ver detalle
                    </button>
                  </header>
                  <pre class="payload-body">{{ p.body }}</pre>
                </article>
              }
            </div>
          }
          @case ('config') {
            <p class="tab-intro">Parámetros globales de entrega y firma. No aplican a tokens API Bearer.</p>
            <div class="config-grid">
              @for (item of configItems; track item.key) {
                <div class="config-card">
                  <span class="config-label">{{ item.label }}</span>
                  <span class="config-value">{{ item.value }}</span>
                </div>
              }
            </div>
            <h3 class="events-heading">Tipos de evento disponibles</h3>
            <div class="event-chips">
              @for (ev of eventTypes; track ev) {
                <span class="event-chip">{{ ev }}</span>
              }
            </div>
            <div class="config-actions">
              <button type="button" class="page-action-btn page-action-btn--primary" (click)="runConfigAction('save', 'Guardar configuración')">
                <mat-icon>save</mat-icon> Guardar cambios
              </button>
              <button type="button" class="page-action-btn" (click)="runConfigAction('test', 'Probar firma HMAC')">
                <mat-icon>verified</mat-icon> Probar firma
              </button>
            </div>
          }
        }
      </div>
    </div>

    <mat-menu #whMenu="matMenu">
      <button mat-menu-item type="button" (click)="runWebhook('detail', 'Ver detalle')"><mat-icon>visibility</mat-icon> Ver detalle</button>
      <button mat-menu-item type="button" (click)="runWebhook('test', 'Probar envío')"><mat-icon>play_arrow</mat-icon> Probar envío</button>
      <button mat-menu-item type="button" (click)="runWebhook('regenerate', 'Regenerar secreto')"><mat-icon>key</mat-icon> Regenerar secreto</button>
      @if (selectedWebhook()?.active) {
        <button mat-menu-item type="button" (click)="runWebhook('disable', 'Desactivar webhook')"><mat-icon>pause</mat-icon> Desactivar</button>
      }
    </mat-menu>
    </app-pro-config-gate>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .wh-page { display: flex; flex-direction: column; gap: 0.65rem; overflow-y: auto; scrollbar-width: thin; --page-accent: ${ADMIN_WEBHOOKS_ACCENT}; }
    .wh-page ::ng-deep .page-action-btn--primary { background: ${ADMIN_WEBHOOKS_ACCENT}; border-color: #0f766e; &:hover:not(:disabled) { background: #0f766e; border-color: #115e59; } }
    .wh-intro { display: flex; flex-wrap: wrap; gap: 1rem; padding: 0.75rem 1rem; border-radius: var(--app-radius-md, 10px); border: 1px solid ${ADMIN_WEBHOOKS_ACCENT_BORDER}; background: ${ADMIN_WEBHOOKS_ACCENT_LIGHT}; }
    .wh-intro__eyebrow { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: ${ADMIN_WEBHOOKS_ACCENT}; }
    .wh-intro__title { margin: 0.2rem 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
    .wh-intro__desc { margin: 0; max-width: 38rem; font-size: 0.72rem; color: #64748b; line-height: 1.55; }
    .wh-intro__desc code { font-size: 0.68rem; }
    .wh-intro__uses { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 220px; }
    .wh-intro__uses li { display: flex; align-items: flex-start; gap: 0.35rem; font-size: 0.68rem; color: #475569; }
    .wh-intro__uses mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: ${ADMIN_WEBHOOKS_ACCENT}; flex-shrink: 0; margin-top: 0.05rem; }
    .wh-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .wh-tabs { display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.2rem; border-radius: 10px; background: ${ADMIN_WEBHOOKS_ACCENT_LIGHT}; }
    .wh-tabs__tab { display: inline-flex; align-items: center; gap: 0.28rem; padding: 0.35rem 0.6rem; border: none; border-radius: 8px; background: transparent; font: inherit; font-size: 0.68rem; font-weight: 600; color: #0f766e; cursor: pointer; }
    .wh-tabs__tab--on { background: #fff; color: ${ADMIN_WEBHOOKS_ACCENT}; box-shadow: 0 1px 2px rgb(13 148 136 / 0.08); }
    .wh-tabs__tab mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    .wh-tabs__count { font-size: 0.58rem; font-weight: 700; padding: 0.05rem 0.35rem; border-radius: 999px; background: ${ADMIN_WEBHOOKS_ACCENT_BORDER}; color: ${ADMIN_WEBHOOKS_ACCENT}; }
    .wh-search { display: flex; align-items: center; gap: 0.35rem; flex: 1; max-width: 18rem; padding: 0.35rem 0.55rem; border-radius: 9px; border: 1px solid ${ADMIN_WEBHOOKS_ACCENT_BORDER}; margin-left: auto; background: #fff; }
    .wh-search input { flex: 1; border: none; background: transparent; font: inherit; font-size: 0.72rem; outline: none; }
    .wh-search mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: #94a3b8; }
    .wh-content { overflow: auto; }
    .tab-intro { padding: 0.75rem 1rem 0; font-size: 0.85rem; opacity: 0.85; margin: 0; }
    .wh-row { cursor: pointer; }
    .url-cell { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.82rem; }
    .events-cell { max-width: 200px; font-size: 0.82rem; }
    .active-yes { color: var(--status-running); font-size: 20px; width: 20px; height: 20px; }
    .active-no { color: #94a3b8; font-size: 20px; width: 20px; height: 20px; }
    .error-cell { color: var(--status-error); font-size: 0.85rem; }
    .payload-list { display: flex; flex-direction: column; gap: 1rem; padding: 1rem; }
    .payload-card { border: 1px solid var(--app-border, #e2e8f0); border-radius: var(--app-radius-md, 10px); overflow: hidden; }
    .payload-card header { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; padding: 0.65rem 1rem; background: var(--app-surface-elevated, #f8fafc); font-size: 0.85rem; }
    .payload-card header code { font-weight: 600; }
    .payload-card header span { flex: 1; opacity: 0.8; min-width: 140px; }
    .payload-body { margin: 0; padding: 1rem; font-size: 0.78rem; line-height: 1.45; overflow-x: auto; background: #0f172a; color: #e2e8f0; }
    .config-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.75rem; padding: 1rem; }
    .config-card { padding: 0.85rem 1rem; border-radius: var(--app-radius-md, 10px); border: 1px solid var(--app-border, #e2e8f0); display: flex; flex-direction: column; gap: 0.35rem; }
    .config-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.7; }
    .config-value { font-size: 0.9rem; font-weight: 500; }
    .events-heading { padding: 0.5rem 1rem 0; font-size: 0.95rem; margin: 0; }
    .event-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.75rem 1rem 1rem; }
    .event-chip { font-size: 0.72rem; padding: 0.2rem 0.55rem; border-radius: 999px; background: color-mix(in srgb, ${ADMIN_WEBHOOKS_ACCENT} 15%, transparent); font-family: ui-monospace, monospace; }
    .config-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0 1rem 1rem; }
  `,
})
export class AdminWebhooksPageComponent {
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly selectedWebhook = signal<AdminWebhookRow | null>(null)
  readonly view = signal<WebhookTab>('webhooks')
  readonly failures = signal(ADMIN_WEBHOOK_FAILURES)
  readonly payloads = signal(ADMIN_WEBHOOK_PAYLOADS)

  readonly headerActions: PageHeaderAction[] = [
    { label: 'Nuevo webhook', icon: 'add', primary: true },
    { label: 'Documentación eventos', icon: 'menu_book' },
    { label: 'Actualizar', icon: 'refresh' },
  ]

  readonly configItems = ADMIN_WEBHOOK_CONFIG
  readonly eventTypes = ADMIN_WEBHOOK_EVENT_TYPES

  readonly tabs = [
    { id: 'webhooks' as const, label: 'Webhooks', icon: 'webhook' },
    { id: 'deliveries' as const, label: 'Entregas', icon: 'send' },
    { id: 'failures' as const, label: 'Fallos', icon: 'error' },
    { id: 'payloads' as const, label: 'Payloads', icon: 'data_object' },
    { id: 'config' as const, label: 'Configuración', icon: 'settings' },
  ]

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(startWith(''), debounceTime(200)),
    { initialValue: '' },
  )

  readonly filteredWebhooks = computed(() => {
    const q = this.searchTerm().trim().toLowerCase()
    if (!q) return ADMIN_WEBHOOKS_LIST
    return ADMIN_WEBHOOKS_LIST.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q) ||
        r.events.toLowerCase().includes(q),
    )
  })

  readonly filteredDeliveries = computed(() => {
    const q = this.searchTerm().trim().toLowerCase()
    if (!q) return ADMIN_WEBHOOK_DELIVERIES
    return ADMIN_WEBHOOK_DELIVERIES.filter(
      (r) =>
        r.event.toLowerCase().includes(q) ||
        r.webhook.toLowerCase().includes(q),
    )
  })

  relativeTime = adminRelativeTime

  tabCount = (id: WebhookTab): number => {
    switch (id) {
      case 'webhooks': return ADMIN_WEBHOOKS_LIST.length
      case 'deliveries': return ADMIN_WEBHOOK_DELIVERIES.length
      case 'failures': return this.failures().length
      case 'payloads': return this.payloads().length
      case 'config': return 0
    }
  }

  handleHeader = (label: string): void => {
    if (label === 'Actualizar') {
      this.toast.success('Datos de webhooks actualizados')
      return
    }
    const actionId = label === 'Nuevo webhook' ? 'create' : 'detail'
    this.actions.runPageAction('admin-webhooks', actionId, label, { area: 'admin' })
  }

  openWebhookDetail = (row: AdminWebhookRow): void => {
    const ref = this.dialog.open(AdminWebhookDetailDialogComponent, {
      width: 'min(760px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'admin-webhook-dialog-panel',
      data: { webhook: row },
    })
    ref.afterClosed().subscribe((result) => {
      if (result?.action === 'disable') this.toast.info(`Webhook desactivado: ${row.name}`)
    })
  }

  openDeliveryDetail = (row: WebhookDeliveryRow): void => {
    this.dialog.open(AdminWebhookDeliveryDetailDialogComponent, {
      width: 'min(680px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '90vh',
      panelClass: 'admin-webhook-delivery-dialog-panel',
      data: { delivery: row },
    })
  }

  runWebhook = (actionId: string, label: string): void => {
    const row = this.selectedWebhook()
    if (!row) return
    if (actionId === 'detail') {
      this.openWebhookDetail(row)
      return
    }
    this.actions.runRowAction('admin-webhooks', actionId, row as unknown as Record<string, unknown>, 'Webhooks', label)
  }

  runDeliveryAction = (actionId: string, label: string, row: WebhookDeliveryRow): void => {
    this.actions.runRowAction('admin-webhooks', actionId, row as unknown as Record<string, unknown>, 'Entregas', label)
  }

  runFailureAction = (actionId: string, label: string, row: WebhookFailureRow): void => {
    this.actions.runRowAction('admin-webhooks', actionId, row as unknown as Record<string, unknown>, 'Fallos', label)
    if (actionId === 'retry') {
      this.failures.update((rows) => rows.filter((r) => r.id !== row.id))
      this.toast.success(`Reintento programado: ${row.event}`)
    }
  }

  runPayloadAction = (actionId: string, label: string, row: WebhookPayloadRow): void => {
    this.actions.runRowAction('admin-webhooks', actionId, row as unknown as Record<string, unknown>, 'Payloads', label)
  }

  runConfigAction = (actionId: string, label: string): void => {
    this.actions.runRowAction('admin-webhooks', actionId, {}, 'Configuración', label)
  }

  copyPayload = (p: WebhookPayloadRow): void => {
    void navigator.clipboard.writeText(p.body).then(
      () => this.toast.success('Payload copiado al portapapeles'),
      () => {
        this.actions.runRowAction('admin-webhooks', 'payload', p as unknown as Record<string, unknown>, 'Payloads', 'Copiar payload')
      },
    )
  }
}
