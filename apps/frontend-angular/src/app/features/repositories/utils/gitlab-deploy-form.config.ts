import type { GitlabProject } from './gitlab-demo-catalog'
import {
  CLIENT_DEMO_GITLAB_CI_VARS,
  CLIENT_DEMO_GITLAB_DEPLOYMENTS,
  CLIENT_DEMO_GITLAB_ENVIRONMENTS,
  CLIENT_DEMO_GITLAB_PIPELINES,
  CLIENT_DEMO_GITLAB_RELEASES,
} from './gitlab-demo-catalog'

export type GitlabDeployTarget = {
  id: string
  name: string
  type: 'kubernetes' | 'vps' | 'docker' | 'runner'
  region?: string
  status?: string
}

export type GitlabDeployStrategy = 'rolling' | 'canary' | 'blue-green' | 'recreate' | 'manual'

export const GITLAB_DEPLOY_TARGETS: GitlabDeployTarget[] = [
  { id: 'k8s-prod-payments', name: 'k8s-prod-payments', type: 'kubernetes', region: 'eu-west-1', status: 'online' },
  { id: 'k8s-staging-shared', name: 'k8s-staging-shared', type: 'kubernetes', region: 'eu-west-1', status: 'online' },
  { id: 'vps-staging-02', name: 'vps-staging-02', type: 'vps', region: 'fra1', status: 'online' },
  { id: 'docker-registry-01', name: 'docker-registry-01', type: 'docker', region: 'ams3', status: 'online' },
  { id: 'shared-runner-01', name: 'shared-runner-01', type: 'runner', region: '—', status: 'online' },
]

export const GITLAB_DEPLOY_STRATEGIES: { value: GitlabDeployStrategy; label: string; hint: string }[] = [
  { value: 'rolling', label: 'Rolling update', hint: 'Sustitución gradual de pods/instancias' },
  { value: 'canary', label: 'Canary', hint: 'Tráfico parcial antes de promover al 100%' },
  { value: 'blue-green', label: 'Blue-green', hint: 'Cutover instantáneo entre dos stacks' },
  { value: 'recreate', label: 'Recreate', hint: 'Parada completa y redeploy' },
  { value: 'manual', label: 'Job manual', hint: 'Dispara stage deploy:manual en .gitlab-ci.yml' },
]

export const GITLAB_DEPLOY_ENVIRONMENTS = [
  { value: 'production', label: 'Production', tier: 'production', protected: true },
  { value: 'staging', label: 'Staging', tier: 'staging', protected: false },
  { value: 'review', label: 'Review / preview', tier: 'development', protected: false },
  { value: 'development', label: 'Development', tier: 'development', protected: false },
] as const

export type GitlabDeployDialogData = {
  project: GitlabProject
}

export type GitlabDeployDialogResult = {
  projectPath: string
  branch: string
  refType: 'branch' | 'tag' | 'sha'
  commitSha?: string
  version?: string
  environment: string
  targetId: string
  targetType: string
  targetName: string
  strategy: GitlabDeployStrategy
  rebuildPipeline: boolean
  autoRollback: boolean
  runHealthCheck: boolean
  healthCheckUrl?: string
  notifyOnSuccess: boolean
  notifyOnFailure: boolean
  runnerTags: string[]
  ciVariables: string[]
  approvalRequired: boolean
  description?: string
}

export const projectPipeline = (projectPath: string): Record<string, unknown> | undefined =>
  CLIENT_DEMO_GITLAB_PIPELINES.find((p) => p['projectPath'] === projectPath)

export const projectEnvironments = (projectPath: string): Record<string, unknown>[] =>
  CLIENT_DEMO_GITLAB_ENVIRONMENTS.filter((e) => e['projectPath'] === projectPath)

export const projectLastDeploy = (projectPath: string): Record<string, unknown> | undefined =>
  CLIENT_DEMO_GITLAB_DEPLOYMENTS.find((d) => d['projectPath'] === projectPath && d['status'] === 'success')

export const projectCiVars = (projectPath: string): Record<string, unknown>[] =>
  CLIENT_DEMO_GITLAB_CI_VARS.filter((v) => v['projectPath'] === projectPath || v['environment'] === 'all')

export const projectReleases = (projectPath: string): Record<string, unknown>[] =>
  CLIENT_DEMO_GITLAB_RELEASES.filter((r) => r['projectPath'] === projectPath)

export const targetTypeLabel = (type: string): string => {
  if (type === 'kubernetes') return 'Kubernetes'
  if (type === 'vps') return 'VPS'
  if (type === 'docker') return 'Docker'
  if (type === 'runner') return 'GitLab Runner'
  return type
}
