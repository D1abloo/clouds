import type { LaunchPhaseStatus } from '../shared/modals/launch-instance/launch-instance.pipeline'
import type { TerraformLaunchRecord } from './terraform-folders'

export interface TerraformLaunchPhaseSnapshot {
  id: string
  label: string
  weight: number
  percent: number
  status: LaunchPhaseStatus
  detail?: string
}

export interface TerraformLaunchDetail extends TerraformLaunchRecord {
  region: string
  zone?: string
  instanceType: string
  monthlyCostUsd: number
  durationLabel: string
  triggeredBy: string
  folderPath: string
  progressPercent: number
  summary: string
  planSummary: string
  planStats: { add: number; change: number; destroy: number }
  phases: TerraformLaunchPhaseSnapshot[]
  logs: string[]
  approach: string[]
}

const donePhases = (): TerraformLaunchPhaseSnapshot[] => [
  { id: 'validate', label: 'Validación', weight: 8, percent: 100, status: 'done', detail: 'IAM y coste OK' },
  { id: 'init', label: 'terraform init', weight: 12, percent: 100, status: 'done' },
  { id: 'plan', label: 'terraform plan', weight: 18, percent: 100, status: 'done', detail: '1 add, 0 change' },
  { id: 'policy', label: 'Políticas', weight: 10, percent: 100, status: 'done' },
  { id: 'apply', label: 'terraform apply', weight: 35, percent: 100, status: 'done', detail: '42s' },
  { id: 'persist', label: 'Registro', weight: 10, percent: 100, status: 'done' },
  { id: 'health', label: 'Health check', weight: 7, percent: 100, status: 'done', detail: 'Ping OK' },
]

const plannedPhases = (): TerraformLaunchPhaseSnapshot[] => [
  { id: 'validate', label: 'Validación', weight: 8, percent: 100, status: 'done' },
  { id: 'init', label: 'terraform init', weight: 12, percent: 100, status: 'done' },
  { id: 'plan', label: 'terraform plan', weight: 18, percent: 100, status: 'done', detail: 'Plan generado' },
  { id: 'policy', label: 'Políticas', weight: 10, percent: 100, status: 'done' },
  { id: 'apply', label: 'terraform apply', weight: 35, percent: 0, status: 'pending' },
  { id: 'persist', label: 'Registro', weight: 10, percent: 0, status: 'pending' },
  { id: 'health', label: 'Health check', weight: 7, percent: 0, status: 'pending' },
]

const runningPhases = (): TerraformLaunchPhaseSnapshot[] => [
  { id: 'validate', label: 'Validación', weight: 8, percent: 100, status: 'done' },
  { id: 'init', label: 'terraform init', weight: 12, percent: 100, status: 'done' },
  { id: 'plan', label: 'terraform plan', weight: 18, percent: 100, status: 'done' },
  { id: 'policy', label: 'Políticas', weight: 10, percent: 100, status: 'done' },
  { id: 'apply', label: 'terraform apply', weight: 35, percent: 62, status: 'active', detail: 'Creando NIC…' },
  { id: 'persist', label: 'Registro', weight: 10, percent: 0, status: 'pending' },
  { id: 'health', label: 'Health check', weight: 7, percent: 0, status: 'pending' },
]

