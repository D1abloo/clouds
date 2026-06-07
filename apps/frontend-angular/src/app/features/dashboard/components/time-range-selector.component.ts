import { Component, Input, output } from '@angular/core'

export type TimeRange = '1h' | '24h' | '7d' | '30d'

@Component({
  selector: 'app-time-range-selector',
  standalone: true,
  template: `
    <div class="time-range" role="group" aria-label="Rango temporal">
      @for (opt of options; track opt.value) {
        <button
          type="button"
          class="time-range__btn"
          [class.time-range__btn--active]="!customActive && value === opt.value"
          [attr.aria-pressed]="!customActive && value === opt.value"
          (click)="rangeChange.emit(opt.value)"
        >
          {{ opt.label }}
        </button>
      }
    </div>
  `,
  styles: `
    .time-range {
      display: inline-flex;
      padding: 2px;
      border-radius: 9px;
      background: color-mix(in srgb, var(--app-text) 4%, var(--app-elevated));
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      gap: 1px;
    }
    .time-range__btn {
      border: none;
      background: transparent;
      color: var(--app-text-muted);
      font-size: 0.68rem;
      font-weight: 650;
      padding: 0.28rem 0.55rem;
      border-radius: 7px;
      cursor: pointer;
      transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
      &:hover:not(.time-range__btn--active) {
        color: var(--app-text);
        background: color-mix(in srgb, var(--app-accent) 6%, transparent);
      }
      &--active {
        color: var(--app-accent);
        background: var(--app-card);
        box-shadow: 0 1px 3px color-mix(in srgb, var(--app-text) 6%, transparent);
      }
    }
  `,
})
export class TimeRangeSelectorComponent {
  @Input({ required: true }) value!: TimeRange
  @Input() customActive = false
  readonly rangeChange = output<TimeRange>()

  readonly options: { label: string; value: TimeRange }[] = [
    { label: '1h', value: '1h' },
    { label: '24h', value: '24h' },
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
  ]
}
