/** Visual identity per route/module — icons & category tones (presentation only). */
export type NavVisualTone =
  | 'violet'
  | 'cyan'
  | 'blue'
  | 'amber'
  | 'green'
  | 'pink'
  | 'slate'
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'docker'
  | 'k8s'
  | 'jenkins'
  | 'terraform'

export interface NavVisualMeta {
  icon: string
  tone: NavVisualTone
  label?: string
}

const entries: { match: (p: string) => boolean; meta: NavVisualMeta }[] = [
  { match: (p) => p === '/dashboard', meta: { icon: 'space_dashboard', tone: 'violet', label: 'Dashboard' } },
  { match: (p) => p.startsWith('/cloud/aws'), meta: { icon: 'cloud', tone: 'aws', label: 'AWS' } },
  { match: (p) => p.startsWith('/cloud/gcp'), meta: { icon: 'cloud_circle', tone: 'gcp', label: 'GCP' } },
  { match: (p) => p.startsWith('/cloud/azure'), meta: { icon: 'cloud_queue', tone: 'azure', label: 'Azure' } },
  { match: (p) => p.startsWith('/vps'), meta: { icon: 'computer', tone: 'blue', label: 'VPS' } },
  { match: (p) => p.startsWith('/instances'), meta: { icon: 'dynamic_feed', tone: 'blue', label: 'Instances' } },
  { match: (p) => p.startsWith('/docker'), meta: { icon: 'view_in_ar', tone: 'docker', label: 'Docker' } },
  { match: (p) => p.startsWith('/kubernetes'), meta: { icon: 'hub', tone: 'k8s', label: 'Kubernetes' } },
  { match: (p) => p.startsWith('/jenkins'), meta: { icon: 'precision_manufacturing', tone: 'jenkins', label: 'Jenkins' } },
  { match: (p) => p.startsWith('/terraform'), meta: { icon: 'account_tree', tone: 'terraform', label: 'Terraform' } },
  { match: (p) => p.startsWith('/terminal'), meta: { icon: 'terminal', tone: 'slate', label: 'Terminal' } },
  { match: (p) => p.startsWith('/metrics'), meta: { icon: 'monitoring', tone: 'green', label: 'Metrics' } },
  { match: (p) => p.startsWith('/logs'), meta: { icon: 'article', tone: 'green', label: 'Logs' } },
  { match: (p) => p.startsWith('/billing'), meta: { icon: 'payments', tone: 'green', label: 'Billing' } },
  { match: (p) => p.startsWith('/alerts'), meta: { icon: 'notifications_active', tone: 'amber', label: 'Alerts' } },
  { match: (p) => p.startsWith('/notifications'), meta: { icon: 'notifications', tone: 'cyan', label: 'Notifications' } },
  { match: (p) => p.startsWith('/reports'), meta: { icon: 'assessment', tone: 'green', label: 'Reports' } },
  { match: (p) => p.startsWith('/security-center'), meta: { icon: 'security', tone: 'pink', label: 'Security Center' } },
  { match: (p) => p.startsWith('/secrets-manager'), meta: { icon: 'key', tone: 'pink', label: 'Secrets Manager' } },
  { match: (p) => p.startsWith('/compliance'), meta: { icon: 'policy', tone: 'pink', label: 'Compliance' } },
  { match: (p) => p.startsWith('/access-control'), meta: { icon: 'admin_panel_settings', tone: 'pink', label: 'Access Control' } },
  { match: (p) => p.startsWith('/audit'), meta: { icon: 'history', tone: 'slate', label: 'Audit' } },
  { match: (p) => p.startsWith('/admin/users'), meta: { icon: 'group', tone: 'violet', label: 'Users' } },
  { match: (p) => p.startsWith('/admin/roles'), meta: { icon: 'badge', tone: 'violet', label: 'Roles' } },
  { match: (p) => p.startsWith('/admin/api-tokens'), meta: { icon: 'token', tone: 'violet', label: 'API Tokens' } },
  { match: (p) => p.startsWith('/admin/webhooks'), meta: { icon: 'webhook', tone: 'violet', label: 'Webhooks' } },
  { match: (p) => p.startsWith('/admin/demo-mode'), meta: { icon: 'science', tone: 'violet', label: 'Demo Mode' } },
  { match: (p) => p.startsWith('/settings'), meta: { icon: 'tune', tone: 'slate', label: 'Settings' } },
  { match: (p) => p.startsWith('/ai-assistant'), meta: { icon: 'smart_toy', tone: 'violet', label: 'AI Assistant' } },
  { match: (p) => p.startsWith('/command-center'), meta: { icon: 'bolt', tone: 'amber', label: 'Command Center' } },
  { match: (p) => p.startsWith('/health-center'), meta: { icon: 'favorite', tone: 'green', label: 'Health Center' } },
  { match: (p) => p.startsWith('/cost-optimizer'), meta: { icon: 'savings', tone: 'green', label: 'Cost Optimizer' } },
]

export const resolvePageVisual = (path: string): NavVisualMeta => {
  const clean = path.split('?')[0]
  const hit = entries.find((e) => e.match(clean))
  return hit?.meta ?? { icon: 'widgets', tone: 'violet' }
}
