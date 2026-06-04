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

export type GitlabDemoState = ReturnType<typeof buildGitlabDemoBootstrap>

@Injectable({ providedIn: 'root' })
export class GitlabService {
  connectDemo = (): Observable<GitlabDemoState & { message: string }> => {
    const state = buildGitlabDemoBootstrap()
    return of({
      ...state,
      message: 'Cuenta demo GitLab conectada con proyectos ficticios',
    })
  }

  projects = (): Observable<{ items: GitlabProject[] }> =>
    of({ items: buildGitlabDemoBootstrap().projects })

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

  syncProjects = (): Observable<{ synced: number; lastSyncAt: string; message: string }> =>
    of({
      synced: buildGitlabDemoBootstrap().projects.length,
      lastSyncAt: new Date().toISOString(),
      message: 'Proyectos GitLab sincronizados (demo)',
    })

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
