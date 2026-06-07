import { CLIENT_DEMO_GITHUB_REPOS, CLIENT_DEMO_GITHUB_PRS } from './github-demo-catalog'
import { CLIENT_DEMO_GITLAB_PROJECTS, CLIENT_DEMO_GITLAB_MRS } from './gitlab-demo-catalog'

const now = () => new Date().toISOString()

export type GlobalBranchRow = {
  id: string
  provider: 'github' | 'gitlab'
  repoOrProject: string
  name: string
  protected: boolean
  default: boolean
  stale: boolean
  lastCommitMessage: string
  lastCommitAt: string
  lastCommitSha?: string
  lastCommitAuthor?: string
  commitsAhead?: number
  commitsBehind?: number
  ciStatus: string
  ciWorkflow?: string
  deployStatus: string
  deployTarget?: string
  pipelineId?: string
}

export type GlobalCommitRow = {
  id: string
  provider: 'github' | 'gitlab'
  repoOrProject: string
  sha: string
  message: string
  author: string
  branch: string
  date: string
  ciStatus: string
  ciWorkflow?: string
  ciDuration?: string
  ciJobsPassed?: number
  ciJobsTotal?: number
  additions: number
  deletions: number
  filesChanged: number
  deployStatus: string
  deployEnvironment?: string
  deployTarget?: string
  deployVersion?: string
  relatedReview?: string
  verified?: boolean
  verificationStatus?: 'verified' | 'unverified' | 'partial'
  tags?: string[]
  signature?: string
  pipelineId?: string
  linkedDeploy?: string
}

export const buildGlobalDemoBranches = (): GlobalBranchRow[] => {
  const rows: GlobalBranchRow[] = []
  for (const r of CLIENT_DEMO_GITHUB_REPOS) {
    rows.push(
      {
        id: `gh-b-${r.id}-main`,
        provider: 'github',
        repoOrProject: r.fullName,
        name: r.defaultBranch,
        protected: true,
        default: true,
        stale: false,
        lastCommitMessage: 'fix: health endpoint',
        lastCommitAt: now(),
        lastCommitSha: `gh${r.id}a1b2c3d4e5f6`.padEnd(40, '0'),
        lastCommitAuthor: 'devops-lead',
        commitsAhead: 0,
        commitsBehind: 0,
        ciStatus: 'success',
        ciWorkflow: 'CI — build-and-test',
        deployStatus: 'success',
        deployTarget: 'cluster-prod-01',
        pipelineId: `gh-run-${8800 + r.id}`,
      },
      {
        id: `gh-b-${r.id}-develop`,
        provider: 'github',
        repoOrProject: r.fullName,
        name: 'develop',
        protected: false,
        default: false,
        stale: r.name === 'terraform-modules',
        lastCommitMessage: 'chore: deps bump',
        lastCommitAt: now(),
        lastCommitSha: `gh${r.id}b2c3d4e5f6a7`.padEnd(40, '8'),
        lastCommitAuthor: 'infra-bot',
        commitsAhead: 14,
        commitsBehind: 3,
        ciStatus: r.name === 'terraform-modules' ? 'failed' : 'success',
        ciWorkflow: r.name === 'terraform-modules' ? 'terraform plan' : 'lint + format',
        deployStatus: 'pending',
        deployTarget: 'cluster-staging',
        pipelineId: `gh-run-${8810 + r.id}`,
      },
    )
  }
  for (const p of CLIENT_DEMO_GITLAB_PROJECTS) {
    rows.push(
      {
        id: `gl-b-${p.id}-main`,
        provider: 'gitlab',
        repoOrProject: p.fullPath,
        name: p.defaultBranch,
        protected: true,
        default: true,
        stale: false,
        lastCommitMessage: 'feat: pipeline cache',
        lastCommitAt: now(),
        lastCommitSha: `gl${p.id}f6e5d4c3b2a1`.padEnd(40, '0'),
        lastCommitAuthor: 'cloudops-gitlab',
        commitsAhead: 0,
        commitsBehind: 0,
        ciStatus: 'success',
        ciWorkflow: 'build → test → deploy',
        deployStatus: 'success',
        deployTarget: 'k8s-prod-eu',
        pipelineId: `gl-pipe-${8800 + p.id}`,
      },
      {
        id: `gl-b-${p.id}-feat`,
        provider: 'gitlab',
        repoOrProject: p.fullPath,
        name: 'feature/integration',
        protected: false,
        default: false,
        stale: p.name.includes('runner'),
        lastCommitMessage: 'wip: runner tags',
        lastCommitAt: now(),
        lastCommitSha: `gl${p.id}e5d4c3b2a1098`.padEnd(40, '7'),
        lastCommitAuthor: 'ana.dev',
        commitsAhead: 6,
        commitsBehind: 12,
        ciStatus: 'running',
        ciWorkflow: 'build → test',
        deployStatus: 'none',
        deployTarget: 'docker-host-02',
        pipelineId: `gl-pipe-${8820 + p.id}`,
      },
    )
  }
  return rows
}

