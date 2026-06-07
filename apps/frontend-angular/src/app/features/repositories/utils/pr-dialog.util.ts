import { CLIENT_DEMO_GITHUB_ACTIONS } from './github-demo-catalog'

export type GithubPr = Record<string, unknown>

export type PrCommitRow = {
  sha: string
  message: string
  author: string
  date: string
  additions: number
  deletions: number
  filesChanged: number
  verified: boolean
}

export type PrCheckJob = {
  id: string
  name: string
  status: 'success' | 'failed' | 'running' | 'pending' | 'skipped'
  detail: string
  duration: string
  workflow: string
}

export type PrReviewerRow = {
  user: string
  team: string
  status: 'approved' | 'changes_requested' | 'pending' | 'commented'
  comments: number
  load: string
}

export type PrPreviewInfo = {
  url: string
  ttl: string
  namespace: string
  commit: string
  status: 'live' | 'deploying' | 'expired' | 'none'
  lastDeploy: string
  healthCheck: string
}

export type PrMergeInfo = {
  blocked: boolean
  blockReason?: string
  strategies: { id: string; label: string; recommended: boolean; detail: string }[]
  impact: string
  requiredApprovals: number
  currentApprovals: number
}

export const prGithubUrl = (pr: GithubPr): string =>
  `https://github.com/${pr['repoFullName']}/pull/${pr['number']}`

export const prChecksUrl = (pr: GithubPr): string => `${prGithubUrl(pr)}/checks`

export const prCommitsUrl = (pr: GithubPr): string => `${prGithubUrl(pr)}/commits`

export const prFilesUrl = (pr: GithubPr): string => `${prGithubUrl(pr)}/files`

export const prActionsUrl = (pr: GithubPr): string =>
  `https://github.com/${pr['repoFullName']}/actions`

export const buildPrDemoCommits = (pr: GithubPr): PrCommitRow[] => {
  const n = Number(pr['commits'] ?? 4)
  const base = String(pr['head'])
  const author = String(pr['author'])
  const titles = [
    `feat: ${pr['title']}`,
    'test: cobertura acciones globales',
    'docs: README webhooks y PRs',
    'fix: lint y tipos routing',
    'chore: bump dependencias',
    'refactor: extraer util de demo',
    'ci: ajustar workflow staging',
    'style: tokens UI plana',
  ]
  return Array.from({ length: Math.min(n, 8) }, (_, i) => ({
    sha: `${base.replace(/\//g, '').slice(0, 4)}${(1000 + i).toString(16)}abc${i}`,
    message: titles[i] ?? `commit ${i + 1} en ${base}`,
    author: i === 0 ? author : i % 2 ? 'ana.dev' : 'carlos.ops',
    date: new Date(Date.now() - i * 3600_000 * 5).toISOString(),
    additions: Math.max(4, Math.floor(Number(pr['additions'] ?? 100) / n)),
    deletions: Math.max(1, Math.floor(Number(pr['deletions'] ?? 20) / n)),
    filesChanged: Math.max(1, 3 + (i % 4)),
    verified: i < 2 && pr['checks'] !== 'failed',
  }))
}

export const buildPrCheckJobs = (pr: GithubPr): PrCheckJob[] => {
  const failed = pr['checks'] === 'failed'
  const pending = pr['checks'] === 'pending'
  const repo = String(pr['repoFullName'])
  const jobs: PrCheckJob[] = [
    {
      id: 'lint',
      name: 'lint',
      status: pending ? 'running' : 'success',
      detail: 'eslint + prettier + stylelint',
      duration: pending ? '—' : '42s',
      workflow: 'CI — build-and-test',
    },
    {
      id: 'unit',
      name: 'unit-tests',
      status: failed ? 'failed' : pending ? 'pending' : 'success',
      detail: failed ? '2 failed · 140 passed' : '142 passed',
      duration: failed ? '1m 58s' : pending ? '—' : '2m 00s',
      workflow: 'CI — build-and-test',
    },
    {
      id: 'build',
      name: 'build',
      status: failed ? 'skipped' : pending ? 'pending' : 'success',
      detail: failed ? 'skipped (upstream failed)' : 'angular production build',
      duration: failed ? '—' : pending ? '—' : '3m 00s',
      workflow: 'CI — build-and-test',
    },
    {
      id: 'e2e',
      name: 'e2e-smoke',
      status: failed ? 'skipped' : 'success',
      detail: '3 specs · chromium',
      duration: failed ? '—' : '1m 35s',
      workflow: 'CI — build-and-test',
    },
    {
      id: 'security',
      name: 'security-scan',
      status: 'success',
      detail: 'npm audit + trivy',
      duration: '1m 12s',
      workflow: 'Security scan',
    },
    {
      id: 'preview',
      name: 'deploy-preview',
      status: pr['draft'] ? 'skipped' : pending ? 'pending' : 'success',
      detail: pr['draft'] ? 'omitido (draft)' : `preview-pr-${pr['number']}.cloudops.dev`,
      duration: pr['draft'] ? '—' : '1m 48s',
      workflow: 'CD — deploy-preview',
    },
  ]
  return jobs.map((j) => ({ ...j, workflow: j.workflow.replace('cloudops', repo.split('/')[0] ?? 'cloudops') }))
}

