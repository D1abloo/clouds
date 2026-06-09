import { Component, computed, input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import type { RunbookExecution } from './runbooks.types'
import {
  buildExecutionDayMap,
  buildMonthGrid,
  calendarWeekdayLabels,
  monthYearLabel,
  type CalendarCell,
  type ExecutionDaySummary,
} from './runbook-execution-date.util'

@Component({
  selector: 'app-runbook-executions-calendar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  host: {
    '[class.rb-ex-cal-host--dark]': 'theme() === "dark"',
  },
  template: `
    <div class="rb-ex-cal" role="application" aria-label="Calendario de ejecuciones">
      <header class="rb-ex-cal__head">
        <button
          type="button"
          class="rb-ex-cal__nav"
          (click)="shiftMonth(-1)"
          aria-label="Mes anterior"
        >
          <mat-icon>chevron_left</mat-icon>
        </button>
        <h4 class="rb-ex-cal__title">{{ monthLabel() }}</h4>
        <button
          type="button"
          class="rb-ex-cal__nav"
          (click)="shiftMonth(1)"
          aria-label="Mes siguiente"
        >
          <mat-icon>chevron_right</mat-icon>
        </button>
      </header>

      <div class="rb-ex-cal__weekdays" aria-hidden="true">
        @for (wd of weekdays; track wd) {
          <span>{{ wd }}</span>
        }
      </div>

      <div class="rb-ex-cal__grid" role="grid">
        @for (cell of cells(); track cell.dateKey + cell.inMonth) {
          <button
            type="button"
            role="gridcell"
            class="rb-ex-cal__day"
            [class.rb-ex-cal__day--off]="!cell.inMonth"
            [class.rb-ex-cal__day--today]="cell.isToday"
            [class.rb-ex-cal__day--on]="selectedDateKey() === cell.dateKey"
            [class.rb-ex-cal__day--has]="daySummary(cell.dateKey)"
            [attr.data-tone]="daySummary(cell.dateKey)?.dominant"
            [attr.aria-label]="dayAriaLabel(cell)"
            [attr.aria-pressed]="selectedDateKey() === cell.dateKey"
            (click)="handleDayClick(cell)"
          >
            <span class="rb-ex-cal__num">{{ cell.day }}</span>
            @if (daySummary(cell.dateKey); as sum) {
              <span class="rb-ex-cal__dots" aria-hidden="true">
                @if (sum.success) {
                  <span class="rb-ex-cal__dot" data-tone="success"></span>
                }
                @if (sum.warning) {
                  <span class="rb-ex-cal__dot" data-tone="warning"></span>
                }
                @if (sum.error) {
                  <span class="rb-ex-cal__dot" data-tone="error"></span>
                }
              </span>
              <span class="rb-ex-cal__count">{{ sum.count }}</span>
            }
          </button>
        }
      </div>

      <footer class="rb-ex-cal__legend" aria-label="Leyenda">
        <span><span class="rb-ex-cal__dot" data-tone="success"></span> OK</span>
        <span><span class="rb-ex-cal__dot" data-tone="warning"></span> Adv</span>
        <span><span class="rb-ex-cal__dot" data-tone="error"></span> Err</span>
        <button type="button" class="rb-ex-cal__today" (click)="goToday()">
          Hoy
        </button>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .rb-ex-cal {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 0.55rem 0.65rem 0.5rem;
    }
    .rb-ex-cal__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.35rem;
    }
    .rb-ex-cal__title {
      margin: 0;
      flex: 1;
      text-align: center;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: capitalize;
      color: #111;
    }
    .rb-ex-cal__nav {
      display: grid;
      place-items: center;
      width: 1.85rem;
      height: 1.85rem;
      border: 1px solid color-mix(in srgb, #111 10%, transparent);
      border-radius: 7px;
      background: #fff;
      color: #334155;
      cursor: pointer;
    }
    .rb-ex-cal__nav mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .rb-ex-cal__weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
      text-align: center;
      font-size: 0.55rem;
      font-weight: 800;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .rb-ex-cal__grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 3px;
    }
    .rb-ex-cal__day {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 0.06rem;
      min-height: 2.2rem;
      padding: 0.18rem 0.08rem;
      border: 1px solid transparent;
      border-radius: 7px;
      background: transparent;
      font: inherit;
      color: #334155;
      cursor: pointer;
    }
    .rb-ex-cal__day--off {
      opacity: 0.3;
    }
    .rb-ex-cal__day--on {
      border-color: #844fba;
      background: color-mix(in srgb, #844fba 12%, #fff);
    }
    .rb-ex-cal__num {
      font-size: 0.7rem;
      font-weight: 650;
    }
    .rb-ex-cal__dots {
      display: flex;
      gap: 2px;
      min-height: 4px;
    }
    .rb-ex-cal__dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #94a3b8;
    }
    .rb-ex-cal__dot[data-tone='success'] {
      background: #22c55e;
    }
    .rb-ex-cal__dot[data-tone='warning'] {
      background: #fbbf24;
    }
    .rb-ex-cal__dot[data-tone='error'] {
      background: #f87171;
    }
    .rb-ex-cal__count {
      font-size: 0.48rem;
      font-weight: 800;
      color: #64748b;
    }
    .rb-ex-cal__legend {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem 0.55rem;
      padding-top: 0.3rem;
      border-top: 1px solid color-mix(in srgb, #111 7%, transparent);
      font-size: 0.55rem;
      font-weight: 600;
      color: #64748b;
    }
    .rb-ex-cal__legend > span {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
    }
    .rb-ex-cal__today {
      margin-left: auto;
      padding: 0.22rem 0.5rem;
      border: 1px solid color-mix(in srgb, #111 12%, transparent);
      border-radius: 6px;
      background: transparent;
      font: inherit;
      font-size: 0.55rem;
      font-weight: 800;
      color: #334155;
      cursor: pointer;
    }

    :host.rb-ex-cal-host--dark .rb-ex-cal__title {
      color: #e2e8f0;
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__nav {
      border-color: #334155;
      background: #1e293b;
      color: #94a3b8;
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__nav:hover {
      border-color: #22d3ee;
      color: #22d3ee;
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__weekdays {
      color: #64748b;
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__day {
      color: #cbd5e1;
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__day:hover {
      background: #1e293b;
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__day--today .rb-ex-cal__num {
      color: #22d3ee;
      font-weight: 800;
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__day--on {
      border-color: #22d3ee;
      background: color-mix(in srgb, #22d3ee 18%, #0f172a);
      box-shadow: 0 0 0 1px color-mix(in srgb, #22d3ee 35%, transparent);
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__day--has[data-tone='success']:not(.rb-ex-cal__day--on) {
      background: color-mix(in srgb, #34d399 12%, #0c1222);
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__day--has[data-tone='warning']:not(.rb-ex-cal__day--on) {
      background: color-mix(in srgb, #fbbf24 12%, #0c1222);
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__day--has[data-tone='error']:not(.rb-ex-cal__day--on) {
      background: color-mix(in srgb, #f87171 12%, #0c1222);
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__count {
      color: #94a3b8;
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__legend {
      border-top-color: #1e293b;
      color: #64748b;
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__today {
      border-color: #334155;
      color: #22d3ee;
    }
    :host.rb-ex-cal-host--dark .rb-ex-cal__today:hover {
      background: #1e293b;
    }
  `,
})
export class RunbookExecutionsCalendarComponent {
  readonly executions = input.required<RunbookExecution[]>()
  readonly viewYear = input.required<number>()
  readonly viewMonth = input.required<number>()
  readonly selectedDateKey = input<string | null>(null)
  readonly theme = input<'light' | 'dark'>('light')

