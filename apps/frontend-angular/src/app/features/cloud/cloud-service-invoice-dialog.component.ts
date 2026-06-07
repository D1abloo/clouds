import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { ToastService } from '../../core/services/toast.service'
import { downloadCloudInvoicePdf } from './cloud-invoice-download.util'
import { fmtUsd, type CloudBillingRow, type CloudProviderUiConfig } from './cloud-provider.demo'

export interface CloudServiceInvoiceDialogData {
  invoice: CloudBillingRow
  provider: CloudProviderUiConfig
}

@Component({
  selector: 'app-cloud-service-invoice-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, BrandLogoComponent],
  template: `
    <div
      class="cloud-inv-dialog"
      [style.--inv-accent]="data.provider.accent"
      [style.--inv-accent-soft]="data.provider.accentSoft"
    >
      <header class="cloud-inv-dialog__head">
        <div class="cloud-inv-dialog__identity">
          <app-brand-logo [logo]="data.provider.logo" size="lg" />
          <div>
            <p class="cloud-inv-dialog__eyebrow">Factura de servicio cloud</p>
            <h2 mat-dialog-title>{{ data.invoice.service }}</h2>
            <p class="cloud-inv-dialog__subtitle mono">{{ data.invoice.invoiceId }}</p>
            <div class="cloud-inv-dialog__chips">
              <span class="cloud-inv-dialog__status" [attr.data-status]="data.invoice.invoiceStatus">
                {{ statusLabel() }}
              </span>
              <span class="cloud-inv-dialog__chip">{{ data.invoice.period }}</span>
              <span class="cloud-inv-dialog__chip">{{ data.provider.provider }} · {{ data.invoice.currency }}</span>
            </div>
          </div>
        </div>
        <div class="cloud-inv-dialog__total-block">
          <span>Total factura</span>
          <strong>{{ fmtUsd(data.invoice.total ?? data.invoice.cost) }}</strong>
          <em [class]="data.invoice.trend >= 0 ? 'trend-up' : 'trend-down'">
            {{ data.invoice.trend >= 0 ? '+' : '' }}{{ data.invoice.trend }}% vs mes anterior
          </em>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content class="cloud-inv-dialog__body">
        <p class="cloud-inv-dialog__desc">{{ data.invoice.description }}</p>

        <div class="cloud-inv-dialog__meta-grid">
          <div>
            <span>Proveedor</span>
            <strong>{{ data.provider.title }}</strong>
          </div>
          <div>
            <span>Cuenta vinculada</span>
            <strong>{{ data.invoice.accountName }}</strong>
            <em class="mono">{{ data.invoice.linkedAccount }}</em>
          </div>
          <div>
            <span>Fecha emisión</span>
            <strong>{{ data.invoice.issuedAt }}</strong>
          </div>
          <div>
            <span>Fecha vencimiento</span>
            <strong>{{ data.invoice.dueAt }}</strong>
          </div>
          <div>
            <span>Contacto facturación</span>
            <strong>{{ data.invoice.billingContact }}</strong>
          </div>
          <div>
            <span>Método de pago</span>
            <strong>{{ data.invoice.paymentMethod }}</strong>
          </div>
          <div>
            <span>Centro de coste</span>
            <strong class="mono">{{ data.invoice.costCenter }}</strong>
          </div>
          <div>
            <span>SKU / producto</span>
            <strong class="mono">{{ data.invoice.sku }}</strong>
          </div>
        </div>

        <section class="cloud-inv-dialog__panel">
          <header>
            <h3><mat-icon>receipt_long</mat-icon> Líneas de factura</h3>
            <span>{{ lineCount() }} conceptos · {{ data.invoice.share }}% del gasto cloud</span>
          </header>
          <div class="cloud-inv-dialog__table-wrap">
            <table class="cloud-inv-dialog__table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Concepto</th>
                  <th>Recurso</th>
                  <th>Región</th>
                  <th>Tipo de uso</th>
                  <th>Categoría</th>
                  <th>Cantidad</th>
                  <th>P. unit.</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                @for (line of data.invoice.lineItems ?? []; track line.id; let i = $index) {
                  <tr>
                    <td class="mono">{{ i + 1 }}</td>
                    <td>{{ line.description }}</td>
                    <td class="mono">{{ line.resourceId ?? '—' }}</td>
                    <td>{{ line.region }}</td>
                    <td class="mono cloud-inv-dialog__usage">{{ line.usageType ?? '—' }}</td>
                    <td><span class="cloud-inv-dialog__cat">{{ line.chargeCategory ?? '—' }}</span></td>
                    <td>{{ line.quantity }}</td>
                    <td>{{ fmtUsd(line.unitPrice) }}</td>
                    <td><strong>{{ fmtUsd(line.amount) }}</strong></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <div class="cloud-inv-dialog__footer-grid">
          <section class="cloud-inv-dialog__panel cloud-inv-dialog__panel--notes">
            <h3><mat-icon>info</mat-icon> Notas y auditoría</h3>
            <p>{{ data.invoice.notes }}</p>
            <dl>
              <div><dt>ID interno</dt><dd class="mono">{{ data.invoice.id }}</dd></div>
              <div><dt>Participación cloud</dt><dd>{{ data.invoice.share }}% del total</dd></div>
              <div><dt>Moneda</dt><dd>{{ data.invoice.currency }} (sin impuestos locales)</dd></div>
            </dl>
          </section>

          <section class="cloud-inv-dialog__summary">
            <h3>Resumen de cargos</h3>
            <dl>
              <div>
                <dt>Subtotal servicio</dt>
                <dd>{{ fmtUsd(data.invoice.subtotal ?? data.invoice.cost) }}</dd>
              </div>
              @if (data.invoice.discount) {
                <div class="cloud-inv-dialog__credit">
                  <dt>Descuento RI / SP</dt>
                  <dd>-{{ fmtUsd(data.invoice.discount) }}</dd>
                </div>
              }
              @if (data.invoice.credits) {
                <div class="cloud-inv-dialog__credit">
                  <dt>Créditos aplicados</dt>
                  <dd>-{{ fmtUsd(data.invoice.credits) }}</dd>
                </div>
              }
              <div>
                <dt>Impuestos</dt>
                <dd>{{ fmtUsd(data.invoice.tax ?? 0) }}</dd>
              </div>
              <div class="cloud-inv-dialog__summary-total">
                <dt>Total a pagar</dt>
                <dd>{{ fmtUsd(data.invoice.total ?? data.invoice.cost) }}</dd>
              </div>
            </dl>
          </section>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" (click)="handleCopyInvoiceId()">
          <mat-icon>content_copy</mat-icon>
          Copiar nº factura
        </button>
        <button mat-stroked-button type="button" (click)="handleDownloadPdf()" [disabled]="downloading()">
          <mat-icon>{{ downloading() ? 'hourglass_empty' : 'download' }}</mat-icon>
          {{ downloading() ? 'Generando…' : 'Descargar PDF' }}
        </button>
        <button mat-flat-button color="primary" mat-dialog-close type="button">Cerrar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    :host { display: block; padding-top: 0.25rem; }
    :host ::ng-deep .mat-mdc-dialog-title::before { display: none; }

    .cloud-inv-dialog {
      min-width: min(920px, 96vw);
      max-width: 96vw;
    }

    .cloud-inv-dialog__head {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 1rem;
      align-items: start;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
    }

    .cloud-inv-dialog__identity {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
    }

    .cloud-inv-dialog__eyebrow {
      margin: 0;
      font-size: 0.62rem;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }

    h2[mat-dialog-title] {
      margin: 0.15rem 0 0;
      font-size: 1.2rem;
      font-weight: 850;
      padding: 0;
      letter-spacing: -0.02em;
    }

    .cloud-inv-dialog__subtitle {
      margin: 0.2rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
      font-weight: 650;
    }

    .cloud-inv-dialog__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.45rem;
    }

    .cloud-inv-dialog__chip {
      font-size: 0.6rem;
      font-weight: 700;
      padding: 0.2rem 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 5%, transparent);
      color: var(--app-text-muted);
    }

    .cloud-inv-dialog__status {
      font-size: 0.6rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .cloud-inv-dialog__status[data-status='paid'] {
      background: color-mix(in srgb, #10b981 14%, transparent);
      color: #047857;
    }
    .cloud-inv-dialog__status[data-status='pending'] {
      background: color-mix(in srgb, #f59e0b 14%, transparent);
      color: #b45309;
    }
    .cloud-inv-dialog__status[data-status='open'] {
      background: color-mix(in srgb, var(--inv-accent, #ff9900) 14%, transparent);
      color: var(--inv-accent-soft, #c2410c);
    }

    .cloud-inv-dialog__total-block {
      text-align: right;
      padding: 0.55rem 0.75rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--inv-accent, #ff9900) 8%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--inv-accent, #ff9900) 18%, transparent);
    }
    .cloud-inv-dialog__total-block span {
      display: block;
      font-size: 0.54rem;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .cloud-inv-dialog__total-block strong {
      display: block;
      font-size: 1.45rem;
      font-weight: 900;
      color: var(--inv-accent-soft, #c2410c);
      letter-spacing: -0.03em;
      margin: 0.1rem 0;
    }
    .cloud-inv-dialog__total-block em {
      font-style: normal;
      font-size: 0.58rem;
      font-weight: 700;
    }

    .cloud-inv-dialog__body {
      padding-top: 0.85rem !important;
    }

    .cloud-inv-dialog__desc {
      margin: 0 0 0.85rem;
      font-size: 0.78rem;
      line-height: 1.55;
      color: var(--app-text-muted);
    }

    .cloud-inv-dialog__meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.55rem;
      margin-bottom: 0.85rem;
    }
    .cloud-inv-dialog__meta-grid > div {
      padding: 0.55rem 0.6rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-surface) 30%, transparent);
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .cloud-inv-dialog__meta-grid span {
      display: block;
      font-size: 0.52rem;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }
    .cloud-inv-dialog__meta-grid strong {
      display: block;
      font-size: 0.72rem;
      font-weight: 800;
      margin-top: 0.15rem;
    }
    .cloud-inv-dialog__meta-grid em {
      display: block;
      font-style: normal;
      font-size: 0.58rem;
      color: var(--app-text-muted);
      margin-top: 0.1rem;
    }

    .cloud-inv-dialog__panel {
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--app-text) 7%, transparent);
      overflow: hidden;
      margin-bottom: 0.85rem;
    }
    .cloud-inv-dialog__panel header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.55rem 0.75rem;
      background: color-mix(in srgb, var(--inv-accent, #ff9900) 6%, transparent);
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .cloud-inv-dialog__panel h3 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0;
      font-size: 0.78rem;
      font-weight: 850;
    }
    .cloud-inv-dialog__panel h3 mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
      color: var(--inv-accent, #ff9900);
    }
    .cloud-inv-dialog__panel header > span {
      font-size: 0.62rem;
      color: var(--app-text-muted);
      font-weight: 650;
    }

    .cloud-inv-dialog__table-wrap {
      overflow-x: auto;
    }
    .cloud-inv-dialog__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.68rem;
    }
    .cloud-inv-dialog__table th {
      text-align: left;
      padding: 0.45rem 0.55rem;
      font-size: 0.54rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--app-text-muted);
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
      white-space: nowrap;
    }
    .cloud-inv-dialog__table td {
      padding: 0.45rem 0.55rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
      vertical-align: top;
    }
    .cloud-inv-dialog__table tbody tr:hover {
      background: color-mix(in srgb, var(--inv-accent, #ff9900) 4%, transparent);
    }
    .cloud-inv-dialog__usage {
      font-size: 0.58rem;
      max-width: 140px;
      word-break: break-word;
    }
    .cloud-inv-dialog__cat {
      font-size: 0.58rem;
      font-weight: 750;
      padding: 0.12rem 0.35rem;
      border-radius: 6px;
      background: color-mix(in srgb, var(--app-text) 5%, transparent);
    }

    .cloud-inv-dialog__footer-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 0.75rem;
    }
    .cloud-inv-dialog__panel--notes {
      padding: 0.65rem 0.75rem;
      margin-bottom: 0;
    }
    .cloud-inv-dialog__panel--notes h3 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.45rem;
      font-size: 0.74rem;
      font-weight: 850;
    }
    .cloud-inv-dialog__panel--notes h3 mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--inv-accent, #ff9900);
    }
    .cloud-inv-dialog__panel--notes p {
      margin: 0 0 0.55rem;
      font-size: 0.68rem;
      line-height: 1.5;
      color: var(--app-text-muted);
    }
    .cloud-inv-dialog__panel--notes dl {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.45rem;
      margin: 0;
    }
    .cloud-inv-dialog__panel--notes dt {
      font-size: 0.52rem;
      font-weight: 750;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .cloud-inv-dialog__panel--notes dd {
      margin: 0.08rem 0 0;
      font-size: 0.68rem;
      font-weight: 750;
    }

    .cloud-inv-dialog__summary {
      padding: 0.65rem 0.75rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--inv-accent, #ff9900) 6%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--inv-accent, #ff9900) 16%, transparent);
    }
    .cloud-inv-dialog__summary h3 {
      margin: 0 0 0.55rem;
      font-size: 0.74rem;
      font-weight: 850;
    }
    .cloud-inv-dialog__summary dl {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .cloud-inv-dialog__summary div {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.75rem;
    }
    .cloud-inv-dialog__summary dt {
      font-size: 0.64rem;
      color: var(--app-text-muted);
      font-weight: 650;
    }
    .cloud-inv-dialog__summary dd {
      margin: 0;
      font-size: 0.74rem;
      font-weight: 850;
    }
    .cloud-inv-dialog__credit dd { color: #047857; }
    .cloud-inv-dialog__summary-total {
      margin-top: 0.35rem;
      padding-top: 0.45rem;
      border-top: 1px dashed color-mix(in srgb, var(--inv-accent, #ff9900) 25%, transparent);
    }
    .cloud-inv-dialog__summary-total dt {
      font-size: 0.72rem;
      font-weight: 800;
      color: var(--app-text);
    }
    .cloud-inv-dialog__summary-total dd {
      font-size: 1.05rem;
      font-weight: 900;
      color: var(--inv-accent-soft, #c2410c);
    }

    .trend-up { color: #b45309; }
    .trend-down { color: #047857; }

    mat-dialog-actions {
      padding-top: 0.65rem !important;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }

    @media (max-width: 900px) {
      .cloud-inv-dialog__head { grid-template-columns: 1fr; }
      .cloud-inv-dialog__total-block { text-align: left; }
      .cloud-inv-dialog__meta-grid { grid-template-columns: repeat(2, 1fr); }
      .cloud-inv-dialog__footer-grid { grid-template-columns: 1fr; }
      .cloud-inv-dialog__panel--notes dl { grid-template-columns: 1fr; }
    }
  `,
})
export class CloudServiceInvoiceDialogComponent {
  readonly data = inject<CloudServiceInvoiceDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)

  readonly fmtUsd = fmtUsd
  readonly downloading = signal(false)

  statusLabel = (): string => {
    const map: Record<NonNullable<CloudBillingRow['invoiceStatus']>, string> = {
      paid: 'Pagada',
      pending: 'Pendiente',
      open: 'Abierta',
    }
    return map[this.data.invoice.invoiceStatus ?? 'open']
  }

  lineCount = (): number => this.data.invoice.lineItems?.length ?? 0

  handleCopyInvoiceId = (): void => {
    const id = this.data.invoice.invoiceId ?? ''
    if (!id) return
    navigator.clipboard.writeText(id).then(() => {
      this.toast.success(`Nº factura ${id} copiado`)
    })
  }

  handleDownloadPdf = (): void => {
    if (this.downloading()) return
    this.downloading.set(true)
    try {
      downloadCloudInvoicePdf(this.data.invoice, this.data.provider)
      this.toast.success(`Factura ${this.data.invoice.invoiceId} descargada`)
    } catch {
      this.toast.error('No se pudo generar el PDF de la factura')
    } finally {
      this.downloading.set(false)
    }
  }
}
