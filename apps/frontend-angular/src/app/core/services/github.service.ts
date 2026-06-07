import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'

export type DeployTargetType = 'instance' | 'vps' | 'docker' | 'kubernetes'

export interface GithubAccount {
  id: string
  label: string
  username: string
  status: string
  statusLabel?: string
  organization?: string
  accountType?: string
  accountTypeLabel?: string
  avatarUrl?: string | null
  lastValidatedAt?: string | null
  lastSyncAt?: string | null
  createdAt: string
  demoMode?: boolean
}

export interface GithubDemoConnectResult {
  demoMode: boolean
  account: GithubAccount
  connection: GithubConnection
  repos: GithubRepo[]
  synced: number
  message: string
}

export interface GithubConnection {
  connected: boolean
  username: string | null
  avatarUrl?: string | null
  connectedAt?: string | null
  lastSyncAt?: string | null
  repoCount: number
  accountId?: string | null
  demoMode?: boolean
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
  htmlUrl?: string
  accountId?: string
  isDemo?: boolean
}

@Injectable({ providedIn: 'root' })
export class GithubService {
  private readonly api = inject(ApiClientService)

  demoRepos = (): Observable<{ demoMode: boolean; count: number; items: GithubRepo[] }> =>
    this.api.get('github/demo/repos')

  connectDemo = (): Observable<GithubDemoConnectResult> =>
    this.api.post('github/demo/connect', {})

  accounts = (): Observable<{ items: GithubAccount[] }> =>
    this.api.get('github/accounts')

  createAccount = (body: {
    label?: string
    username?: string
    token?: string
    organization?: string
    accountType?: string
    authMethod?: string
    scopes?: string[]
    environment?: string
    autoSync?: boolean
    syncInterval?: string
    repoScope?: string
    webhookUrl?: string
    webhookSecret?: string
    webhookEvents?: string[]
    description?: string
    contactEmail?: string
    useDemoData?: boolean
  }): Observable<GithubAccount & { message?: string }> => this.api.post('github/accounts', body)

  validateAccount = (id: string): Observable<{ valid: boolean; account: GithubAccount; message: string }> =>
    this.api.post(`github/accounts/${id}/validate`, {})

  syncAccount = (
    id: string,
    body?: {
      scopes?: string[]
      repoScope?: string
      organization?: string
      accountType?: string
    },
  ): Observable<{
    synced: number
    skipped?: number
    total?: number
    reasons?: string[]
    repos?: GithubRepo[]
    lastSyncAt: string
    message: string
  }> => this.api.post(`github/accounts/${id}/sync`, body ?? {})

  deleteAccount = (id: string): Observable<{ deleted: boolean; message: string }> =>
    this.api.delete(`github/accounts/${id}`)

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

  repository = (id: string): Observable<GithubRepo> =>
    this.api.get(`github/repositories/${id}`)

  syncRepository = (id: string): Observable<{ repo: GithubRepo; message: string }> =>
    this.api.post(`github/repositories/${id}/sync`, {})

  branches = (repoId: string): Observable<{ items: Record<string, unknown>[] }> =>
    this.api.get(`github/repositories/${repoId}/branches`)

  commits = (repoId: string, branch?: string): Observable<{ items: Record<string, unknown>[] }> =>
    this.api.get(`github/repositories/${repoId}/commits`, branch ? { branch } : undefined)

  pullRequests = (repoId: string): Observable<{ items: Record<string, unknown>[] }> =>
    this.api.get(`github/repositories/${repoId}/pull-requests`)

  repoWebhooks = (repoId: string): Observable<{ items: Record<string, unknown>[] }> =>
    this.api.get(`github/repositories/${repoId}/webhooks`)

  webhooks = (): Observable<{ items: Record<string, unknown>[] }> =>
    this.api.get('github/webhooks')

  createWebhook = (body: {
    repoId?: string
    accountId?: string
    event: string
    url: string
    secret?: string
  }): Observable<Record<string, unknown>> => this.api.post('github/webhooks', body)

  deleteWebhook = (id: string): Observable<{ deleted: boolean }> =>
    this.api.delete(`github/webhooks/${id}`)

  deployments = (): Observable<{ items: Record<string, unknown>[] }> =>
    this.api.get('github/deployments')

  deploymentLogs = (id: string): Observable<{ id: string; logs: string; status: string }> =>
    this.api.get(`github/deployments/${id}/logs`)

  deploy = (body: {
    repoId: string
    branch: string
    targetType: DeployTargetType
    targetId: string
    targetName?: string
  }): Observable<{ queued: boolean; message: string; deployment: Record<string, unknown> }> =>
    this.api.post('github/deploy', body)

  deployRepository = (
    repoId: string,
    body: {
      branch: string
      targetType: DeployTargetType
      targetId: string
      targetName?: string
    },
  ): Observable<{ queued: boolean; message: string; deployment: Record<string, unknown> }> =>
    this.api.post(`github/repositories/${repoId}/deploy`, body)
}
