import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
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
import { DetailDialogComponent } from '../../shared/components/detail-dialog/detail-dialog.component'
import { InventoryService } from '../../core/services/inventory.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { invNum } from '../../core/utils/inventory.util'

type JobRow = Record<string, unknown>

@Component({
  selector: 'app-jenkins-launch-dialog',
  standalone: true,
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Launch job</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Branch</mat-label>
        <input matInput [formControl]="branch" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Environment</mat-label>
        <input matInput [formControl]="env" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancel</button>
      <button mat-flat-button color="primary" type="button" [mat-dialog-close]="{ branch: branch.value, env: env.value }">Launch</button>
    </mat-dialog-actions>
  `,
  styles: `.full { width: 100%; }`,
})
export class JenkinsLaunchDialogComponent {
  readonly branch = new FormControl('main', { nonNullable: true })
  readonly env = new FormControl('staging', { nonNullable: true })
}

@Component({
  selector: 'app-jenkins-page',
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
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Jenkins"
        description="CI/CD servers, jobs, builds and logs"
        [actions]="[
          { label: 'Add Jenkins', icon: 'add', primary: true },
          { label: 'Validate connection', icon: 'verified' },
          { label: 'Refresh jobs', icon: 'refresh' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      @if (page.loading()) {
        <app-loading-state />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="summary-grid">
          <app-summary-card title="Servers" [value]="n('serverCount')" icon="dns" />
          <app-summary-card title="Jobs" [value]="n('jobCount')" icon="work" />
          <app-summary-card title="Running builds" [value]="n('buildsRunning')" icon="hourglass_top" />
          <app-summary-card title="Success" [value]="n('buildsSuccess')" icon="check_circle" iconColor="primary" />
          <app-summary-card title="Failed" [value]="n('buildsFailed')" icon="cancel" iconColor="warn" />
        </div>

        <mat-tab-group>
          <mat-tab label="Jobs">
            <div class="tab-panel">
              <mat-form-field appearance="outline">
                <mat-label>Search jobs</mat-label>
                <input matInput [formControl]="searchControl" />
              </mat-form-field>
              <table mat-table [dataSource]="filteredJobs()" class="full-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Job</th>
                  <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                </ng-container>
                <ng-container matColumnDef="server">
                  <th mat-header-cell *matHeaderCellDef>Server</th>
                  <td mat-cell *matCellDef="let row">{{ row.server }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status" /></td>
                </ng-container>
                <ng-container matColumnDef="lastRun">
                  <th mat-header-cell *matHeaderCellDef>Last run</th>
                  <td mat-cell *matCellDef="let row">{{ row.lastRun }}</td>
                </ng-container>
                <ng-container matColumnDef="duration">
                  <th mat-header-cell *matHeaderCellDef>Duration</th>
                  <td mat-cell *matCellDef="let row">{{ row.duration }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    <button mat-icon-button [matMenuTriggerFor]="jobMenu" aria-label="Actions"><mat-icon>more_vert</mat-icon></button>
                    <mat-menu #jobMenu="matMenu">
                      <button mat-menu-item (click)="launchJob(row)">Launch job</button>
                      <button mat-menu-item (click)="viewBuild(row)">View build</button>
                      <button mat-menu-item (click)="viewLogs(row)">View logs</button>
                      <button mat-menu-item (click)="retryBuild(row)">Retry build</button>
                    </mat-menu>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="jobCols"></tr>
                <tr mat-row *matRowDef="let row; columns: jobCols"></tr>
              </table>
            </div>
          </mat-tab>
          <mat-tab label="Builds">
            <div class="tab-panel">
              @for (b of builds(); track $index) {
                <p class="build-line">
                  <app-status-badge [value]="$any(b).status" />
                  {{ $any(b).jobName }} #{{ $any(b).buildNum }} · {{ ($any(b).createdAt) | date: 'short' }}
                </p>
              }
            </div>
          </mat-tab>
          <mat-tab label="Logs"><div class="tab-panel"><pre class="mono log-box">{{ buildLog() }}</pre></div></mat-tab>
          <mat-tab label="Parameters"><div class="tab-panel"><p>branch, environment, deploy_target (demo)</p></div></mat-tab>
          <mat-tab label="History"><div class="tab-panel"><p>{{ builds().length }} builds in history.</p></div></mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: `
    .full-table { width: 100%; }
    .build-line { display: flex; align-items: center; gap: 0.5rem; margin: 0.35rem 0; }
    .log-box { background: var(--app-surface); padding: 1rem; border-radius: 8px; font-size: 0.75rem; max-height: 360px; overflow: auto; }
  `,
})
export class JenkinsPageComponent implements OnInit {
  private readonly inventory = inject(InventoryService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)

  readonly page = createPageLoader(true)
  readonly data = signal<Record<string, unknown> | null>(null)
  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly jobCols = ['name', 'server', 'status', 'lastRun', 'duration', 'actions']

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )

  jobs = computed(() => (this.data()?.['jobItems'] as JobRow[]) ?? [])
  builds = computed(() => (this.data()?.['builds'] as Record<string, unknown>[]) ?? [])

  filteredJobs = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.jobs().filter((j) => !term || String(j['name']).toLowerCase().includes(term))
  })

  ngOnInit(): void {
    this.load()
  }

  n = (key: string): number => invNum(this.data(), key)

  load = (): void => {
    this.page.run(this.inventory.jenkins(), {
      onSuccess: (d) => this.data.set(d),
      errorMessage: 'Failed to load Jenkins inventory',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Add Jenkins') {
      this.demoActions.simulate('Add Jenkins server', 700).subscribe()
      return
    }
    if (label === 'Validate connection') {
      this.demoActions.simulate('Jenkins validation', 900, 'Connection OK (demo)').subscribe()
      return
    }
    this.load()
  }

  launchJob = (row: JobRow): void => {
    this.dialog
      .open(JenkinsLaunchDialogComponent, { width: '400px' })
      .afterClosed()
      .subscribe((params) => {
        if (!params) return
        this.demoActions
          .simulate(`Launch ${row['name']}`, 1200, `Build started — branch ${params.branch}`)
          .subscribe(() => this.load())
      })
  }

  viewBuild = (row: JobRow): void => {
    this.dialog.open(DetailDialogComponent, {
      width: '440px',
      data: {
        title: `Build — ${row['name']}`,
        rows: [
          { label: 'Server', value: String(row['server']) },
          { label: 'Last run', value: String(row['lastRun']) },
          { label: 'Duration', value: String(row['duration']) },
          { label: 'Status', value: String(row['status']) },
        ],
      },
    })
  }

  viewLogs = (row: JobRow): void => {
    this.dialog.open(DetailDialogComponent, {
      width: '560px',
      data: { title: `Logs — ${row['name']}`, rows: [], extra: this.buildLog() },
    })
  }

  retryBuild = (row: JobRow): void => {
    this.demoActions.simulate(`Retry ${row['name']}`, 1000).subscribe(() => this.load())
  }

  buildLog = (): string =>
    `[Pipeline] Start\n[Pipeline] checkout\n[Pipeline] npm ci\n[Pipeline] npm test — 142 tests passed\n[Pipeline] docker build -t app:latest .\n[Pipeline] deploy staging OK\nFinished: SUCCESS`
}
