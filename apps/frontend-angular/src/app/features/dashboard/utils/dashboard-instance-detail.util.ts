import type { DashboardInstanceRow } from '../dashboard.models'
import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'

export const instanceProviderLogo = (provider?: string): NavLogoKey | undefined => {
  const map: Record<string, NavLogoKey> = {
    AWS: 'aws',
    GCP: 'gcp',
    AZURE: 'azure',
  }
  return provider ? map[provider] : undefined
}

export interface InstanceContainerRow {
  name: string
  status: string
  ports?: string
  image?: string
}

export interface InstancePodRow {
  name: string
  status: string
  namespace: string
}

export interface InstanceAlertRow {
  title: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  since: string
}

export interface InstanceServiceRow {
  name: string
  status: string
  port?: string
}

export interface InstanceAuditRow {
  action: string
  when: string
  actor: string
}

const seed = (id: string): number =>
  id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)

export const instanceDockerContainers = (instance: DashboardInstanceRow): InstanceContainerRow[] => {
  if (!instance.hasDocker) return []
  const s = seed(instance.id)
  return [
    { name: 'nginx', status: 'running', ports: '80:80', image: 'nginx:1.25' },
    { name: 'api', status: 'running', ports: '3000:3000', image: 'cloudops/api:latest' },
    { name: 'redis', status: s % 3 === 0 ? 'stopped' : 'running', image: 'redis:7' },
    { name: 'worker', status: 'running', image: 'cloudops/worker:latest' },
  ].slice(0, s % 2 === 0 ? 4 : 3)
}

export const instanceK8sPods = (instance: DashboardInstanceRow): InstancePodRow[] => {
  if (!instance.hasKubernetes) return []
  const base = instance.name.replace(/[^a-z0-9-]/gi, '-').slice(0, 18)
  return [
    { name: `${base}-0`, status: 'Running', namespace: 'default' },
    { name: `${base}-1`, status: 'Running', namespace: 'default' },
    { name: 'coredns-xyz', status: 'Running', namespace: 'kube-system' },
  ]
}

export const instanceAlerts = (instance: DashboardInstanceRow): InstanceAlertRow[] => {
  if (!instance.alertCount) return []
  const rows: InstanceAlertRow[] = []
  if (instance.status === 'ERROR' || instance.alertCount >= 2) {
    rows.push({ title: 'CPU por encima del umbral', severity: 'CRITICAL', since: 'hace 12 min' })
  }
  if (instance.alertCount >= 1) {
    rows.push({ title: 'Uso de disco superior al 85%', severity: 'WARNING', since: 'hace 1 h' })
  }
  if (instance.status === 'WARNING') {
    rows.push({ title: 'Latencia elevada en health check', severity: 'WARNING', since: 'hace 25 min' })
  }
  return rows.slice(0, instance.alertCount)
}

export const instanceServices = (instance: DashboardInstanceRow): InstanceServiceRow[] => [
  { name: 'sshd', status: 'active', port: '22' },
  { name: instance.hasDocker ? 'docker' : 'cloud-init', status: 'active' },
  { name: instance.hasKubernetes ? 'kubelet' : 'nginx', status: 'active', port: instance.hasKubernetes ? '10250' : '80' },
  { name: 'node-exporter', status: 'active', port: '9100' },
]

export const instanceAuditLog = (instance: DashboardInstanceRow): InstanceAuditRow[] => [
  { action: 'instance.sync', when: 'Reciente', actor: 'cloudops-sync' },
  { action: 'metrics.collect', when: 'hace 2 h', actor: 'monitor-agent' },
  { action: instance.hasDocker ? 'docker.inspect' : 'ssh.probe', when: 'hace 6 h', actor: 'inventory' },
]

export const instanceEnvLabel = (env?: string): string => {
  if (!env) return '—'
  const map: Record<string, string> = {
    production: 'Producción',
    staging: 'Staging',
    development: 'Desarrollo',
  }
  return map[env.toLowerCase()] ?? env
}

export const instanceStatusLabel = (status?: string): string => {
  const map: Record<string, string> = {
    RUNNING: 'En ejecución',
    STOPPED: 'Detenida',
    WARNING: 'Advertencia',
    ERROR: 'Error',
  }
  return status ? (map[status] ?? status) : '—'
}
