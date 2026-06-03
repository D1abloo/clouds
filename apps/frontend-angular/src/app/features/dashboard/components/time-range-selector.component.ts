import { Component, Input, output } from '@angular/core'

export type TimeRange = '1h' | '24h' | '7d' | '30d'

@Component({
  selector: 'app-time-range-selector',
  standalone: true,
  template: `
    <div class="time-range" role="group" aria-label="Time range">
      @for (opt of options; track opt.value) {
        <button
          type="button"
          class="time-range__btn"
          [class.time-range__btn--active]="value === opt.value"
          [attr.aria-pressed]="value === opt.value"
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
      padding: 0.25rem;
      border-radius: var(--app-radius-md);
      background: color-mix(in srgb, var(--app-text) 4%, var(--app-elevated));
      box-shadow: var(--app-shadow-xs);
      gap: 0.2rem;
    }
    .time-range__btn {
      border: none;
      background: transparent;
      color: var(--app-text-muted);
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 0.45rem 0.85rem;
      border-radius: calc(var(--app-radius-md) - 2px);
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
      &:hover:not(.time-range__btn--active) {
        color: var(--app-text);
        background: color-mix(in srgb, var(--app-accent) 6%, transparent);
      }
      &--active {
        color: var(--app-accent);
        background: var(--app-card);
        box-shadow: var(--app-shadow-sm);
        transform: translateY(-1px);
      }
    }
  `,
})
export class TimeRangeSelectorComponent {
  @Input({ required: true }) value!: TimeRange
  readonly rangeChange = output<TimeRange>()

  readonly options: { label: string; value: TimeRange }[] = [
    { label: '1h', value: '1h' },
    { label: '24h', value: '24h' },
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
  ]
}
