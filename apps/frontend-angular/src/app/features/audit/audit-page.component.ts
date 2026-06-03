import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { DatePipe } from '@angular/common'
import { AuditService } from '../../core/services/audit.service'
import { AuditLog } from '../../core/models/api.models'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-audit-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    DatePipe,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Audit Log</h1>
        <p>Security and compliance activity trail</p>
      </header>

      <div class="table-card">
        <div class="table-toolbar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search actions</mat-label>
            <input matInput [formControl]="searchControl" />
          </mat-form-field>
        </div>

        @if (page.loading()) {
          <app-loading-state />
        } @else if (page.error()) {
          <app-error-state [message]="page.error()!" (retry)="load()" />
        } @else if (filtered().length === 0) {
          <app-empty-state title="No audit entries" />
        } @else {
          <table mat-table [dataSource]="filtered()">
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef>Action</th>
              <td mat-cell *matCellDef="let row">{{ row.action }}</td>
            </ng-container>
            <ng-container matColumnDef="resource">
              <th mat-header-cell *matHeaderCellDef>Resource</th>
              <td mat-cell *matCellDef="let row">{{ row.resource }}</td>
            </ng-container>
            <ng-container matColumnDef="ipAddress">
              <th mat-header-cell *matHeaderCellDef>IP</th>
              <td mat-cell *matCellDef="let row" class="mono">{{
                row.ipAddress ?? '—'
              }}</td>
            </ng-container>
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Time</th>
              <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'medium' }}</td>
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
export class AuditPageComponent implements OnInit {
  private readonly service = inject(AuditService)

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )

  readonly page = createPageLoader(true)
  readonly logs = signal<AuditLog[]>([])
  readonly cols = ['action', 'resource', 'ipAddress', 'createdAt']

  readonly filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.logs().filter(
      (l) =>
        !term ||
        l.action.toLowerCase().includes(term) ||
        l.resource.toLowerCase().includes(term),
    )
  })

  ngOnInit = (): void => this.load()

  load = (): void => {
    this.page.run(this.service.list(), {
      onSuccess: (data) => this.logs.set(data),
      errorMessage: 'Failed to load audit log',
    })
  }
}
