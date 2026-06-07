import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export type RepositoriesSectionId =
  | 'github'
  | 'gitlab'
  | 'webhooks'
  | 'branches'
  | 'commits'
  | 'pull-requests'
  | 'deployments'

export type RepositoriesNavLink = {
  id: RepositoriesSectionId
  label: string
  route: string
  icon?: string
  logo?: NavLogoKey
}

/** Navegación lateral coherente entre todas las subsecciones de Repositorios */
export const REPOSITORIES_NAV_LINKS: RepositoriesNavLink[] = [
  { id: 'github', label: 'GitHub', route: '/repositories/github', logo: 'github' },
  { id: 'gitlab', label: 'GitLab', route: '/repositories/gitlab', logo: 'gitlab' },
  { id: 'webhooks', label: 'Webhooks', route: '/repositories/webhooks', icon: 'webhook' },
  { id: 'branches', label: 'Ramas', route: '/repositories/branches', icon: 'account_tree' },
  { id: 'commits', label: 'Commits', route: '/repositories/commits', icon: 'history_edu' },
  { id: 'pull-requests', label: 'Pull Requests', route: '/repositories/pull-requests', icon: 'merge' },
  { id: 'deployments', label: 'Despliegues', route: '/repositories/deployments', icon: 'rocket_launch' },
]

export const repoRoute = (id: RepositoriesSectionId): string =>
  REPOSITORIES_NAV_LINKS.find((l) => l.id === id)?.route ?? '/repositories/github'

/** Secciones relacionadas mostradas como accesos rápidos por página */
export const REPO_QUICK_LINK_SETS: Record<RepositoriesSectionId, RepositoriesSectionId[]> = {
  github: ['pull-requests', 'webhooks', 'commits', 'branches', 'deployments', 'gitlab'],
  gitlab: ['webhooks', 'commits', 'branches', 'deployments', 'github'],
  webhooks: ['github', 'gitlab', 'commits', 'deployments'],
  branches: ['commits', 'deployments', 'github', 'gitlab'],
  commits: ['branches', 'deployments', 'pull-requests', 'webhooks'],
  'pull-requests': ['commits', 'deployments', 'webhooks', 'github'],
  deployments: ['commits', 'branches', 'webhooks', 'github', 'gitlab'],
}

export const repoQuickLinks = (current: RepositoriesSectionId): RepositoriesNavLink[] =>
  (REPO_QUICK_LINK_SETS[current] ?? [])
    .map((id) => REPOSITORIES_NAV_LINKS.find((l) => l.id === id))
    .filter((l): l is RepositoriesNavLink => !!l)

export type SectionHeaderAction = { label: string; icon?: string; primary?: boolean }

export type SectionMeta = {
  title: string
  description: string
  theme: 'github' | 'gitlab' | 'webhooks' | 'branches' | 'commits' | 'pull-requests' | 'deployments'
  summaryCards: { title: string; valueKey: string; icon: string }[]
  headerActions: SectionHeaderAction[]
}

export const REPOSITORIES_SECTION_META: Record<RepositoriesSectionId, SectionMeta> = {
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
      { label: 'Conectar demo GitLab', icon: 'science', primary: true },
      { label: 'Sincronizar proyectos', icon: 'sync' },
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
