import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component'
import { MiniChartComponent } from '../../shared/components/mini-chart/mini-chart.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { BillingService } from '../../core/services/billing.service'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { BillingSummary } from '../../core/models/api.models'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-billing-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    NavIconComponent,
    MiniChartComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Facturación"
        description="Resumen de gasto cloud, previsiones y alertas de coste"
        icon="payments"
        [actions]="[
          { label: 'Sincronizar facturación', icon: 'sync', primary: true },
          { label: 'Exportar CSV', icon: 'download' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      <p class="info-banner"><mat-icon>info</mat-icon> Datos estimados — modo demo · AWS Cost Explorer · GCP Billing · Azure Cost Management</p>

      <div class="billing-providers">
        <article class="billing-provider">
          <app-nav-icon logo="aws" size="md" />
          <div><strong>AWS</strong><span>{{ formatCost(providerAmount('AWS')) }}</span></div>
        </article>
        <article class="billing-provider">
          <app-nav-icon logo="gcp" size="md" />
          <div><strong>GCP</strong><span>{{ formatCost(providerAmount('GCP')) }}</span></div>
        </article>
        <article class="billing-provider">
          <app-nav-icon logo="azure" size="md" />
          <div><strong>Azure</strong><span>{{ formatCost(providerAmount('AZURE')) }}</span></div>
        </article>
        <article class="billing-provider billing-provider--total">
          <mat-icon>payments</mat-icon>
          <div><strong>Total mes</strong><span>{{ formatCost(summary()?.totalMonthly ?? 0) }}</span></div>
        </article>
      </div>

      @if (page.loading()) {
        <app-loading-state />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="chart-grid page-section">
          <app-mini-chart title="Coste por proveedor" kind="bar" [data]="providerChart()" />
          <app-mini-chart title="Tendencia diaria" kind="line" [data]="dailyTrend()" />
          <app-mini-chart title="Previsión" kind="line" [data]="forecastChart()" />
        </div>

        <div class="table-card">
        <mat-tab-group class="soft-tabs" animationDuration="280ms">
          <mat-tab label="Resumen">
            <div class="tab-panel">
              <div class="filter-row table-toolbar">
                <mat-form-field appearance="outline">
                  <mat-label>Buscar en facturación</mat-label>
                  <input matInput [formControl]="searchControl" placeholder="Proveedor o servicio…" aria-label="Filtrar líneas de coste" />
                  <mat-hint>Filtra por proveedor cloud o nombre del servicio facturado</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Proveedor</mat-label>
                  <mat-select [formControl]="providerControl">
                    <mat-option value="">Todos</mat-option>
                    @for (p of providerKeys(); track p) {
                      <mat-option [value]="p">{{ p }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="data-table-wrap">
              <table mat-table [dataSource]="filteredRows()" class="premium-table table-row-hover">
                <ng-container matColumnDef="provider">
                  <th mat-header-cell *matHeaderCellDef>Proveedor</th>
                  <td mat-cell *matCellDef="let row">{{ row.provider }}</td>
                </ng-container>
                <ng-container matColumnDef="service">
                  <th mat-header-cell *matHeaderCellDef>Servicio</th>
                  <td mat-cell *matCellDef="let row">{{ row.service }}</td>
                </ng-container>
                <ng-container matColumnDef="amount">
                  <th mat-header-cell *matHeaderCellDef>Importe</th>
                  <td mat-cell *matCellDef="let row">{{ formatCost(row.amount) }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let row; columns: cols" class="table-row-hover"></tr>
              </table>
              </div>
            </div>
          </mat-tab>
          @for (tab of billingTabs; track tab) {
            <mat-tab [label]="tab.label">
              <div class="tab-panel">
                <p>{{ tab.label }} — desglose demo · {{ formatCost(tabCost(tab.key)) }}</p>
                <button mat-stroked-button type="button" (click)="openTabReport(tab.key, tab.label)">
                  <mat-icon>insights</mat-icon> Ver informe detallado
                </button>
              </div>
            </mat-tab>
          }
        </mat-tab-group>
        </div>
      }
    </div>
  `,
  styles: `
    .billing-providers {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.5rem; margin-bottom: 1rem;
    }
    .billing-provider {
      display: flex; align-items: center; gap: 0.55rem;
      padding: 0.65rem 0.75rem; border-left: 3px solid #10b981;
      background: color-mix(in srgb, #10b981 4%, transparent);
      strong { display: block; font-size: 0.78rem; }
      span { font-size: 0.95rem; font-weight: 800; }
      mat-icon { color: #047857; }
    }
    .billing-provider--total { border-left-color: #047857; background: color-mix(in srgb, #047857 8%, transparent); }
  `,
})
export class BillingPageComponent implements OnInit {
  private readonly billing = inject(BillingService)
  private readonly actions = inject(PlatformActionService)

  readonly billingTabs = [
    { label: 'AWS', key: 'AWS' },
    { label: 'GCP', key: 'GCP' },
    { label: 'Azure', key: 'Azure' },
    { label: 'VPS', key: 'VPS' },
    { label: 'Por instancia', key: 'By instance' },
    { label: 'Previsión', key: 'Forecast' },
    { label: 'Alertas', key: 'Alerts' },
  ]

  readonly page = createPageLoader(true)
  readonly summary = signal<BillingSummary | null>(null)
  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly providerControl = new FormControl('', { nonNullable: true })
  readonly cols = ['provider', 'service', 'amount']

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')),
    { initialValue: '' },
  )
  private readonly providerFilter = toSignal(this.providerControl.valueChanges.pipe(startWith('')), {
    initialValue: '',
  })

  billingRows = computed(() => {
    const by = this.summary()?.byProvider ?? {}
    const rows: { provider: string; service: string; amount: number }[] = []
    Object.entries(by).forEach(([provider, amount]) => {
      rows.push({ provider, service: 'compute', amount: amount * 0.6 })
      rows.push({ provider, service: 'storage', amount: amount * 0.25 })
      rows.push({ provider, service: 'network', amount: amount * 0.15 })
    })
    return rows
  })

  filteredRows = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const prov = this.providerFilter()
    return this.billingRows().filter((r) => {
      const matchTerm = !term || r.provider.toLowerCase().includes(term) || r.service.includes(term)
      const matchProv = !prov || r.provider === prov
      return matchTerm && matchProv
    })
  })

  providerKeys = computed(() => Object.keys(this.summary()?.byProvider ?? {}))

  providerAmount = (key: string): number => this.summary()?.byProvider?.[key] ?? 0

  ngOnInit(): void {
    this.load()
  }

  load = (): void => {
    this.page.run(this.billing.summary(), {
      onSuccess: (data) => this.summary.set(data),
      errorMessage: 'Failed to load billing summary',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Sincronizar facturación') {
      this.actions.runPageAction('billing', 'sync', label, { area: 'observability' })
      this.load()
      return
    }
    this.actions.runPageAction('billing', 'export', label, { area: 'observability' })
  }

  openTabReport = (key: string, label: string): void => {
    this.actions.runPageAction('billing', 'detail', `Informe ${label}`, {
      row: { provider: key, amount: this.tabCost(key) },
      area: 'observability',
    })
  }

  providerChart = computed(() =>
    Object.entries(this.summary()?.byProvider ?? {}).map(([label, value]) => ({ label, value })),
  )

  dailyTrend = (): { label: string; value: number }[] =>
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => ({
      label,
      value: 800 + i * 120 + Math.random() * 200,
    }))

  forecastChart = (): { label: string; value: number }[] => {
    const base = this.summary()?.forecastMonthly ?? 5000
    return ['W1', 'W2', 'W3', 'W4'].map((label, i) => ({ label, value: base * (0.2 + i * 0.05) }))
  }

  topProvider = (): string => {
    const by = this.summary()?.byProvider ?? {}
    const entries = Object.entries(by)
    if (!entries.length) return '—'
    return entries.sort((a, b) => b[1] - a[1])[0][0]
  }

  tabCost = (tab: string): number => {
    const total = this.summary()?.totalMonthly ?? 0
    if (tab === 'AWS') return (this.summary()?.byProvider?.['AWS'] ?? total * 0.4)
    if (tab === 'GCP') return (this.summary()?.byProvider?.['GCP'] ?? total * 0.3)
    if (tab === 'Azure') return (this.summary()?.byProvider?.['AZURE'] ?? total * 0.2)
    return total * 0.1
  }

  formatCost = (value?: number): string => {
    if (value === undefined || value === null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.summary()?.currency ?? 'USD',
    }).format(value)
  }
}
