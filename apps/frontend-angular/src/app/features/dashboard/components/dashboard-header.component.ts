import { Component, Input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { TimeRange, TimeRangeSelectorComponent } from './time-range-selector.component'

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    TimeRangeSelectorComponent,
  ],
  template: `
    <header class="dash-toolbar animate-fade-in">
      <div class="dash-toolbar__left">
        <app-time-range-selector [value]="timeRange" (rangeChange)="rangeChange.emit($event)" />
        <button mat-stroked-button type="button" class="dash-toolbar__custom" aria-label="Rango personalizado">
          <mat-icon>calendar_month</mat-icon>
          Personalizado
        </button>
      </div>
      <div class="dash-toolbar__right">
        @if (refreshing) {
          <span class="dash-toolbar__sync">
            <mat-spinner diameter="14" />
            Sincronizando…
          </span>
        }
        <button
          mat-flat-button
          color="primary"
          type="button"
          class="dash-toolbar__refresh"
          [disabled]="refreshing"
          (click)="refreshClick.emit()"
          aria-label="Actualizar tablero"
        >
          <mat-icon>refresh</mat-icon>
          Actualizar
        </button>
        <button
          mat-icon-button
          type="button"
          [matMenuTriggerFor]="actionsMenu"
          aria-label="Más acciones"
        >
          <mat-icon>more_vert</mat-icon>
        </button>
        <mat-menu #actionsMenu="matMenu">
          <button mat-menu-item type="button" (click)="exportClick.emit()">
            <mat-icon>download</mat-icon>
            Exportar informe
          </button>
          <button mat-menu-item type="button" (click)="refreshClick.emit()">
            <mat-icon>sync</mat-icon>
            Sincronizar ahora
          </button>
        </mat-menu>
      </div>
    </header>
  `,
  styles: `
    .dash-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
      padding: 0.55rem 0.65rem;
      margin-bottom: 0.75rem;
      border-radius: 12px;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      box-shadow: 0 1px 2px color-mix(in srgb, var(--app-text) 4%, transparent);
    }
    .dash-toolbar__left,
    .dash-toolbar__right {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem;
    }
    .dash-toolbar__custom {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.72rem;
    }
    .dash-toolbar__refresh {
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      font-size: 0.72rem;
    }
    .dash-toolbar__sync {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.66rem;
      color: var(--app-accent);
    }
  `,
})
export class DashboardHeaderComponent {
  @Input() lastSync = ''
  @Input() demoMode = true
  @Input() refreshing = false
  @Input() timeRange: TimeRange = '24h'

  readonly refreshClick = output<void>()
  readonly exportClick = output<void>()
  readonly rangeChange = output<TimeRange>()
}
