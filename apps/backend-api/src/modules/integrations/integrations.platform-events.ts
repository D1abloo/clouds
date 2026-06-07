/** Event types consumed by integration subscriptions (Slack, PagerDuty, Jira, …). */
export const PLATFORM_EVENTS = {
  ALERT_CRITICAL: 'alert.critical',
  ALERT_WARNING: 'alert.warning',
  DEPLOY_SUCCESS: 'deploy.success',
  DEPLOY_FAILED: 'deploy.failed',
  WORKFLOW_RUN: 'workflow.run',
  CHANGE_CREATE: 'change.create',
  BACKUP_COMPLETED: 'backup.completed',
  OPS_COMPLETED: 'ops.completed',
  INTEGRATION_ENABLED: 'integration.enabled',
  INTEGRATION_TEST: 'integration.test',
} as const

export type PlatformEventType = (typeof PLATFORM_EVENTS)[keyof typeof PLATFORM_EVENTS]

export const PLATFORM_EVENT_SOURCES = [
  {
    id: 'alerts',
    label: 'Alertas',
    module: 'AlertsModule',
    events: [PLATFORM_EVENTS.ALERT_CRITICAL, PLATFORM_EVENTS.ALERT_WARNING],
  },
  {
    id: 'jenkins',
    label: 'Jenkins CI/CD',
    module: 'JenkinsModule',
    events: [PLATFORM_EVENTS.DEPLOY_SUCCESS, PLATFORM_EVENTS.DEPLOY_FAILED, PLATFORM_EVENTS.WORKFLOW_RUN],
  },
  {
    id: 'terraform',
    label: 'Terraform',
    module: 'TerraformModule',
    events: [PLATFORM_EVENTS.DEPLOY_SUCCESS, PLATFORM_EVENTS.DEPLOY_FAILED, PLATFORM_EVENTS.CHANGE_CREATE],
  },
  {
    id: 'github',
    label: 'GitHub Deployments',
    module: 'GithubModule',
    events: [PLATFORM_EVENTS.DEPLOY_SUCCESS, PLATFORM_EVENTS.DEPLOY_FAILED, PLATFORM_EVENTS.WORKFLOW_RUN],
  },
  {
    id: 'vps',
    label: 'VPS / Backups',
    module: 'VpsModule',
    events: [PLATFORM_EVENTS.BACKUP_COMPLETED, PLATFORM_EVENTS.OPS_COMPLETED],
  },
  {
    id: 'command-center',
    label: 'Command Center',
    module: 'CommandCenterModule',
    events: [PLATFORM_EVENTS.OPS_COMPLETED, PLATFORM_EVENTS.CHANGE_CREATE],
  },
  {
    id: 'settings',
    label: 'Integraciones',
    module: 'IntegrationsModule',
    events: [PLATFORM_EVENTS.INTEGRATION_ENABLED, PLATFORM_EVENTS.INTEGRATION_TEST],
  },
] as const
