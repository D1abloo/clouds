import type {
  SchedulerCloudProvider,
  SchedulerEnvironment,
  SchedulerPriority,
  SchedulerRunHistory,
  SchedulerRunResult,
  SchedulerTask,
  SchedulerTaskStatus,
  SchedulerTaskType,
  SchedulerTimeoutAction,
  SchedulerRetryBackoff,
} from './scheduler.data'
import { NOTIFY_CHANNEL_DEFS } from './scheduler-form.config'

export interface SchedulerTaskFormValue {
  name: string
  description: string
  type: SchedulerTaskType
  cron: string
  timezone: string
  target: string
  owner: string
  assignee: string
  retries: number
  maxDuration: string
  tags: string
  linkedResource: string
  notifyOnFailure: boolean
  enabled: boolean
  maintenanceWindow: string
  command: string
  parameters: string
  concurrency: number
  cronMode: 'preset' | 'custom'
  cronCustom: string
  cloudProvider: SchedulerCloudProvider
  environment: SchedulerEnvironment
  priority: SchedulerPriority
  credentialProfile: string
  workingDirectory: string
  notifyChannels: string
  notifyOnSuccess: boolean
  skipIfRunning: boolean
  timeoutAction: SchedulerTimeoutAction
  documentationUrl: string
  executor: string
  retryBackoff: SchedulerRetryBackoff
  runOnceAfterSave: boolean
}

export interface SchedulerRunOptions {
  taskId: string
  dryRun: boolean
  forceRun: boolean
  notifyOnComplete: boolean
  note: string
}

const CRON_PRESETS: Record<string, string> = {
  '0 22 * * 1-5': 'Lun–Vie a las 22:00',
  '0 7 * * 1-5': 'Lun–Vie a las 07:00',
  '0 3 * * *': 'Todos los días a las 03:00',
  '0 4 * * 0': 'Domingos a las 04:00',
  '0 2 * * *': 'Todos los días a las 02:00',
  '*/30 * * * *': 'Cada 30 minutos',
  '0 8 * * 1': 'Lunes a las 08:00',
  '0 5 * * 0': 'Domingos a las 05:00',
  '0 6 * * 6': 'Sábados a las 06:00',
  '30 3 1 * *': 'Día 1 de cada mes 03:30',
  '0 */6 * * *': 'Cada 6 horas',
  '15 */2 * * *': 'Cada 2 h (min 15)',
  '*/15 * * * *': 'Cada 15 minutos',
}

export interface CronValidation {
  valid: boolean
  error?: string
}

export const validateCron = (expr: string): CronValidation => {
  const parts = expr.trim().split(/\s+/).filter(Boolean)
  if (!expr.trim()) return { valid: false, error: 'La expresión cron es obligatoria' }
  if (parts.length !== 5) return { valid: false, error: 'Debe tener 5 campos: min hora día mes día-semana' }
  const validPart = /^(\*|(\*\/)?\d+(,\d+)*(-\d+)?|\d+(-\d+)?(,\d+(-\d+)?)*|\d+\/\d+)$/
  const labels = ['minuto', 'hora', 'día del mes', 'mes', 'día de la semana']
  for (let i = 0; i < 5; i++) {
    if (!validPart.test(parts[i])) {
      return { valid: false, error: `Campo «${labels[i]}» no válido: ${parts[i]}` }
    }
  }
  return { valid: true }
}

export const computeNextRunAt = (cron: string): Date => {
  const parts = cron.trim().split(/\s+/)
  const now = new Date()
  if (parts.length !== 5) return new Date(now.getTime() + 45 * 60_000)

  const [minF, hourF] = parts
  if (minF.startsWith('*/')) {
    const interval = Math.max(1, parseInt(minF.slice(2), 10) || 30)
    return new Date(now.getTime() + interval * 60_000)
  }
  if (hourF.startsWith('*/')) {
    const interval = Math.max(1, parseInt(hourF.slice(2), 10) || 6)
    return new Date(now.getTime() + interval * 60 * 60_000)
  }
  if (minF !== '*' && hourF !== '*') {
    const h = parseInt(hourF, 10)
    const m = parseInt(minF, 10)
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      const d = new Date(now)
      d.setSeconds(0, 0)
      d.setHours(h, m, 0, 0)
      if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1)
      return d
    }
  }
  return new Date(now.getTime() + 45 * 60_000)
}

export const formatNextRunFromCron = (cron: string, timezone: string): string => {
  const next = computeNextRunAt(cron)
  try {
    return next.toLocaleString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone || 'UTC',
    })
  } catch {
    return next.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }
}

export const parseNotifyChannels = (raw: string): Record<string, string> => {
  const map: Record<string, string> = {}
  if (!raw.trim()) return map
  for (const part of raw.split(',')) {
    const piece = part.trim()
    const idx = piece.indexOf(':')
    if (idx === -1) continue
    map[piece.slice(0, idx)] = piece.slice(idx + 1)
  }
  return map
}

