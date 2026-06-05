import type { DashboardInstanceRow } from '../dashboard.models'

export type ChartPoint = { label: string; value: number }

export interface InstanceTrendChart {
  instance: DashboardInstanceRow
  cpu: ChartPoint[]
  ram: ChartPoint[]
  cpuPeak: number
  ramPeak: number
}

const TIME_LABELS = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']

const CPU_PROFILES = [
  [38, 34, 48, 68, 62, 44],
  [52, 48, 55, 78, 71, 58],
  [41, 39, 51, 74, 69, 47],
  [45, 42, 58, 82, 76, 52],
  [33, 30, 42, 61, 55, 38],
  [48, 44, 60, 85, 79, 55],
]

const RAM_PROFILES = [
  [55, 50, 58, 76, 72, 60],
  [62, 58, 65, 82, 78, 66],
  [51, 48, 56, 74, 70, 58],
  [58, 54, 63, 80, 76, 64],
  [49, 46, 54, 70, 66, 55],
  [64, 60, 68, 86, 82, 70],
]

const instanceSeed = (id: string): number =>
  id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)

const statusBias = (status?: string): number => {
  if (status === 'ERROR') return 12
  if (status === 'WARNING') return 8
  if (status === 'STOPPED') return -18
  return 0
}

export const buildInstanceTrendChart = (
  instance: DashboardInstanceRow,
  rangeMult = 1,
): InstanceTrendChart => {
  const seed = instanceSeed(instance.id)
  const cpuProfile = CPU_PROFILES[seed % CPU_PROFILES.length]
  const ramProfile = RAM_PROFILES[seed % RAM_PROFILES.length]
  const bias = statusBias(instance.status)
  const coresFactor = Math.min((instance.cpuCores ?? 4) / 4, 1.4)

  const cpu = TIME_LABELS.map((label, i) => ({
    label,
    value: Math.min(
      99,
      Math.max(
        5,
        Math.round((cpuProfile[i] + bias) * rangeMult * coresFactor),
      ),
    ),
  }))

  const ram = TIME_LABELS.map((label, i) => ({
    label,
    value: Math.min(
      99,
      Math.max(
        5,
        Math.round((ramProfile[i] + bias * 0.8) * rangeMult),
      ),
    ),
  }))

  return {
    instance,
    cpu,
    ram,
    cpuPeak: Math.max(...cpu.map((point) => point.value)),
    ramPeak: Math.max(...ram.map((point) => point.value)),
  }
}

export const buildInstanceTrendCharts = (
  instances: DashboardInstanceRow[],
  rangeMult = 1,
): InstanceTrendChart[] =>
  instances.map((instance) => buildInstanceTrendChart(instance, rangeMult))
