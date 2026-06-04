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

const cloudSections = (
  provider: 'aws' | 'gcp' | 'azure',
  labels: Record<string, string>,
): SidebarLeaf[] => {
  const base = `/cloud/${provider}`
  const keys = [
    'overview',
    'accounts',
    'instances',
    'regions',
    'network',
    'firewall',
    'volumes',
    'snapshots',
    'load-balancers',
    'billing',
    'metrics',
    'terraform',
    'audit',
  ] as const
  return keys.map((key) => ({
    id: `${provider}-${key}`,
    label: labels[key] ?? key,
    route: `${base}/${key}`,
    icon: sectionIcon(key),
  }))
}

const AWS_LABELS: Record<string, string> = {
  overview: 'Overview',
  accounts: 'Accounts',
  instances: 'EC2 Instances',
  regions: 'Regions',
  network: 'VPC / Subnets',
  firewall: 'Security Groups',
  volumes: 'Volumes',
  snapshots: 'Snapshots',
  'load-balancers': 'Load Balancers',
  billing: 'Billing',
  metrics: 'Metrics',
  terraform: 'Terraform',
  audit: 'Audit',
}

const GCP_LABELS: Record<string, string> = {
  overview: 'Overview',
  accounts: 'Projects',
  instances: 'Compute Instances',
  regions: 'Zones',
  network: 'VPC Networks',
  firewall: 'Firewalls',
  volumes: 'Disks',
  snapshots: 'Snapshots',
  'load-balancers': 'Load Balancers',
  billing: 'Billing',
  metrics: 'Metrics',
  terraform: 'Terraform',
  audit: 'Audit',
}

const AZURE_LABELS: Record<string, string> = {
  overview: 'Overview',
  accounts: 'Subscriptions',
  instances: 'Virtual Machines',
  regions: 'Regions',
  network: 'Virtual Networks',
  firewall: 'NSG',
  volumes: 'Disks',
  snapshots: 'Snapshots',
  'load-balancers': 'Load Balancers',
  billing: 'Billing',
  metrics: 'Metrics',
  terraform: 'Terraform',
  audit: 'Audit',
}

const infraLeaves = (base: string, items: [string, string, string?][]): SidebarLeaf[] =>
  items.map(([id, label, icon]) => ({
    id: `${base}-${id}`,
    label,
    route: `/${base}/${id}`,
    icon: icon ?? 'chevron_right',
  }))

