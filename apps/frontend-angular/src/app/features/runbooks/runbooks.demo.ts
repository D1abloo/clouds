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

export const defaultRunbooks = (): Runbook[] => [
  {
    id: 'rb-nginx',
    name: 'Reiniciar Nginx',
    description: 'Valida configuración, reinicia el servicio y comprueba HTTP 200 en el balanceador.',
    category: 'app',
    tags: ['nginx', 'web', 'prod'],
    steps: [
      { order: 1, title: 'Comprobar sintaxis', type: 'command', command: 'nginx -t' },
      { order: 2, title: 'Reinicio controlado', type: 'command', command: 'systemctl reload nginx' },
      { order: 3, title: 'Health check upstream', type: 'check' },
      { order: 4, title: 'Notificar a #ops-web', type: 'notify' },
    ],
    owner: 'Equipo Web',
    avgDuration: '45s',
    successRate: 98,
    executions7d: 12,
    lastRunLabel: 'Hace 2 h',
    lastResult: 'success',
    trigger: 'manual',
    linkedTo: 'web-prod-01',
    status: 'published',
    requiresApproval: false,
  },
  {
    id: 'rb-disk',
    name: 'Limpieza de disco',
    description: 'Libera espacio en /var y /tmp, rota logs y alerta si el uso sigue por encima del 85%.',
    category: 'infra',
    tags: ['disk', 'logs', 'vps'],
    steps: [
      { order: 1, title: 'Snapshot de seguridad', type: 'approval' },
      { order: 2, title: 'journalctl vacuum', type: 'command', command: 'journalctl --vacuum-time=7d' },
      { order: 3, title: 'Limpiar /tmp antiguo', type: 'command', command: 'find /tmp -mtime +7 -delete' },
      { order: 4, title: 'Comprobar df -h', type: 'check' },
      { order: 5, title: 'Registrar en auditoría', type: 'notify' },
      { order: 6, title: 'Escalar si >85%', type: 'check' },
    ],
    owner: 'SRE',
    avgDuration: '2m 10s',
    successRate: 91,
    executions7d: 8,
    lastRunLabel: 'Ayer',
    lastResult: 'success',
    trigger: 'schedule',
    linkedTo: 'vps-bastion-01',
    status: 'published',
    requiresApproval: true,
  },
  {
    id: 'rb-k8s-pods',
    name: 'Revisar pods Kubernetes',
    description: 'Lista pods en CrashLoop, describe eventos y sugiere rollback si aplica.',
    category: 'k8s',
    tags: ['k8s', 'pods', 'prod-cluster'],
    steps: [
      { order: 1, title: 'kubectl get pods -A', type: 'command', command: 'kubectl get pods -A -o wide' },
      { order: 2, title: 'Filtrar no Running', type: 'check' },
      { order: 3, title: 'describe pod crítico', type: 'command' },
      { order: 4, title: 'Adjuntar a incidente', type: 'notify' },
      { order: 5, title: 'Opción rollback Helm', type: 'approval' },
    ],
    owner: 'Plataforma',
    avgDuration: '1m 30s',
    successRate: 94,
    executions7d: 15,
    lastRunLabel: 'Hace 35 min',
    lastResult: 'warning',
    trigger: 'alert',
    linkedTo: 'Alert: CrashLoopBackOff',
    status: 'published',
    requiresApproval: false,
  },
  {
    id: 'rb-pg-backup',
    name: 'Backup PostgreSQL',
    description: 'Dump lógico, subida a bucket S3 y verificación de checksum.',
    category: 'db',
    tags: ['postgres', 'backup', 'rds'],
    steps: [
      { order: 1, title: 'Bloquear escrituras demo', type: 'approval' },
      { order: 2, title: 'pg_dump custom', type: 'command', command: 'pg_dump -Fc -f /backup/db.dump' },
      { order: 3, title: 'Subir a S3', type: 'command' },
      { order: 4, title: 'Verificar tamaño', type: 'check' },
      { order: 5, title: 'Registrar en catálogo', type: 'notify' },
      { order: 6, title: 'Limpiar backups >30d', type: 'command' },
      { order: 7, title: 'Confirmar restore test', type: 'check' },
    ],
    owner: 'DBA',
    avgDuration: '8m 20s',
    successRate: 99,
    executions7d: 7,
    lastRunLabel: 'Hace 6 h',
    lastResult: 'success',
    trigger: 'schedule',
    linkedTo: 'db-primary',
    status: 'published',
    requiresApproval: true,
  },
  {
    id: 'rb-ssh',
    name: 'Diagnóstico SSH',
    description: 'Prueba puerto 22, claves autorizadas y últimos intentos fallidos en auth.log.',
    category: 'security',
    tags: ['ssh', 'access', 'bastion'],
    steps: [
      { order: 1, title: 'nc -zv host 22', type: 'command' },
      { order: 2, title: 'Revisar authorized_keys', type: 'check' },
      { order: 3, title: 'grep Failed password', type: 'command' },
      { order: 4, title: 'Resumen a seguridad', type: 'notify' },
      { order: 5, title: 'Abrir ticket si bloqueo', type: 'approval' },
    ],
    owner: 'Seguridad',
    avgDuration: '2m',
    successRate: 88,
    executions7d: 4,
    lastRunLabel: 'Hace 3 días',
    lastResult: 'warning',
    trigger: 'manual',
    linkedTo: 'vps-bastion-01',
    status: 'published',
    requiresApproval: false,
  },
  {
    id: 'rb-ports',
    name: 'Puertos abiertos',
    description: 'Escaneo controlado de puertos esperados y comparación con baseline de firewall.',
    category: 'security',
    tags: ['firewall', 'nmap', 'compliance'],
    steps: [
      { order: 1, title: 'Cargar baseline', type: 'check' },
      { order: 2, title: 'ss -tulpn', type: 'command' },
      { order: 3, title: 'Diff con baseline', type: 'check' },
      { order: 4, title: 'Alertar desviaciones', type: 'notify' },
    ],
    owner: 'Seguridad',
    avgDuration: '1m 05s',
    successRate: 85,
    executions7d: 3,
    lastRunLabel: 'Hace 1 semana',
    lastResult: 'error',
    trigger: 'alert',
    linkedTo: 'Alert: open ports',
    status: 'published',
    requiresApproval: false,
  },
  {
    id: 'rb-cpu',
    name: 'Investigación CPU alta',
    description: 'Top procesos, hilos Java, métricas Prometheus y recomendación de scale-out.',
    category: 'infra',
    tags: ['cpu', 'apm', 'java'],
    steps: [
      { order: 1, title: 'top / ps aux', type: 'command' },
      { order: 2, title: 'Consultar métricas 1h', type: 'check' },
      { order: 3, title: 'Heap dump si Java', type: 'approval' },
      { order: 4, title: 'Sugerir HPA', type: 'notify' },
      { order: 5, title: 'Documentar en incidente', type: 'notify' },
      { order: 6, title: 'Scale deployment', type: 'approval' },
      { order: 7, title: 'Validar CPU <70%', type: 'check' },
      { order: 8, title: 'Cerrar alerta', type: 'command' },
    ],
    owner: 'SRE',
    avgDuration: '5m 40s',
    successRate: 82,
    executions7d: 6,
    lastRunLabel: 'Hace 4 h',
    lastResult: 'warning',
    trigger: 'alert',
    linkedTo: 'Alert: High CPU',
    status: 'published',
    requiresApproval: true,
  },
  {
    id: 'rb-docker',
    name: 'Reiniciar Docker',
    description: 'Reinicio del daemon Docker y verificación de contenedores críticos.',
    category: 'infra',
    tags: ['docker', 'systemd'],
    steps: [
      { order: 1, title: 'Listar contenedores', type: 'command', command: 'docker ps' },
      { order: 2, title: 'systemctl restart docker', type: 'command' },
      { order: 3, title: 'Esperar healthy', type: 'check' },
    ],
    owner: 'SRE',
    avgDuration: '1m',
    successRate: 96,
    executions7d: 2,
    lastRunLabel: 'Nunca en prod',
    lastResult: 'never',
    trigger: 'manual',
    linkedTo: 'docker-host',
    status: 'draft',
    requiresApproval: true,
  },
]

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
