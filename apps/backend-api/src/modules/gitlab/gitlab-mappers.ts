import type { GitlabAccount, GitlabProject } from '@prisma/client'

const statusLabelEs = (status: string): string => {
  if (status === 'connected') return 'Conectada'
  if (status === 'pending') return 'Pendiente'
  if (status === 'invalid') return 'Inválida'
  if (status === 'error') return 'Error'
  return status
}

export const mapGitlabAccount = (a: GitlabAccount, repoCount = 0) => ({
  id: a.id,
  label: a.label,
  connectionName: a.connectionName ?? a.label,
  username: a.username,
  authType: a.authType,
  baseUrl: a.baseUrl,
  syncFrequency: a.syncFrequency,
  lastError: a.lastError,
  status: a.status,
  statusLabel: statusLabelEs(a.status),
  avatarUrl: a.avatarUrl,
  lastValidatedAt: a.lastValidatedAt?.toISOString() ?? null,
  lastSyncAt: a.lastSyncAt?.toISOString() ?? null,
  createdAt: a.createdAt.toISOString(),
  repoCount,
  demoMode: false,
})

export const mapGitlabProject = (p: GitlabProject) => ({
  id: p.id,
  accountId: p.accountId,
  name: p.name,
  pathWithNamespace: p.pathWithNamespace,
  description: p.description ?? '',
  defaultBranch: p.defaultBranch,
  visibility: p.visibility,
  webUrl: p.webUrl,
  updatedAt: p.lastSyncAt?.toISOString() ?? p.createdAt.toISOString(),
})
