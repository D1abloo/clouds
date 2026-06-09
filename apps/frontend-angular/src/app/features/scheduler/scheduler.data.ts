export type SchedulerTaskType =
  | 'instance'
  | 'jenkins'
  | 'ssh'
  | 'backup'
  | 'sync'
  | 'report'
  | 'docker'
  | 'runbook'

export type SchedulerTaskStatus = 'running' | 'paused' | 'failed' | 'disabled' | 'pending'

export type SchedulerRunResult = 'success' | 'warning' | 'error' | 'skipped'

export interface SchedulerTask {
  id: string
  name: string
  description: string
  type: SchedulerTaskType
  cron: string
  cronHuman: string
  timezone: string
  target: string
  owner: string
  assignee: string
  nextRun: string
  nextRunAt: string
  lastRun: string
  lastRunAt: string
  lastResult: SchedulerRunResult
  status: SchedulerTaskStatus
  enabled: boolean
  retries: number
  maxDuration: string
  successRate: number
  runs7d: number
  failures7d: number
  tags: string[]
  linkedResource: string
  notifyOnFailure: boolean
  maintenanceWindow?: string
  command?: string
  parameters?: string
  concurrency?: number
  environment?: SchedulerEnvironment
  cloudProvider?: SchedulerCloudProvider
  priority?: SchedulerPriority
  credentialProfile?: string
  workingDirectory?: string
  notifyChannels?: string
  notifyOnSuccess?: boolean
  skipIfRunning?: boolean
  timeoutAction?: SchedulerTimeoutAction
  documentationUrl?: string
  executor?: string
  retryBackoff?: SchedulerRetryBackoff
}

export type SchedulerRetryBackoff = 'fixed' | 'linear' | 'exponential'

export type SchedulerEnvironment = 'production' | 'staging' | 'development'
export type SchedulerCloudProvider = 'aws' | 'gcp' | 'azure'
export type SchedulerPriority = 'low' | 'normal' | 'high' | 'critical'
export type SchedulerTimeoutAction = 'abort' | 'retry' | 'notify_only'

export interface SchedulerRunHistory {
  id: string
  taskId: string
  taskName: string
  type: SchedulerTaskType
  executedAt: string
  duration: string
  result: SchedulerRunResult
  triggeredBy: string
  output: string
}

export const SCHEDULER_TYPE_LABELS: Record<SchedulerTaskType, string> = {
  instance: 'Instancia cloud',
  jenkins: 'Jenkins',
  ssh: 'Comando SSH',
  backup: 'Backup',
  sync: 'Sincronización',
  report: 'Informe',
  docker: 'Docker',
  runbook: 'Runbook',
}

export const SCHEDULER_STATUS_LABELS: Record<SchedulerTaskStatus, string> = {
  running: 'Activa',
  paused: 'Pausada',
  failed: 'Con fallos',
  disabled: 'Deshabilitada',
  pending: 'Pendiente',
}

export const SCHEDULER_RESULT_LABELS: Record<SchedulerRunResult, string> = {
  success: 'Éxito',
  warning: 'Advertencia',
  error: 'Error',
  skipped: 'Omitida',
}

const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()
const ahead = (mins: number): string => new Date(Date.now() + mins * 60_000).toISOString()

export const defaultSchedulerTasks = (): SchedulerTask[] => []

export const defaultSchedulerHistory = (): SchedulerRunHistory[] => []
