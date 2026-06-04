import { Component, inject, OnInit, signal, computed, DestroyRef } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
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
import { createPageLoader } from '../../core/utils/page-load.util'
import { CloudAccountFormDialogComponent } from './cloud-account-form-dialog.component'

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
          <button mat-flat-button color="primary" type="button" (click)="openAddAccountWizard()">
            <mat-icon>add</mat-icon>
            Añadir cuenta
          </button>
        </div>

        @if (page.loading()) {
          <app-loading-state />
        } @else if (page.error()) {
          <app-error-state [message]="page.error()!" (retry)="loadAccounts()" />
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
  private readonly destroyRef = inject(DestroyRef)

  provider: CloudProvider = 'AWS'
  title = 'Cloud Accounts'
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )

  readonly page = createPageLoader(true)
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

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.provider = data['provider'] as CloudProvider
      this.title = data['title'] as string
      this.loadAccounts()
    })
  }

  loadAccounts = (): void => {
    this.page.run(this.service.list(), {
      onSuccess: (data) => this.accounts.set(data),
      errorMessage: 'Failed to load cloud accounts from the API',
    })
  }

  handleValidate = (account: CloudAccount): void => {
    this.service.validate(account.id).subscribe({
      next: () => this.toast.success(`Validated ${account.name}`),
      error: () => this.toast.error(`Validation failed for ${account.name}`),
    })
  }

  openAddAccountWizard = (): void => {
    this.dialog
      .open(CloudAccountFormDialogComponent, {
        width: '760px',
        maxWidth: '95vw',
        panelClass: 'cloud-account-wizard-panel',
        data: { suggestedProvider: this.provider },
      })
      .afterClosed()
      .subscribe((res) => {
        if (res?.created) this.loadAccounts()
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
