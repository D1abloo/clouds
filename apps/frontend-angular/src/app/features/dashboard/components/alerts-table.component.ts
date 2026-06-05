import { Component, Input, output } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatTableModule } from '@angular/material/table'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component'
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component'

@Component({
  selector: 'app-alerts-table',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    StatusBadgeComponent,
    EmptyStateComponent,
    LoadingStateComponent,
  ],
  template: `
    <div class="alerts-panel">
      <header class="alerts-panel__head">
        <div>
          <h3><mat-icon>warning_amber</mat-icon> Alertas recientes</h3>
          <p>Incidentes activos que requieren atención</p>
        </div>
        <a mat-stroked-button routerLink="/alerts" class="alerts-panel__link">
          Ver todas
          <mat-icon>arrow_forward</mat-icon>
        </a>
      </header>

      @if (loading) {
        <app-loading-state message="Cargando alertas…" />
      } @else if (!rows.length) {
        <app-empty-state icon="check_circle" title="Todo correcto" message="No hay alertas activas en este momento" />
      } @else {
        <div class="alerts-panel__scroll">
          <table mat-table [dataSource]="rows" class="premium-table alerts-table">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Alerta</th>
              <td mat-cell *matCellDef="let row">
                <span class="alerts-table__title">{{ row.title ?? row.message }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="severity">
              <th mat-header-cell *matHeaderCellDef>Severidad</th>
              <td mat-cell *matCellDef="let row">
                <span class="severity-pill" [class]="severityClass(row.severity)">
                  {{ row.severity ?? '—' }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let row">
                <app-status-badge [value]="row.status ?? 'open'" />
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols" class="table-row-hover"></tr>
          </table>
        </div>
      }
    </div>
  `,
  styles: `
    .alerts-panel {
      padding: 1.15rem 1.25rem;
      border-radius: 12px;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
      box-shadow: var(--app-shadow-sm);
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .alerts-panel__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
      h3 {
        display: flex; align-items: center; gap: 0.4rem;
        margin: 0; font-size: 1rem; font-weight: 700;
        mat-icon { color: var(--app-warning); font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }
      }
      p { margin: 0.2rem 0 0; font-size: 0.78rem; color: var(--app-text-muted); }
    }
    .alerts-panel__link {
      display: inline-flex; align-items: center; gap: 0.25rem;
      font-size: 0.78rem;
    }
    .alerts-panel__scroll {
      flex: 1;
      overflow: auto;
      max-height: 340px;
      margin: 0 -0.35rem;
      padding: 0 0.35rem;
    }
    .alerts-table__title { font-size: 0.875rem; font-weight: 500; }
    .severity-pill {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      &.sev-critical { background: color-mix(in srgb, var(--app-danger) 14%, transparent); color: var(--app-danger); }
      &.sev-warning { background: color-mix(in srgb, var(--app-warning) 14%, transparent); color: var(--app-warning); }
      &.sev-info { background: color-mix(in srgb, var(--app-info) 14%, transparent); color: var(--app-info); }
      &.sev-default { background: color-mix(in srgb, var(--app-text-muted) 12%, transparent); color: var(--app-text-muted); }
    }
  `,
})
export class AlertsTableComponent {
  @Input() rows: Record<string, unknown>[] = []
  @Input() loading = false
  readonly cols = ['title', 'severity', 'status']

  severityClass = (sev: unknown): string => {
    const s = String(sev ?? '').toLowerCase()
    if (s.includes('crit')) return 'sev-critical'
    if (s.includes('warn')) return 'sev-warning'
    if (s.includes('info')) return 'sev-info'
    return 'sev-default'
  }
}
