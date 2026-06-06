import { Component, Input, signal, computed } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatIconModule } from '@angular/material/icon'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { DashboardInstanceRow } from '../dashboard.models'

interface FleetRow extends DashboardInstanceRow {
  instanceId: string
  cpuPct: number
  ramPct: number
  diskPct: number
  alertSeverity?: string
}

@Component({
  selector: 'app-dashboard-fleet-table',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    StatusBadgeComponent,
  ],
  template: `
    <section class="fleet-panel">
      <header class="fleet-panel__head">
        <h3>Flota AWS ({{ awsRows().length }})</h3>
        <div class="fleet-panel__tools">
          <mat-form-field appearance="outline" class="fleet-filter">
            <mat-label>Estado</mat-label>
            <mat-select [formControl]="statusControl">
              <mat-option value="">Todos los estados</mat-option>
              <mat-option value="RUNNING">RUNNING</mat-option>
              <mat-option value="WARNING">UNSTABLE</mat-option>
              <mat-option value="STOPPED">STOPPED</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="fleet-search">
            <mat-label>Buscar instancias</mat-label>
            <mat-icon matPrefix>search</mat-icon>
            <input matInput [formControl]="searchControl" placeholder="Nombre o ID…" />
          </mat-form-field>
        </div>
      </header>

      <div class="fleet-scroll">
        <table class="fleet-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>ID de instancia</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>CPU</th>
              <th>Memoria</th>
              <th>Disco</th>
              <th>Zona</th>
              <th>Alerta</th>
            </tr>
          </thead>
          <tbody>
            @for (row of filtered(); track row.id) {
              <tr>
                <td><strong>{{ row.name }}</strong></td>
                <td class="fleet-table__mono">{{ row.instanceId }}</td>
                <td>{{ row.instanceType }}</td>
                <td><app-status-badge [value]="row.status" /></td>
                <td><span class="usage-bar" [class.usage-bar--high]="row.cpuPct > 85"><i [style.width.%]="row.cpuPct"></i></span> {{ row.cpuPct }}%</td>
                <td><span class="usage-bar" [class.usage-bar--high]="row.ramPct > 85"><i [style.width.%]="row.ramPct"></i></span> {{ row.ramPct }}%</td>
                <td><span class="usage-bar" [class.usage-bar--high]="row.diskPct > 85"><i [style.width.%]="row.diskPct"></i></span> {{ row.diskPct }}%</td>
                <td>{{ row.region }}</td>
                <td>
                  @if (row.alertSeverity) {
                    <span class="alert-badge" [class]="'alert-badge--' + row.alertSeverity.toLowerCase()">{{ row.alertSeverity }}</span>
                  } @else {
                    <span class="alert-badge alert-badge--none">—</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    .fleet-panel {
      padding: 0.9rem 1rem 1rem;
      border-radius: 14px;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      box-shadow: 0 1px 3px color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .fleet-panel__head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
      margin-bottom: 0.75rem;
      h3 { margin: 0; font-size: 0.88rem; font-weight: 750; }
    }
    .fleet-panel__tools {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      mat-form-field { margin: 0; }
    }
    .fleet-filter { width: 160px; }
    .fleet-search { width: min(280px, 100%); }
    .fleet-scroll { overflow-x: auto; }
    .fleet-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.72rem;
      min-width: 920px;
      th {
        text-align: left;
        font-size: 0.58rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--app-text-muted);
        padding: 0.45rem 0.55rem;
        border-bottom: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
        white-space: nowrap;
      }
      td {
        padding: 0.55rem;
        border-bottom: 1px solid color-mix(in srgb, var(--app-text) 4%, transparent);
        vertical-align: middle;
      }
      strong { font-weight: 700; }
    }
    .fleet-table__mono {
      font-family: ui-monospace, monospace;
      font-size: 0.65rem;
      color: var(--app-text-muted);
    }
    .usage-bar {
      display: inline-block;
      width: 56px;
      height: 5px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      vertical-align: middle;
      margin-right: 0.35rem;
      overflow: hidden;
      i {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #10b981, #34d399);
      }
    }
    .usage-bar--high i { background: linear-gradient(90deg, #ef4444, #f87171); }
    .alert-badge {
      font-size: 0.55rem;
      font-weight: 800;
      padding: 0.15rem 0.42rem;
      border-radius: 999px;
      text-transform: uppercase;
    }
    .alert-badge--critical { background: color-mix(in srgb, #ef4444 14%, transparent); color: #ef4444; }
    .alert-badge--none { color: var(--app-text-muted); font-weight: 600; }
  `,
})
export class DashboardFleetTableComponent {
  @Input({ required: true }) set rows(value: DashboardInstanceRow[]) {
    this.rawRows.set(value.filter((r) => r.provider === 'AWS'))
  }

  private readonly rawRows = signal<DashboardInstanceRow[]>([])

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly statusControl = new FormControl('', { nonNullable: true })

  private readonly search = toSignal(this.searchControl.valueChanges.pipe(startWith(''), debounceTime(150)), { initialValue: '' })
  private readonly status = toSignal(this.statusControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  awsRows = computed((): FleetRow[] =>
    this.rawRows().map((r, i) => ({
      ...r,
      instanceId: `i-0${(100000 + i * 7919).toString(16)}`,
      cpuPct: r.status === 'WARNING' ? 92 : 45 + (i % 4) * 8,
      ramPct: r.status === 'WARNING' ? 78 : 52 + (i % 3) * 6,
      diskPct: r.status === 'WARNING' ? 85 : 40 + (i % 5) * 5,
      alertSeverity: r.alertCount ? 'CRITICAL' : undefined,
    })),
  )

  filtered = computed(() => {
    const q = this.search().toLowerCase()
    const st = this.status()
    return this.awsRows().filter((r) => {
      if (st && r.status !== st) return false
      if (!q) return true
      return [r.name, r.instanceId, r.instanceType, r.region].join(' ').toLowerCase().includes(q)
    })
  })
}
