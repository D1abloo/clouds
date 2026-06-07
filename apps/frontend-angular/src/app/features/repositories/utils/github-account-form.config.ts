export type GithubAccountType = 'personal' | 'organization' | 'enterprise'
export type GithubAuthMethod = 'pat-classic' | 'pat-fine-grained' | 'github-app' | 'oauth'
export type GithubAccountEnvironment = 'production' | 'staging' | 'development'
export type GithubSyncInterval = '15m' | '1h' | '6h' | 'manual'
export type GithubRepoScope = 'all' | 'organization' | 'selected'

export type GithubScopeDef = {
  id: string
  label: string
  description: string
  required: boolean
  orgOnly?: boolean
}

export const GITHUB_ACCOUNT_TYPES: { value: GithubAccountType; label: string; hint: string }[] = [
  { value: 'personal', label: 'Personal', hint: 'Usuario individual con PAT propio' },
  { value: 'organization', label: 'Organización', hint: 'Repos bajo org · requiere slug y permisos read:org' },
  { value: 'enterprise', label: 'Enterprise Cloud', hint: 'GitHub Enterprise · SSO y políticas corporativas' },
]

export const GITHUB_AUTH_METHODS: { value: GithubAuthMethod; label: string; hint: string }[] = [
  { value: 'pat-fine-grained', label: 'PAT fine-grained', hint: 'Recomendado · permisos por repositorio' },
  { value: 'pat-classic', label: 'PAT classic', hint: 'Scopes amplios · compatibilidad legacy' },
  { value: 'github-app', label: 'GitHub App', hint: 'Instalación en org · rotación automática' },
  { value: 'oauth', label: 'OAuth App', hint: 'Flujo interactivo · menos scopes persistentes' },
]

export const GITHUB_SCOPES: GithubScopeDef[] = [
  { id: 'repo', label: 'repo', description: 'Acceso completo a repositorios privados', required: true },
  { id: 'workflow', label: 'workflow', description: 'Disparar y leer GitHub Actions', required: true },
  { id: 'admin:repo_hook', label: 'admin:repo_hook', description: 'Gestionar webhooks de repositorio', required: true },
  { id: 'read:user', label: 'read:user', description: 'Perfil y email del usuario', required: true },
  { id: 'read:org', label: 'read:org', description: 'Listar organizaciones y miembros', required: false, orgOnly: true },
  { id: 'admin:org_hook', label: 'admin:org_hook', description: 'Webhooks a nivel organización', required: false, orgOnly: true },
  { id: 'read:packages', label: 'read:packages', description: 'Leer GitHub Packages', required: false },
  { id: 'write:packages', label: 'write:packages', description: 'Publicar contenedores', required: false },
]

export const GITHUB_WEBHOOK_EVENTS = [
  { id: 'push', label: 'push', description: 'Commits y tags' },
  { id: 'pull_request', label: 'pull_request', description: 'PRs abiertas, merge, review' },
  { id: 'deployment', label: 'deployment', description: 'Estado de despliegues GitHub' },
  { id: 'workflow_run', label: 'workflow_run', description: 'Ejecuciones de Actions' },
  { id: 'release', label: 'release', description: 'Publicaciones y pre-releases' },
  { id: 'repository', label: 'repository', description: 'Alta/baja de repos' },
] as const

export const GITHUB_SYNC_INTERVALS: { value: GithubSyncInterval; label: string }[] = [
  { value: '15m', label: 'Cada 15 minutos' },
  { value: '1h', label: 'Cada hora' },
  { value: '6h', label: 'Cada 6 horas' },
  { value: 'manual', label: 'Solo manual' },
]

export const GITHUB_REPO_SCOPES: { value: GithubRepoScope; label: string }[] = [
  { value: 'all', label: 'Todos los repos accesibles' },
  { value: 'organization', label: 'Solo organización indicada' },
  { value: 'selected', label: 'Lista explícita (post-alta)' },
]

export const defaultCloudOpsWebhookUrl = (): string =>
  `${typeof window !== 'undefined' ? window.location.origin : 'https://app.cloudops.local'}/api/webhooks/github`

export type GithubAccountFormResult = {
  label: string
  username: string
  token?: string
  accountType: GithubAccountType
  organization?: string
  authMethod: GithubAuthMethod
  tokenName?: string
  tokenExpiry?: string
  scopes: string[]
  environment: GithubAccountEnvironment
  autoSync: boolean
  syncInterval: GithubSyncInterval
  repoScope: GithubRepoScope
  webhookUrl: string
  webhookSecret?: string
  webhookEvents: string[]
  description?: string
  contactEmail?: string
  useDemoData: boolean
  validateBeforeSave: boolean
  syncOnConnect: boolean
}
