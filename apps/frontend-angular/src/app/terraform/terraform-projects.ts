import type { CloudProvider } from '../core/models/api.models'

export type TerraformProjectStatus = 'healthy' | 'drift' | 'failed' | 'syncing' | 'draft'

export interface TerraformProjectEnv {
  id: string
  label: string
  workspace: string
  workspaceId: string
  status: string
}

export interface TerraformProjectModule {
  name: string
  source: string
  version: string
}

export interface TerraformProject {
  id: string
  name: string
  folderId: string
  workspaceId: string
  workspaceIds: string[]
  description: string
  providers: CloudProvider[]
  stateBackend: string
  complianceTier: string
  environments: TerraformProjectEnv[]
  modules: TerraformProjectModule[]
  automationsCount: number
  deploymentsCount: number
  lastDeploy: string
  savedAt: string
  status: TerraformProjectStatus
  tags: string[]
}

export const projectWorkspaceIds = (project: TerraformProject): string[] => {
  if (project.workspaceIds.length) return project.workspaceIds
  const fromEnvs = project.environments.map((e) => e.workspaceId).filter(Boolean)
  return fromEnvs.length ? fromEnvs : [project.workspaceId]
}

export const findProjectByWorkspaceId = (
  projects: TerraformProject[],
  workspaceId: string,
): TerraformProject | undefined =>
  projects.find(
    (p) =>
      p.workspaceId === workspaceId ||
      p.workspaceIds.includes(workspaceId) ||
      p.environments.some((e) => e.workspaceId === workspaceId),
  )

export type TerraformAutomationTrigger = 'cron' | 'webhook' | 'git-push' | 'manual'

export interface TerraformAutomation {
  id: string
  projectId: string
  projectName: string
  folderId: string
  name: string
  trigger: TerraformAutomationTrigger
  schedule?: string
  action: 'plan' | 'apply' | 'plan-apply'
  environment: string
  enabled: boolean
  lastRun: string
  nextRun?: string
  status: string
}

export interface TerraformDeploymentRecord {
  id: string
  projectId: string
  projectName: string
  environment: string
  action: string
  status: string
  triggeredBy: string
  duration: string
  createdAt: string
  changesSummary: string
}

export const TERRAFORM_HUB_TABS = [
  { id: 'deploy', label: 'Desplegar', icon: 'code' },
  { id: 'launches', label: 'Lanzamientos', icon: 'rocket_launch' },
  { id: 'project', label: 'Proyecto', icon: 'folder_special' },
  { id: 'automate', label: 'Automatizar', icon: 'schedule' },
  { id: 'history', label: 'Historial', icon: 'history' },
  { id: 'modules', label: 'Módulos', icon: 'extension' },
] as const

export type TerraformHubTabId = (typeof TERRAFORM_HUB_TABS)[number]['id']