const GH_COMMIT_MESSAGES = [
  'feat: módulo de repositorios con drawers y acciones',
  'fix: sincronización de webhooks y payloads firmados',
  'chore: bump dependencias Angular 19',
  'refactor: utilidades de demo centralizadas',
  'test: e2e para despliegues desde PR',
  'docs: guía de integración GitHub Actions',
]

const GL_COMMIT_MESSAGES = [
  'fix: stage de deploy en GitLab CI',
  'feat: cache de artefactos en pipeline',
  'chore: actualizar runners compartidos',
  'fix: variables protegidas en producción',
]

export const buildGlobalDemoCommits = (): GlobalCommitRow[] => {
  const rows: GlobalCommitRow[] = []
  const ts = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString()

  CLIENT_DEMO_GITHUB_REPOS.forEach((r, i) => {
    const ciFailed = i % 4 === 0
    rows.push(
      {
        id: `gh-c-${r.id}-1`,
        provider: 'github',
        repoOrProject: r.fullName,
        sha: `gh${i}a1b2c3d4e5f6`.padEnd(40, '0'),
        message: GH_COMMIT_MESSAGES[i % GH_COMMIT_MESSAGES.length],
        author: i % 2 === 0 ? 'devops-lead' : 'cloudops-demo',
        branch: r.defaultBranch,
        date: ts(5 + i * 12),
        ciStatus: ciFailed ? 'failed' : 'success',
        ciWorkflow: r.name.includes('terraform') ? 'terraform plan' : 'CI — build-and-test',
        ciDuration: ciFailed ? '3m 42s' : '2m 18s',
        ciJobsPassed: ciFailed ? 4 : 6,
        ciJobsTotal: 6,
        additions: 120 + i * 10,
        deletions: 34,
        filesChanged: 8 + i,
        deployStatus: i % 3 === 0 ? 'deployed' : 'pending',
        deployEnvironment: i % 3 === 0 ? 'production' : i % 2 === 0 ? 'staging' : undefined,
        deployTarget: i % 3 === 0 ? 'cluster-prod-01' : 'cluster-staging',
        deployVersion: i % 3 === 0 ? `v2.${4 + i}.0` : undefined,
        relatedReview: i % 2 === 0 ? `PR #${128 - i}` : undefined,
        verified: true,
        verificationStatus: 'verified',
        signature: 'GPG · cloudops-demo',
        tags: i === 0 ? ['v2.4.0', 'release'] : undefined,
        pipelineId: `gh-run-${8840 + i}`,
        linkedDeploy: i % 3 === 0 ? `cluster-prod-01 · v2.${4 + i}.0` : undefined,
      },
      {
        id: `gh-c-${r.id}-2`,
        provider: 'github',
        repoOrProject: r.fullName,
        sha: `gh${i}b2c3d4e5f6a7`.padEnd(40, '8'),
        message: `chore(${r.name}): lint y formato`,
        author: 'infra-bot',
        branch: i % 2 === 0 ? 'develop' : r.defaultBranch,
        date: ts(45 + i * 8),
        ciStatus: 'success',
        ciWorkflow: 'lint + format',
        ciDuration: '1m 05s',
        ciJobsPassed: 3,
        ciJobsTotal: 3,
        additions: 12,
        deletions: 8,
        filesChanged: 3,
        deployStatus: 'none',
        verified: false,
        verificationStatus: 'unverified',
        pipelineId: `gh-run-${8850 + i}`,
      },
    )
  })

  CLIENT_DEMO_GITLAB_PROJECTS.forEach((p, i) => {
    rows.push(
      {
        id: `gl-c-${p.id}-1`,
        provider: 'gitlab',
        repoOrProject: p.fullPath,
        sha: `gl${i}f6e5d4c3b2a1`.padEnd(40, '0'),
        message: GL_COMMIT_MESSAGES[i % GL_COMMIT_MESSAGES.length],
        author: 'cloudops-gitlab',
        branch: p.defaultBranch,
        date: ts(10 + i * 15),
        ciStatus: i === 2 ? 'running' : 'success',
        ciWorkflow: 'build → test → deploy',
        ciDuration: i === 2 ? '1m 12s…' : '4m 55s',
        ciJobsPassed: i === 2 ? 2 : 5,
        ciJobsTotal: 5,
        additions: 45 + i * 5,
        deletions: 12,
        filesChanged: 4 + i,
        deployStatus: 'deployed',
        deployEnvironment: 'production',
        deployTarget: 'k8s-prod-eu',
        deployVersion: `v1.${8 + i}.2`,
        relatedReview: `MR !${42 - i}`,
        verified: true,
        verificationStatus: 'verified',
        signature: 'Signed-off-by: cloudops-gitlab',
        pipelineId: `gl-pipe-${8840 + i}`,
        linkedDeploy: `k8s-prod-eu · v1.${8 + i}.2`,
      },
      {
        id: `gl-c-${p.id}-2`,
        provider: 'gitlab',
        repoOrProject: p.fullPath,
        sha: `gl${i}e5d4c3b2a1098`.padEnd(40, '7'),
        message: `wip(${p.name}): integración runner`,
        author: 'ana.dev',
        branch: 'feature/integration',
        date: ts(90 + i * 6),
        ciStatus: 'success',
        ciWorkflow: 'build → test',
        ciDuration: '2m 40s',
        ciJobsPassed: 4,
        ciJobsTotal: 4,
        additions: 88,
        deletions: 22,
        filesChanged: 6,
        deployStatus: 'pending',
        deployEnvironment: 'staging',
        deployTarget: 'docker-host-02',
        relatedReview: undefined,
        verified: false,
        verificationStatus: 'partial',
        pipelineId: `gl-pipe-${8860 + i}`,
        linkedDeploy: 'staging · pendiente',
      },
    )
  })

  return rows.sort((a, b) => (a.date < b.date ? 1 : -1))
}

