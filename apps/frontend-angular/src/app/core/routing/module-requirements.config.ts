export type ExternalProvider = 'aws' | 'gcp' | 'azure' | 'jenkins' | 'github' | 'gitlab'

export type ModuleRequirementKind = 'internal' | 'external' | 'data-dependent' | 'ai'

export interface ModuleRequirement {
  id: string
  requiresExternalConnection: boolean
  kind: ModuleRequirementKind
  emptyTitle?: string
  emptyMessage?: string
  provider?: ExternalProvider
  showOptionalCloudCta?: boolean
}

export interface ExternalConnectionCopy {
  title: string
  description: string
  actionLabel: string
  actionRoute: string
}

export const INTERNAL_EMPTY_TITLE = 'Sin datos todavía'
export const INTERNAL_EMPTY_MESSAGE = 'Cuando haya actividad, aparecerá aquí.'

export const EXTERNAL_CONNECTION_COPY: Record<ExternalProvider, ExternalConnectionCopy> = {
  aws: {
    title: 'Sin cuenta AWS',
    description: 'Conecta credenciales IAM para sincronizar recursos, instancias y costes.',
    actionLabel: 'Conectar AWS',
    actionRoute: '/cloud/aws/accounts',
  },
  gcp: {
    title: 'Sin proyecto GCP',
    description: 'Añade un proyecto con credenciales de servicio para empezar.',
    actionLabel: 'Conectar GCP',
    actionRoute: '/cloud/gcp/accounts',
  },
  azure: {
    title: 'Sin suscripción Azure',
    description: 'Configura una aplicación registrada para sincronizar recursos.',
    actionLabel: 'Conectar Azure',
    actionRoute: '/cloud/azure/accounts',
  },
  github: {
    title: 'Sin cuenta GitHub',
    description: 'Conecta tu organización o usuario para ver repositorios y despliegues.',
    actionLabel: 'Conectar GitHub',
    actionRoute: '/repositories/github',
  },
  gitlab: {
    title: 'Sin cuenta GitLab',
    description: 'Añade un token de acceso para sincronizar proyectos y pipelines.',
    actionLabel: 'Conectar GitLab',
    actionRoute: '/repositories/gitlab',
  },
  jenkins: {
    title: 'Sin controlador Jenkins',
    description: 'Registra la URL y credenciales del servidor CI/CD.',
    actionLabel: 'Configurar Jenkins',
    actionRoute: '/jenkins/jobs',
  },
}

export const AI_UNAVAILABLE_COPY: ExternalConnectionCopy = {
  title: 'Asistente no disponible',
  description: 'Configura una clave de API de IA en Configuración para habilitar el Copilot.',
  actionLabel: 'Configurar IA',
  actionRoute: '/settings/general',
}

export const OPTIONAL_CLOUD_CTA: ExternalConnectionCopy = {
  title: 'Conecta una nube',
  description: 'Añade AWS, GCP o Azure para poblar este módulo con datos en vivo.',
  actionLabel: 'Ir a Nubes',
  actionRoute: '/cloud/aws/accounts',
}

