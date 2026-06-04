import type { GithubAccount, GithubConnection, GithubDemoConnectResult, GithubRepo } from '../../../core/services/github.service'

const DEMO_ACCOUNT_ID = 'demo-github-account-001'
const now = () => new Date().toISOString()

const apiId = (slug: string) => `gh-repo-${slug}`

/** Catálogo GitHub demo — 6 repositorios distintos del catálogo GitLab */
export const CLIENT_DEMO_GITHUB_REPOS: GithubRepo[] = [
  {
    id: apiId('cloudops-api'),
    accountId: DEMO_ACCOUNT_ID,
    name: 'cloudops-api',
    fullName: 'cloudops-org/cloudops-api',
    description: 'API NestJS del control center',
    defaultBranch: 'main',
    language: 'TypeScript',
    stars: 42,
    visibility: 'private',
    updatedAt: now(),
    isDemo: true,
  },
  {
    id: apiId('cloudops-frontend'),
    accountId: DEMO_ACCOUNT_ID,
    name: 'cloudops-frontend',
    fullName: 'cloudops-org/cloudops-frontend',
    description: 'Frontend Angular del SaaS',
    defaultBranch: 'main',
    language: 'TypeScript',
    stars: 38,
    visibility: 'private',
    updatedAt: now(),
    isDemo: true,
  },
  {
    id: apiId('docker-nginx-app'),
    accountId: DEMO_ACCOUNT_ID,
    name: 'docker-nginx-app',
    fullName: 'cloudops-org/docker-nginx-app',
    description: 'Imagen Docker nginx con healthchecks',
    defaultBranch: 'main',
    language: 'Dockerfile',
    stars: 19,
    visibility: 'public',
    updatedAt: now(),
    isDemo: true,
  },
  {
    id: apiId('k8s-demo-app'),
    accountId: DEMO_ACCOUNT_ID,
    name: 'k8s-demo-app',
    fullName: 'cloudops-org/k8s-demo-app',
    description: 'Manifiestos y Helm para despliegue K8s',
    defaultBranch: 'main',
    language: 'YAML',
    stars: 24,
    visibility: 'private',
    updatedAt: now(),
    isDemo: true,
  },
  {
    id: apiId('terraform-modules'),
    accountId: DEMO_ACCOUNT_ID,
    name: 'terraform-modules',
    fullName: 'cloudops-org/terraform-modules',
    description: 'Módulos Terraform reutilizables',
    defaultBranch: 'main',
    language: 'HCL',
    stars: 31,
    visibility: 'private',
    updatedAt: now(),
    isDemo: true,
  },
  {
    id: apiId('monitoring-stack'),
    accountId: DEMO_ACCOUNT_ID,
    name: 'monitoring-stack',
    fullName: 'cloudops-org/monitoring-stack',
    description: 'Prometheus, Grafana y alertas',
    defaultBranch: 'main',
    language: 'YAML',
    stars: 12,
    visibility: 'private',
    updatedAt: now(),
    isDemo: true,
  },
]

export const CLIENT_DEMO_GITHUB_ACTIONS: Record<string, unknown>[] = [
  { id: 'gha-1', repoFullName: 'cloudops-org/cloudops-api', workflow: 'CI — build-and-test', status: 'success', runs: 128 },
  { id: 'gha-2', repoFullName: 'cloudops-org/cloudops-frontend', workflow: 'CD — deploy-staging', status: 'success', runs: 96 },
  { id: 'gha-3', repoFullName: 'cloudops-org/docker-nginx-app', workflow: 'Docker publish', status: 'running', runs: 44 },
  { id: 'gha-4', repoFullName: 'cloudops-org/k8s-demo-app', workflow: 'Helm lint + deploy', status: 'success', runs: 67 },
  { id: 'gha-5', repoFullName: 'cloudops-org/terraform-modules', workflow: 'terraform plan', status: 'failed', runs: 22 },
  { id: 'gha-6', repoFullName: 'cloudops-org/monitoring-stack', workflow: 'Config validate', status: 'success', runs: 15 },
]

