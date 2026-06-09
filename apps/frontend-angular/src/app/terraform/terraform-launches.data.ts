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

export const defaultTerraformLaunchDetails = (): TerraformLaunchDetail[] => []

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
