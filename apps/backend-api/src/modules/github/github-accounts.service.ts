import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { NotificationsService } from '../notifications/notifications.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { GithubDemoService } from './github-demo.service'
import { mapAccount } from './github-mappers'
import { DEMO_GITHUB_ACCOUNT_ID, DEMO_GITHUB_REPOS } from './github-demo.data'

@Injectable()
export class GithubAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demo: GithubDemoService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list() {
    if (!this.demo.isDbReady()) {
      return {
        items: [
          {
            id: DEMO_GITHUB_ACCOUNT_ID,
            label: 'GitHub Demo',
            username: 'cloudops-demo',
            status: 'connected',
            avatarUrl: 'https://github.com/cloudops-demo.png',
            lastValidatedAt: new Date().toISOString(),
            lastSyncAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
        demoMode: true,
      }
    }
    const items = await this.prisma.githubAccount.findMany({ orderBy: { createdAt: 'desc' } })
    return { items: items.map(mapAccount) }
  }

  async create(
    userId: string,
    body: { label?: string; username?: string; token?: string },
  ) {
    const username = body.username?.trim() || 'cloudops-demo'
    const tokenRef = body.token?.trim() || 'demo:cloudops'
    const account = await this.prisma.githubAccount.create({
      data: {
        label: body.label?.trim() || 'GitHub',
        username,
        tokenRef,
        status: 'pending',
        avatarUrl: `https://github.com/${username}.png`,
        createdById: userId,
      },
    })
    await this.audit.create({
      userId,
      action: 'github.account.create',
      resource: 'github_account',
      resourceId: account.id,
      metadata: { username },
    })
    await this.notifications.create(
      userId,
      'in_app',
      'Cuenta GitHub añadida',
      `Se registró la cuenta ${username}. Valida la conexión para sincronizar.`,
    )
    return { ...mapAccount(account), message: 'Cuenta GitHub añadida' }
  }

  async validate(userId: string, accountId: string) {
    const account = await this.findOrThrow(accountId)
    const valid = this.demo.isDemoToken(account.tokenRef) || account.tokenRef.length > 8
    const updated = await this.prisma.githubAccount.update({
      where: { id: accountId },
      data: {
        status: valid ? 'connected' : 'invalid',
        lastValidatedAt: new Date(),
      },
    })
    await this.audit.create({
      userId,
      action: 'github.account.validate',
      resource: 'github_account',
      resourceId: accountId,
      metadata: { valid },
    })
    return {
      valid,
      account: mapAccount(updated),
      message: valid ? 'Conexión validada correctamente' : 'Token inválido',
    }
  }

  async sync(userId: string, accountId: string) {
    const account = await this.findOrThrow(accountId)
    if (account.status !== 'connected') {
      await this.validate(userId, accountId)
    }
    const synced = await this.demo.populateAccount(accountId)
    const updated = await this.prisma.githubAccount.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date(), status: 'connected' },
    })
    await this.audit.create({
      userId,
      action: 'github.account.sync',
      resource: 'github_account',
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
    return {
      synced,
      account: mapAccount(updated),
      lastSyncAt: updated.lastSyncAt?.toISOString(),
      message: `${synced} repositorios sincronizados`,
    }
  }

  async remove(userId: string, accountId: string) {
    await this.findOrThrow(accountId)
    await this.prisma.githubAccount.delete({ where: { id: accountId } })
    await this.audit.create({
      userId,
      action: 'github.account.delete',
      resource: 'github_account',
      resourceId: accountId,
    })
    return { deleted: true, message: 'Cuenta eliminada' }
  }

  async getLegacyConnection(userId: string) {
    void userId
    if (!this.demo.isDbReady()) {
      return {
        connected: true,
        username: 'cloudops-demo',
        avatarUrl: 'https://github.com/cloudops-demo.png',
        connectedAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString(),
        repoCount: DEMO_GITHUB_REPOS.length,
        accountId: DEMO_GITHUB_ACCOUNT_ID,
        demoMode: true,
      }
    }
    const account = await this.prisma.githubAccount.findFirst({
      where: { status: 'connected' },
      orderBy: { lastSyncAt: 'desc' },
    })
    if (!account) {
      const any = await this.prisma.githubAccount.findFirst({ orderBy: { createdAt: 'desc' } })
      if (!any) {
        const summary = this.demo.demoSummary()
        return {
          connected: summary.connected,
          username: summary.username,
          avatarUrl: 'https://github.com/cloudops-demo.png',
          connectedAt: new Date().toISOString(),
          lastSyncAt: summary.lastSyncAt,
          repoCount: summary.repoCount,
          accountId: DEMO_GITHUB_ACCOUNT_ID,
          demoMode: true,
        }
      }
      const repoCount = await this.prisma.githubRepository.count({ where: { accountId: any.id } })
      return {
        connected: any.status === 'connected',
        username: any.username,
        avatarUrl: any.avatarUrl,
        connectedAt: any.createdAt.toISOString(),
        lastSyncAt: any.lastSyncAt?.toISOString() ?? null,
        repoCount,
        accountId: any.id,
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
    }
  }

  async legacyConnect(userId: string, body: { token?: string; username?: string }) {
    const created = await this.create(userId, {
      username: body.username,
      token: body.token ?? 'demo:cloudops',
      label: 'GitHub principal',
    })
    await this.validate(userId, created.id)
    const sync = await this.sync(userId, created.id)
    return {
      connected: true,
      username: created.username,
      avatarUrl: created.avatarUrl,
      connectedAt: created.createdAt,
      lastSyncAt: sync.lastSyncAt,
      repoCount: sync.synced,
      message: 'Cuenta GitHub conectada (demo)',
    }
  }

  async legacyDisconnect(userId: string) {
    const accounts = await this.prisma.githubAccount.findMany()
    for (const a of accounts) {
      await this.prisma.githubAccount.delete({ where: { id: a.id } })
    }
    await this.audit.create({ userId, action: 'github.disconnect', resource: 'github' })
    return { connected: false, message: 'Cuenta desconectada' }
  }

  private async findOrThrow(id: string) {
    const account = await this.prisma.githubAccount.findUnique({ where: { id } })
    if (!account) throw new NotFoundException('Cuenta GitHub no encontrada')
    return account
  }
}
