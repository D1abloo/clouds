export type GithubRepoDemo = {
  id: string
  name: string
  fullName: string
  description: string
  defaultBranch: string
  language: string
  stars: number
  visibility: 'public' | 'private'
  updatedAt: string
}

export type GithubBranchDemo = {
  name: string
  protected: boolean
  lastCommitSha: string
  lastCommitMessage: string
}

export type GithubCommitDemo = {
  sha: string
  message: string
  author: string
  date: string
  branch: string
}

export type GithubPullRequestDemo = {
  id: number
  number: number
  title: string
  state: 'open' | 'closed' | 'merged'
  author: string
  base: string
  head: string
  createdAt: string
}

export type GithubWebhookDemo = {
  id: string
  repoFullName: string
  event: string
  url: string
  active: boolean
}

export type GithubDeploymentDemo = {
  id: string
  repoFullName: string
  branch: string
  targetType: string
  targetName: string
  status: 'success' | 'running' | 'failed'
  createdAt: string
}

export const DEMO_GITHUB_REPOS: GithubRepoDemo[] = [
  {
    id: 'repo-cloudops-api',
    name: 'cloudops-api',
    fullName: 'cloudops-org/cloudops-api',
    description: 'API NestJS del control center',
    defaultBranch: 'main',
    language: 'TypeScript',
    stars: 42,
    visibility: 'private',
    updatedAt: '2026-06-02T10:00:00Z',
  },
  {
    id: 'repo-cloudops-ui',
    name: 'cloudops-ui',
    fullName: 'cloudops-org/cloudops-ui',
    description: 'Frontend Angular 19',
    defaultBranch: 'main',
    language: 'TypeScript',
    stars: 38,
    visibility: 'private',
    updatedAt: '2026-06-01T18:30:00Z',
  },
  {
    id: 'repo-infra',
    name: 'infra-terraform',
    fullName: 'cloudops-org/infra-terraform',
    description: 'Módulos Terraform AWS/GCP/Azure',
    defaultBranch: 'main',
    language: 'HCL',
    stars: 15,
    visibility: 'private',
    updatedAt: '2026-05-28T14:00:00Z',
  },
  {
    id: 'repo-docs',
    name: 'cloudops-docs',
    fullName: 'cloudops-org/cloudops-docs',
    description: 'Documentación y runbooks',
    defaultBranch: 'main',
    language: 'Markdown',
    stars: 8,
    visibility: 'public',
    updatedAt: '2026-05-25T09:00:00Z',
  },
]

export const demoBranches = (repoId: string): GithubBranchDemo[] => [
  { name: 'main', protected: true, lastCommitSha: 'a1b2c3d', lastCommitMessage: 'feat: dashboard metrics grid' },
  { name: 'develop', protected: false, lastCommitSha: 'e4f5g6h', lastCommitMessage: 'chore: bump deps' },
  { name: 'feature/github-integration', protected: false, lastCommitSha: 'i7j8k9l', lastCommitMessage: 'feat: github module' },
].map((b) => ({ ...b, lastCommitSha: `${b.lastCommitSha}-${repoId.slice(-4)}` }))

export const demoCommits = (repoId: string): GithubCommitDemo[] => [
  {
    sha: `sha-${repoId}-1`,
    message: 'feat: add repository sync flow',
    author: 'isaac@cloudops.local',
    date: '2026-06-02T11:00:00Z',
    branch: 'main',
  },
  {
    sha: `sha-${repoId}-2`,
    message: 'fix: sidebar logo inline SVG',
    author: 'dev@cloudops.local',
    date: '2026-06-01T16:20:00Z',
    branch: 'main',
  },
  {
    sha: `sha-${repoId}-3`,
    message: 'docs: update PROGRESS phase 35',
    author: 'isaac@cloudops.local',
    date: '2026-05-30T09:15:00Z',
    branch: 'develop',
  },
]

export const demoPullRequests = (repoId: string): GithubPullRequestDemo[] => [
  {
    id: 101,
    number: 24,
    title: 'Integración GitHub en sidebar',
    state: 'open',
    author: 'isaac',
    base: 'main',
    head: 'feature/github-integration',
    createdAt: '2026-06-02T08:00:00Z',
  },
  {
    id: 102,
    number: 23,
    title: 'Despliegue a K8s desde PR',
    state: 'merged',
    author: 'devops',
    base: 'main',
    head: 'feature/k8s-deploy',
    createdAt: '2026-05-28T12:00:00Z',
  },
]

export const DEMO_WEBHOOKS: GithubWebhookDemo[] = [
  {
    id: 'wh-1',
    repoFullName: 'cloudops-org/cloudops-api',
    event: 'push',
    url: 'https://hooks.cloudops.local/github/push',
    active: true,
  },
  {
    id: 'wh-2',
    repoFullName: 'cloudops-org/cloudops-ui',
    event: 'pull_request',
    url: 'https://hooks.cloudops.local/github/pr',
    active: true,
  },
]

export const DEMO_DEPLOYMENTS: GithubDeploymentDemo[] = [
  {
    id: 'dep-1',
    repoFullName: 'cloudops-org/cloudops-api',
    branch: 'main',
    targetType: 'kubernetes',
    targetName: 'cluster-prod-01',
    status: 'success',
    createdAt: '2026-06-01T20:00:00Z',
  },
  {
    id: 'dep-2',
    repoFullName: 'cloudops-org/cloudops-ui',
    branch: 'develop',
    targetType: 'vps',
    targetName: 'vps-prod-nginx-01',
    status: 'running',
    createdAt: '2026-06-02T10:30:00Z',
  },
]
