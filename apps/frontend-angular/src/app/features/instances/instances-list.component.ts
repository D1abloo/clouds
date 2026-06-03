import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { InstancesService } from '../../core/services/instances.service'
import { Instance } from '../../core/models/api.models'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-instances-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
        <h1>Instances</h1>
        <p>Cloud compute instances across all providers</p>
      </header>

      <div class="table-card">
        <div class="table-toolbar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search</mat-label>
            <input matInput [formControl]="searchControl" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Provider</mat-label>
            <mat-select [formControl]="providerControl">
              <mat-option value="">All</mat-option>
              <mat-option value="AWS">AWS</mat-option>
              <mat-option value="GCP">GCP</mat-option>
              <mat-option value="AZURE">Azure</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        @if (page.loading()) {
          <app-loading-state />
        } @else if (page.error()) {
          <app-error-state [message]="page.error()!" (retry)="load()" />
        } @else if (filtered().length === 0) {
          <app-empty-state
            title="No instances found"
            description="Sync a cloud account to discover instances."
          />
        } @else {
          <table mat-table [dataSource]="filtered()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">
                <a [routerLink]="['/instances', row.id]">{{ row.name }}</a>
              </td>
            </ng-container>
            <ng-container matColumnDef="provider">
              <th mat-header-cell *matHeaderCellDef>Provider</th>
              <td mat-cell *matCellDef="let row">{{ row.provider }}</td>
            </ng-container>
            <ng-container matColumnDef="region">
              <th mat-header-cell *matHeaderCellDef>Region</th>
              <td mat-cell *matCellDef="let row">{{ row.region ?? '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let row">
                <app-status-badge [value]="row.status" />
              </td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let row">{{ row.instanceType ?? '—' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
        }
      </div>
    </div>
  `,
  styles: `
    .search-field { min-width: 200px; flex: 1; }
    table { width: 100%; }
    a { color: inherit; font-weight: 500; }
  `,
})
export class InstancesListComponent implements OnInit {
  private readonly service = inject(InstancesService)

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly providerControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )
  private readonly providerFilter = toSignal(
    this.providerControl.valueChanges.pipe(startWith('')),
    { initialValue: '' },
  )

  readonly page = createPageLoader(true)
  readonly instances = signal<Instance[]>([])
  readonly cols = ['name', 'provider', 'region', 'status', 'type']

  readonly filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const provider = this.providerFilter()
    return this.instances().filter((i) => {
      const matchProvider = !provider || i.provider === provider
      const matchTerm =
        !term ||
        i.name.toLowerCase().includes(term) ||
        (i.region ?? '').toLowerCase().includes(term)
      return matchProvider && matchTerm
    })
  })

  ngOnInit = (): void => this.load()

  load = (): void => {
    this.page.run(this.service.list(), {
      onSuccess: (data) => this.instances.set(data),
      errorMessage: 'Failed to load instances',
    })
  }
}
