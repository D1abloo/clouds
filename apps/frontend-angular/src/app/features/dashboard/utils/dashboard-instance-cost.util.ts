import type { DashboardInstanceRow } from '../dashboard.models'

interface ProviderRates {
  cpuPerMin: number
  ramGbPerMin: number
  diskGbPerMin: number
}

const PROVIDER_RATES: Record<string, ProviderRates> = {
  AWS: { cpuPerMin: 0.00034, ramGbPerMin: 0.000048, diskGbPerMin: 0.000011 },
  GCP: { cpuPerMin: 0.00029, ramGbPerMin: 0.000041, diskGbPerMin: 0.0000095 },
  AZURE: { cpuPerMin: 0.00031, ramGbPerMin: 0.000044, diskGbPerMin: 0.000010 },
  VPS: { cpuPerMin: 0.00016, ramGbPerMin: 0.000024, diskGbPerMin: 0.0000055 },
}

const INSTANCE_TYPE_FACTOR: Record<string, number> = {
  't3.medium': 1,
  't3.large': 1.35,
  't3.xlarge': 1.85,
  'n2-standard-4': 1.25,
  'n2-standard-8': 1.75,
  'Standard_D4s_v3': 1.2,
  'Standard_D8s_v3': 1.65,
  'bare-metal': 0.85,
}

const providerRates = (provider: string): ProviderRates =>
  PROVIDER_RATES[provider] ?? { cpuPerMin: 0.00022, ramGbPerMin: 0.000032, diskGbPerMin: 0.000008 }

const instanceTypeFactor = (instanceType?: string): number => {
  if (!instanceType) return 1
  return INSTANCE_TYPE_FACTOR[instanceType] ?? 1.05
}

const statusFactor = (status?: string): number => {
  if (status === 'STOPPED') return 0
  if (status === 'WARNING' || status === 'ERROR') return 1.06
  return 1
}

/** Coste por minuto estimado según proveedor cloud y hardware (vCPU, RAM, disco). */
export const computeInstanceCostPerMinute = (row: DashboardInstanceRow): number => {
  const cpu = row.cpuCores ?? 2
  const ram = row.ramGb ?? 8
  const disk = row.diskGb ?? 50
  const rates = providerRates(row.provider)
  const hardware =
    cpu * rates.cpuPerMin + ram * rates.ramGbPerMin + disk * rates.diskGbPerMin
  const fromMonthly =
    row.monthlyCost != null ? row.monthlyCost / (30 * 24 * 60) : null
  const computed = hardware * instanceTypeFactor(row.instanceType) * statusFactor(row.status)
  if (fromMonthly == null) return computed
  return computed * 0.55 + fromMonthly * 0.45
}

export const formatCostPerMinute = (value: number): string => {
  const fmt = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 0.01 ? 4 : 3,
    maximumFractionDigits: value < 0.01 ? 4 : 3,
  })
  return `${fmt.format(value)}/min`
}

export const costPerMinuteBreakdown = (row: DashboardInstanceRow): string => {
  const cpu = row.cpuCores ?? 2
  const ram = row.ramGb ?? 8
  const disk = row.diskGb ?? 50
  return `${row.provider} · ${cpu} vCPU · ${ram} GB RAM · ${disk} GB · ${row.instanceType ?? '—'}`
}
