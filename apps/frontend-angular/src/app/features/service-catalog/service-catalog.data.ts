import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export type ServiceCatalogCategory =
  | 'instance'
  | 'terraform'
  | 'jenkins'
  | 'docker'
  | 'kubernetes'

export type ServiceCatalogStatus = 'published' | 'draft' | 'deprecated'

export type ServiceCatalogCloud = 'aws' | 'gcp' | 'azure'

export type ServiceCatalogEnvironment = 'production' | 'staging' | 'development'

export interface ServiceCatalogTemplate {
  id: string
  name: string
  description: string
  category: ServiceCatalogCategory
  cloud: ServiceCatalogCloud
  techLogo: NavLogoKey
  version: string
  owner: string
  status: ServiceCatalogStatus
  tags: string[]
  launches30d: number
  avgProvision: string
  updatedAt: string
  requiresApproval: boolean
  environment?: ServiceCatalogEnvironment
  parameters?: string
  documentationUrl?: string
  estimatedCost?: string
  resourcesCreated?: string[]
  provisionSteps?: string[]
  successRate?: number
  contactEmail?: string
}

export interface ServiceCatalogLaunch {
  id: string
  templateId: string
  templateName: string
  user: string
  cloud: ServiceCatalogCloud
  category: ServiceCatalogCategory
  launchedAt: string
  duration: string
  status: 'success' | 'running' | 'failed'
  environment?: ServiceCatalogEnvironment
  parameters?: string
  resourceId?: string
  output?: string
  triggeredBy?: string
  templateVersion?: string
  progress?: number
  errorMessage?: string
}

export const SERVICE_CATALOG_CATEGORY_LABELS: Record<ServiceCatalogCategory, string> = {
  instance: 'Instancia',
  terraform: 'Terraform',
  jenkins: 'Jenkins',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
}

export const SERVICE_CATALOG_STATUS_LABELS: Record<ServiceCatalogStatus, string> = {
  published: 'Publicada',
  draft: 'Borrador',
  deprecated: 'Obsoleta',
}

export const SERVICE_CATALOG_CLOUD_LABELS: Record<ServiceCatalogCloud, string> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
}

export const SERVICE_CATALOG_ENVIRONMENT_LABELS: Record<ServiceCatalogEnvironment, string> = {
  production: 'Producción',
  staging: 'Staging',
  development: 'Desarrollo',
}

const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()

const tplExtras = (
  environment: ServiceCatalogEnvironment,
  parameters: string,
  estimatedCost: string,
  resourcesCreated: string[],
  provisionSteps: string[],
  successRate: number,
  documentationUrl?: string,
  contactEmail?: string,
) => ({
  environment,
  parameters,
  estimatedCost,
  resourcesCreated,
  provisionSteps,
  successRate,
  documentationUrl,
  contactEmail,
})

export const defaultServiceCatalogTemplates = (): ServiceCatalogTemplate[] => []

export const defaultServiceCatalogLaunches = (): ServiceCatalogLaunch[] => []
