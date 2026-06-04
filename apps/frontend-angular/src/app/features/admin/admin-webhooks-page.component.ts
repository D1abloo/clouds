import { Component, inject, signal, computed } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatChipsModule } from '@angular/material/chips'
import { toSignal } from '@angular/core/rxjs-interop'
import { debounceTime, startWith } from 'rxjs'
import { PageHeaderComponent, type PageHeaderAction } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import {
  ADMIN_WEBHOOKS_LIST,
  ADMIN_WEBHOOK_DELIVERIES,
  ADMIN_WEBHOOK_FAILURES,
  ADMIN_WEBHOOK_PAYLOADS,
  ADMIN_WEBHOOK_CONFIG,
  ADMIN_WEBHOOK_EVENT_TYPES,
} from './admin-webhooks.demo'

@Component({
  selector: 'app-admin-webhooks-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    SummaryCardComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
  ],
  template: `
    <div class="page-container page-container--admin-webhooks">
      <app-page-header
        title="Webhooks"
        description="Endpoints HTTP que reciben eventos POST de CloudOps (alertas, despliegues, facturación). Distinto de los tokens Bearer de la API."
        icon="webhook"
        [demoMode]="true"
        [actions]="headerActions"
        (actionClick)="handleHeader($event)"
      />

      <div class="admin-context-banner admin-context-banner--webhooks">
        <mat-icon>outgoing_mail</mat-icon>
        <div>
          <strong>Entregas salientes</strong>
          <p>La plataforma firma cada cuerpo con HMAC-SHA256. El receptor debe validar <code>X-CloudOps-Signature</code> y responder 2xx en &lt; 30 s.</p>
        </div>
      </div>

      <div class="summary-grid app-section-panel stagger-children">
        <app-summary-card title="Endpoints activos" value="3" icon="link" variant="elevated" />
        <app-summary-card title="Entregas (24 h)" value="847" icon="send" variant="elevated" />
        <app-summary-card title="Fallos pendientes" value="2" icon="error_outline" variant="elevated" />
        <app-summary-card title="Latencia media" value="124 ms" icon="speed" variant="elevated" />
      </div>

      <div class="table-card admin-page-panel">
        <mat-tab-group class="soft-tabs" animationDuration="280ms" [selectedIndex]="tabIndex()" (selectedIndexChange)="tabIndex.set($event)">
          <mat-tab label="Webhooks">
            <div class="filter-row table-toolbar">
              <mat-form-field appearance="outline">
                <mat-label>Buscar URL o nombre</mat-label>
                <input matInput [formControl]="searchControl" placeholder="Slack, facturación…" />
              </mat-form-field>
            </div>
            @if (filteredWebhooks().length === 0) {
              <app-empty-state title="Sin webhooks configurados" description="Registra una URL HTTPS y selecciona los tipos de evento." icon="webhook" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>URL destino</th>
                      <th>Eventos</th>
                      <th>Secreto</th>
                      <th>Activo</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of filteredWebhooks(); track row.id) {
                      <tr>
                        <td>{{ row.name }}</td>
                        <td class="url-cell" [title]="row.url">{{ row.url }}</td>
                        <td class="events-cell">{{ row.events }}</td>
                        <td><code class="secret-chip">{{ row.secret }}</code></td>
                        <td>
                          @if (row.active) {
                            <mat-icon class="active-yes" aria-label="Activo">check_circle</mat-icon>
                          } @else {
                            <mat-icon class="active-no" aria-label="Inactivo">pause_circle</mat-icon>
                          }
                        </td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td>
                          <button mat-icon-button type="button" [matMenuTriggerFor]="whMenu" aria-label="Acciones webhook">
                            <mat-icon>more_vert</mat-icon>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </mat-tab>

          <mat-tab label="Entregas">
            <div class="filter-row table-toolbar">
              <mat-form-field appearance="outline">
                <mat-label>Filtrar entregas</mat-label>
                <input matInput [formControl]="searchControl" placeholder="Evento, webhook…" />
              </mat-form-field>
            </div>
            <div class="data-table-wrap">
              <table class="premium-table table-row-hover">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Webhook</th>
                    <th>HTTP</th>
                    <th>Latencia</th>
                    <th>Estado</th>
                    <th>Hora</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of filteredDeliveries(); track row.id) {
                    <tr>
                      <td><code>{{ row.event }}</code></td>
                      <td>{{ row.webhook }}</td>
                      <td>{{ row.httpCode }}</td>
                      <td>{{ row.latency }}</td>
                      <td><app-status-badge [value]="row.status" /></td>
                      <td>{{ row.at | date:'short' }}</td>
                      <td>
                        <button mat-icon-button type="button" (click)="run('Reintentar entrega')" aria-label="Reintentar">
                          <mat-icon>replay</mat-icon>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </mat-tab>

          <mat-tab label="Fallos">
            <div class="data-table-wrap">
              <table class="premium-table table-row-hover">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Webhook</th>
                    <th>Error</th>
                    <th>Intentos</th>
                    <th>Último intento</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of failures; track row.id) {
                    <tr>
                      <td><code>{{ row.event }}</code></td>
                      <td>{{ row.webhook }}</td>
                      <td class="error-cell">{{ row.error }}</td>
                      <td>{{ row.attempts }}</td>
                      <td>{{ row.at | date:'short' }}</td>
                      <td>
                        <button mat-stroked-button type="button" (click)="run('Reintentar ahora')">
                          <mat-icon>replay</mat-icon> Reintentar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </mat-tab>

          <mat-tab label="Payloads">
            <p class="tab-intro">Vista previa del cuerpo JSON enviado en la última entrega por evento.</p>
            <div class="payload-list">
              @for (p of payloads; track p.id) {
                <article class="payload-card">
                  <header>
                    <code>{{ p.event }}</code>
                    <span>{{ p.webhook }} · {{ p.size }} · {{ p.at | date:'short' }}</span>
                    <button mat-stroked-button type="button" (click)="run('Copiar payload')">
                      <mat-icon>content_copy</mat-icon> Copiar
                    </button>
                  </header>
                  <pre class="payload-body">{{ p.body }}</pre>
                </article>
              }
            </div>
          </mat-tab>

          <mat-tab label="Configuración">
            <p class="tab-intro">Parámetros globales de entrega y firma. No aplican a tokens API.</p>
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
              <button mat-flat-button color="primary" type="button" (click)="run('Guardar configuración')">
                <mat-icon>save</mat-icon> Guardar cambios
              </button>
              <button mat-stroked-button type="button" (click)="run('Probar firma HMAC')">
                <mat-icon>verified</mat-icon> Probar firma
              </button>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>

    <mat-menu #whMenu="matMenu">
      <button mat-menu-item type="button" (click)="run('Probar webhook')"><mat-icon>play_arrow</mat-icon> Probar envío</button>
      <button mat-menu-item type="button" (click)="run('Ver entregas')"><mat-icon>list</mat-icon> Ver entregas</button>
      <button mat-menu-item type="button" (click)="run('Regenerar secreto')"><mat-icon>key</mat-icon> Regenerar secreto</button>
      <button mat-menu-item type="button" (click)="run('Desactivar webhook')"><mat-icon>pause</mat-icon> Desactivar</button>
    </mat-menu>
  `,
  styles: `
    .page-container--admin-webhooks { --page-accent: #0d9488; }
    .admin-context-banner {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.85rem 1rem;
      margin-bottom: 1rem;
      border-radius: var(--app-radius-md, 10px);
      border: 1px solid color-mix(in srgb, var(--page-accent, #0d9488) 25%, transparent);
      background: color-mix(in srgb, var(--page-accent, #0d9488) 8%, var(--app-surface));
    }
    .admin-context-banner mat-icon { color: var(--page-accent, #0d9488); flex-shrink: 0; }
    .admin-context-banner p { margin: 0.25rem 0 0; font-size: 0.85rem; opacity: 0.9; }
    .admin-page-panel { margin-top: 0.5rem; }
    .tab-intro { padding: 0.75rem 1rem 0; font-size: 0.9rem; opacity: 0.85; }
    .url-cell { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.82rem; }
    .events-cell { max-width: 200px; font-size: 0.82rem; }
    .secret-chip { font-size: 0.75rem; }
    .active-yes { color: var(--status-running); font-size: 20px; width: 20px; height: 20px; }
    .active-no { color: #94a3b8; font-size: 20px; width: 20px; height: 20px; }
    .error-cell { color: var(--status-error); font-size: 0.85rem; }
    .payload-list { display: flex; flex-direction: column; gap: 1rem; padding: 1rem; }
    .payload-card {
      border: 1px solid var(--app-border, #e2e8f0);
      border-radius: var(--app-radius-md, 10px);
      overflow: hidden;
    }
    .payload-card header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 1rem;
      padding: 0.65rem 1rem;
      background: var(--app-surface-elevated, #f8fafc);
      font-size: 0.85rem;
    }
    .payload-card header code { font-weight: 600; }
    .payload-card header span { flex: 1; opacity: 0.8; }
    .payload-body {
      margin: 0;
      padding: 1rem;
      font-size: 0.78rem;
      line-height: 1.45;
      overflow-x: auto;
      background: #0f172a;
      color: #e2e8f0;
    }
    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 0.75rem;
      padding: 1rem;
    }
    .config-card {
      padding: 0.85rem 1rem;
      border-radius: var(--app-radius-md, 10px);
      border: 1px solid var(--app-border, #e2e8f0);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .config-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.7; }
    .config-value { font-size: 0.9rem; font-weight: 500; }
    .events-heading { padding: 0.5rem 1rem 0; font-size: 0.95rem; }
    .event-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      padding: 0.75rem 1rem 1rem;
    }
    .event-chip {
      font-size: 0.72rem;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: color-mix(in srgb, #0d9488 15%, transparent);
      font-family: ui-monospace, monospace;
    }
    .config-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0 1rem 1rem;
    }
  `,
})
export class AdminWebhooksPageComponent {
  private readonly demo = inject(DemoActionsService)

  readonly headerActions: PageHeaderAction[] = [
    { label: 'Nuevo webhook', icon: 'add', primary: true },
    { label: 'Documentación eventos', icon: 'menu_book' },
  ]

  readonly tabIndex = signal(0)
  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly failures = ADMIN_WEBHOOK_FAILURES
  readonly payloads = ADMIN_WEBHOOK_PAYLOADS
  readonly configItems = ADMIN_WEBHOOK_CONFIG
  readonly eventTypes = ADMIN_WEBHOOK_EVENT_TYPES

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

  handleHeader(label: string): void {
    this.run(label)
  }

  run(label: string): void {
    this.demo.simulate(label, 500, `${label} (demo)`).subscribe()
  }
}
