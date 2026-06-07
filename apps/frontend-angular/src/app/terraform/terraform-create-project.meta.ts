import type { CloudProvider } from '../core/models/api.models'

export interface ProjectEnvPreset {
  id: string
  label: string
  workspaceSuffix: string
}

export const PROJECT_ENV_PRESETS: ProjectEnvPreset[] = [
  { id: 'dev', label: 'Development', workspaceSuffix: 'dev' },
  { id: 'staging', label: 'Staging', workspaceSuffix: 'stg' },
  { id: 'prod', label: 'Production', workspaceSuffix: 'prod' },
]

export const PROJECT_STATE_BACKENDS: { id: string; label: string; providers: CloudProvider[] }[] = [
  { id: 's3', label: 'S3 + DynamoDB (AWS)', providers: ['AWS'] },
  { id: 'gcs', label: 'GCS + Cloud Storage (GCP)', providers: ['GCP'] },
  { id: 'azurerm', label: 'Azure Storage (Azure)', providers: ['AZURE'] },
  { id: 'terraform-cloud', label: 'Terraform Cloud (remoto)', providers: ['AWS', 'GCP', 'AZURE'] },
]

export const PROJECT_COMPLIANCE_TIERS = [
  { id: 'standard', label: 'Estándar', hint: 'Buenas prácticas base' },
  { id: 'pci', label: 'PCI-DSS', hint: 'Datos de pago' },
  { id: 'hipaa', label: 'HIPAA', hint: 'Datos de salud' },
] as const

export const defaultModulesForProvider = (
  provider: CloudProvider,
): { name: string; source: string; version: string }[] => {
  const info = PROVIDER_PROJECT_INFO[provider]
  if (provider === 'GCP') {
    return [
      { name: 'vpc', source: 'terraform-google-modules/network/google', version: '9.0.0' },
      { name: 'gke', source: 'terraform-google-modules/kubernetes-engine/google', version: '30.0.0' },
    ]
  }
  if (provider === 'AZURE') {
    return [
      { name: 'vnet', source: 'Azure/vnet/azurerm', version: '5.0.0' },
      { name: 'aks', source: 'Azure/aks/azurerm', version: '8.0.0' },
    ]
  }
  return [
    { name: 'vpc', source: 'terraform-aws-modules/vpc/aws', version: '5.1.1' },
    { name: 'core', source: info?.modules ?? 'terraform-aws-modules', version: 'latest' },
  ]
}

export const complianceTierLabel = (id: string): string =>
  PROJECT_COMPLIANCE_TIERS.find((t) => t.id === id)?.label ?? id

export const stateBackendLabel = (id: string): string =>
  PROJECT_STATE_BACKENDS.find((b) => b.id === id)?.label ?? id

export const buildStatePreview = (
  backendId: string,
  projectName: string,
  workspaceName: string,
): string => {
  const backend = PROJECT_STATE_BACKENDS.find((b) => b.id === backendId)
  const backendLabel = backend?.label ?? backendId
  const lineage = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'workspace'
  return `# Backend: ${backendLabel}
# Workspace: ${workspaceName}

terraform {
  backend "${backendId}" {
    # Configuración gestionada por CloudOps
    workspace_key_prefix = "${lineage}/"
  }
}

{
  "version": 4,
  "terraform_version": "1.7.0",
  "serial": 1,
  "lineage": "${lineage}",
  "backend": {
    "type": "${backendId}",
    "config": {}
  },
  "resources": []
}`
}

export const PROVIDER_PROJECT_INFO: Record<
  CloudProvider,
  { tagline: string; stateDefault: string; modules: string }
> = {
  AWS: {
    tagline: 'EC2, VPC, RDS, IAM',
    stateDefault: 's3',
    modules: 'terraform-aws-modules',
  },
  GCP: {
    tagline: 'GKE, Compute Engine, BigQuery',
    stateDefault: 'gcs',
    modules: 'terraform-google-modules',
  },
  AZURE: {
    tagline: 'VMs, VNet, AKS, Storage',
    stateDefault: 'azurerm',
    modules: 'Azure/azurerm',
  },
  VPS: { tagline: '—', stateDefault: 'terraform-cloud', modules: '—' },
}
