import type { RunbookExecution } from './runbooks.types'

export interface CalendarCell {
  dateKey: string
  day: number
  inMonth: boolean
  isToday: boolean
}

export interface ExecutionDaySummary {
  count: number
  success: number
  warning: number
  error: number
  dominant: RunbookExecution['result'] | null
}

export const toDateKey = (isoOrDate: string | Date): string => {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const todayDateKey = (): string => toDateKey(new Date())

export const dateKeyLabel = (dateKey: string): string => {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const monthYearLabel = (year: number, month: number): string =>
  new Date(year, month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export const calendarWeekdayLabels = (): readonly string[] => WEEKDAY_LABELS

export const buildMonthGrid = (year: number, month: number): CalendarCell[] => {
  const today = todayDateKey()
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startPad = (first.getDay() + 6) % 7
  const cells: CalendarCell[] = []

  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    cells.push({
      dateKey: toDateKey(d),
      day: d.getDate(),
      inMonth: false,
      isToday: toDateKey(d) === today,
    })
  }

  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day)
    cells.push({
      dateKey: toDateKey(d),
      day,
      inMonth: true,
      isToday: toDateKey(d) === today,
    })
  }

  let trailing = 1
  while (cells.length < 42) {
    const d = new Date(year, month + 1, trailing++)
    cells.push({
      dateKey: toDateKey(d),
      day: d.getDate(),
      inMonth: false,
      isToday: toDateKey(d) === today,
    })
  }

  return cells
}

export const buildExecutionDayMap = (
  executions: RunbookExecution[],
): Map<string, ExecutionDaySummary> => {
  const map = new Map<string, ExecutionDaySummary>()

  for (const ex of executions) {
    const key = toDateKey(ex.startedAt)
    const cur = map.get(key) ?? {
      count: 0,
      success: 0,
      warning: 0,
      error: 0,
      dominant: null,
    }
    cur.count += 1
    if (ex.result === 'success') cur.success += 1
    else if (ex.result === 'warning') cur.warning += 1
    else cur.error += 1
    map.set(key, cur)
  }

  for (const [key, summary] of map) {
    const { success, warning, error } = summary
    summary.dominant =
      error >= success && error >= warning
        ? 'error'
        : warning >= success
          ? 'warning'
          : 'success'
    map.set(key, summary)
  }

  return map
}

export const latestExecutionDateKey = (executions: RunbookExecution[]): string | null => {
  if (!executions.length) return null
  const sorted = [...executions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )
  return toDateKey(sorted[0].startedAt)
}
