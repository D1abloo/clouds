import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatTooltipModule } from '@angular/material/tooltip'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { CloudAccount, CloudProvider } from '../../core/models/api.models'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'

@Component({
  selector: 'app-cloud-accounts-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>{{ title }}</h1>
        <p>Manage {{ providerLabel }} cloud account connections</p>
      </header>

      <div class="table-card">
        <div class="table-toolbar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search accounts</mat-label>
            <input matInput [formControl]="searchControl" aria-label="Filter accounts" />
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
          <button mat-flat-button color="primary" type="button" disabled>
            <mat-icon>add</mat-icon>
            Add account
          </button>
        </div>

        @if (loading()) {
          <app-loading-state />
        } @else if (error()) {
          <app-error-state [message]="error()!" (retry)="loadAccounts()" />
        } @else if (filteredAccounts().length === 0) {
          <app-empty-state
            icon="cloud_off"
            title="No {{ providerLabel }} accounts"
            description="Connect your first {{ providerLabel }} account to sync instances and billing."
          />
        } @else {
          <table mat-table [dataSource]="filteredAccounts()" class="accounts-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">{{ row.name }}</td>
            </ng-container>
            <ng-container matColumnDef="accountId">
              <th mat-header-cell *matHeaderCellDef>Account ID</th>
              <td mat-cell *matCellDef="let row" class="mono">{{
                row.accountId ?? '—'
              }}</td>
            </ng-container>
            <ng-container matColumnDef="provider">
              <th mat-header-cell *matHeaderCellDef>Provider</th>
              <td mat-cell *matCellDef="let row">{{ row.provider }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let row">
                <app-status-badge [value]="row.status ?? 'unknown'" />
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let row">
                <button
                  mat-icon-button
                  type="button"
                  matTooltip="Validate connection"
                  aria-label="Validate"
                  (click)="handleValidate(row)"
                >
                  <mat-icon>verified</mat-icon>
                </button>
                <button
                  mat-icon-button
                  type="button"
                  matTooltip="Sync inventory"
                  aria-label="Sync"
                  (click)="handleSync(row)"
                >
                  <mat-icon>sync</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        }
      </div>
    </div>
  `,
  styles: `
    .search-field { min-width: 240px; flex: 1; }
    .accounts-table { width: 100%; }
    table { background: transparent; }
  `,
})
export class CloudAccountsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly service = inject(CloudAccountsService)

  provider: CloudProvider = 'AWS'
  title = 'Cloud Accounts'
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )

  readonly loading = signal(true)
  readonly error = signal<string | null>(null)
  readonly accounts = signal<CloudAccount[]>([])
  readonly displayedColumns = ['name', 'accountId', 'provider', 'status', 'actions']

  get providerLabel(): string {
    return this.provider ?? ''
  }

  readonly filteredAccounts = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.accounts().filter(
      (a) =>
        a.provider === this.provider &&
        (!term ||
          a.name.toLowerCase().includes(term) ||
          (a.accountId ?? '').toLowerCase().includes(term)),
    )
  })

  ngOnInit = (): void => {
    this.provider = this.route.snapshot.data['provider'] as CloudProvider
    this.title = this.route.snapshot.data['title'] as string
    this.loadAccounts()
  }

  loadAccounts = (): void => {
    this.loading.set(true)
    this.error.set(null)
    this.service.list().subscribe({
      next: (data) => {
        this.accounts.set(data)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Failed to load cloud accounts from the API')
        this.loading.set(false)
      },
    })
  }

  handleValidate = (account: CloudAccount): void => {
    this.service.validate(account.id).subscribe({
      next: () => this.toast.success(`Validated ${account.name}`),
      error: () => this.toast.error(`Validation failed for ${account.name}`),
    })
  }

  handleSync = (account: CloudAccount): void => {
    const data: ConfirmDialogData = {
      title: 'Sync inventory',
      message: `Sync instances from ${account.name}?`,
      confirmLabel: 'Sync',
    }
    this.dialog
      .open(ConfirmDialogComponent, { data, width: '400px' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return
        this.service.sync(account.id).subscribe({
          next: () => this.toast.success('Sync started'),
          error: () => this.toast.error('Sync failed'),
        })
      })
  }
}
