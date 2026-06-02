import { Component, inject, OnInit, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { RouterLink } from '@angular/router'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { ChartPlaceholderComponent } from '../../shared/components/chart-placeholder/chart-placeholder.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { DashboardService } from '../../core/services/dashboard.service'
import { DashboardStats } from '../../core/models/api.models'

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    SummaryCardComponent,
    ChartPlaceholderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    MatButtonModule,
    MatIconModule,
    RouterLink,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your cloud infrastructure and operations</p>
      </header>

      @if (loading()) {
        <app-loading-state message="Loading dashboard metrics..." />
      } @else if (error()) {
        <app-error-state [message]="error()!" (retry)="loadData()" />
      } @else {
        <div class="summary-grid">
          <app-summary-card
            title="Instances"
            [value]="stats()?.['totalInstances'] ?? 0"
            [subtitle]="(stats()?.['runningInstances'] ?? 0) + ' running'"
            icon="dns"
          />
          <app-summary-card
            title="Cloud Accounts"
            [value]="stats()?.['cloudAccounts'] ?? 0"
            icon="cloud"
          />
          <app-summary-card
            title="VPS Hosts"
            [value]="stats()?.['vpsHosts'] ?? 0"
            icon="storage"
          />
          <app-summary-card
            title="Open Alerts"
            [value]="stats()?.['alertsOpen'] ?? 0"
            icon="warning"
            iconColor="warn"
          />
          <app-summary-card
            title="Monthly Spend"
            [value]="formatSpend($any(stats()?.['monthlySpend']))"
            icon="payments"
          />
        </div>

        <div class="dashboard-charts">
          <app-chart-placeholder label="Instance utilization over time" />
          <app-chart-placeholder label="Cost breakdown by provider" />
        </div>

        <div class="quick-actions">
          <a mat-stroked-button routerLink="/instances">
            <mat-icon>dns</mat-icon>
            View instances
          </a>
          <a mat-stroked-button routerLink="/alerts">
            <mat-icon>warning</mat-icon>
            Review alerts
          </a>
        </div>
      }
    </div>
  `,
  styles: `
    .dashboard-charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      a { display: inline-flex; align-items: center; gap: 0.5rem; }
    }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly dashboard = inject(DashboardService)

  readonly loading = signal(true)
  readonly error = signal<string | null>(null)
  readonly stats = signal<DashboardStats | null>(null)

  ngOnInit = (): void => this.loadData()

  loadData = (): void => {
    this.loading.set(true)
    this.error.set(null)
    this.dashboard.getStats().subscribe({
      next: (data) => {
        this.stats.set(data)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Could not reach the metrics API at /api/v1/metrics/dashboard')
        this.loading.set(false)
      },
    })
  }

  getStat = (key: string): number | undefined => {
    const value = this.stats()?.[key]
    return typeof value === 'number' ? value : undefined
  }

  formatSpend = (value?: number): string => {
    if (value === undefined || value === null) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }
}
