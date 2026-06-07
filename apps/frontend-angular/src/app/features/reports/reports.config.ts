export const REPORT_TYPE_LABELS: Record<string, string> = {
  cost: 'Costes',
  security: 'Seguridad',
  availability: 'Disponibilidad',
  activity: 'Actividad',
  infra: 'Infraestructura',
}

export const REPORT_TYPE_ICONS: Record<string, string> = {
  cost: 'payments',
  security: 'shield',
  availability: 'monitor_heart',
  activity: 'timeline',
  infra: 'dns',
}

export type ReportScheduleFrequencyId =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'

export const REPORT_SCHEDULE_FREQUENCIES: {
  id: ReportScheduleFrequencyId
  label: string
  summary: string
  icon: string
}[] = [
  { id: 'daily', label: 'Diario', summary: 'Cada día a las {time}', icon: 'today' },
  { id: 'weekly', label: 'Semanal', summary: 'Cada semana a las {time}', icon: 'date_range' },
  { id: 'biweekly', label: 'Quincenal', summary: 'Cada 14 días a las {time}', icon: 'event_repeat' },
  { id: 'monthly', label: 'Mensual', summary: 'Día {day} de cada mes a las {time}', icon: 'calendar_month' },
  { id: 'quarterly', label: 'Trimestral', summary: 'Día {day} cada trimestre a las {time}', icon: 'event_note' },
]
