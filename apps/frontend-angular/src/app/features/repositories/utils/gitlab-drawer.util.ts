import type { GitlabProject } from './gitlab.data'
import {
  CLIENT_DEMO_GITLAB_DEPLOYMENTS,
  CLIENT_DEMO_GITLAB_ENVIRONMENTS,
  CLIENT_DEMO_GITLAB_MRS,
  CLIENT_DEMO_GITLAB_PIPELINES,
  CLIENT_DEMO_GITLAB_RELEASES,
  CLIENT_DEMO_GITLAB_RUNNERS,
} from './gitlab.data'

export type GitlabDrawerMetric = {
  label: string
  value: string | number
  icon: string
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'default'
}

export type GitlabDrawerMr = {
  id: string
  iid: number
  title: string
  state: string
  author: string
  reviewers: string
  sourceBranch: string
  targetBranch: string
  pipelineStatus: string
}

export type GitlabDrawerPipeline = {
  id: string
  ref: string
  status: string
  duration: string
  stage: string
  coverage?: string
}

export type GitlabDrawerRunner = {
  name: string
  status: string
  tags: string
  jobs: number
}

export type GitlabDrawerEnvironment = {
  name: string
  tier: string
  lastDeploy: string
  url: string
}

export type GitlabDrawerRelease = {
  tag: string
  name: string
  releasedAt: string
}

export type GitlabDrawerDeployment = {
  id: string
  branch: string
  targetName: string
  targetType: string
  status: string
  environment: string
}

export type GitlabDrawerIssue = {
  iid: number
  title: string
  state: string
  labels: string
}

export type GitlabDrawerActivity = {
  id: string
  title: string
  detail: string
  when: string
  icon: string
}

export type GitlabDrawerOverview = {
  healthScore: number
  healthLabel: string
  pipelineStatusLabel: string
  pipelineBadge: string
  lastPipelineLabel: string
  syncStatusLabel: string
  syncStatusBadge: string
  lastSyncLabel: string
  lastPushLabel: string
  deployStatusLabel: string
  deployStatusBadge: string
  openMrs: number
  metrics: GitlabDrawerMetric[]
  mergeRequests: GitlabDrawerMr[]
  pipelines: GitlabDrawerPipeline[]
  runners: GitlabDrawerRunner[]
  environments: GitlabDrawerEnvironment[]
  releases: GitlabDrawerRelease[]
  deployments: GitlabDrawerDeployment[]
  issues: GitlabDrawerIssue[]
  activity: GitlabDrawerActivity[]
  logs: string
  deployTargets: { type: string; name: string; status: string; badge: string }[]
}

const hash = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
  return Math.abs(h)
}

export const gitlabVisibilityLabel = (v: string): string => {
  if (v === 'public') return 'Público'
  if (v === 'internal') return 'Interno'
  return 'Privado'
}

export const gitlabVisibilityBadge = (v: string): string =>
  v === 'public' ? 'SUCCESS' : v === 'internal' ? 'RUNNING' : 'STOPPED'

export const gitlabMrBadge = (state: string): string => {
  if (state === 'opened') return 'RUNNING'
  if (state === 'merged') return 'SUCCESS'
  return 'STOPPED'
}

export const gitlabPipeBadge = (status: string): string => {
  if (status === 'success') return 'SUCCESS'
  if (status === 'running') return 'RUNNING'
  return 'ERROR'
}

const mapMr = (m: Record<string, unknown>): GitlabDrawerMr => ({
  id: String(m['id']),
  iid: Number(m['iid']),
  title: String(m['title']),
  state: String(m['state']),
  author: String(m['author']),
  reviewers: Array.isArray(m['reviewers']) ? (m['reviewers'] as string[]).join(', ') : '—',
  sourceBranch: String(m['sourceBranch'] ?? 'feature/update'),
  targetBranch: String(m['targetBranch'] ?? 'main'),
  pipelineStatus: String(m['pipeline'] ?? 'success'),
})

