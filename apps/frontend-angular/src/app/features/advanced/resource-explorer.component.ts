import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core'
import { RouterLink } from '@angular/router'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog } from '@angular/material/dialog'
import { debounceTime, startWith, delay, of } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { DetailDialogComponent } from '../../shared/components/detail-dialog/detail-dialog.component'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import {
  EXPLORER_RESOURCES,
  RESOURCE_TYPE_LABELS,
  type ExplorerResource,
  type ResourceType,
} from '../../shared/platform/advanced-modules.demo'

@Component({
  selector: 'app-resource-explorer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    PageHeaderComponent,
    SummaryCardComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="page-container animate-fade-in">
      <app-page-header
        icon="travel_explore"
        title="Resource Explorer"
        description="Global search across instances, VPS, cloud accounts, containers, pods, jobs, alerts, logs, costs, users, secrets and networks."
        [actions]="[
          { label: 'Refresh index', icon: 'refresh', primary: true },
          { label: 'Export results', icon: 'download' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      @if (loading()) {
        <app-loading-state message="Indexing resources…" />
      } @else {
        <div class="summary-grid">
          <app-summary-card title="Total resources" [value]="resources.length" icon="dns" variant="elevated" iconColor="purple" />
          <app-summary-card title="Types" [value]="typeCount()" icon="category" variant="elevated" iconColor="cyan" />
          <app-summary-card title="Providers" [value]="6" icon="cloud" variant="elevated" iconColor="success" />
          <app-summary-card title="Results" [value]="filtered().length" icon="filter_list" variant="elevated" iconColor="warn" />
        </div>

        <div class="table-card explorer-search">
          <div class="filter-row table-toolbar">
            <mat-form-field appearance="outline" class="explorer-search__input">
              <mat-label>Global search</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [formControl]="searchControl" placeholder="Search by name, ID, region…" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select [formControl]="typeControl">
                <mat-option value="">All types</mat-option>
                @for (t of resourceTypes; track t) {
                  <mat-option [value]="t">{{ typeLabel(t) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Provider</mat-label>
              <mat-select [formControl]="providerControl">
                <mat-option value="">All providers</mat-option>
                @for (p of providers; track p) {
                  <mat-option [value]="p">{{ p }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select [formControl]="statusControl">
                <mat-option value="">All statuses</mat-option>
                <mat-option value="running">Running</mat-option>
                <mat-option value="active">Active</mat-option>
                <mat-option value="success">Success</mat-option>
                <mat-option value="warning">Warning</mat-option>
                <mat-option value="failed">Failed</mat-option>
                <mat-option value="critical">Critical</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        @if (filtered().length === 0) {
          <app-empty-state title="No resources found" description="Try adjusting filters or search terms." icon="search_off" />
        } @else {
          @for (group of grouped(); track group.type) {
            <div class="table-card explorer-group">
              <div class="explorer-group__head">
                <mat-icon>{{ groupIcon(group.type) }}</mat-icon>
                <h3>{{ typeLabel(group.type) }}</h3>
                <span class="explorer-group__count">{{ group.items.length }}</span>
              </div>
              <div class="data-table-wrap">
                <table class="premium-table table-row-hover">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Provider</th>
                      <th>Region</th>
                      <th>Status</th>
                      <th>Detail</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of group.items; track row.id) {
                      <tr>
                        <td><strong>{{ row.name }}</strong><small class="explorer-id">{{ row.id }}</small></td>
                        <td>{{ row.provider }}</td>
                        <td>{{ row.region }}</td>
                        <td><app-status-badge [value]="row.status" /></td>
                        <td>{{ row.detail }}</td>
                        <td class="explorer-actions">
                          <button type="button" class="hub-action-chip" (click)="viewDetail(row)">Detail</button>
                          @if (row.route) {
                            <a [routerLink]="row.route" class="hub-link-btn">Open</a>
                          }
                          <button type="button" class="hub-link-btn" (click)="quickAction(row)">Action</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }
      }
    </div>
  `,
  styles: `
    .explorer-search { margin-bottom: 1rem; }
    .explorer-search__input { flex: 2; min-width: 220px; }
    .explorer-group { margin-bottom: 1rem; animation: fadeIn 0.3s ease; }
    .explorer-group__head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem 0;
      mat-icon { color: var(--app-accent); }
      h3 { margin: 0; flex: 1; font-size: 0.95rem; }
    }
    .explorer-group__count {
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 15%, transparent);
      color: var(--app-accent);
    }
    .explorer-id { display: block; font-size: 0.65rem; color: var(--app-text-muted); font-weight: 400; }
    .explorer-actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .hub-link-btn {
      border: none;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      color: var(--app-accent);
      padding: 0.25rem 0.55rem;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }
  `,
})
export class ResourceExplorerComponent implements OnInit {
  private readonly demo = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)

  readonly resources = EXPLORER_RESOURCES
  readonly resourceTypes = Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]
  readonly providers = ['AWS', 'GCP', 'Azure', 'VPS', 'Docker', 'K8s', 'Jenkins', 'Terraform', 'Vault', 'CloudOps']

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly typeControl = new FormControl('', { nonNullable: true })
  readonly providerControl = new FormControl('', { nonNullable: true })
  readonly statusControl = new FormControl('', { nonNullable: true })

  readonly loading = signal(true)

  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')), { initialValue: '' })
  private readonly typeFilter = toSignal(this.typeControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly providerFilter = toSignal(this.providerControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly statusFilter = toSignal(this.statusControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  readonly filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const type = this.typeFilter()
    const provider = this.providerFilter()
    const status = this.statusFilter()
    return this.resources.filter((r) => {
      const matchTerm = !term || `${r.name} ${r.id} ${r.detail}`.toLowerCase().includes(term)
      const matchType = !type || r.type === type
      const matchProvider = !provider || r.provider === provider
      const matchStatus = !status || r.status === status
      return matchTerm && matchType && matchProvider && matchStatus
    })
  })

  readonly grouped = computed(() => {
    const map = new Map<ResourceType, ExplorerResource[]>()
    for (const r of this.filtered()) {
      const list = map.get(r.type) ?? []
      list.push(r)
      map.set(r.type, list)
    }
    return Array.from(map.entries()).map(([type, items]) => ({ type, items }))
  })

  typeCount = (): number => new Set(this.resources.map((r) => r.type)).size

  ngOnInit(): void {
    of(true).pipe(delay(350)).subscribe(() => this.loading.set(false))
  }

  typeLabel = (t: ResourceType): string => RESOURCE_TYPE_LABELS[t]

  groupIcon = (t: ResourceType): string => {
    const icons: Partial<Record<ResourceType, string>> = {
      instance: 'dns', vps: 'computer', 'cloud-account': 'account_balance', docker: 'view_in_ar',
      kubernetes: 'hub', jenkins: 'build', terraform: 'account_tree', alert: 'notifications_active',
    }
    return icons[t] ?? 'chevron_right'
  }

  handleHeader = (label: string): void => {
    if (label === 'Refresh index') {
      this.loading.set(true)
      of(true).pipe(delay(400)).subscribe(() => this.loading.set(false))
      return
    }
    this.demo.simulate(`Resource Explorer: ${label}`, 600).subscribe()
  }

  viewDetail = (row: ExplorerResource): void => {
    this.dialog.open(DetailDialogComponent, {
      width: '520px',
      data: {
        title: row.name,
        rows: [
          { label: 'ID', value: row.id },
          { label: 'Type', value: this.typeLabel(row.type) },
          { label: 'Provider', value: row.provider },
          { label: 'Region', value: row.region },
          { label: 'Status', value: row.status },
          { label: 'Detail', value: row.detail },
        ],
      },
    })
  }

  quickAction = (row: ExplorerResource): void => {
    this.demo.simulate(`Quick action on ${row.name}`, 500).subscribe()
  }
}
