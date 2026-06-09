const ts = (secAgo: number) => new Date(Date.now() - secAgo * 1000).toISOString()

export type SettingsTabId = 'general' | 'integrations' | 'notifications' | 'security' | 'theme' | 'account'

export type SettingsIntegration = {
  id: string
  label: string
  desc: string
  category: 'Comunicación' | 'ITSM' | 'Monitorización' | 'DevOps'
  icon: string
  enabled: boolean
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  lastSync: string
  events24h: number
  accent: string
}

export type IntegrationConfigField = {
  key: string
  label: string
  value: string
  secret?: boolean
  readonly?: boolean
}

export type IntegrationEventType = {
  id: string
  label: string
  desc: string
  enabled: boolean
}

export type IntegrationProfile = SettingsIntegration & {
  authType: string
  endpoint: string
  workspace: string
  connectedBy: string
  connectedAt: string
  errorRate: number
  avgLatencyMs: number
  deliveryRate: number
  syncHistory: number[]
  configFields: IntegrationConfigField[]
  eventTypes: IntegrationEventType[]
  docsUrl: string
}

export type SettingsNotificationChannel = {
  id: string
  label: string
  desc: string
  icon: string
  enabled: boolean
  volume24h: number
  deliveryRate: number
  destination?: string
}

export type SettingsSecurityPolicy = {
  id: string
  label: string
  desc: string
  icon: string
  enabled: boolean
  severity: 'critical' | 'high' | 'medium'
  impact: string
}

export const SETTINGS_TABS: { id: SettingsTabId; label: string; icon: string; desc: string }[] = [
  { id: 'general', label: 'General', icon: 'tune', desc: 'Organización, región y sincronización' },
  { id: 'integrations', label: 'Integraciones', icon: 'hub', desc: 'Slack, PagerDuty, Jira y más' },
  { id: 'notifications', label: 'Notificaciones', icon: 'notifications', desc: 'Canales, digest y preferencias' },
  { id: 'security', label: 'Seguridad', icon: 'shield', desc: 'MFA, sesiones y acceso' },
  { id: 'theme', label: 'Tema', icon: 'palette', desc: 'Apariencia y accesibilidad' },
  { id: 'account', label: 'Cuenta', icon: 'person', desc: 'Perfil, roles y sesión' },
]

export const SETTINGS_GENERAL = {
  apiVersion: 'v1.4.2',
  backendStatus: 'healthy' as const,
  lastSaved: ts(3600),
  syncIntervalMin: 15,
  timezone: 'Europe/Madrid',
  locale: 'es-ES',
  environment: 'production',
  region: 'eu-west-1',
}

export const SETTINGS_SYNC_HISTORY = []

/** Fuentes del panel que emiten al bus de integraciones en PRO (fallback demo). */
export const SETTINGS_PLATFORM_SOURCES: { id: string; label: string; status: string; events?: string[] }[] = []

export const SETTINGS_INTEGRATIONS: SettingsIntegration[] = []

export const SETTINGS_SECURITY_POLICIES: SettingsSecurityPolicy[] = []

export const SETTINGS_NOTIFICATION_CHANNELS: SettingsNotificationChannel[] = [
  {
    id: 'inapp',
    label: 'In-app',
    desc: 'Centro de notificaciones dentro de CloudOps',
    icon: 'notifications_active',
    enabled: true,
    volume24h: 124,
    deliveryRate: 100,
  },
  {
    id: 'email',
    label: 'Email',
    desc: 'Resúmenes diarios y alertas críticas por correo',
    icon: 'mail',
    enabled: true,
    volume24h: 48,
    deliveryRate: 98,
    destination: 'ops@cloudops.io',
  },
  {
    id: 'slack',
    label: 'Slack',
    desc: 'Canal #cloudops-alerts en workspace principal',
    icon: 'chat',
    enabled: true,
    volume24h: 342,
    deliveryRate: 99,
    destination: '#cloudops-alerts',
  },
  {
    id: 'digest',
    label: 'Digest semanal',
    desc: 'Informe de costes, salud y cambios cada lunes 09:00',
    icon: 'summarize',
    enabled: false,
    volume24h: 0,
    deliveryRate: 0,
    destination: 'Lunes 09:00 CET',
  },
]

export const SETTINGS_NOTIF_HISTORY = []

export const SETTINGS_SECURITY_SCORE = 82

export const SETTINGS_THEME_OPTIONS = [
  { id: 'light', label: 'Claro', icon: 'light_mode', desc: 'Fondo claro, ideal para entornos luminosos' },
  { id: 'dark', label: 'Oscuro', icon: 'dark_mode', desc: 'Reduce fatiga visual en turnos nocturnos' },
  { id: 'system', label: 'Sistema', icon: 'settings_brightness', desc: 'Sigue la preferencia del SO' },
] as const