/** Claves alineadas con rutas y tabs del sidebar (area-nav.config). */
export const MODULE_REQUIREMENTS: Record<string, ModuleRequirement> = {
  dashboard: { id: 'dashboard', requiresExternalConnection: false, kind: 'internal' },
  'command-center': { id: 'command-center', requiresExternalConnection: false, kind: 'internal' },
  'resource-explorer': {
    id: 'resource-explorer',
    requiresExternalConnection: false,
    kind: 'data-dependent',
    showOptionalCloudCta: true,
  },
  'topology-map': {
    id: 'topology-map',
    requiresExternalConnection: false,
    kind: 'data-dependent',
    showOptionalCloudCta: true,
  },
  'health-center': { id: 'health-center', requiresExternalConnection: false, kind: 'internal' },
  aws: { id: 'aws', requiresExternalConnection: true, kind: 'external', provider: 'aws' },
  gcp: { id: 'gcp', requiresExternalConnection: true, kind: 'external', provider: 'gcp' },
  azure: { id: 'azure', requiresExternalConnection: true, kind: 'external', provider: 'azure' },
  instances: {
    id: 'instances',
    requiresExternalConnection: false,
    kind: 'data-dependent',
    showOptionalCloudCta: true,
  },
  vps: { id: 'vps', requiresExternalConnection: false, kind: 'internal' },
  docker: { id: 'docker', requiresExternalConnection: false, kind: 'internal' },
  kubernetes: { id: 'kubernetes', requiresExternalConnection: false, kind: 'internal' },
  network: { id: 'network', requiresExternalConnection: false, kind: 'internal' },
  storage: { id: 'storage', requiresExternalConnection: false, kind: 'internal' },
  backups: { id: 'backups', requiresExternalConnection: false, kind: 'internal' },
  'capacity-planner': { id: 'capacity-planner', requiresExternalConnection: false, kind: 'internal' },
  jenkins: { id: 'jenkins', requiresExternalConnection: true, kind: 'external', provider: 'jenkins' },
  terraform: { id: 'terraform', requiresExternalConnection: false, kind: 'internal' },
  deployments: { id: 'deployments', requiresExternalConnection: false, kind: 'internal' },
  'active-sessions': { id: 'active-sessions', requiresExternalConnection: false, kind: 'internal' },
  history: { id: 'history', requiresExternalConnection: false, kind: 'internal' },
  runbooks: { id: 'runbooks', requiresExternalConnection: false, kind: 'internal' },
  scheduler: { id: 'scheduler', requiresExternalConnection: false, kind: 'internal' },
  'service-catalog': { id: 'service-catalog', requiresExternalConnection: false, kind: 'internal' },
  approvals: { id: 'approvals', requiresExternalConnection: false, kind: 'internal' },
  github: { id: 'github', requiresExternalConnection: true, kind: 'external', provider: 'github' },
  gitlab: { id: 'gitlab', requiresExternalConnection: true, kind: 'external', provider: 'gitlab' },
  webhooks: { id: 'webhooks', requiresExternalConnection: false, kind: 'internal' },
  branches: { id: 'branches', requiresExternalConnection: false, kind: 'internal' },
  commits: { id: 'commits', requiresExternalConnection: false, kind: 'internal' },
  'pull-requests': { id: 'pull-requests', requiresExternalConnection: false, kind: 'internal' },
  metrics: {
    id: 'metrics',
    requiresExternalConnection: false,
    kind: 'data-dependent',
    showOptionalCloudCta: true,
  },
  logs: { id: 'logs', requiresExternalConnection: false, kind: 'internal' },
  billing: {
    id: 'billing',
    requiresExternalConnection: false,
    kind: 'data-dependent',
    showOptionalCloudCta: true,
  },
  'cost-optimizer': { id: 'cost-optimizer', requiresExternalConnection: false, kind: 'internal' },
  alerts: { id: 'alerts', requiresExternalConnection: false, kind: 'internal' },
  incidents: { id: 'incidents', requiresExternalConnection: false, kind: 'internal' },
  notifications: { id: 'notifications', requiresExternalConnection: false, kind: 'internal' },
  reports: { id: 'reports', requiresExternalConnection: false, kind: 'internal' },
  'change-management': { id: 'change-management', requiresExternalConnection: false, kind: 'internal' },
  'security-center': { id: 'security-center', requiresExternalConnection: false, kind: 'internal' },
  'secrets-manager': { id: 'secrets-manager', requiresExternalConnection: false, kind: 'internal' },
  compliance: { id: 'compliance', requiresExternalConnection: false, kind: 'internal' },
  'access-control': { id: 'access-control', requiresExternalConnection: false, kind: 'internal' },
  audit: { id: 'audit', requiresExternalConnection: false, kind: 'internal' },
  users: { id: 'users', requiresExternalConnection: false, kind: 'internal' },
  roles: { id: 'roles', requiresExternalConnection: false, kind: 'internal' },
  'api-tokens': { id: 'api-tokens', requiresExternalConnection: false, kind: 'internal' },
  settings: { id: 'settings', requiresExternalConnection: false, kind: 'internal' },
  'ai-assistant': { id: 'ai-assistant', requiresExternalConnection: false, kind: 'ai' },
  'demo-mode': { id: 'demo-mode', requiresExternalConnection: false, kind: 'internal' },
}

/** Etiquetas visibles usadas en pro-config-gate y connection-required legacy. */
export const MODULE_LABEL_TO_ID: Record<string, string> = {
  Usuarios: 'users',
  Roles: 'roles',
  'Tokens API': 'api-tokens',
  Webhooks: 'webhooks',
  Informes: 'reports',
  'Gestión de cambios': 'change-management',
  Aprobaciones: 'approvals',
  Programador: 'scheduler',
  'Catálogo de servicios': 'service-catalog',
  Runbooks: 'runbooks',
  'Centro de seguridad': 'security-center',
  'Gestor de secretos': 'secrets-manager',
  'Cumplimiento / Políticas': 'compliance',
  'Control de acceso': 'access-control',
  'Explorador de recursos': 'resource-explorer',
  'Mapa de topología': 'topology-map',
  'Asistente IA': 'ai-assistant',
  Jenkins: 'jenkins',
  Terraform: 'terraform',
  AWS: 'aws',
  GCP: 'gcp',
  Azure: 'azure',
  GitHub: 'github',
  GitLab: 'gitlab',
}