const BRANCH_EXTRA_MESSAGES = [
  'refactor: utilidades de acciones en repositorios',
  'fix: cache de pipeline en rama protegida',
  'docs: convenciones de commits y tags',
  'test: smoke de despliegue desde rama',
  'chore: actualizar runners y variables CI',
  'feat: comparación ahead/behind entre ramas',
]

export const buildBranchDemoCommits = (branch: GlobalBranchRow): GlobalCommitRow[] => {
  const matched = buildGlobalDemoCommits().filter(
    (c) => c.repoOrProject === branch.repoOrProject && c.branch === branch.name,
  )
  if (matched.length >= 5) return matched

  const ts = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString()
  const ciStatuses = branch.ciStatus === 'failed' ? ['failed', 'success', 'success'] : branch.ciStatus === 'running' ? ['running', 'success', 'success'] : ['success', 'success', 'success']
  const authors = [branch.lastCommitAuthor ?? 'devops-lead', 'cloudops-demo', 'infra-bot', 'ana.dev']

  const generated: GlobalCommitRow[] = Array.from({ length: 8 }, (_, i) => {
    const ciStatus = ciStatuses[i % ciStatuses.length]
    const additions = 24 + i * 18
    const deletions = 6 + i * 4
    return {
      id: `${branch.id}-c-${i}`,
      provider: branch.provider,
      repoOrProject: branch.repoOrProject,
      sha: (branch.lastCommitSha ?? `bc${i}abc123def456`).slice(0, 40 - i).padEnd(40, i % 10 === 0 ? '0' : 'a'),
      message: i === 0 ? branch.lastCommitMessage : BRANCH_EXTRA_MESSAGES[i % BRANCH_EXTRA_MESSAGES.length],
      author: authors[i % authors.length],
      branch: branch.name,
      date: i === 0 ? branch.lastCommitAt : ts(30 + i * 360),
      ciStatus,
      ciWorkflow: branch.ciWorkflow ?? (branch.provider === 'github' ? 'CI — build-and-test' : 'build → test → deploy'),
      ciDuration: ciStatus === 'running' ? '1m 45s…' : ciStatus === 'failed' ? '3m 42s' : '2m 18s',
      ciJobsPassed: ciStatus === 'failed' ? 4 : ciStatus === 'running' ? 2 : 6,
      ciJobsTotal: 6,
      additions,
      deletions,
      filesChanged: 2 + (i % 5),
      deployStatus: i === 0 && branch.deployStatus !== 'none' ? (branch.deployStatus === 'success' ? 'deployed' : 'pending') : i === 1 ? 'pending' : 'none',
      deployEnvironment: i <= 1 && branch.deployTarget ? (branch.name === branch.name && branch.protected ? 'production' : 'staging') : undefined,
      deployTarget: i <= 1 ? branch.deployTarget : undefined,
      deployVersion: i === 0 && branch.deployStatus === 'success' ? `v2.${i + 1}.0` : undefined,
      relatedReview: i % 3 === 0 ? (branch.provider === 'github' ? `PR #${120 + i}` : `MR !${40 + i}`) : undefined,
      verified: i % 2 === 0,
      verificationStatus: i % 2 === 0 ? 'verified' : i === 1 ? 'partial' : 'unverified',
      tags: i === 0 && branch.default ? ['latest'] : undefined,
      signature: i % 2 === 0 ? `GPG · ${authors[i % authors.length]}` : undefined,
      pipelineId: branch.pipelineId ?? `${branch.provider === 'github' ? 'gh-run' : 'gl-pipe'}-${8800 + i}`,
      linkedDeploy: i === 0 && branch.deployTarget ? `${branch.deployTarget} · ${branch.deployStatus}` : undefined,
    }
  })

  return [...matched, ...generated.filter((g) => !matched.some((m) => m.sha === g.sha))].slice(0, 10)
}