export const SETTINGS_ACCOUNT_META = {
  lastLogin: ts(7200),
  sessionsActive: 2,
  mfaEnabled: true,
  mfaMethod: 'TOTP (Google Authenticator)',
  department: 'Platform Engineering',
  memberSince: ts(86400 * 180),
  apiTokens: 3,
  loginCount30d: 42,
}

export const sparkPath = (values: number[], w = 140, h = 36): string => {
  if (!values.length) return ''
  const max = Math.max(...values, 1)
  const step = w / (values.length - 1 || 1)
  const pts = values.map((v, i) => {
    const x = i * step
    const y = h - (v / max) * (h - 4) - 2
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  })
  return pts.join(' ')
}

export const integrationStatusLabel = (status: SettingsIntegration['status']): string => {
  switch (status) {
    case 'connected': return 'Conectado'
    case 'disconnected': return 'Desconectado'
    case 'error': return 'Error'
    case 'pending': return 'Pendiente'
  }
}

const intSeed = (id: string): number => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

const INTEGRATION_EVENT_CATALOG: Record<string, IntegrationEventType[]> = {
  slack: [
    { id: 'alert.critical', label: 'Alertas críticas', desc: 'P1/P2 — caídas de servicio', enabled: true },
    { id: 'alert.warning', label: 'Alertas warning', desc: 'Degradación y umbrales', enabled: true },
    { id: 'deploy.success', label: 'Despliegues exitosos', desc: 'Jenkins, Terraform, GitHub', enabled: true },
    { id: 'deploy.failed', label: 'Despliegues fallidos', desc: 'Pipeline o deploy en error', enabled: true },
    { id: 'workflow.run', label: 'Workflow runs', desc: 'GitHub Actions / Jenkins', enabled: true },
    { id: 'backup.completed', label: 'Backups VPS', desc: 'Snapshots de flota completados', enabled: true },
    { id: 'ops.completed', label: 'Ops Command Center', desc: 'Reinicios, escalado, sync', enabled: true },
    { id: 'integration.enabled', label: 'Integración activada', desc: 'Al conectar un canal', enabled: true },
  ],
  pagerduty: [
    { id: 'alert.critical', label: 'Alertas críticas', desc: 'P1/P2 — caídas de servicio', enabled: true },
    { id: 'alert.warning', label: 'Alertas warning', desc: 'Degradación operativa', enabled: true },
    { id: 'deploy.failed', label: 'Despliegues fallidos', desc: 'Pipeline en error', enabled: true },
    { id: 'incident.trigger', label: 'Incidentes nuevos', desc: 'Creación automática P1/P2', enabled: true },
    { id: 'ops.completed', label: 'Ops críticas', desc: 'Acciones Command Center', enabled: false },
  ],
  jira: [
    { id: 'change.create', label: 'Tickets de cambio', desc: 'Terraform plan, sync inventario', enabled: true },
    { id: 'deploy.success', label: 'Despliegues OK', desc: 'CHG post-deploy', enabled: true },
    { id: 'deploy.failed', label: 'Despliegues fallidos', desc: 'Incidente vinculado', enabled: true },
    { id: 'backup.completed', label: 'Backups', desc: 'Registro CHG backup VPS', enabled: true },
    { id: 'integration.enabled', label: 'Integración activada', desc: 'Auditoría ITSM', enabled: false },
  ],
  servicenow: [
    { id: 'cmdb.sync', label: 'Sync CMDB', desc: 'Instancias y recursos', enabled: false },
    { id: 'change.mgmt', label: 'Change management', desc: 'Flujos de aprobación', enabled: false },
  ],
  teams: [
    { id: 'alert.all', label: 'Todas las alertas', desc: 'Canal operaciones', enabled: true },
    { id: 'report.weekly', label: 'Informe semanal', desc: 'Resumen cada lunes', enabled: true },
  ],
  github: [
    { id: 'workflow.run', label: 'Workflow runs', desc: 'GitHub Actions completados', enabled: true },
    { id: 'deploy.status', label: 'Deploy status', desc: 'Entornos staging/prod', enabled: true },
    { id: 'pr.merged', label: 'PRs mergeados', desc: 'Ramas main/develop', enabled: false },
  ],
}

