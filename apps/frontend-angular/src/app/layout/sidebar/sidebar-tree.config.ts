import type { NavIconTone } from './sidebar-nav.config'

export type SidebarBrand = 'aws' | 'gcp' | 'azure'

export interface SidebarLeaf {
  id: string
  label: string
  route: string
  icon?: string
  badgeKey?: string
}

export interface SidebarBranch {
  id: string
  label: string
  icon?: string
  tone?: NavIconTone
  brand?: SidebarBrand
  badgeKey?: string
  defaultRoute?: string
  children: SidebarLeaf[]
}

export interface SidebarGroup {
  id: string
  label: string
  icon: string
  tone: NavIconTone
  branches: SidebarBranch[]
}

const mkLeaf = (id: string, label: string, route: string, icon?: string, badgeKey?: string): SidebarLeaf => ({
  id,
  label,
  route,
  icon: icon ?? 'chevron_right',
  badgeKey,
})

const mkBranch = (
  id: string,
  label: string,
  route: string,
  icon: string,
  tone?: NavIconTone,
  badgeKey?: string,
  children?: SidebarLeaf[],
): SidebarBranch => ({
  id,
  label,
  icon,
  tone,
  badgeKey,
  defaultRoute: route,
  children: children ?? [mkLeaf(`${id}-main`, label, route, icon, badgeKey)],
})

const cloudBranch = (provider: 'aws' | 'gcp' | 'azure', label: string, brand: SidebarBrand): SidebarBranch => {
  const base = `/cloud/${provider}`
  return {
    id: provider,
    label,
    brand,
    defaultRoute: `${base}/overview`,
    children: [
      mkLeaf(`${provider}-overview`, 'Overview', `${base}/overview`, 'dashboard'),
      mkLeaf(`${provider}-accounts`, provider === 'gcp' ? 'Projects' : provider === 'azure' ? 'Subscriptions' : 'Accounts', `${base}/accounts`, 'account_balance'),
      mkLeaf(`${provider}-instances`, provider === 'gcp' ? 'Compute' : provider === 'azure' ? 'VMs' : 'EC2', `${base}/instances`, 'dns'),
      mkLeaf(`${provider}-network`, 'Network', `${base}/network`, 'hub'),
      mkLeaf(`${provider}-billing`, 'Billing', `${base}/billing`, 'payments'),
      mkLeaf(`${provider}-metrics`, 'Metrics', `${base}/metrics`, 'monitoring'),
    ],
  }
}

export const SIDEBAR_TREE: SidebarGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'space_dashboard',
    tone: 'violet',
    branches: [
      mkBranch('dashboard', 'Dashboard', '/dashboard', 'space_dashboard', 'violet'),
      mkBranch('command-center', 'Command Center', '/command-center', 'bolt', 'amber'),
    ],
  },
  {
    id: 'clouds',
    label: 'Clouds',
    icon: 'cloud',
    tone: 'cyan',
    branches: [
      cloudBranch('aws', 'AWS', 'aws'),
      cloudBranch('gcp', 'GCP', 'gcp'),
      cloudBranch('azure', 'Azure', 'azure'),
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    icon: 'dns',
    tone: 'blue',
    branches: [
      mkBranch('instances', 'Instances', '/instances/all-instances', 'dns', 'blue', 'instances'),
      mkBranch('vps', 'VPS / Bare Metal', '/vps/overview', 'computer', 'orange', 'vps'),
      mkBranch('docker', 'Docker', '/docker/containers', 'view_in_ar', 'cyan'),
      mkBranch('kubernetes', 'Kubernetes', '/kubernetes/pods', 'hub', 'indigo'),
      mkBranch('network', 'Network', '/network', 'device_hub', 'blue', 'network'),
      mkBranch('storage', 'Storage', '/storage', 'storage', 'violet'),
      mkBranch('backups', 'Backups', '/backups', 'backup', 'green', 'backups'),
    ],
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: 'precision_manufacturing',
    tone: 'amber',
    branches: [
      mkBranch('jenkins', 'Jenkins', '/jenkins/jobs', 'precision_manufacturing', 'amber', 'jenkins'),
      mkBranch('terraform', 'Terraform', '/terraform/workspaces', 'account_tree', 'violet'),
      mkBranch('deployments', 'Deployments', '/deployments', 'rocket_launch', 'cyan', 'deployments'),
      mkBranch('terminal', 'Terminal', '/terminal/active-sessions', 'terminal', 'slate'),
      mkBranch('service-catalog', 'Service Catalog', '/service-catalog', 'category', 'violet'),
      mkBranch('approvals', 'Approvals', '/approvals', 'rule', 'amber', 'approvals'),
    ],
  },
  {
    id: 'observability',
    label: 'Observability',
    icon: 'monitoring',
    tone: 'green',
    branches: [
      mkBranch('metrics', 'Metrics', '/metrics/overview', 'monitoring', 'green'),
      mkBranch('logs', 'Logs', '/logs', 'article', 'cyan', 'logs'),
      mkBranch('billing', 'Billing', '/billing/overview', 'payments', 'green', 'billing'),
      mkBranch('cost-optimizer', 'Cost Optimizer', '/cost-optimizer', 'savings', 'green', 'cost'),
      mkBranch('alerts', 'Alerts', '/alerts/active', 'notifications_active', 'amber', 'alerts'),
      mkBranch('incidents', 'Incidents', '/incidents', 'crisis_alert', 'amber', 'incidents'),
      mkBranch('notifications', 'Notifications', '/notifications/all', 'notifications', 'blue', 'notifications'),
      mkBranch('reports', 'Reports', '/reports', 'assessment', 'violet'),
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: 'security',
    tone: 'pink',
    branches: [
      mkBranch('security-center', 'Security Center', '/security-center', 'security', 'pink', 'security'),
      mkBranch('secrets-manager', 'Secrets Manager', '/secrets-manager', 'key', 'violet', 'secrets'),
      mkBranch('access-control', 'Access Control', '/access-control', 'admin_panel_settings', 'indigo'),
      mkBranch('audit', 'Audit', '/audit/activity-logs', 'history', 'slate'),
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: 'settings',
    tone: 'slate',
    branches: [
      mkBranch('users', 'Users', '/admin/users', 'group', 'violet'),
      mkBranch('roles', 'Roles', '/admin/roles', 'badge', 'cyan'),
      mkBranch('settings', 'Settings', '/settings/general', 'settings', 'slate'),
      mkBranch('demo-mode', 'Demo Mode', '/admin/demo-mode', 'science', 'amber'),
    ],
  },
]

export interface FlatNavEntry {
  label: string
  route: string
  group: string
  branch: string
  icon?: string
}

export const flattenSidebarNav = (): FlatNavEntry[] => {
  const out: FlatNavEntry[] = []
  for (const g of SIDEBAR_TREE) {
    for (const b of g.branches) {
      for (const leafItem of b.children) {
        out.push({
          label: `${b.label} › ${leafItem.label}`,
          route: leafItem.route,
          group: g.label,
          branch: b.label,
          icon: leafItem.icon,
        })
      }
    }
  }
  return out
}

export const DEFAULT_FAVORITES = [
  '/dashboard',
  '/command-center',
  '/cloud/aws/overview',
  '/instances/all-instances',
  '/deployments',
  '/alerts/active',
  '/security-center',
]
