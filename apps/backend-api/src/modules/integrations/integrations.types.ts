export type IntegrationId = 'slack' | 'pagerduty' | 'jira' | 'servicenow' | 'teams' | 'github'

export type IntegrationDispatchPayload = {
  eventType: string
  title: string
  body: string
  severity?: 'info' | 'warning' | 'critical'
  source?: string
  metadata?: Record<string, unknown>
}

export type IntegrationSendResult = {
  status: 'sent' | 'simulated' | 'failed'
  httpStatus?: number
  latencyMs?: number
  error?: string
  responsePreview?: string
}

export const DEFAULT_INTEGRATIONS: Array<{
  id: IntegrationId
  label: string
  category: string
  events: string[]
  config: Record<string, string>
}> = [
  {
    id: 'slack',
    label: 'Slack',
    category: 'Comunicación',
    events: [
      'alert.critical',
      'alert.warning',
      'deploy.success',
      'deploy.failed',
      'workflow.run',
      'backup.completed',
      'ops.completed',
      'integration.enabled',
    ],
    config: { channel: '#cloudops-alerts', workspace: 'cloudops-workspace' },
  },
  {
    id: 'pagerduty',
    label: 'PagerDuty',
    category: 'Monitorización',
    events: ['alert.critical', 'alert.warning', 'deploy.failed', 'incident.trigger', 'ops.completed'],
    config: { escalation: 'Platform P1/P2 — 24/7' },
  },
  {
    id: 'jira',
    label: 'Jira',
    category: 'ITSM',
    events: ['deploy.success', 'deploy.failed', 'change.create', 'backup.completed', 'integration.enabled'],
    config: { project: 'CLOUD', instance: 'cloudops.atlassian.net' },
  },
  {
    id: 'servicenow',
    label: 'ServiceNow',
    category: 'ITSM',
    events: ['change.mgmt'],
    config: { instance: 'cloudops.service-now.com' },
  },
  {
    id: 'teams',
    label: 'Microsoft Teams',
    category: 'Comunicación',
    events: ['alert.critical', 'alert.all'],
    config: { channel: 'Alertas CloudOps' },
  },
  {
    id: 'github',
    label: 'GitHub',
    category: 'DevOps',
    events: ['workflow.run', 'deploy.status'],
    config: { org: 'cloudops', repo: 'platform' },
  },
]

export const CORE_INTEGRATION_IDS: IntegrationId[] = ['slack', 'pagerduty', 'jira']
