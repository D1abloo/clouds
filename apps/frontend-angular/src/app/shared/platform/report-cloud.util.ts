import type { NavLogoKey } from '../theme/nav-logo.types'

export type ReportCloudProvider = 'aws' | 'gcp' | 'azure'

export type ReportCloudMeta = {
  id: ReportCloudProvider
  label: string
  shortLabel: string
  productLabel: string
  logo: NavLogoKey
  accent: string
  accentDeep: string
  billingSource: string
  regionsLabel: string
}

export const REPORT_CLOUD_META: Record<ReportCloudProvider, ReportCloudMeta> = {
  aws: {
    id: 'aws',
    label: 'Amazon Web Services',
    shortLabel: 'AWS',
    productLabel: 'AWS Cost Explorer',
    logo: 'aws',
    accent: '#FF9900',
    accentDeep: '#C2410C',
    billingSource: 'AWS Cost Explorer · CUR · Cost Anomaly Detection',
    regionsLabel: 'eu-west-1, us-east-1, eu-central-1',
  },
  gcp: {
    id: 'gcp',
    label: 'Google Cloud Platform',
    shortLabel: 'GCP',
    productLabel: 'GCP Billing Export',
    logo: 'gcp',
    accent: '#4285F4',
    accentDeep: '#1a73e8',
    billingSource: 'Cloud Billing · BigQuery export · Recommender',
    regionsLabel: 'europe-west1, us-central1',
  },
  azure: {
    id: 'azure',
    label: 'Microsoft Azure',
    shortLabel: 'Azure',
    productLabel: 'Azure Cost Management',
    logo: 'azure',
    accent: '#0078D4',
    accentDeep: '#005a9e',
    billingSource: 'Azure Cost Management + Billing · Advisor',
    regionsLabel: 'West Europe, East US',
  },
}

export const resolveReportCloud = (row?: Record<string, unknown>): ReportCloudProvider => {
  const c = String(row?.['cloud'] ?? '').toLowerCase()
  if (c === 'gcp' || c === 'google') return 'gcp'
  if (c === 'azure' || c === 'microsoft') return 'azure'
  if (c === 'aws' || c === 'amazon') return 'aws'
  const name = String(row?.['name'] ?? '').toLowerCase()
  if (name.includes('gcp') || name.includes('google')) return 'gcp'
  if (name.includes('azure') || name.includes('microsoft')) return 'azure'
  if (name.includes('aws') || name.includes('amazon')) return 'aws'
  return 'aws'
}

export const cloudMeta = (cloud: ReportCloudProvider): ReportCloudMeta => REPORT_CLOUD_META[cloud]
