import type { DashboardData } from '../dashboard.models'
import type { TimeRange } from '../components/time-range-selector.component'

export type DashboardRangeKey = TimeRange | 'custom'

export interface DashboardCustomRange {
  from: Date
  to: Date
}

export interface DashboardKpiMetrics {
  instances: number
  running: number
  monthlySpend: number
  forecastSpend: number
  alerts: number
  criticalAlerts: number
  approvals: number
  sla: number
  cicd: number
  trends: {
    instances: { text: string; up: boolean }
    spend: { text: string; up: boolean }
    alerts: { text: string; up: boolean }
    approvals: { text: string; up: boolean }
    sla: { text: string; up: boolean }
    cicd: { text: string; up: boolean }
  }
}

const RANGE_PRESETS: Record<
  TimeRange,
  {
    label: string
    compareLabel: string
    scale: number
    spendScale: number
    alertScale: number
    slaBase: number
    trends: DashboardKpiMetrics['trends']
  }
> = {
  '1h': {
    label: 'Última hora',
    compareLabel: 'vs hora anterior',
    scale: 0.97,
    spendScale: 0.998,
    alertScale: 0.35,
    slaBase: 95,
    trends: {
      instances: { text: '2% vs hora anterior', up: true },
      spend: { text: '0.4% vs hora anterior', up: false },
      alerts: { text: '40% vs hora anterior', up: true },
      approvals: { text: '0% vs hora anterior', up: false },
      sla: { text: '0.2% vs hora anterior', up: true },
      cicd: { text: '1 vs hora anterior', up: true },
    },
  },
  '24h': {
    label: 'Últimas 24 h',
    compareLabel: 'vs ayer',
    scale: 1,
    spendScale: 1,
    alertScale: 1,
    slaBase: 94,
    trends: {
      instances: { text: '18% vs ayer', up: true },
      spend: { text: '6% vs mes anterior', up: false },
      alerts: { text: '125% vs ayer', up: true },
      approvals: { text: '25% vs ayer', up: false },
      sla: { text: '2% vs semana pasada', up: false },
      cicd: { text: '1 vs ayer', up: true },
    },
  },
  '7d': {
    label: 'Últimos 7 días',
    compareLabel: 'vs semana anterior',
    scale: 1.04,
    spendScale: 1.08,
    alertScale: 1.6,
    slaBase: 93,
    trends: {
      instances: { text: '12% vs semana anterior', up: true },
      spend: { text: '11% vs semana anterior', up: true },
      alerts: { text: '34% vs semana anterior', up: true },
      approvals: { text: '18% vs semana anterior', up: false },
      sla: { text: '1.5% vs mes anterior', up: false },
      cicd: { text: '6 vs semana anterior', up: true },
    },
  },
  '30d': {
    label: 'Últimos 30 días',
    compareLabel: 'vs mes anterior',
    scale: 1.09,
    spendScale: 1.14,
    alertScale: 2.1,
    slaBase: 92,
    trends: {
      instances: { text: '22% vs mes anterior', up: true },
      spend: { text: '14% vs mes anterior', up: true },
      alerts: { text: '48% vs mes anterior', up: true },
      approvals: { text: '31% vs mes anterior', up: false },
      sla: { text: '3% vs trimestre anterior', up: false },
      cicd: { text: '18 vs mes anterior', up: true },
    },
  },
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export const resolveDashboardRangeKey = (
  range: TimeRange,
  custom: DashboardCustomRange | null,
): DashboardRangeKey => (custom ? 'custom' : range)

export const getRangeLabel = (
  range: TimeRange,
  custom: DashboardCustomRange | null,
): string => {
  if (custom) {
    const fmt = (d: Date) =>
      d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    return `${fmt(custom.from)} – ${fmt(custom.to)}`
  }
  return RANGE_PRESETS[range].label
}

const customScaleFromSpan = (from: Date, to: Date): number => {
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000))
  return clamp(0.92 + days * 0.006, 0.92, 1.18)
}