const fallbackMrs = (project: GitlabProject): GitlabDrawerMr[] => [
  {
    id: `gl-mr-f1-${project.id}`,
    iid: 40 + (hash(project.id) % 10),
    title: `feat(${project.name}): integración pipeline`,
    state: 'opened',
    author: 'cloudops-gitlab',
    reviewers: 'ana.dev',
    sourceBranch: 'feature/pipeline-cache',
    targetBranch: project.defaultBranch,
    pipelineStatus: 'success',
  },
  {
    id: `gl-mr-f2-${project.id}`,
    iid: 12 + (hash(project.id) % 8),
    title: `fix(${project.name}): variables CI`,
    state: 'merged',
    author: 'devops-lead',
    reviewers: 'carlos.ops',
    sourceBranch: 'fix/ci-vars',
    targetBranch: project.defaultBranch,
    pipelineStatus: 'success',
  },
]

const fallbackPipelines = (project: GitlabProject, h: number): GitlabDrawerPipeline[] => [
  { id: 'p1', ref: project.defaultBranch, status: 'success', duration: '4m 12s', stage: 'test', coverage: '82%' },
  { id: 'p2', ref: project.defaultBranch, status: 'success', duration: '3m 40s', stage: 'build' },
  {
    id: 'p3',
    ref: project.defaultBranch,
    status: h % 4 === 0 ? 'running' : 'success',
    duration: '2m 18s',
    stage: 'deploy',
  },
  { id: 'p4', ref: 'develop', status: h % 7 === 0 ? 'failed' : 'success', duration: '1m 55s', stage: 'review' },
]