export const CLIENT_DEMO_GITHUB_PRS: Record<string, unknown>[] = [
  { id: 'gh-pr-1', repoFullName: 'cloudops-org/cloudops-api', number: 128, title: 'feat: módulo GitHub', state: 'open', author: 'devops-lead', head: 'feature/github', base: 'main', draft: false, reviewers: ['ana.dev'], checks: 'success', conflicts: false },
  { id: 'gh-pr-2', repoFullName: 'cloudops-org/cloudops-frontend', number: 89, title: 'ui: drawer repositorios', state: 'open', author: 'frontend-dev', head: 'ui/repos-drawer', base: 'main', draft: true, reviewers: [], checks: 'pending', conflicts: false },
  { id: 'gh-pr-3', repoFullName: 'cloudops-org/terraform-modules', number: 42, title: 'fix: output vpc_id', state: 'merged', author: 'infra-bot', head: 'fix/vpc-output', base: 'main', draft: false, reviewers: ['carlos.ops'], checks: 'success', conflicts: false },
  { id: 'gh-pr-4', repoFullName: 'cloudops-org/k8s-demo-app', number: 17, title: 'chore: bump chart', state: 'closed', author: 'release-bot', head: 'chore/chart-2', base: 'main', draft: false, reviewers: ['ana.dev'], checks: 'failed', conflicts: true },
]

export const CLIENT_DEMO_GITHUB_ISSUES: Record<string, unknown>[] = [
  { id: 'gh-iss-1', repoFullName: 'cloudops-org/cloudops-api', number: 201, title: 'Optimizar sync de repos', state: 'open' },
  { id: 'gh-iss-2', repoFullName: 'cloudops-org/monitoring-stack', number: 44, title: 'Alertas duplicadas', state: 'open' },
]

export const CLIENT_DEMO_WEBHOOKS: Record<string, unknown>[] = [
  { id: 'gh-wh-1', provider: 'github', repoFullName: 'cloudops-org/cloudops-api', event: 'push', url: 'https://hooks.cloudops.local/github/push', active: true, failures: 0 },
  { id: 'gh-wh-2', provider: 'github', repoFullName: 'cloudops-org/cloudops-frontend', event: 'pull_request', url: 'https://hooks.cloudops.local/github/pr', active: true, failures: 0 },
  { id: 'gh-wh-3', provider: 'github', repoFullName: 'cloudops-org/docker-nginx-app', event: 'workflow_run', url: 'https://hooks.cloudops.local/github/workflow', active: true, failures: 1 },
  { id: 'gh-wh-4', provider: 'github', repoFullName: 'cloudops-org/monitoring-stack', event: 'push', url: 'https://hooks.cloudops.local/github/monitoring', active: false, failures: 3 },
]

export const CLIENT_DEMO_DEPLOYMENTS: Record<string, unknown>[] = [
  { id: 'gh-dep-1', provider: 'github', repoFullName: 'cloudops-org/cloudops-api', branch: 'main', targetName: 'cluster-prod-01', targetType: 'kubernetes', status: 'success', createdAt: now(), commitSha: 'a1b2c3d' },
  { id: 'gh-dep-2', provider: 'github', repoFullName: 'cloudops-org/cloudops-frontend', branch: 'develop', targetName: 'vps-prod-nginx-01', targetType: 'vps', status: 'running', createdAt: now(), commitSha: 'e4f5g6h' },
  { id: 'gh-dep-3', provider: 'github', repoFullName: 'cloudops-org/docker-nginx-app', branch: 'main', targetName: 'docker-host-01', targetType: 'docker', status: 'success', createdAt: now(), commitSha: 'i7j8k9l' },
  { id: 'gh-dep-4', provider: 'jenkins', repoFullName: 'jenkins/job/deploy-api', branch: 'main', targetName: 'jenkins-controller', targetType: 'jenkins', status: 'success', createdAt: now() },
]

export const buildClientGithubDemoState = (): GithubDemoConnectResult => {
  const synced = CLIENT_DEMO_GITHUB_REPOS.length
  const account: GithubAccount = {
    id: DEMO_ACCOUNT_ID,
    label: 'GitHub Demo Account',
    username: 'cloudops-demo',
    organization: 'cloudops-lab',
    accountType: 'demo',
    accountTypeLabel: 'Demo',
    status: 'connected',
    statusLabel: 'Conectada',
    avatarUrl: 'https://github.com/cloudops-demo.png',
    lastValidatedAt: now(),
    lastSyncAt: now(),
    createdAt: now(),
    demoMode: true,
  }
  const connection: GithubConnection = {
    connected: true,
    username: 'cloudops-demo',
    avatarUrl: account.avatarUrl,
    connectedAt: account.createdAt,
    lastSyncAt: account.lastSyncAt,
    repoCount: synced,
    accountId: DEMO_ACCOUNT_ID,
    demoMode: true,
  }
  return {
    demoMode: true,
    account,
    connection,
    repos: CLIENT_DEMO_GITHUB_REPOS,
    synced,
    message: 'Vista demo — cuenta ya conectada con repositorios ficticios',
  }
}
