import { Component, Input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { RealtimeStatusBadgeComponent } from '../../../shared/components/realtime-status-badge/realtime-status-badge.component'
import { TimeRange, TimeRangeSelectorComponent } from './time-range-selector.component'

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RealtimeStatusBadgeComponent,
    TimeRangeSelectorComponent,
  ],
  template: `
    <header class="dash-header animate-fade-in">
      <div class="dash-header__main">
        <div class="dash-header__icon tone-violet" aria-hidden="true">
          <mat-icon>space_dashboard</mat-icon>
        </div>
        <div class="dash-header__copy">
          <div class="dash-header__title-row">
            <h1>Tablero</h1>
            @if (demoMode) {
              <app-realtime-status-badge mode="demo" label="Datos demo" icon="science" />
            } @else {
              <app-realtime-status-badge mode="live" label="Datos reales" icon="verified" />
            }
          </div>
          <p>Visión global de infraestructura — instancias, costes, alertas y operaciones</p>
          <div class="dash-header__meta">
            <span class="dash-header__sync">
              <mat-icon>schedule</mat-icon>
              Última actualización {{ lastSync }}
            </span>
            @if (refreshing) {
              <span class="dash-header__refreshing">
                <mat-spinner diameter="14" />
                Actualizando métricas…
              </span>
            }
          </div>
        </div>
      </div>

      <div class="dash-header__controls">
        <app-time-range-selector [value]="timeRange" (rangeChange)="rangeChange.emit($event)" />
        <div class="dash-header__actions">
          <button
            mat-flat-button
            color="primary"
            type="button"
            [disabled]="refreshing"
            (click)="refreshClick.emit()"
          >
            <mat-icon>refresh</mat-icon>
            Actualizar
          </button>
          <button mat-stroked-button type="button" (click)="exportClick.emit()">
            <mat-icon>download</mat-icon>
            Exportar informe
          </button>
        </div>
      </div>
    </header>
  `,
  styles: `
    .dash-header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.25rem;
      padding: 1.5rem 1.65rem;
      margin-bottom: 1.25rem;
      border-radius: var(--app-radius-xl);
      background: linear-gradient(135deg, var(--app-card), color-mix(in srgb, var(--cat-overview) 6%, var(--app-card)));
      box-shadow: var(--app-shadow-md);
    }
    .dash-header__main {
      display: flex;
      gap: 1.1rem;
      flex: 1;
      min-width: min(100%, 320px);
    }
    .dash-header__icon {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 22px color-mix(in srgb, var(--cat-overview) 28%, transparent);
      mat-icon { font-size: 1.55rem; width: 1.55rem; height: 1.55rem; }
    }
    .dash-header__title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem;
      h1 { margin: 0; font-size: 1.75rem; font-weight: 700; letter-spacing: -0.03em; }
    }
    p {
      margin: 0.35rem 0 0;
      color: var(--app-text-muted);
      font-size: 0.92rem;
      line-height: 1.5;
      max-width: 560px;
    }
    .dash-header__meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.65rem;
    }
    .dash-header__sync {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.78rem;
      color: var(--app-text-muted);
      mat-icon { font-size: 15px; width: 15px; height: 15px; }
    }
    .dash-header__refreshing {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.78rem;
      color: var(--app-accent);
    }
    .dash-header__controls {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.85rem;
    }
    .dash-header__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      button { display: inline-flex; align-items: center; gap: 0.35rem; }
    }
    @media (max-width: 960px) {
      .dash-header__controls { align-items: stretch; width: 100%; }
      .dash-header__actions { justify-content: flex-start; }
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
