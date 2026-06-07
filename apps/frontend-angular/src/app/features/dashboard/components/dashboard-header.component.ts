import { Component, Input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { TimeRange, TimeRangeSelectorComponent } from './time-range-selector.component'

const defaultCustomFromIso = (): string => {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return date.toISOString().slice(0, 10)
}

export interface DashboardCustomRangeInput {
  from: string
  to: string
}

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TimeRangeSelectorComponent,
  ],
  template: `
    <header class="dash-toolbar animate-fade-in">
      <div class="dash-toolbar__main">
        <div class="dash-toolbar__left">
          <app-time-range-selector
            [value]="presetRange"
            [customActive]="customActive"
            (rangeChange)="handlePresetRange($event)"
          />
          <button
            mat-stroked-button
            type="button"
            class="dash-toolbar__custom"
            [class.dash-toolbar__custom--active]="customActive"
            [attr.aria-expanded]="customPanelOpen()"
            aria-label="Rango personalizado"
            (click)="handleToggleCustom()"
          >
            <mat-icon>calendar_month</mat-icon>
            Personalizado
          </button>
        </div>

        <div class="dash-toolbar__right">
          @if (refreshing) {
            <span class="dash-toolbar__sync dash-toolbar__sync--live">
              <mat-spinner diameter="14" />
              Sincronizando…
            </span>
          } @else if (lastSync) {
            <span class="dash-toolbar__sync">
              <mat-icon>schedule</mat-icon>
              Actualizado {{ lastSync }}
            </span>
          }

          @if (rangeLabel) {
            <span class="dash-toolbar__range-badge">{{ rangeLabel }}</span>
          }

          <button
            type="button"
            class="page-action-btn dash-toolbar__export"
            [disabled]="refreshing"
            (click)="exportClick.emit()"
            aria-label="Exportar informe"
          >
            <mat-icon>download</mat-icon>
            Exportar
          </button>

          <button
            type="button"
            class="page-action-btn dash-toolbar__sync-btn"
            [disabled]="refreshing"
            (click)="syncClick.emit()"
            aria-label="Sincronizar ahora"
          >
            <mat-icon>sync</mat-icon>
            Sincronizar
          </button>

          <button
            type="button"
            class="page-action-btn page-action-btn--primary dash-toolbar__refresh"
            [disabled]="refreshing"
            (click)="refreshClick.emit()"
            aria-label="Actualizar tablero"
          >
            <mat-icon>refresh</mat-icon>
            Actualizar
          </button>
        </div>
      </div>

      @if (customPanelOpen()) {
        <div class="dash-toolbar__custom-panel" role="region" aria-label="Rango personalizado">
          <label class="dash-toolbar__field">
            <span>Desde</span>
            <input
              type="date"
              [(ngModel)]="customFrom"
              [max]="customTo || todayIso"
              aria-label="Fecha inicial"
            />
          </label>
          <label class="dash-toolbar__field">
            <span>Hasta</span>
            <input
              type="date"
              [(ngModel)]="customTo"
              [min]="customFrom"
              [max]="todayIso"
              aria-label="Fecha final"
            />
          </label>
          <div class="dash-toolbar__custom-actions">
            <button type="button" class="page-action-btn" (click)="handleCancelCustom()">Cancelar</button>
            <button
              type="button"
              class="page-action-btn page-action-btn--primary"
              [disabled]="!canApplyCustom()"
              (click)="handleApplyCustom()"
            >
              Aplicar rango
            </button>
          </div>
        </div>
      }
    </header>
  `,
  styles: `
    .dash-toolbar {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      padding: 0.7rem 0.85rem;
      margin-bottom: 0;
      border-radius: 14px 14px 0 0;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      border-bottom: none;
      box-shadow: none;
    }
    .dash-toolbar__main {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
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
      min-height: 36px;
    }
    .dash-toolbar__custom--active {
      color: var(--app-accent);
      border-color: color-mix(in srgb, var(--app-accent) 35%, transparent);
      background: color-mix(in srgb, var(--app-accent) 8%, transparent);
    }
    .dash-toolbar__refresh,
    .dash-toolbar__export,
    .dash-toolbar__sync-btn {
      flex-shrink: 0;
    }
    .dash-toolbar__sync {
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      font-size: 0.66rem;
      color: var(--app-text-muted);
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    }
    .dash-toolbar__sync--live { color: var(--app-accent); }
    .dash-toolbar__range-badge {
      font-size: 0.62rem;
      font-weight: 700;
      padding: 0.22rem 0.55rem;
      border-radius: 999px;
      color: var(--app-accent);
      background: color-mix(in srgb, var(--app-accent) 10%, transparent);
      white-space: nowrap;
    }
    .dash-toolbar__custom-panel {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.65rem;
      padding: 0.75rem 0.85rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--app-surface) 45%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .dash-toolbar__field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 150px;
      span {
        font-size: 0.62rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--app-text-muted);
      }
      input {
        border: 1px solid color-mix(in srgb, var(--app-text) 10%, transparent);
        border-radius: 10px;
        padding: 0.45rem 0.55rem;
        font-size: 0.78rem;
        background: var(--app-card);
        color: var(--app-text);
      }
    }
    .dash-toolbar__custom-actions {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-left: auto;
    }
    @media (max-width: 960px) {
      .dash-toolbar__right { width: 100%; justify-content: flex-start; }
      .dash-toolbar__custom-actions { width: 100%; margin-left: 0; justify-content: flex-end; }
    }
  `,
})
export class DashboardHeaderComponent {
  @Input() lastSync = ''
  @Input() demoMode = true
  @Input() refreshing = false
  @Input() timeRange: TimeRange = '24h'
  @Input() customActive = false
  @Input() rangeLabel = ''

  readonly refreshClick = output<void>()
  readonly exportClick = output<void>()
  readonly syncClick = output<void>()
  readonly rangeChange = output<TimeRange>()
  readonly customRangeApply = output<DashboardCustomRangeInput>()
  readonly customRangeClear = output<void>()

  readonly customPanelOpen = signal(false)
  readonly todayIso = new Date().toISOString().slice(0, 10)

  customFrom = defaultCustomFromIso()
  customTo = this.todayIso

  get presetRange(): TimeRange {
    return this.timeRange
  }

  handlePresetRange = (range: TimeRange): void => {
    this.customPanelOpen.set(false)
    this.rangeChange.emit(range)
  }

  handleToggleCustom = (): void => {
    this.customPanelOpen.update((open) => !open)
  }

  handleCancelCustom = (): void => {
    this.customPanelOpen.set(false)
  }

  handleApplyCustom = (): void => {
    if (!this.canApplyCustom()) return
    this.customRangeApply.emit({ from: this.customFrom, to: this.customTo })
    this.customPanelOpen.set(false)
  }

  canApplyCustom = (): boolean => {
    if (!this.customFrom || !this.customTo) return false
    return new Date(this.customFrom) <= new Date(this.customTo)
  }
}
