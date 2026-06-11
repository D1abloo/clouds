import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export type RepositoryProvider = 'github' | 'gitlab'

export type RepositoriesSectionId =
  | 'github'
  | 'gitlab'
  | 'webhooks'
  | 'branches'
  | 'commits'
  | 'pull-requests'
  | 'merge-requests'
  | 'deployments'

export type RepositoriesNavLink = {
  id: RepositoriesSectionId
  label: string
  route: string
  icon?: string
  logo?: NavLogoKey
}

export const GITHUB_NAV_LINKS: RepositoriesNavLink[] = [
  { id: 'github', label: 'GitHub', route: '/repositories/github', logo: 'github' },
  { id: 'webhooks', label: 'Webhooks', route: '/repositories/github/webhooks', icon: 'webhook' },
  { id: 'branches', label: 'Ramas', route: '/repositories/github/branches', icon: 'account_tree' },
  { id: 'commits', label: 'Commits', route: '/repositories/github/commits', icon: 'history_edu' },
  { id: 'pull-requests', label: 'Pull Requests', route: '/repositories/github/pull-requests', icon: 'merge' },
  { id: 'deployments', label: 'Despliegues', route: '/repositories/github/deployments', icon: 'rocket_launch' },
]

export const GITLAB_NAV_LINKS: RepositoriesNavLink[] = [
  { id: 'gitlab', label: 'GitLab', route: '/repositories/gitlab', logo: 'gitlab' },
  { id: 'webhooks', label: 'Webhooks', route: '/repositories/gitlab/webhooks', icon: 'webhook' },
  { id: 'branches', label: 'Ramas', route: '/repositories/gitlab/branches', icon: 'account_tree' },
  { id: 'commits', label: 'Commits', route: '/repositories/gitlab/commits', icon: 'history_edu' },
  { id: 'merge-requests', label: 'Merge Requests', route: '/repositories/gitlab/merge-requests', icon: 'call_merge' },
  { id: 'deployments', label: 'Despliegues', route: '/repositories/gitlab/deployments', icon: 'rocket_launch' },
]

/** @deprecated Usar providerNavLinks(provider) */
export const REPOSITORIES_NAV_LINKS: RepositoriesNavLink[] = GITHUB_NAV_LINKS

export const providerNavLinks = (provider: RepositoryProvider): RepositoriesNavLink[] =>
  provider === 'gitlab' ? GITLAB_NAV_LINKS : GITHUB_NAV_LINKS

export const providerHubRoute = (provider: RepositoryProvider): string =>
  provider === 'gitlab' ? '/repositories/gitlab' : '/repositories/github'

export const providerSectionRoute = (provider: RepositoryProvider, section: RepositoriesSectionId): string =>
  `${providerHubRoute(provider)}/${section}`

export const repoRoute = (id: RepositoriesSectionId, provider: RepositoryProvider = 'github'): string =>
  providerNavLinks(provider).find((l) => l.id === id)?.route ?? providerHubRoute(provider)

export const REPO_QUICK_LINK_SETS: Record<RepositoriesSectionId, RepositoriesSectionId[]> = {
  github: ['pull-requests', 'webhooks', 'commits', 'branches', 'deployments', 'gitlab'],
  gitlab: ['merge-requests', 'webhooks', 'commits', 'branches', 'deployments', 'github'],
  webhooks: ['branches', 'commits', 'deployments', 'github', 'gitlab'],
  branches: ['commits', 'deployments', 'github', 'gitlab'],
  commits: ['branches', 'deployments', 'pull-requests', 'merge-requests', 'webhooks'],
  'pull-requests': ['commits', 'deployments', 'webhooks', 'github'],
  'merge-requests': ['commits', 'deployments', 'webhooks', 'gitlab'],
  deployments: ['commits', 'branches', 'webhooks', 'github', 'gitlab'],
}

export const repoQuickLinks = (
  current: RepositoriesSectionId,
  provider: RepositoryProvider = 'github',
): RepositoriesNavLink[] =>
  (REPO_QUICK_LINK_SETS[current] ?? [])
    .map((id) => providerNavLinks(provider).find((l) => l.id === id))
    .filter((l): l is RepositoriesNavLink => !!l)

export type SectionHeaderAction = { label: string; icon?: string; primary?: boolean }

export type SectionMeta = {
  title: string
  description: string
  theme: 'github' | 'gitlab' | 'webhooks' | 'branches' | 'commits' | 'pull-requests' | 'merge-requests' | 'deployments'
  summaryCards: { title: string; valueKey: string; icon: string }[]
  headerActions: SectionHeaderAction[]
}

