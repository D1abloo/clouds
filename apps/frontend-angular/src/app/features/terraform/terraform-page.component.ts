import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatSelectModule } from '@angular/material/select'
import { MatDialog } from '@angular/material/dialog'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { RealtimeStatusBadgeComponent } from '../../shared/components/realtime-status-badge/realtime-status-badge.component'
import { TerraformService } from '../../core/services/terraform.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { ToastService } from '../../core/services/toast.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { invNum } from '../../core/utils/inventory.util'
import { LaunchInstanceModalComponent } from './components/launch-instance-modal.component'
import { RunDetailDrawerComponent } from './components/run-detail-drawer.component'
import { TerraformLogsViewerComponent } from './components/terraform-logs-viewer.component'

type RunRow = Record<string, unknown>

@Component({
  selector: 'app-terraform-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    SummaryCardComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    RealtimeStatusBadgeComponent,
    RunDetailDrawerComponent,
    TerraformLogsViewerComponent,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
  ],
  template: `
    <div class="page-container terraform-page animate-fade-in">
      <header class="tf-header surface-elevated">
        <div class="tf-header__main">
          <div class="tf-header__title">
            <mat-icon class="tf-header__icon">architecture</mat-icon>
            <div>
              <h1>Terraform</h1>
              <p>Infrastructure as code — workspaces, plans, applies and reusable templates</p>
            </div>
          </div>
          <div class="tf-header__meta">
            <app-realtime-status-badge mode="demo" label="Demo / sandbox" icon="science" />
            <span class="last-sync"><mat-icon>schedule</mat-icon> Last sync: {{ lastSync() }}</span>
          </div>
        </div>
        <div class="tf-header__actions">
          <button mat-stroked-button type="button" (click)="load()"><mat-icon>refresh</mat-icon> Refresh</button>
          <button mat-stroked-button type="button" (click)="handleHeader('New plan')"><mat-icon>description</mat-icon> New plan</button>
          <button mat-flat-button color="primary" type="button" (click)="openLaunch()"><mat-icon>rocket_launch</mat-icon> Launch instance</button>
        </div>
      </header>

      @if (page.loading()) {
        <app-loading-state message="Loading Terraform workspaces and runs…" />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="summary-grid app-section-panel stagger-children premium-grid">
          <app-summary-card title="Workspaces" [value]="n('workspaces')" icon="folder" variant="elevated" trend="Active" />
          <app-summary-card title="Runs" [value]="n('runs')" icon="play_circle" variant="elevated" />
          <app-summary-card title="Plans" [value]="n('plans')" icon="description" variant="elevated" trend="Pending review" />
          <app-summary-card title="Applies" [value]="n('applies')" icon="check_circle" variant="elevated" iconColor="primary" />
          <app-summary-card title="Errors" [value]="n('errors')" icon="error" variant="elevated" iconColor="warn" />
          <app-summary-card title="Templates" [value]="templates().length" icon="code" variant="elevated" />
        </div>

        <div class="surface-elevated tf-panel">
          <mat-tab-group class="soft-tabs" animationDuration="280ms" (selectedIndexChange)="activeTab.set($event)">
            <mat-tab>
              <ng-template mat-tab-label><mat-icon>play_circle</mat-icon> Runs</ng-template>
              <div class="tab-panel">
                <div class="table-toolbar">
                  <mat-form-field appearance="outline" class="search-field">
                    <mat-label>Search runs</mat-label>
                    <mat-icon matPrefix>search</mat-icon>
                    <input matInput [formControl]="searchControl" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Status</mat-label>
                    <mat-select [formControl]="statusFilter">
                      <mat-option value="">All</mat-option>
                      <mat-option value="PLANNED">Planned</mat-option>
                      <mat-option value="APPLIED">Applied</mat-option>
                      <mat-option value="FAILED">Failed</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
                @if (filteredRuns().length === 0) {
                  <app-empty-state icon="architecture" title="No runs yet" description="Launch an instance or create a plan to get started." actionLabel="Launch instance" (actionClick)="openLaunch()" />
                } @else {
                  <div class="data-table-wrap">
                    <table mat-table [dataSource]="filteredRuns()" class="premium-table">
                      <ng-container matColumnDef="workspace">
                        <th mat-header-cell *matHeaderCellDef>Workspace</th>
                        <td mat-cell *matCellDef="let row"><strong>{{ row.workspaceName }}</strong></td>
                      </ng-container>
                      <ng-container matColumnDef="provider">
                        <th mat-header-cell *matHeaderCellDef>Provider</th>
                        <td mat-cell *matCellDef="let row"><span class="provider-pill">{{ row.provider }}</span></td>
                      </ng-container>
                      <ng-container matColumnDef="status">
                        <th mat-header-cell *matHeaderCellDef>Status</th>
                        <td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status" /></td>
                      </ng-container>
                      <ng-container matColumnDef="created">
                        <th mat-header-cell *matHeaderCellDef>Created</th>
                        <td mat-cell *matCellDef="let row">{{ formatDate(row.createdAt) }}</td>
                      </ng-container>
                      <ng-container matColumnDef="actions">
                        <th mat-header-cell *matHeaderCellDef></th>
                        <td mat-cell *matCellDef="let row">
                          <button mat-icon-button [matMenuTriggerFor]="runMenu" aria-label="Actions"><mat-icon>more_vert</mat-icon></button>
                          <mat-menu #runMenu="matMenu">
                            <button mat-menu-item (click)="openRunDetail(row)"><mat-icon>visibility</mat-icon> View detail</button>
                            <button mat-menu-item (click)="viewRunLogs(row)"><mat-icon>terminal</mat-icon> Logs</button>
                            <button mat-menu-item (click)="handleHeader('New plan')"><mat-icon>replay</mat-icon> Re-plan</button>
                          </mat-menu>
                        </td>
                      </ng-container>
                      <tr mat-header-row *matHeaderRowDef="runCols"></tr>
                      <tr mat-row *matRowDef="let row; columns: runCols" class="table-row-hover" (click)="openRunDetail(row)"></tr>
                    </table>
                  </div>
                }
              </div>
            </mat-tab>

            <mat-tab>
              <ng-template mat-tab-label><mat-icon>folder</mat-icon> Workspaces</ng-template>
              <div class="tab-panel"><p class="tab-desc">{{ n('workspaces') }} isolated workspaces for state and variables.</p></div>
            </mat-tab>

            <mat-tab>
              <ng-template mat-tab-label><mat-icon>code</mat-icon> Templates</ng-template>
              <div class="tab-panel">
                <table mat-table [dataSource]="templates()" class="premium-table">
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let row">{{ row.name }}</td></ng-container>
                  <ng-container matColumnDef="provider"><th mat-header-cell *matHeaderCellDef>Provider</th><td mat-cell *matCellDef="let row"><span class="provider-pill">{{ row.provider }}</span></td></ng-container>
                  <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let row"><button mat-stroked-button type="button" (click)="openLaunch()">Use template</button></td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="tplCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: tplCols" class="table-row-hover"></tr>
                </table>
              </div>
            </mat-tab>

            <mat-tab>
              <ng-template mat-tab-label><mat-icon>description</mat-icon> Plans</ng-template>
              <div class="tab-panel"><p class="tab-desc">{{ n('plans') }} plans awaiting review or apply.</p></div>
            </mat-tab>

            <mat-tab>
              <ng-template mat-tab-label><mat-icon>check_circle</mat-icon> Applies</ng-template>
              <div class="tab-panel"><p class="tab-desc">{{ n('applies') }} successful applies in this workspace.</p></div>
            </mat-tab>

            <mat-tab>
              <ng-template mat-tab-label><mat-icon>terminal</mat-icon> Logs</ng-template>
              <div class="tab-panel"><app-terraform-logs-viewer [logs]="globalLogs()" /></div>
            </mat-tab>

            <mat-tab>
              <ng-template mat-tab-label><mat-icon>storage</mat-icon> State</ng-template>
              <div class="tab-panel"><pre class="mono state-box">{{ statePreview() }}</pre></div>
            </mat-tab>
          </mat-tab-group>
        </div>
      }

      <app-run-detail-drawer
        [open]="drawerOpen()"
        [run]="selectedRun()"
        [planOutput]="drawerPlan()"
        [logs]="drawerLogs()"
        (close)="closeDrawer()"
      />
    </div>
  `,
  styles: `
    .terraform-page { animation: fadeIn 0.4s ease; }
    .tf-header {
      padding: 1.5rem;
      border-radius: var(--app-radius-lg);
      margin-bottom: 1.5rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
    }
    .tf-header__main { flex: 1; }
    .tf-header__title {
      display: flex; gap: 1rem; align-items: flex-start;
      h1 { margin: 0; font-size: 1.75rem; font-weight: 700; }
      p { margin: 0.25rem 0 0; color: var(--app-text-muted); font-size: 0.9rem; }
    }
    .tf-header__icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; color: var(--app-accent); opacity: 0.9; }
    .tf-header__meta { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-top: 0.75rem; }
    .last-sync { display: flex; align-items: center; gap: 0.25rem; font-size: 0.78rem; color: var(--app-text-muted); mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    .tf-header__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; button { display: inline-flex; align-items: center; gap: 0.35rem; } }
    .premium-grid { margin-bottom: 1.5rem; }
    .tf-panel { border-radius: var(--app-radius-lg); overflow: hidden; padding: 0.25rem; }
    .tab-desc { color: var(--app-text-muted); margin: 0; }
    .search-field { min-width: 240px; }
    .provider-pill {
      font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.55rem;
      border-radius: 999px; background: var(--app-surface);
    }
    .state-box {
      background: #0d1117; color: #c9d1d9; padding: 1.25rem;
      border-radius: var(--app-radius-md); font-size: 0.75rem; max-height: 360px; overflow: auto;
    }
  `,
})
export class TerraformPageComponent implements OnInit {
  private readonly terraform = inject(TerraformService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)
  private readonly toast = inject(ToastService)

