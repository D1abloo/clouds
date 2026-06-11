import { DecimalPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core'
import { MatTableModule } from '@angular/material/table'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import type { FinopsInvoice } from '../data/mock-billing'

@Component({
  selector: 'app-finops-billing-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatTableModule, MatIconModule, MatButtonModule],
  template: `
    <div class="finops-card finops-table-wrap">
      <table mat-table [dataSource]="rows()" class="finops-table">
        <ng-container matColumnDef="provider">
          <th mat-header-cell *matHeaderCellDef>Proveedor</th>
          <td mat-cell *matCellDef="let r">{{ r.provider }}</td>
        </ng-container>
        <ng-container matColumnDef="account">
          <th mat-header-cell *matHeaderCellDef>Cuenta</th>
          <td mat-cell *matCellDef="let r">{{ r.account }}</td>
        </ng-container>
        <ng-container matColumnDef="period">
          <th mat-header-cell *matHeaderCellDef>Periodo</th>
          <td mat-cell *matCellDef="let r">{{ r.period }}</td>
        </ng-container>
        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef>Importe</th>
          <td mat-cell *matCellDef="let r">{{ r.amount | number:'1.2-2' }} {{ r.currency }}</td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let r">
            <span class="finops-badge" [class]="statusClass(r.status)">{{ statusLabel(r.status) }}</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let r">
            <button mat-icon-button type="button" [attr.aria-label]="'Exportar ' + r.id"><mat-icon>download</mat-icon></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols"></tr>
      </table>
    </div>
  `,
  styles: `
  .finops-table-wrap { overflow-x: auto; padding: 0; }
  .finops-table { width: 100%; background: transparent; }
  th { color: var(--finops-muted) !important; font-size: 0.72rem !important; }
  td { color: var(--finops-text) !important; font-size: 0.82rem !important; }
  `,
})
export class FinopsBillingTableComponent {
  readonly invoices = input.required<FinopsInvoice[]>()
  readonly providerFilter = input<string>('all')

  readonly cols = ['provider', 'account', 'period', 'amount', 'status', 'actions']

  readonly rows = computed(() => {
    const f = this.providerFilter()
    const list = this.invoices()
    return f === 'all' ? list : list.filter((i) => i.provider === f)
  })

  statusLabel = (s: FinopsInvoice['status']): string =>
    ({ paid: 'Pagada', pending: 'Pendiente', overdue: 'Vencida' })[s]

  statusClass = (s: FinopsInvoice['status']): string =>
    ({ paid: 'finops-badge--savings', pending: 'finops-badge--warn', overdue: 'finops-badge--over' })[s]
}
