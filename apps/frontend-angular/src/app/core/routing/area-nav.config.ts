import type { NavIconTone } from '../../layout/sidebar/sidebar-nav.config'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export interface AreaNavTab {
  id: string
  label: string
  route: string
  icon?: string
  logo?: NavLogoKey
  badgeKey?: string
}

export type SidebarBrand = 'aws' | 'gcp' | 'azure'

/** Segundo nivel desplegable (p. ej. AWS → EC2, Red). Solo en Nubes. */
export interface SidebarNavBranch {
  id: string
  label: string
  brand?: SidebarBrand
  icon?: string
  tone?: NavIconTone
  badgeKey?: string
  defaultRoute?: string
  children: AreaNavTab[]
}

export interface SidebarMainModule {
  id: string
  label: string
  icon: string
  tone: NavIconTone
  route: string
  description: string
  tabs: AreaNavTab[]
  branches?: SidebarNavBranch[]
  match: (path: string) => boolean
}

const cloudProviderBranch = (
  provider: 'aws' | 'gcp' | 'azure',
  label: string,
  brand: SidebarBrand,
): SidebarNavBranch => {
  const base = `/cloud/${provider}`
  const instancesLabel =
    provider === 'gcp' ? 'Compute' : provider === 'azure' ? 'Máquinas virtuales' : 'EC2'
  const accountsLabel =
    provider === 'gcp' ? 'Proyectos' : provider === 'azure' ? 'Suscripciones' : 'Cuentas'
  return {
    id: provider,
    label,
    brand,
    defaultRoute: `${base}/overview`,
    children: [
      { id: `${provider}-overview`, label: 'Resumen', route: `${base}/overview`, icon: 'space_dashboard' },
      {
        id: `${provider}-accounts`,
        label: accountsLabel,
        route: `${base}/accounts`,
        icon: 'corporate_fare',
      },
      {
        id: `${provider}-instances`,
        label: instancesLabel,
        route: `${base}/instances`,
        icon: 'dns',
      },
      { id: `${provider}-network`, label: 'Red', route: `${base}/network`, icon: 'device_hub' },
      { id: `${provider}-billing`, label: 'Facturación', route: `${base}/billing`, icon: 'account_balance_wallet' },
      { id: `${provider}-metrics`, label: 'Métricas', route: `${base}/metrics`, icon: 'show_chart' },
    ],
  }
}

export const CLOUD_SIDEBAR_BRANCHES: SidebarNavBranch[] = [
  cloudProviderBranch('aws', 'AWS', 'aws'),
  cloudProviderBranch('gcp', 'GCP', 'gcp'),
  cloudProviderBranch('azure', 'Azure', 'azure'),
]

export const resolveCloudProviderFromPath = (path: string): 'aws' | 'gcp' | 'azure' | null => {
  const m = path.match(/^\/cloud\/(aws|gcp|azure)(?:\/|$)/)
  return m ? (m[1] as 'aws' | 'gcp' | 'azure') : null
}

export const cloudSectionTabs = (provider: string): AreaNavTab[] => {
  const branch = CLOUD_SIDEBAR_BRANCHES.find((b) => b.id === provider)
  return branch?.children ?? []
}

const prefix =
  (...prefixes: string[]) =>
  (path: string): boolean =>
    prefixes.some((p) => path === p || path.startsWith(`${p}/`))

