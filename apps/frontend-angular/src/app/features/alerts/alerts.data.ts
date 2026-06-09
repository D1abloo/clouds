import { chartColor } from '../../shared/theme/chart-palette'

const ts = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString()

export interface AlertHistoryRow {
  id: string
  severity: string
  title: string
  resource: string
  status: string
  resolvedAt: string
  duration: string
}

export interface AlertRuleRow {
  id: string
  name: string
  metric: string
  threshold: string
  severity: string
  status: string
  channels: string
}

export interface SilencedAlertRow {
  id: string
  title: string
  silencedBy: string
  until: string
  reason: string
}

export interface NotificationRouteRow {
  id: string
  channel: string
  destination: string
  severities: string
  status: string
}

export const ALERTS_HISTORY: AlertHistoryRow[] = [
  { id: 'ALT-901', severity: 'critical', title: 'CPU > 90% en web-prod-01', resource: 'web-prod-01', status: 'success', resolvedAt: ts(1440), duration: '2h 14m' },
  { id: 'ALT-898', severity: 'warning', title: 'Disco > 85% vps-bastion', resource: 'vps-bastion-01', status: 'success', resolvedAt: ts(2880), duration: '45m' },
  { id: 'ALT-895', severity: 'info', title: 'Certificado SSL expira en 14 días', resource: 'checkout-api', status: 'success', resolvedAt: ts(4320), duration: '—' },
]

export const ALERTS_RULES: AlertRuleRow[] = [
  { id: 'RULE-01', name: 'CPU alto producción', metric: 'cpu.utilization', threshold: '> 90% · 5 min', severity: 'critical', status: 'running', channels: 'Slack, PagerDuty' },
  { id: 'RULE-02', name: 'Pico de coste', metric: 'billing.daily_delta', threshold: '> 20% vs media', severity: 'warning', status: 'running', channels: 'Email, Slack' },
  { id: 'RULE-03', name: 'Disco casi lleno', metric: 'disk.used_percent', threshold: '> 85%', severity: 'warning', status: 'running', channels: 'In-app' },
  { id: 'RULE-04', name: 'Fallos SSH', metric: 'ssh.auth.failures', threshold: '> 5 en 10 min', severity: 'critical', status: 'running', channels: 'PagerDuty' },
]

export const ALERTS_SILENCED: SilencedAlertRow[] = [
  { id: 'ALT-880', title: 'Backup agent unreachable', silencedBy: 'ops@cloudops', until: ts(-60), reason: 'Mantenimiento programado' },
]

export const ALERTS_NOTIFICATIONS: NotificationRouteRow[] = [
  { id: 'ROUTE-01', channel: 'In-app', destination: 'Todos los usuarios', severities: 'critical, warning, info', status: 'running' },
  { id: 'ROUTE-02', channel: 'Email', destination: 'ops@cloudops.local', severities: 'critical, warning', status: 'running' },
  { id: 'ROUTE-03', channel: 'Slack', destination: '#cloudops-alerts', severities: 'critical, warning', status: 'running' },
  { id: 'ROUTE-04', channel: 'Teams (demo)', destination: 'Ops Channel', severities: 'critical', status: 'warning' },
]

export const severityChart = () => [
  { label: 'Crítica', value: 3, color: chartColor(1) },
  { label: 'Advertencia', value: 8, color: chartColor(3) },
  { label: 'Info', value: 5, color: chartColor(4) },
]
