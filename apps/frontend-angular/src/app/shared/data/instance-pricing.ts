import { CloudProvider } from '../../core/models/api.models'

export type LaunchProvider = Exclude<CloudProvider, 'VPS'>

export interface InstancePriceRow {
  type: string
  vcpus: number
  ramGb: number
  network: string
  hourlyUsd: number
}

const AWS_PRICES: Record<string, InstancePriceRow> = {
  't3.micro': { type: 't3.micro', vcpus: 2, ramGb: 1, network: 'Low', hourlyUsd: 0.0104 },
  't3.small': { type: 't3.small', vcpus: 2, ramGb: 2, network: 'Low', hourlyUsd: 0.0208 },
  't3.medium': { type: 't3.medium', vcpus: 2, ramGb: 4, network: 'Low', hourlyUsd: 0.0416 },
  't3.large': { type: 't3.large', vcpus: 2, ramGb: 8, network: 'Low', hourlyUsd: 0.0832 },
  't4g.medium': { type: 't4g.medium', vcpus: 2, ramGb: 4, network: 'Low', hourlyUsd: 0.0336 },
  'm6i.large': { type: 'm6i.large', vcpus: 2, ramGb: 8, network: 'Up to 12.5 Gbps', hourlyUsd: 0.096 },
  'c6i.large': { type: 'c6i.large', vcpus: 2, ramGb: 4, network: 'Up to 12.5 Gbps', hourlyUsd: 0.085 },
  'c7g.large': { type: 'c7g.large', vcpus: 2, ramGb: 4, network: 'Up to 15 Gbps', hourlyUsd: 0.0721 },
  'r6i.large': { type: 'r6i.large', vcpus: 2, ramGb: 16, network: 'Up to 12.5 Gbps', hourlyUsd: 0.126 },
}

const GCP_PRICES: Record<string, InstancePriceRow> = {
  'e2-micro': { type: 'e2-micro', vcpus: 2, ramGb: 1, network: '1 Gbps', hourlyUsd: 0.0084 },
  'e2-small': { type: 'e2-small', vcpus: 2, ramGb: 2, network: '1 Gbps', hourlyUsd: 0.0168 },
  'e2-medium': { type: 'e2-medium', vcpus: 2, ramGb: 4, network: '2 Gbps', hourlyUsd: 0.0335 },
  'n2-standard-2': { type: 'n2-standard-2', vcpus: 2, ramGb: 8, network: '10 Gbps', hourlyUsd: 0.0971 },
  'c2-standard-4': { type: 'c2-standard-4', vcpus: 4, ramGb: 16, network: '32 Gbps', hourlyUsd: 0.2088 },
  'n2-highmem-2': { type: 'n2-highmem-2', vcpus: 2, ramGb: 16, network: '10 Gbps', hourlyUsd: 0.1186 },
}

const AZURE_PRICES: Record<string, InstancePriceRow> = {
  'Standard_B1s': { type: 'Standard_B1s', vcpus: 1, ramGb: 1, network: 'Low', hourlyUsd: 0.0104 },
  'Standard_B2s': { type: 'Standard_B2s', vcpus: 2, ramGb: 4, network: 'Moderate', hourlyUsd: 0.0416 },
  'Standard_D2s_v3': { type: 'Standard_D2s_v3', vcpus: 2, ramGb: 8, network: 'Moderate', hourlyUsd: 0.096 },
  'Standard_D4s_v3': { type: 'Standard_D4s_v3', vcpus: 4, ramGb: 16, network: 'High', hourlyUsd: 0.192 },
  'Standard_E2s_v3': { type: 'Standard_E2s_v3', vcpus: 2, ramGb: 16, network: 'Moderate', hourlyUsd: 0.126 },
  'Standard_F2s_v2': { type: 'Standard_F2s_v2', vcpus: 2, ramGb: 4, network: 'Moderate', hourlyUsd: 0.085 },
}

export const INSTANCE_PRICING: Record<LaunchProvider, Record<string, InstancePriceRow>> = {
  AWS: AWS_PRICES,
  GCP: GCP_PRICES,
  AZURE: AZURE_PRICES,
}

export const HOURS_PER_MONTH = 730