export const defaultTerraformLaunchDetails = (): TerraformLaunchDetail[] => [
  {
    id: 'launch-1',
    name: 'Lanzamiento #1042',
    folderId: 'apps',
    workspaceId: 'ws-aws-prod',
    workspaceName: 'aws-production',
    provider: 'AWS',
    status: 'APPLIED',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    instanceName: 'web-prod-01',
    region: 'eu-west-1',
    zone: 'eu-west-1a',
    instanceType: 't3.medium',
    monthlyCostUsd: 84,
    durationLabel: '8m 12s',
    triggeredBy: 'admin@cloudops.local',
    folderPath: '/cloudops/apps',
    progressPercent: 100,
    summary: 'Instancia web en producción con ALB y security groups endurecidos.',
    planSummary: 'Plan: 2 to add, 1 to change, 0 to destroy.',
    planStats: { add: 2, change: 1, destroy: 0 },
    phases: donePhases(),
    approach: [
      'Blue/green dentro del workspace aws-production',
      'State remoto S3 con bloqueo DynamoDB',
      'Tags obligatorios: env=prod, tier=1',
    ],
    logs: [
      '> terraform workspace select aws-production',
      '> terraform plan -out=tfplan',
      'Plan: 2 to add, 1 to change, 0 to destroy.',
      '> terraform apply -auto-approve tfplan',
      'aws_instance.web: Creation complete after 42s',
      'Apply complete! Resources: 2 added, 1 changed, 0 destroyed.',
    ],
  },
  {
    id: 'launch-2',
    name: 'Lanzamiento #1038',
    folderId: 'apps',
    workspaceId: 'ws-aws-stg',
    workspaceName: 'aws-staging',
    provider: 'AWS',
    status: 'PLANNED',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    instanceName: 'api-staging-02',
    region: 'eu-west-1',
    instanceType: 't3.small',
    monthlyCostUsd: 38,
    durationLabel: '2m 04s',
    triggeredBy: 'auto: Nightly plan',
    folderPath: '/cloudops/apps',
    progressPercent: 48,
    summary: 'Plan listo para API staging — pendiente de apply manual.',
    planSummary: 'Plan: 1 to add, 0 to change, 0 to destroy.',
    planStats: { add: 1, change: 0, destroy: 0 },
    phases: plannedPhases(),
    approach: [
      'Solo plan automático nocturno (sin apply)',
      'Mismo módulo instance que producción, tamaño reducido',
      'Revisión en pestaña Desplegar antes de apply',
    ],
    logs: [
      '> cron: 0 3 * * * — plan staging',
      '> terraform plan -out=tfplan-stg',
      'Plan: 1 to add, 0 to change, 0 to destroy.',
      '— Apply pendiente de aprobación',
    ],
  },
  {
    id: 'launch-3',
    name: 'Lanzamiento #991',
    folderId: 'infra',
    workspaceId: 'ws-gcp',
    workspaceName: 'gcp-analytics',
    provider: 'GCP',
    status: 'APPLIED',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    instanceName: 'analytics-node-1',
    region: 'europe-west1',
    zone: 'europe-west1-b',
    instanceType: 'e2-medium',
    monthlyCostUsd: 52,
    durationLabel: '6m 40s',
    triggeredBy: 'webhook: push main',
    folderPath: '/cloudops/infra',
    progressPercent: 100,
    summary: 'Nodo de cómputo para pipeline de analítica en GCP.',
    planSummary: 'Plan: 1 to add, 0 to change, 0 to destroy.',
    planStats: { add: 1, change: 0, destroy: 0 },
    phases: donePhases(),
    approach: [
      'Disparado por webhook tras merge a main',
      'Service account dedicada con roles BigQuery + Compute',
    ],
    logs: [
      '> terraform init -upgrade',
      '> terraform apply -auto-approve',
      'google_compute_instance.analytics: Creating…',
      'Apply complete! Resources: 1 added, 0 changed, 0 destroyed.',
    ],
  },
  {
    id: 'launch-4',
    name: 'Lanzamiento #1089',
    folderId: 'apps',
    workspaceId: 'ws-aws-prod',
    workspaceName: 'aws-production',
    provider: 'AWS',
    status: 'RUNNING',
    createdAt: new Date(Date.now() - 180000).toISOString(),
    instanceName: 'worker-batch-03',
    region: 'eu-west-1',
    instanceType: 't3.large',
    monthlyCostUsd: 112,
    durationLabel: '3m 18s (en curso)',
    triggeredBy: 'isaac@cloudops.local',
    folderPath: '/cloudops/apps',
    progressPercent: 71,
    summary: 'Apply en curso — creación de instancia batch y reglas de seguridad.',
    planSummary: 'Plan: 3 to add, 0 to change, 0 to destroy.',
    planStats: { add: 3, change: 0, destroy: 0 },
    phases: runningPhases(),
    approach: [
      'Ventana de mantenimiento aprobada',
      'Subnet privada + NAT gateway existente',
      'cloud-init con script de bootstrap batch',
    ],
    logs: [
      '> Iniciando lanzamiento worker-batch-03',
      '> terraform apply -auto-approve tfplan',
      'aws_instance.batch: Still creating… 30s elapsed',
      'aws_security_group.batch: Creation complete',
    ],
  },
  {
    id: 'launch-5',
    name: 'Lanzamiento #1071',
    folderId: 'infra',
    workspaceId: 'ws-azure',
    workspaceName: 'azure-core',
    provider: 'AZURE',
    status: 'FAILED',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    instanceName: 'vm-core-02',
    region: 'westeurope',
    instanceType: 'Standard_B2s',
    monthlyCostUsd: 46,
    durationLabel: '4m 51s',
    triggeredBy: 'cron: weekly sync',
    folderPath: '/cloudops/infra',
    progressPercent: 54,
    summary: 'Error en apply — quota de vCPUs en la suscripción.',
    planSummary: 'Plan: 1 to add, 0 to change, 0 to destroy.',
    planStats: { add: 1, change: 0, destroy: 0 },
    phases: [
      { id: 'validate', label: 'Validación', weight: 8, percent: 100, status: 'done' },
      { id: 'init', label: 'terraform init', weight: 12, percent: 100, status: 'done' },
      { id: 'plan', label: 'terraform plan', weight: 18, percent: 100, status: 'done' },
      { id: 'policy', label: 'Políticas', weight: 10, percent: 100, status: 'done' },
      { id: 'apply', label: 'terraform apply', weight: 35, percent: 40, status: 'error', detail: 'Quota exceeded' },
      { id: 'persist', label: 'Registro', weight: 10, percent: 0, status: 'pending' },
      { id: 'health', label: 'Health check', weight: 7, percent: 0, status: 'pending' },
    ],
    approach: [
      'Reintento programado tras ampliar quota',
      'azurerm backend en Storage Account compartido',
    ],
    logs: [
      '> terraform apply -auto-approve',
      'Error: creating Virtual Machine: compute.QuotaExceeded',
      'Apply failed with 1 error',
    ],
  },
  {
    id: 'launch-6',
    name: 'Lanzamiento #1055',
    folderId: 'data',
    workspaceId: 'ws-data-pg',
    workspaceName: 'postgres-ha',
    provider: 'AWS',
    status: 'APPLIED',
    createdAt: new Date(Date.now() - 432000000).toISOString(),
    instanceName: 'postgres-replica-2',
    region: 'eu-central-1',
    instanceType: 'db.r6g.large',
    monthlyCostUsd: 240,
    durationLabel: '14m 22s',
    triggeredBy: 'auto: DR drill',
    folderPath: '/cloudops/data',
    progressPercent: 100,
    summary: 'Réplica de lectura HA para cluster PostgreSQL.',
    planSummary: 'Plan: 1 to add, 2 to change, 0 to destroy.',
    planStats: { add: 1, change: 2, destroy: 0 },
    phases: donePhases(),
    approach: [
      'Módulo RDS con Multi-AZ desactivado en staging',
      'Cifrado KMS y backup retention 14 días',
    ],
    logs: [
      '> terraform plan -out=dr-plan',
      'Plan: 1 to add, 2 to change, 0 to destroy.',
      '> terraform apply dr-plan',
      'aws_db_instance.replica: Creation complete after 8m',
    ],
  },
]

