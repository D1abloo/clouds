import { Injectable, inject } from '@angular/core'
import { Observable, of } from 'rxjs'
import { ApiClientService } from './api-client.service'
import type { GitlabAccount, GitlabGroup, GitlabProject } from '../../features/repositories/utils/gitlab.types'
import type {
  GitlabAccountFormResult,
  GitlabSyncPermissionInput,
} from '../../features/repositories/utils/gitlab-account-form.config'

export type { GitlabAccount, GitlabProject, GitlabGroup }

@Injectable({ providedIn: 'root' })
export class GitlabService {
  private readonly api = inject(ApiClientService)

  accounts = (): Observable<{ items: GitlabAccount[] }> => this.api.get('gitlab/accounts')

  validatePreview = (body: {
    token: string
    baseUrl?: string
    authType?: string
  }): Observable<{
    valid: boolean
    username: string | null
    avatarUrl: string | null
    scopes: string[]
    repoCount: number
    message: string
  }> => this.api.post('gitlab/accounts/validate-preview', body)

  previewProjects = (body: {
    token: string
    baseUrl?: string
    excludeArchived?: boolean
  }): Observable<{ items: Array<{ id: number; name: string; fullName: string; archived: boolean; description: string }> }> =>
    this.api.post('gitlab/accounts/preview-projects', body)

  getAccount = (id: string): Observable<{ account: GitlabAccount; projects: GitlabProject[] }> =>
    this.api.get(`gitlab/accounts/${id}`)

  createAccount = (body: {
    label?: string
    connectionName?: string
    username?: string
    token?: string
    authType?: string
    baseUrl?: string
    syncFrequency?: string
  }): Observable<GitlabAccount & { message: string }> => this.api.post('gitlab/accounts', body)

  validateAccount = (id: string): Observable<{ valid: boolean; message: string; scopes?: string[]; repoCount?: number }> =>
    this.api.post(`gitlab/accounts/${id}/validate`, {})

  syncAccount = (
    id: string,
    body?: { selectedProjectIds?: number[]; excludeArchived?: boolean },
  ): Observable<{
    synced: number
    projects?: GitlabProject[]
    lastSyncAt: string
    message: string
  }> => this.api.post(`gitlab/accounts/${id}/sync`, body ?? {})

  deleteAccount = (id: string): Observable<{ deleted: boolean; message: string }> =>
    this.api.delete(`gitlab/accounts/${id}`)

  connectDemo = (): Observable<{ message: string; account: null; projects: GitlabProject[]; groups: GitlabGroup[] }> =>
    of({
      account: null,
      projects: [],
      groups: [],
      message: 'Conecta GitLab en Configuración para usar esta integración',
    })

  projects = (): Observable<{ items: GitlabProject[] }> => this.api.get('gitlab/projects')

  groups = (): Observable<{ items: GitlabGroup[] }> => of({ items: [] })

  account = (): Observable<GitlabAccount | null> => of(null)

  mergeRequests = (): Observable<{ items: Record<string, unknown>[] }> => of({ items: [] })

  pipelines = (): Observable<{ items: Record<string, unknown>[] }> => of({ items: [] })

  webhooks = (): Observable<{ items: Record<string, unknown>[] }> => of({ items: [] })

  deployments = (): Observable<{ items: Record<string, unknown>[] }> => of({ items: [] })

  syncProjects = (): Observable<{
    synced: number
    projects?: GitlabProject[]
    lastSyncAt: string
    message: string
  }> =>
    of({
      synced: 0,
      projects: [],
      lastSyncAt: new Date().toISOString(),
      message: 'Configuración requerida. Conecta GitLab en Configuración.',
    })

  deploymentLogs = (_id: string): Observable<{ logs: string }> =>
    of({ logs: 'Sin registros de despliegue disponibles.' })
}
