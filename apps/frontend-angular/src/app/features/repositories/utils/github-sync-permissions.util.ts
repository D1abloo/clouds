import { CLIENT_DEMO_GITHUB_REPOS } from './github-demo-catalog'
import type { GithubRepoScope } from './github-account-form.config'

export type GithubSyncPermissionInput = {
  scopes: string[]
  repoScope: GithubRepoScope
  organization?: string
  accountType?: string
}

export type GithubSyncPreview = {
  accessible: number
  skipped: number
  total: number
  canSync: boolean
  sampleRepos: string[]
  reasons: string[]
}

export const previewGithubRepoSync = (perms: GithubSyncPermissionInput): GithubSyncPreview => {
  const repos = CLIENT_DEMO_GITHUB_REPOS
  const total = repos.length
  const reasons: string[] = []

  if (!perms.scopes.includes('repo')) {
    return {
      accessible: 0,
      skipped: total,
      total,
      canSync: false,
      sampleRepos: [],
      reasons: ['Activa el scope repo para importar repositorios'],
    }
  }

  if (perms.repoScope === 'selected') {
    return {
      accessible: 0,
      skipped: total,
      total,
      canSync: true,
      sampleRepos: [],
      reasons: ['Tras conectar, elige los repos en el inventario'],
    }
  }

  if (perms.repoScope === 'organization') {
    const org = perms.organization?.trim().toLowerCase()
    if (!org) {
      return {
        accessible: 0,
        skipped: total,
        total,
        canSync: false,
        sampleRepos: [],
        reasons: ['Indica la organización para filtrar repos'],
      }
    }
    const isOrg = perms.accountType === 'organization' || perms.accountType === 'enterprise'
    if (isOrg && !perms.scopes.includes('read:org')) {
      reasons.push('Sin read:org puede haber repos omitidos de la org')
    }
    const matched = repos.filter((r) => r.fullName.toLowerCase().startsWith(`${org}/`))
    return {
      accessible: matched.length,
      skipped: total - matched.length,
      total,
      canSync: true,
      sampleRepos: matched.slice(0, 4).map((r) => r.fullName),
      reasons: matched.length ? reasons : [`Ningún repo bajo ${org} con estos permisos`, ...reasons],
    }
  }

  return {
    accessible: total,
    skipped: 0,
    total,
    canSync: true,
    sampleRepos: repos.slice(0, 4).map((r) => r.fullName),
    reasons,
  }
}

export const githubSyncPermissionsPayload = (body: {
  scopes: string[]
  repoScope: GithubRepoScope
  organization?: string
  accountType?: string
}) => ({
  scopes: body.scopes,
  repoScope: body.repoScope,
  organization: body.organization,
  accountType: body.accountType,
})
