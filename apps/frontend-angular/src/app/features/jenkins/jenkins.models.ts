export type JenkinsJobType = 'pipeline' | 'freestyle' | 'multibranch'
export type JenkinsHealth = 'sunny' | 'cloudy' | 'stormy'

export interface JenkinsServer {
  id: string
  name: string
  url: string
  version: string
  jobs: number
  status: 'online' | 'offline'
  executors: number
  busyExecutors: number
}

export interface JenkinsAgent {
  name: string
  labels: string[]
  status: 'online' | 'offline' | 'busy'
  idle: boolean
  currentJob?: string
}

export interface JenkinsQueueItem {
  id: string
  jobName: string
  buildNum: number
  why: string
  inQueueSince: string
}

export interface JenkinsFolder {
  path: string
  label: string
}

export interface JenkinsStage {
  name: string
  status: string
  duration?: string
}

export interface JenkinsArtifact {
  name: string
  size: string
  path: string
}

export interface JenkinsTestSummary {
  total: number
  passed: number
  failed: number
  skipped: number
  duration: string
}

export interface JenkinsScm {
  type: string
  url: string
  branch: string
  commit: string
  author: string
}

export interface JenkinsJob {
  name: string
  folder: string
  server: string
  serverId: string
  type: JenkinsJobType
  status: string
  health: JenkinsHealth
  lastRun: string
  duration: string
  branch: string
  buildNum: number
  description: string
  scm: JenkinsScm
  upstream: string[]
  downstream: string[]
  parameters: { key: string; default: string; description: string }[]
  stages: JenkinsStage[]
  artifacts: JenkinsArtifact[]
  tests: JenkinsTestSummary
  triggers: string[]
  /** Job creado con checklist PRO completo (lanzamiento a production permitido). */
  prodLaunchReady?: boolean
}

export interface JenkinsBuild {
  jobName: string
  buildNum: number
  status: string
  createdAt: string
  duration: string
  branch: string
  triggeredBy: string
  commit?: string
}

export interface JenkinsPlugin {
  name: string
  version: string
  status: 'ok' | 'warning'
}

export interface JenkinsInventory {
  demoMode: boolean
  serverCount: number
  jobCount: number
  buildsRunning: number
  buildsSuccess: number
  buildsFailed: number
  queueSize: number
  executorBusy: number
  executorTotal: number
  diskUsagePercent: number
  version: string
  servers: JenkinsServer[]
  agents: JenkinsAgent[]
  queue: JenkinsQueueItem[]
  folders: JenkinsFolder[]
  jobItems: JenkinsJob[]
  builds: JenkinsBuild[]
  logsByJob: Record<string, string>
  plugins: JenkinsPlugin[]
}

export interface CreateJenkinsJobForm {
  name: string
  folder: string
  serverId: string
  type: JenkinsJobType
  scmType: 'git' | 'gitlab' | 'bitbucket'
  scmUrl: string
  branch: string
  description: string
  credentialsId: string
  jenkinsfilePath: string
  agentLabel: string
  defaultEnvironment: string
  discardOldBuilds: boolean
  numToKeep: number
  timeoutMinutes: number
  concurrentBuilds: boolean
  cronTrigger: string
  enableWebhook: boolean
  pollScmMinutes: number
  enableBuildParameters: boolean
  skipTestsDefault: boolean
  runSonarDefault: boolean
  requireApprovalProd: boolean
}

export type JenkinsWorkspaceTab =
  | 'overview'
  | 'builds'
  | 'pipeline'
  | 'queue'
  | 'console'
  | 'parameters'
  | 'artifacts'
  | 'tests'
  | 'nodes'

export const jenkinsWorkspaceTabIndex: Record<JenkinsWorkspaceTab, number> = {
  overview: 0,
  builds: 1,
  pipeline: 2,
  queue: 3,
  console: 4,
  parameters: 5,
  artifacts: 6,
  tests: 7,
  nodes: 8,
}

export const jenkinsSectionToTab = (section: string): number => {
  const map: Record<string, number> = {
    overview: 0,
    servers: 0,
    jobs: 0,
    pipelines: 2,
    builds: 1,
    logs: 4,
    parameters: 5,
    history: 1,
    artifacts: 6,
    tests: 7,
    agents: 8,
    nodes: 8,
    queue: 3,
    'failed-builds': 1,
  }
  return map[section] ?? 0
}
