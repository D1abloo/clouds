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
    label: 'Observabilidad',
    items: [
      { label: 'Métricas', route: '/metrics/overview', icon: 'show_chart', tone: 'green' },
      { label: 'Logs', route: '/logs', icon: 'receipt_long', tone: 'cyan' },
      { label: 'Facturación', route: '/billing/overview', icon: 'payments', tone: 'green' },
      { label: 'Optimizador costes', route: '/cost-optimizer', icon: 'trending_down', tone: 'green' },
      { label: 'Alertas', route: '/alerts/active', icon: 'warning_amber', tone: 'orange' },
      { label: 'Incidentes', route: '/incidents', icon: 'local_fire_department', tone: 'orange' },
      { label: 'Notificaciones', route: '/notifications/all', icon: 'notifications', tone: 'pink' },
      { label: 'Informes', route: '/reports', icon: 'summarize', tone: 'slate' },
      { label: 'Gestión cambios', route: '/change-management', icon: 'published_with_changes', tone: 'indigo' },
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
