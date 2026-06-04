import { Injectable } from '@angular/core'
import {
  HOURS_PER_MONTH,
  INSTANCE_PRICING,
  InstancePriceRow,
  LaunchProvider,
} from '../../shared/data/instance-pricing'

export interface CostEstimate {
  hourly: number
  monthly: number
  row: InstancePriceRow | null
}

@Injectable({ providedIn: 'root' })
export class InstancePricingService {
  estimateCost = (provider: LaunchProvider, instanceType: string): CostEstimate => {
    const table = INSTANCE_PRICING[provider]
    const row = table[instanceType] ?? null
    const hourly = row?.hourlyUsd ?? 0.08
    const monthly = Math.round(hourly * HOURS_PER_MONTH * 100) / 100
    return { hourly, monthly, row }
  }

  listTypes = (provider: LaunchProvider): InstancePriceRow[] =>
    Object.values(INSTANCE_PRICING[provider])
}