export const buildNotifyChannels = (channels: Record<string, string>): string =>
  NOTIFY_CHANNEL_DEFS.filter((c) => channels[c.id]?.trim())
    .map((c) => `${c.prefix}${channels[c.id].trim()}`)
    .join(', ')

export const RETRY_BACKOFF_LABELS: Record<SchedulerRetryBackoff, string> = {
  fixed: 'Fijo',
  linear: 'Lineal',
  exponential: 'Exponencial',
}

export const cronToHuman = (cron: string): string =>
  CRON_PRESETS[cron.trim()] ?? `Programación: ${cron}`

export const parseTags = (raw: string): string[] =>
  raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

export const inferCloudProvider = (
  task: Pick<SchedulerTask, 'cloudProvider' | 'environment' | 'target' | 'tags'>,
): SchedulerCloudProvider => {
  if (task.cloudProvider) return task.cloudProvider
  const tags = task.tags.map((t) => t.toLowerCase())
  if (tags.includes('gcp') || tags.includes('google')) return 'gcp'
  if (tags.includes('azure')) return 'azure'
  if (tags.includes('aws')) return 'aws'
  const target = task.target.toLowerCase()
  if (target.includes('gcp') || target.includes('google')) return 'gcp'
  if (target.includes('azure')) return 'azure'
  if (target.includes('aws')) return 'aws'
  if (task.environment === 'staging') return 'gcp'
  if (task.environment === 'development') return 'azure'
  return 'aws'
}

export const taskToFormValue = (task: SchedulerTask): SchedulerTaskFormValue => ({
  name: task.name,
  description: task.description,
  type: task.type,
  cron: task.cron,
  timezone: task.timezone,
  target: task.target,
  owner: task.owner,
  assignee: task.assignee,
  retries: task.retries,
  maxDuration: task.maxDuration,
  tags: task.tags.join(', '),
  linkedResource: task.linkedResource,
  notifyOnFailure: task.notifyOnFailure,
  enabled: task.enabled,
  maintenanceWindow: task.maintenanceWindow ?? '',
  command: task.command ?? '',
  parameters: task.parameters ?? '',
  concurrency: task.concurrency ?? 1,
  cronMode: CRON_PRESETS[task.cron] ? 'preset' : 'custom',
  cronCustom: CRON_PRESETS[task.cron] ? '' : task.cron,
  cloudProvider: inferCloudProvider(task),
  environment: task.environment ?? 'production',
  priority: task.priority ?? 'normal',
  credentialProfile: task.credentialProfile ?? '',
  workingDirectory: task.workingDirectory ?? '',
  notifyChannels: task.notifyChannels ?? '',
  notifyOnSuccess: task.notifyOnSuccess ?? false,
  skipIfRunning: task.skipIfRunning ?? true,
  timeoutAction: task.timeoutAction ?? 'retry',
  documentationUrl: task.documentationUrl ?? '',
  executor: task.executor ?? 'default',
  retryBackoff: task.retryBackoff ?? 'fixed',
  runOnceAfterSave: false,
})

export const buildTaskFromForm = (
  form: SchedulerTaskFormValue,
  existing?: SchedulerTask,
): SchedulerTask => {
  const now = Date.now()
  const id = existing?.id ?? `sch-${now}`
  const cronExpr =
    form.cronMode === 'custom' ? form.cronCustom.trim() || form.cron.trim() : form.cron.trim()
  const nextRunDate = computeNextRunAt(cronExpr)
  const status: SchedulerTaskStatus = form.enabled
    ? existing?.status === 'failed'
      ? 'failed'
      : 'running'
    : 'paused'
  return {
    id,
    name: form.name.trim(),
    description: form.description.trim(),
    type: form.type,
    cron: cronExpr,
    cronHuman: cronToHuman(cronExpr),
    timezone: form.timezone.trim(),
    target: form.target.trim(),
    owner: form.owner.trim(),
    assignee: form.assignee.trim(),
    nextRun: formatNextRunLabel(nextRunDate.toISOString()),
    nextRunAt: nextRunDate.toISOString(),
    lastRun: existing?.lastRun ?? 'Nunca',
    lastRunAt: existing?.lastRunAt ?? new Date(0).toISOString(),
    lastResult: existing?.lastResult ?? 'success',
    status,
    enabled: form.enabled,
    retries: Math.max(0, form.retries),
    maxDuration: form.maxDuration.trim() || '30m',
    successRate: existing?.successRate ?? 100,
    runs7d: existing?.runs7d ?? 0,
    failures7d: existing?.failures7d ?? 0,
    tags: parseTags(form.tags),
    linkedResource: form.linkedResource.trim(),
    notifyOnFailure: form.notifyOnFailure,
    maintenanceWindow: form.maintenanceWindow.trim() || undefined,
    command: form.command.trim() || undefined,
    parameters: form.parameters.trim() || undefined,
    concurrency: Math.max(1, form.concurrency),
    cloudProvider: form.cloudProvider,
    environment: form.environment,
    priority: form.priority,
    credentialProfile: form.credentialProfile.trim() || undefined,
    workingDirectory: form.workingDirectory.trim() || undefined,
    notifyChannels: form.notifyChannels.trim() || undefined,
    notifyOnSuccess: form.notifyOnSuccess,
    skipIfRunning: form.skipIfRunning,
    timeoutAction: form.timeoutAction,
    documentationUrl: form.documentationUrl.trim() || undefined,
    executor: form.executor === 'default' ? undefined : form.executor,
    retryBackoff: form.retryBackoff,
  }
}

