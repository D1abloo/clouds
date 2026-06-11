export type InstancePricingRow = {
  pricePerHour?: number
  pricePerMinute?: number
  vcpus?: number
  memoryGb?: number
}

export const estimateHourlyFromSpecs = (t: InstancePricingRow): number => {
  if (t.pricePerHour != null && t.pricePerHour > 0) return t.pricePerHour
  const v = t.vcpus ?? 2
  const m = t.memoryGb ?? 4
  return Math.round((0.012 * v + 0.006 * m) * 10000) / 10000
}

export const hourlyToMinute = (hourly: number): number => Math.round((hourly / 60) * 1000000) / 1000000

export const formatUsd = (n: number, digits = 4): string => `$${n.toFixed(digits)}`

export const instancePriceLabels = (
  t: InstancePricingRow,
  locale: 'es' | 'en' = 'es',
): { hourly: string; minute: string; monthly: string } => {
  const hourly = estimateHourlyFromSpecs(t)
  const minute = t.pricePerMinute ?? hourlyToMinute(hourly)
  const monthly = hourly * 730
  if (locale === 'en') {
    return {
      hourly: `${formatUsd(hourly)}/hr`,
      minute: `${formatUsd(minute, 6)}/min`,
      monthly: `~${formatUsd(monthly, 0)}/mo`,
    }
  }
  return {
    hourly: `${formatUsd(hourly)}/h`,
    minute: `${formatUsd(minute, 6)}/min`,
    monthly: `~${formatUsd(monthly, 0)}/mes`,
  }
}
