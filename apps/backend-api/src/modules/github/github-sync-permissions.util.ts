import type { GithubRepoDemo } from './github-demo.data'

export type GithubSyncPermissions = {
  scopes?: string[]
  repoScope?: string
  organization?: string
  accountType?: string
}

export type GithubSyncFilterResult = {
  repos: GithubRepoDemo[]
  skipped: number
  total: number
  canSync: boolean
  reasons: string[]
}

const REQUIRED_REPO_SCOPE = 'repo'

export const filterDemoReposByPermissions = (
  repos: GithubRepoDemo[],
  perms: GithubSyncPermissions,
): GithubSyncFilterResult => {
  const reasons: string[] = []
  const scopes = perms.scopes ?? []
  const total = repos.length

  if (!scopes.includes(REQUIRED_REPO_SCOPE)) {
    return {
      repos: [],
      skipped: total,
      total,
      canSync: false,
      reasons: ['El scope repo es obligatorio para importar repositorios'],
    }
  }

  const isOrgAccount = perms.accountType === 'organization' || perms.accountType === 'enterprise'
  const repoScope = perms.repoScope ?? 'all'
  const orgSlug = perms.organization?.trim().toLowerCase()

  if (repoScope === 'selected') {
    return {
      repos: [],
      skipped: total,
      total,
      canSync: true,
      reasons: ['Alcance "lista explícita" — selecciona repos tras validar la cuenta'],
    }
  }

  if (repoScope === 'organization') {
    if (!orgSlug) {
      return {
        repos: [],
        skipped: total,
        total,
        canSync: false,
        reasons: ['Indica el slug de la organización para sincronizar sus repos'],
      }
    }
    if (isOrgAccount && !scopes.includes('read:org')) {
      reasons.push('Sin read:org solo se importan repos donde el token tiene acceso directo')
    }
    const filtered = repos.filter((r) => r.fullName.toLowerCase().startsWith(`${orgSlug}/`))
    const skipped = total - filtered.length
    if (!filtered.length) {
      reasons.push(`Ningún repo visible bajo la organización ${orgSlug}`)
    }
    return { repos: filtered, skipped, total, canSync: true, reasons }
  }

  return { repos: [...repos], skipped: 0, total, canSync: true, reasons }
}
