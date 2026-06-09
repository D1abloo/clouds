export type RunbookCategory = 'infra' | 'app' | 'db' | 'security' | 'k8s'
export type RunbookTrigger = 'manual' | 'alert' | 'schedule' | 'approval'
export type RunbookStatus = 'published' | 'draft' | 'deprecated'
export type RunbookResult = 'success' | 'warning' | 'error' | 'never'

export interface RunbookStep {
  order: number
  title: string
  type: 'command' | 'check' | 'approval' | 'notify'
  command?: string
}

export interface Runbook {
  id: string
  name: string
  description: string
  category: RunbookCategory
  tags: string[]
  steps: RunbookStep[]
  owner: string
  avgDuration: string
  successRate: number
  executions7d: number
  lastRunLabel: string
  lastResult: RunbookResult
  trigger: RunbookTrigger
  linkedTo: string
  status: RunbookStatus
  requiresApproval: boolean
  defaultInstanceId?: string
  defaultProvider?: string
  defaultAccountName?: string
  createdAt?: string
}

export const RUNBOOK_STATUS_LABELS: Record<RunbookStatus, string> = {
  published: 'Publicado',
  draft: 'Borrador',
  deprecated: 'Obsoleto',
}

export const RUNBOOK_STEP_TYPE_LABELS: Record<RunbookStep['type'], string> = {
  command: 'Comando',
  check: 'Comprobación',
  approval: 'Aprobación',
  notify: 'Notificación',
}

export type RunbookExecutionStepStatus = 'success' | 'warning' | 'error' | 'skipped' | 'pending'

export interface RunbookExecutionStepLog {
  order: number
  title: string
  type: RunbookStep['type']
  status: RunbookExecutionStepStatus
  duration?: string
  output?: string
  command?: string
}

export interface RunbookExecution {
  id: string
  runbookId: string
  runbookName: string
  startedAt: string
  finishedAt?: string
  duration: string
  triggeredBy: string
  target: string
  instanceId?: string
  provider?: string
  accountName?: string
  region?: string
  category?: RunbookCategory
  result: 'success' | 'warning' | 'error'
  logExcerpt: string
  fullLog?: string
  stepsCompleted: number
  stepsTotal: number
  stepLogs?: RunbookExecutionStepLog[]
  dryRun?: boolean
  note?: string
  notifyOnComplete?: boolean
  /** Campos enriquecidos al cargar / tras ejecutar */
  runbookDescription?: string
  runbookOwner?: string
  runbookTrigger?: RunbookTrigger
  runbookTags?: string[]
  runbookLinkedTo?: string
  runbookRequiresApproval?: boolean
  runbookAvgDuration?: string
  runbookSuccessRate?: number
  progressPercent?: number
  failureSummary?: string
  environment?: string
  correlationId?: string
}

export const RUNBOOK_EXECUTION_RESULT_LABELS: Record<RunbookExecution['result'], string> = {
  success: 'Éxito',
  warning: 'Advertencia',
  error: 'Error',
}

export const RUNBOOK_CATEGORY_LABELS: Record<RunbookCategory, string> = {
  infra: 'Infraestructura',
  app: 'Aplicación',
  db: 'Base de datos',
  security: 'Seguridad',
  k8s: 'Kubernetes',
}

export const RUNBOOK_TRIGGER_LABELS: Record<RunbookTrigger, string> = {
  manual: 'Manual',
  alert: 'Alerta',
  schedule: 'Programado',
  approval: 'Tras aprobación',
}

export const defaultRunbooks: Runbook[] = []