export const buildKpiMetrics = (
  data: DashboardData | null,
  range: TimeRange,
  custom: DashboardCustomRange | null,
  pendingApprovals: number,
): DashboardKpiMetrics => {
  const preset = RANGE_PRESETS[range]
  const customScale = custom ? customScaleFromSpan(custom.from, custom.to) : 1
  const scale = preset.scale * customScale
  const spendScale = preset.spendScale * customScale

  const baseInstances = data?.totalInstances ?? 126
  const baseRunning = data?.runningInstances ?? 32
  const baseSpend = data?.monthlySpend ?? 4820
  const baseAlerts = data?.alertsOpen ?? 9
  const baseCritical = Number(data?.alertsBySeverity?.['CRITICAL'] ?? 3)
  const baseCicd = Number(data?.jenkins?.['running'] ?? 2)
  const baseApprovals = pendingApprovals || 6

  const instances = Math.round(baseInstances * scale)
  const running = Math.round(baseRunning * scale)
  const monthlySpend = Math.round(baseSpend * spendScale)
  const forecastSpend = Math.round(monthlySpend * 1.076)
  const alerts = Math.max(1, Math.round(baseAlerts * preset.alertScale * customScale))
  const criticalAlerts = Math.max(1, Math.round(baseCritical * preset.alertScale))
  const approvals = Math.max(0, Math.round(baseApprovals * (custom ? customScale : 1)))
  const sla = clamp(Math.round(preset.slaBase * (custom ? 0.99 + customScale * 0.01 : 1)), 88, 99)
  const cicd = Math.max(0, Math.round(baseCicd * (range === '1h' ? 1 : range === '30d' ? 1.4 : 1)))

  const trends = custom
    ? {
        instances: { text: `${Math.round((customScale - 1) * 100)}% en el periodo`, up: customScale >= 1 },
        spend: { text: `${Math.round((spendScale - 1) * 100)}% en el periodo`, up: spendScale >= 1 },
        alerts: { text: `${Math.round(preset.alertScale * 10)}% en el periodo`, up: true },
        approvals: { text: `${approvals} en el periodo`, up: false },
        sla: { text: `${sla}% promedio`, up: sla >= 93 },
        cicd: { text: `${cicd} builds`, up: true },
      }
    : preset.trends

  return {
    instances,
    running,
    monthlySpend,
    forecastSpend,
    alerts,
    criticalAlerts,
    approvals,
    sla,
    cicd,
    trends,
  }
}

export const formatDashboardSpend = (value?: number): string => {
  if (value === undefined || value === null) return '0 US$'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export const downloadDashboardReport = (
  metrics: DashboardKpiMetrics,
  rangeLabel: string,
  syncedAt: Date,
): void => {
  const stamp = syncedAt.toLocaleString('es-ES')
  const rows = [
    ['Métrica', 'Valor', 'Detalle', 'Tendencia', 'Rango', 'Actualizado'],
    ['Instancias', String(metrics.instances), `${metrics.running} en ejecución`, metrics.trends.instances.text, rangeLabel, stamp],
    ['Gasto mensual', formatDashboardSpend(metrics.monthlySpend), `Proyectado ${formatDashboardSpend(metrics.forecastSpend)}`, metrics.trends.spend.text, rangeLabel, stamp],
    ['Alertas', String(metrics.alerts), `${metrics.criticalAlerts} críticas`, metrics.trends.alerts.text, rangeLabel, stamp],
    ['Aprobaciones', String(metrics.approvals), 'Pendientes de revisión', metrics.trends.approvals.text, rangeLabel, stamp],
    ['SLA global', `${metrics.sla}%`, '18 servicios monitorizados', metrics.trends.sla.text, rangeLabel, stamp],
    ['CI/CD', String(metrics.cicd), 'Builds en curso', metrics.trends.cicd.text, rangeLabel, stamp],
  ]

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `tablero-cloudops-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
