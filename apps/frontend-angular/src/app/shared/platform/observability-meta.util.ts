import type { NavLogoKey } from '../theme/nav-logo.types'
import type { PlatformActionReport } from './platform-action-reports.util'

export type ObservabilityModuleMeta = {
  label: string
  primaryLogo: NavLogoKey
  integrations: NavLogoKey[]
  stackLabel: string
}

const OBS_MODULES: Record<string, ObservabilityModuleMeta> = {
  metrics: {
    label: 'Métricas',
    primaryLogo: 'prometheus',
    integrations: ['prometheus', 'grafana', 'kubernetes', 'docker'],
    stackLabel: 'Prometheus · Grafana · CloudWatch',
  },
  logs: {
    label: 'Logs',
    primaryLogo: 'grafana',
    integrations: ['grafana', 'kubernetes', 'docker', 'jenkins'],
    stackLabel: 'Loki · Elasticsearch · Cloud Logging',
  },
  billing: {
    label: 'Facturación',
    primaryLogo: 'aws',
    integrations: ['aws', 'gcp', 'azure'],
    stackLabel: 'AWS Cost Explorer · GCP Billing · Azure Cost',
  },
  'cost-optimizer': {
    label: 'Optimizador de costes',
    primaryLogo: 'aws',
    integrations: ['aws', 'gcp', 'azure'],
    stackLabel: 'FinOps · Rightsizing · Reserved Instances',
  },
  alerts: {
    label: 'Alertas',
    primaryLogo: 'prometheus',
    integrations: ['prometheus', 'grafana', 'kubernetes'],
    stackLabel: 'Alertmanager · PagerDuty · Slack',
  },
  incidents: {
    label: 'Incidentes',
    primaryLogo: 'grafana',
    integrations: ['grafana', 'prometheus', 'kubernetes'],
    stackLabel: 'Status page · War room · Runbooks',
  },
  notifications: {
    label: 'Notificaciones',
    primaryLogo: 'grafana',
    integrations: ['grafana', 'prometheus'],
    stackLabel: 'Email · Slack · Webhook · In-app',
  },
  reports: {
    label: 'Informes',
    primaryLogo: 'grafana',
    integrations: ['aws', 'gcp', 'azure', 'grafana'],
    stackLabel: 'PDF · CSV · Programación automática',
  },
  'change-management': {
    label: 'Gestión de cambios',
    primaryLogo: 'terraform',
    integrations: ['terraform', 'jenkins', 'kubernetes', 'github'],
    stackLabel: 'Changelog · Auditoría · Aprobaciones',
  },
}

export const observabilityModuleMeta = (moduleId: string): ObservabilityModuleMeta =>
  OBS_MODULES[moduleId] ?? {
    label: 'Observabilidad',
    primaryLogo: 'grafana',
    integrations: ['prometheus', 'grafana'],
    stackLabel: 'Stack observabilidad cloud',
  }

export const applyObservabilityMeta = (report: PlatformActionReport): PlatformActionReport => {
  if (report.area !== 'observability') return report
  const meta = observabilityModuleMeta(report.moduleId)
  report.primaryLogo = meta.primaryLogo
  report.integrationLogos = meta.integrations
  report.stackLabel = meta.stackLabel
  if (!report.summary && report.sections.length) {
    report.summary = `${meta.label} · ${meta.stackLabel}`
  }
  return report
}
