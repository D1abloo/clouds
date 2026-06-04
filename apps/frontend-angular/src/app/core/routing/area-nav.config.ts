import type { NavIconTone } from '../../layout/sidebar/sidebar-nav.config'

export interface AreaNavTab {
  id: string
  label: string
  route: string
  icon?: string
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
      { id: `${provider}-overview`, label: 'Resumen', route: `${base}/overview`, icon: 'dashboard' },
      {
        id: `${provider}-accounts`,
        label: accountsLabel,
        route: `${base}/accounts`,
        icon: 'account_balance',
      },
      {
        id: `${provider}-instances`,
        label: instancesLabel,
        route: `${base}/instances`,
        icon: 'memory',
      },
      { id: `${provider}-network`, label: 'Red', route: `${base}/network`, icon: 'hub' },
      { id: `${provider}-billing`, label: 'Facturación', route: `${base}/billing`, icon: 'payments' },
      { id: `${provider}-metrics`, label: 'Métricas', route: `${base}/metrics`, icon: 'monitoring' },
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
      { id: 'command-center', label: 'Centro de mando', route: '/command-center', icon: 'bolt', badgeKey: 'command-center' },
      { id: 'resource-explorer', label: 'Explorador de recursos', route: '/resource-explorer', icon: 'travel_explore' },
      { id: 'topology-map', label: 'Mapa de topología', route: '/topology-map', icon: 'account_tree' },
      { id: 'health-center', label: 'Centro de salud', route: '/health-center', icon: 'favorite', badgeKey: 'health' },
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
    icon: 'cloud',
    tone: 'cyan',
    route: '/cloud/aws/overview',
    description: 'Planos de control AWS, GCP y Azure',
    tabs: [
      { id: 'aws', label: 'AWS', route: '/cloud/aws/overview', icon: 'cloud' },
      { id: 'gcp', label: 'GCP', route: '/cloud/gcp/overview', icon: 'cloud_circle' },
      { id: 'azure', label: 'Azure', route: '/cloud/azure/overview', icon: 'cloud_queue' },
    ],
    branches: CLOUD_SIDEBAR_BRANCHES,
    match: prefix('/cloud', '/accounts'),
  },
  {
    id: 'infrastructure',
    label: 'Infraestructura',
    icon: 'dns',
    tone: 'blue',
    route: '/instances/all-instances',
    description: 'Instancias, VPS, contenedores y recursos de plataforma',
    tabs: [
      { id: 'instances', label: 'Instancias', route: '/instances/all-instances', icon: 'dns', badgeKey: 'instances' },
      { id: 'vps', label: 'VPS / Bare metal', route: '/vps/overview', icon: 'computer', badgeKey: 'vps' },
      { id: 'docker', label: 'Docker', route: '/docker/containers', icon: 'view_in_ar' },
      { id: 'kubernetes', label: 'Kubernetes', route: '/kubernetes/pods', icon: 'hub' },
      { id: 'network', label: 'Red', route: '/network', icon: 'device_hub', badgeKey: 'network' },
      { id: 'storage', label: 'Almacenamiento', route: '/storage', icon: 'storage' },
      { id: 'backups', label: 'Copias de seguridad', route: '/backups', icon: 'backup', badgeKey: 'backups' },
      { id: 'capacity', label: 'Planificador de capacidad', route: '/capacity-planner', icon: 'analytics', badgeKey: 'capacity' },
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
    icon: 'precision_manufacturing',
    tone: 'amber',
    route: '/jenkins/jobs',
    description: 'CI/CD, Terraform, despliegues y runbooks',
    tabs: [
      { id: 'jenkins', label: 'Jenkins', route: '/jenkins/jobs', icon: 'precision_manufacturing', badgeKey: 'jenkins' },
      { id: 'terraform', label: 'Terraform', route: '/terraform/workspaces', icon: 'account_tree' },
      { id: 'deployments', label: 'Despliegues', route: '/deployments', icon: 'rocket_launch', badgeKey: 'deployments' },
      { id: 'terminal', label: 'Terminal', route: '/terminal/active-sessions', icon: 'terminal' },
      { id: 'runbooks', label: 'Runbooks', route: '/runbooks', icon: 'menu_book' },
      { id: 'scheduler', label: 'Programador', route: '/scheduler', icon: 'schedule', badgeKey: 'scheduler' },
      { id: 'catalog', label: 'Catálogo de servicios', route: '/service-catalog', icon: 'category' },
      { id: 'approvals', label: 'Aprobaciones', route: '/approvals', icon: 'rule', badgeKey: 'approvals' },
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
    id: 'observability',
    label: 'Observabilidad',
    icon: 'monitoring',
    tone: 'green',
    route: '/metrics/overview',
    description: 'Métricas, logs, facturación, alertas e informes',
    tabs: [
      { id: 'metrics', label: 'Métricas', route: '/metrics/overview', icon: 'monitoring' },
      { id: 'logs', label: 'Logs', route: '/logs', icon: 'article', badgeKey: 'logs' },
      { id: 'billing', label: 'Facturación', route: '/billing/overview', icon: 'payments', badgeKey: 'billing' },
      { id: 'cost', label: 'Optimizador de costes', route: '/cost-optimizer', icon: 'savings', badgeKey: 'cost' },
      { id: 'alerts', label: 'Alertas', route: '/alerts/active', icon: 'notifications_active', badgeKey: 'alerts' },
      { id: 'incidents', label: 'Incidentes', route: '/incidents', icon: 'crisis_alert', badgeKey: 'incidents' },
      { id: 'notifications', label: 'Notificaciones', route: '/notifications/all', icon: 'notifications', badgeKey: 'notifications' },
      { id: 'reports', label: 'Informes', route: '/reports', icon: 'assessment' },
      { id: 'changes', label: 'Gestión de cambios', route: '/change-management', icon: 'change_circle', badgeKey: 'changes' },
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
    icon: 'security',
    tone: 'pink',
    route: '/security-center',
    description: 'Postura, secretos, cumplimiento y auditoría',
    tabs: [
      { id: 'security-center', label: 'Centro de seguridad', route: '/security-center', icon: 'security', badgeKey: 'security' },
      { id: 'secrets', label: 'Gestor de secretos', route: '/secrets-manager', icon: 'key', badgeKey: 'secrets' },
      { id: 'compliance', label: 'Cumplimiento / Políticas', route: '/compliance', icon: 'policy', badgeKey: 'compliance' },
      { id: 'access', label: 'Control de acceso', route: '/access-control', icon: 'admin_panel_settings' },
      { id: 'audit', label: 'Auditoría', route: '/audit/activity-logs', icon: 'history' },
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
    icon: 'settings',
    tone: 'slate',
    route: '/admin/users',
    description: 'Usuarios, roles, ajustes e integraciones',
    tabs: [
      { id: 'users', label: 'Usuarios', route: '/admin/users', icon: 'group' },
      { id: 'roles', label: 'Roles', route: '/admin/roles', icon: 'badge' },
      { id: 'api-tokens', label: 'Tokens API', route: '/admin/api-tokens', icon: 'token', badgeKey: 'tokens' },
      { id: 'webhooks', label: 'Webhooks', route: '/admin/webhooks', icon: 'webhook' },
      { id: 'settings', label: 'Configuración', route: '/settings/general', icon: 'settings' },
      { id: 'demo-mode', label: 'Modo demo', route: '/admin/demo-mode', icon: 'science' },
      { id: 'ai-assistant', label: 'Asistente IA', route: '/ai-assistant', icon: 'smart_toy', badgeKey: 'copilot' },
    ],
    match: prefix('/admin', '/settings', '/ai-assistant'),
  },
]

export const resolveAreaFromPath = (path: string): SidebarMainModule | null => {
  const clean = path.replace(/^\//, '').split('?')[0]
  const full = `/${clean}`
  return SIDEBAR_MAIN_MODULES.find((m) => m.match(full)) ?? null
}

export const flattenAreaNavForSearch = (): { label: string; route: string; group: string; icon?: string }[] =>
  SIDEBAR_MAIN_MODULES.flatMap((m) => {
    if (m.branches?.length) {
      return m.branches.flatMap((b) =>
        b.children.map((t) => ({
          label: `${m.label} › ${b.label} › ${t.label}`,
          route: t.route,
          group: m.label,
          icon: t.icon,
        })),
      )
    }
    return m.tabs.map((t) => ({
      label: `${m.label} › ${t.label}`,
      route: t.route,
      group: m.label,
      icon: t.icon,
    }))
  })
