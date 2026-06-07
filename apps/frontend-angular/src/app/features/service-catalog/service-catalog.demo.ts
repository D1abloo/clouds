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

export const defaultServiceCatalogTemplates = (): ServiceCatalogTemplate[] => [
  {
    id: 'tpl-1',
    name: 'AWS web tier (t3.medium)',
    description: 'Auto Scaling Group con ALB, health checks y política de escalado para cargas web estándar.',
    category: 'instance',
    cloud: 'aws',
    techLogo: 'aws',
    version: 'v3.2',
    owner: 'platform-team',
    status: 'published',
    tags: ['web', 'asg', 'prod-ready'],
    launches30d: 14,
    avgProvision: '8 min',
    updatedAt: ago(2880),
    requiresApproval: false,
    ...tplExtras(
      'staging',
      'INSTANCE_TYPE=t3.medium\nMIN_SIZE=2\nMAX_SIZE=6\nREGION=eu-west-1',
      '~$180/mes',
      ['Auto Scaling Group', 'Application Load Balancer', 'Target Group', 'Launch Template'],
      ['Validar cuenta y región', 'Crear launch template', 'Provisionar ASG + ALB', 'Health check HTTP'],
      98,
      'https://wiki.cloudops.local/templates/aws-web-tier',
      'platform@cloudops.local',
    ),
  },
  {
    id: 'tpl-2',
    name: 'GCP GKE standard cluster',
    description: 'Cluster GKE regional con node pools separados para system y workloads, autoscaling habilitado.',
    category: 'kubernetes',
    cloud: 'gcp',
    techLogo: 'kubernetes',
    version: 'v2.1',
    owner: 'platform-team',
    status: 'published',
    tags: ['gke', 'regional', 'autoscale'],
    launches30d: 9,
    avgProvision: '18 min',
    updatedAt: ago(4320),
    requiresApproval: true,
    ...tplExtras(
      'production',
      'NODE_POOL_MIN=3\nNODE_POOL_MAX=12\nMACHINE_TYPE=e2-standard-4',
      '~$420/mes',
      ['GKE Cluster', 'Node Pool system', 'Node Pool workloads', 'Cloud NAT'],
      ['Crear VPC subnet', 'Provisionar cluster regional', 'Configurar node pools', 'Instalar addons'],
      96,
      undefined,
      'platform@cloudops.local',
    ),
  },
  {
    id: 'tpl-3',
    name: 'Pipeline CI/CD microservicios',
    description: 'Job Jenkins multibranch con stages de build, test, scan y deploy a staging/prod.',
    category: 'jenkins',
    cloud: 'aws',
    techLogo: 'jenkins',
    version: 'v5.0',
    owner: 'devops',
    status: 'published',
    tags: ['ci', 'cd', 'microservices'],
    launches30d: 22,
    avgProvision: '3 min',
    updatedAt: ago(1440),
    requiresApproval: false,
    ...tplExtras(
      'staging',
      'BRANCH=develop\nDEPLOY_ENV=staging\nRUN_TESTS=true',
      '—',
      ['Multibranch job', 'Webhook GitHub', 'Credencial deploy'],
      ['Registrar repositorio', 'Generar Jenkinsfile', 'Configurar webhook', 'Primer build'],
      94,
    ),
  },
  {
    id: 'tpl-4',
    name: 'Módulo Terraform VPC hub-spoke',
    description: 'VPC multi-AZ con subnets públicas/privadas, NAT gateway y endpoints de servicio reutilizable.',
    category: 'terraform',
    cloud: 'aws',
    techLogo: 'terraform',
    version: 'v1.4.2',
    owner: 'infra',
    status: 'published',
    tags: ['network', 'vpc', 'module'],
    launches30d: 7,
    avgProvision: '12 min',
    updatedAt: ago(7200),
    requiresApproval: true,
    ...tplExtras(
      'production',
      'CIDR=10.0.0.0/16\nAZ_COUNT=3\nENABLE_NAT=true',
      '~$95/mes NAT',
      ['VPC', 'Subnets públicas/privadas', 'NAT Gateway', 'VPC Endpoints S3/Dynamo'],
      ['terraform init', 'Plan + validación', 'Apply red base', 'Export outputs'],
      99,
    ),
  },
  {
    id: 'tpl-5',
    name: 'Stack Docker nginx + Redis',
    description: 'Compose con nginx reverse proxy, app sidecar y Redis para entornos de desarrollo o edge.',
    category: 'docker',
    cloud: 'azure',
    techLogo: 'docker',
    version: 'v1.8',
    owner: 'platform-team',
    status: 'published',
    tags: ['compose', 'edge', 'cache'],
    launches30d: 11,
    avgProvision: '5 min',
    updatedAt: ago(3600),
    requiresApproval: false,
    ...tplExtras(
      'development',
      'REPLICAS=2\nREDIS_MAXMEM=256mb\nNGINX_PORT=443',
      '~$40/mes',
      ['VM edge', 'Contenedor nginx', 'Contenedor redis', 'Volúmenes persistentes'],
      ['Pull imágenes', 'docker compose up', 'Verificar health', 'Registrar DNS'],
      97,
    ),
  },
  {
    id: 'tpl-6',
    name: 'Azure AKS production baseline',
    description: 'AKS con Azure CNI, Azure Monitor, pod identity y políticas de red calibradas para producción.',
    category: 'kubernetes',
    cloud: 'azure',
    techLogo: 'kubernetes',
    version: 'v1.0',
    owner: 'cloud-native',
    status: 'published',
    tags: ['aks', 'baseline', 'monitoring'],
    launches30d: 5,
    avgProvision: '22 min',
    updatedAt: ago(5760),
    requiresApproval: true,
    ...tplExtras(
      'production',
      'K8S_VERSION=1.29\nNODE_COUNT=5\nENABLE_MONITOR=true',
      '~$380/mes',
      ['AKS Cluster', 'Log Analytics', 'Managed Identity', 'Network Policy'],
      ['Crear resource group', 'Provisionar AKS', 'Habilitar monitor', 'Aplicar baseline'],
      95,
    ),
  },
  {
    id: 'tpl-7',
    name: 'RDS PostgreSQL multi-AZ',
    description: 'Instancia RDS PostgreSQL con backups automáticos, parámetros auditados y alarmas CloudWatch.',
    category: 'instance',
    cloud: 'aws',
    techLogo: 'postgresql',
    version: 'v2.3',
    owner: 'dba',
    status: 'published',
    tags: ['rds', 'postgres', 'ha'],
    launches30d: 6,
    avgProvision: '15 min',
    updatedAt: ago(8640),
    requiresApproval: true,
    ...tplExtras(
      'production',
      'ENGINE=postgres15\nINSTANCE_CLASS=db.r6g.large\nMULTI_AZ=true',
      '~$290/mes',
      ['RDS Instance', 'Subnet Group', 'Parameter Group', 'CloudWatch Alarms'],
      ['Crear subnet group', 'Provisionar RDS Multi-AZ', 'Configurar backups', 'Alarmas CPU/storage'],
      99,
    ),
  },
  {
    id: 'tpl-8b',
    name: 'Azure AKS dev cluster',
    description: 'Cluster Kubernetes de desarrollo con node pool básico y namespace por defecto.',
    category: 'kubernetes',
    cloud: 'azure',
    techLogo: 'kubernetes',
    version: 'v0.4',
    owner: 'cloud-native',
    status: 'draft',
    tags: ['k8s', 'dev', 'azure'],
    launches30d: 0,
    avgProvision: '25 min',
    updatedAt: ago(480),
    requiresApproval: false,
    environment: 'development',
    estimatedCost: '~$90/mes',
    parameters: 'NODE_COUNT=2\nVM_SIZE=Standard_D2s_v3',
    resourcesCreated: ['AKS Cluster', 'Node pool', 'Namespace workloads'],
    provisionSteps: ['Crear resource group', 'Provisionar AKS', 'Configurar kubectl', 'Namespace base'],
    successRate: 100,
    contactEmail: 'cloud-native@empresa.com',
  },
  {
    id: 'tpl-8',
    name: 'Terraform landing zone GCP',
    description: 'Organización, carpetas, proyectos shared y políticas IAM iniciales para nuevas cuentas GCP.',
    category: 'terraform',
    cloud: 'gcp',
    techLogo: 'terraform',
    version: 'v0.9',
    owner: 'infra',
    status: 'draft',
    tags: ['landing-zone', 'iam', 'org'],
    launches30d: 0,
    avgProvision: '35 min',
    updatedAt: ago(1200),
    requiresApproval: true,
    ...tplExtras(
      'production',
      'ORG_ID=123456789\nBILLING_ACCOUNT=XXXX\nFOLDERS=shared,prod',
      '—',
      ['Organization policies', 'Shared VPC host', 'Audit logging', 'IAM bindings'],
      ['Import org', 'Crear folders', 'Shared VPC', 'IAM baseline'],
      100,
    ),
  },
  {
    id: 'tpl-9',
    name: 'Job nightly drift scan',
    description: 'Pipeline Jenkins programado que ejecuta terraform plan y reporta drift a Slack.',
    category: 'jenkins',
    cloud: 'gcp',
    techLogo: 'jenkins',
    version: 'v3.1',
    owner: 'sre',
    status: 'published',
    tags: ['drift', 'terraform', 'nightly'],
    launches30d: 30,
    avgProvision: '2 min',
    updatedAt: ago(720),
    requiresApproval: false,
    ...tplExtras(
      'production',
      'WORKSPACES=all\nSLACK_CHANNEL=#infra-drift',
      '—',
      ['Pipeline job', 'Cron trigger', 'Slack notifier'],
      ['Validar credenciales TF', 'Plan por workspace', 'Publicar reporte'],
      91,
    ),
  },
  {
    id: 'tpl-10',
    name: 'VM bastion Azure (legacy)',
    description: 'Jump host Windows/Linux para acceso administrativo — sustituir por Private Link + SSM.',
    category: 'instance',
    cloud: 'azure',
    techLogo: 'azure',
    version: 'v1.0',
    owner: 'security',
    status: 'deprecated',
    tags: ['bastion', 'legacy'],
    launches30d: 1,
    avgProvision: '10 min',
    updatedAt: ago(43200),
    requiresApproval: true,
    ...tplExtras(
      'staging',
      'OS=ubuntu-22.04\nSIZE=Standard_B2s',
      '~$35/mes',
      ['Virtual Machine', 'NSG rules', 'Public IP'],
      ['Crear VM', 'Configurar NSG', 'Instalar agente'],
      88,
    ),
  },
]

