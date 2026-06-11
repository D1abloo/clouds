import { Injectable, inject } from '@angular/core'
import { Observable, of } from 'rxjs'
import { map, switchMap } from 'rxjs/operators'
import { ApiClientService } from './api-client.service'
import type { GitlabAccount, GitlabGroup, GitlabProject } from '../../features/repositories/utils/gitlab.types'

export type { GitlabAccount, GitlabProject, GitlabGroup }

@Injectable({ providedIn: 'root' })
export class GitlabService {
  private readonly api = inject(ApiClientService)

  accounts = (): Observable<{ items: GitlabAccount[] }> => this.api.get('gitlab/accounts')

  startOAuth = (returnUrl?: string): Observable<{ redirectUrl: string }> =>
    this.api.get('gitlab/oauth/start', returnUrl ? { returnUrl } : undefined)

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
    authType?: string
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
    branchesSynced?: number
    commitsSynced?: number
    mergeRequestsSynced?: number
    webhooksSynced?: number
    deploymentsSynced?: number
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

  account = (): Observable<GitlabAccount | null> =>
    this.accounts().pipe(map((res) => res.items.find((a) => a.status === 'connected') ?? res.items[0] ?? null))

  branches = (): Observable<{ items: Record<string, unknown>[] }> => this.api.get('gitlab/branches')

  commits = (): Observable<{ items: Record<string, unknown>[] }> => this.api.get('gitlab/commits')

  mergeRequests = (): Observable<{ items: Record<string, unknown>[] }> => this.api.get('gitlab/merge-requests')

  pipelines = (): Observable<{ items: Record<string, unknown>[] }> => this.api.get('gitlab/deployments')

  webhooks = (): Observable<{ items: Record<string, unknown>[] }> => this.api.get('gitlab/webhooks')

  deployments = (): Observable<{ items: Record<string, unknown>[] }> => this.api.get('gitlab/deployments')

  syncProjects = (): Observable<{
    synced: number
    projects?: GitlabProject[]
    lastSyncAt: string
    message: string
  }> =>
    this.account().pipe(
      switchMap((acc) => {
        if (!acc?.id) {
          return of({
            synced: 0,
            projects: [],
            lastSyncAt: new Date().toISOString(),
            message: 'Conecta una cuenta GitLab en Configuración.',
          })
        }
        return this.syncAccount(acc.id)
      }),
    )

  deploymentLogs = (id: string): Observable<{ logs: string; status?: string }> =>
    this.api.get(`gitlab/deployments/${id}/logs`)

  deployProject = (
    projectId: string,
    body: {
      branch: string
      environment: string
      strategy?: string
      targetName?: string
      targetType?: string
      notes?: string
    },
  ): Observable<{ queued: boolean; message: string; deployment: Record<string, unknown> }> =>
    this.api.post(`gitlab/projects/${projectId}/deploy`, body)
}
