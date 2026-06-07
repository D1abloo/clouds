import { Injectable } from '@angular/core'
import { Observable, of } from 'rxjs'
import {
  buildGitlabDemoBootstrap,
  CLIENT_DEMO_GITLAB_DEPLOYMENTS,
  CLIENT_DEMO_GITLAB_MRS,
  CLIENT_DEMO_GITLAB_PIPELINES,
  CLIENT_DEMO_GITLAB_WEBHOOKS,
  type GitlabAccount,
  type GitlabGroup,
  type GitlabProject,
} from '../../features/repositories/utils/gitlab-demo-catalog'
import {
  filterGitlabProjectsByPermissions,
  type GitlabAccountFormResult,
  type GitlabSyncPermissionInput,
} from '../../features/repositories/utils/gitlab-account-form.config'

export type GitlabDemoState = ReturnType<typeof buildGitlabDemoBootstrap>

@Injectable({ providedIn: 'root' })
export class GitlabService {
  private syncPermissions: GitlabSyncPermissionInput | null = null

  connectDemo = (): Observable<GitlabDemoState & { message: string }> => {
    const state = buildGitlabDemoBootstrap()
    return of({
      ...state,
      message: 'Cuenta demo GitLab conectada con proyectos ficticios',
    })
  }

  createAccount = (
    body: GitlabAccountFormResult,
  ): Observable<GitlabAccount & { message: string }> => {
    this.syncPermissions = {
      scopes: body.scopes,
      projectScope: body.projectScope,
      groupPath: body.groupPath,
      accountType: body.accountType,
    }
    const account: GitlabAccount = {
      id: `gl-acc-${Date.now()}`,
      label: body.label,
      username: body.username,
      status: 'connected',
      statusLabel: 'Conectada',
      lastSyncAt: new Date().toISOString(),
      demoMode: body.useDemoData,
    }
    return of({ ...account, message: 'Cuenta GitLab registrada' })
  }

  projects = (): Observable<{ items: GitlabProject[] }> => {
    if (this.syncPermissions) {
      const { projects } = filterGitlabProjectsByPermissions(this.syncPermissions)
      return of({ items: projects.length ? projects : buildGitlabDemoBootstrap().projects })
    }
    return of({ items: buildGitlabDemoBootstrap().projects })
  }

  groups = (): Observable<{ items: GitlabGroup[] }> =>
    of({ items: buildGitlabDemoBootstrap().groups })

  account = (): Observable<GitlabAccount> => of(buildGitlabDemoBootstrap().account)

  mergeRequests = (): Observable<{ items: Record<string, unknown>[] }> =>
    of({ items: CLIENT_DEMO_GITLAB_MRS })

  pipelines = (): Observable<{ items: Record<string, unknown>[] }> =>
    of({ items: CLIENT_DEMO_GITLAB_PIPELINES })

  webhooks = (): Observable<{ items: Record<string, unknown>[] }> =>
    of({ items: CLIENT_DEMO_GITLAB_WEBHOOKS })

  deployments = (): Observable<{ items: Record<string, unknown>[] }> =>
    of({ items: CLIENT_DEMO_GITLAB_DEPLOYMENTS })

  syncProjects = (
    override?: GitlabSyncPermissionInput,
  ): Observable<{
    synced: number
    skipped?: number
    total?: number
    reasons?: string[]
    projects?: GitlabProject[]
    lastSyncAt: string
    message: string
  }> => {
    const perms = override ?? this.syncPermissions ?? {
      scopes: ['api', 'read_repository', 'read_user'],
      projectScope: 'all' as const,
    }
    this.syncPermissions = perms
    const { projects, preview } = filterGitlabProjectsByPermissions(perms)
    const synced = projects.length
    const message =
      preview.reasons.length && synced === 0
        ? preview.reasons[0]
        : `${synced} proyectos sincronizados según permisos${preview.skipped ? ` · ${preview.skipped} omitidos` : ''}`
    return of({
      synced,
      skipped: preview.skipped,
      total: preview.total,
      reasons: preview.reasons,
      projects,
      lastSyncAt: new Date().toISOString(),
      message,
    })
  }

  validateAccount = (): Observable<{ valid: boolean; message: string }> =>
    of({ valid: true, message: 'Token GitLab demo válido' })

  deploymentLogs = (id: string): Observable<{ logs: string }> =>
    of({
      logs: [
        `[GitLab] Despliegue ${id}`,
        '[OK] Pipeline deploy stage',
        '[OK] Environment production actualizado',
      ].join('\n'),
    })
}