export const defaultServiceCatalogLaunches = (): ServiceCatalogLaunch[] => [
  {
    id: 'launch-1',
    templateId: 'tpl-1',
    templateName: 'AWS web tier (t3.medium)',
    user: 'dev@cloudops.local',
    cloud: 'aws',
    category: 'instance',
    launchedAt: ago(45),
    duration: '7m 12s',
    status: 'success',
    environment: 'staging',
    templateVersion: 'v3.2',
    triggeredBy: 'manual',
    resourceId: 'asg-web-staging-042',
    parameters: 'INSTANCE_TYPE=t3.medium\nMIN_SIZE=2',
    output: '[ok] Launch template lt-web-v3 creado\n[ok] ASG asg-web-staging-042 activo (2/2 healthy)\n[ok] ALB web-staging-alb registrado',
  },
  {
    id: 'launch-2',
    templateId: 'tpl-5',
    templateName: 'Stack Docker nginx + Redis',
    user: 'ops@cloudops.local',
    cloud: 'azure',
    category: 'docker',
    launchedAt: ago(120),
    duration: '4m 50s',
    status: 'success',
    environment: 'development',
    templateVersion: 'v1.8',
    triggeredBy: 'api',
    resourceId: 'edge-vm-dev-07',
    output: '[ok] docker compose up -d\n[ok] nginx health 200\n[ok] redis PONG',
  },
  {
    id: 'launch-3',
    templateId: 'tpl-2',
    templateName: 'GCP GKE standard cluster',
    user: 'platform@cloudops.local',
    cloud: 'gcp',
    category: 'kubernetes',
    launchedAt: ago(180),
    duration: '—',
    status: 'running',
    environment: 'production',
    templateVersion: 'v2.1',
    triggeredBy: 'manual',
    progress: 62,
    output: '[..] Creando node pool workloads (3/5 nodos)\n[..] Instalando addons GKE\n[ ] Validación final',
  },
  {
    id: 'launch-4',
    templateId: 'tpl-3',
    templateName: 'Pipeline CI/CD microservicios',
    user: 'ci@cloudops.local',
    cloud: 'aws',
    category: 'jenkins',
    launchedAt: ago(360),
    duration: '2m 08s',
    status: 'success',
    environment: 'staging',
    templateVersion: 'v5.0',
    triggeredBy: 'webhook',
    resourceId: 'job/microservices-multibranch',
    output: '[ok] Job registrado\n[ok] Webhook GitHub activo\n[ok] Build #1 SUCCESS',
  },
  {
    id: 'launch-5',
    templateId: 'tpl-4',
    templateName: 'Módulo Terraform VPC hub-spoke',
    user: 'infra@cloudops.local',
    cloud: 'aws',
    category: 'terraform',
    launchedAt: ago(720),
    duration: '11m 44s',
    status: 'failed',
    environment: 'production',
    templateVersion: 'v1.4.2',
    triggeredBy: 'manual',
    errorMessage: 'Error: CIDR overlap with vpc-legacy-prod (10.0.0.0/16)',
    output: 'terraform plan: 12 to add\nterraform apply: Error creating VPC\n→ CIDR conflict detected',
  },
  {
    id: 'launch-6',
    templateId: 'tpl-6',
    templateName: 'Azure AKS production baseline',
    user: 'cloud-native@cloudops.local',
    cloud: 'azure',
    category: 'kubernetes',
    launchedAt: ago(1440),
    duration: '21m 03s',
    status: 'success',
    environment: 'production',
    templateVersion: 'v1.0',
    triggeredBy: 'manual',
    resourceId: 'aks-prod-core-01',
    output: '[ok] AKS aks-prod-core-01 Running\n[ok] Azure Monitor conectado\n[ok] Network policy aplicada',
  },
]
