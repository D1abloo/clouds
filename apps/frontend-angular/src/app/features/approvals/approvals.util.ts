import type { RunbookExecuteDialogResult } from '../runbooks/runbook-execute-dialog.component'
import type { Runbook } from '../runbooks/runbooks.demo'
import type {
  ServiceCatalogLaunch,
  ServiceCatalogTemplate,
  ServiceCatalogCategory,
} from '../service-catalog/service-catalog.demo'
import {
  simulateLaunchOutput,
  type ServiceCatalogLaunchOptions,
} from '../service-catalog/service-catalog.util'
import { APPROVAL_ENV_LABELS } from './approvals.config'
import type {
  ApprovalEnvironment,
  ApprovalPendingExecution,
  ApprovalRequest,
  ApprovalRisk,
} from './approvals.demo'

const CURRENT_USER = 'ops@cloudops.local'
const CURRENT_TEAM = 'Platform Engineering'

const riskForLaunch = (
  env: ApprovalEnvironment,
  tpl: ServiceCatalogTemplate,
): ApprovalRisk => {
  if (env === 'production') return tpl.category === 'terraform' ? 'critical' : 'high'
  if (env === 'staging') return 'medium'
  return 'low'
}

const riskForRunbook = (rb: Runbook): ApprovalRisk => {
  if (rb.category === 'security' || rb.category === 'db') return 'high'
  if (rb.requiresApproval) return 'medium'
  return 'low'
}

const slaMinutesFor = (risk: ApprovalRisk): number => {
  if (risk === 'critical') return 60
  if (risk === 'high') return 120
  return 180
}

export const buildServiceCatalogApproval = (
  tpl: ServiceCatalogTemplate,
  opts: ServiceCatalogLaunchOptions,
  requester = CURRENT_USER,
): ApprovalRequest => {
  const env = opts.environment
  const envLabel = APPROVAL_ENV_LABELS[env]
  const risk = riskForLaunch(env, tpl)
  const slaMinutes = slaMinutesFor(risk)
  const now = Date.now()
  const id = `apr-${now}`
  const params = opts.parameters?.trim() || tpl.parameters || ''
  const resources = (tpl.resourcesCreated ?? []).join(', ') || 'recursos definidos en la plantilla'

  const approvedSubject = `Lanzar plantilla «${tpl.name}» (${tpl.version}) en ${envLabel}`
  const onApproveEffect = `Se ejecutará el aprovisionamiento en ${tpl.cloud.toUpperCase()}: ${resources}. Coste est.: ${tpl.estimatedCost || '—'}.`

  const pendingExecution: ApprovalPendingExecution = {
    kind: 'service-catalog-launch',
    templateId: tpl.id,
    templateName: tpl.name,
    templateVersion: tpl.version,
    cloud: tpl.cloud,
    category: tpl.category,
    options: opts,
    requester,
  }

  return {
    id,
    action: `Lanzamiento · ${tpl.name}`,
    actionType: 'template_launch',
    source: 'service-catalog',
    resource: `${tpl.id} · ${tpl.name}`,
    resourceId: `pending-launch-${tpl.id}-${now}`,
    cloud: tpl.cloud,
    environment: env,
    requester,
    requesterTeam: CURRENT_TEAM,
    risk,
    status: 'pending',
    requestedAt: new Date(now).toISOString(),
    slaDeadline: new Date(now + slaMinutes * 60_000).toISOString(),
    slaMinutes,
    changeTicket: opts.note?.match(/CHG-\d+|INC-\d+/i)?.[0],
    justification: opts.note?.trim() || `Solicitud de lanzamiento de plantilla ${tpl.id} en ${envLabel}.`,
    approvedSubject,
    onApproveEffect,
    sourceEntityId: tpl.id,
    sourceEntityLabel: tpl.name,
    impact: {
      costDelta: tpl.estimatedCost,
      downtime: env === 'production' ? 'Según plantilla' : 'Ninguno esperado',
      affectedServices: tpl.tags.filter((t) => !['import', 'draft'].includes(t)),
      blastRadius: tpl.provisionSteps?.length
        ? `${tpl.provisionSteps.length} pasos de aprovisionamiento · ${tpl.cloud.toUpperCase()}`
        : `Plantilla ${tpl.category} · ${tpl.cloud.toUpperCase()}`,
    },
    approversRequired: env === 'production' ? 2 : 1,
    approversCompleted: 0,
    approvalChain:
      env === 'production'
        ? [
            { role: 'Tech Lead', user: 'lead@cloudops.io', status: 'pending' },
            { role: 'Security', user: 'security@cloudops.io', status: 'pending' },
          ]
        : [{ role: 'Platform Admin', user: 'admin@cloudops.io', status: 'pending' }],
    payload: params || undefined,
    pendingExecution,
    comments: [
      {
        author: requester,
        at: new Date(now).toISOString(),
        text: `Solicitud enviada desde Catálogo de servicios. Entorno: ${envLabel}.`,
      },
    ],
    tags: ['service-catalog', tpl.category, env, ...(tpl.tags.slice(0, 2))],
  }
}