export const COMMIT_CHART_BY_PROVIDER = (): { label: string; value: number; color?: string }[] => {
  const commits = buildGlobalDemoCommits()
  const gh = commits.filter((c) => c.provider === 'github').length
  const gl = commits.filter((c) => c.provider === 'gitlab').length
  return [
    { label: 'GitHub', value: gh, color: '#24292f' },
    { label: 'GitLab', value: gl, color: '#fc6d26' },
  ]
}

export const COMMIT_CHART_BY_CI = (): { label: string; value: number; color?: string }[] => {
  const commits = buildGlobalDemoCommits()
  return [
    { label: 'CI OK', value: commits.filter((c) => c.ciStatus === 'success').length, color: '#22c55e' },
    { label: 'CI fallido', value: commits.filter((c) => c.ciStatus === 'failed').length, color: '#ef4444' },
    { label: 'En curso', value: commits.filter((c) => c.ciStatus === 'running').length, color: '#f59e0b' },
  ]
}

export const DEPLOY_CHART_BY_STATUS = (deployments: Record<string, unknown>[]): { label: string; value: number; color?: string }[] => [
  { label: 'Éxito', value: deployments.filter((d) => d['status'] === 'success').length, color: '#22c55e' },
  { label: 'En curso', value: deployments.filter((d) => d['status'] === 'running').length, color: '#3b82f6' },
  { label: 'Fallido', value: deployments.filter((d) => d['status'] === 'failed').length, color: '#ef4444' },
]

export const BRANCH_CHART_BY_PROVIDER = (branches: GlobalBranchRow[]): { label: string; value: number; color?: string }[] => [
  { label: 'GitHub', value: branches.filter((b) => b.provider === 'github').length, color: '#24292f' },
  { label: 'GitLab', value: branches.filter((b) => b.provider === 'gitlab').length, color: '#fc6d26' },
]

