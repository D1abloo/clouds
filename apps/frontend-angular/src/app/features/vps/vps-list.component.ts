import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { VpsService } from '../../core/services/vps.service'
import { VpsHost } from '../../core/models/api.models'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'

@Component({
  selector: 'app-vps-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
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
        <h1>VPS Hosts</h1>
        <p>Manage SSH-accessible virtual private servers</p>
      </header>

      <div class="table-card">
        <div class="table-toolbar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search hosts</mat-label>
            <input matInput [formControl]="searchControl" />
          </mat-form-field>
        </div>

        @if (loading()) {
          <app-loading-state />
        } @else if (error()) {
          <app-error-state [message]="error()!" (retry)="load()" />
        } @else if (filtered().length === 0) {
          <app-empty-state
            title="No VPS hosts"
            description="Add a VPS host to enable terminal access and discovery."
          />
        } @else {
          <table mat-table [dataSource]="filtered()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">{{ row.name }}</td>
            </ng-container>
            <ng-container matColumnDef="host">
              <th mat-header-cell *matHeaderCellDef>Host</th>
              <td mat-cell *matCellDef="let row" class="mono">{{ row.host }}</td>
            </ng-container>
            <ng-container matColumnDef="port">
              <th mat-header-cell *matHeaderCellDef>Port</th>
              <td mat-cell *matCellDef="let row">{{ row.port ?? 22 }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let row">
                <app-status-badge [value]="row.status" />
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let row">
                <a mat-icon-button [routerLink]="['/terminal', row.id]" aria-label="Open terminal">
                  <mat-icon>terminal</mat-icon>
                </a>
                <button
                  mat-icon-button
                  type="button"
                  aria-label="Validate"
                  (click)="handleValidate(row)"
                >
                  <mat-icon>verified</mat-icon>
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
export class VpsListComponent implements OnInit {
  private readonly service = inject(VpsService)
  private readonly toast = inject(ToastService)

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )

  readonly loading = signal(true)
  readonly error = signal<string | null>(null)
  readonly hosts = signal<VpsHost[]>([])
  readonly cols = ['name', 'host', 'port', 'status', 'actions']

  readonly filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.hosts().filter(
      (h) =>
        !term ||
        h.name.toLowerCase().includes(term) ||
        h.host.toLowerCase().includes(term),
    )
  })

  ngOnInit = (): void => this.load()

  load = (): void => {
    this.loading.set(true)
    this.service.list().subscribe({
      next: (data) => {
        this.hosts.set(data)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Failed to load VPS hosts')
        this.loading.set(false)
      },
    })
  }

  handleValidate = (host: VpsHost): void => {
    this.service.validate(host.id).subscribe({
      next: () => this.toast.success(`Validated ${host.name}`),
      error: () => this.toast.error('Validation failed'),
    })
  }
}
