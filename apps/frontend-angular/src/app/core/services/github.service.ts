import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'

export type DeployTargetType = 'instance' | 'vps' | 'docker' | 'kubernetes'

export interface GithubConnection {
  connected: boolean
  username: string | null
  avatarUrl?: string | null
  connectedAt?: string | null
  lastSyncAt?: string | null
  repoCount: number
}

export interface GithubRepo {
  id: string
  name: string
  fullName: string
  description: string
  defaultBranch: string
  language: string
  stars: number
  visibility: string
  updatedAt: string
}

@Injectable({ providedIn: 'root' })
export class GithubService {
  private readonly api = inject(ApiClientService)

  connection = (): Observable<GithubConnection> =>
    this.api.get<GithubConnection>('github/connection')

  connect = (body?: { token?: string; username?: string }): Observable<GithubConnection & { message?: string }> =>
    this.api.post('github/connect', body ?? {})

  disconnect = (): Observable<{ connected: boolean; message?: string }> =>
    this.api.post('github/disconnect', {})

  sync = (): Observable<{ synced: number; repos: GithubRepo[]; lastSyncAt: string }> =>
    this.api.post('github/sync', {})

  repositories = (): Observable<{ connected: boolean; items: GithubRepo[]; lastSyncAt?: string }> =>
    this.api.get('github/repositories')

  branches = (repoId: string): Observable<{ items: Record<string, unknown>[] }> =>
    this.api.get(`github/repositories/${repoId}/branches`)

  commits = (repoId: string, branch?: string): Observable<{ items: Record<string, unknown>[] }> =>
    this.api.get(`github/repositories/${repoId}/commits`, branch ? { branch } : undefined)

  pullRequests = (repoId: string): Observable<{ items: Record<string, unknown>[] }> =>
    this.api.get(`github/repositories/${repoId}/pull-requests`)

  webhooks = (): Observable<{ items: Record<string, unknown>[] }> =>
    this.api.get('github/webhooks')

  deployments = (): Observable<{ items: Record<string, unknown>[] }> =>
    this.api.get('github/deployments')

  deploy = (body: {
    repoId: string
    branch: string
    targetType: DeployTargetType
    targetId: string
    targetName?: string
  }): Observable<{ queued: boolean; message: string; deployment: Record<string, unknown> }> =>
    this.api.post('github/deploy', body)
}
