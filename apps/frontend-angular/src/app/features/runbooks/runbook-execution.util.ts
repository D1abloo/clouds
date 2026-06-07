import type { Runbook, RunbookExecution, RunbookExecutionStepLog, RunbookExecutionStepStatus } from './runbooks.demo'

const STEP_DURATIONS = ['3s', '8s', '12s', '5s', '18s', '22s', '4s', '9s']

const stepStatusForIndex = (
  index: number,
  completed: number,
  total: number,
  overall: RunbookExecution['result'],
): RunbookExecutionStepStatus => {
  const order = index + 1
  if (order > completed) {
    if (overall === 'error' && order === completed + 1) return 'error'
    return 'skipped'
  }
  if (overall === 'warning' && order === completed) return 'warning'
  return 'success'
}

const demoOutputForStep = (
  step: Runbook['steps'][number],
  status: RunbookExecutionStepStatus,
): string => {
  if (status === 'skipped') return 'Paso no ejecutado (ejecución detenida antes)'
  if (status === 'pending') return 'Pendiente'
  if (status === 'error') {
    if (step.type === 'command') return `exit code 1 · ${step.command ?? 'command'} failed`
    return 'Comprobación fallida · criterio no cumplido'
  }
  if (status === 'warning') return 'Completado con advertencias · revisar métricas'
  switch (step.type) {
    case 'command':
      return step.command ? `$ ${step.command}\n→ OK (0)` : 'Comando finalizado correctamente'
    case 'check':
      return 'Comprobación superada'
    case 'approval':
      return 'Aprobación registrada · ops-lead@cloudops.local'
    case 'notify':
      return 'Notificación enviada · canal #ops-demo'
    default:
      return 'OK'
  }
}

export const buildExecutionStepLogs = (
  rb: Runbook,
  stepsCompleted: number,
  stepsTotal: number,
  result: RunbookExecution['result'],
  dryRun = false,
): RunbookExecutionStepLog[] => {
  const steps = rb.steps.length ? rb.steps : [{ order: 1, title: 'Paso único', type: 'check' as const }]
  const total = stepsTotal || steps.length
  return steps.slice(0, total).map((step, i) => {
    const status = dryRun
      ? ('success' as RunbookExecutionStepStatus)
      : stepStatusForIndex(i, stepsCompleted, total, result)
    return {
      order: step.order,
      title: step.title,
      type: step.type,
      status,
      duration: dryRun ? '0s' : STEP_DURATIONS[i % STEP_DURATIONS.length],
      command: step.command,
      output: dryRun
        ? `[dry-run] Simulado sin ejecutar${step.command ? `: ${step.command}` : ''}`
        : demoOutputForStep(step, status),
    }
  })
}

export const buildExecutionFullLog = (
  ex: Pick<
    RunbookExecution,
    | 'id'
    | 'runbookName'
    | 'startedAt'
    | 'finishedAt'
    | 'target'
    | 'provider'
    | 'accountName'
    | 'triggeredBy'
    | 'result'
    | 'dryRun'
    | 'note'
  >,
  stepLogs: RunbookExecutionStepLog[],
): string => {
  const lines: string[] = [
    `[${ex.id}] Runbook: ${ex.runbookName}`,
    `Inicio: ${new Date(ex.startedAt).toISOString()}`,
  ]
  if (ex.finishedAt) lines.push(`Fin: ${new Date(ex.finishedAt).toISOString()}`)
  lines.push(`Objetivo: ${ex.target}`)
  if (ex.provider) lines.push(`Proveedor: ${ex.provider}`)
  if (ex.accountName) lines.push(`Cuenta: ${ex.accountName}`)
  lines.push(`Disparado por: ${ex.triggeredBy}`)
  lines.push(`Resultado global: ${ex.result.toUpperCase()}`)
  lines.push(`Pasos: ${stepLogs.filter((s) => s.status === 'success' || s.status === 'warning').length}/${stepLogs.length} registrados en log`)
  if (ex.dryRun) lines.push('Modo: DRY-RUN (sin cambios en infraestructura)')
  if (ex.note) lines.push(`Nota operador: ${ex.note}`)
  lines.push('—'.repeat(48))
  stepLogs.forEach((s) => {
    lines.push('')
    lines.push(`[Paso ${s.order}] ${s.title} (${s.type}) · ${s.status} · ${s.duration ?? '—'}`)
    if (s.command) lines.push(`  comando: ${s.command}`)
    if (s.output) lines.push(`  salida:\n    ${s.output.replace(/\n/g, '\n    ')}`)
  })
  lines.push('')
  lines.push('—'.repeat(48))
  lines.push('Fin del registro')
  return lines.join('\n')
}