const githubResourceMeta = (section: 'webhooks' | 'branches' | 'commits' | 'pull-requests' | 'deployments'): SectionMeta => {
  const base = REPOSITORIES_SECTION_META_LEGACY[section]
  return {
    ...base,
    description: base.description.replace(/GitHub y GitLab|unificado de GitHub y GitLab/gi, 'GitHub'),
  }
}

const gitlabResourceMeta = (
  section: 'webhooks' | 'branches' | 'commits' | 'merge-requests' | 'deployments',
): SectionMeta => {
  const githubKey = section === 'merge-requests' ? 'pull-requests' : section
  const base = REPOSITORIES_SECTION_META_LEGACY[githubKey]
  const title =
    section === 'merge-requests'
      ? 'Merge Requests'
      : base.title
  const description = base.description
    .replace(/GitHub y GitLab|unificado de GitHub y GitLab/gi, 'GitLab')
    .replace(/Pull Requests de GitHub/gi, 'Merge Requests de GitLab')
    .replace(/solo GitHub/gi, 'GitLab')
  return {
    ...base,
    title,
    theme: section === 'merge-requests' ? 'merge-requests' : base.theme,
    description,
  }
}

export const providerSectionMeta = (
  provider: RepositoryProvider,
  section: RepositoriesSectionId,
): SectionMeta => {
  if (section === 'github') return REPOSITORIES_SECTION_META_LEGACY.github
  if (section === 'gitlab') return REPOSITORIES_SECTION_META_LEGACY.gitlab
  if (provider === 'gitlab') {
    if (section === 'merge-requests') return gitlabResourceMeta('merge-requests')
    if (section !== 'pull-requests') return gitlabResourceMeta(section as 'webhooks' | 'branches' | 'commits' | 'deployments')
  }
  if (section === 'pull-requests') return githubResourceMeta('pull-requests')
  if (section !== 'merge-requests') return githubResourceMeta(section as 'webhooks' | 'branches' | 'commits' | 'deployments')
  return REPOSITORIES_SECTION_META_LEGACY.webhooks
}

