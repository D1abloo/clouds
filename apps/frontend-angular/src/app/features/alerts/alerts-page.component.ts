import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { AlertsService } from '../../core/services/alerts.service'
import { AlertItem } from '../../core/models/api.models'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'

@Component({
  selector: 'app-alerts-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Alerts</h1>
        <p>Active alerts and incident tracking</p>
      </header>

      <div class="table-card">
        <div class="table-toolbar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Filter alerts</mat-label>
            <input matInput [formControl]="searchControl" />
          </mat-form-field>
        </div>

        @if (loading()) {
          <app-loading-state />
        } @else if (error()) {
          <app-error-state [message]="error()!" (retry)="load()" />
        } @else if (filtered().length === 0) {
          <app-empty-state
            icon="check_circle"
            title="All clear"
            description="No active alerts at the moment."
          />
        } @else {
          <table mat-table [dataSource]="filtered()">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Title</th>
              <td mat-cell *matCellDef="let row">{{ row.title }}</td>
            </ng-container>
            <ng-container matColumnDef="severity">
              <th mat-header-cell *matHeaderCellDef>Severity</th>
              <td mat-cell *matCellDef="let row">{{ row.severity }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let row">
                <app-status-badge [value]="row.status" />
              </td>
            </ng-container>
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'short' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button
                  mat-stroked-button
                  type="button"
                  (click)="handleResolve(row)"
                >
                  Resolve
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
        }
      </div>
    </div>
  `,
  styles: `
    .search-field { flex: 1; min-width: 200px; }
    table { width: 100%; }
  `,
})
export class AlertsPageComponent implements OnInit {
  private readonly service = inject(AlertsService)
  private readonly toast = inject(ToastService)

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )

  readonly loading = signal(true)
  readonly error = signal<string | null>(null)
  readonly alerts = signal<AlertItem[]>([])
  readonly cols = ['title', 'severity', 'status', 'createdAt', 'actions']

  readonly filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.alerts().filter(
      (a) =>
        !term ||
        a.title.toLowerCase().includes(term) ||
        a.severity.toLowerCase().includes(term),
    )
  })

  ngOnInit = (): void => this.load()

  load = (): void => {
    this.loading.set(true)
    this.service.list().subscribe({
      next: (data) => {
        this.alerts.set(data)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Failed to load alerts')
        this.loading.set(false)
      },
    })
  }

  handleResolve = (alert: AlertItem): void => {
    this.service.resolve(alert.id).subscribe({
      next: () => {
        this.toast.success('Alert resolved')
        this.load()
      },
      error: () => this.toast.error('Could not resolve alert'),
    })
  }
}