  readonly monthChange = output<{ year: number; month: number }>()
  readonly dateSelect = output<string>()

  readonly weekdays = calendarWeekdayLabels()

  readonly cells = computed((): CalendarCell[] =>
    buildMonthGrid(this.viewYear(), this.viewMonth()),
  )

  readonly dayMap = computed(() => buildExecutionDayMap(this.executions()))

  readonly monthLabel = computed(() => monthYearLabel(this.viewYear(), this.viewMonth()))

  daySummary = (dateKey: string): ExecutionDaySummary | undefined =>
    this.dayMap().get(dateKey)

  dayAriaLabel = (cell: CalendarCell): string => {
    const sum = this.daySummary(cell.dateKey)
    const base = `${cell.day} ${this.monthLabel()}`
    if (!sum) return base
    return `${base}, ${sum.count} ejecuciones`
  }

  handleDayClick = (cell: CalendarCell): void => {
    if (!cell.inMonth) {
      const [y, m] = cell.dateKey.split('-').map(Number)
      this.monthChange.emit({ year: y, month: m - 1 })
    }
    this.dateSelect.emit(cell.dateKey)
  }

  shiftMonth = (delta: number): void => {
    let m = this.viewMonth() + delta
    let y = this.viewYear()
    if (m < 0) {
      m = 11
      y -= 1
    }
    if (m > 11) {
      m = 0
      y += 1
    }
    this.monthChange.emit({ year: y, month: m })
  }

  goToday = (): void => {
    const now = new Date()
    this.monthChange.emit({ year: now.getFullYear(), month: now.getMonth() })
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    this.dateSelect.emit(key)
  }
}
