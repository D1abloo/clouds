import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { InstancesService } from '../../core/services/instances.service'
import { Instance } from '../../core/models/api.models'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { MatTabsModule } from '@angular/material/tabs'
import { MiniChartComponent } from '../../shared/components/mini-chart/mini-chart.component'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { ToastService } from '../../core/services/toast.service'
import { MatDialog } from '@angular/material/dialog'
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-instance-detail',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    MiniChartComponent,
    MatTabsModule,
  ],
  template: `
    <div class="page-container">
      @if (page.loading()) {
        <app-loading-state />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else if (instance()) {
        <header class="page-header detail-header">
          <div>
            <a routerLink="/instances" class="back-link">
              <mat-icon>arrow_back</mat-icon>
              Instances
            </a>
            <h1>{{ instance()!.name }} @if (instance()!.isDemo) { <span class="demo-chip">DEMO</span> }</h1>
            <app-status-badge [value]="instance()!.status" />
            @if (instance()!.health) {
              <span class="health">Health: {{ instance()!.health }}</span>
            }
          </div>
          <div class="actions">
            <button mat-stroked-button type="button" (click)="handleAction('start')">
              <mat-icon>play_arrow</mat-icon> Start
            </button>
            <button mat-stroked-button type="button" (click)="handleAction('stop')">
              <mat-icon>stop</mat-icon> Stop
            </button>
            <button mat-flat-button color="primary" type="button" (click)="handleAction('restart')">
              <mat-icon>restart_alt</mat-icon> Restart
            </button>
          </div>
        </header>

        <mat-tab-group>
          <mat-tab label="Summary">
            <div class="tab-panel">
              <dl class="detail-list wide">
                <dt>Provider</dt><dd>{{ instance()!.provider }}</dd>
                <dt>Region</dt><dd>{{ instance()!.region ?? '—' }}</dd>
                <dt>Type</dt><dd>{{ instance()!.instanceType ?? '—' }}</dd>
                <dt>Public IP</dt><dd class="mono">{{ instance()!.publicIp ?? '—' }}</dd>
                <dt>Private IP</dt><dd class="mono">{{ instance()!.privateIp ?? '—' }}</dd>
                <dt>Environment</dt><dd>{{ instance()!.environment ?? '—' }}</dd>
                <dt>CPU / RAM / Disk</dt><dd>{{ instance()!.cpuCores ?? '—' }} cores · {{ instance()!.ramGb ?? '—' }} GB · {{ instance()!.diskGb ?? '—' }} GB</dd>
                <dt>Monthly cost</dt><dd>{{ formatCost(instance()!.monthlyCost) }} (MTD {{ formatCost(instance()!.mtdCost) }})</dd>
              </dl>
            </div>
          </mat-tab>
          <mat-tab label="Metrics">
            <div class="tab-panel"><app-mini-chart title="CPU / RAM" kind="line" [data]="metricTrend()" /></div>
          </mat-tab>
          <mat-tab label="Docker"><div class="tab-panel"><p>3 containers running (demo)</p><button mat-stroked-button (click)="demoTab('Docker')">Refresh</button></div></mat-tab>
          <mat-tab label="Kubernetes"><div class="tab-panel"><p>Not enrolled in a cluster (demo)</p></div></mat-tab>
          <mat-tab label="Services"><div class="tab-panel"><p>sshd, nginx, node-exporter (demo)</p></div></mat-tab>
          <mat-tab label="Terminal"><div class="tab-panel"><a mat-flat-button color="primary" routerLink="/terminal">Open terminal</a></div></mat-tab>
          <mat-tab label="Billing"><div class="tab-panel"><p>MTD {{ formatCost(instance()!.mtdCost) }} · Projected {{ formatCost(instance()!.monthlyCost) }}</p></div></mat-tab>
          <mat-tab label="Alerts"><div class="tab-panel"><p>0 active alerts for this instance</p></div></mat-tab>
          <mat-tab label="Audit"><div class="tab-panel"><p>Last: instance.sync · terraform.plan (demo)</p><a routerLink="/audit">View audit log</a></div></mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: `
    .detail-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      color: var(--app-text-muted);
      text-decoration: none;
      margin-bottom: 0.5rem;
    }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .demo-chip {
      margin-left: 0.5rem;
      padding: 0.15rem 0.45rem;
      font-size: 0.7rem;
      font-weight: 700;
      border-radius: 4px;
      background: rgba(59, 130, 246, 0.2);
      color: #2563eb;
      vertical-align: middle;
    }
    .health { margin-left: 0.75rem; font-size: 0.85rem; color: var(--app-text-muted); }
    .detail-list.wide {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 0.5rem 1rem;
      max-width: 640px;
      dt { color: var(--app-text-muted); font-weight: 500; }
      dd { margin: 0; }
    }
  `,
})
export class InstanceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly service = inject(InstancesService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)
  private readonly demoActions = inject(DemoActionsService)
  private readonly destroyRef = inject(DestroyRef)

  readonly page = createPageLoader(true)
  readonly instance = signal<Instance | null>(null)

  private instanceId = ''

  ngOnInit = (): void => {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.instanceId = params.get('id') ?? ''
      this.load()
    })
  }

  load = (): void => {
    if (!this.instanceId) {
      this.page.error.set('Invalid instance ID')
      this.page.loading.set(false)
      return
    }
    this.page.run(this.service.getOne(this.instanceId), {
      onSuccess: (data) => this.instance.set(data),
      errorMessage: 'Instance not found',
    })
  }

  handleAction = (action: 'start' | 'stop' | 'restart'): void => {
    const labels = { start: 'Start', stop: 'Stop', restart: 'Restart' }
    const data: ConfirmDialogData = {
      title: `${labels[action]} instance`,
      message: `${labels[action]} ${this.instance()?.name}?`,
      confirmLabel: labels[action],
      destructive: action === 'stop',
    }
    this.dialog
      .open(ConfirmDialogComponent, { data })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return
        const call =
          action === 'start'
            ? this.service.start(this.instanceId)
            : action === 'stop'
              ? this.service.stop(this.instanceId)
              : this.service.restart(this.instanceId)
        call.subscribe({
          next: () => {
            this.toast.success(`${labels[action]} requested`)
            this.load()
          },
          error: () => this.toast.error(`${labels[action]} failed`),
        })
      })
  }

  formatCost = (value?: number | null): string => {
    if (value === undefined || value === null) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }

  metricTrend = (): { label: string; value: number }[] => [
    { label: '1h', value: 35 },
    { label: '2h', value: 42 },
    { label: '3h', value: 58 },
    { label: '4h', value: 51 },
    { label: '5h', value: 47 },
  ]

  demoTab = (tab: string): void => {
    this.demoActions.simulate(`${tab} refresh`, 400).subscribe()
  }
}
