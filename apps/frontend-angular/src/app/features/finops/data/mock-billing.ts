export type FinopsCloudProvider = 'AWS' | 'GCP' | 'Azure' | 'IONOS'

export interface FinopsInvoice {
  id: string
  provider: FinopsCloudProvider
  account: string
  period: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'overdue'
  services: string[]
}

export const FINOPS_INVOICES: FinopsInvoice[] = [
  { id: 'inv-aws-2025-05', provider: 'AWS', account: 'prod-payments (123456789012)', period: 'Mayo 2025', amount: 18420.55, currency: 'EUR', status: 'paid', services: ['EC2', 'RDS', 'S3', 'CloudWatch'] },
  { id: 'inv-gcp-2025-05', provider: 'GCP', account: 'analytics-prod', period: 'Mayo 2025', amount: 9280.12, currency: 'EUR', status: 'paid', services: ['Compute Engine', 'BigQuery', 'GKE'] },
  { id: 'inv-az-2025-05', provider: 'Azure', account: 'corp-subscription-01', period: 'Mayo 2025', amount: 11240.0, currency: 'EUR', status: 'pending', services: ['Virtual Machines', 'SQL Database', 'Storage'] },
  { id: 'inv-aws-2025-04', provider: 'AWS', account: 'staging-shared', period: 'Abril 2025', amount: 4210.88, currency: 'EUR', status: 'paid', services: ['EC2', 'ELB', 'Route53'] },
  { id: 'inv-gcp-2025-04', provider: 'GCP', account: 'dev-sandbox', period: 'Abril 2025', amount: 1890.44, currency: 'EUR', status: 'paid', services: ['Compute Engine', 'Cloud Storage'] },
  { id: 'inv-az-2025-04', provider: 'Azure', account: 'corp-subscription-01', period: 'Abril 2025', amount: 9870.2, currency: 'EUR', status: 'overdue', services: ['Virtual Machines', 'App Service'] },
]

export const FINOPS_BILLING_CHART = [
  { label: 'AWS', value: 18420 },
  { label: 'GCP', value: 9280 },
  { label: 'Azure', value: 11240 },
  { label: 'IONOS', value: 0 },
]
