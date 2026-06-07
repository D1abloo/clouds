import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import type { ServiceCatalogCategory, ServiceCatalogCloud, ServiceCatalogEnvironment } from './service-catalog.demo'

export const CATEGORY_TECH_LOGO: Record<ServiceCatalogCategory, NavLogoKey> = {
  instance: 'aws',
  terraform: 'terraform',
  jenkins: 'jenkins',
  docker: 'docker',
  kubernetes: 'kubernetes',
}

export const CLOUD_OPTIONS: ServiceCatalogCloud[] = ['aws', 'gcp', 'azure']

export const CLOUD_FULL_LABELS: Record<ServiceCatalogCloud, string> = {
  aws: 'Amazon Web Services',
  gcp: 'Google Cloud',
  azure: 'Microsoft Azure',
}

export const CLOUD_ACCENT: Record<ServiceCatalogCloud, string> = {
  aws: '#ff9900',
  gcp: '#4285f4',
  azure: '#0078d4',
}

export const CATEGORY_OPTIONS: ServiceCatalogCategory[] = [
  'instance',
  'terraform',
  'jenkins',
  'docker',
  'kubernetes',
]

export const OWNER_PRESETS = ['platform-team', 'devops', 'infra', 'sre', 'dba', 'cloud-native']

export const VERSION_PRESETS = ['v1.0', 'v1.1', 'v2.0']

export const TAG_PRESETS = ['web', 'prod', 'staging', 'api', 'batch', 'ha', 'nightly']

export const CONTACT_PRESETS = [
  'platform-team@empresa.com',
  'devops@empresa.com',
  'sre@empresa.com',
  'cloud-native@empresa.com',
]

export const CATEGORY_NAME_SUGGESTIONS: Record<
  ServiceCatalogCategory,
  Record<ServiceCatalogCloud, string>
> = {
  instance: {
    aws: 'AWS EC2 web tier (t3.medium)',
    gcp: 'GCP Compute web tier (e2-medium)',
    azure: 'Azure VM web tier (Standard_B2s)',
  },
  terraform: {
    aws: 'Terraform VPC base — AWS',
    gcp: 'Terraform VPC base — GCP',
    azure: 'Terraform landing zone — Azure',
  },
  jenkins: {
    aws: 'Jenkins CI/CD — AWS agents',
    gcp: 'Jenkins CI/CD — GCP agents',
    azure: 'Jenkins CI/CD — Azure agents',
  },
  docker: {
    aws: 'Docker stack — AWS ECS',
    gcp: 'Docker stack — GCP Cloud Run',
    azure: 'Docker stack — Azure ACI',
  },
  kubernetes: {
    aws: 'Kubernetes cluster — EKS',
    gcp: 'Kubernetes cluster — GKE',
    azure: 'Kubernetes cluster — AKS',
  },
}

export const CATEGORY_DESCRIPTION_TEMPLATES: Record<ServiceCatalogCategory, string> = {
  instance:
    'Plantilla para aprovisionar instancias compute en {cloud}.\n\nUso: cargas web, APIs y servicios stateless en {env}.\nRequisitos: VPC/red configurada, quotas disponibles y grupo de seguridad base.',
  terraform:
    'Módulo IaC reutilizable para {cloud}.\n\nUso: despliegues repetibles de infraestructura en {env}.\nIncluye: init, plan, apply y export de outputs documentados.',
  jenkins:
    'Pipeline Jenkins registrado en el catálogo para {cloud}.\n\nUso: builds y despliegues automatizados en {env}.\nRequisitos: credenciales cloud, agente disponible y repositorio conectado.',
  docker:
    'Stack de contenedores en {cloud}.\n\nUso: microservicios y apps empaquetadas en {env}.\nIncluye: pull de imágenes, despliegue, health check y registro de endpoint.',
  kubernetes:
    'Cluster y workloads Kubernetes en {cloud}.\n\nUso: orquestación de servicios en {env}.\nIncluye: red, node pools, addons base y namespace inicial.',
}

export const OWNER_ICONS: Record<string, string> = {
  'platform-team': 'hub',
  devops: 'build',
  infra: 'dns',
  sre: 'monitor_heart',
  dba: 'storage',
  'cloud-native': 'cloud',
}

export const PROVISION_TIME_PRESETS = ['5 min', '10 min', '15 min', '30 min', '1 h']

export const COST_PRESETS = ['~$50/mes', '~$120/mes', '~$250/mes', '~$500/mes']

export const CATEGORY_PARAM_TEMPLATES: Record<ServiceCatalogCategory, string> = {
  instance: 'INSTANCE_TYPE=t3.medium\nMIN_SIZE=2\nMAX_SIZE=6\nREGION=eu-west-1',
  terraform: 'TF_VAR_environment=staging\nTF_VAR_region=eu-west-1\nBACKEND=s3',
  jenkins: 'JOB_NAME=deploy-app\nBRANCH=main\nCREDENTIALS_ID=jenkins-cloud',
  docker: 'COMPOSE_FILE=docker-compose.yml\nREPLICAS=2\nREGISTRY=ecr',
  kubernetes: 'CLUSTER_VERSION=1.29\nNODE_POOL=standard\nNAMESPACE=workloads',
}

export const CATEGORY_RESOURCE_SUGGESTIONS: Record<ServiceCatalogCategory, string[]> = {
  instance: ['Auto Scaling Group', 'Application Load Balancer', 'Security Group', 'EBS Volume'],
  terraform: ['VPC y subnets', 'IAM roles', 'S3 backend state', 'Route53 records'],
  jenkins: ['Pipeline job', 'Credencial cloud', 'Webhook Git', 'Agent label'],
  docker: ['Docker Compose stack', 'Registry pull secret', 'Volume persistente', 'Network overlay'],
  kubernetes: ['Cluster GKE/EKS/AKS', 'Node pool', 'Ingress controller', 'Namespace + quotas'],
}

export const CATEGORY_PROVISION_STEPS: Record<ServiceCatalogCategory, string[]> = {
  instance: ['Validar quota y región', 'Provisionar recursos compute', 'Configurar red y seguridad', 'Health check'],
  terraform: ['terraform init', 'Plan y revisión', 'Apply infraestructura', 'Export outputs'],
  jenkins: ['Registrar job/pipeline', 'Configurar credenciales', 'Activar webhook o cron', 'Build de validación'],
  docker: ['Pull imágenes', 'Desplegar stack', 'Verificar contenedores', 'Registrar endpoint'],
  kubernetes: ['Preparar red', 'Crear cluster', 'Configurar node pools', 'Instalar addons'],
}

export const CATEGORY_HINTS: Record<ServiceCatalogCategory, string> = {
  instance: 'EC2, VMs, RDS, discos',
  terraform: 'Módulos IaC reutilizables',
  jenkins: 'Pipelines y jobs CI/CD',
  docker: 'Compose, stacks y contenedores',
  kubernetes: 'Clusters, namespaces, workloads',
}

export const ENVIRONMENT_OPTIONS: ServiceCatalogEnvironment[] = [
  'production',
  'staging',
  'development',
]
