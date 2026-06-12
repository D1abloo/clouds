/** Visual identity per route/module — icons, logos & category tones (presentation only). */
import type { NavLogoKey } from './nav-logo.types'

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
  | 'gitlab'

export interface NavVisualMeta {
  icon?: string
  logo?: NavLogoKey
  tone: NavVisualTone
  label?: string
}

const entries: { match: (p: string) => boolean; meta: NavVisualMeta }[] = [
  { match: (p) => p === '/dashboard', meta: { icon: 'space_dashboard', tone: 'violet', label: 'Tablero' } },
  { match: (p) => p.startsWith('/command-center'), meta: { icon: 'terminal', tone: 'amber', label: 'Centro de mando' } },
  { match: (p) => p.startsWith('/resource-explorer'), meta: { icon: 'manage_search', tone: 'violet', label: 'Explorador de recursos' } },
  { match: (p) => p.startsWith('/topology-map'), meta: { icon: 'lan', tone: 'violet', label: 'Mapa de topología' } },
  { match: (p) => p.startsWith('/health-center'), meta: { icon: 'monitor_heart', tone: 'green', label: 'Centro de salud' } },
  { match: (p) => p.startsWith('/cloud/aws'), meta: { logo: 'aws', tone: 'aws', label: 'AWS' } },
  { match: (p) => p.startsWith('/cloud/gcp'), meta: { logo: 'gcp', tone: 'gcp', label: 'GCP' } },
  { match: (p) => p.startsWith('/cloud/azure'), meta: { logo: 'azure', tone: 'azure', label: 'Azure' } },
  { match: (p) => p.startsWith('/vps/digitalocean'), meta: { logo: 'digitalocean', tone: 'blue', label: 'DigitalOcean' } },
  { match: (p) => p.startsWith('/vps/hetzner'), meta: { logo: 'hetzner', tone: 'blue', label: 'Hetzner' } },
  { match: (p) => p.startsWith('/vps/linode'), meta: { logo: 'linode', tone: 'blue', label: 'Linode' } },
  { match: (p) => p.startsWith('/vps/ovh'), meta: { logo: 'ovh', tone: 'blue', label: 'OVH' } },
  { match: (p) => p.startsWith('/vps'), meta: { icon: 'dns', tone: 'blue', label: 'VPS' } },
  { match: (p) => p.startsWith('/instances'), meta: { icon: 'layers', tone: 'blue', label: 'Instancias' } },
  { match: (p) => p.startsWith('/docker'), meta: { logo: 'docker', tone: 'docker', label: 'Docker' } },
  { match: (p) => p.startsWith('/kubernetes'), meta: { logo: 'kubernetes', tone: 'k8s', label: 'Kubernetes' } },
  { match: (p) => p.startsWith('/network'), meta: { icon: 'device_hub', tone: 'blue', label: 'Red' } },
  { match: (p) => p.startsWith('/storage'), meta: { icon: 'database', tone: 'blue', label: 'Almacenamiento' } },
  { match: (p) => p.startsWith('/backups'), meta: { icon: 'archive', tone: 'blue', label: 'Copias de seguridad' } },
  { match: (p) => p.startsWith('/capacity-planner'), meta: { icon: 'trending_up', tone: 'blue', label: 'Planificador de capacidad' } },
  { match: (p) => p.startsWith('/repositories/github'), meta: { logo: 'github', tone: 'violet', label: 'GitHub' } },
  { match: (p) => p.startsWith('/repositories/gitlab'), meta: { logo: 'gitlab', tone: 'gitlab', label: 'GitLab' } },
  { match: (p) => p.startsWith('/repositories/webhooks'), meta: { icon: 'webhook', tone: 'violet', label: 'Webhooks' } },
  { match: (p) => p.startsWith('/repositories/branches'), meta: { icon: 'account_tree', tone: 'violet', label: 'Ramas' } },
  { match: (p) => p.startsWith('/repositories/commits'), meta: { icon: 'history_edu', tone: 'violet', label: 'Commits' } },
  { match: (p) => p.startsWith('/repositories/pull-requests'), meta: { icon: 'merge', tone: 'violet', label: 'Pull Requests' } },
  { match: (p) => p.startsWith('/repositories/deployments'), meta: { icon: 'rocket_launch', tone: 'violet', label: 'Despliegues' } },
  { match: (p) => p.startsWith('/repositories'), meta: { icon: 'folder_special', tone: 'violet', label: 'Repositorios' } },
  { match: (p) => p.startsWith('/jenkins'), meta: { logo: 'jenkins', tone: 'jenkins', label: 'Jenkins' } },
  { match: (p) => p.startsWith('/automation/ai-infra-studio') || p.startsWith('/infra/ai-studio'), meta: { icon: 'auto_awesome', tone: 'violet', label: 'AI Infra Studio' } },
  { match: (p) => p.startsWith('/finops'), meta: { icon: 'savings', tone: 'green', label: 'FinOps' } },
  { match: (p) => p.startsWith('/deployments'), meta: { icon: 'rocket_launch', tone: 'amber', label: 'Despliegues' } },
  { match: (p) => p.startsWith('/terminal'), meta: { icon: 'terminal', tone: 'slate', label: 'Terminal' } },
  { match: (p) => p.startsWith('/runbooks'), meta: { icon: 'auto_stories', tone: 'amber', label: 'Runbooks' } },
  { match: (p) => p.startsWith('/scheduler'), meta: { icon: 'event_repeat', tone: 'amber', label: 'Programador' } },
  { match: (p) => p.startsWith('/service-catalog'), meta: { icon: 'apps', tone: 'amber', label: 'Catálogo de servicios' } },
  { match: (p) => p.startsWith('/approvals'), meta: { icon: 'task_alt', tone: 'amber', label: 'Aprobaciones' } },
  { match: (p) => p.startsWith('/metrics'), meta: { icon: 'show_chart', tone: 'green', label: 'Métricas' } },
  { match: (p) => p.startsWith('/logs'), meta: { icon: 'receipt_long', tone: 'green', label: 'Logs' } },
  { match: (p) => p.startsWith('/billing'), meta: { icon: 'account_balance_wallet', tone: 'green', label: 'Facturación' } },
  { match: (p) => p.startsWith('/cost-optimizer'), meta: { icon: 'trending_down', tone: 'green', label: 'Optimizador de costes' } },
  { match: (p) => p.startsWith('/alerts'), meta: { icon: 'warning_amber', tone: 'amber', label: 'Alertas' } },
  { match: (p) => p.startsWith('/incidents'), meta: { icon: 'local_fire_department', tone: 'amber', label: 'Incidentes' } },
  { match: (p) => p.startsWith('/notifications'), meta: { icon: 'notifications', tone: 'cyan', label: 'Notificaciones' } },
  { match: (p) => p.startsWith('/reports'), meta: { icon: 'summarize', tone: 'green', label: 'Informes' } },
  { match: (p) => p.startsWith('/change-management'), meta: { icon: 'published_with_changes', tone: 'green', label: 'Gestión de cambios' } },
  { match: (p) => p.startsWith('/security-center'), meta: { icon: 'shield', tone: 'pink', label: 'Centro de seguridad' } },
  { match: (p) => p.startsWith('/secrets-manager'), meta: { icon: 'vpn_key', tone: 'pink', label: 'Gestor de secretos' } },
  { match: (p) => p.startsWith('/compliance'), meta: { icon: 'fact_check', tone: 'pink', label: 'Cumplimiento' } },
  { match: (p) => p.startsWith('/access-control'), meta: { icon: 'lock_person', tone: 'pink', label: 'Control de acceso' } },
  { match: (p) => p.startsWith('/audit'), meta: { icon: 'manage_search', tone: 'slate', label: 'Auditoría' } },
  { match: (p) => p.startsWith('/admin/users'), meta: { icon: 'groups', tone: 'violet', label: 'Usuarios' } },
  { match: (p) => p.startsWith('/admin/roles'), meta: { icon: 'manage_accounts', tone: 'violet', label: 'Roles' } },
  { match: (p) => p.startsWith('/admin/api-tokens'), meta: { icon: 'vpn_key', tone: 'violet', label: 'Tokens API' } },
  { match: (p) => p.startsWith('/admin/webhooks'), meta: { icon: 'webhook', tone: 'violet', label: 'Webhooks' } },
  { match: (p) => p.startsWith('/settings'), meta: { icon: 'settings', tone: 'slate', label: 'Configuración' } },
  { match: (p) => p.startsWith('/ai-assistant'), meta: { icon: 'auto_awesome', tone: 'violet', label: 'Asistente IA' } },
]

export const resolvePageVisual = (path: string): NavVisualMeta => {
  const clean = path.split('?')[0]
  const hit = entries.find((e) => e.match(clean))
  return hit?.meta ?? { icon: 'widgets', tone: 'violet' }
}
