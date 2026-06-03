import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { AlertsService } from '../../core/services/alerts.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { ToastService } from '../../core/services/toast.service'
import { AlertItem } from '../../core/models/api.models'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-alert-rule-dialog',
  standalone: true,
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Create alert rule</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full"><mat-label>Name</mat-label><input matInput [formControl]="name" /></mat-form-field>
      <mat-form-field appearance="outline" class="full"><mat-label>Metric</mat-label>
        <mat-select [formControl]="metric"><mat-option value="cpu">CPU &gt; 90%</mat-option><mat-option value="cost">Cost spike</mat-option><mat-option value="disk">Disk full</mat-option></mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full"><mat-label>Severity</mat-label>
        <mat-select [formControl]="severity"><mat-option value="critical">Critical</mat-option><mat-option value="warning">Warning</mat-option><mat-option value="info">Info</mat-option></mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancel</button>
      <button mat-flat-button color="primary" type="button" [mat-dialog-close]="true">Create</button>
    </mat-dialog-actions>
  `,
  styles: `.full { width: 100%; }`,
})
export class AlertRuleDialogComponent {
  readonly name = new FormControl('High CPU', { nonNullable: true })
  readonly metric = new FormControl('cpu', { nonNullable: true })
  readonly severity = new FormControl('warning', { nonNullable: true })
}

@Component({
  selector: 'app-alerts-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    SummaryCardComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Alerts"
        description="Active incidents, rules and notification routing"
        [actions]="[
          { label: 'Create rule', icon: 'add', primary: true },
          { label: 'Refresh', icon: 'refresh' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      <div class="summary-grid">
        <app-summary-card title="Critical" [value]="counts().critical" icon="error" iconColor="warn" variant="elevated" />
        <app-summary-card title="Warnings" [value]="counts().warning" icon="warning" variant="elevated" />
        <app-summary-card title="Info" [value]="counts().info" icon="info" variant="elevated" />
        <app-summary-card title="Resolved" [value]="counts().resolved" icon="check_circle" variant="elevated" />
        <app-summary-card title="Rules" [value]="4" icon="rule" variant="elevated" />
        <app-summary-card title="Silenced" [value]="0" icon="notifications_off" variant="elevated" />
      </div>

      <div class="table-card">
      <mat-tab-group class="soft-tabs" animationDuration="280ms">
        <mat-tab label="Active">
          <div class="tab-panel">
            <div class="filter-row">
              <mat-form-field appearance="outline"><mat-label>Search</mat-label><input matInput [formControl]="searchControl" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Severity</mat-label>
                <mat-select [formControl]="severityControl">
                  <mat-option value="">All</mat-option>
                  <mat-option value="critical">Critical</mat-option>
                  <mat-option value="warning">Warning</mat-option>
                  <mat-option value="info">Info</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            @if (page.loading()) {
              <app-loading-state />
            } @else if (page.error()) {
              <app-error-state [message]="page.error()!" (retry)="load()" />
            } @else if (filtered().length === 0) {
              <app-empty-state icon="check_circle" title="All clear" description="No active alerts." />
            } @else {
              <div class="data-table-wrap">
              <table mat-table [dataSource]="filtered()" class="premium-table table-row-hover">
                <ng-container matColumnDef="severity">
                  <th mat-header-cell *matHeaderCellDef>Severity</th>
                  <td mat-cell *matCellDef="let row">{{ row.severity }}</td>
                </ng-container>
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Alert</th>
                  <td mat-cell *matCellDef="let row">{{ row.title }}</td>
                </ng-container>
                <ng-container matColumnDef="resource">
                  <th mat-header-cell *matHeaderCellDef>Resource</th>
                  <td mat-cell *matCellDef="let row">{{ row.resource ?? '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status" /></td>
                </ng-container>
                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef>Date</th>
                  <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'short' }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    <button mat-icon-button [matMenuTriggerFor]="alertMenu" aria-label="Actions"><mat-icon>more_vert</mat-icon></button>
                    <mat-menu #alertMenu="matMenu">
                      <button mat-menu-item (click)="handleResolve(row)">Resolve</button>
                      <button mat-menu-item (click)="silence(row)">Silence</button>
                      <button mat-menu-item (click)="viewResource(row)">View resource</button>
                    </mat-menu>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let row; columns: cols" class="table-row-hover"></tr>
              </table>
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="History"><div class="tab-panel"><p>Resolved alerts from the last 30 days (demo).</p></div></mat-tab>
        <mat-tab label="Rules"><div class="tab-panel"><p>CPU &gt; 90%, Cost spike, Disk &gt; 85%, SSH failures</p></div></mat-tab>
        <mat-tab label="Silenced"><div class="tab-panel"><p>0 silenced alerts.</p></div></mat-tab>
        <mat-tab label="Notifications"><div class="tab-panel"><p>Routes: in-app, email, Slack demo, Teams demo</p></div></mat-tab>
      </mat-tab-group>
      </div>
    </div>
  `,
  styles: ``,
})
export class AlertsPageComponent implements OnInit {
  private readonly service = inject(AlertsService)
  private readonly toast = inject(ToastService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly severityControl = new FormControl('', { nonNullable: true })
  readonly page = createPageLoader(true)
  readonly alerts = signal<AlertItem[]>([])
  readonly cols = ['severity', 'title', 'resource', 'status', 'createdAt', 'actions']

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )
  private readonly severityFilter = toSignal(this.severityControl.valueChanges.pipe(startWith('')), {
    initialValue: '',
  })

  filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const sev = this.severityFilter()
    return this.alerts().filter((a) => {
      const matchTerm = !term || a.title.toLowerCase().includes(term)
      const matchSev = !sev || a.severity.toLowerCase() === sev
      return matchTerm && matchSev
    })
  })

  counts = computed(() => {
    const list = this.alerts()
    return {
      critical: list.filter((a) => a.severity.toLowerCase() === 'critical').length,
      warning: list.filter((a) => a.severity.toLowerCase() === 'warning').length,
      info: list.filter((a) => a.severity.toLowerCase() === 'info').length,
      resolved: 12,
    }
  })

  ngOnInit(): void {
    this.load()
  }

  load = (): void => {
    this.page.run(this.service.list(), {
      onSuccess: (data) => this.alerts.set(data),
      errorMessage: 'Failed to load alerts',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Create rule') {
      this.dialog.open(AlertRuleDialogComponent, { width: '400px' }).afterClosed().subscribe((ok) => {
        if (ok) this.demoActions.simulate('Create alert rule', 600, 'Rule created').subscribe()
      })
      return
    }
    this.load()
  }

  handleResolve = (alert: AlertItem): void => {
    this.service.resolve(alert.id).subscribe({
      next: () => {
        this.toast.success('Alert resolved')
        this.load()
      },
      error: () => this.demoActions.simulate('Resolve alert', 400).subscribe(() => this.load()),
    })
  }

  silence = (alert: AlertItem): void => {
    this.demoActions.simulate(`Silence ${alert.title}`, 500, 'Alert silenced for 1h').subscribe()
  }

  viewResource = (alert: AlertItem): void => {
    this.demoActions.simulate(`Open resource ${alert.resource ?? 'unknown'}`, 300).subscribe()
  }
}
