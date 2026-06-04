import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { ChartCardComponent } from '../../shared/ui/chart-card.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { chartColor } from '../../shared/theme/chart-palette'

interface DemoRow {
  name: string
  status: string
  detail: string
  cost?: string
}

@Component({
  selector: 'app-section-hub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatIconModule,
    MatButtonModule,
    PageHeaderComponent,
    SummaryCardComponent,
    ChartCardComponent,
    StatusBadgeComponent,
  ],
  template: `
    <div class="page-container section-hub animate-fade-in">
      <app-page-header
        [title]="title()"
        [description]="description()"
        [actions]="headerActions"
        (actionClick)="handleAction($event)"
      />

      <div class="summary-grid">
        <app-summary-card title="Resources" [value]="demoStats().resources" icon="dns" variant="elevated" iconColor="purple" />
        <app-summary-card title="Healthy" [value]="demoStats().healthy" icon="check_circle" variant="elevated" iconColor="success" />
        <app-summary-card title="Warnings" [value]="demoStats().warnings" icon="warning" variant="elevated" iconColor="warn" />
        <app-summary-card title="Monthly cost" [value]="demoStats().cost" icon="payments" variant="elevated" iconColor="cyan" />
      </div>

      <div class="hub-quick-actions">
        <button type="button" class="hub-action-chip" (click)="handleAction('Refresh')"><mat-icon>refresh</mat-icon> Refresh</button>
        <button type="button" class="hub-action-chip" (click)="handleAction('Export')"><mat-icon>download</mat-icon> Export</button>
        <button type="button" class="hub-action-chip" (click)="handleAction('Sync')"><mat-icon>sync</mat-icon> Sync</button>
      </div>

      <div class="section-hub__grid">
        <div class="table-card section-hub__table">
          <div class="table-toolbar">
            <h3>{{ sectionLabel() }}</h3>
            <span class="section-hub__meta">Demo dataset · {{ rows().length }} rows</span>
          </div>
          <div class="data-table-wrap">
            <table class="premium-table table-row-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Detail</th>
                  @if (showCost()) { <th>Cost</th> }
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.name) {
                  <tr>
                    <td><strong>{{ row.name }}</strong></td>
                    <td><app-status-badge [value]="row.status" /></td>
                    <td>{{ row.detail }}</td>
                    @if (showCost()) { <td>{{ row.cost }}</td> }
                    <td><button type="button" class="hub-link-btn">View</button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="section-hub__charts">
          <app-chart-card title="Activity" subtitle="Last 24h (demo)" kind="bar" [data]="chartBars()" />
          <app-chart-card title="Status mix" kind="donut" [data]="chartDonut()" />
        </div>
      </div>
    </div>
  `,
  styles: `
    .section-hub__grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 1rem;
    }
    .section-hub__charts {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .section-hub__meta {
      font-size: 0.72rem;
      color: var(--app-text-muted);
    }
    .section-hub__table h3 {
      margin: 0;
      font-size: 0.95rem;
    }
    .hub-link-btn {
      border: none;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      color: var(--app-accent);
      padding: 0.25rem 0.55rem;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
    }
    @media (max-width: 1100px) {
      .section-hub__grid { grid-template-columns: 1fr; }
    }
  `,
})
export class SectionHubComponent {
  private readonly route = inject(ActivatedRoute)

  readonly headerActions = [
    { label: 'Refresh', icon: 'refresh' },
    { label: 'Export', icon: 'download', primary: true },
  ]

  readonly module = computed(() => this.route.snapshot.data['module'] as string ?? 'module')
  readonly section = computed(() => this.route.snapshot.paramMap.get('section') ?? 'overview')
  readonly sectionLabel = computed(() => this.formatSection(this.section()))
  readonly title = computed(() => {
    const parent = this.route.snapshot.data['parentTitle'] as string | undefined
    return parent ? `${parent} — ${this.sectionLabel()}` : this.sectionLabel()
  })
  readonly description = computed(
    () =>
      (this.route.snapshot.data['description'] as string) ??
      `Manage ${this.sectionLabel()} with filters, metrics and actions (demo mode).`,
  )

  readonly demoStats = computed(() => ({
    resources: 12 + (this.section().length % 8),
    healthy: 9,
    warnings: 2,
    cost: '$4,820',
  }))

  readonly rows = computed((): DemoRow[] => {
    const s = this.section()
    const mod = this.module()
    return Array.from({ length: 8 }, (_, i) => ({
      name: `${mod}-${s}-${i + 1}`,
      status: i % 4 === 0 ? 'warning' : i % 7 === 0 ? 'error' : 'running',
      detail: `Region eu-west-${i + 1} · demo`,
      cost: `$${120 + i * 15}`,
    }))
  })

  readonly showCost = computed(() => ['billing', 'instances', 'cost'].some((k) => this.section().includes(k)))

  chartBars = () =>
    [40, 55, 48, 62, 58, 70, 65].map((v, i) => ({
      label: `${i * 4}h`,
      value: v,
      color: chartColor(i),
    }))

  chartDonut = () => [
    { label: 'Running', value: 22, color: chartColor(4) },
    { label: 'Warning', value: 3, color: chartColor(3) },
    { label: 'Stopped', value: 2, color: chartColor(6) },
  ]

  formatSection = (slug: string): string =>
    slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

  handleAction = (label: string): void => {
    void label
  }
}
