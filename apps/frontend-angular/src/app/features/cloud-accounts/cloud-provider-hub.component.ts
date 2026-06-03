import { Component, inject, OnInit, signal, computed, DestroyRef } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatDialog } from '@angular/material/dialog'
import { debounceTime, startWith, forkJoin, map } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { DetailDialogComponent } from '../../shared/components/detail-dialog/detail-dialog.component'
import { InventoryService } from '../../core/services/inventory.service'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { InstancesService } from '../../core/services/instances.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { ToastService } from '../../core/services/toast.service'
import { CloudAccountFormDialogComponent } from './cloud-account-form-dialog.component'
import { LaunchInstanceDialogComponent } from './launch-instance-dialog.component'
import { CloudProvider } from '../../core/models/api.models'
import { createPageLoader } from '../../core/utils/page-load.util'
import { invNum } from '../../core/utils/inventory.util'

type ProviderData = Record<string, unknown>
type InstanceRow = Record<string, unknown>

@Component({
  selector: 'app-cloud-provider-hub',
  standalone: true,
  imports: [
    RouterLink,
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
        [title]="title"
        [description]="'Manage ' + providerLabel + ' accounts, instances, billing and Terraform'"
        [actions]="headerActions"
        (actionClick)="handleHeaderAction($event)"
      />

      @if (page.loading()) {
        <app-loading-state />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="summary-grid">
          <app-summary-card [title]="accountLabel" [value]="n('accounts')" icon="account_balance" variant="elevated" />
          <app-summary-card title="Instances" [value]="n('instances')" icon="dns" variant="elevated" />
          <app-summary-card title="Active regions" [value]="n('regions')" icon="public" variant="elevated" />
          <app-summary-card title="Monthly cost" [value]="formatCost(n('monthlyCost'))" icon="payments" variant="elevated" />
          <app-summary-card title="Alerts" [value]="n('alerts')" icon="warning" iconColor="warn" variant="elevated" />
          <app-summary-card title="Sync status" [value]="syncStatus()" icon="sync" [trend]="lastSyncLabel()" variant="elevated" />
        </div>

        <div class="table-card">
        <mat-tab-group class="soft-tabs" animationDuration="280ms" (selectedIndexChange)="tabIndex.set($event)">
          <mat-tab label="Accounts">
            <div class="tab-panel">
              <div class="filter-row table-toolbar">
                <mat-form-field appearance="outline">
                  <mat-label>Search</mat-label>
                  <input matInput [formControl]="searchControl" />
                </mat-form-field>
              </div>
              @if (accounts().length === 0) {
                <app-empty-state icon="cloud_off" title="No accounts" description="Add a demo account to sync inventory." />
              } @else {
                <table mat-table [dataSource]="accounts()" class="premium-table table-row-hover">
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                  </ng-container>
                  <ng-container matColumnDef="accountId">
                    <th mat-header-cell *matHeaderCellDef>ID</th>
                    <td mat-cell *matCellDef="let row" class="mono">{{ row.accountId ?? row.projectId ?? '—' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status ?? 'active'" /></td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let row">
                      <button mat-icon-button [matMenuTriggerFor]="acctMenu" aria-label="Actions"><mat-icon>more_vert</mat-icon></button>
                      <mat-menu #acctMenu="matMenu">
                        <button mat-menu-item (click)="validateAccount(row)">Validate credentials</button>
                        <button mat-menu-item (click)="syncAccount(row)">Sync inventory</button>
                      </mat-menu>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="accountCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: accountCols"></tr>
                </table>
              }
            </div>
          </mat-tab>

          <mat-tab label="Instances">
            <div class="tab-panel">
              <div class="filter-row">
                <mat-form-field appearance="outline">
                  <mat-label>Search</mat-label>
                  <input matInput [formControl]="searchControl" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Region</mat-label>
                  <mat-select [formControl]="regionControl">
                    <mat-option value="">All</mat-option>
                    @for (r of regionOptions(); track r) {
                      <mat-option [value]="r">{{ r }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Status</mat-label>
                  <mat-select [formControl]="statusControl">
                    <mat-option value="">All</mat-option>
                    <mat-option value="RUNNING">Running</mat-option>
                    <mat-option value="STOPPED">Stopped</mat-option>
                    <mat-option value="WARNING">Warning</mat-option>
                    <mat-option value="ERROR">Error</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              @if (filteredInstances().length === 0) {
                <app-empty-state title="No instances" description="Sync inventory or load demo data." />
              } @else {
                <table mat-table [dataSource]="filteredInstances()" class="premium-table table-row-hover">
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let row">
                      <a [routerLink]="['/instances', row.id]">{{ row.name }}</a>
                      @if (row.isDemo) { <span class="chip-demo">DEMO</span> }
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="instanceId">
                    <th mat-header-cell *matHeaderCellDef>ID</th>
                    <td mat-cell *matCellDef="let row" class="mono">{{ row.externalId ?? row.id }}</td>
                  </ng-container>
                  <ng-container matColumnDef="region">
                    <th mat-header-cell *matHeaderCellDef>Region</th>
                    <td mat-cell *matCellDef="let row">{{ row.region }}</td>
                  </ng-container>
                  <ng-container matColumnDef="instanceType">
                    <th mat-header-cell *matHeaderCellDef>Type</th>
                    <td mat-cell *matCellDef="let row">{{ row.instanceType }}</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status" /></td>
                  </ng-container>
                  <ng-container matColumnDef="publicIp">
                    <th mat-header-cell *matHeaderCellDef>Public IP</th>
                    <td mat-cell *matCellDef="let row" class="mono">{{ row.publicIp ?? '—' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="cpu">
                    <th mat-header-cell *matHeaderCellDef>CPU</th>
                    <td mat-cell *matCellDef="let row">{{ row.cpu ?? '—' }}%</td>
                  </ng-container>
                  <ng-container matColumnDef="cost">
                    <th mat-header-cell *matHeaderCellDef>Cost/mo</th>
                    <td mat-cell *matCellDef="let row">{{ formatCost(row.monthlyCost) }}</td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let row">
                      <button mat-icon-button [matMenuTriggerFor]="instMenu" aria-label="Actions"><mat-icon>more_vert</mat-icon></button>
                      <mat-menu #instMenu="matMenu">
                        <button mat-menu-item (click)="instanceAction(row, 'start')">Start</button>
                        <button mat-menu-item (click)="instanceAction(row, 'stop')">Stop</button>
                        <button mat-menu-item (click)="instanceAction(row, 'restart')">Restart</button>
                        <button mat-menu-item (click)="showInstanceDetail(row)">View detail</button>
                        <button mat-menu-item (click)="demoMetric(row)">View metrics</button>
                        <button mat-menu-item (click)="demoTerraform(row)">Launch with Terraform</button>
                      </mat-menu>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="instanceCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: instanceCols"></tr>
                </table>
              }
            </div>
          </mat-tab>

          <mat-tab label="Regions">
            <div class="tab-panel">
              <table mat-table [dataSource]="regions()" class="premium-table table-row-hover">
                <ng-container matColumnDef="code">
                  <th mat-header-cell *matHeaderCellDef>Region</th>
                  <td mat-cell *matCellDef="let row">{{ row.code ?? row.regionCode }}</td>
                </ng-container>
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Name</th>
                  <td mat-cell *matCellDef="let row">{{ row.name ?? row.code }}</td>
                </ng-container>
                <ng-container matColumnDef="enabled">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let row"><app-status-badge value="active" /></td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="regionCols"></tr>
                <tr mat-row *matRowDef="let row; columns: regionCols"></tr>
              </table>
            </div>
          </mat-tab>

          <mat-tab [label]="securityTabLabel">
            <div class="tab-panel">
              <table mat-table [dataSource]="mockSecurity()" class="premium-table table-row-hover">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Name</th>
                  <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                </ng-container>
                <ng-container matColumnDef="rules">
                  <th mat-header-cell *matHeaderCellDef>Rules</th>
                  <td mat-cell *matCellDef="let row">{{ row.rules }}</td>
                </ng-container>
                <ng-container matColumnDef="vpc">
                  <th mat-header-cell *matHeaderCellDef>VPC / VNet</th>
                  <td mat-cell *matCellDef="let row">{{ row.vpc }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="sgCols"></tr>
                <tr mat-row *matRowDef="let row; columns: sgCols"></tr>
              </table>
            </div>
          </mat-tab>

          <mat-tab label="Volumes">
            <div class="tab-panel">
              <table mat-table [dataSource]="mockVolumes()" class="premium-table table-row-hover">
                <ng-container matColumnDef="id">
                  <th mat-header-cell *matHeaderCellDef>Volume ID</th>
                  <td mat-cell *matCellDef="let row" class="mono">{{ row.id }}</td>
                </ng-container>
                <ng-container matColumnDef="size">
                  <th mat-header-cell *matHeaderCellDef>Size</th>
                  <td mat-cell *matCellDef="let row">{{ row.size }}</td>
                </ng-container>
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let row">{{ row.type }}</td>
                </ng-container>
                <ng-container matColumnDef="attached">
                  <th mat-header-cell *matHeaderCellDef>Attached to</th>
                  <td mat-cell *matCellDef="let row">{{ row.attached }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="volCols"></tr>
                <tr mat-row *matRowDef="let row; columns: volCols"></tr>
              </table>
            </div>
          </mat-tab>

          <mat-tab label="Billing">
            <div class="tab-panel">
              <p>Estimated monthly: <strong>{{ formatCost(n('monthlyCost')) }}</strong></p>
              <button mat-stroked-button type="button" (click)="syncBilling()">Sync billing</button>
            </div>
          </mat-tab>

          <mat-tab label="Terraform">
            <div class="tab-panel">
              <p>Launch instances via Terraform workspaces (demo).</p>
              <button mat-flat-button color="primary" type="button" (click)="demoTerraform()">Launch instance</button>
            </div>
          </mat-tab>

          <mat-tab label="Audit">
            <div class="tab-panel">
              <p>Provider-scoped audit events appear in the global <a routerLink="/audit">Audit log</a>.</p>
              <button mat-stroked-button type="button" (click)="demoActions.simulate('Audit export', 500).subscribe()">Export CSV</button>
            </div>
          </mat-tab>
        </mat-tab-group>
        </div>
      }
    </div>
  `,
  styles: `
    a { color: inherit; font-weight: 500; }
  `,
})
export class CloudProviderHubComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly inventory = inject(InventoryService)
  private readonly accountsService = inject(CloudAccountsService)
  private readonly instancesService = inject(InstancesService)
  readonly demoActions = inject(DemoActionsService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)
  private readonly destroyRef = inject(DestroyRef)
  private readonly realtime = inject(RealtimeService)

  readonly page = createPageLoader(true)
  readonly cloudAccounts = signal<Record<string, unknown>[]>([])
  readonly summary = signal<ProviderData | null>(null)
  readonly tabIndex = signal(0)
  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly regionControl = new FormControl('', { nonNullable: true })
  readonly statusControl = new FormControl('', { nonNullable: true })

  provider: CloudProvider = 'AWS'
  title = 'AWS'
  providerLabel = 'AWS'
  accountLabel = 'AWS accounts'
  securityTabLabel = 'Security Groups'

  readonly accountCols = ['name', 'accountId', 'status', 'actions']
  readonly instanceCols = ['name', 'instanceId', 'region', 'instanceType', 'status', 'publicIp', 'cpu', 'cost', 'actions']
  readonly regionCols = ['code', 'name', 'enabled']
  readonly sgCols = ['name', 'rules', 'vpc']
  readonly volCols = ['id', 'size', 'type', 'attached']

  readonly headerActions = [
    { label: 'Add account', icon: 'add', primary: true },
    { label: 'Launch instance', icon: 'rocket_launch' },
    { label: 'Sync inventory', icon: 'sync' },
    { label: 'List regions', icon: 'public' },
  ]

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )
  private readonly regionFilter = toSignal(this.regionControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly statusFilter = toSignal(this.statusControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  accounts = computed(() => {
    const api = this.cloudAccounts()
    if (api.length > 0) return api
    return (this.summary()?.['accountList'] as Record<string, unknown>[]) ?? []
  })
  instances = computed(() => (this.summary()?.['instanceList'] as InstanceRow[]) ?? [])
  regions = computed(() => (this.summary()?.['regionList'] as Record<string, unknown>[]) ?? [])

  regionOptions = computed(() => [...new Set(this.instances().map((i) => String(i['region'] ?? '')).filter(Boolean))])

  filteredInstances = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const region = this.regionFilter()
    const status = this.statusFilter()
    return this.instances().filter((i) => {
      const name = String(i['name'] ?? '').toLowerCase()
      const matchTerm = !term || name.includes(term)
      const matchRegion = !region || i['region'] === region
      const matchStatus = !status || i['status'] === status
      return matchTerm && matchRegion && matchStatus
    })
  })

  ngOnInit(): void {
    this.realtime.connect()
    this.realtime.on('inventory.updated', () => this.load())
    this.realtime.on('sync.progress', (p) => {
      const payload = p as { status?: string; instances?: number }
      if (payload.status === 'completed') this.toast.success(`Sync done — ${payload.instances ?? 0} instances`)
    })
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.provider = (data['provider'] as CloudProvider) ?? 'AWS'
      this.title = (data['title'] as string) ?? this.provider
      this.providerLabel = this.provider === 'AZURE' ? 'Azure' : this.provider
      this.accountLabel =
        this.provider === 'GCP' ? 'GCP projects' : this.provider === 'AZURE' ? 'Subscriptions' : 'AWS accounts'
      this.securityTabLabel =
        this.provider === 'GCP' ? 'Firewalls' : this.provider === 'AZURE' ? 'NSG' : 'Security Groups'
      this.load()
      this.loadAccounts()
    })
  }

  loadAccounts = (): void => {
    this.accountsService.list(undefined, this.provider).subscribe({
      next: (rows) =>
        this.cloudAccounts.set(
          rows.map((a) => ({
            id: a.id,
            name: a.name,
            accountId: a.accountId,
            status: (a as { syncStatus?: string }).syncStatus ?? 'active',
            hasCredentials: (a as { hasCredentials?: boolean }).hasCredentials,
          })),
        ),
      error: () => this.cloudAccounts.set([]),
    })
  }

  load = (): void => {
    const provider = this.provider
    this.page.run(
      forkJoin({
        summary: this.inventory.provider(provider),
        instances: this.instancesService.list(
          provider === 'AWS' || provider === 'GCP' || provider === 'AZURE'
            ? { provider }
            : undefined,
        ),
      }).pipe(
        map(({ summary, instances }) => {
          const list = (summary['instanceList'] as InstanceRow[]) ?? []
          const cloudOnly = instances.filter((i) => i.provider === provider)
          return {
            ...summary,
            instanceList: list.length > 0 ? list : cloudOnly,
            instances: list.length > 0 ? summary['instances'] : cloudOnly.length,
          }
        }),
      ),
      {
        onSuccess: (d) => this.summary.set(d),
        errorMessage: `Failed to load ${provider} inventory`,
      },
    )
  }

  n = (key: string): number => invNum(this.summary(), key)

  handleHeaderAction = (label: string): void => {
    if (label === 'Add account') {
      this.dialog
        .open(CloudAccountFormDialogComponent, { width: '520px', data: { provider: this.provider } })
        .afterClosed()
        .subscribe((res) => {
          if (res?.created) {
            this.loadAccounts()
            this.load()
          }
        })
      return
    }
    if (label === 'Launch instance') {
      const acc = this.accounts()[0]
      if (!acc?.['id']) {
        this.toast.error('Add a cloud account first')
        return
      }
      this.dialog
        .open(LaunchInstanceDialogComponent, {
          width: '440px',
          data: { accountId: String(acc['id']), accountName: String(acc['name']) },
        })
        .afterClosed()
        .subscribe((res) => {
          if (res?.launched) this.load()
        })
      return
    }
    if (label === 'Sync inventory') {
      const list = this.accounts()
      if (list.length === 0) {
        this.accountsService.syncAll().subscribe({
          next: (r) => {
            this.toast.success(`Synced ${r.accounts} accounts`)
            this.load()
            this.loadAccounts()
          },
          error: () => this.demoActions.simulate('Inventory sync', 1200).subscribe(() => this.load()),
        })
        return
      }
      list.forEach((a) => this.syncAccount(a))
      return
    }
    if (label === 'List regions') {
      this.tabIndex.set(2)
    }
  }

  validateAccount = (account: Record<string, unknown>): void => {
    this.accountsService.validate(String(account['id'])).subscribe({
      next: () => this.toast.success(`Validated ${account['name']}`),
      error: () => this.demoActions.simulate(`Validate ${account['name']}`, 600).subscribe(),
    })
  }

  syncAccount = (account: Record<string, unknown>): void => {
    this.accountsService.sync(String(account['id'])).subscribe({
      next: (r) => {
        this.toast.success(`Synced ${r.instances} instances (${r.regions} regions)`)
        this.load()
        this.loadAccounts()
      },
      error: () => this.demoActions.simulate('Account sync', 800).subscribe(() => this.load()),
    })
  }

  instanceAction = (row: InstanceRow, action: 'start' | 'stop' | 'restart'): void => {
    const id = String(row['id'])
    const fn =
      action === 'start' ? this.instancesService.start : action === 'stop' ? this.instancesService.stop : this.instancesService.restart
    fn(id).subscribe({
      next: () => {
        this.toast.success(`${action} requested for ${row['name']}`)
        this.load()
      },
      error: () => this.demoActions.simulate(`${action} ${row['name']}`, 500).subscribe(() => this.load()),
    })
  }

  showInstanceDetail = (row: InstanceRow): void => {
    this.dialog.open(DetailDialogComponent, {
      width: '480px',
      data: {
        title: String(row['name']),
        rows: [
          { label: 'ID', value: String(row['externalId'] ?? row['id']) },
          { label: 'Region', value: String(row['region']) },
          { label: 'Type', value: String(row['instanceType']) },
          { label: 'Status', value: String(row['status']) },
          { label: 'Public IP', value: String(row['publicIp'] ?? '—') },
          { label: 'CPU', value: `${row['cpu'] ?? '—'}%` },
          { label: 'RAM', value: `${row['ram'] ?? '—'} GB` },
          { label: 'Cost/mo', value: this.formatCost(row['monthlyCost'] as number) },
        ],
      },
    })
  }

  demoMetric = (row: InstanceRow): void => {
    this.demoActions.simulate(`Metrics ${row['name']}`, 500, 'Metrics loaded (demo)').subscribe()
  }

  demoTerraform = (row?: InstanceRow): void => {
    const name = row ? String(row['name']) : 'new-instance'
    this.demoActions.simulate(`Terraform launch ${name}`, 1500, 'Plan generated — review in Terraform panel').subscribe()
  }

  syncBilling = (): void => {
    this.demoActions.simulate(`${this.provider} billing sync`, 1000, 'Billing data updated (estimated)').subscribe()
  }

  mockSecurity = (): { name: string; rules: number; vpc: string }[] => [
    { name: `${this.provider.toLowerCase()}-web-sg`, rules: 4, vpc: 'vpc-main' },
    { name: `${this.provider.toLowerCase()}-db-sg`, rules: 2, vpc: 'vpc-main' },
    { name: `${this.provider.toLowerCase()}-internal`, rules: 6, vpc: 'vpc-staging' },
  ]

  mockVolumes = (): { id: string; size: string; type: string; attached: string }[] => [
    { id: 'vol-demo-001', size: '100 GB', type: 'gp3', attached: 'web-01' },
    { id: 'vol-demo-002', size: '500 GB', type: 'io2', attached: 'db-primary' },
    { id: 'vol-demo-003', size: '50 GB', type: 'standard', attached: '—' },
  ]

  formatCost = (value?: number): string => {
    if (value === undefined || value === null) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }

  syncStatus = (): string => {
    const s = this.summary()?.['syncStatus'] as string | undefined
    if (s) return s
    return this.instances().length > 0 ? 'Synced' : 'Pending'
  }

  lastSyncLabel = (): string => {
    const ts = this.summary()?.['lastSyncAt'] as string | undefined
    if (ts) return `Last sync ${new Date(ts).toLocaleString()}`
    return 'Demo inventory'
  }
}