export const SIDEBAR_MAIN_MODULES: SidebarMainModule[] = [
  {
    id: 'overview',
    label: 'Resumen',
    icon: 'space_dashboard',
    tone: 'violet',
    route: '/dashboard',
    description: 'Tablero, centro de mando y visibilidad global',
    tabs: [
      { id: 'dashboard', label: 'Tablero', route: '/dashboard', icon: 'space_dashboard' },
      { id: 'command-center', label: 'Centro de mando', route: '/command-center', icon: 'terminal', badgeKey: 'command-center' },
      { id: 'resource-explorer', label: 'Explorador de recursos', route: '/resource-explorer', icon: 'manage_search' },
      { id: 'topology-map', label: 'Mapa de topología', route: '/topology-map', icon: 'lan' },
      { id: 'health-center', label: 'Centro de salud', route: '/health-center', icon: 'monitor_heart', badgeKey: 'health' },
    ],
    match: prefix(
      '/dashboard',
      '/command-center',
      '/resource-explorer',
      '/topology-map',
      '/health-center',
    ),
  },
  {
    id: 'clouds',
    label: 'Nubes',
    icon: 'cloud_queue',
    tone: 'cyan',
    route: '/cloud/aws/overview',
    description: 'Planos de control AWS, GCP y Azure',
    tabs: [
      { id: 'aws', label: 'AWS', route: '/cloud/aws/overview', logo: 'aws' },
      { id: 'gcp', label: 'GCP', route: '/cloud/gcp/overview', logo: 'gcp' },
      { id: 'azure', label: 'Azure', route: '/cloud/azure/overview', logo: 'azure' },
    ],
    branches: CLOUD_SIDEBAR_BRANCHES,
    match: prefix('/cloud', '/accounts'),
  },
  {
    id: 'infrastructure',
    label: 'Infraestructura',
    icon: 'domain',
    tone: 'blue',
    route: '/instances/all-instances',
    description: 'Instancias, VPS, contenedores y recursos de plataforma',
    tabs: [
      { id: 'instances', label: 'Instancias', route: '/instances/all-instances', icon: 'layers', badgeKey: 'instances' },
      { id: 'vps', label: 'VPS / Bare metal', route: '/vps/overview', icon: 'storage', badgeKey: 'vps' },
      { id: 'docker', label: 'Docker', route: '/docker/containers', logo: 'docker' },
      { id: 'kubernetes', label: 'Kubernetes', route: '/kubernetes/pods', logo: 'kubernetes' },
      { id: 'network', label: 'Red', route: '/network', icon: 'device_hub', badgeKey: 'network' },
      { id: 'storage', label: 'Almacenamiento', route: '/storage', icon: 'database' },
      { id: 'backups', label: 'Copias de seguridad', route: '/backups', icon: 'archive', badgeKey: 'backups' },
      { id: 'capacity', label: 'Planificador de capacidad', route: '/capacity-planner', icon: 'trending_up', badgeKey: 'capacity' },
    ],
    match: prefix(
      '/instances',
      '/vps',
      '/docker',
      '/kubernetes',
      '/network',
      '/storage',
      '/backups',
      '/capacity-planner',
    ),
  },
  {
    id: 'automation',
    label: 'Automatización',
    icon: 'build_circle',
    tone: 'amber',
    route: '/jenkins/jobs',
    description: 'CI/CD, Terraform, despliegues y runbooks',
    tabs: [
      { id: 'jenkins', label: 'Jenkins', route: '/jenkins/jobs', logo: 'jenkins', badgeKey: 'jenkins' },
      { id: 'terraform', label: 'Terraform', route: '/terraform/workspaces', logo: 'terraform' },
      { id: 'deployments', label: 'Despliegues', route: '/deployments', icon: 'rocket_launch', badgeKey: 'deployments' },
      { id: 'terminal', label: 'Terminal', route: '/terminal/active-sessions', icon: 'terminal' },
      { id: 'runbooks', label: 'Runbooks', route: '/runbooks', icon: 'auto_stories' },
      { id: 'scheduler', label: 'Programador', route: '/scheduler', icon: 'event_repeat', badgeKey: 'scheduler' },
      { id: 'catalog', label: 'Catálogo de servicios', route: '/service-catalog', icon: 'apps' },
      { id: 'approvals', label: 'Aprobaciones', route: '/approvals', icon: 'task_alt', badgeKey: 'approvals' },
    ],
    match: prefix(
      '/jenkins',
      '/terraform',
      '/deployments',
      '/terminal',
      '/runbooks',
      '/scheduler',
      '/service-catalog',
      '/approvals',
      '/ssh',
    ),
  },
  {
    id: 'repositories',
    label: 'Repositorios',
    icon: 'folder_special',
    tone: 'violet',
    route: '/repositories/github',
    description: 'GitHub, ramas, commits, pull requests y despliegues',
    tabs: [
      { id: 'github', label: 'GitHub', route: '/repositories/github', logo: 'github', badgeKey: 'github-repos' },
      { id: 'gitlab', label: 'GitLab', route: '/repositories/gitlab', icon: 'code' },
      { id: 'webhooks', label: 'Webhooks', route: '/repositories/webhooks', icon: 'webhook', badgeKey: 'github-webhooks' },
      { id: 'branches', label: 'Ramas', route: '/repositories/branches', icon: 'account_tree' },
      { id: 'commits', label: 'Commits', route: '/repositories/commits', icon: 'history_edu' },
      { id: 'pull-requests', label: 'Pull Requests', route: '/repositories/pull-requests', icon: 'merge' },
      { id: 'deployments', label: 'Despliegues', route: '/repositories/deployments', icon: 'rocket_launch', badgeKey: 'github-deployments' },
    ],
    match: prefix('/repositories'),
  },
  {
    id: 'observability',
    label: 'Observabilidad',
    icon: 'visibility',
    tone: 'green',
    route: '/metrics/overview',
    description: 'Métricas, logs, facturación, alertas e informes',
    tabs: [
      { id: 'metrics', label: 'Métricas', route: '/metrics/overview', icon: 'show_chart' },
      { id: 'logs', label: 'Logs', route: '/logs', icon: 'receipt_long', badgeKey: 'logs' },
      { id: 'billing', label: 'Facturación', route: '/billing/overview', icon: 'account_balance_wallet', badgeKey: 'billing' },
      { id: 'cost', label: 'Optimizador de costes', route: '/cost-optimizer', icon: 'trending_down', badgeKey: 'cost' },
      { id: 'alerts', label: 'Alertas', route: '/alerts/active', icon: 'warning_amber', badgeKey: 'alerts' },
      { id: 'incidents', label: 'Incidentes', route: '/incidents', icon: 'local_fire_department', badgeKey: 'incidents' },
      { id: 'notifications', label: 'Notificaciones', route: '/notifications/all', icon: 'notifications', badgeKey: 'notifications' },
      { id: 'reports', label: 'Informes', route: '/reports', icon: 'summarize' },
      { id: 'changes', label: 'Gestión de cambios', route: '/change-management', icon: 'published_with_changes', badgeKey: 'changes' },
    ],
    match: prefix(
      '/metrics',
      '/logs',
      '/billing',
      '/cost-optimizer',
      '/alerts',
      '/incidents',
      '/notifications',
      '/reports',
      '/change-management',
    ),
  },
  {
    id: 'security',
    label: 'Seguridad',
    icon: 'shield',
    tone: 'pink',
    route: '/security-center',
    description: 'Postura, secretos, cumplimiento y auditoría',
    tabs: [
      { id: 'security-center', label: 'Centro de seguridad', route: '/security-center', icon: 'shield', badgeKey: 'security' },
      { id: 'secrets', label: 'Gestor de secretos', route: '/secrets-manager', icon: 'vpn_key', badgeKey: 'secrets' },
      { id: 'compliance', label: 'Cumplimiento / Políticas', route: '/compliance', icon: 'fact_check', badgeKey: 'compliance' },
      { id: 'access', label: 'Control de acceso', route: '/access-control', icon: 'lock_person' },
      { id: 'audit', label: 'Auditoría', route: '/audit/activity-logs', icon: 'manage_search' },
    ],
    match: prefix(
      '/security-center',
      '/secrets-manager',
      '/compliance',
      '/access-control',
      '/audit',
    ),
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: 'admin_panel_settings',
    tone: 'slate',
    route: '/admin/users',
    description: 'Usuarios, roles, ajustes e integraciones',
    tabs: [
      { id: 'users', label: 'Usuarios', route: '/admin/users', icon: 'groups' },
      { id: 'roles', label: 'Roles', route: '/admin/roles', icon: 'manage_accounts' },
      { id: 'api-tokens', label: 'Tokens API', route: '/admin/api-tokens', icon: 'vpn_key', badgeKey: 'tokens' },
      { id: 'webhooks', label: 'Webhooks', route: '/admin/webhooks', icon: 'webhook', badgeKey: 'admin-webhooks' },
      { id: 'settings', label: 'Configuración', route: '/settings/general', icon: 'settings' },
      { id: 'demo-mode', label: 'Modo demo', route: '/admin/demo-mode', icon: 'science' },
      { id: 'ai-assistant', label: 'Asistente IA', route: '/ai-assistant', icon: 'auto_awesome', badgeKey: 'copilot' },
    ],
    match: prefix('/admin', '/settings', '/ai-assistant'),
  },
]

export const resolveAreaFromPath = (path: string): SidebarMainModule | null => {
  const clean = path.replace(/^\//, '').split('?')[0]
  const full = `/${clean}`
  return SIDEBAR_MAIN_MODULES.find((m) => m.match(full)) ?? null
}

export const flattenAreaNavForSearch = (): {
  label: string
  route: string
  group: string
  icon?: string
  logo?: NavLogoKey
}[] =>
  SIDEBAR_MAIN_MODULES.flatMap((m) => {
    if (m.branches?.length) {
      return m.branches.flatMap((b) =>
        b.children.map((t) => ({
          label: `${m.label} › ${b.label} › ${t.label}`,
          route: t.route,
          group: m.label,
          icon: t.icon,
          logo: t.logo,
        })),
      )
    }
    return m.tabs.map((t) => ({
      label: `${m.label} › ${t.label}`,
      route: t.route,
      group: m.label,
      icon: t.icon,
      logo: t.logo,
    }))
  })
