import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { JenkinsService } from '../../core/services/jenkins.service'
import { JenkinsServer } from '../../core/models/api.models'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'

@Component({
  selector: 'app-jenkins-page',
  standalone: true,
  imports: [
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
        <h1>Jenkins</h1>
        <p>CI/CD servers and job management</p>
      </header>

      <div class="table-card">
        <div class="table-toolbar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search servers</mat-label>
            <input matInput [formControl]="searchControl" />
          </mat-form-field>
        </div>

        @if (loading()) {
          <app-loading-state />
        } @else if (error()) {
          <app-error-state [message]="error()!" (retry)="load()" />
        } @else if (filtered().length === 0) {
          <app-empty-state
            title="No Jenkins servers"
            description="Register a Jenkins server to trigger builds and view logs."
          />
        } @else {
          <table mat-table [dataSource]="filtered()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">{{ row.name }}</td>
            </ng-container>
            <ng-container matColumnDef="url">
              <th mat-header-cell *matHeaderCellDef>URL</th>
              <td mat-cell *matCellDef="let row" class="mono">{{ row.url }}</td>
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
export class JenkinsPageComponent implements OnInit {
  private readonly service = inject(JenkinsService)
  private readonly toast = inject(ToastService)

  readonly searchControl = new FormControl('', { nonNullable: true })
  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )

  readonly loading = signal(true)
  readonly error = signal<string | null>(null)
  readonly servers = signal<JenkinsServer[]>([])
  readonly cols = ['name', 'url', 'status', 'actions']

  readonly filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.servers().filter(
      (s) =>
        !term ||
        s.name.toLowerCase().includes(term) ||
        s.url.toLowerCase().includes(term),
    )
  })

  ngOnInit = (): void => this.load()

  load = (): void => {
    this.loading.set(true)
    this.service.listServers().subscribe({
      next: (data) => {
        this.servers.set(data)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Failed to load Jenkins servers')
        this.loading.set(false)
      },
    })
  }

  handleValidate = (server: JenkinsServer): void => {
    this.service.validate(server.id).subscribe({
      next: () => this.toast.success(`Validated ${server.name}`),
      error: () => this.toast.error('Validation failed'),
    })
  }
}