const inferEnvironment = (target: string, region?: string): string => {
  const hay = `${target} ${region ?? ''}`.toLowerCase()
  if (hay.includes('staging') || hay.includes('stage') || hay.includes('preprod')) return 'Staging'
  if (hay.includes('dev') || hay.includes('sandbox')) return 'Desarrollo'
  return 'Producción'
}

const buildFailureSummary = (
  ex: RunbookExecution,
  stepLogs: RunbookExecutionStepLog[],
): string => {
  if (ex.result === 'success' && ex.stepsCompleted >= ex.stepsTotal) {
    return 'Todos los pasos completados sin incidencias.'
  }
  const failed = stepLogs.find((s) => s.status === 'error')
  if (failed) {
    return `Fallo en paso ${failed.order} («${failed.title}»): ${failed.output?.split('\n')[0] ?? 'error de ejecución'}`
  }
  const warned = stepLogs.find((s) => s.status === 'warning')
  if (warned || ex.result === 'warning') {
    const pending = ex.stepsTotal - ex.stepsCompleted
    return pending > 0
      ? `Ejecución incompleta: ${ex.stepsCompleted}/${ex.stepsTotal} pasos. ${warned ? warned.title + ' con advertencias.' : 'Revisar criterios operativos.'}`
      : 'Completada con advertencias; revisar salidas de pasos.'
  }
  return ex.logExcerpt || 'Sin resumen de fallo disponible.'
}

export const enrichRunbookExecution = (
  ex: RunbookExecution,
  runbooks: Runbook[],
): RunbookExecution => {
  const rb = runbooks.find((r) => r.id === ex.runbookId)
  const finishedAt = ex.finishedAt ?? inferFinishedAt(ex.startedAt, ex.duration)
  const stepLogs =
    ex.stepLogs ??
    (rb
      ? buildExecutionStepLogs(rb, ex.stepsCompleted, ex.stepsTotal, ex.result, ex.dryRun)
      : [])
  const progressPercent = ex.stepsTotal
    ? Math.round((ex.stepsCompleted / ex.stepsTotal) * 100)
    : 0
  const base = {
    ...ex,
    finishedAt,
    category: ex.category ?? rb?.category,
    stepLogs,
    progressPercent,
    failureSummary: ex.failureSummary ?? buildFailureSummary(ex, stepLogs),
    environment: ex.environment ?? inferEnvironment(ex.target, ex.region),
    correlationId: ex.correlationId ?? `corr-${ex.id.replace(/^ex-/, '')}`,
    runbookDescription: ex.runbookDescription ?? rb?.description,
    runbookOwner: ex.runbookOwner ?? rb?.owner,
    runbookTrigger: ex.runbookTrigger ?? rb?.trigger,
    runbookTags: ex.runbookTags ?? rb?.tags,
    runbookLinkedTo: ex.runbookLinkedTo ?? rb?.linkedTo,
    runbookRequiresApproval: ex.runbookRequiresApproval ?? rb?.requiresApproval,
    runbookAvgDuration: ex.runbookAvgDuration ?? rb?.avgDuration,
    runbookSuccessRate: ex.runbookSuccessRate ?? rb?.successRate,
  }
  return {
    ...base,
    fullLog:
      ex.fullLog ??
      buildExecutionFullLog(
        {
          id: base.id,
          runbookName: base.runbookName,
          startedAt: base.startedAt,
          finishedAt: base.finishedAt,
          target: base.target,
          provider: base.provider,
          accountName: base.accountName,
          triggeredBy: base.triggeredBy,
          result: base.result,
          dryRun: base.dryRun,
          note: base.note,
        },
        stepLogs,
      ),
  }
}

export const inferFinishedAt = (startedAt: string, durationLabel: string): string => {
  const start = new Date(startedAt).getTime()
  const m = durationLabel.match(/(\d+)\s*m/)
  const s = durationLabel.match(/(\d+)\s*s/)
  let ms = 0
  if (m) ms += Number.parseInt(m[1], 10) * 60000
  if (s) ms += Number.parseInt(s[1], 10) * 1000
  if (!ms) ms = 45000
  return new Date(start + ms).toISOString()
}
