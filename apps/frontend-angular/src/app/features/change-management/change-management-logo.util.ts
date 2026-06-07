import { providerToLogo } from '../overview/utils/provider-logo.util'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import type { ChangeCloud, ChangeRequest, ChangeTemplate } from './change-management.demo'

const uniqueLogos = (keys: (NavLogoKey | null | undefined)[]): NavLogoKey[] => {
  const seen = new Set<NavLogoKey>()
  const out: NavLogoKey[] = []
  for (const key of keys) {
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

export const cloudToLogo = (cloud: ChangeCloud): NavLogoKey => cloud

export const changeLogos = (change: ChangeRequest): NavLogoKey[] =>
  uniqueLogos([
    ...change.affectedResources.map((r) => cloudToLogo(r.cloud)),
    providerToLogo(change.service),
    providerToLogo(change.title),
    ...change.tags.map((tag) => providerToLogo(tag)),
    ...change.affectedResources.map((r) => providerToLogo(r.type)),
    ...change.affectedResources.map((r) => providerToLogo(r.name)),
  ])

export const primaryChangeLogo = (change: ChangeRequest): NavLogoKey | null =>
  changeLogos(change)[0] ?? null

const CATEGORY_LOGO: Record<string, NavLogoKey> = {
  Infraestructura: 'terraform',
  Kubernetes: 'kubernetes',
  'Base de datos': 'postgresql',
  Cache: 'redis',
  Seguridad: 'aws',
}

export const templateLogo = (template: ChangeTemplate): NavLogoKey | null => {
  const byCategory = CATEGORY_LOGO[template.category]
  if (byCategory) return byCategory
  for (const service of template.services) {
    const logo = providerToLogo(service)
    if (logo) return logo
  }
  return providerToLogo(template.name)
}

export const templateServiceLogos = (template: ChangeTemplate): NavLogoKey[] =>
  uniqueLogos(template.services.map((s) => providerToLogo(s)))
