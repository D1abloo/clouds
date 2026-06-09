import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { NotificationsService } from '../notifications/notifications.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { SecretsVaultService } from '../cloud-accounts/secrets-vault.service'
import { connectionRequired } from '../../common/utils/pro-connection.util'
import { GithubApiClient } from './github-api.client'
import { mapAccount, mapRepo, isDemoGithubAccount } from './github-mappers'

@Injectable()
export class GithubAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
    private readonly vault: SecretsVaultService,
    private readonly githubApi: GithubApiClient,
  ) {}

  async list() {
    const items = await this.prisma.githubAccount.findMany({ orderBy: { createdAt: 'desc' } })
    const liveAccounts = items.filter((a) => !isDemoGithubAccount(a))
    if (!liveAccounts.length) {
      return {
        ...connectionRequired('GitHub', 'Conecte una cuenta GitHub con token OAuth o PAT'),
        demoMode: false,
      }
    }
    const mapped = await Promise.all(
      liveAccounts.map(async (a) => {
        const repoCount = await this.prisma.githubRepository.count({ where: { accountId: a.id } })
        return { ...mapAccount(a), repoCount, connectionName: a.connectionName ?? a.label }
      }),
    )
    return { items: mapped, demoMode: false, proMode: true }
  }

  async validatePreview(
    userId: string,
    body: { token: string; baseUrl?: string; authType?: string },
  ) {
    const token = body.token?.trim()
    if (!token) throw new BadRequestException('Token GitHub obligatorio')
    const result = await this.githubApi.validateToken(token, body.baseUrl)
    await this.audit.create({
      userId,
      action: result.valid ? 'github.validate_preview' : 'github.validate_preview_failed',
      resource: 'github',
      metadata: { scopes: result.scopes, repoCount: result.repoCount },
    })
    return {
      valid: result.valid,
      username: result.user?.login ?? null,
      avatarUrl: result.user?.avatar_url ?? null,
      scopes: result.scopes,
      repoCount: result.repoCount,
      message: result.valid
        ? `Conexión válida · ${result.repoCount} repositorios accesibles`
        : result.error ?? 'Token inválido',
    }
  }

  async previewRepos(body: { token: string; baseUrl?: string; excludeArchived?: boolean }) {
    const token = body.token?.trim()
    if (!token) throw new BadRequestException('Token GitHub obligatorio')
    let repos = await this.githubApi.listAllRepos(token, body.baseUrl)
    if (body.excludeArchived !== false) repos = repos.filter((r) => !r.archived)
    return {
      items: repos.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        archived: r.archived,
        description: r.description ?? '',
      })),
    }
  }

  async create(
    userId: string,
    body: {
      label?: string
      connectionName?: string
      username?: string
      token?: string
      authType?: string
      baseUrl?: string
      syncFrequency?: string
    },
  ) {
    return this.createPro(userId, body)
  }

  async validate(userId: string, accountId: string) {
    return this.validatePro(userId, accountId)
  }

  async sync(
    userId: string,
    accountId: string,
    body?: { selectedRepoIds?: number[]; excludeArchived?: boolean },
  ) {
    return this.syncPro(userId, accountId, body)
  }

  async remove(userId: string, accountId: string) {
    await this.findOrThrow(accountId)
    await this.prisma.githubAccount.delete({ where: { id: accountId } })
    await this.audit.create({
      userId,
      action: 'github.account.delete',
      resource: 'github',
      resourceId: accountId,
    })
    return { deleted: true, message: 'Cuenta eliminada' }
  }

  async getLegacyConnection(_userId: string) {
    try {
      const account = await this.prisma.githubAccount.findFirst({
        where: { status: 'connected' },
        orderBy: { lastSyncAt: 'desc' },
      })
      if (!account || isDemoGithubAccount(account)) {
        return {
          connected: false,
          username: null,
          avatarUrl: null,
          connectedAt: null,
          lastSyncAt: null,
          repoCount: 0,
          accountId: null,
          demoMode: false,
        }
      }
      const repoCount = await this.prisma.githubRepository.count({ where: { accountId: account.id } })
      return {
        connected: true,
        username: account.username,
        avatarUrl: account.avatarUrl,
        connectedAt: account.createdAt.toISOString(),
        lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
        repoCount,
        accountId: account.id,
        demoMode: false,
      }
    } catch {
      return {
        connected: false,
        username: null,
        avatarUrl: null,
        connectedAt: null,
        lastSyncAt: null,
        repoCount: 0,
        accountId: null,
        demoMode: false,
      }
    }
  }

  async legacyConnect(_userId: string, _body: { token?: string; username?: string }) {
    throw new BadRequestException(
      'Conexión demo no disponible. Añada una cuenta GitHub con token OAuth o PAT.',
    )
  }

  async legacyDisconnect(userId: string) {
    const conn = await this.getLegacyConnection(userId)
    if (!conn.accountId) {
      return { deleted: false, message: 'No hay cuenta conectada' }
    }
    return this.remove(userId, conn.accountId)
  }

  async getOne(accountId: string) {
    const account = await this.findOrThrow(accountId)
    const repoCount = await this.prisma.githubRepository.count({ where: { accountId } })
    const repos = await this.prisma.githubRepository.findMany({
      where: { accountId },
      orderBy: { lastSyncAt: 'desc' },
    })
    return {
      account: { ...mapAccount(account), repoCount, connectionName: account.connectionName ?? account.label },
      repositories: repos.map(mapRepo),
    }
  }

  private async createPro(
    userId: string,
    body: {
      label?: string
      connectionName?: string
      username?: string
      token?: string
      authType?: string
      baseUrl?: string
      syncFrequency?: string
    },
  ) {
    const token = body.token?.trim()
    if (!token) throw new BadRequestException('Token GitHub obligatorio')
    const preview = await this.githubApi.validateToken(token, body.baseUrl)
    if (!preview.valid || !preview.user) {
      throw new BadRequestException(preview.error ?? 'No se pudo validar el token GitHub')
    }
    const tokenRef = this.vault.storeSecrets({ token })
    const account = await this.prisma.githubAccount.create({
      data: {
        label: body.label?.trim() || 'GitHub',
        connectionName: body.connectionName?.trim() || body.label?.trim() || 'GitHub',
        username: body.username?.trim() || preview.user.login,
        tokenRef,
        status: 'connected',
        authType: body.authType?.trim() || 'pat',
        baseUrl: body.baseUrl?.trim() || null,
        syncFrequency: body.syncFrequency?.trim() || 'manual',
        avatarUrl: preview.user.avatar_url,
        createdById: userId,
        lastValidatedAt: new Date(),
      },
    })
    await this.audit.create({
      userId,
      action: 'github.account.create',
      resource: 'github',
      resourceId: account.id,
      metadata: { username: account.username, authType: account.authType },
    })
    return { ...mapAccount(account), connectionName: account.connectionName ?? account.label, message: 'Cuenta GitHub añadida' }
  }

  private async validatePro(userId: string, accountId: string) {
    const account = await this.findOrThrow(accountId)
    const token = this.readToken(account.tokenRef)
    const result = await this.githubApi.validateToken(token, account.baseUrl)
    const updated = await this.prisma.githubAccount.update({
      where: { id: accountId },
      data: {
        status: result.valid ? 'connected' : 'invalid',
        lastValidatedAt: new Date(),
        lastError: result.valid ? null : result.error ?? 'Token inválido',
        avatarUrl: result.user?.avatar_url ?? account.avatarUrl,
        username: result.user?.login ?? account.username,
      },
    })
    const repoCount = await this.prisma.githubRepository.count({ where: { accountId } })
    await this.audit.create({
      userId,
      action: 'github.account.validate',
      resource: 'github',
      resourceId: accountId,
      metadata: { valid: result.valid, scopes: result.scopes, repoCount: result.repoCount },
    })
    return {
      valid: result.valid,
      account: { ...mapAccount(updated), repoCount, connectionName: updated.connectionName ?? updated.label },
      scopes: result.scopes,
      repoCount: result.repoCount,
      message: result.valid ? 'Conexión validada correctamente' : result.error ?? 'Token inválido',
    }
  }

  private async syncPro(
    userId: string,
    accountId: string,
    body?: { selectedRepoIds?: number[]; excludeArchived?: boolean },
  ) {
    const account = await this.findOrThrow(accountId)
    if (account.status !== 'connected') await this.validatePro(userId, accountId)
    const token = this.readToken(account.tokenRef)
    let repos = await this.githubApi.listAllRepos(token, account.baseUrl)
    if (body?.excludeArchived !== false) repos = repos.filter((r) => !r.archived)
    if (body?.selectedRepoIds?.length) {
      const selected = new Set(body.selectedRepoIds)
      repos = repos.filter((r) => selected.has(r.id))
    }
    let synced = 0
    for (const repo of repos) {
      await this.prisma.githubRepository.upsert({
        where: { accountId_fullName: { accountId, fullName: repo.full_name } },
        create: {
          id: `gh-repo-${repo.id}`,
          accountId,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          defaultBranch: repo.default_branch || 'main',
          language: repo.language,
          stars: repo.stargazers_count,
          visibility: repo.private ? 'private' : 'public',
          htmlUrl: repo.html_url,
          lastSyncAt: new Date(),
        },
        update: {
          description: repo.description,
          stars: repo.stargazers_count,
          language: repo.language,
          lastSyncAt: new Date(),
        },
      })
      synced++
    }
    const updated = await this.prisma.githubAccount.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date(), status: 'connected', lastError: null },
    })
    await this.audit.create({
      userId,
      action: 'github.account.sync',
      resource: 'github',
      resourceId: accountId,
      metadata: { synced },
    })
    await this.notifications.create(
      userId,
      'in_app',
      'Sincronización GitHub',
      `${synced} repositorios sincronizados para ${account.username}.`,
    )
    this.realtime.emitGithubSynced({ accountId, repoCount: synced })
    const items = await this.prisma.githubRepository.findMany({ where: { accountId } })
    return {
      synced,
      repos: items.map(mapRepo),
      account: { ...mapAccount(updated), repoCount: synced, connectionName: updated.connectionName ?? updated.label },
      lastSyncAt: updated.lastSyncAt?.toISOString(),
      message: `${synced} repositorios sincronizados`,
    }
  }

  private readToken = (tokenRef: string): string => {
    const secrets = this.vault.readSecrets(tokenRef)
    if (secrets.token) return secrets.token
    if (tokenRef.startsWith('demo:') || tokenRef === 'demo') {
      throw new BadRequestException('Token demo no permitido en PRO')
    }
    return tokenRef
  }

  private async findOrThrow(id: string) {
    const account = await this.prisma.githubAccount.findUnique({ where: { id } })
    if (!account) throw new NotFoundException('Cuenta GitHub no encontrada')
    return account
  }
}
