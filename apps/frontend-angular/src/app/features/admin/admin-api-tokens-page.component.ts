import { Component, inject, signal, computed } from '@angular/core'
import { DatePipe, NgTemplateOutlet } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { toSignal } from '@angular/core/rxjs-interop'
import { debounceTime, startWith } from 'rxjs'
import { PageHeaderComponent, type PageHeaderAction } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import {
  API_TOKENS_ACTIVE,
  API_TOKENS_AUDIT,
  API_TOKENS_EXPIRING,
  API_TOKENS_REVOKED,
  API_TOKEN_SCOPES,
  type ApiTokenRow,
} from './admin-api-tokens.demo'

@Component({
  selector: 'app-admin-api-tokens-page',
  standalone: true,
  imports: [
    DatePipe,
    NgTemplateOutlet,
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
  ],
  template: `
    <div class="page-container page-container--api-tokens">
      <app-page-header
        title="Tokens API"
        description="Claves Bearer para autenticar integraciones, CI/CD y scripts contra la API de CloudOps. No confundir con webhooks HTTP salientes."
        icon="vpn_key"
        [demoMode]="true"
        [actions]="headerActions"
        (actionClick)="handleHeader($event)"
      />

      <div class="admin-context-banner admin-context-banner--tokens">
        <mat-icon>info</mat-icon>
        <div>
          <strong>Autenticación de API</strong>
          <p>Los tokens se envían en <code>Authorization: Bearer &lt;token&gt;</code>. Solo se muestra el prefijo al crear; revoca o rota si hay fuga.</p>
        </div>
      </div>

      <div class="summary-grid app-section-panel stagger-children">
        <app-summary-card title="Activos" value="4" icon="vpn_key" variant="elevated" />
        <app-summary-card title="Por expirar" value="2" icon="schedule" variant="elevated" />
        <app-summary-card title="Revocados" value="2" icon="block" variant="elevated" />
        <app-summary-card title="Llamadas (24 h)" value="1.247" icon="timeline" variant="elevated" />
      </div>

      <div class="table-card admin-page-panel">
        <mat-tab-group class="soft-tabs" animationDuration="280ms" [selectedIndex]="tabIndex()" (selectedIndexChange)="tabIndex.set($event)">
          <mat-tab label="Activos">
            <ng-container *ngTemplateOutlet="tokenToolbar" />
            @if (filteredActive().length === 0) {
              <app-empty-state title="Sin tokens activos" description="Crea un token con alcances mínimos necesarios." icon="vpn_key" />
            } @else {
              <ng-container *ngTemplateOutlet="tokenTable; context: { rows: filteredActive(), mode: 'active' }" />
            }
          </mat-tab>
          <mat-tab label="Por expirar">
            <ng-container *ngTemplateOutlet="tokenToolbar" />
            @if (filteredExpiring().length === 0) {
              <app-empty-state title="Ningún token próximo a caducar" icon="event" />
            } @else {
              <ng-container *ngTemplateOutlet="tokenTable; context: { rows: filteredExpiring(), mode: 'expiring' }" />
            }
          </mat-tab>
          <mat-tab label="Revocados">
            <ng-container *ngTemplateOutlet="tokenToolbar" />
            @if (filteredRevoked().length === 0) {
              <app-empty-state title="Sin revocaciones recientes" icon="history" />
            } @else {
              <ng-container *ngTemplateOutlet="tokenTable; context: { rows: filteredRevoked(), mode: 'revoked' }" />
            }
          </mat-tab>
          <mat-tab label="Auditoría de uso">
            <ng-container *ngTemplateOutlet="tokenToolbar" />
            @if (filteredAudit().length === 0) {
              <app-empty-state title="Sin llamadas registradas" description="Las peticiones autenticadas aparecerán aquí." icon="receipt_long" />
            } @else {
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Método</th>
                      <th>Endpoint</th>
                      <th>IP origen</th>
                      <th>Estado</th>
                      <th>Hace</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of filteredAudit(); track row.id) {
                      <tr>
                        <td><span class="token-prefix">{{ row.prefix }}</span> {{ row.name }}</td>
                        <td><code class="method-chip">{{ row.method }}</code></td>
                        <td class="mono">{{ row.endpoint }}</td>
                        <td>{{ row.ip }}</td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td>{{ row.lastUsed | date:'short' }}</td>
                        <td><button mat-icon-button type="button" [matMenuTriggerFor]="auditMenu" aria-label="Acciones"><mat-icon>more_vert</mat-icon></button></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </mat-tab>
          <mat-tab label="Alcances">
            <p class="tab-intro">Referencia de permisos disponibles al emitir un token.</p>
            <div class="data-table-wrap">
              <table class="premium-table">
                <thead>
                  <tr><th>Alcance</th><th>Descripción</th></tr>
                </thead>
                <tbody>
                  @for (s of scopes; track s.scope) {
                    <tr>
                      <td><code>{{ s.scope }}</code></td>
                      <td>{{ s.description }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>

    <ng-template #tokenToolbar>
      <div class="filter-row table-toolbar">
        <mat-form-field appearance="outline">
          <mat-label>Buscar token o propietario</mat-label>
          <input matInput [formControl]="searchControl" placeholder="Nombre, owner, alcance…" />
        </mat-form-field>
      </div>
    </ng-template>

    <ng-template #tokenTable let-rows="rows" let-mode="mode">
      <div class="data-table-wrap">
        <table class="premium-table table-row-hover">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Prefijo</th>
              <th>Alcances</th>
              <th>Propietario</th>
              @if (mode === 'expiring') { <th>Expira</th> }
              @if (mode === 'revoked') { <th>Revocado por</th><th>Motivo</th> }
              <th>Último uso</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows; track row.id) {
              <tr>
                <td>{{ row.name }}</td>
                <td><span class="token-prefix">{{ row.prefix }}</span></td>
                <td class="scopes-cell">{{ row.scope }}</td>
                <td>{{ row.owner }}</td>
                @if (mode === 'expiring') {
                  <td>{{ row.expires | date:'mediumDate' }}</td>
                }
                @if (mode === 'revoked') {
                  <td>{{ row.revokedBy }}</td>
                  <td>{{ row.reason }}</td>
                }
                <td>{{ row.lastUsed | date:'short' }}</td>
                <td><app-status-badge [value]="row.status" /></td>
                <td>
                  <button mat-icon-button type="button" [matMenuTriggerFor]="tokenMenu" aria-label="Acciones del token">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </ng-template>

    <mat-menu #tokenMenu="matMenu">
      <button mat-menu-item type="button" (click)="run('Rotar token')"><mat-icon>autorenew</mat-icon> Rotar</button>
      <button mat-menu-item type="button" (click)="run('Revocar token')"><mat-icon>block</mat-icon> Revocar</button>
      <button mat-menu-item type="button" (click)="run('Copiar prefijo')"><mat-icon>content_copy</mat-icon> Copiar prefijo</button>
      <button mat-menu-item type="button" (click)="run('Ver auditoría del token')"><mat-icon>receipt_long</mat-icon> Ver auditoría</button>
    </mat-menu>

    <mat-menu #auditMenu="matMenu">
      <button mat-menu-item type="button" (click)="run('Ver detalle de llamada')"><mat-icon>visibility</mat-icon> Detalle</button>
      <button mat-menu-item type="button" (click)="run('Bloquear IP')"><mat-icon>shield</mat-icon> Bloquear IP</button>
    </mat-menu>
  `,
  styles: `
    .page-container--api-tokens { --page-accent: #7c3aed; }
    .admin-context-banner {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.85rem 1rem;
      margin-bottom: 1rem;
      border-radius: var(--app-radius-md, 10px);
      border: 1px solid color-mix(in srgb, var(--page-accent, #7c3aed) 25%, transparent);
      background: color-mix(in srgb, var(--page-accent, #7c3aed) 8%, var(--app-surface));
    }
    .admin-context-banner mat-icon { color: var(--page-accent, #7c3aed); flex-shrink: 0; }
    .admin-context-banner p { margin: 0.25rem 0 0; font-size: 0.85rem; opacity: 0.9; }
    .admin-context-banner code { font-size: 0.8rem; }
    .admin-page-panel { margin-top: 0.5rem; }
    .tab-intro { padding: 0.75rem 1rem 0; font-size: 0.9rem; opacity: 0.85; }
    .token-prefix {
      font-family: ui-monospace, monospace;
      font-size: 0.8rem;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      background: color-mix(in srgb, #7c3aed 12%, transparent);
    }
    .scopes-cell { max-width: 220px; font-size: 0.82rem; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
    .method-chip {
      font-size: 0.75rem;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      background: var(--app-surface-elevated, #f1f5f9);
    }
  `,
})
export class AdminApiTokensPageComponent {
  private readonly demo = inject(DemoActionsService)

  readonly headerActions: PageHeaderAction[] = [
    { label: 'Emitir token', icon: 'add', primary: true },
    { label: 'Política de rotación', icon: 'policy' },
  ]

  readonly tabIndex = signal(0)
  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly scopes = API_TOKEN_SCOPES

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(startWith(''), debounceTime(200)),
    { initialValue: '' },
  )

  readonly filteredActive = computed(() => this.filterRows(API_TOKENS_ACTIVE))
  readonly filteredExpiring = computed(() => this.filterRows(API_TOKENS_EXPIRING))
  readonly filteredRevoked = computed(() => this.filterRows(API_TOKENS_REVOKED))
  readonly filteredAudit = computed(() => this.filterRows(API_TOKENS_AUDIT))

  private filterRows(rows: ApiTokenRow[]): ApiTokenRow[] {
    const q = this.searchTerm().trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.scope.toLowerCase().includes(q) ||
        r.prefix.toLowerCase().includes(q) ||
        (r.endpoint?.toLowerCase().includes(q) ?? false),
    )
  }

  handleHeader(label: string): void {
    this.run(label)
  }

  run(label: string): void {
    this.demo.simulate(label, 500, `${label} (demo)`).subscribe()
  }
}
