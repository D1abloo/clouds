const now = () => new Date().toISOString()

export type GitlabAccount = {
  id: string
  label: string
  username: string
  status: string
  statusLabel: string
  lastSyncAt: string
  demoMode: boolean
}

export type GitlabProject = {
  id: string
  name: string
  fullPath: string
  description: string
  defaultBranch: string
  language: string
  visibility: string
  group: string
  subgroup?: string
  stars: number
  forks: number
  updatedAt: string
  isDemo: boolean
}

export type GitlabGroup = {
  id: string
  name: string
  path: string
  projects: number
  subgroups: number
}

const glId = (slug: string) => `gl-proj-${slug}`

export const CLIENT_DEMO_GITLAB_ACCOUNT: GitlabAccount = {
  id: 'demo-gitlab-account-001',
  label: 'GitLab Demo Account',
  username: 'cloudops-gitlab',
  status: 'connected',
  statusLabel: 'Conectada',
  lastSyncAt: now(),
  demoMode: true,
}

export const CLIENT_DEMO_GITLAB_GROUPS: GitlabGroup[] = [
  { id: 'gl-grp-1', name: 'CloudOps Platform', path: 'cloudops-platform', projects: 3, subgroups: 1 },
  { id: 'gl-grp-2', name: 'DevOps Templates', path: 'devops-templates', projects: 1, subgroups: 0 },
  { id: 'gl-grp-3', name: 'Release Engineering', path: 'release-eng', projects: 1, subgroups: 0 },
]

export const CLIENT_DEMO_GITLAB_PROJECTS: GitlabProject[] = [
  {
    id: glId('payment'),
    name: 'gitlab-payment-service',
    fullPath: 'cloudops-platform/gitlab-payment-service',
    description: 'Microservicio de pagos y facturación',
    defaultBranch: 'main',
    language: 'Java',
    visibility: 'private',
    group: 'cloudops-platform',
    subgroup: 'backend',
    stars: 14,
    forks: 3,
    updatedAt: now(),
    isDemo: true,
  },
  {
    id: glId('inventory'),
    name: 'gitlab-inventory-service',
    fullPath: 'cloudops-platform/gitlab-inventory-service',
    description: 'Inventario multi-cloud y activos',
    defaultBranch: 'main',
    language: 'TypeScript',
    visibility: 'private',
    group: 'cloudops-platform',
    subgroup: 'backend',
    stars: 11,
    forks: 2,
    updatedAt: now(),
    isDemo: true,
  },
  {
    id: glId('runner-fleet'),
    name: 'gitlab-runner-fleet',
    fullPath: 'cloudops-platform/gitlab-runner-fleet',
    description: 'Configuración de runners compartidos',
    defaultBranch: 'main',
    language: 'YAML',
    visibility: 'internal',
    group: 'cloudops-platform',
    stars: 8,
    forks: 1,
    updatedAt: now(),
    isDemo: true,
  },
  {
    id: glId('devops-templates'),
    name: 'gitlab-devops-templates',
    fullPath: 'devops-templates/gitlab-devops-templates',
    description: 'Plantillas CI/CD y despliegue GitLab',
    defaultBranch: 'main',
    language: 'YAML',
    visibility: 'public',
    group: 'devops-templates',
    stars: 22,
    forks: 9,
    updatedAt: now(),
    isDemo: true,
  },
  {
    id: glId('release-manager'),
    name: 'gitlab-release-manager',
    fullPath: 'release-eng/gitlab-release-manager',
    description: 'Orquestación de releases y environments',
    defaultBranch: 'main',
    language: 'Python',
    visibility: 'private',
    group: 'release-eng',
    stars: 6,
    forks: 0,
    updatedAt: now(),
    isDemo: true,
  },
]

export const CLIENT_DEMO_GITLAB_PIPELINES: Record<string, unknown>[] = [
  { id: 'gl-pipe-1', projectPath: 'cloudops-platform/gitlab-payment-service', ref: 'main', status: 'success', duration: '4m 12s', stage: 'deploy' },
  { id: 'gl-pipe-2', projectPath: 'cloudops-platform/gitlab-inventory-service', ref: 'develop', status: 'running', duration: '2m 01s', stage: 'test' },
  { id: 'gl-pipe-3', projectPath: 'devops-templates/gitlab-devops-templates', ref: 'main', status: 'success', duration: '1m 45s', stage: 'publish' },
  { id: 'gl-pipe-4', projectPath: 'release-eng/gitlab-release-manager', ref: 'v2.4.0', status: 'failed', duration: '6m 30s', stage: 'release' },
]

