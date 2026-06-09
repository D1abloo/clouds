export type ExternalProvider =
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'jenkins'
  | 'github'
  | 'gitlab'
  | 'vps'
  | 'docker'
  | 'kubernetes'
  | 'terraform'
  | 'repository'

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
    title: 'Sin cuentas AWS conectadas',
    description: 'Añade credenciales IAM para sincronizar recursos, instancias y costes.',
    actionLabel: 'Añadir cuenta AWS',
    actionRoute: '/cloud/aws/accounts',
  },
  gcp: {
    title: 'Sin proyectos GCP conectados',
    description: 'Añade un proyecto con credenciales de servicio para empezar.',
    actionLabel: 'Añadir cuenta GCP',
    actionRoute: '/cloud/gcp/accounts',
  },
  azure: {
    title: 'Sin suscripciones Azure conectadas',
    description: 'Configura una aplicación registrada para sincronizar recursos.',
    actionLabel: 'Añadir cuenta Azure',
    actionRoute: '/cloud/azure/accounts',
  },
  github: {
    title: 'Sin cuenta GitHub conectada',
    description: 'Conecta tu organización o usuario para ver repositorios y despliegues.',
    actionLabel: 'Añadir cuenta GitHub',
    actionRoute: '/repositories/github',
  },
  gitlab: {
    title: 'Sin cuenta GitLab conectada',
    description: 'Añade un token de acceso para sincronizar proyectos y pipelines.',
    actionLabel: 'Añadir cuenta GitLab',
    actionRoute: '/repositories/gitlab',
  },
  jenkins: {
    title: 'Sin controlador Jenkins conectado',
    description: 'Registra la URL y credenciales del servidor CI/CD.',
    actionLabel: 'Configurar Jenkins',
    actionRoute: '/jenkins/jobs',
  },
  vps: {
    title: 'Sin servidores VPS conectados',
    description: 'Añade un servidor VPS o Bare Metal para gestionar SSH, servicios y métricas.',
    actionLabel: 'Añadir servidor VPS',
    actionRoute: '/admin/infraestructura/vps/nuevo',
  },
  docker: {
    title: 'Sin motores Docker conectados',
    description: 'Registra el endpoint del daemon Docker o del orquestador para inventariar contenedores.',
    actionLabel: 'Conectar Docker',
    actionRoute: '/docker/containers',
  },
  kubernetes: {
    title: 'Sin clústeres Kubernetes conectados',
    description: 'Añade el kubeconfig o credenciales del clúster para ver pods, servicios e ingress.',
    actionLabel: 'Conectar Kubernetes',
    actionRoute: '/kubernetes/pods',
  },
  terraform: {
    title: 'Sin backend Terraform configurado',
    description: 'Conecta un proveedor cloud y configura el backend remoto para workspaces y despliegues.',
    actionLabel: 'Configurar Terraform',
    actionRoute: '/terraform/workspaces',
  },
  repository: {
    title: 'Sin repositorios conectados',
    description: 'Conecta GitHub o GitLab para ver ramas, commits y pull requests.',
    actionLabel: 'Conectar repositorio',
    actionRoute: '/repositories/github',
  },
}

export const AI_UNAVAILABLE_COPY: ExternalConnectionCopy = {
  title: 'Asistente no disponible',
  description: 'Configura una clave de API de IA en Configuración para habilitar el Copilot.',
  actionLabel: 'Configurar IA',
  actionRoute: '/settings/general',
}

export const DATA_SOURCE_COPY: ExternalConnectionCopy = {
  title: 'Sin fuente de datos conectada',
  description: 'Conecta AWS, GCP o Azure para obtener métricas, logs y costes en vivo.',
  actionLabel: 'Conectar fuente',
  actionRoute: '/cloud/aws/accounts',
}

export const OPTIONAL_CLOUD_CTA: ExternalConnectionCopy = {
  title: 'Conecta una nube',
  description: 'Añade AWS, GCP o Azure para poblar este módulo con datos en vivo.',
  actionLabel: 'Conectar fuente',
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
  vps: { id: 'vps', requiresExternalConnection: true, kind: 'external', provider: 'vps' },
  docker: { id: 'docker', requiresExternalConnection: true, kind: 'external', provider: 'docker' },
  kubernetes: { id: 'kubernetes', requiresExternalConnection: true, kind: 'external', provider: 'kubernetes' },
  network: { id: 'network', requiresExternalConnection: true, kind: 'external', provider: 'aws' },
  storage: { id: 'storage', requiresExternalConnection: true, kind: 'external', provider: 'aws' },
  backups: { id: 'backups', requiresExternalConnection: true, kind: 'external', provider: 'aws' },
  'capacity-planner': { id: 'capacity-planner', requiresExternalConnection: false, kind: 'internal' },
  jenkins: { id: 'jenkins', requiresExternalConnection: true, kind: 'external', provider: 'jenkins' },
  terraform: { id: 'terraform', requiresExternalConnection: true, kind: 'external', provider: 'terraform' },
  deployments: { id: 'deployments', requiresExternalConnection: true, kind: 'external', provider: 'repository' },
  'active-sessions': { id: 'active-sessions', requiresExternalConnection: false, kind: 'internal' },
  history: { id: 'history', requiresExternalConnection: false, kind: 'internal' },
  runbooks: { id: 'runbooks', requiresExternalConnection: false, kind: 'internal' },
  scheduler: { id: 'scheduler', requiresExternalConnection: false, kind: 'internal' },
  'service-catalog': { id: 'service-catalog', requiresExternalConnection: false, kind: 'internal' },
  approvals: { id: 'approvals', requiresExternalConnection: false, kind: 'internal' },
  github: { id: 'github', requiresExternalConnection: true, kind: 'external', provider: 'github' },
  gitlab: { id: 'gitlab', requiresExternalConnection: true, kind: 'external', provider: 'gitlab' },
  webhooks: { id: 'webhooks', requiresExternalConnection: false, kind: 'internal' },
  branches: { id: 'branches', requiresExternalConnection: true, kind: 'external', provider: 'repository' },
  commits: { id: 'commits', requiresExternalConnection: true, kind: 'external', provider: 'repository' },
  'pull-requests': { id: 'pull-requests', requiresExternalConnection: true, kind: 'external', provider: 'repository' },
  metrics: {
    id: 'metrics',
    requiresExternalConnection: false,
    kind: 'data-dependent',
    showOptionalCloudCta: true,
  },
  logs: {
    id: 'logs',
    requiresExternalConnection: false,
    kind: 'data-dependent',
    showOptionalCloudCta: true,
  },
  billing: {
    id: 'billing',
    requiresExternalConnection: false,
    kind: 'data-dependent',
    showOptionalCloudCta: true,
  },
  'cost-optimizer': {
    id: 'cost-optimizer',
    requiresExternalConnection: false,
    kind: 'data-dependent',
    showOptionalCloudCta: true,
  },
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
  Docker: 'docker',
  Kubernetes: 'kubernetes',
  VPS: 'vps',
}