const INTEGRATION_CONFIG: Record<string, { endpoint: string; workspace: string; authType: string; fields: IntegrationConfigField[] }> = {
  slack: {
    endpoint: 'https://hooks.slack.com/services/T***/B***/***',
    workspace: 'cloudops-workspace',
    authType: 'Webhook + Bot OAuth',
    fields: [
      { key: 'workspace', label: 'Workspace', value: 'cloudops-workspace', readonly: true },
      { key: 'channel', label: 'Canal destino', value: '#cloudops-alerts' },
      { key: 'bot_token', label: 'Bot token', value: 'xoxb-••••••••••••4f2a', secret: true },
    ],
  },
  pagerduty: {
    endpoint: 'https://api.pagerduty.com/events',
    workspace: 'CloudOps Production',
    authType: 'Events API v2',
    fields: [
      { key: 'service_key', label: 'Routing key', value: 'pd_••••••••••••9b1c', secret: true },
      { key: 'escalation', label: 'Política escalado', value: 'Platform P1/P2 — 24/7' },
      { key: 'severity_map', label: 'Mapeo severidad', value: 'critical→P1, warning→P2' },
    ],
  },
  jira: {
    endpoint: 'https://cloudops.atlassian.net',
    workspace: 'CLOUD',
    authType: 'OAuth 2.0 (3LO)',
    fields: [
      { key: 'instance', label: 'Instancia Jira', value: 'cloudops.atlassian.net', readonly: true },
      { key: 'project', label: 'Proyecto', value: 'CLOUD' },
      { key: 'client_id', label: 'Client ID', value: 'jira_••••••••2d8e', secret: true },
    ],
  },
  servicenow: {
    endpoint: 'https://cloudops.service-now.com',
    workspace: 'Production',
    authType: 'Basic + API Key',
    fields: [
      { key: 'instance', label: 'Instancia', value: 'cloudops.service-now.com' },
      { key: 'table', label: 'Tabla CMDB', value: 'cmdb_ci_server' },
      { key: 'api_key', label: 'API Key', value: 'sn_••••••••••••7c3a', secret: true },
    ],
  },
  teams: {
    endpoint: 'https://outlook.office.com/webhook/***',
    workspace: 'CloudOps Ops Team',
    authType: 'Incoming Webhook',
    fields: [
      { key: 'team', label: 'Equipo', value: 'Platform Operations' },
      { key: 'channel', label: 'Canal', value: 'Alertas CloudOps' },
      { key: 'webhook', label: 'Webhook URL', value: 'https://outlook.office.com/webhook/••••', secret: true },
    ],
  },
  github: {
    endpoint: 'https://api.github.com/repos/cloudops/platform',
    workspace: 'cloudops/platform',
    authType: 'GitHub App',
    fields: [
      { key: 'org', label: 'Organización', value: 'cloudops', readonly: true },
      { key: 'repo', label: 'Repositorio', value: 'platform' },
      { key: 'app_id', label: 'App ID', value: 'gh_••••••••6f77', secret: true },
    ],
  },
}

export const mergeIntegrationFromApi = (
  api: { id: string; enabled: boolean; status: string; lastSync: string | null },
  demo: SettingsIntegration,
): SettingsIntegration => ({
  ...demo,
  enabled: api.enabled,
  status: api.status as SettingsIntegration['status'],
  lastSync: api.lastSync ?? demo.lastSync,
})

export const enrichIntegrationProfile = (integration: SettingsIntegration): IntegrationProfile => {
  const seed = intSeed(integration.id)
  const cfg = INTEGRATION_CONFIG[integration.id] ?? {
    endpoint: 'https://api.example.com/v1',
    workspace: integration.label,
    authType: 'API Key',
    fields: [{ key: 'api_key', label: 'API Key', value: '••••••••', secret: true }],
  }
  const syncHistory = Array.from({ length: 12 }, (_, i) => 5 + ((seed + i * 7) % 20))
  const events = INTEGRATION_EVENT_CATALOG[integration.id] ?? [
    { id: 'generic.event', label: 'Eventos genéricos', desc: 'Todos los eventos', enabled: true },
  ]

  return {
    ...integration,
    authType: cfg.authType,
    endpoint: cfg.endpoint,
    workspace: cfg.workspace,
    connectedBy: integration.status === 'connected' ? 'admin@cloudops.io' : '—',
    connectedAt: integration.status === 'connected' ? ts(86400 * (30 + seed % 60)) : '—',
    errorRate: integration.status === 'error' ? 12 : integration.status === 'pending' ? 3 : seed % 4,
    avgLatencyMs: 80 + (seed % 400),
    deliveryRate: integration.status === 'connected' ? 96 + (seed % 4) : integration.status === 'pending' ? 0 : 0,
    syncHistory,
    configFields: cfg.fields,
    eventTypes: events.map((e) => ({ ...e, enabled: integration.enabled ? e.enabled : false })),
    docsUrl: `https://docs.cloudops.io/integrations/${integration.id}`,
  }
}
