import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'

export type RepoProviderId = 'github' | 'gitlab'

export type RepoWizardStep =
  | 'provider'
  | 'method'
  | 'credentials'
  | 'validate'
  | 'repos'
  | 'success'

export type RepoAuthMethod = 'oauth' | 'pat' | 'enterprise'

export const REPO_WIZARD_STEPS: { id: RepoWizardStep; label: string }[] = [
  { id: 'provider', label: 'Proveedor' },
  { id: 'method', label: 'Método' },
  { id: 'credentials', label: 'Credenciales' },
  { id: 'validate', label: 'Validar' },
  { id: 'repos', label: 'Repositorios' },
  { id: 'success', label: 'Listo' },
]

export const REPO_PROVIDER_CARDS: {
  id: RepoProviderId
  name: string
  description: string
  logo: NavLogoKey
  toneClass: string
}[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repositorios, Actions, PRs, webhooks y despliegues desde GitHub.com o Enterprise Server.',
    logo: 'github',
    toneClass: 'provider-card--github',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'Proyectos, pipelines, merge requests y despliegues desde GitLab.com o instancia self-managed.',
    logo: 'gitlab',
    toneClass: 'provider-card--gitlab',
  },
]

export const REPO_AUTH_METHOD_CARDS: {
  id: RepoAuthMethod
  title: string
  description: string
  icon: string
  recommended?: boolean
}[] = [
  {
    id: 'oauth',
    title: 'OAuth (recomendado)',
    description: 'Autorización segura sin exponer el token en el formulario.',
    icon: 'verified_user',
    recommended: true,
  },
  {
    id: 'pat',
    title: 'Token personal (PAT)',
    description: 'Pega un token con scopes repo/read:org según tu alcance.',
    icon: 'vpn_key',
  },
  {
    id: 'enterprise',
    title: 'Enterprise / self-managed',
    description: 'GitHub Enterprise Server o GitLab self-hosted con URL base personalizada.',
    icon: 'dns',
  },
]

export const providerConnectRoute = (provider: RepoProviderId): string =>
  `/admin/configuracion/integraciones/${provider}/conectar`

export const providerDetailRoute = (provider: RepoProviderId, connectionId: string): string =>
  `/repositories/${provider}/${connectionId}`
