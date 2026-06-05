import { Component, Input, output } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { RealtimeStatusBadgeComponent } from '../../../shared/components/realtime-status-badge/realtime-status-badge.component'
import { TimeRange, TimeRangeSelectorComponent } from './time-range-selector.component'

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RealtimeStatusBadgeComponent,
    TimeRangeSelectorComponent,
  ],
  template: `
    <header class="dash-header animate-fade-in">
      <div class="dash-header__brand">
        <div class="dash-header__icon" aria-hidden="true">
          <mat-icon>space_dashboard</mat-icon>
        </div>
        <div class="dash-header__copy">
          <div class="dash-header__title-row">
            <h1>Tablero</h1>
            @if (demoMode) {
              <app-realtime-status-badge mode="demo" label="Demo" icon="science" />
            } @else {
              <app-realtime-status-badge mode="live" label="Live" icon="verified" />
            }
          </div>
          <p>Centro de mando · actualizado {{ lastSync }}</p>
        </div>
      </div>

      <div class="dash-header__toolbar">
        <app-time-range-selector [value]="timeRange" (rangeChange)="rangeChange.emit($event)" />
        @if (refreshing) {
          <span class="dash-header__refreshing">
            <mat-spinner diameter="14" />
            Sincronizando…
          </span>
        }
        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="refreshing"
          (click)="refreshClick.emit()"
          aria-label="Actualizar tablero"
        >
          <mat-icon>refresh</mat-icon>
          Actualizar
        </button>
        <button mat-stroked-button type="button" (click)="exportClick.emit()" aria-label="Exportar informe">
          <mat-icon>download</mat-icon>
          Exportar
        </button>
        <a mat-stroked-button routerLink="/command-center">
          <mat-icon>bolt</mat-icon>
          Mando
        </a>
      </div>
    </header>
  `,
  styles: `
    .dash-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.85rem 1.25rem;
      padding: 0.15rem 0 0.85rem;
      margin-bottom: 0.35rem;
      flex-shrink: 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .dash-header__brand {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      min-width: 0;
    }
    .dash-header__icon {
      width: 40px;
      height: 40px;
      border-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: color-mix(in srgb, #8b5cf6 12%, var(--app-card));
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; color: #8b5cf6; }
    }
    .dash-header__title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem;
      h1 { margin: 0; font-size: 1.15rem; font-weight: 700; letter-spacing: -0.03em; }
    }
    .dash-header__copy p {
      margin: 0.18rem 0 0;
      color: var(--app-text-muted);
      font-size: 0.7rem;
    }
    .dash-header__toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem;
      justify-content: flex-end;
      button, a {
        display: inline-flex;
        align-items: center;
        gap: 0.28rem;
        font-size: 0.72rem;
      }
    }
    .dash-header__refreshing {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.66rem;
      color: var(--app-accent);
    }
    @media (max-width: 720px) {
      .dash-header { flex-direction: column; align-items: stretch; }
      .dash-header__toolbar { justify-content: flex-start; }
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
