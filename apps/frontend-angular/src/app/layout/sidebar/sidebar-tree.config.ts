import type { NavIconTone } from './sidebar-nav.config'

export type SidebarBrand = 'aws' | 'gcp' | 'azure'

export interface SidebarLinkItem {
  kind: 'link'
  id: string
  label: string
  route: string
  icon?: string
  badgeKey?: string
}

export interface SidebarSectionItem {
  kind: 'section'
  id: string
  label: string
  brand?: SidebarBrand
}

export type SidebarNavItem = SidebarLinkItem | SidebarSectionItem

export interface SidebarGroup {
  id: string
  label: string
  icon: string
  tone: NavIconTone
  items: SidebarNavItem[]
}

const mkLink = (
  id: string,
  label: string,
  route: string,
  icon?: string,
  badgeKey?: string,
): SidebarLinkItem => ({
  kind: 'link',
  id,
  label,
  route,
  icon: icon ?? 'chevron_right',
  badgeKey,
})

const mkSection = (id: string, label: string, brand?: SidebarBrand): SidebarSectionItem => ({
  kind: 'section',
  id,
  label,
  brand,
})

const cloudItems = (provider: 'aws' | 'gcp' | 'azure', title: string, brand: SidebarBrand): SidebarNavItem[] => {
  const base = `/cloud/${provider}`
  const accountsLabel = provider === 'gcp' ? 'Projects' : provider === 'azure' ? 'Subscriptions' : 'Accounts'
  const instancesLabel = provider === 'gcp' ? 'Compute' : provider === 'azure' ? 'VMs' : 'EC2'
  return [
    mkSection(`${provider}-section`, title, brand),
    mkLink(`${provider}-overview`, 'Overview', `${base}/overview`, 'dashboard'),
    mkLink(`${provider}-accounts`, accountsLabel, `${base}/accounts`, 'account_balance'),
    mkLink(`${provider}-instances`, instancesLabel, `${base}/instances`, 'dns'),
    mkLink(`${provider}-network`, 'Network', `${base}/network`, 'hub'),
    mkLink(`${provider}-billing`, 'Billing', `${base}/billing`, 'payments'),
    mkLink(`${provider}-metrics`, 'Metrics', `${base}/metrics`, 'monitoring'),
  ]
}

export const SIDEBAR_TREE: SidebarGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'space_dashboard',
    tone: 'violet',
    items: [
      mkLink('dashboard', 'Dashboard', '/dashboard', 'space_dashboard'),
      mkLink('command-center', 'Command Center', '/command-center', 'bolt', 'command-center'),
      mkLink('resource-explorer', 'Resource Explorer', '/resource-explorer', 'travel_explore'),
      mkLink('topology-map', 'Topology Map', '/topology-map', 'account_tree'),
      mkLink('health-center', 'Health Center', '/health-center', 'favorite', 'health'),
    ],
  },
  {
    id: 'clouds',
    label: 'Clouds',
    icon: 'cloud',
    tone: 'cyan',
    items: [
      ...cloudItems('aws', 'AWS', 'aws'),
      ...cloudItems('gcp', 'GCP', 'gcp'),
      ...cloudItems('azure', 'Azure', 'azure'),
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    icon: 'dns',
    tone: 'blue',
    items: [
      mkLink('instances', 'Instances', '/instances/all-instances', 'dns', 'instances'),
      mkLink('vps', 'VPS / Bare Metal', '/vps/overview', 'computer', 'vps'),
      mkLink('docker', 'Docker', '/docker/containers', 'view_in_ar'),
      mkLink('kubernetes', 'Kubernetes', '/kubernetes/pods', 'hub'),
      mkLink('network', 'Network', '/network', 'device_hub', 'network'),
      mkLink('storage', 'Storage', '/storage', 'storage'),
      mkLink('backups', 'Backups', '/backups', 'backup', 'backups'),
      mkLink('capacity-planner', 'Capacity Planner', '/capacity-planner', 'analytics', 'capacity'),
    ],
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: 'precision_manufacturing',
    tone: 'amber',
    items: [
      mkLink('jenkins', 'Jenkins', '/jenkins/jobs', 'precision_manufacturing', 'jenkins'),
      mkLink('terraform', 'Terraform', '/terraform/workspaces', 'account_tree'),
      mkLink('deployments', 'Deployments', '/deployments', 'rocket_launch', 'deployments'),
      mkLink('terminal', 'Terminal', '/terminal/active-sessions', 'terminal'),
      mkLink('runbooks', 'Runbooks', '/runbooks', 'menu_book'),
      mkLink('scheduler', 'Scheduler', '/scheduler', 'schedule', 'scheduler'),
      mkLink('service-catalog', 'Service Catalog', '/service-catalog', 'category'),
      mkLink('approvals', 'Approvals', '/approvals', 'rule', 'approvals'),
    ],
  },
  {
    id: 'observability',
    label: 'Observability',
    icon: 'monitoring',
    tone: 'green',
    items: [
      mkLink('metrics', 'Metrics', '/metrics/overview', 'monitoring'),
      mkLink('logs', 'Logs', '/logs', 'article', 'logs'),
      mkLink('billing', 'Billing', '/billing/overview', 'payments', 'billing'),
      mkLink('cost-optimizer', 'Cost Optimizer', '/cost-optimizer', 'savings', 'cost'),
      mkLink('alerts', 'Alerts', '/alerts/active', 'notifications_active', 'alerts'),
      mkLink('incidents', 'Incidents', '/incidents', 'crisis_alert', 'incidents'),
      mkLink('notifications', 'Notifications', '/notifications/all', 'notifications', 'notifications'),
      mkLink('reports', 'Reports', '/reports', 'assessment'),
      mkLink('change-management', 'Change Management', '/change-management', 'change_circle', 'changes'),
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: 'security',
    tone: 'pink',
    items: [
      mkLink('security-center', 'Security Center', '/security-center', 'security', 'security'),
      mkLink('secrets-manager', 'Secrets Manager', '/secrets-manager', 'key', 'secrets'),
      mkLink('compliance', 'Compliance / Policies', '/compliance', 'policy', 'compliance'),
      mkLink('access-control', 'Access Control', '/access-control', 'admin_panel_settings'),
      mkLink('audit', 'Audit', '/audit/activity-logs', 'history'),
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: 'settings',
    tone: 'slate',
    items: [
      mkLink('users', 'Users', '/admin/users', 'group'),
      mkLink('roles', 'Roles', '/admin/roles', 'badge'),
      mkLink('api-tokens', 'API Tokens', '/admin/api-tokens', 'token', 'tokens'),
      mkLink('webhooks', 'Webhooks', '/admin/webhooks', 'webhook'),
      mkLink('settings', 'Settings', '/settings/general', 'settings'),
      mkLink('demo-mode', 'Demo Mode', '/admin/demo-mode', 'science'),
      mkLink('ai-assistant', 'AI Assistant', '/ai-assistant', 'smart_toy', 'copilot'),
    ],
  },
]

export interface FlatNavEntry {
  label: string
  route: string
  group: string
  icon?: string
}

export const flattenSidebarNav = (): FlatNavEntry[] => {
  const out: FlatNavEntry[] = []
  for (const g of SIDEBAR_TREE) {
    for (const item of g.items) {
      if (item.kind === 'link') {
        out.push({
          label: item.label,
          route: item.route,
          group: g.label,
          icon: item.icon,
        })
      }
    }
  }
  return out
}

export const DEFAULT_FAVORITES = [
  '/dashboard',
  '/resource-explorer',
  '/health-center',
  '/command-center',
  '/ai-assistant',
  '/alerts/active',
]
