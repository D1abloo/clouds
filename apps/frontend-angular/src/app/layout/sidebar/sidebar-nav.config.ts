export type NavIconTone =
  | 'violet'
  | 'blue'
  | 'green'
  | 'orange'
  | 'cyan'
  | 'pink'
  | 'amber'
  | 'indigo'
  | 'slate'

export interface SidebarNavItem {
  label: string
  route: string
  icon: string
  tone?: NavIconTone
  brand?: 'aws' | 'gcp' | 'azure'
}

export interface SidebarNavSection {
  id: string
  label: string
  items: SidebarNavItem[]
}

export const SIDEBAR_NAV: SidebarNavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ label: 'Dashboard', route: '/dashboard', icon: 'space_dashboard', tone: 'violet' }],
  },
  {
    id: 'clouds',
    label: 'Clouds',
    items: [
      { label: 'AWS', route: '/accounts/aws', icon: 'cloud', brand: 'aws' },
      { label: 'GCP', route: '/accounts/gcp', icon: 'cloud', brand: 'gcp' },
      { label: 'Azure', route: '/accounts/azure', icon: 'cloud', brand: 'azure' },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    items: [
      { label: 'VPS / Bare Metal', route: '/vps', icon: 'dns', tone: 'orange' },
      { label: 'Instances', route: '/instances', icon: 'layers', tone: 'blue' },
      { label: 'Docker', route: '/docker', icon: 'widgets', tone: 'cyan' },
      { label: 'Kubernetes', route: '/kubernetes', icon: 'hive', tone: 'indigo' },
    ],
  },
  {
    id: 'automation',
    label: 'Automation',
    items: [
      { label: 'Jenkins', route: '/jenkins', icon: 'precision_manufacturing', tone: 'amber' },
      { label: 'Terraform', route: '/terraform', icon: 'account_tree', tone: 'violet' },
      { label: 'Terminal', route: '/terminal', icon: 'terminal', tone: 'slate' },
    ],
  },
  {
    id: 'observability',
    label: 'Observability',
    items: [
      { label: 'Billing', route: '/billing', icon: 'payments', tone: 'green' },
      { label: 'Alerts', route: '/alerts', icon: 'warning_amber', tone: 'orange' },
      { label: 'Notifications', route: '/notifications', icon: 'notifications', tone: 'pink' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { label: 'Audit', route: '/audit', icon: 'history', tone: 'slate' },
      { label: 'Settings', route: '/settings', icon: 'settings', tone: 'violet' },
    ],
  },
]
