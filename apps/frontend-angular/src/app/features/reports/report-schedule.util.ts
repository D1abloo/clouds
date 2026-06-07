import {
  REPORT_SCHEDULE_FREQUENCIES,
  type ReportScheduleFrequencyId,
} from './reports.config'

export type ReportScheduleForm = {
  frequency: ReportScheduleFrequencyId
  time: string
  weekday: string
  monthDay: string
  timezone: string
  format: 'pdf' | 'csv' | 'both'
  channel: 'email' | 'slack' | 'both'
  recipients: string
  retention: number
  enabled: boolean
}

const parseTime = (time: string): { h: number; m: number } => {
  const [h, m] = time.split(':').map((v) => Number(v) || 0)
  return { h: Math.min(23, Math.max(0, h)), m: Math.min(59, Math.max(0, m)) }
}

const weekdayIndex = (weekday: string): number => {
  const map: Record<string, number> = {
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
    sun: 0,
  }
  return map[weekday] ?? 1
}

const addDays = (d: Date, days: number): Date => {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

const setTime = (d: Date, h: number, m: number): Date => {
  const next = new Date(d)
  next.setHours(h, m, 0, 0)
  return next
}

const formatRunDate = (d: Date): string =>
  d.toLocaleString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const frequencyLabel = (id: ReportScheduleFrequencyId): string =>
  REPORT_SCHEDULE_FREQUENCIES.find((f) => f.id === id)?.label ?? id

export const buildScheduleSummary = (
  form: ReportScheduleForm,
  reportName: string,
): string => {
  const freq = REPORT_SCHEDULE_FREQUENCIES.find((f) => f.id === form.frequency)
  if (!freq) return `Programación automática de «${reportName}».`

  const time = form.time || '08:00'
  let cadence = freq.summary.replace('{time}', time)

  if (form.frequency === 'weekly') {
    const day = REPORT_WEEKDAYS.find((d) => d.id === form.weekday)?.label ?? 'lunes'
    cadence = `Cada ${day} a las ${time}`
  }
  if (form.frequency === 'monthly' || form.frequency === 'quarterly') {
    cadence = cadence.replace('{day}', form.monthDay || '1')
  }

  const format =
    form.format === 'both' ? 'PDF y CSV'
    : form.format === 'csv' ? 'CSV'
    : 'PDF'

  const channel =
    form.channel === 'both' ? 'email y Slack'
    : form.channel === 'slack' ? 'Slack'
    : 'email'

  return `Se generará automáticamente «${reportName}» — ${cadence} (${form.timezone}). Entrega: ${format} por ${channel}. Retención: ${form.retention} ejecuciones.`
}

export const computeNextRuns = (form: ReportScheduleForm, count = 3): string[] => {
  const { h, m } = parseTime(form.time)
  const now = new Date()
  const runs: Date[] = []
  if (form.frequency === 'daily') {
    let cursor = setTime(now, h, m)
    if (cursor.getTime() <= now.getTime()) cursor = addDays(cursor, 1)
    for (let i = 0; i < count; i++) {
      runs.push(new Date(cursor))
      cursor = addDays(cursor, 1)
    }
    return runs.map(formatRunDate)
  }

  if (form.frequency === 'weekly') {
    const target = weekdayIndex(form.weekday)
    let cursor = setTime(new Date(now), h, m)
    let diff = (target - cursor.getDay() + 7) % 7
    if (diff === 0 && cursor.getTime() <= now.getTime()) diff = 7
    cursor = setTime(addDays(cursor, diff), h, m)
    for (let i = 0; i < count; i++) {
      runs.push(new Date(cursor))
      cursor = addDays(cursor, 7)
    }
    return runs.map(formatRunDate)
  }

  if (form.frequency === 'biweekly') {
    let cursor = setTime(now, h, m)
    if (cursor.getTime() <= now.getTime()) cursor = addDays(cursor, 14)
    for (let i = 0; i < count; i++) {
      runs.push(new Date(cursor))
      cursor = addDays(cursor, 14)
    }
    return runs.map(formatRunDate)
  }

  const monthDay = Math.min(28, Math.max(1, Number(form.monthDay) || 1))
  let cursor = setTime(now, h, m)
  cursor.setDate(monthDay)
  if (cursor.getTime() <= now.getTime()) cursor.setMonth(cursor.getMonth() + 1)

  const stepMonths = form.frequency === 'quarterly' ? 3 : 1
  for (let i = 0; i < count; i++) {
    const run = new Date(cursor)
    run.setDate(monthDay)
    runs.push(run)
    cursor.setMonth(cursor.getMonth() + stepMonths)
  }

  return runs.map(formatRunDate)
}

export const REPORT_WEEKDAYS = [
  { id: 'mon', label: 'lunes' },
  { id: 'tue', label: 'martes' },
  { id: 'wed', label: 'miércoles' },
  { id: 'thu', label: 'jueves' },
  { id: 'fri', label: 'viernes' },
  { id: 'sat', label: 'sábado' },
  { id: 'sun', label: 'domingo' },
] as const

export const REPORT_TIMEZONES = [
  'Europe/Madrid',
  'Europe/London',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'UTC',
] as const