export const buildGitlabDrawerOverview = (
  project: GitlabProject,
  counts: {
    webhooks: number
    lastSyncAt?: string | null
  },
): GitlabDrawerOverview => {
  const h = hash(project.id)
  const healthScore = 70 + (h % 28)
  const pipelineOk = h % 5 !== 0
  const path = project.fullPath

  const catalogMrs = CLIENT_DEMO_GITLAB_MRS.filter((m) => m['projectPath'] === path).map(mapMr)
  const mergeRequests = catalogMrs.length ? catalogMrs : fallbackMrs(project)

  const catalogPipes = CLIENT_DEMO_GITLAB_PIPELINES.filter((p) => p['projectPath'] === path)
  const pipelines: GitlabDrawerPipeline[] = catalogPipes.length
    ? catalogPipes.map((p) => ({
        id: String(p['id']),
        ref: String(p['ref']),
        status: String(p['status']),
        duration: String(p['duration']),
        stage: String(p['stage']),
        coverage: p['status'] === 'success' ? '79%' : undefined,
      }))
    : fallbackPipelines(project, h)

  const environments: GitlabDrawerEnvironment[] = CLIENT_DEMO_GITLAB_ENVIRONMENTS.filter(
    (e) => e['projectPath'] === path,
  ).map((e) => ({
    name: String(e['name']),
    tier: String(e['tier']),
    lastDeploy: 'hace 45 min',
    url: `https://${e['name']}.${project.group}.cloudops.local`,
  }))

  if (!environments.length) {
    environments.push(
      { name: 'production', tier: 'production', lastDeploy: 'hace 2 h', url: `https://prod.${project.name}.local` },
      { name: 'staging', tier: 'staging', lastDeploy: 'hace 30 min', url: `https://stg.${project.name}.local` },
    )
  }

  const releases: GitlabDrawerRelease[] = CLIENT_DEMO_GITLAB_RELEASES.filter(
    (r) => r['projectPath'] === path,
  ).map((r) => ({
    tag: String(r['tag']),
    name: String(r['name']),
    releasedAt: 'hace 3 días',
  }))

  if (!releases.length) {
    releases.push({ tag: 'v1.0.0', name: 'Release inicial', releasedAt: 'hace 1 semana' })
  }

  const deployments: GitlabDrawerDeployment[] = CLIENT_DEMO_GITLAB_DEPLOYMENTS.filter(
    (d) => d['projectPath'] === path,
  ).map((d) => ({
    id: String(d['id']),
    branch: String(d['branch']),
    targetName: String(d['targetName']),
    targetType: String(d['targetType']),
    status: String(d['status']),
    environment: d['branch'] === 'main' ? 'production' : 'staging',
  }))

  const runners: GitlabDrawerRunner[] = CLIENT_DEMO_GITLAB_RUNNERS.map((r) => ({
    name: String(r['name']),
    status: String(r['status']),
    tags: Array.isArray(r['tags']) ? (r['tags'] as string[]).join(', ') : '',
    jobs: Number(r['jobs']),
  }))

  const issues: GitlabDrawerIssue[] = [
    { iid: 10 + (h % 5), title: 'Optimizar cache de dependencias', state: 'opened', labels: 'performance, ci' },
    { iid: 4 + (h % 3), title: 'Documentar variables de entorno', state: 'opened', labels: 'docs' },
    { iid: 2, title: 'Alertas de pipeline fallido', state: 'closed', labels: 'monitoring' },
  ]

  const openMrs = mergeRequests.filter((m) => m.state === 'opened').length

  return {
    healthScore,
    healthLabel: healthScore >= 85 ? 'Excelente' : healthScore >= 70 ? 'Estable' : 'Revisar',
    pipelineStatusLabel: pipelineOk ? 'Último pipeline: exitoso' : 'Último pipeline: en curso',
    pipelineBadge: pipelineOk ? 'SUCCESS' : 'RUNNING',
    lastPipelineLabel: 'hace 12 minutos',
    syncStatusLabel: 'Sincronizado',
    syncStatusBadge: 'SUCCESS',
    lastSyncLabel: counts.lastSyncAt
      ? new Date(counts.lastSyncAt).toLocaleString('es-ES')
      : 'hace 5 minutos',
    lastPushLabel: 'hace 18 minutos',
    deployStatusLabel: pipelineOk ? 'Completado' : 'Desplegando',
    deployStatusBadge: pipelineOk ? 'SUCCESS' : 'RUNNING',
    openMrs,
    metrics: [
      { label: 'Salud', value: `${healthScore}%`, icon: 'favorite', tone: healthScore >= 80 ? 'success' : 'warning' },
      { label: 'Merge Requests', value: mergeRequests.length, icon: 'call_merge', tone: 'info' },
      { label: 'Pipelines', value: pipelines.length, icon: 'timeline', tone: 'default' },
      { label: 'Runners', value: runners.filter((r) => r.status === 'online').length, icon: 'directions_run', tone: 'success' },
      { label: 'Environments', value: environments.length, icon: 'public', tone: 'info' },
      { label: 'Issues', value: issues.filter((i) => i.state === 'opened').length, icon: 'bug_report', tone: 'warning' },
    ],
    mergeRequests,
    pipelines,
    runners,
    environments,
    releases,
    deployments,
    issues,
    activity: [
      { id: '1', title: 'Pipeline completado', detail: `ref ${project.defaultBranch} · stage deploy`, when: 'hace 12 min', icon: 'timeline' },
      { id: '2', title: 'Merge Request actualizado', detail: `!${mergeRequests[0]?.iid ?? 1} en revisión`, when: 'hace 1 h', icon: 'call_merge' },
      { id: '3', title: 'Despliegue a production', detail: environments[0]?.name ?? 'production', when: 'hace 2 h', icon: 'rocket_launch' },
      { id: '4', title: 'Runner asignado', detail: runners[0]?.name ?? 'shared-runner-01', when: 'hace 3 h', icon: 'directions_run' },
      { id: '5', title: 'Release publicado', detail: releases[0]?.tag ?? 'v1.0.0', when: 'hace 1 d', icon: 'sell' },
      { id: '6', title: 'Webhook entregado', detail: 'evento pipeline', when: 'hace 5 h', icon: 'webhook' },
    ],
    logs: [
      `[GitLab] Sync proyecto ${path}`,
      `[GitLab] Pipeline #${128 + h} stage=test OK`,
      `[GitLab] Pipeline #${128 + h} stage=build OK`,
      `[GitLab] Deploy environment=${environments[0]?.name ?? 'staging'}`,
      `[GitLab] MR abiertos: ${openMrs}`,
      `[GitLab] Runners online: ${runners.filter((r) => r.status === 'online').length}`,
      `[GitLab] Health: ${healthScore}%`,
    ].join('\n'),
    deployTargets: [
      { type: 'Kubernetes', name: 'k8s-prod-payments', status: 'Activo', badge: 'SUCCESS' },
      { type: 'Environment', name: 'production', status: pipelineOk ? 'Sincronizado' : 'Actualizando', badge: pipelineOk ? 'SUCCESS' : 'RUNNING' },
      { type: 'Runner', name: 'shared-runner-01', status: 'Online', badge: 'SUCCESS' },
    ],
  }
}
