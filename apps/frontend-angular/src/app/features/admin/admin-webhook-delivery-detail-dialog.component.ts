import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { ToastService } from '../../core/services/toast.service'
import {
  ADMIN_WEBHOOKS_ACCENT,
  ADMIN_WEBHOOKS_ACCENT_BORDER,
  ADMIN_WEBHOOKS_ACCENT_LIGHT,
} from './admin.config'
import type { WebhookDeliveryRow } from './admin-webhooks.demo'

export interface AdminWebhookDeliveryDetailData {
  delivery: WebhookDeliveryRow
}

@Component({
  selector: 'app-admin-webhook-delivery-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="wh-del">
      <header class="wh-del__head">
        <div>
          <span class="wh-del__label">Entrega · {{ data.delivery.id }}</span>
          <h2><code>{{ data.delivery.event }}</code></h2>
          <p>Webhook: {{ data.delivery.webhook }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content class="wh-del__body">
        <div class="wh-del__badges">
          <app-status-badge [value]="data.delivery.status" />
          <span class="wh-del__http" [attr.data-code]="data.delivery.httpCode">HTTP {{ data.delivery.httpCode }}</span>
          <span class="wh-del__latency">{{ data.delivery.latency }}</span>
          @if (data.delivery.attempt) {
            <span class="wh-del__attempt">Intento {{ data.delivery.attempt }}</span>
          }
        </div>
        <dl class="wh-del__grid">
          <div><dt>Hora</dt><dd>{{ data.delivery.at | date: 'dd MMM yyyy, HH:mm:ss' }}</dd></div>
          @if (data.delivery.payloadSize) {
            <div><dt>Tamaño payload</dt><dd>{{ data.delivery.payloadSize }}</dd></div>
          }
          @if (data.delivery.signature) {
            <div class="wh-del__full"><dt>Firma</dt><dd class="mono">{{ data.delivery.signature }}</dd></div>
          }
          @if (data.delivery.responseBody) {
            <div class="wh-del__full"><dt>Respuesta</dt><dd class="mono">{{ data.delivery.responseBody }}</dd></div>
          }
        </dl>
      </mat-dialog-content>
      <mat-dialog-actions align="start" class="wh-del__actions">
        @if (data.delivery.status === 'failed') {
          <button type="button" class="page-action-btn page-action-btn--primary" (click)="handleRetry()">
            <mat-icon>replay</mat-icon> Reintentar
          </button>
        }
        <button type="button" class="page-action-btn" (click)="handleCopyEvent()">
          <mat-icon>content_copy</mat-icon> Copiar evento
        </button>
        <button type="button" class="page-action-btn" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .wh-del { width: 100%; color: #0f172a; }
    .wh-del__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .wh-del__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .wh-del__head h2 { margin: 0.2rem 0 0; font-size: 0.95rem; font-weight: 700; }
    .wh-del__head h2 code { font-size: 0.82rem; }
    .wh-del__head p { margin: 0.25rem 0 0; font-size: 0.72rem; color: #64748b; }
    .wh-del__body { padding-top: 0.75rem !important; display: flex; flex-direction: column; gap: 0.75rem; }
    .wh-del__badges { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
    .wh-del__http { font-size: 0.62rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 999px; background: #dcfce7; color: #15803d; &[data-code='503'], &[data-code='429'] { background: #fee2e2; color: #b91c1c; } }
    .wh-del__latency, .wh-del__attempt { font-size: 0.62rem; font-weight: 600; padding: 0.1rem 0.4rem; border-radius: 999px; background: ${ADMIN_WEBHOOKS_ACCENT_LIGHT}; color: ${ADMIN_WEBHOOKS_ACCENT}; border: 1px solid ${ADMIN_WEBHOOKS_ACCENT_BORDER}; }
    .wh-del__grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem;
      dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.1rem 0 0; font-size: 0.78rem; }
    }
    .wh-del__full { grid-column: 1 / -1; }
    .wh-del__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; padding-top: 0.65rem; border-top: 1px solid #e2e8f0; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.72rem; }
  `,
})
export class AdminWebhookDeliveryDetailDialogComponent {
  readonly data = inject<AdminWebhookDeliveryDetailData>(MAT_DIALOG_DATA)
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)

  handleRetry = (): void => {
    this.actions.runRowAction('admin-webhooks', 'retry', this.data.delivery as unknown as Record<string, unknown>, 'Entregas', 'Reintentar entrega')
  }

  handleCopyEvent = (): void => {
    void navigator.clipboard.writeText(this.data.delivery.event).then(
      () => this.toast.success('Evento copiado'),
      () => this.toast.info(this.data.delivery.event),
    )
  }
}