  readonly page = createPageLoader(true)
  readonly data = signal<Record<string, unknown> | null>(null)
  readonly activeTab = signal(0)
  readonly drawerOpen = signal(false)
  readonly selectedRun = signal<RunRow | null>(null)
  readonly drawerPlan = signal('')
  readonly drawerLogs = signal('')
  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly statusFilter = new FormControl('', { nonNullable: true })
  readonly runCols = ['workspace', 'provider', 'status', 'created', 'actions']
  readonly tplCols = ['name', 'provider', 'actions']

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )
  private readonly statusTerm = toSignal(
    this.statusFilter.valueChanges.pipe(startWith('')),
    { initialValue: '' },
  )

  runs = (): RunRow[] => (this.data()?.['items'] as RunRow[]) ?? []
  templates = (): RunRow[] => (this.data()?.['templates'] as RunRow[]) ?? []

  filteredRuns = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const status = this.statusTerm() ?? ''
    return this.runs().filter((r) => {
      const ws = String(r['workspaceName'] ?? '').toLowerCase()
      const matchTerm = !term || ws.includes(term) || String(r['provider']).toLowerCase().includes(term)
      const matchStatus = !status || String(r['status']).includes(status)
      return matchTerm && matchStatus
    })
  })

  lastSync = (): string => {
    const d = this.data()?.['lastSyncedAt']
    if (d) return new Date(String(d)).toLocaleString()
    return new Date().toLocaleString()
  }

  ngOnInit(): void {
    this.load()
  }

  n = (key: string): number => invNum(this.data(), key)

  load = (): void => {
    this.page.run(this.terraform.pageSummary(), {
      onSuccess: (d) => this.data.set(d),
      errorMessage: 'Failed to load Terraform data',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'New plan') {
      this.demoActions.simulate('Terraform plan', 1500, 'Plan ready — 1 resource to add').subscribe(() => this.load())
    }
  }

  openLaunch = (): void => {
    this.dialog
      .open(LaunchInstanceModalComponent, {
        width: '960px',
        maxWidth: '95vw',
        maxHeight: '95vh',
        panelClass: 'launch-modal-panel',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((v) => {
        if (v?.applied) {
          this.toast.success('Instance provisioned — inventory syncing')
          this.load()
        }
      })
  }

  openRunDetail = (row: RunRow): void => {
    this.selectedRun.set(row)
    this.drawerOpen.set(true)
    this.drawerPlan.set('')
    this.drawerLogs.set('')
    const id = String(row['id'] ?? '')
    if (id) {
      this.terraform.logs(id).subscribe({
        next: (logs) => {
          this.drawerLogs.set(typeof logs === 'string' ? logs : JSON.stringify(logs, null, 2))
        },
      })
    }
  }

  closeDrawer = (): void => {
    this.drawerOpen.set(false)
    this.selectedRun.set(null)
  }

  viewRunLogs = (row: RunRow): void => {
    this.openRunDetail(row)
  }

  formatDate = (v: unknown): string => {
    if (!v) return '—'
    const d = new Date(String(v))
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
  }

  globalLogs = (): string =>
    `Terraform v1.7.0 on linux_amd64\n\nInitializing plugins...\n- Finding hashicorp/aws versions matching "~> 5.0"...\n- Installing hashicorp/aws v5.31.0...\n\nPlan: 1 to add, 0 to change, 0 to destroy.\n\nApply complete! Resources: 1 added.`

  statePreview = (): string =>
    `{\n  "version": 4,\n  "terraform_version": "1.7.0",\n  "resources": [\n    { "type": "aws_instance", "name": "web", "instances": [{ "attributes": { "id": "i-demo" } }] }\n  ]\n}`
}