export const buildRunbookApproval = (
  rb: Runbook,
  opts: RunbookExecuteDialogResult,
  requester = CURRENT_USER,
): ApprovalRequest => {
  const risk = riskForRunbook(rb)
  const slaMinutes = slaMinutesFor(risk)
  const now = Date.now()
  const id = `apr-${now}`

  const approvedSubject = `Ejecutar runbook «${rb.name}» en ${opts.target}`
  const onApproveEffect = `Se ejecutarán ${rb.steps.length} pasos del procedimiento (${rb.avgDuration} est.). Disparador: manual.`

  const pendingExecution: ApprovalPendingExecution = {
    kind: 'runbook-execute',
    runbookId: rb.id,
    runbookName: rb.name,
    execute: opts,
    requester,
  }

  return {
    id,
    action: `Runbook · ${rb.name}`,
    actionType: 'runbook_execute',
    source: 'runbooks',
    resource: rb.name,
    resourceId: rb.id,
    cloud: 'aws',
    environment: 'production',
    requester,
    requesterTeam: rb.owner,
    risk,
    status: 'pending',
    requestedAt: new Date(now).toISOString(),
    slaDeadline: new Date(now + slaMinutes * 60_000).toISOString(),
    slaMinutes,
    changeTicket: opts.note?.match(/CHG-\d+|INC-\d+/i)?.[0],
    justification: opts.note?.trim() || `Ejecución manual del runbook ${rb.id}.`,
    approvedSubject,
    onApproveEffect,
    sourceEntityId: rb.id,
    sourceEntityLabel: rb.name,
    impact: {
      downtime: rb.category === 'infra' ? '< según procedimiento' : '—',
      affectedServices: [opts.target],
      blastRadius: `${rb.steps.length} pasos · objetivo ${opts.target}`,
    },
    approversRequired: 1,
    approversCompleted: 0,
    approvalChain: [{ role: 'SRE Lead', user: 'sre-lead@cloudops.io', status: 'pending' }],
    payload: `runbook=${rb.id}\ntarget=${opts.target}\ninstance=${opts.instanceId ?? '—'}`,
    pendingExecution,
    comments: [
      {
        author: requester,
        at: new Date(now).toISOString(),
        text: `Solicitud enviada desde Runbooks.`,
      },
    ],
    tags: ['runbook', rb.category, ...rb.tags.slice(0, 2)],
  }
}

export const buildLaunchFromApproval = (
  req: ApprovalRequest,
  tpl: ServiceCatalogTemplate,
): ServiceCatalogLaunch => {
  const exec = req.pendingExecution
  if (!exec || exec.kind !== 'service-catalog-launch') {
    throw new Error('Invalid approval for catalog launch')
  }
  const opts = exec.options
  const result = simulateLaunchOutput(tpl, opts)
  return {
    id: `launch-${Date.now()}`,
    templateId: tpl.id,
    templateName: tpl.name,
    user: exec.requester,
    cloud: tpl.cloud,
    category: tpl.category,
    launchedAt: new Date().toISOString(),
    duration: result.duration,
    status: result.status,
    environment: opts.environment,
    parameters: opts.parameters || tpl.parameters,
    resourceId: result.resourceId,
    output: result.output,
    triggeredBy: 'approval',
    templateVersion: tpl.version,
    errorMessage: result.errorMessage,
    progress: result.status === 'running' ? 45 : undefined,
  }
}

export const needsApprovalBeforeLaunch = (
  tpl: ServiceCatalogTemplate,
  opts: ServiceCatalogLaunchOptions,
): boolean => tpl.requiresApproval && !opts.dryRun

export const needsApprovalBeforeRunbook = (
  rb: Runbook,
  dryRun: boolean,
): boolean => rb.requiresApproval && !dryRun