const REPOSITORIES_SECTION_META_LEGACY: Record<RepositoriesSectionId, SectionMeta> = {
  github: {
    title: 'GitHub',
    description:
      'Conecta cuentas GitHub, sincroniza repositorios y despliega proyectos en tus instancias.',
    theme: 'github',
    summaryCards: [
      { title: 'Repositorios', valueKey: 'githubRepoCount', icon: 'folder' },
      { title: 'GitHub Actions', valueKey: 'githubActionsCount', icon: 'bolt' },
      { title: 'Pull Requests', valueKey: 'githubOpenPrs', icon: 'merge' },
      { title: 'Webhooks GH', valueKey: 'githubWebhookCount', icon: 'webhook' },
    ],
    headerActions: [
      { label: 'Añadir cuenta', icon: 'person_add' },
      { label: 'Sincronizar', icon: 'sync', primary: true },
      { label: 'Desplegar', icon: 'rocket_launch' },
    ],
  },
  gitlab: {
    title: 'GitLab',
    description:
      'Conecta GitLab, sincroniza proyectos, revisa pipelines y despliega desde tus repositorios.',
    theme: 'gitlab',
    summaryCards: [
      { title: 'Proyectos', valueKey: 'gitlabProjectCount', icon: 'folder_special' },
      { title: 'Pipelines', valueKey: 'gitlabPipelineCount', icon: 'timeline' },
      { title: 'Merge Requests', valueKey: 'gitlabOpenMrs', icon: 'call_merge' },
      { title: 'Runners', valueKey: 'gitlabRunnerCount', icon: 'directions_run' },
    ],
    headerActions: [
      { label: 'Añadir cuenta GitLab', icon: 'person_add' },
      { label: 'Sincronizar proyectos', icon: 'sync', primary: true },
    ],
  },
  webhooks: {
    title: 'Webhooks',
    description:
      'Gestiona entregas HTTP de GitHub, GitLab y despliegues externos: payloads firmados, reintentos, auditoría de errores y pruebas en caliente.',
    theme: 'webhooks',
    summaryCards: [
      { title: 'Total webhooks', valueKey: 'webhookTotal', icon: 'webhook' },
      { title: 'GitHub', valueKey: 'githubWebhookCount', icon: 'code' },
      { title: 'GitLab', valueKey: 'gitlabWebhookCount', icon: 'code' },
      { title: 'Fallos 24h', valueKey: 'webhookFailures', icon: 'error' },
    ],
    headerActions: [
      { label: 'Crear webhook', icon: 'add', primary: true },
      { label: 'Probar webhook', icon: 'play_arrow' },
    ],
  },
  branches: {
    title: 'Ramas',
    description:
      'Inventario unificado de ramas GitHub y GitLab: protección, CI, estado de despliegue, comparación de diffs y despliegue por rama.',
    theme: 'branches',
    summaryCards: [
      { title: 'Ramas totales', valueKey: 'branchTotal', icon: 'account_tree' },
      { title: 'Protegidas', valueKey: 'branchProtected', icon: 'shield' },
      { title: 'Sin actividad', valueKey: 'branchStale', icon: 'schedule' },
      { title: 'Desplegables', valueKey: 'branchDeployable', icon: 'rocket_launch' },
    ],
    headerActions: [
      { label: 'Sincronizar ramas', icon: 'sync', primary: true },
      { label: 'Comparar ramas', icon: 'compare_arrows' },
    ],
  },
  commits: {
    title: 'Commits',
    description:
      'Timeline unificado de commits GitHub y GitLab: diff, CI, reviews, etiquetas y despliegue por SHA con modales detallados.',
    theme: 'commits',
    summaryCards: [
      { title: 'Commits recientes', valueKey: 'commitTotal', icon: 'history' },
      { title: 'Con CI OK', valueKey: 'commitCiOk', icon: 'check_circle' },
      { title: 'CI fallido', valueKey: 'commitCiFail', icon: 'cancel' },
      { title: 'Pendientes deploy', valueKey: 'commitPendingDeploy', icon: 'pending' },
    ],
    headerActions: [
      { label: 'Actualizar', icon: 'refresh', primary: true },
      { label: 'Desplegar commit', icon: 'rocket_launch' },
    ],
  },
  'pull-requests': {
    title: 'Pull Requests',
    description:
      'Pull Requests de GitHub con descripción, etiquetas, revisiones, checks CI, conflictos, fusionado y preview de despliegue.',
    theme: 'pull-requests',
    summaryCards: [
      { title: 'Abiertos', valueKey: 'prOpen', icon: 'merge' },
      { title: 'En revisión', valueKey: 'prReview', icon: 'rate_review' },
      { title: 'Drafts', valueKey: 'prDraft', icon: 'edit_note' },
      { title: 'Checks fallidos', valueKey: 'prFailedChecks', icon: 'rule' },
    ],
    headerActions: [
      { label: 'Abrir en GitHub', icon: 'open_in_new', primary: true },
      { label: 'Desplegar preview', icon: 'rocket_launch' },
    ],
  },
  'merge-requests': {
    title: 'Merge Requests',
    description:
      'Merge Requests de GitLab con descripción, etiquetas, revisiones, pipelines CI y preview de despliegue.',
    theme: 'merge-requests',
    summaryCards: [
      { title: 'Abiertos', valueKey: 'prOpen', icon: 'call_merge' },
      { title: 'En revisión', valueKey: 'prReview', icon: 'rate_review' },
      { title: 'Drafts', valueKey: 'prDraft', icon: 'edit_note' },
      { title: 'Pipelines fallidos', valueKey: 'prFailedChecks', icon: 'rule' },
    ],
    headerActions: [
      { label: 'Abrir en GitLab', icon: 'open_in_new', primary: true },
      { label: 'Desplegar preview', icon: 'rocket_launch' },
    ],
  },
  deployments: {
    title: 'Despliegues',
    description:
      'Supervisa despliegues desde GitHub, GitLab, Jenkins, Docker y Kubernetes: logs en terminal, pipelines, destino, rollback y reintentos.',
    theme: 'deployments',
    summaryCards: [
      { title: 'Activos', valueKey: 'deployActive', icon: 'rocket_launch' },
      { title: 'GitHub', valueKey: 'deployGithub', icon: 'code' },
      { title: 'GitLab', valueKey: 'deployGitlab', icon: 'code' },
      { title: 'Fallidos', valueKey: 'deployFailed', icon: 'error' },
    ],
    headerActions: [
      { label: 'Nuevo despliegue', icon: 'add', primary: true },
      { label: 'Ver historial', icon: 'history' },
    ],
  },
}

/** @deprecated Usar providerSectionMeta(provider, section) */
export const REPOSITORIES_SECTION_META = REPOSITORIES_SECTION_META_LEGACY
