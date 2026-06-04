import type { NavIconTone } from '../../layout/sidebar/sidebar-nav.config'

export interface AreaNavTab {
  id: string
  label: string
  route: string
  icon?: string
  badgeKey?: string
}

export interface SidebarMainModule {
  id: string
  label: string
  icon: string
  tone: NavIconTone
  /** Default landing route when clicking the module in the sidebar */
  route: string
  description: string
  tabs: AreaNavTab[]
  match: (path: string) => boolean
}

const prefix =
  (...prefixes: string[]) =>
  (path: string): boolean =>
    prefixes.some((p) => path === p || path.startsWith(`${p}/`))

export const SIDEBAR_MAIN_MODULES: SidebarMainModule[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'space_dashboard',
    tone: 'violet',
    route: '/dashboard',
    description: 'Dashboard, command center and global visibility',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: 'space_dashboard' },
      { id: 'command-center', label: 'Command Center', route: '/command-center', icon: 'bolt', badgeKey: 'command-center' },
      { id: 'resource-explorer', label: 'Resource Explorer', route: '/resource-explorer', icon: 'travel_explore' },
      { id: 'topology-map', label: 'Topology Map', route: '/topology-map', icon: 'account_tree' },
      { id: 'health-center', label: 'Health Center', route: '/health-center', icon: 'favorite', badgeKey: 'health' },
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
    label: 'Clouds',
    icon: 'cloud',
    tone: 'cyan',
    route: '/cloud/aws/overview',
    description: 'AWS, GCP and Azure control planes',
    tabs: [
      { id: 'aws', label: 'AWS', route: '/cloud/aws/overview', icon: 'cloud' },
      { id: 'gcp', label: 'GCP', route: '/cloud/gcp/overview', icon: 'cloud_circle' },
      { id: 'azure', label: 'Azure', route: '/cloud/azure/overview', icon: 'cloud_queue' },
    ],
    match: prefix('/cloud', '/accounts'),
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    icon: 'dns',
    tone: 'blue',
    route: '/instances/all-instances',
    description: 'Instances, VPS, containers and platform resources',
    tabs: [
      { id: 'instances', label: 'Instances', route: '/instances/all-instances', icon: 'dns', badgeKey: 'instances' },
      { id: 'vps', label: 'VPS / Bare Metal', route: '/vps/overview', icon: 'computer', badgeKey: 'vps' },
      { id: 'docker', label: 'Docker', route: '/docker/containers', icon: 'view_in_ar' },
      { id: 'kubernetes', label: 'Kubernetes', route: '/kubernetes/pods', icon: 'hub' },
      { id: 'network', label: 'Network', route: '/network', icon: 'device_hub', badgeKey: 'network' },
      { id: 'storage', label: 'Storage', route: '/storage', icon: 'storage' },
      { id: 'backups', label: 'Backups', route: '/backups', icon: 'backup', badgeKey: 'backups' },
      { id: 'capacity', label: 'Capacity Planner', route: '/capacity-planner', icon: 'analytics', badgeKey: 'capacity' },
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
    label: 'Automation',
    icon: 'precision_manufacturing',
    tone: 'amber',
    route: '/jenkins/jobs',
    description: 'CI/CD, Terraform, deployments and runbooks',
    tabs: [
      { id: 'jenkins', label: 'Jenkins', route: '/jenkins/jobs', icon: 'precision_manufacturing', badgeKey: 'jenkins' },
      { id: 'terraform', label: 'Terraform', route: '/terraform/workspaces', icon: 'account_tree' },
      { id: 'deployments', label: 'Deployments', route: '/deployments', icon: 'rocket_launch', badgeKey: 'deployments' },
      { id: 'terminal', label: 'Terminal', route: '/terminal/active-sessions', icon: 'terminal' },
      { id: 'runbooks', label: 'Runbooks', route: '/runbooks', icon: 'menu_book' },
      { id: 'scheduler', label: 'Scheduler', route: '/scheduler', icon: 'schedule', badgeKey: 'scheduler' },
      { id: 'catalog', label: 'Service Catalog', route: '/service-catalog', icon: 'category' },
      { id: 'approvals', label: 'Approvals', route: '/approvals', icon: 'rule', badgeKey: 'approvals' },
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
    label: 'Observability',
    icon: 'monitoring',
    tone: 'green',
    route: '/metrics/overview',
    description: 'Metrics, logs, billing, alerts and reports',
    tabs: [
      { id: 'metrics', label: 'Metrics', route: '/metrics/overview', icon: 'monitoring' },
      { id: 'logs', label: 'Logs', route: '/logs', icon: 'article', badgeKey: 'logs' },
      { id: 'billing', label: 'Billing', route: '/billing/overview', icon: 'payments', badgeKey: 'billing' },
      { id: 'cost', label: 'Cost Optimizer', route: '/cost-optimizer', icon: 'savings', badgeKey: 'cost' },
      { id: 'alerts', label: 'Alerts', route: '/alerts/active', icon: 'notifications_active', badgeKey: 'alerts' },
      { id: 'incidents', label: 'Incidents', route: '/incidents', icon: 'crisis_alert', badgeKey: 'incidents' },
      { id: 'notifications', label: 'Notifications', route: '/notifications/all', icon: 'notifications', badgeKey: 'notifications' },
      { id: 'reports', label: 'Reports', route: '/reports', icon: 'assessment' },
      { id: 'changes', label: 'Change Management', route: '/change-management', icon: 'change_circle', badgeKey: 'changes' },
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
    label: 'Security',
    icon: 'security',
    tone: 'pink',
    route: '/security-center',
    description: 'Posture, secrets, compliance and audit',
    tabs: [
      { id: 'security-center', label: 'Security Center', route: '/security-center', icon: 'security', badgeKey: 'security' },
      { id: 'secrets', label: 'Secrets Manager', route: '/secrets-manager', icon: 'key', badgeKey: 'secrets' },
      { id: 'compliance', label: 'Compliance / Policies', route: '/compliance', icon: 'policy', badgeKey: 'compliance' },
      { id: 'access', label: 'Access Control', route: '/access-control', icon: 'admin_panel_settings' },
      { id: 'audit', label: 'Audit', route: '/audit/activity-logs', icon: 'history' },
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
    label: 'Admin',
    icon: 'settings',
    tone: 'slate',
    route: '/admin/users',
    description: 'Users, roles, settings and integrations',
    tabs: [
      { id: 'users', label: 'Users', route: '/admin/users', icon: 'group' },
      { id: 'roles', label: 'Roles', route: '/admin/roles', icon: 'badge' },
      { id: 'api-tokens', label: 'API Tokens', route: '/admin/api-tokens', icon: 'token', badgeKey: 'tokens' },
      { id: 'webhooks', label: 'Webhooks', route: '/admin/webhooks', icon: 'webhook' },
      { id: 'settings', label: 'Settings', route: '/settings/general', icon: 'settings' },
      { id: 'demo-mode', label: 'Demo Mode', route: '/admin/demo-mode', icon: 'science' },
      { id: 'ai-assistant', label: 'AI Assistant', route: '/ai-assistant', icon: 'smart_toy', badgeKey: 'copilot' },
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
  SIDEBAR_MAIN_MODULES.flatMap((m) =>
    m.tabs.map((t) => ({
      label: `${m.label} › ${t.label}`,
      route: t.route,
      group: m.label,
      icon: t.icon,
    })),
  )