export const CLIENT_DEMO_GITLAB_MRS: Record<string, unknown>[] = [
  { id: 'gl-mr-1', projectPath: 'cloudops-platform/gitlab-payment-service', iid: 42, title: 'feat: idempotencia en cobros', state: 'opened', author: 'ana.dev', reviewers: ['carlos.ops'], pipeline: 'success' },
  { id: 'gl-mr-2', projectPath: 'cloudops-platform/gitlab-inventory-service', iid: 18, title: 'fix: sync AWS/GCP', state: 'merged', author: 'luis.cloud', reviewers: ['ana.dev'], pipeline: 'success' },
  { id: 'gl-mr-3', projectPath: 'release-eng/gitlab-release-manager', iid: 7, title: 'chore: bump chart version', state: 'opened', author: 'release-bot', reviewers: [], pipeline: 'failed' },
]

export const CLIENT_DEMO_GITLAB_RUNNERS: Record<string, unknown>[] = [
  { id: 'gl-run-1', name: 'shared-runner-01', status: 'online', tags: ['docker', 'linux'], jobs: 3 },
  { id: 'gl-run-2', name: 'k8s-runner-02', status: 'online', tags: ['kubernetes'], jobs: 1 },
  { id: 'gl-run-3', name: 'shell-runner-staging', status: 'paused', tags: ['shell'], jobs: 0 },
]

export const CLIENT_DEMO_GITLAB_ENVIRONMENTS: Record<string, unknown>[] = [
  { id: 'gl-env-1', projectPath: 'cloudops-platform/gitlab-payment-service', name: 'production', tier: 'production', lastDeploy: now() },
  { id: 'gl-env-2', projectPath: 'cloudops-platform/gitlab-payment-service', name: 'staging', tier: 'staging', lastDeploy: now() },
  { id: 'gl-env-3', projectPath: 'release-eng/gitlab-release-manager', name: 'pre-release', tier: 'staging', lastDeploy: now() },
]

export const CLIENT_DEMO_GITLAB_RELEASES: Record<string, unknown>[] = [
  { id: 'gl-rel-1', projectPath: 'release-eng/gitlab-release-manager', tag: 'v2.4.0', name: 'Release Q2', releasedAt: now() },
  { id: 'gl-rel-2', projectPath: 'cloudops-platform/gitlab-payment-service', tag: 'v1.8.2', name: 'Hotfix pagos', releasedAt: now() },
]

export const CLIENT_DEMO_GITLAB_WEBHOOKS: Record<string, unknown>[] = [
  { id: 'gl-wh-1', provider: 'gitlab', projectPath: 'cloudops-platform/gitlab-payment-service', event: 'push', url: 'https://hooks.cloudops.local/gitlab/push', active: true },
  { id: 'gl-wh-2', provider: 'gitlab', projectPath: 'cloudops-platform/gitlab-inventory-service', event: 'merge_request', url: 'https://hooks.cloudops.local/gitlab/mr', active: true },
  { id: 'gl-wh-3', provider: 'gitlab', projectPath: 'devops-templates/gitlab-devops-templates', event: 'pipeline', url: 'https://hooks.cloudops.local/gitlab/pipeline', active: false },
]

