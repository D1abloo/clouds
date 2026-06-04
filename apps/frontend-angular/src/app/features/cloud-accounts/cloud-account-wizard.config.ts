import type { CloudProvider } from '../../core/models/api.models'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export type WizardStep = 'provider' | 'credentials' | 'review'

export interface CloudProviderWizardCard {
  id: CloudProvider
  name: string
  shortName: string
  description: string
  credentialsSummary: string
  permissionsSummary: string[]
  logo: NavLogoKey
  toneClass: string
}

export const CLOUD_WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'provider', label: 'Proveedor' },
  { id: 'credentials', label: 'Conexión' },
  { id: 'review', label: 'Revisión' },
]

export const CLOUD_PROVIDER_CARDS: CloudProviderWizardCard[] = [
  {
    id: 'AWS',
    name: 'Amazon Web Services',
    shortName: 'AWS',
    description: 'Sincroniza cuentas, regiones, EC2, VPC, métricas CloudWatch y costes con Cost Explorer.',
    credentialsSummary: 'IAM Role (ARN), Access Key + Secret u OIDC federado',
    permissionsSummary: [
      'ec2:DescribeInstances, Start/Stop',
      'cloudwatch:GetMetricData',
      'ce:GetCostAndUsage',
      'ec2:DescribeVpcs, DescribeSecurityGroups',
    ],
    logo: 'aws',
    toneClass: 'provider-card--aws',
  },
  {
    id: 'GCP',
    name: 'Google Cloud Platform',
    shortName: 'Google Cloud',
    description: 'Conecta proyectos GCP, zonas, instancias Compute, Monitoring y facturación BigQuery.',
    credentialsSummary: 'Service Account JSON o Workload Identity / OIDC',
    permissionsSummary: [
      'compute.instances.list',
      'compute.instances.start/stop',
      'monitoring.timeSeries.list',
      'billing.accounts.getSpend',
    ],
    logo: 'gcp',
    toneClass: 'provider-card--gcp',
  },
  {
    id: 'AZURE',
    name: 'Microsoft Azure',
    shortName: 'Azure',
    description: 'Gestiona suscripciones, resource groups, VMs, Azure Monitor y Cost Management.',
    credentialsSummary: 'App Registration (Client ID + Secret) o Managed Identity',
    permissionsSummary: [
      'Microsoft.Compute/virtualMachines/read',
      'Microsoft.Compute/virtualMachines/start/action',
      'Microsoft.Insights/metrics/read',
      'Microsoft.CostManagement/query',
    ],
    logo: 'azure',
    toneClass: 'provider-card--azure',
  },
]

export const providerCard = (id: CloudProvider): CloudProviderWizardCard | undefined =>
  CLOUD_PROVIDER_CARDS.find((c) => c.id === id)

export const credentialTypeLabel = (provider: CloudProvider, type: string): string => {
  const map: Record<string, Record<string, string>> = {
    AWS: {
      iam_role: 'IAM Role (ARN)',
      access_key: 'Access Key + Secret',
      oidc: 'OIDC / SSO',
      demo: 'Modo demo (sin SDK)',
    },
    GCP: {
      service_account: 'Service Account (JSON)',
      workload_identity: 'Workload Identity / OIDC',
      demo: 'Modo demo (sin SDK)',
    },
    AZURE: {
      client_secret: 'Client ID + Secret',
      managed_identity: 'Managed Identity',
      demo: 'Modo demo (sin SDK)',
    },
  }
  return map[provider]?.[type] ?? type
}
