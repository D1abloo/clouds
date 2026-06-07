import { CLIENT_DEMO_GITLAB_PROJECTS } from './gitlab-demo-catalog'

export type GitlabProjectScope = 'all' | 'group' | 'selected'

export type GitlabSyncPermissionInput = {
  scopes: string[]
  projectScope: GitlabProjectScope
  groupPath?: string
  accountType?: 'personal' | 'group' | 'self-hosted'
}

export type GitlabSyncPreview = {
  accessible: number
  skipped: number
  total: number
  canSync: boolean
  sampleProjects: string[]
  reasons: string[]
}

export type GitlabAccountFormResult = {
  label: string
  username: string
  token?: string
  hostUrl: string
  accountType: 'personal' | 'group' | 'self-hosted'
  groupPath?: string
  scopes: string[]
  projectScope: GitlabProjectScope
  autoSync: boolean
  syncOnConnect: boolean
  validateBeforeSave: boolean
  useDemoData: boolean
  description?: string
}

export const GITLAB_SCOPES = [
  { id: 'api', label: 'api', description: 'Acceso completo a la API v4', required: true },
  { id: 'read_api', label: 'read_api', description: 'Lectura vía API (alternativa a api)', required: false },
  { id: 'read_repository', label: 'read_repository', description: 'Clonar y listar repositorios', required: true },
  { id: 'write_repository', label: 'write_repository', description: 'Push y gestión de ramas protegidas', required: false },
  { id: 'read_user', label: 'read_user', description: 'Perfil del usuario autenticado', required: true },
  { id: 'read_group', label: 'read_group', description: 'Listar grupos y subgrupos', required: false, groupOnly: true },
  { id: 'read_registry', label: 'read_registry', description: 'Pull de imágenes del registry', required: false },
] as const

export const GITLAB_PROJECT_SCOPES = [
  { value: 'all' as const, label: 'Todos los proyectos accesibles' },
  { value: 'group' as const, label: 'Solo un grupo / subgrupo' },
  { value: 'selected' as const, label: 'Lista explícita (post-alta)' },
]

export const previewGitlabProjectSync = (perms: GitlabSyncPermissionInput): GitlabSyncPreview => {
  const projects = CLIENT_DEMO_GITLAB_PROJECTS
  const total = projects.length
  const reasons: string[] = []
  const hasApi = perms.scopes.includes('api') || perms.scopes.includes('read_api')
  const hasRepo = perms.scopes.includes('read_repository')

  if (!hasApi || !hasRepo) {
    const missing = []
    if (!hasApi) missing.push('api o read_api')
    if (!hasRepo) missing.push('read_repository')
    return {
      accessible: 0,
      skipped: total,
      total,
      canSync: false,
      sampleProjects: [],
      reasons: [`Faltan scopes: ${missing.join(', ')}`],
    }
  }

  if (perms.projectScope === 'selected') {
    return {
      accessible: 0,
      skipped: total,
      total,
      canSync: true,
      sampleProjects: [],
      reasons: ['Selecciona proyectos tras validar el token'],
    }
  }

  if (perms.projectScope === 'group') {
    const group = perms.groupPath?.trim().toLowerCase()
    if (!group) {
      return {
        accessible: 0,
        skipped: total,
        total,
        canSync: false,
        sampleProjects: [],
        reasons: ['Indica el path del grupo (ej. cloudops-platform)'],
      }
    }
    if (perms.accountType === 'group' && !perms.scopes.includes('read_group')) {
      reasons.push('Sin read_group pueden omitirse subgrupos')
    }
    const matched = projects.filter(
      (p) => p.group.toLowerCase() === group || p.fullPath.toLowerCase().startsWith(`${group}/`),
    )
    return {
      accessible: matched.length,
      skipped: total - matched.length,
      total,
      canSync: true,
      sampleProjects: matched.slice(0, 4).map((p) => p.fullPath),
      reasons: matched.length ? reasons : [`Ningún proyecto en ${group}`, ...reasons],
    }
  }

  return {
    accessible: total,
    skipped: 0,
    total,
    canSync: true,
    sampleProjects: projects.slice(0, 4).map((p) => p.fullPath),
    reasons,
  }
}

export const filterGitlabProjectsByPermissions = (
  perms: GitlabSyncPermissionInput,
): { projects: typeof CLIENT_DEMO_GITLAB_PROJECTS; preview: GitlabSyncPreview } => {
  const preview = previewGitlabProjectSync(perms)
  if (!preview.canSync || preview.accessible === 0) {
    return { projects: [], preview }
  }
  if (perms.projectScope === 'all') {
    return { projects: [...CLIENT_DEMO_GITLAB_PROJECTS], preview }
  }
  const group = perms.groupPath?.trim().toLowerCase() ?? ''
  const projects = CLIENT_DEMO_GITLAB_PROJECTS.filter(
    (p) => p.group.toLowerCase() === group || p.fullPath.toLowerCase().startsWith(`${group}/`),
  )
  return { projects, preview: { ...preview, accessible: projects.length, skipped: CLIENT_DEMO_GITLAB_PROJECTS.length - projects.length } }
}