export const launchDetailFromRecord = (record: TerraformLaunchRecord): TerraformLaunchDetail => {
  const folderPath =
    record.folderId === 'apps'
      ? '/cloudops/apps'
      : record.folderId === 'data'
        ? '/cloudops/data'
        : `/cloudops/${record.folderId}`
  const applied = record.status === 'APPLIED'
  return {
    ...record,
    region: record.provider === 'GCP' ? 'europe-west1' : record.provider === 'AZURE' ? 'westeurope' : 'eu-west-1',
    instanceType: 't3.medium',
    monthlyCostUsd: 72,
    durationLabel: applied ? '6m 40s' : '—',
    triggeredBy: 'admin@cloudops.local',
    folderPath,
    progressPercent: applied ? 100 : 45,
    summary: `Instancia ${record.instanceName} aprovisionada en ${record.workspaceName}.`,
    planSummary: 'Plan: 1 to add, 0 to change, 0 to destroy.',
    planStats: { add: 1, change: 0, destroy: 0 },
    phases: applied ? donePhases() : runningPhases(),
    approach: [
      'Validación de cuota y políticas de coste antes del apply',
      'State remoto y bloqueo por workspace',
      'Etiquetado estándar (env, owner, cost-center)',
    ],
    logs: [
      `> terraform workspace select ${record.workspaceName}`,
      '> terraform plan -out=tfplan',
      'Plan: 1 to add, 0 to change, 0 to destroy.',
      applied ? '> terraform apply -auto-approve tfplan' : '> terraform apply -auto-approve (en curso…)',
      applied ? `${record.instanceName}: Creation complete` : 'Apply: still running…',
    ],
  }
}

export const launchRecordsFromDetails = (details: TerraformLaunchDetail[]): TerraformLaunchRecord[] =>
  details.map(({ id, name, folderId, workspaceId, workspaceName, provider, status, createdAt, instanceName }) => ({
    id,
    name,
    folderId,
    workspaceId,
    workspaceName,
    provider,
    status,
    createdAt,
    instanceName,
  }))