export const defaultTerraformProjects = (): TerraformProject[] => [
  {
    id: 'proj-api-gateway',
    name: 'API Gateway',
    folderId: 'apps',
    workspaceId: 'ws-aws-prod',
    workspaceIds: ['ws-aws-stg', 'ws-aws-prod'],
    description: 'Despliegue multi-AZ del API gateway con ALB, autoscaling y secrets en Vault.',
    providers: ['AWS'],
    stateBackend: 's3',
    complianceTier: 'pci',
    environments: [
      { id: 'dev', label: 'development', workspace: 'aws-staging', workspaceId: 'ws-aws-stg', status: 'APPLIED' },
      { id: 'stg', label: 'staging', workspace: 'aws-staging', workspaceId: 'ws-aws-stg', status: 'APPLIED' },
      { id: 'prod', label: 'production', workspace: 'aws-production', workspaceId: 'ws-aws-prod', status: 'PLANNED' },
    ],
    modules: [
      { name: 'vpc', source: 'terraform-aws-modules/vpc/aws', version: '5.1.1' },
      { name: 'eks', source: 'terraform-aws-modules/eks/aws', version: '19.15.3' },
      { name: 'alb', source: './modules/alb', version: 'local' },
    ],
    automationsCount: 3,
    deploymentsCount: 48,
    lastDeploy: new Date(Date.now() - 3600000).toISOString(),
    savedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'healthy',
    tags: ['tier-1', 'pci'],
  },
  {
    id: 'proj-analytics',
    name: 'Analytics GCP',
    folderId: 'infra',
    workspaceId: 'ws-gcp',
    workspaceIds: ['ws-gcp'],
    description: 'Cluster de analítica en GCP con BigQuery export y node pools dedicados.',
    providers: ['GCP'],
    stateBackend: 'gcs',
    complianceTier: 'standard',
    environments: [
      { id: 'stg', label: 'staging', workspace: 'gcp-analytics', workspaceId: 'ws-gcp', status: 'APPLIED' },
      { id: 'prod', label: 'production', workspace: 'gcp-analytics', workspaceId: 'ws-gcp', status: 'APPLIED' },
    ],
    modules: [
      { name: 'gke', source: 'terraform-google-modules/kubernetes-engine', version: '29.0.0' },
      { name: 'bq', source: './modules/bigquery', version: 'local' },
    ],
    automationsCount: 2,
    deploymentsCount: 22,
    lastDeploy: new Date(Date.now() - 86400000).toISOString(),
    savedAt: new Date(Date.now() - 172800000).toISOString(),
    status: 'drift',
    tags: ['data', 'gcp'],
  },
  {
    id: 'proj-postgres',
    name: 'PostgreSQL HA',
    folderId: 'data',
    workspaceId: 'ws-data-pg',
    workspaceIds: ['ws-data-pg'],
    description: 'Base de datos gestionada con réplicas de lectura y backups automatizados.',
    providers: ['AWS'],
    stateBackend: 's3',
    complianceTier: 'hipaa',
    environments: [
      { id: 'prod', label: 'production', workspace: 'postgres-ha', workspaceId: 'ws-data-pg', status: 'APPLIED' },
    ],
    modules: [
      { name: 'rds', source: 'terraform-aws-modules/rds/aws', version: '6.3.0' },
    ],
    automationsCount: 1,
    deploymentsCount: 12,
    lastDeploy: new Date(Date.now() - 172800000).toISOString(),
    savedAt: new Date(Date.now() - 604800000).toISOString(),
    status: 'healthy',
    tags: ['database', 'rds'],
  },
  {
    id: 'proj-security',
    name: 'Security baseline',
    folderId: 'security',
    workspaceId: 'ws-sec-scan',
    workspaceIds: ['ws-sec-scan'],
    description: 'Políticas IAM, escaneo de compliance y hardening de cuentas cloud.',
    providers: ['AWS', 'AZURE'],
    stateBackend: 'terraform-cloud',
    complianceTier: 'standard',
    environments: [
      { id: 'global', label: 'global', workspace: 'security-scan', workspaceId: 'ws-sec-scan', status: 'RUNNING' },
    ],
    modules: [
      { name: 'iam', source: './modules/iam-baseline', version: 'local' },
      { name: 'config', source: 'terraform-aws-modules/config/aws', version: '1.4.0' },
    ],
    automationsCount: 4,
    deploymentsCount: 31,
    lastDeploy: new Date(Date.now() - 7200000).toISOString(),
    savedAt: new Date(Date.now() - 259200000).toISOString(),
    status: 'syncing',
    tags: ['security', 'compliance'],
  },
]

