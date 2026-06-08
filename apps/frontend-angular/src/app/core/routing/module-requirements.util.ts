import {
  AI_UNAVAILABLE_COPY,
  EXTERNAL_CONNECTION_COPY,
  INTERNAL_EMPTY_MESSAGE,
  INTERNAL_EMPTY_TITLE,
  MODULE_LABEL_TO_ID,
  MODULE_REQUIREMENTS,
  OPTIONAL_CLOUD_CTA,
  type ExternalConnectionCopy,
  type ExternalProvider,
  type ModuleRequirement,
} from './module-requirements.config'

const normalizePath = (path: string): string => {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/'
  return clean.startsWith('/') ? clean : `/${clean}`
}

const PATH_PREFIX_TO_MODULE: [string, string][] = [
  ['/dashboard', 'dashboard'],
  ['/command-center', 'command-center'],
  ['/resource-explorer', 'resource-explorer'],
  ['/topology-map', 'topology-map'],
  ['/health-center', 'health-center'],
  ['/cloud/aws', 'aws'],
  ['/cloud/gcp', 'gcp'],
  ['/cloud/azure', 'azure'],
  ['/instances', 'instances'],
  ['/vps', 'vps'],
  ['/docker', 'docker'],
  ['/kubernetes', 'kubernetes'],
  ['/network', 'network'],
  ['/storage', 'storage'],
  ['/backups', 'backups'],
  ['/capacity-planner', 'capacity-planner'],
  ['/jenkins', 'jenkins'],
  ['/terraform', 'terraform'],
  ['/deployments', 'deployments'],
  ['/terminal/active-sessions', 'active-sessions'],
  ['/terminal/history', 'history'],
  ['/terminal', 'active-sessions'],
  ['/runbooks', 'runbooks'],
  ['/scheduler', 'scheduler'],
  ['/service-catalog', 'service-catalog'],
  ['/approvals', 'approvals'],
  ['/repositories/github', 'github'],
  ['/repositories/gitlab', 'gitlab'],
  ['/repositories/webhooks', 'webhooks'],
  ['/repositories/branches', 'branches'],
  ['/repositories/commits', 'commits'],
  ['/repositories/pull-requests', 'pull-requests'],
  ['/repositories/deployments', 'deployments'],
  ['/repositories', 'github'],
  ['/metrics', 'metrics'],
  ['/logs', 'logs'],
  ['/billing', 'billing'],
  ['/cost-optimizer', 'cost-optimizer'],
  ['/alerts', 'alerts'],
  ['/incidents', 'incidents'],
  ['/notifications', 'notifications'],
  ['/reports', 'reports'],
  ['/change-management', 'change-management'],
  ['/security-center', 'security-center'],
  ['/secrets-manager', 'secrets-manager'],
  ['/compliance', 'compliance'],
  ['/access-control', 'access-control'],
  ['/audit', 'audit'],
  ['/admin/users', 'users'],
  ['/admin/roles', 'roles'],
  ['/admin/api-tokens', 'api-tokens'],
  ['/admin/webhooks', 'webhooks'],
  ['/admin/demo-mode', 'demo-mode'],
  ['/settings', 'settings'],
  ['/ai-assistant', 'ai-assistant'],
]

export const resolveModuleId = (key: string): string => {
  const trimmed = key.trim()
  if (!trimmed) return ''
  if (MODULE_REQUIREMENTS[trimmed]) return trimmed
  if (MODULE_LABEL_TO_ID[trimmed]) return MODULE_LABEL_TO_ID[trimmed]
  const fromPath = resolveModuleIdFromPath(trimmed)
  return fromPath ?? trimmed.toLowerCase().replace(/\s+/g, '-')
}

export const resolveModuleIdFromPath = (path: string): string | null => {
  const full = normalizePath(path)
  const hit = PATH_PREFIX_TO_MODULE.find(([prefix]) => full === prefix || full.startsWith(`${prefix}/`))
  return hit?.[1] ?? null
}

export const getModuleRequirement = (key: string): ModuleRequirement | null => {
  const id = resolveModuleId(key)
  return MODULE_REQUIREMENTS[id] ?? null
}

export const requiresExternalConnection = (key: string): boolean =>
  getModuleRequirement(key)?.requiresExternalConnection === true

export const shouldBlockForMissingConnection = (key: string, liveData = false): boolean => {
  if (liveData) return false
  return requiresExternalConnection(key)
}

export const getInternalEmptyCopy = (key?: string): { title: string; message: string } => {
  const req = key ? getModuleRequirement(key) : null
  return {
    title: req?.emptyTitle ?? INTERNAL_EMPTY_TITLE,
    message: req?.emptyMessage ?? INTERNAL_EMPTY_MESSAGE,
  }
}

export const getExternalConnectionCopy = (provider: ExternalProvider): ExternalConnectionCopy =>
  EXTERNAL_CONNECTION_COPY[provider]

export const resolveConnectionCopy = (key: string): ExternalConnectionCopy => {
  const id = resolveModuleId(key)
  const req = MODULE_REQUIREMENTS[id]
  if (req?.kind === 'ai') return AI_UNAVAILABLE_COPY
  if (req?.provider) return EXTERNAL_CONNECTION_COPY[req.provider]
  return {
    title: INTERNAL_EMPTY_TITLE,
    description: INTERNAL_EMPTY_MESSAGE,
    actionLabel: 'Ir a Configuración',
    actionRoute: '/settings/general',
  }
}

export const shouldShowOptionalCloudCta = (key: string): boolean =>
  getModuleRequirement(key)?.showOptionalCloudCta === true

export const optionalCloudCtaCopy = (): ExternalConnectionCopy => OPTIONAL_CLOUD_CTA

/** Mensaje largo genérico — no debe mostrarse en UI. */
export const DEPRECATED_GENERIC_INTEGRATION_MSG =
  'Esta integración aún no está conectada. Añade las credenciales en Configuración para comenzar a usar esta función en modo PRO.'
