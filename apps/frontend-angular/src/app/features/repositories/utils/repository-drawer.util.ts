import type { GithubRepo } from '../../../core/services/github.service'

export type RepoDrawerMetric = {
  label: string
  value: string | number
  icon: string
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'default'
}

export type RepoCicdRow = {
  name: string
  workflow: string
  status: 'success' | 'running' | 'failed'
  duration: string
  branch: string
}

export type RepoTreeNode = {
  path: string
  type: 'folder' | 'file'
  depth: number
}

export type RepoActivityEvent = {
  id: string
  title: string
  detail: string
  when: string
  icon: string
}

export type RepoDeployTarget = {
  type: string
  name: string
  status: string
  badge: string
}

export type RepoDrawerOverview = {
  healthScore: number
  healthLabel: string
  lastPushLabel: string
  syncStatusLabel: string
  syncStatusBadge: string
  deployStatusLabel: string
  deployStatusBadge: string
  openPrCount: number
  metrics: RepoDrawerMetric[]
  cicd: RepoCicdRow[]
  tree: RepoTreeNode[]
  activity: RepoActivityEvent[]
  logs: string
  targets: RepoDeployTarget[]
}

const hash = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
  return Math.abs(h)
}

export const buildRepositoryDrawerOverview = (
  repo: GithubRepo,
  counts: {
    branches: number
    commits: number
    pullRequests: number
    webhooks: number
    deployments: number
    openPrs?: number
  },
): RepoDrawerOverview => {
  const h = hash(repo.id)
  const healthScore = 72 + (h % 26)
  const deployOk = h % 5 !== 0
  const openPr = counts.openPrs ?? Math.max(1, counts.pullRequests > 2 ? 2 : counts.pullRequests)

  return {
    healthScore,
    healthLabel: healthScore >= 85 ? 'Excelente' : healthScore >= 70 ? 'Estable' : 'Revisar',
    lastPushLabel: 'hace 12 minutos',
    syncStatusLabel: 'Sincronizado',
    syncStatusBadge: 'SUCCESS',
    deployStatusLabel: deployOk ? 'Completado' : 'En curso',
    deployStatusBadge: deployOk ? 'SUCCESS' : 'RUNNING',
    openPrCount: openPr,
    metrics: [
      { label: 'Salud', value: `${healthScore}%`, icon: 'favorite', tone: healthScore >= 80 ? 'success' : 'warning' },
      { label: 'Ramas', value: counts.branches, icon: 'account_tree', tone: 'info' },
      { label: 'Commits', value: counts.commits, icon: 'history', tone: 'default' },
      { label: 'PR abiertos', value: openPr, icon: 'merge', tone: 'warning' },
      { label: 'Webhooks', value: counts.webhooks, icon: 'webhook', tone: 'info' },
      { label: 'Despliegues', value: counts.deployments, icon: 'rocket_launch', tone: 'success' },
    ],
    cicd: [
      { name: 'build-and-test', workflow: 'CI', status: 'success', duration: '3m 42s', branch: repo.defaultBranch },
      { name: 'docker-publish', workflow: 'CD', status: h % 3 === 0 ? 'running' : 'success', duration: '5m 10s', branch: repo.defaultBranch },
      { name: 'deploy-staging', workflow: 'CD', status: 'success', duration: '2m 18s', branch: 'develop' },
      { name: 'security-scan', workflow: 'CI', status: h % 7 === 0 ? 'failed' : 'success', duration: '1m 05s', branch: repo.defaultBranch },
    ],
    tree: [
      { path: repo.name, type: 'folder', depth: 0 },
      { path: 'src/', type: 'folder', depth: 1 },
      { path: 'src/main.ts', type: 'file', depth: 2 },
      { path: 'src/modules/', type: 'folder', depth: 2 },
      { path: 'src/modules/core/', type: 'folder', depth: 3 },
      { path: 'package.json', type: 'file', depth: 1 },
      { path: 'README.md', type: 'file', depth: 1 },
      { path: '.github/workflows/ci.yml', type: 'file', depth: 2 },
      { path: 'Dockerfile', type: 'file', depth: 1 },
    ],
    activity: [
      { id: '1', title: 'Push a rama principal', detail: `commit en ${repo.defaultBranch}`, when: 'hace 12 min', icon: 'upload' },
      { id: '2', title: 'Despliegue completado', detail: 'cluster-prod-01', when: 'hace 45 min', icon: 'rocket_launch' },
      { id: '3', title: 'PR fusionado', detail: 'feature/github-integration → main', when: 'hace 2 h', icon: 'merge' },
      { id: '4', title: 'Webhook entregado', detail: 'evento push', when: 'hace 3 h', icon: 'webhook' },
      { id: '5', title: 'Pipeline CI exitoso', detail: 'build-and-test #128', when: 'hace 5 h', icon: 'check_circle' },
    ],
    logs: [
      `[${new Date().toISOString()}] Sync ${repo.fullName} iniciada`,
      `[${new Date().toISOString()}] Fetch branches: ${counts.branches} ramas`,
      `[${new Date().toISOString()}] Index commits: ${counts.commits} registros`,
      `[${new Date().toISOString()}] Webhooks activos: ${counts.webhooks}`,
      `[${new Date().toISOString()}] Último despliegue: ${deployOk ? 'SUCCESS' : 'RUNNING'}`,
      `[${new Date().toISOString()}] Health check: ${healthScore}%`,
    ].join('\n'),
    targets: [
      { type: 'Kubernetes', name: 'cluster-prod-01', status: 'Activo', badge: 'SUCCESS' },
      { type: 'VPS', name: 'vps-prod-nginx-01', status: 'Activo', badge: 'SUCCESS' },
      { type: 'Docker', name: 'docker-host-01', status: deployOk ? 'Listo' : 'Desplegando', badge: deployOk ? 'SUCCESS' : 'RUNNING' },
      { type: 'Instancia', name: 'aws-prod-app-1', status: 'Standby', badge: 'STOPPED' },
    ],
  }
}

export const visibilityLabel = (v: string): string =>
  v === 'public' ? 'Público' : 'Privado'

export const prStateBadge = (state: string): string => {
  if (state === 'open') return 'RUNNING'
  if (state === 'merged') return 'SUCCESS'
  return 'STOPPED'
}

export const deployStateBadge = (status: string): string => {
  if (status === 'success') return 'SUCCESS'
  if (status === 'running') return 'RUNNING'
  return 'ERROR'
}

export const cicdStateBadge = (status: string): string => {
  if (status === 'success') return 'SUCCESS'
  if (status === 'running') return 'RUNNING'
  return 'ERROR'
}