export const defaultTerraformAutomations = (): TerraformAutomation[] => [
  {
    id: 'auto-1',
    projectId: 'proj-api-gateway',
    projectName: 'API Gateway',
    folderId: 'apps',
    name: 'Nightly plan staging',
    trigger: 'cron',
    schedule: '0 2 * * *',
    action: 'plan',
    environment: 'staging',
    enabled: true,
    lastRun: new Date(Date.now() - 43200000).toISOString(),
    nextRun: 'Hoy 02:00',
    status: 'SUCCESS',
  },
  {
    id: 'auto-2',
    projectId: 'proj-api-gateway',
    projectName: 'API Gateway',
    folderId: 'apps',
    name: 'Apply prod con aprobación',
    trigger: 'manual',
    action: 'plan-apply',
    environment: 'production',
    enabled: true,
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    nextRun: 'Tras aprobación',
    status: 'PENDING',
  },
  {
    id: 'auto-3',
    projectId: 'proj-analytics',
    projectName: 'Analytics GCP',
    folderId: 'infra',
    name: 'Webhook push main',
    trigger: 'git-push',
    action: 'plan-apply',
    environment: 'staging',
    enabled: true,
    lastRun: new Date(Date.now() - 86400000).toISOString(),
    nextRun: 'En push a main',
    status: 'SUCCESS',
  },
  {
    id: 'auto-4',
    projectId: 'proj-security',
    projectName: 'Security baseline',
    folderId: 'security',
    name: 'Compliance scan semanal',
    trigger: 'cron',
    schedule: '0 6 * * 1',
    action: 'plan',
    environment: 'global',
    enabled: true,
    lastRun: new Date(Date.now() - 604800000).toISOString(),
    nextRun: 'Lun 06:00',
    status: 'SUCCESS',
  },
  {
    id: 'auto-5',
    projectId: 'proj-postgres',
    projectName: 'PostgreSQL HA',
    folderId: 'data',
    name: 'Backup verify',
    trigger: 'cron',
    schedule: '0 4 * * *',
    action: 'apply',
    environment: 'production',
    enabled: false,
    lastRun: new Date(Date.now() - 172800000).toISOString(),
    status: 'DISABLED',
  },
]

export const defaultTerraformDeployments = (): TerraformDeploymentRecord[] => [
  {
    id: 'dep-1',
    projectId: 'proj-api-gateway',
    projectName: 'API Gateway',
    environment: 'production',
    action: 'apply',
    status: 'APPLIED',
    triggeredBy: 'admin@cloudops.local',
    duration: '8m 12s',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    changesSummary: '+2 recursos · ~1 modificados',
  },
  {
    id: 'dep-2',
    projectId: 'proj-api-gateway',
    projectName: 'API Gateway',
    environment: 'staging',
    action: 'plan',
    status: 'PLANNED',
    triggeredBy: 'auto: Nightly plan',
    duration: '2m 04s',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    changesSummary: 'Plan: 1 add, 0 change',
  },
  {
    id: 'dep-3',
    projectId: 'proj-analytics',
    projectName: 'Analytics GCP',
    environment: 'production',
    action: 'apply',
    status: 'FAILED',
    triggeredBy: 'webhook',
    duration: '4m 51s',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    changesSummary: 'Error: quota exceeded',
  },
  {
    id: 'dep-4',
    projectId: 'proj-security',
    projectName: 'Security baseline',
    environment: 'global',
    action: 'plan-apply',
    status: 'RUNNING',
    triggeredBy: 'cron',
    duration: '—',
    createdAt: new Date(Date.now() - 300000).toISOString(),
    changesSummary: 'En ejecución…',
  },
]

export const projectStatusLabel = (s: TerraformProjectStatus): string => {
  const map: Record<TerraformProjectStatus, string> = {
    healthy: 'Saludable',
    drift: 'Drift detectado',
    failed: 'Error',
    syncing: 'Sincronizando',
    draft: 'Borrador',
  }
  return map[s] ?? s
}

export const triggerLabel = (t: TerraformAutomationTrigger): string => {
  const map: Record<TerraformAutomationTrigger, string> = {
    cron: 'Programado',
    webhook: 'Webhook',
    'git-push': 'Push Git',
    manual: 'Manual',
  }
  return map[t] ?? t
}