export const BRANCH_CHART_BY_STATUS = (branches: GlobalBranchRow[]): { label: string; value: number; color?: string }[] => [
  { label: 'Protegidas', value: branches.filter((b) => b.protected).length, color: '#0ea5e9' },
  { label: 'Desplegables', value: branches.filter((b) => b.deployStatus !== 'none').length, color: '#22c55e' },
  { label: 'Sin actividad', value: branches.filter((b) => b.stale).length, color: '#94a3b8' },
]

export const GLOBAL_WEBHOOK_PAYLOADS: Record<string, unknown>[] = [
  { id: 'pay-1', provider: 'github', event: 'push', status: 'delivered', receivedAt: now(), size: '2.4 KB' },
  { id: 'pay-2', provider: 'gitlab', event: 'merge_request', status: 'delivered', receivedAt: now(), size: '3.1 KB' },
  { id: 'pay-3', provider: 'deploy', event: 'deployment', status: 'retry', receivedAt: now(), size: '1.8 KB' },
]

export const GLOBAL_WEBHOOK_RETRIES: Record<string, unknown>[] = [
  { id: 'retry-1', webhookId: 'gh-wh-4', attempt: 2, nextAt: now(), reason: 'timeout' },
]

export const GLOBAL_WEBHOOK_ERRORS: Record<string, unknown>[] = [
  { id: 'err-1', webhookId: 'gh-wh-4', message: 'HTTP 503 desde destino', at: now() },
]

export type SectionMetrics = Record<string, number>

export const buildRepositoriesSectionMetrics = (opts: {
  githubRepos: number
  githubWebhooks: number
  gitlabWebhooks: number
  deployments: Record<string, unknown>[]
}): SectionMetrics => {
  const branches = buildGlobalDemoBranches()
  const commits = buildGlobalDemoCommits()
  const openPrs = CLIENT_DEMO_GITHUB_PRS.filter((p) => p['state'] === 'open').length
  const openMrs = CLIENT_DEMO_GITLAB_MRS.filter((m) => m['state'] === 'opened').length
  const failedDeploys = opts.deployments.filter((d) => d['status'] === 'failed').length

  return {
    githubRepoCount: opts.githubRepos,
    githubActionsCount: 6,
    githubOpenPrs: openPrs,
    githubWebhookCount: opts.githubWebhooks,
    gitlabProjectCount: CLIENT_DEMO_GITLAB_PROJECTS.length,
    gitlabPipelineCount: 4,
    gitlabOpenMrs: openMrs,
    gitlabRunnerCount: 3,
    gitlabWebhookCount: opts.gitlabWebhooks,
    webhookTotal: opts.githubWebhooks + opts.gitlabWebhooks + 1,
    webhookFailures: 4,
    branchTotal: branches.length,
    branchProtected: branches.filter((b) => b.protected).length,
    branchStale: branches.filter((b) => b.stale).length,
    branchDeployable: branches.filter((b) => b.deployStatus !== 'none').length,
    commitTotal: commits.length,
    commitCiOk: commits.filter((c) => c.ciStatus === 'success').length,
    commitCiFail: commits.filter((c) => c.ciStatus === 'failed').length,
    commitPendingDeploy: commits.filter((c) => c.deployStatus === 'pending').length,
    prOpen: openPrs,
    prReview: CLIENT_DEMO_GITHUB_PRS.filter((p) => p['state'] === 'open' && (p['reviewers'] as string[])?.length).length,
    prDraft: CLIENT_DEMO_GITHUB_PRS.filter((p) => p['draft']).length,
    prFailedChecks: CLIENT_DEMO_GITHUB_PRS.filter((p) => p['checks'] === 'failed').length,
    deployActive: opts.deployments.filter((d) => d['status'] === 'running').length,
    deployGithub: opts.deployments.filter((d) => d['provider'] === 'github').length,
    deployGitlab: opts.deployments.filter((d) => d['provider'] === 'gitlab').length,
    deployFailed: failedDeploys,
    repoCount: opts.githubRepos,
    branchCount: branches.length,
    openPullRequests: openPrs,
    deploymentCount: opts.deployments.length,
  }
}
