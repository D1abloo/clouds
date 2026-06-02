import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { InstancesService } from '../../core/services/instances.service'
import { Instance } from '../../core/models/api.models'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ChartPlaceholderComponent } from '../../shared/components/chart-placeholder/chart-placeholder.component'
import { ToastService } from '../../core/services/toast.service'
import { MatDialog } from '@angular/material/dialog'
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component'

@Component({
  selector: 'app-instance-detail',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    ChartPlaceholderComponent,
  ],
  template: `
    <div class="page-container">
      @if (loading()) {
        <app-loading-state />
      } @else if (error()) {
        <app-error-state [message]="error()!" (retry)="load()" />
      } @else if (instance()) {
        <header class="page-header detail-header">
          <div>
            <a routerLink="/instances" class="back-link">
              <mat-icon>arrow_back</mat-icon>
              Instances
            </a>
            <h1>{{ instance()!.name }}</h1>
            <app-status-badge [value]="instance()!.status" />
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

        <div class="detail-grid">
          <mat-card>
            <mat-card-header><mat-card-title>Details</mat-card-title></mat-card-header>
            <mat-card-content>
              <dl class="detail-list">
                <dt>Provider</dt><dd>{{ instance()!.provider }}</dd>
                <dt>Region</dt><dd>{{ instance()!.region ?? '—' }}</dd>
                <dt>Type</dt><dd>{{ instance()!.instanceType ?? '—' }}</dd>
                <dt>Public IP</dt><dd class="mono">{{ instance()!.publicIp ?? '—' }}</dd>
                <dt>Private IP</dt><dd class="mono">{{ instance()!.privateIp ?? '—' }}</dd>
              </dl>
            </mat-card-content>
          </mat-card>
          <app-chart-placeholder label="CPU & memory metrics" />
        </div>
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
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .detail-list {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 0.5rem 1rem;
      dt { color: var(--app-text-muted); font-weight: 500; }
      dd { margin: 0; }
    }
    @media (max-width: 768px) {
      .detail-grid { grid-template-columns: 1fr; }
    }
  `,
})
export class InstanceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly service = inject(InstancesService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly loading = signal(true)
  readonly error = signal<string | null>(null)
  readonly instance = signal<Instance | null>(null)

  private instanceId = ''

  ngOnInit = (): void => {
    this.instanceId = this.route.snapshot.paramMap.get('id') ?? ''
    this.load()
  }

  load = (): void => {
    if (!this.instanceId) {
      this.error.set('Invalid instance ID')
      this.loading.set(false)
      return
    }
    this.loading.set(true)
    this.service.getOne(this.instanceId).subscribe({
      next: (data) => {
        this.instance.set(data)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Instance not found')
        this.loading.set(false)
      },
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
}