export const SIDEBAR_TREE: SidebarGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'space_dashboard',
    tone: 'violet',
    branches: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'space_dashboard',
        tone: 'violet',
        defaultRoute: '/dashboard',
        children: [{ id: 'dashboard-home', label: 'Dashboard', route: '/dashboard', icon: 'home' }],
      },
    ],
  },
  {
    id: 'clouds',
    label: 'Clouds',
    icon: 'cloud',
    tone: 'cyan',
    branches: [
      {
        id: 'aws',
        label: 'AWS',
        brand: 'aws',
        defaultRoute: '/cloud/aws/overview',
        children: cloudSections('aws', AWS_LABELS),
      },
      {
        id: 'gcp',
        label: 'GCP',
        brand: 'gcp',
        defaultRoute: '/cloud/gcp/overview',
        children: cloudSections('gcp', GCP_LABELS),
      },
      {
        id: 'azure',
        label: 'Azure',
        brand: 'azure',
        defaultRoute: '/cloud/azure/overview',
        children: cloudSections('azure', AZURE_LABELS),
      },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    icon: 'dns',
    tone: 'blue',
    branches: [
      {
        id: 'vps',
        label: 'VPS / Bare Metal',
        icon: 'dns',
        tone: 'orange',
        badgeKey: 'vps',
        defaultRoute: '/vps/overview',
        children: infraLeaves('vps', [
          ['overview', 'Overview', 'dashboard'],
          ['servers', 'Servers', 'dns'],
          ['ssh', 'SSH Connections', 'link'],
          ['terminal', 'Terminal', 'terminal'],
          ['services', 'Services', 'settings_suggest'],
          ['ports', 'Ports', 'settings_ethernet'],
          ['processes', 'Processes', 'memory'],
          ['metrics', 'Metrics', 'monitoring'],
          ['docker-detection', 'Docker Detection', 'widgets'],
          ['k8s-detection', 'Kubernetes Detection', 'hive'],
          ['audit', 'Audit', 'history'],
        ]),
      },
      {
        id: 'instances',
        label: 'Instances',
        icon: 'layers',
        tone: 'blue',
        defaultRoute: '/instances/all-instances',
        children: infraLeaves('instances', [
          ['all-instances', 'All Instances', 'list'],
          ['by-provider', 'By Provider', 'cloud'],
          ['by-account', 'By Account', 'account_tree'],
          ['by-region', 'By Region', 'public'],
          ['by-status', 'By Status', 'flag'],
          ['by-environment', 'By Environment', 'category'],
          ['cost', 'Cost', 'payments'],
          ['metrics', 'Metrics', 'monitoring'],
          ['alerts', 'Alerts', 'warning'],
          ['actions', 'Actions', 'bolt'],
        ]),
      },
      {
        id: 'docker',
        label: 'Docker',
        icon: 'widgets',
        tone: 'cyan',
        defaultRoute: '/docker/overview',
        children: infraLeaves('docker', [
          ['overview', 'Overview', 'dashboard'],
          ['hosts', 'Hosts', 'dns'],
          ['containers', 'Containers', 'view_module'],
          ['images', 'Images', 'image'],
          ['networks', 'Networks', 'hub'],
          ['volumes', 'Volumes', 'storage'],
          ['logs', 'Logs', 'article'],
          ['metrics', 'Metrics', 'monitoring'],
          ['events', 'Events', 'event'],
        ]),
      },
      {
        id: 'kubernetes',
        label: 'Kubernetes',
        icon: 'hive',
        tone: 'indigo',
        defaultRoute: '/kubernetes/overview',
        children: infraLeaves('kubernetes', [
          ['overview', 'Overview', 'dashboard'],
          ['clusters', 'Clusters', 'hub'],
          ['nodes', 'Nodes', 'dns'],
          ['namespaces', 'Namespaces', 'folder'],
          ['pods', 'Pods', 'circle'],
          ['deployments', 'Deployments', 'deployed_code'],
          ['services', 'Services', 'device_hub'],
          ['ingress', 'Ingress', 'call_merge'],
          ['events', 'Events', 'event'],
          ['logs', 'Logs', 'article'],
          ['yaml', 'YAML', 'code'],
          ['metrics', 'Metrics', 'monitoring'],
        ]),
      },
    ],
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: 'precision_manufacturing',
    tone: 'amber',
    branches: [
      {
        id: 'jenkins',
        label: 'Jenkins',
        icon: 'precision_manufacturing',
        tone: 'amber',
        badgeKey: 'jenkins',
        defaultRoute: '/jenkins/overview',
        children: infraLeaves('jenkins', [
          ['overview', 'Overview', 'dashboard'],
          ['servers', 'Servers', 'dns'],
          ['jobs', 'Jobs', 'work'],
          ['builds', 'Builds', 'build'],
          ['pipelines', 'Pipelines', 'account_tree'],
          ['logs', 'Logs', 'article'],
          ['parameters', 'Parameters', 'tune'],
          ['history', 'History', 'history'],
          ['failed-builds', 'Failed Builds', 'error',],
        ]),
      },
      {
        id: 'terraform',
        label: 'Terraform',
        icon: 'account_tree',
        tone: 'violet',
        defaultRoute: '/terraform/overview',
        children: [
          ...infraLeaves('terraform', [
            ['overview', 'Overview', 'dashboard'],
            ['workspaces', 'Workspaces', 'folder'],
            ['plans', 'Plans', 'description'],
            ['applies', 'Applies', 'play_arrow'],
            ['state', 'State', 'database'],
            ['templates', 'Templates', 'code'],
            ['variables', 'Variables', 'data_object'],
            ['logs', 'Logs', 'article'],
            ['destroy-requests', 'Destroy Requests', 'delete'],
          ]),
          { id: 'tf-launch', label: 'Launch Instance', route: '/terraform/launch-instance', icon: 'rocket_launch' },
        ],
      },
      {
        id: 'terminal',
        label: 'Terminal',
        icon: 'terminal',
        tone: 'slate',
        defaultRoute: '/terminal/active-sessions',
        children: infraLeaves('terminal', [
          ['active-sessions', 'Active Sessions', 'terminal'],
          ['saved-connections', 'Saved Connections', 'bookmark'],
          ['command-history', 'Command History', 'history'],
          ['ssh-keys', 'SSH Keys', 'vpn_key'],
          ['audit', 'Audit', 'history'],
          ['quick-commands', 'Quick Commands', 'bolt'],
        ]),
      },
    ],
  },
  {
    id: 'observability',
    label: 'Observability',
    icon: 'monitoring',
    tone: 'green',
    branches: [
      {
        id: 'billing',
        label: 'Billing',
        icon: 'payments',
        tone: 'green',
        badgeKey: 'billing',
        defaultRoute: '/billing/overview',
        children: infraLeaves('billing', [
          ['overview', 'Overview', 'dashboard'],
          ['aws-costs', 'AWS Costs', 'cloud'],
          ['gcp-costs', 'GCP Costs', 'cloud'],
          ['azure-costs', 'Azure Costs', 'cloud'],
          ['vps-costs', 'VPS Costs', 'dns'],
          ['by-account', 'By Account', 'account_tree'],
          ['by-instance', 'By Instance', 'layers'],
          ['forecast', 'Forecast', 'trending_up'],
          ['cost-alerts', 'Cost Alerts', 'warning'],
          ['export-reports', 'Export Reports', 'download'],
        ]),
      },
      {
        id: 'metrics',
        label: 'Metrics',
        icon: 'monitoring',
        tone: 'cyan',
        defaultRoute: '/metrics/infrastructure',
        children: infraLeaves('metrics', [
          ['infrastructure', 'Infrastructure Metrics', 'stacked_line_chart'],
          ['cpu', 'CPU', 'speed'],
          ['ram', 'RAM', 'memory'],
          ['disk', 'Disk', 'storage'],
          ['network', 'Network', 'lan'],
          ['docker', 'Docker Metrics', 'widgets'],
          ['kubernetes', 'Kubernetes Metrics', 'hive'],
          ['custom-dashboards', 'Custom Dashboards', 'dashboard_customize'],
        ]),
      },
      {
        id: 'alerts',
        label: 'Alerts',
        icon: 'warning_amber',
        tone: 'orange',
        badgeKey: 'alerts',
        defaultRoute: '/alerts/active',
        children: infraLeaves('alerts', [
          ['active', 'Active Alerts', 'notifications_active'],
          ['critical', 'Critical', 'error'],
          ['warning', 'Warning', 'warning'],
          ['info', 'Info', 'info'],
          ['rules', 'Rules', 'rule'],
          ['silenced', 'Silenced', 'notifications_off'],
          ['history', 'History', 'history'],
          ['escalations', 'Escalations', 'trending_up'],
        ]),
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: 'notifications',
        tone: 'pink',
        defaultRoute: '/notifications/all',
        children: infraLeaves('notifications', [
          ['all', 'All', 'inbox'],
          ['unread', 'Unread', 'mark_email_unread'],
          ['critical', 'Critical', 'error'],
          ['warning', 'Warning', 'warning'],
          ['info', 'Info', 'info'],
          ['channels', 'Channels', 'forum'],
          ['webhooks', 'Webhooks', 'webhook'],
          ['email-settings', 'Email Settings', 'mail'],
        ]),
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: 'admin_panel_settings',
    tone: 'slate',
    branches: [
      {
        id: 'audit',
        label: 'Audit',
        icon: 'history',
        tone: 'slate',
        defaultRoute: '/audit/activity-logs',
        children: infraLeaves('audit', [
          ['activity-logs', 'Activity Logs', 'list_alt'],
          ['user-actions', 'User Actions', 'person'],
          ['cloud-actions', 'Cloud Actions', 'cloud'],
          ['ssh-commands', 'SSH Commands', 'terminal'],
          ['terraform-runs', 'Terraform Runs', 'account_tree'],
          ['jenkins-runs', 'Jenkins Runs', 'build'],
          ['security-events', 'Security Events', 'security'],
          ['export', 'Export', 'download'],
        ]),
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: 'settings',
        tone: 'violet',
        defaultRoute: '/settings/general',
        children: infraLeaves('settings', [
          ['general', 'General', 'tune'],
          ['users', 'Users', 'group'],
          ['roles', 'Roles', 'badge'],
          ['permissions', 'Permissions', 'lock'],
          ['secrets', 'Secrets', 'key'],
          ['integrations', 'Integrations', 'extension'],
          ['demo-mode', 'Demo Mode', 'science'],
          ['theme', 'Theme', 'palette'],
          ['sync-settings', 'Sync Settings', 'sync'],
          ['api-tokens', 'API Tokens', 'token'],
        ]),
      },
    ],
  },
]

function sectionIcon(key: string): string {
  const map: Record<string, string> = {
    overview: 'dashboard',
    accounts: 'account_balance',
    instances: 'dns',
    regions: 'public',
    network: 'hub',
    firewall: 'shield',
    volumes: 'storage',
    snapshots: 'photo_camera',
    'load-balancers': 'balance',
    billing: 'payments',
    metrics: 'monitoring',
    terraform: 'account_tree',
    audit: 'history',
  }
  return map[key] ?? 'chevron_right'
}

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
      for (const leaf of b.children) {
        out.push({
          label: `${b.label} › ${leaf.label}`,
          route: leaf.route,
          group: g.label,
          branch: b.label,
          icon: leaf.icon,
        })
      }
    }
  }
  return out
}

export const DEFAULT_FAVORITES = [
  '/dashboard',
  '/cloud/aws/overview',
  '/instances/all-instances',
  '/terraform/workspaces',
  '/alerts/active',
]
