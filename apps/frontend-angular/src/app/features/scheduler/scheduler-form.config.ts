import type { SchedulerCloudProvider, SchedulerEnvironment, SchedulerTaskType } from './scheduler.data'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export interface SchedulerTypeDefaults {
  command: string
  parameters: string
  target: string
  linkedResource: string
  workingDirectory: string
  tags: string
  targets: string[]
  maxDuration: string
  retries: number
}

export const TYPE_FORM_DEFAULTS: Record<SchedulerTaskType, SchedulerTypeDefaults> = {
  instance: {
    command: 'aws ec2 describe-instances --filters Name=tag:env,Values=prod',
    parameters: 'REGION=eu-west-1',
    target: 'asg-staging-nightly',
    linkedResource: 'Inventario instancias',
    workingDirectory: '/opt/cloudops',
    tags: 'instance, cloud',
    targets: ['asg-staging-nightly', 'asg-web-prod', 'i-0a8f2b3c4d5e6', 'nginx-fleet-prod'],
    maxDuration: '20m',
    retries: 1,
  },
  jenkins: {
    command: 'jenkins build deploy-staging-nightly',
    parameters: 'BRANCH=develop',
    target: 'jenkins-prod-01',
    linkedResource: 'Job: deploy-staging-nightly',
    workingDirectory: '/var/jenkins',
    tags: 'jenkins, ci',
    targets: ['jenkins-prod-01', 'Job: deploy-staging-nightly', 'Job: tf-drift-scan'],
    maxDuration: '45m',
    retries: 0,
  },
  ssh: {
    command: '/opt/scripts/run-remote.sh',
    parameters: 'HOSTS=bastion-01,edge-fw-01',
    target: 'bastion-01',
    linkedResource: 'Inventario VPS',
    workingDirectory: '/home/ops',
    tags: 'ssh, ops',
    targets: ['bastion-01', 'edge-fw-01', 'edge-02', 'jump-prod-01'],
    maxDuration: '15m',
    retries: 2,
  },
  backup: {
    command: 'aws rds create-db-snapshot --db-instance-identifier',
    parameters: 'RETENTION=7',
    target: 'rds-prod-primary',
    linkedResource: 'RDS prod-primary',
    workingDirectory: '/opt/backup',
    tags: 'backup, rds',
    targets: ['rds-prod-primary', 'rds-staging-01', 'ebs-staging', 's3-backup-prod'],
    maxDuration: '35m',
    retries: 2,
  },
  sync: {
    command: 'sync-inventory --provider all',
    parameters: 'MODE=incremental',
    target: 'all-gcp-projects',
    linkedResource: 'Catálogo cloud',
    workingDirectory: '/opt/sync',
    tags: 'sync, inventory',
    targets: ['all-gcp-projects', 'ami-catalog', 'vault-prod', 'billing-api'],
    maxDuration: '12m',
    retries: 1,
  },
  report: {
    command: 'report:generate --format pdf,csv',
    parameters: 'RANGE=7d',
    target: 'billing-api',
    linkedResource: 'API Billing',
    workingDirectory: '/opt/reports',
    tags: 'report, finops',
    targets: ['billing-api', 'cost-explorer', 'security-hub'],
    maxDuration: '15m',
    retries: 0,
  },
  docker: {
    command: 'docker system prune -af --filter until=168h',
    parameters: 'HOSTS=docker-fleet',
    target: 'docker-fleet-prod',
    linkedResource: '4 hosts Docker',
    workingDirectory: '/var/lib/docker',
    tags: 'docker, cleanup',
    targets: ['docker-fleet-prod', 'ecr-org', 'edge-02', 'k8s-workers'],
    maxDuration: '25m',
    retries: 2,
  },
  runbook: {
    command: 'runbook execute rb-pg-backup',
    parameters: 'ENV=production',
    target: 'rds-staging-01',
    linkedResource: 'Runbook: Backup PostgreSQL',
    workingDirectory: '/opt/runbooks',
    tags: 'runbook, automation',
    targets: ['rds-staging-01', 'redis-cluster-prod', 'Runbook: Backup PostgreSQL'],
    maxDuration: '50m',
    retries: 1,
  },
}

export const OWNER_PRESETS = ['Plataforma', 'SRE', 'DBA', 'Seguridad', 'FinOps', 'Inventario', 'IaC']

export const EXECUTOR_OPTIONS = [
  { value: 'default', label: 'Agente por defecto (cloudops-runner-01)' },
  { value: 'runner-aws-eu', label: 'Runner AWS eu-west-1' },
  { value: 'runner-gcp', label: 'Runner GCP shared' },
  { value: 'runner-onprem', label: 'Runner on-premise bastion' },
  { value: 'jenkins-agent', label: 'Jenkins agent pool' },
]

export const RETRY_BACKOFF_OPTIONS = [
  { value: 'fixed', label: 'Fijo (mismo intervalo)' },
  { value: 'linear', label: 'Lineal (+5 min por intento)' },
  { value: 'exponential', label: 'Exponencial (×2 por intento)' },
]

