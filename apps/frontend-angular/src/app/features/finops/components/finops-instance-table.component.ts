import { DecimalPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core'
import { MatTableModule } from '@angular/material/table'
import { MatIconModule } from '@angular/material/icon'
import type { FinopsInstance } from '../data/mock-instances'

@Component({
  selector: 'app-finops-instance-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatTableModule, MatIconModule],
  template: `
    <div class="finops-card finops-table-wrap">
      <table mat-table [dataSource]="rows()" class="finops-table">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Instancia</th>
          <td mat-cell *matCellDef="let r"><strong>{{ r.name }}</strong><br /><small>{{ r.id }}</small></td>
        </ng-container>
        <ng-container matColumnDef="provider">
          <th mat-header-cell *matHeaderCellDef>Proveedor</th>
          <td mat-cell *matCellDef="let r">{{ r.provider }} · {{ r.region }}</td>
        </ng-container>
        <ng-container matColumnDef="cost">
          <th mat-header-cell *matHeaderCellDef>Coste/mes</th>
          <td mat-cell *matCellDef="let r">€ {{ r.monthlyCost | number:'1.0-0' }}</td>
        </ng-container>
        <ng-container matColumnDef="util">
          <th mat-header-cell *matHeaderCellDef>Utilización</th>
          <td mat-cell *matCellDef="let r">{{ r.utilization }} %</td>
        </ng-container>
        <ng-container matColumnDef="rec">
          <th mat-header-cell *matHeaderCellDef>Recomendación FinOps</th>
          <td mat-cell *matCellDef="let r">
            <span class="finops-badge" [class]="sevClass(r.severity)">{{ r.recommendation }}</span>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols"></tr>
      </table>
    </div>
  `,
  styles: `
  .finops-table-wrap { overflow-x: auto; padding: 0.5rem; }
  small { color: var(--finops-muted); font-size: 0.68rem; }
  `,
})
export class FinopsInstanceTableComponent {
  readonly instances = input.required<FinopsInstance[]>()
  readonly providerFilter = input<string>('all')
  readonly cols = ['name', 'provider', 'cost', 'util', 'rec']

  readonly rows = computed(() => {
    const f = this.providerFilter()
    const list = this.instances()
    return f === 'all' ? list : list.filter((i) => i.provider === f)
  })

  sevClass = (s: FinopsInstance['severity']): string =>
    ({ high: 'finops-badge--over', medium: 'finops-badge--warn', low: 'finops-badge--savings' })[s]
}
