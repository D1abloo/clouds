import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import type {
  ServiceCatalogCategory,
  ServiceCatalogCloud,
  ServiceCatalogEnvironment,
  ServiceCatalogLaunch,
  ServiceCatalogStatus,
  ServiceCatalogTemplate,
} from './service-catalog.types'
import { CATEGORY_TECH_LOGO, CATEGORY_PROVISION_STEPS } from './service-catalog.config'

export interface ServiceCatalogFormValue {
  name: string
  description: string
  category: ServiceCatalogCategory
  cloud: ServiceCatalogCloud
  environment: ServiceCatalogEnvironment
  version: string
  owner: string
  contactEmail: string
  tags: string
  avgProvision: string
  estimatedCost: string
  parameters: string
  documentationUrl: string
  resourcesCreated: string
  provisionSteps: string
  requiresApproval: boolean
  publishNow: boolean
}

export const parseTags = (raw: string): string[] =>
  raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

export const parseLines = (raw: string): string[] =>
  raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

export const buildTemplateFromForm = (
  form: ServiceCatalogFormValue,
  techLogo?: NavLogoKey,
): ServiceCatalogTemplate => {
  const status: ServiceCatalogStatus = form.publishNow ? 'published' : 'draft'
  const resources = parseLines(form.resourcesCreated)
  const steps = parseLines(form.provisionSteps)
  return {
    id: `tpl-${Date.now()}`,
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    cloud: form.cloud,
    techLogo: techLogo ?? CATEGORY_TECH_LOGO[form.category],
    version: form.version.trim() || 'v1.0',
    owner: form.owner.trim() || 'platform-team',
    status,
    tags: parseTags(form.tags),
    launches30d: 0,
    avgProvision: form.avgProvision.trim() || '10 min',
    updatedAt: new Date().toISOString(),
    requiresApproval: form.requiresApproval,
    environment: form.environment,
    parameters: form.parameters.trim() || undefined,
    documentationUrl: form.documentationUrl.trim() || undefined,
    estimatedCost: form.estimatedCost.trim() || undefined,
    resourcesCreated: resources.length ? resources : undefined,
    provisionSteps: steps.length ? steps : defaultProvisionSteps(form.category),
    successRate: 100,
    contactEmail: form.contactEmail.trim() || undefined,
  }
}

export const mergeTemplateFromForm = (
  base: ServiceCatalogTemplate,
  form: ServiceCatalogFormValue,
): ServiceCatalogTemplate => {
  const built = buildTemplateFromForm(form, CATEGORY_TECH_LOGO[form.category])
  return {
    ...built,
    id: base.id,
    status: base.status,
    launches30d: base.launches30d,
    successRate: base.successRate ?? 100,
    provisionSteps: parseLines(form.provisionSteps).length
      ? parseLines(form.provisionSteps)
      : base.provisionSteps ?? built.provisionSteps,
    updatedAt: new Date().toISOString(),
  }
}

export const defaultProvisionSteps = (category: ServiceCatalogCategory): string[] =>
  CATEGORY_PROVISION_STEPS[category]

export interface ServiceCatalogLaunchOptions {
  dryRun: boolean
  environment: ServiceCatalogEnvironment
  parameters: string
  notifyOnComplete: boolean
  note: string
}

export const simulateLaunchOutput = (
  tpl: ServiceCatalogTemplate,
  opts: ServiceCatalogLaunchOptions,
): {
  status: ServiceCatalogLaunch['status']
  output: string
  duration: string
  resourceId?: string
  errorMessage?: string
} => {
  if (opts.dryRun) {
    return {
      status: 'success',
      duration: '3s',
      output: [
        `[dry-run] Validación OK · ${tpl.name}`,
        `cloud=${tpl.cloud} env=${opts.environment}`,
        `params:\n${opts.parameters || tpl.parameters || '—'}`,
        `recursos: ${(tpl.resourcesCreated ?? []).join(', ') || '—'}`,
        'Sin cambios en infraestructura',
      ].join('\n'),
    }
  }
  if (tpl.status === 'draft') {
    return {
      status: 'failed',
      duration: '0s',
      errorMessage: 'Plantilla en borrador',
      output: 'Error: publica la plantilla antes de lanzar',
    }
  }
  const roll = Math.random()
  if (roll < 0.08) {
    return {
      status: 'failed',
      duration: '4m 20s',
      errorMessage: 'Timeout en paso de aprovisionamiento',
      output: `[error] Fallo en paso 3/${(tpl.provisionSteps ?? []).length || 4}\n→ Timeout esperando recurso principal`,
    }
  }
  const resourceId = `${tpl.category}-${tpl.cloud}-${Math.floor(Math.random() * 900 + 100)}`
  const lines = (tpl.provisionSteps ?? defaultProvisionSteps(tpl.category)).map((s) => `[ok] ${s}`)
  if (opts.note) lines.push(`[note] ${opts.note}`)
  lines.push(`[ok] Recurso ${resourceId} disponible`)
  return {
    status: 'success',
    duration: tpl.avgProvision.replace(' min', 'm 05s'),
    resourceId,
    output: lines.join('\n'),
  }
}

export interface ServiceCatalogImportPayload {
  name: string
  description?: string
  category?: ServiceCatalogCategory
  cloud?: ServiceCatalogCloud
  environment?: ServiceCatalogEnvironment
  version?: string
  owner?: string
  tags?: string[]
  avgProvision?: string
  estimatedCost?: string
  parameters?: string
  requiresApproval?: boolean
}

export const buildTemplateFromImport = (payload: ServiceCatalogImportPayload): ServiceCatalogTemplate => {
  const category = payload.category ?? 'instance'
  const cloud = payload.cloud ?? 'aws'
  return {
    id: `tpl-import-${Date.now()}`,
    name: payload.name.trim(),
    description: payload.description?.trim() ?? '',
    category,
    cloud,
    techLogo: CATEGORY_TECH_LOGO[category],
    version: payload.version?.trim() || 'v1.0',
    owner: payload.owner?.trim() || 'platform-team',
    status: 'draft',
    tags: payload.tags ?? ['import'],
    launches30d: 0,
    avgProvision: payload.avgProvision?.trim() || '10 min',
    updatedAt: new Date().toISOString(),
    requiresApproval: payload.requiresApproval ?? false,
    environment: payload.environment ?? 'staging',
    parameters: payload.parameters,
    estimatedCost: payload.estimatedCost,
    provisionSteps: defaultProvisionSteps(category),
    successRate: 100,
  }
}

export const templateToFormValue = (t: ServiceCatalogTemplate): ServiceCatalogFormValue => ({
  name: t.name,
  description: t.description,
  category: t.category,
  cloud: t.cloud,
  environment: t.environment ?? 'staging',
  version: t.version,
  owner: t.owner,
  contactEmail: t.contactEmail ?? '',
  tags: t.tags.join(', '),
  avgProvision: t.avgProvision,
  estimatedCost: t.estimatedCost ?? '',
  parameters: t.parameters ?? '',
  documentationUrl: t.documentationUrl ?? '',
  resourcesCreated: (t.resourcesCreated ?? []).join('\n'),
  provisionSteps: (t.provisionSteps ?? defaultProvisionSteps(t.category)).join('\n'),
  requiresApproval: t.requiresApproval,
  publishNow: false,
})

export const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manual',
  api: 'API',
  webhook: 'Webhook',
  schedule: 'Programado',
}