export interface NotifyChannelDef {
  id: string
  label: string
  icon: string
  prefix: string
  placeholder: string
  defaultDest: string
}

export const NOTIFY_CHANNEL_DEFS: NotifyChannelDef[] = [
  { id: 'slack', label: 'Slack', icon: 'tag', prefix: 'slack:', placeholder: '#cloud-ops', defaultDest: '#cloud-ops' },
  { id: 'email', label: 'Email', icon: 'mail', prefix: 'email:', placeholder: 'ops@empresa.com', defaultDest: 'ops@cloudops.local' },
  { id: 'pagerduty', label: 'PagerDuty', icon: 'notifications_active', prefix: 'pagerduty:', placeholder: 'service-id', defaultDest: 'cloud-ops-primary' },
  { id: 'teams', label: 'Teams', icon: 'groups', prefix: 'teams:', placeholder: 'Canal alertas', defaultDest: 'Infra Alertas' },
]

export const ENVIRONMENT_HINTS: Record<SchedulerEnvironment, string> = {
  production: 'Cambios auditados · ventana de mantenimiento recomendada',
  staging: 'Entorno de preproducción · ideal para validaciones',
  development: 'Sin impacto en clientes · ejecución libre',
}

export const FORM_SECTIONS = [
  { id: 'identity', num: '1', label: 'Identidad' },
  { id: 'schedule', num: '2', label: 'Calendario' },
  { id: 'target', num: '3', label: 'Objetivo' },
  { id: 'exec', num: '4', label: 'Comando' },
  { id: 'owners', num: '5', label: 'Responsables' },
  { id: 'policy', num: '6', label: 'Política' },
] as const

/** Logos oficiales (Simple Icons) por tipo de tarea del programador */
export const SCHEDULER_TYPE_LOGO: Record<SchedulerTaskType, NavLogoKey | null> = {
  instance: 'aws',
  jenkins: 'jenkins',
  ssh: null,
  backup: 'postgresql',
  sync: 'gcp',
  report: 'grafana',
  docker: 'docker',
  runbook: 'terraform',
}

/** @deprecated Usar cloudProvider en la tarea; conservado para compatibilidad */
export const SCHEDULER_ENV_LOGO: Record<SchedulerEnvironment, NavLogoKey> = {
  production: 'aws',
  staging: 'gcp',
  development: 'azure',
}

export interface CloudProviderDef {
  id: SchedulerCloudProvider
  label: string
  shortLabel: string
  hint: string
  services: string
}

export const CLOUD_PROVIDERS: CloudProviderDef[] = [
  {
    id: 'aws',
    label: 'Amazon Web Services',
    shortLabel: 'AWS',
    hint: 'EC2, RDS, Lambda, S3, EKS…',
    services: 'EC2 · RDS · S3',
  },
  {
    id: 'gcp',
    label: 'Google Cloud',
    shortLabel: 'GCP',
    hint: 'Compute Engine, GKE, Cloud SQL…',
    services: 'GCE · GKE · Cloud SQL',
  },
  {
    id: 'azure',
    label: 'Microsoft Azure',
    shortLabel: 'Azure',
    hint: 'Virtual Machines, AKS, Blob Storage…',
    services: 'VMs · AKS · Blob',
  },
]

export const CLOUD_PROVIDER_LABELS: Record<SchedulerCloudProvider, string> = {
  aws: 'Amazon Web Services',
  gcp: 'Google Cloud',
  azure: 'Microsoft Azure',
}

export const CREDENTIAL_PROFILE_LOGO: Record<string, NavLogoKey | null> = {
  '': null,
  'aws-prod-readonly': 'aws',
  'aws-prod-ops': 'aws',
  'gcp-shared-sa': 'gcp',
  'jenkins-deploy': 'jenkins',
  'ssh-bastion-root': null,
  'vault-app-role': null,
}

export const EXECUTOR_LOGO: Record<string, NavLogoKey | null> = {
  default: null,
  'runner-aws-eu': 'aws',
  'runner-gcp': 'gcp',
  'runner-onprem': null,
  'jenkins-agent': 'jenkins',
}

export const inferTargetLogo = (target: string): NavLogoKey | null => {
  const t = target.toLowerCase()
  if (t.includes('jenkins')) return 'jenkins'
  if (t.includes('gcp') || t.includes('google')) return 'gcp'
  if (t.includes('azure')) return 'azure'
  if (t.includes('docker') || t.includes('ecr')) return 'docker'
  if (t.includes('k8s') || t.includes('kubernetes') || t.includes('nginx-fleet')) return 'kubernetes'
  if (t.includes('postgres') || t.includes('rds')) return 'postgresql'
  if (t.includes('redis')) return 'redis'
  if (t.includes('github')) return 'github'
  if (t.includes('gitlab')) return 'gitlab'
  if (t.includes('grafana')) return 'grafana'
  if (t.includes('prometheus')) return 'prometheus'
  if (t.includes('terraform') || t.includes('tf-') || t.includes('runbook')) return 'terraform'
  if (t.includes('aws') || t.includes('asg') || t.includes('ebs') || t.includes('ami') || t.startsWith('i-')) {
    return 'aws'
  }
  return null
}