export const CLIENT_DEMO_GITLAB_DEPLOYMENTS: Record<string, unknown>[] = [
  { id: 'gl-dep-1', provider: 'gitlab', projectPath: 'cloudops-platform/gitlab-payment-service', branch: 'main', targetName: 'k8s-prod-payments', targetType: 'kubernetes', environment: 'production', status: 'success', createdAt: now(), commitSha: 'gl0f6e5d4c3b2a100000000000000000000000000', commitMessage: 'fix(payments): idempotencia en webhook de cobros', duration: '5m 18s', triggeredBy: 'cloudops-gitlab', strategy: 'canary', version: 'v1.12.0', healthCheck: 'OK · canary 100%', previousVersion: 'v1.11.3', pipelineId: 'gl-pipe-8841', stages: ['build', 'test', 'deploy', 'verify'] },
  { id: 'gl-dep-2', provider: 'gitlab', projectPath: 'cloudops-platform/gitlab-inventory-service', branch: 'develop', targetName: 'vps-staging-02', targetType: 'vps', environment: 'staging', status: 'running', createdAt: now(), commitSha: 'gl1e5d4c3b2a1098700000000000000000000007', commitMessage: 'feat(inventory): sync incremental con catálogo externo', duration: '1m 52s', triggeredBy: 'ana.dev', strategy: 'rolling', version: 'v2.0.0-beta.4', healthCheck: 'Verificando…', pipelineId: 'gl-pipe-8844', stages: ['build', 'test', 'deploy'] },
  { id: 'gl-dep-3', provider: 'gitlab', projectPath: 'devops-templates/gitlab-devops-templates', branch: 'main', targetName: 'docker-registry-01', targetType: 'docker', environment: 'production', status: 'failed', createdAt: now(), commitSha: 'gl2failed000000000000000000000000000000', commitMessage: 'ci: plantilla deploy docker con registry auth', duration: '2m 44s', triggeredBy: 'luis.cloud', error: 'docker push denied — token expirado', strategy: 'push', version: 'v0.4.1', healthCheck: 'N/A', previousVersion: 'v0.4.0', pipelineId: 'gl-pipe-8838', stages: ['build', 'push'] },
]

export const CLIENT_DEMO_GITLAB_ISSUES: Record<string, unknown>[] = [
  { id: 'gl-issue-1', projectPath: 'cloudops-platform/gitlab-payment-service', iid: 12, title: 'Timeout en webhook de cobros', state: 'opened', labels: ['bug', 'payments'], assignee: 'ana.dev' },
  { id: 'gl-issue-2', projectPath: 'cloudops-platform/gitlab-inventory-service', iid: 8, title: 'Documentar API de sincronización', state: 'opened', labels: ['documentation'], assignee: 'luis.cloud' },
  { id: 'gl-issue-3', projectPath: 'release-eng/gitlab-release-manager', iid: 3, title: 'Automatizar changelog', state: 'closed', labels: ['enhancement'], assignee: 'release-bot' },
]

export const CLIENT_DEMO_GITLAB_CI_VARS: Record<string, unknown>[] = [
  { id: 'gl-var-1', key: 'KUBECONFIG_PROD', masked: true, protected: true, environment: 'production', projectPath: 'cloudops-platform/gitlab-payment-service' },
  { id: 'gl-var-2', key: 'AWS_ROLE_ARN', masked: true, protected: true, environment: 'production', projectPath: 'cloudops-platform/gitlab-inventory-service' },
  { id: 'gl-var-3', key: 'SLACK_WEBHOOK_URL', masked: true, protected: false, environment: 'all', projectPath: 'devops-templates/gitlab-devops-templates' },
  { id: 'gl-var-4', key: 'CHART_VERSION', masked: false, protected: false, environment: 'staging', projectPath: 'release-eng/gitlab-release-manager' },
]

export const buildGitlabDemoBootstrap = () => ({
  account: CLIENT_DEMO_GITLAB_ACCOUNT,
  projects: CLIENT_DEMO_GITLAB_PROJECTS,
  groups: CLIENT_DEMO_GITLAB_GROUPS,
  pipelines: CLIENT_DEMO_GITLAB_PIPELINES,
  mergeRequests: CLIENT_DEMO_GITLAB_MRS,
  runners: CLIENT_DEMO_GITLAB_RUNNERS,
  environments: CLIENT_DEMO_GITLAB_ENVIRONMENTS,
  releases: CLIENT_DEMO_GITLAB_RELEASES,
  webhooks: CLIENT_DEMO_GITLAB_WEBHOOKS,
  deployments: CLIENT_DEMO_GITLAB_DEPLOYMENTS,
  issues: CLIENT_DEMO_GITLAB_ISSUES,
  ciVariables: CLIENT_DEMO_GITLAB_CI_VARS,
})
