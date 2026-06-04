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
  ciStatus: string
  deployStatus: string
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
  additions: number
  deletions: number
  filesChanged: number
  deployStatus: string
  relatedReview?: string
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
        ciStatus: 'success',
        deployStatus: 'success',
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
        ciStatus: r.name === 'terraform-modules' ? 'failed' : 'success',
        deployStatus: 'pending',
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
        ciStatus: 'success',
        deployStatus: 'success',
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
        ciStatus: 'running',
        deployStatus: 'none',
      },
    )
  }
  return rows
}

export const buildGlobalDemoCommits = (): GlobalCommitRow[] => {
  const rows: GlobalCommitRow[] = []
  CLIENT_DEMO_GITHUB_REPOS.forEach((r, i) => {
    rows.push({
      id: `gh-c-${r.id}-1`,
      provider: 'github',
      repoOrProject: r.fullName,
      sha: `gh${i}a1b2c3d4e5f6`.padEnd(12, '0'),
      message: `feat(${r.name}): integración demo`,
      author: 'cloudops-demo',
      branch: r.defaultBranch,
      date: now(),
      ciStatus: i % 4 === 0 ? 'failed' : 'success',
      additions: 120 + i * 10,
      deletions: 34,
      filesChanged: 8 + i,
      deployStatus: i % 3 === 0 ? 'deployed' : 'pending',
      relatedReview: i % 2 === 0 ? `PR #${128 - i}` : undefined,
    })
  })
  CLIENT_DEMO_GITLAB_PROJECTS.forEach((p, i) => {
    rows.push({
      id: `gl-c-${p.id}-1`,
      provider: 'gitlab',
      repoOrProject: p.fullPath,
      sha: `gl${i}f6e5d4c3b2a1`.padEnd(12, '0'),
      message: `fix(${p.name}): pipeline stage`,
      author: 'cloudops-gitlab',
      branch: p.defaultBranch,
      date: now(),
      ciStatus: 'success',
      additions: 45,
      deletions: 12,
      filesChanged: 4,
      deployStatus: 'deployed',
      relatedReview: `MR !${42 - i}`,
    })
  })
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1))
}

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
    prReview: 1,
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
