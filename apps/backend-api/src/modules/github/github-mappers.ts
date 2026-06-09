import type {
  GithubAccount,
  GithubBranch,
  GithubCommit,
  GithubDeployment,
  GithubPullRequest,
  GithubRepository,
  GithubWebhook,
} from '@prisma/client'

const statusLabelEs = (status: string): string => {
  if (status === 'connected') return 'Conectada'
  if (status === 'pending') return 'Pendiente'
  if (status === 'invalid') return 'Inválida'
  return status
}

export const isDemoGithubAccount = (a: Pick<GithubAccount, 'tokenRef'>): boolean =>
  a.tokenRef?.startsWith('demo:') === true || a.tokenRef === 'demo'

export const mapAccount = (a: GithubAccount) => ({
  id: a.id,
  label: a.label,
  username: a.username,
  organization: '—',
  accountType: 'standard',
  accountTypeLabel: 'Estándar',
  status: a.status,
  statusLabel: statusLabelEs(a.status),
  avatarUrl: a.avatarUrl,
  lastValidatedAt: a.lastValidatedAt?.toISOString() ?? null,
  lastSyncAt: a.lastSyncAt?.toISOString() ?? null,
  createdAt: a.createdAt.toISOString(),
  demoMode: false,
})

export const mapRepo = (r: GithubRepository) => ({
  id: r.id,
  accountId: r.accountId,
  name: r.name,
  fullName: r.fullName,
  description: r.description ?? '',
  defaultBranch: r.defaultBranch,
  language: r.language ?? '',
  stars: r.stars,
  visibility: r.visibility,
  htmlUrl: r.htmlUrl,
  updatedAt: r.lastSyncAt?.toISOString() ?? r.createdAt.toISOString(),
  isDemo: false,
})

export const mapBranch = (b: GithubBranch) => ({
  name: b.name,
  protected: b.isProtected,
  lastCommitSha: b.lastSha ?? '',
  lastCommitMessage: b.lastMessage ?? '',
})

export const mapCommit = (c: GithubCommit) => ({
  sha: c.sha,
  message: c.message,
  author: c.author,
  date: c.committedAt.toISOString(),
  branch: c.branch,
})

export const mapPullRequest = (pr: GithubPullRequest) => ({
  id: pr.number,
  number: pr.number,
  title: pr.title,
  state: pr.state,
  author: pr.author,
  base: pr.baseBranch,
  head: pr.headBranch,
  createdAt: pr.createdAt.toISOString(),
})

export const mapWebhook = (w: GithubWebhook, repoFullName?: string | null) => ({
  id: w.id,
  repoId: w.repoId,
  repoFullName: repoFullName ?? '',
  event: w.event,
  url: w.url,
  active: w.isActive,
})

export const mapDeployment = (d: GithubDeployment, repoFullName: string) => ({
  id: d.id,
  repoId: d.repoId,
  repoFullName,
  branch: d.branch,
  targetType: d.targetType,
  targetId: d.targetId,
  targetName: d.targetName,
  status: d.status,
  logs: d.logs,
  createdAt: d.createdAt.toISOString(),
  finishedAt: d.finishedAt?.toISOString() ?? null,
})