export const ENVIRONMENT_LABELS: Record<SchedulerEnvironment, string> = {
  production: 'Producción',
  staging: 'Staging',
  development: 'Desarrollo',
}

export const PRIORITY_LABELS: Record<SchedulerPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  critical: 'Crítica',
}

export const TIMEOUT_ACTION_LABELS: Record<SchedulerTimeoutAction, string> = {
  abort: 'Abortar ejecución',
  retry: 'Reintentar según política',
  notify_only: 'Solo notificar',
}

export const simulateRunOutput = (
  task: SchedulerTask,
  opts: SchedulerRunOptions,
): { result: SchedulerRunResult; duration: string; output: string } => {
  if (opts.dryRun) {
    const lines = [
      `[dry-run] Validación OK`,
      `cron ${task.cron} · TZ ${task.timezone}`,
      `objetivo ${task.target}`,
      task.credentialProfile ? `credenciales ${task.credentialProfile}` : '',
      task.executor ? `executor ${task.executor}` : '',
      task.skipIfRunning !== false ? 'política: omitir si en ejecución' : 'política: permitir solapamiento',
    ].filter(Boolean)
    return { result: 'success', duration: '2s', output: lines.join('\n') }
  }
  if (!task.enabled && !opts.forceRun) {
    return {
      result: 'skipped',
      duration: '0s',
      output: 'Tarea deshabilitada — activa «Forzar» para ejecutar igualmente',
    }
  }
  if (task.skipIfRunning !== false && task.status === 'running') {
    return {
      result: 'skipped',
      duration: '0s',
      output: 'Omitida: ya hay una ejecución en curso (skipIfRunning)',
    }
  }
  const roll = Math.random()
  const failBias = task.priority === 'critical' ? 0.08 : task.priority === 'high' ? 0.1 : 0.12
  const result: SchedulerRunResult =
    task.status === 'failed' && roll < 0.35
      ? 'error'
      : roll < failBias
        ? 'warning'
        : 'success'
  const duration =
    result === 'success' ? `${20 + Math.floor(Math.random() * 180)}s` : `${5 + Math.floor(Math.random() * 40)}s`
  const backoff = task.retryBackoff ?? 'fixed'
  const lines = [
    `Ejecución manual · ${task.type} · ${inferCloudProvider(task).toUpperCase()} · entorno ${task.environment ?? 'production'}`,
    task.executor ? `Executor: ${task.executor}` : '',
    task.credentialProfile ? `Credenciales: ${task.credentialProfile}` : '',
    task.workingDirectory ? `CWD: ${task.workingDirectory}` : '',
    task.command ? `$ ${task.command}` : '',
    task.parameters ? `Params: ${task.parameters}` : '',
    task.timeoutAction ? `Timeout: ${TIMEOUT_ACTION_LABELS[task.timeoutAction]}` : '',
    `Reintentos: ${task.retries} (${RETRY_BACKOFF_LABELS[backoff]})`,
    opts.note ? `Nota: ${opts.note}` : '',
    result === 'success'
      ? 'Completado sin incidencias'
      : result === 'warning'
        ? 'Completado con advertencias — revisar logs'
        : task.retries > 0
          ? `Error — reintento disponible (${backoff})`
          : 'Error en paso principal',
  ].filter(Boolean)
  return { result, duration, output: lines.join('\n') }
}

export const buildHistoryFromRun = (
  task: SchedulerTask,
  result: SchedulerRunResult,
  duration: string,
  output: string,
  triggeredBy: string,
): SchedulerRunHistory => ({
  id: `run-${Date.now()}`,
  taskId: task.id,
  taskName: task.name,
  type: task.type,
  executedAt: new Date().toISOString(),
  duration,
  result,
  triggeredBy,
  output,
})

export const formatNextRunLabel = (iso: string): string => {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff < 0) return 'En breve'
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `En ${mins} min`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `En ${hrs} h`
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
