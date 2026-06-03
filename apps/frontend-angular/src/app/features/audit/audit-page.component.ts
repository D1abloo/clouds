import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog } from '@angular/material/dialog'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { DetailDialogComponent } from '../../shared/components/detail-dialog/detail-dialog.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { AuditService } from '../../core/services/audit.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { AuditLog } from '../../core/models/api.models'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-audit-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    SummaryCardComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Audit Log"
        description="Security and compliance activity trail"
        [actions]="[
          { label: 'Export CSV', icon: 'download', primary: true },
          { label: 'Refresh', icon: 'refresh' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      <div class="summary-grid page-section">
        <app-summary-card title="Events today" [value]="filtered().length" icon="history" variant="elevated" />
        <app-summary-card title="Actions" [value]="actionOptions().length" icon="bolt" variant="elevated" />
        <app-summary-card title="Users" [value]="3" icon="group" variant="elevated" />
        <app-summary-card title="Resources" [value]="12" icon="category" variant="elevated" />
      </div>

      <div class="table-card">
        <div class="filter-row table-toolbar">
          <mat-form-field appearance="outline"><mat-label>Search</mat-label><input matInput [formControl]="searchControl" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Action</mat-label>
            <mat-select [formControl]="actionControl">
              <mat-option value="">All</mat-option>
              @for (a of actionOptions(); track a) {
                <mat-option [value]="a">{{ a }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        @if (page.loading()) {
          <app-loading-state />
        } @else if (page.error()) {
          <app-error-state [message]="page.error()!" (retry)="load()" />
        } @else if (filtered().length === 0) {
          <app-empty-state title="No audit entries" />
        } @else {
          <div class="data-table-wrap">
          <table mat-table [dataSource]="filtered()" class="premium-table table-row-hover">
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef>Action</th>
              <td mat-cell *matCellDef="let row">
                <button mat-button type="button" class="link-btn" (click)="showDetail(row)">{{ row.action }}</button>
              </td>
            </ng-container>
            <ng-container matColumnDef="resource">
              <th mat-header-cell *matHeaderCellDef>Resource</th>
              <td mat-cell *matCellDef="let row">{{ row.resource }}</td>
            </ng-container>
            <ng-container matColumnDef="ipAddress">
              <th mat-header-cell *matHeaderCellDef>IP</th>
              <td mat-cell *matCellDef="let row" class="mono">{{ row.ipAddress ?? '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Time</th>
              <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'medium' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols" class="table-row-hover"></tr>
          </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .link-btn { padding: 0; min-width: 0; text-transform: none; }
  `,
})
export class AuditPageComponent implements OnInit {
  private readonly service = inject(AuditService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly actionControl = new FormControl('', { nonNullable: true })
  readonly page = createPageLoader(true)
  readonly logs = signal<AuditLog[]>([])
  readonly cols = ['action', 'resource', 'ipAddress', 'createdAt']

  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')), { initialValue: '' })
  private readonly actionFilter = toSignal(this.actionControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  actionOptions = computed(() => [...new Set(this.logs().map((l) => l.action))])

  filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const action = this.actionFilter()
    return this.logs().filter((l) => {
      const matchTerm = !term || l.action.toLowerCase().includes(term) || l.resource.toLowerCase().includes(term)
      const matchAction = !action || l.action === action
      return matchTerm && matchAction
    })
  })

  ngOnInit(): void {
    this.load()
  }

  load = (): void => {
    this.page.run(this.service.list(), {
      onSuccess: (data) => this.logs.set(data),
      errorMessage: 'Failed to load audit log',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Export CSV') {
      this.demoActions.simulate('Audit CSV export', 600, 'audit-export-demo.csv downloaded').subscribe()
      return
    }
    this.load()
  }

  showDetail = (row: AuditLog): void => {
    this.dialog.open(DetailDialogComponent, {
      width: '440px',
      data: {
        title: 'Audit event',
        rows: [
          { label: 'Action', value: row.action },
          { label: 'Resource', value: row.resource },
          { label: 'User', value: row.userId ?? 'system' },
          { label: 'IP', value: row.ipAddress ?? '—' },
          { label: 'Time', value: row.createdAt },
        ],
      },
    })
  }
}
