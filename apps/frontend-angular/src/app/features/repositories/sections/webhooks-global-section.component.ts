import { Component, Input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import {
  GLOBAL_WEBHOOK_ERRORS,
  GLOBAL_WEBHOOK_PAYLOADS,
  GLOBAL_WEBHOOK_RETRIES,
} from '../utils/repositories-global-demo.util'

@Component({
  selector: 'app-webhooks-global-section',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTabsModule, MatTableModule, StatusBadgeComponent],
  template: `
    <div class="webhooks-page">
      <div class="webhooks-toolbar">
        <button mat-flat-button color="primary" type="button" (click)="create.emit()">
          <mat-icon>add</mat-icon> Crear webhook
        </button>
        <button mat-stroked-button type="button" (click)="test.emit()">
          <mat-icon>play_arrow</mat-icon> Probar webhook
        </button>
      </div>

      <mat-tab-group class="soft-tabs" animationDuration="200ms">
        <mat-tab label="Resumen">
          <div class="tab-panel summary-grid">
            <div class="stat"><span>{{ githubItems.length }}</span><small>Webhooks GitHub</small></div>
            <div class="stat"><span>{{ gitlabItems.length }}</span><small>Webhooks GitLab</small></div>
            <div class="stat"><span>{{ deployItems.length }}</span><small>Despliegue externo</small></div>
            <div class="stat warn"><span>{{ errors.length }}</span><small>Fallos 24h</small></div>
          </div>
        </mat-tab>
        <mat-tab label="GitHub">
          <div class="tab-panel">
            <table mat-table [dataSource]="githubItems" class="premium-table">
              <ng-container matColumnDef="repo"><th mat-header-cell *matHeaderCellDef>Repositorio</th><td mat-cell *matCellDef="let row">{{ row.repoFullName }}</td></ng-container>
              <ng-container matColumnDef="event"><th mat-header-cell *matHeaderCellDef>Evento</th><td mat-cell *matCellDef="let row">{{ row.event }}</td></ng-container>
              <ng-container matColumnDef="url"><th mat-header-cell *matHeaderCellDef>URL</th><td mat-cell *matCellDef="let row" class="mono">{{ row.url }}</td></ng-container>
              <ng-container matColumnDef="active"><th mat-header-cell *matHeaderCellDef>Estado</th><td mat-cell *matCellDef="let row"><app-status-badge [value]="row.active ? 'SUCCESS' : 'STOPPED'" /></td></ng-container>
              <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Acciones</th><td mat-cell *matCellDef="let row">
                <button mat-button type="button" (click)="viewPayload.emit(row)">Ver payload</button>
                <button mat-button type="button" (click)="toggle.emit(row)">Desactivar demo</button>
              </td></ng-container>
              <tr mat-header-row *matHeaderRowDef="ghCols"></tr>
              <tr mat-row *matRowDef="let row; columns: ghCols"></tr>
            </table>
          </div>
        </mat-tab>
        <mat-tab label="GitLab">
          <div class="tab-panel">
            <table mat-table [dataSource]="gitlabItems" class="premium-table">
              <ng-container matColumnDef="project"><th mat-header-cell *matHeaderCellDef>Proyecto</th><td mat-cell *matCellDef="let row">{{ row.projectPath }}</td></ng-container>
              <ng-container matColumnDef="event"><th mat-header-cell *matHeaderCellDef>Evento</th><td mat-cell *matCellDef="let row">{{ row.event }}</td></ng-container>
              <ng-container matColumnDef="url"><th mat-header-cell *matHeaderCellDef>URL</th><td mat-cell *matCellDef="let row" class="mono">{{ row.url }}</td></ng-container>
              <ng-container matColumnDef="active"><th mat-header-cell *matHeaderCellDef>Estado</th><td mat-cell *matCellDef="let row"><app-status-badge [value]="row.active ? 'SUCCESS' : 'STOPPED'" /></td></ng-container>
              <tr mat-header-row *matHeaderRowDef="glCols"></tr>
              <tr mat-row *matRowDef="let row; columns: glCols"></tr>
            </table>
          </div>
        </mat-tab>
        <mat-tab label="Payloads">
          <div class="tab-panel">
            @for (p of payloads; track p['id']) {
              <div class="payload-row">
                <strong>{{ p['event'] }}</strong> — {{ p['provider'] }}
                <app-status-badge [value]="p['status'] === 'delivered' ? 'SUCCESS' : 'RUNNING'" />
                <span class="muted">{{ p['size'] }} · {{ p['receivedAt'] }}</span>
                <button mat-button type="button" (click)="viewPayload.emit(p)">Ver payload</button>
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="Reintentos">
          <div class="tab-panel">
            @for (r of retries; track r['id']) {
              <div class="payload-row">
                Webhook {{ r['webhookId'] }} — intento {{ r['attempt'] }}
                <button mat-stroked-button type="button" (click)="retry.emit(r)">Reintentar evento</button>
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="Errores">
          <div class="tab-panel">
            @for (e of errors; track e['id']) {
              <div class="payload-row error">
                <mat-icon>error</mat-icon> {{ e['message'] }} ({{ e['webhookId'] }})
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="Configuración">
          <div class="tab-panel">
            <p>URLs base: <code class="mono">https://hooks.cloudops.local/</code></p>
            <p class="muted">Firma HMAC, reintentos automáticos y registro de payloads (demo).</p>
            <button mat-stroked-button type="button" (click)="create.emit()">Crear webhook</button>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .webhooks-page { border-top: 3px solid #6366f1; padding-top: 0.25rem; }
    .webhooks-toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .tab-panel { padding: 1rem 0; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.65rem; }
    .stat { padding: 1rem; border-radius: var(--app-radius-sm); background: var(--app-elevated); text-align: center; span { font-size: 1.5rem; font-weight: 700; display: block; } small { color: var(--app-text-muted); } }
    .stat.warn span { color: var(--status-error, #dc2626); }
    .payload-row { padding: 0.6rem 0; border-bottom: 1px solid var(--app-border-subtle); font-size: 0.85rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .payload-row.error { color: var(--status-error, #dc2626); }
    .mono { font-family: ui-monospace, monospace; font-size: 0.78rem; word-break: break-all; }
    .muted { color: var(--app-text-muted); font-size: 0.78rem; }
  `,
})
export class WebhooksGlobalSectionComponent {
  @Input() allWebhooks: Record<string, unknown>[] = []

  readonly payloads = GLOBAL_WEBHOOK_PAYLOADS
  readonly retries = GLOBAL_WEBHOOK_RETRIES
  readonly errors = GLOBAL_WEBHOOK_ERRORS
  readonly ghCols = ['repo', 'event', 'url', 'active', 'actions']
  readonly glCols = ['project', 'event', 'url', 'active']

  get githubItems(): Record<string, unknown>[] {
    return this.allWebhooks.filter((w) => w['provider'] === 'github' || !w['provider'])
  }

  get gitlabItems(): Record<string, unknown>[] {
    return this.allWebhooks.filter((w) => w['provider'] === 'gitlab')
  }

  get deployItems(): Record<string, unknown>[] {
    return [{ id: 'dep-wh-1', event: 'deployment', url: 'https://hooks.cloudops.local/deploy' }]
  }

  readonly create = output<void>()
  readonly test = output<void>()
  readonly viewPayload = output<Record<string, unknown>>()
  readonly toggle = output<Record<string, unknown>>()
  readonly retry = output<Record<string, unknown>>()
}
