import { enrichRunbookExecution } from './runbook-execution.util'

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

export const defaultRunbooks = (): Runbook[] => []

const rawRunbookExecutions = (): RunbookExecution[] => [
  {
    id: 'ex-1',
    runbookId: 'rb-nginx',
    runbookName: 'Reiniciar Nginx',
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    duration: '42s',
    triggeredBy: 'ops@cloudops.local',
    target: 'web-prod-01 · AWS · eu-west-1 · 10.0.1.42',
    instanceId: 'inst-web-prod-01',
    provider: 'AWS',
    accountName: 'Producción AWS',
    region: 'eu-west-1',
    notifyOnComplete: true,
    note: 'Ventana de mantenimiento aprobada INC-4421',
    result: 'success',
    logExcerpt: 'nginx -t OK · reload · curl 200 /health',
    stepsCompleted: 4,
    stepsTotal: 4,
  },
  {
    id: 'ex-2',
    runbookId: 'rb-cpu',
    runbookName: 'Investigación CPU alta',
    startedAt: new Date(Date.now() - 14400000).toISOString(),
    duration: '5m 12s',
    triggeredBy: 'alert:high-cpu',
    target: 'api-prod-02 · AWS · eu-central-1 · 10.0.2.18',
    instanceId: 'inst-api-prod-02',
    provider: 'AWS',
    accountName: 'Producción AWS',
    region: 'eu-central-1',
    result: 'warning',
    note: 'Escalado manual pendiente de aprobación',
    logExcerpt: 'Top: java 78% CPU · HPA pendiente aprobación',
    stepsCompleted: 6,
    stepsTotal: 8,
  },
  {
    id: 'ex-3',
    runbookId: 'rb-pg-backup',
    runbookName: 'Backup PostgreSQL',
    startedAt: new Date(Date.now() - 21600000).toISOString(),
    duration: '8m 05s',
    triggeredBy: 'scheduler:nightly',
    target: 'db-primary · AWS · eu-west-1',
    instanceId: 'inst-db-primary',
    provider: 'AWS',
    accountName: 'Producción AWS',
    region: 'eu-west-1',
    result: 'success',
    logExcerpt: 'dump 2.4 GB · s3://backups/ok · checksum verified',
    stepsCompleted: 7,
    stepsTotal: 7,
  },
  {
    id: 'ex-4',
    runbookId: 'rb-ports',
    runbookName: 'Puertos abiertos',
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    duration: '58s',
    triggeredBy: 'alert:open-ports',
    target: 'edge-fw-01 · GCP · europe-west1',
    instanceId: 'inst-edge-fw-01',
    provider: 'GCP',
    accountName: 'GCP Corp',
    region: 'europe-west1',
    result: 'error',
    logExcerpt: 'Puerto 8080 abierto no está en baseline',
    stepsCompleted: 3,
    stepsTotal: 4,
  },
  {
    id: 'ex-5',
    runbookId: 'rb-k8s-pods',
    runbookName: 'Revisar pods Kubernetes',
    startedAt: new Date(Date.now() - 2100000).toISOString(),
    duration: '1m 28s',
    triggeredBy: 'ops@cloudops.local',
    target: 'prod-cluster',
    result: 'warning',
    logExcerpt: '2 pods CrashLoopBackOff en namespace payments',
    stepsCompleted: 4,
    stepsTotal: 5,
  },
  {
    id: 'ex-6',
    runbookId: 'rb-nginx',
    runbookName: 'Reiniciar Nginx',
    startedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    duration: '38s',
    triggeredBy: 'ops@cloudops.local',
    target: 'web-staging-02',
    result: 'success',
    logExcerpt: 'reload staging · smoke test OK',
    stepsCompleted: 4,
    stepsTotal: 4,
  },
  {
    id: 'ex-7',
    runbookId: 'rb-cpu',
    runbookName: 'Investigación CPU alta',
    startedAt: new Date(Date.now() - 18 * 86400000).toISOString(),
    duration: '4m 40s',
    triggeredBy: 'alert:high-cpu',
    target: 'worker-03',
    result: 'success',
    logExcerpt: 'Proceso batch finalizado · CPU normalizada',
    stepsCompleted: 8,
    stepsTotal: 8,
  },
  {
    id: 'ex-8',
    runbookId: 'rb-pg-backup',
    runbookName: 'Backup PostgreSQL',
    startedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    duration: '7m 55s',
    triggeredBy: 'scheduler:nightly',
    target: 'db-replica',
    result: 'success',
    logExcerpt: 'dump réplica · verificación OK',
    stepsCompleted: 7,
    stepsTotal: 7,
  },
  {
    id: 'ex-9',
    runbookId: 'rb-ports',
    runbookName: 'Puertos abiertos',
    startedAt: new Date(Date.now() - 42 * 86400000).toISOString(),
    duration: '1m 02s',
    triggeredBy: 'alert:open-ports',
    target: 'edge-fw-02',
    result: 'warning',
    logExcerpt: 'Regla temporal aplicada · revisión pendiente',
    stepsCompleted: 4,
    stepsTotal: 4,
  },
  {
    id: 'ex-10',
    runbookId: 'rb-k8s-pods',
    runbookName: 'Revisar pods Kubernetes',
    startedAt: new Date(Date.now() - 55 * 86400000).toISOString(),
    duration: '2m 10s',
    triggeredBy: 'scheduler:weekly',
    target: 'staging-cluster',
    result: 'success',
    logExcerpt: 'Todos los pods Running',
    stepsCompleted: 5,
    stepsTotal: 5,
  },
]

export const defaultRunbookExecutions = (): RunbookExecution[] => {
  const runbooks = defaultRunbooks()
  return rawRunbookExecutions().map((ex) => enrichRunbookExecution(ex, runbooks))
}
