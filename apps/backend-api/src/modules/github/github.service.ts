import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { AuditService } from '../audit/audit.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import {
  DEMO_DEPLOYMENTS,
  DEMO_GITHUB_REPOS,
  DEMO_WEBHOOKS,
  demoBranches,
  demoCommits,
  demoPullRequests,
  type GithubDeploymentDemo,
  type GithubRepoDemo,
} from './github-demo.data'

type ConnectionState = {
  connected: boolean
  username: string
  avatarUrl?: string
  connectedAt?: string
  lastSyncAt?: string | null
  repoCount: number
}

@Injectable()
export class GithubService {
  private readonly connections = new Map<string, ConnectionState>()
  private readonly reposByUser = new Map<string, GithubRepoDemo[]>()
  private readonly deployments: GithubDeploymentDemo[] = [...DEMO_DEPLOYMENTS]

  constructor(
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  getConnection(userId: string) {
    const state = this.connections.get(userId)
    if (!state) {
      return {
        connected: false,
        username: null,
        avatarUrl: null,
        connectedAt: null,
        lastSyncAt: null,
        repoCount: 0,
      }
    }
    return state
  }

  async connect(userId: string, body: { token?: string; username?: string }) {
    const username = body.username?.trim() || 'cloudops-demo'
    const state: ConnectionState = {
      connected: true,
      username,
      avatarUrl: `https://github.com/${username}.png`,
      connectedAt: new Date().toISOString(),
      lastSyncAt: null,
      repoCount: 0,
    }
    this.connections.set(userId, state)
    await this.audit.create({
      userId,
      action: 'github.connect',
      resource: 'github',
      metadata: { username },
    })
    return { ...state, message: 'Cuenta GitHub conectada (demo)' }
  }

  async disconnect(userId: string) {
    this.connections.delete(userId)
    this.reposByUser.delete(userId)
    await this.audit.create({ userId, action: 'github.disconnect', resource: 'github' })
    return { connected: false, message: 'Cuenta desconectada' }
  }

  async syncRepositories(userId: string) {
    const conn = this.connections.get(userId)
    if (!conn?.connected) {
      throw new BadRequestException('Conecta tu cuenta de GitHub antes de sincronizar')
    }
    const repos = DEMO_GITHUB_REPOS.map((r) => ({ ...r, syncedAt: new Date().toISOString() }))
    this.reposByUser.set(userId, repos)
    conn.lastSyncAt = new Date().toISOString()
    conn.repoCount = repos.length
    this.connections.set(userId, conn)
    await this.audit.create({
      userId,
      action: 'github.sync',
      resource: 'github',
      metadata: { repoCount: repos.length },
    })
    this.realtime.emitGithubSynced({ repoCount: repos.length })
    return { synced: repos.length, repos, lastSyncAt: conn.lastSyncAt }
  }

  listRepositories(userId: string) {
    const conn = this.connections.get(userId)
    if (!conn?.connected) return { connected: false, items: [] as GithubRepoDemo[] }
    return { connected: true, items: this.reposByUser.get(userId) ?? [], lastSyncAt: conn.lastSyncAt }
  }

  getRepository(userId: string, repoId: string) {
    const repo = this.reposByUser.get(userId)?.find((r) => r.id === repoId)
    if (!repo) throw new NotFoundException('Repositorio no encontrado')
    return repo
  }

  listBranches(userId: string, repoId: string) {
    this.getRepository(userId, repoId)
    return { items: demoBranches(repoId) }
  }

  listCommits(userId: string, repoId: string, branch?: string) {
    this.getRepository(userId, repoId)
    let items = demoCommits(repoId)
    if (branch) items = items.filter((c) => c.branch === branch)
    return { items }
  }

  listPullRequests(userId: string, repoId: string) {
    this.getRepository(userId, repoId)
    return { items: demoPullRequests(repoId) }
  }

  listWebhooks() {
    return { items: DEMO_WEBHOOKS }
  }

  listDeployments(userId?: string) {
    void userId
    return { items: this.deployments }
  }

  async deploy(
    userId: string,
    body: {
      repoId: string
      branch: string
      targetType: 'instance' | 'vps' | 'docker' | 'kubernetes'
      targetId: string
      targetName?: string
    },
  ) {
    const repo = this.getRepository(userId, body.repoId)
    const deployment: GithubDeploymentDemo = {
      id: `dep-${Date.now()}`,
      repoFullName: repo.fullName,
      branch: body.branch,
      targetType: body.targetType,
      targetName: body.targetName ?? body.targetId,
      status: 'running',
      createdAt: new Date().toISOString(),
    }
    this.deployments.unshift(deployment)
    await this.audit.create({
      userId,
      action: 'github.deploy',
      resource: 'github_repo',
      resourceId: repo.id,
      metadata: body,
    })
    setTimeout(() => {
      deployment.status = 'success'
      this.realtime.emitGithubDeployment(deployment)
    }, 1200)
    return {
      queued: true,
      deployment,
      message: `Despliegue de ${repo.name}@${body.branch} iniciado hacia ${body.targetType}`,
    }
  }

  summaryForInventory(userId?: string) {
    const conn = userId ? this.getConnection(userId) : { connected: false, repoCount: 0 }
    const repos = userId ? (this.reposByUser.get(userId) ?? []) : DEMO_GITHUB_REPOS
    const openPrs = repos.length * 2
    return {
      connected: conn.connected,
      username: 'username' in conn ? conn.username : null,
      repoCount: repos.length,
      branchCount: repos.length * 3,
      commitCount: repos.length * 3,
      openPullRequests: openPrs,
      webhookCount: DEMO_WEBHOOKS.length,
      deploymentCount: this.deployments.length,
      repoItems: repos,
      lastSyncAt: 'lastSyncAt' in conn ? conn.lastSyncAt : null,
    }
  }
}
