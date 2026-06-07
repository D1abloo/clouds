import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import {
  ADMIN_WEBHOOKS_ACCENT,
  ADMIN_WEBHOOKS_ACCENT_BORDER,
  ADMIN_WEBHOOKS_ACCENT_LIGHT,
} from './admin.config'
import type { AdminWebhookRow } from './admin-webhooks.demo'

export interface AdminWebhookDetailData {
  webhook: AdminWebhookRow
}

@Component({
  selector: 'app-admin-webhook-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="wh-det">
      <header class="wh-det__head">
        <div>
          <span class="wh-det__label">Webhook · {{ data.webhook.id }}</span>
          <h2>{{ data.webhook.name }}</h2>
          @if (data.webhook.description) { <p>{{ data.webhook.description }}</p> }
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content class="wh-det__body">
        <div class="wh-det__badges">
          <app-status-badge [value]="data.webhook.status" />
          @if (data.webhook.active) {
            <span class="wh-det__active"><mat-icon>check_circle</mat-icon> Activo</span>
          } @else {
            <span class="wh-det__inactive"><mat-icon>pause_circle</mat-icon> Inactivo</span>
          }
          @if (data.webhook.successRate != null) {
            <span class="wh-det__rate">{{ data.webhook.successRate }}% éxito</span>
          }
        </div>
        <dl class="wh-det__grid">
          <div class="wh-det__full"><dt>URL destino</dt><dd class="mono">{{ data.webhook.url }}</dd></div>
          <div class="wh-det__full"><dt>Eventos</dt><dd>{{ data.webhook.events }}</dd></div>
          <div><dt>Secreto</dt><dd class="mono">{{ data.webhook.secret }}</dd></div>
          <div><dt>Propietario</dt><dd>{{ data.webhook.owner ?? '—' }}</dd></div>
          @if (data.webhook.created) {
            <div><dt>Creado</dt><dd>{{ data.webhook.created | date: 'dd MMM yyyy' }}</dd></div>
          }
          @if (data.webhook.lastDelivery) {
            <div><dt>Última entrega</dt><dd>{{ data.webhook.lastDelivery | date: 'dd MMM HH:mm' }}</dd></div>
          }
        </dl>
        <section class="wh-det__block">
          <h3><mat-icon>verified</mat-icon> Verificación HMAC</h3>
          <p>Valida la cabecera <code>X-CloudOps-Signature</code> con el secreto mostrado. Responde 2xx en menos de 30 segundos para confirmar la entrega.</p>
        </section>
      </mat-dialog-content>
      <mat-dialog-actions align="start" class="wh-det__actions">
        <button type="button" class="page-action-btn page-action-btn--primary" (click)="handleTest()">
          <mat-icon>play_arrow</mat-icon> Probar envío
        </button>
        <button type="button" class="page-action-btn" (click)="handleCopySecret()">
          <mat-icon>content_copy</mat-icon> Copiar secreto
        </button>
        <button type="button" class="page-action-btn" (click)="handleRegenerate()">
          <mat-icon>key</mat-icon> Regenerar secreto
        </button>
        @if (data.webhook.active) {
          <button type="button" class="page-action-btn" (click)="handleDisable()">
            <mat-icon>pause</mat-icon> Desactivar
          </button>
        }
        <button type="button" class="page-action-btn" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .wh-det { width: 100%; color: #0f172a; }
    .wh-det__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .wh-det__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .wh-det__head h2 { margin: 0.2rem 0 0; font-size: 1.05rem; font-weight: 700; }
    .wh-det__head p { margin: 0.25rem 0 0; font-size: 0.72rem; color: #64748b; line-height: 1.5; max-width: 36rem; }
    .wh-det__body { padding-top: 0.75rem !important; display: flex; flex-direction: column; gap: 0.75rem; }
    .wh-det__badges { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
    .wh-det__active, .wh-det__inactive { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.62rem; font-weight: 700; }
    .wh-det__active { color: #15803d; }
    .wh-det__inactive { color: #94a3b8; }
    .wh-det__active mat-icon, .wh-det__inactive mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    .wh-det__rate { font-size: 0.62rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 999px; background: ${ADMIN_WEBHOOKS_ACCENT_LIGHT}; color: ${ADMIN_WEBHOOKS_ACCENT}; border: 1px solid ${ADMIN_WEBHOOKS_ACCENT_BORDER}; }
    .wh-det__grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem;
      dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.1rem 0 0; font-size: 0.78rem; word-break: break-all; }
    }
    .wh-det__full { grid-column: 1 / -1; }
    .wh-det__block { padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid ${ADMIN_WEBHOOKS_ACCENT_BORDER}; background: ${ADMIN_WEBHOOKS_ACCENT_LIGHT}; }
    .wh-det__block h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.4rem; font-size: 0.75rem; font-weight: 700; color: ${ADMIN_WEBHOOKS_ACCENT}; }
    .wh-det__block h3 mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .wh-det__block p { margin: 0; font-size: 0.72rem; color: #475569; line-height: 1.55; }
    .wh-det__block code { font-size: 0.68rem; }
    .wh-det__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; padding-top: 0.65rem; border-top: 1px solid #e2e8f0; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.72rem; }
  `,
})
export class AdminWebhookDetailDialogComponent {
  readonly data = inject<AdminWebhookDetailData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<AdminWebhookDetailDialogComponent>)
  private readonly actions = inject(PlatformActionService)

  handleTest = (): void => {
    this.actions.runRowAction('admin-webhooks', 'test', this.data.webhook as unknown as Record<string, unknown>, 'Webhooks', 'Probar envío')
  }

  handleCopySecret = (): void => {
    this.actions.runRowAction('admin-webhooks', 'copy', this.data.webhook as unknown as Record<string, unknown>, 'Webhooks', 'Copiar secreto')
  }

  handleRegenerate = (): void => {
    this.actions.runRowAction('admin-webhooks', 'regenerate', this.data.webhook as unknown as Record<string, unknown>, 'Webhooks', 'Regenerar secreto')
  }

  handleDisable = (): void => {
    this.actions.runRowAction('admin-webhooks', 'disable', this.data.webhook as unknown as Record<string, unknown>, 'Webhooks', 'Desactivar webhook')
    this.dialogRef.close({ action: 'disable', id: this.data.webhook.id })
  }
}