export const buildPrReviewers = (pr: GithubPr): PrReviewerRow[] => {
  const assigned = (pr['reviewers'] as string[]) ?? []
  const suggestions: PrReviewerRow[] = [
    { user: 'ana.dev', team: 'frontend', status: 'pending', comments: 0, load: '3 PRs abiertos' },
    { user: 'carlos.ops', team: 'platform', status: 'approved', comments: 2, load: '1 PR abierto' },
    { user: 'sre-lead', team: 'sre', status: 'commented', comments: 4, load: '2 PRs abiertos' },
    { user: 'infra-bot', team: 'automation', status: 'pending', comments: 0, load: '0 PRs abiertos' },
  ]
  return suggestions.map((s) =>
    assigned.includes(s.user)
      ? { ...s, status: s.user === 'carlos.ops' ? 'approved' : s.status }
      : s,
  )
}

export const buildPrPreview = (pr: GithubPr): PrPreviewInfo => {
  const num = pr['number']
  const draft = Boolean(pr['draft'])
  return {
    url: draft ? '—' : `https://preview-pr-${num}.cloudops.dev`,
    ttl: '72 h',
    namespace: `preview-pr-${num}`,
    commit: String(pr['head']),
    status: draft ? 'none' : pr['checks'] === 'pending' ? 'deploying' : 'live',
    lastDeploy: draft ? '—' : 'hace 18 min',
    healthCheck: draft ? '—' : '200 OK · /health',
  }
}

export const buildPrMergeInfo = (pr: GithubPr): PrMergeInfo => {
  const blocked = Boolean(pr['conflicts'] || pr['checks'] === 'failed' || pr['draft'])
  const blockReason = pr['conflicts']
    ? 'Conflictos sin resolver en values.yaml y package-lock.json'
    : pr['draft']
      ? 'PR en borrador — publica antes de fusionar'
      : pr['checks'] === 'failed'
        ? 'Checks de CI fallidos — corrige unit-tests'
        : undefined
  const commits = Number(pr['commits'] ?? 1)
  return {
    blocked,
    blockReason,
    requiredApprovals: 1,
    currentApprovals: (pr['reviewers'] as string[])?.includes('carlos.ops') ? 1 : 0,
    strategies: [
      {
        id: 'squash',
        label: 'Squash and merge',
        recommended: commits > 5,
        detail: 'Un commit en main con mensaje del PR',
      },
      {
        id: 'rebase',
        label: 'Rebase and merge',
        recommended: commits <= 5 && !pr['conflicts'],
        detail: 'Historial lineal sin merge commit',
      },
      {
        id: 'merge',
        label: 'Create merge commit',
        recommended: false,
        detail: 'Preserva commits individuales del PR',
      },
    ],
    impact: blocked
      ? 'Merge bloqueado hasta resolver impedimentos.'
      : 'Disparará workflow CD — deploy-staging tras merge.',
  }
}

export const repoWorkflows = (repoFullName: string): Record<string, unknown>[] =>
  CLIENT_DEMO_GITHUB_ACTIONS.filter((a) => a['repoFullName'] === repoFullName)

export const prQuickLinks = (pr: GithubPr) => {
  const base = prGithubUrl(pr)
  const repo = String(pr['repoFullName'])
  return [
    { id: 'pr', label: 'Pull Request', icon: 'merge', url: base, path: `/pull/${pr['number']}` },
    { id: 'files', label: 'Archivos', icon: 'difference', url: `${base}/files`, path: '/files' },
    { id: 'commits', label: 'Commits', icon: 'history', url: `${base}/commits`, path: '/commits' },
    { id: 'checks', label: 'Checks', icon: 'rule', url: `${base}/checks`, path: '/checks' },
    { id: 'actions', label: 'Actions', icon: 'bolt', url: prActionsUrl(pr), path: '/actions' },
    { id: 'repo', label: 'Repositorio', icon: 'folder', url: `https://github.com/${repo}`, path: '' },
  ]
}
