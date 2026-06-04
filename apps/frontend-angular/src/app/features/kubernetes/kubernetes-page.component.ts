import { Component, inject, OnInit, signal, computed, DestroyRef } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { bindSectionTabs } from '../../core/routing/section-tab.util'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatDialog } from '@angular/material/dialog'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { DetailDialogComponent } from '../../shared/components/detail-dialog/detail-dialog.component'
import { KubernetesService } from '../../core/services/kubernetes.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { DiscoveryService } from '../../core/services/discovery.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { ToastService } from '../../core/services/toast.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { invNum } from '../../core/utils/inventory.util'
import { PanelCardComponent } from '../../shared/ui/panel-card.component'
import { ChartCardComponent } from '../../shared/ui/chart-card.component'
import { SkeletonTableComponent } from '../../shared/ui/skeleton-table.component'

type PodRow = Record<string, unknown>

@Component({
  selector: 'app-kubernetes-page',
  standalone: true,
  imports: [
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
    PanelCardComponent,
    ChartCardComponent,
    SkeletonTableComponent,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        icon="hub"
        title="Kubernetes"
        description="Clusters, pods, deployments and services"
        [lastSync]="lastSync()"
        [actions]="[
          { label: 'Scale deployment', icon: 'unfold_more', primary: true },
          { label: 'Refresh', icon: 'refresh' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      @if (page.loading()) {
        <app-skeleton-table [rows]="6" [columns]="5" />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="summary-grid app-section-panel stagger-children">
          <app-summary-card title="Clusters" [value]="n('clusters')" icon="hub" variant="elevated" />
          <app-summary-card title="Namespaces" [value]="n('namespaceCount')" icon="folder" variant="elevated" />
          <app-summary-card title="Pods" [value]="n('podCount')" icon="widgets" variant="elevated" />
          <app-summary-card title="Deployments" [value]="n('deployments')" icon="deployed_code" variant="elevated" />
          <app-summary-card title="Services" [value]="n('services')" icon="lan" variant="elevated" />
          <app-summary-card title="Pods with error" [value]="n('podsWithError')" icon="error" iconColor="warn" variant="elevated" />
        </div>

        <div class="chart-grid">
          <app-chart-card title="Pods by status" kind="donut" [data]="podsByStatusChart()" badge="Cluster" />
          <app-chart-card title="Pods by namespace" kind="bar" [data]="podsByNamespaceChart()" />
          <app-chart-card title="Cluster CPU" kind="line" [data]="clusterCpuChart()" />
          <app-chart-card title="Restarts by pod" kind="bar" [data]="restartsChart()" />
        </div>

        <app-panel-card title="Workloads" subtitle="Pods, deployments and cluster resources" icon="hub">
        <mat-tab-group
          class="soft-tabs"
          animationDuration="280ms"
          [selectedIndex]="tabIndex()"
          (selectedIndexChange)="tabIndex.set($event)"
        >
          <mat-tab label="Pods">
            <div class="tab-panel">
              <mat-form-field appearance="outline">
                <mat-label>Search pods</mat-label>
                <input matInput [formControl]="searchControl" />
              </mat-form-field>
              @if (filteredPods().length === 0) {
                <app-empty-state title="No pods" description="Run demo seed to populate Kubernetes resources." />
              } @else {
                <table mat-table [dataSource]="filteredPods()" class="premium-table table-row-hover">
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                  </ng-container>
                  <ng-container matColumnDef="namespace">
                    <th mat-header-cell *matHeaderCellDef>Namespace</th>
                    <td mat-cell *matCellDef="let row">{{ row.namespace }}</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status" /></td>
                  </ng-container>
                  <ng-container matColumnDef="node">
                    <th mat-header-cell *matHeaderCellDef>Node</th>
                    <td mat-cell *matCellDef="let row">{{ row.node }}</td>
                  </ng-container>
                  <ng-container matColumnDef="restarts">
                    <th mat-header-cell *matHeaderCellDef>Restarts</th>
                    <td mat-cell *matCellDef="let row">{{ row.restarts }}</td>
                  </ng-container>
                  <ng-container matColumnDef="cpu">
                    <th mat-header-cell *matHeaderCellDef>CPU</th>
                    <td mat-cell *matCellDef="let row">{{ row.cpu }}%</td>
                  </ng-container>
                  <ng-container matColumnDef="ram">
                    <th mat-header-cell *matHeaderCellDef>RAM</th>
                    <td mat-cell *matCellDef="let row">{{ row.ram }}%</td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let row">
                      <button mat-icon-button [matMenuTriggerFor]="podMenu" aria-label="Actions"><mat-icon>more_vert</mat-icon></button>
                      <mat-menu #podMenu="matMenu">
                        <button mat-menu-item (click)="showLogs(row)">View logs</button>
                        <button mat-menu-item (click)="showYaml(row)">View YAML</button>
                        <button mat-menu-item (click)="restartDemo(row)">Restart (demo)</button>
                      </mat-menu>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="podCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: podCols"></tr>
                </table>
              }
            </div>
          </mat-tab>
          <mat-tab label="Clusters"><div class="tab-panel"><p>{{ clusterRows().length || n('clusters') }} clusters connected.</p></div></mat-tab>
          <mat-tab label="Nodes"><div class="tab-panel"><p>{{ nodeSummary() }}</p></div></mat-tab>
          <mat-tab label="Namespaces"><div class="tab-panel"><p>{{ namespaceSummary() }}</p></div></mat-tab>
          <mat-tab label="Deployments"><div class="tab-panel"><p>{{ deploymentRows().length || n('deployments') }} deployments tracked.</p></div></mat-tab>
          <mat-tab label="Services"><div class="tab-panel"><p>{{ serviceRows().length || n('services') }} services exposed.</p></div></mat-tab>
          <mat-tab label="Events"><div class="tab-panel"><pre class="mono event-log">{{ eventLog() }}</pre></div></mat-tab>
          <mat-tab label="YAML"><div class="tab-panel"><button mat-stroked-button (click)="showYaml()">View sample deployment YAML</button></div></mat-tab>
        </mat-tab-group>
        </app-panel-card>
      }
    </div>
  `,
  styles: `
    .full-table { width: 100%; }
    .event-log { font-size: 0.75rem; background: var(--app-surface); padding: 1rem; border-radius: 8px; }
  `,
})
export class KubernetesPageComponent implements OnInit {
  private readonly kubernetes = inject(KubernetesService)
  private readonly discovery = inject(DiscoveryService)
  private readonly realtime = inject(RealtimeService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)

  readonly page = createPageLoader(true)
  readonly tabIndex = signal(0)
  readonly data = signal<Record<string, unknown> | null>(null)
  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly podCols = ['name', 'namespace', 'status', 'node', 'restarts', 'cpu', 'ram', 'actions']

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )

  pods = computed(() => (this.data()?.['podItems'] as PodRow[]) ?? [])
  clusterRows = computed(() => (this.data()?.['clusterRows'] as Record<string, unknown>[]) ?? [])
  nodeRows = computed(() => (this.data()?.['nodeRows'] as Record<string, unknown>[]) ?? [])
  namespaceRows = computed(() => (this.data()?.['namespaceRows'] as Record<string, unknown>[]) ?? [])
  deploymentRows = computed(() => (this.data()?.['deploymentRows'] as Record<string, unknown>[]) ?? [])
  serviceRows = computed(() => (this.data()?.['serviceRows'] as Record<string, unknown>[]) ?? [])
  eventRows = computed(() => (this.data()?.['eventRows'] as Record<string, unknown>[]) ?? [])

  filteredPods = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.pods().filter((p) => !term || String(p['name']).toLowerCase().includes(term))
  })

  ngOnInit(): void {
    bindSectionTabs(this.route, this.destroyRef, this.tabIndex, 'kubernetes')
    this.realtime.connect()
    this.realtime.on('discovery.updated', () => this.load())
    this.load()
  }

  n = (key: string): number => invNum(this.data(), key)

  lastSync = (): string => `Synced ${new Date().toLocaleTimeString()}`

  podsByStatusChart = (): { label: string; value: number; color?: string }[] => {
    const pods = this.pods()
    const running = pods.filter((p) => String(p['status']).toLowerCase().includes('run')).length
    const errors = this.n('podsWithError')
    const other = Math.max(0, pods.length - running - errors)
    return [
      { label: 'Running', value: running || this.n('podCount'), color: '#22c55e' },
      { label: 'Error', value: errors, color: '#ef4444' },
      { label: 'Other', value: other, color: '#64748b' },
    ]
  }

  podsByNamespaceChart = (): { label: string; value: number }[] => {
    const map = new Map<string, number>()
    for (const p of this.pods()) {
      const ns = String(p['namespace'] ?? 'default')
      map.set(ns, (map.get(ns) ?? 0) + 1)
    }
    return [...map.entries()].slice(0, 6).map(([label, value]) => ({ label, value }))
  }

  clusterCpuChart = (): { label: string; value: number }[] =>
    this.pods().slice(0, 8).map((p, i) => ({ label: `t${i + 1}`, value: Number(p['cpu'] ?? 30) }))

  restartsChart = (): { label: string; value: number }[] =>
    this.pods().slice(0, 6).map((p) => ({ label: String(p['name']).slice(0, 10), value: Number(p['restarts'] ?? 0) }))

  load = (): void => {
    this.page.run(this.kubernetes.pageData(), {
      onSuccess: (d) => this.data.set(d),
      errorMessage: 'Failed to load Kubernetes data',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Scale deployment') {
      this.demoActions.simulate('Scale deployment api-demo to 3 replicas', 900).subscribe()
      return
    }
    if (label === 'Refresh') {
      this.discovery.discoverKubernetes('vps-prod-k8s-master-01').subscribe({
        next: () => {
          this.toast.success('Kubernetes discovery completed')
          this.load()
        },
        error: () => this.demoActions.simulate('K8s discovery', 900).subscribe(() => this.load()),
      })
    }
  }

  showLogs = (row: PodRow): void => {
    this.dialog.open(DetailDialogComponent, {
      width: '560px',
      data: {
        title: `Pod logs — ${row['name']}`,
        rows: [{ label: 'Namespace', value: String(row['namespace']) }],
        extra: `[INFO] Container started\n[INFO] Listening on :8080\n[WARN] High memory usage 78%`,
      },
    })
  }

  showYaml = (row?: PodRow): void => {
    const name = row ? String(row['name']) : 'api-demo'
    this.dialog.open(DetailDialogComponent, {
      width: '560px',
      data: {
        title: `YAML — ${name}`,
        rows: [],
        extra: `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ${name}\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: ${name}`,
      },
    })
  }

  restartDemo = (row: PodRow): void => {
    this.demoActions.simulate(`Restart pod ${row['name']}`, 700).subscribe(() => this.load())
  }

  eventLog = (): string => {
    const rows = this.eventRows()
    if (rows.length === 0) {
      return `Normal  Scheduled  pod/api-demo-xxx  Successfully assigned demo-node-01\nWarning BackOff   pod/worker-yyy  Back-off restarting failed container`
    }
    return rows
      .map((e) => `${e['type'] ?? 'Event'}  ${e['reason'] ?? ''}  ${e['object'] ?? ''}  ${e['message'] ?? ''}`)
      .join('\n')
  }

  nodeSummary = (): string => {
    const rows = this.nodeRows()
    if (rows.length === 0) return 'demo-node-01, demo-node-02 (Ready)'
    return rows.map((n) => `${n['name']} (${n['status'] ?? 'Ready'})`).join(', ')
  }

  namespaceSummary = (): string => {
    const rows = this.namespaceRows()
    if (rows.length === 0) return 'default, staging, production, monitoring'
    return rows.map((n) => String(n['name'])).join(', ')
  }
}
