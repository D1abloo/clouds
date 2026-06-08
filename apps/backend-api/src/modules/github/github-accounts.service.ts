import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { NotificationsService } from '../notifications/notifications.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { AppModeService } from '../../common/config/app-mode.service'
import { connectionRequired } from '../../common/utils/pro-connection.util'
import { GithubDemoService } from './github-demo.service'
import { mapAccount, mapDemoAccountProfile } from './github-mappers'
import { DEMO_GITHUB_ACCOUNT_ID, DEMO_GITHUB_REPOS } from './github-demo.data'

@Injectable()
export class GithubAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demo: GithubDemoService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
    private readonly mode: AppModeService,
  ) {}

  async list() {
    if (this.mode.isProMode() && !this.mode.canUseDemoFallback()) {
      const items = await this.prisma.githubAccount.findMany({ orderBy: { createdAt: 'desc' } })
      if (!items.length) {
        return {
          ...connectionRequired('GitHub', 'Conecte una cuenta GitHub con token OAuth o PAT'),
          demoMode: false,
        }
      }
      return { items: items.map(mapAccount), demoMode: false, proMode: true }
    }

    if (!this.demo.isDbReady() || !this.demo.isSessionActive()) {
      if (!this.demo.isSessionActive()) {
        return { items: [], demoMode: true }
      }
      return { items: [mapDemoAccountProfile()], demoMode: true }
    }
    const items = await this.prisma.githubAccount.findMany({ orderBy: { createdAt: 'desc' } })
    if (!items.length && this.demo.isSessionActive()) {
      return { items: [mapDemoAccountProfile()], demoMode: true }
    }
    return { items: items.map(mapAccount), demoMode: false }
  }

  async connectDemo(userId: string) {
    this.demo.activateSession()
    let synced = DEMO_GITHUB_REPOS.length
    if (this.demo.isDbReady()) {
      await this.demo.ensureDemoAccountInDatabase()
      try {
        await this.validate(userId, DEMO_GITHUB_ACCOUNT_ID)
        const sync = await this.sync(userId, DEMO_GITHUB_ACCOUNT_ID)
        synced = sync.synced
      } catch {
        /* memoria como respaldo */
      }
    }
    await this.recordDemoEvents(userId, 'github.demo.connect', 'Cuenta GitHub demo conectada', synced)
    const account = mapDemoAccountProfile()
    const repos = this.demo.listMemoryRepos()
    return {
      demoMode: true,
      account,
      connection: {
        connected: true,
        username: account.username,
        avatarUrl: account.avatarUrl,
        connectedAt: account.createdAt,
        lastSyncAt: account.lastSyncAt,
        repoCount: synced,
        accountId: account.id,
        demoMode: true,
      },
      repos,
      synced,
      message: 'Cuenta GitHub Demo conectada — datos simulados listos',
    }
  }

  async create(
    userId: string,
    body: {
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
    },
  ) {
    const accountMeta = {
      organization: body.organization,
      accountType: body.accountType,
      authMethod: body.authMethod,
      scopes: body.scopes,
      environment: body.environment,
      autoSync: body.autoSync,
      syncInterval: body.syncInterval,
      repoScope: body.repoScope,
      webhookUrl: body.webhookUrl,
      webhookEvents: body.webhookEvents,
      description: body.description,
      contactEmail: body.contactEmail,
      useDemoData: body.useDemoData ?? !body.token?.trim(),
    }
    if (!this.demo.isDbReady()) {
      this.demo.activateSession()
      await this.recordDemoEvents(userId, 'github.account.create', 'Cuenta demo registrada (memoria)', undefined, undefined, accountMeta)
      const profile = mapDemoAccountProfile()
      const accountId = profile.id
      this.demo.setAccountSyncPermissions(accountId, {
        scopes: body.scopes,
        repoScope: body.repoScope,
        organization: body.organization,
        accountType: body.accountType,
      })
      return {
        ...profile,
        label: body.label?.trim() || profile.label,
        username: body.username?.trim() || profile.username,
        organization: body.organization?.trim() || profile.organization,
        accountTypeLabel: body.accountType === 'enterprise' ? 'Enterprise' : body.accountType === 'personal' ? 'Personal' : 'Organización',
        message: 'Cuenta GitHub demo activa',
      }
    }
    const username = body.username?.trim() || 'cloudops-demo'
    const tokenRef = body.token?.trim() || 'demo:cloudops'
    const account = await this.prisma.githubAccount.create({
      data: {
        label: body.label?.trim() || 'GitHub Demo Account',
        username,
        tokenRef,
        status: 'pending',
        avatarUrl: `https://github.com/${username}.png`,
        createdById: userId,
      },
    })
    await this.recordDemoEvents(userId, 'github.account.create', `Cuenta ${username} añadida`, undefined, account.id, accountMeta)
    this.demo.setAccountSyncPermissions(account.id, {
      scopes: body.scopes,
      repoScope: body.repoScope,
      organization: body.organization,
      accountType: body.accountType,
    })
    return {
      ...mapAccount(account),
      organization: body.organization?.trim() || mapAccount(account).organization,
      accountTypeLabel:
        body.accountType === 'enterprise'
          ? 'Enterprise Cloud'
          : body.accountType === 'personal'
            ? 'Personal'
            : body.accountType === 'organization'
              ? 'Organización'
              : mapAccount(account).accountTypeLabel,
      message: 'Cuenta GitHub añadida',
    }
  }

  async validate(userId: string, accountId: string) {
    if (!this.demo.isDbReady() || accountId === DEMO_GITHUB_ACCOUNT_ID) {
      const account = mapDemoAccountProfile()
      await this.recordDemoEvents(userId, 'github.account.validate', 'Conexión demo validada')
      return { valid: true, account, message: 'Conexión validada correctamente (demo)' }
    }
    const account = await this.findOrThrow(accountId)
    const valid = this.demo.isDemoToken(account.tokenRef) || account.tokenRef.length > 8
    const updated = await this.prisma.githubAccount.update({
      where: { id: accountId },
      data: { status: valid ? 'connected' : 'invalid', lastValidatedAt: new Date() },
    })
    await this.recordDemoEvents(userId, 'github.account.validate', 'Token validado', undefined, accountId)
    return {
      valid,
      account: mapAccount(updated),
      message: valid ? 'Conexión validada correctamente' : 'Token inválido',
    }
  }

  async sync(
    userId: string,
    accountId: string,
    body?: {
      scopes?: string[]
      repoScope?: string
      organization?: string
      accountType?: string
    },
  ) {
    const perms = {
      scopes: body?.scopes,
      repoScope: body?.repoScope,
      organization: body?.organization,
      accountType: body?.accountType,
    }
    if (!this.demo.isDbReady() || accountId === DEMO_GITHUB_ACCOUNT_ID) {
      const filter = this.demo.filterReposForAccount(accountId, perms)
      if (body && Object.keys(body).some((k) => body[k as keyof typeof body] != null)) {
        this.demo.setAccountSyncPermissions(accountId, this.demo.resolveSyncPermissions(accountId, perms))
      }
      const synced = filter.repos.length
      const account = mapDemoAccountProfile()
      const skipped = filter.skipped
      const detail =
        filter.reasons.length > 0
          ? `${synced} repos sincronizados · ${skipped} omitidos (${filter.reasons[0]})`
          : `${synced} repositorios sincronizados (demo)`
      await this.recordDemoEvents(userId, 'github.account.sync', detail, synced, accountId, {
        skipped,
        total: filter.total,
        reasons: filter.reasons,
        permissions: this.demo.resolveSyncPermissions(accountId, perms),
      })
      this.realtime.emitGithubSynced({ accountId: DEMO_GITHUB_ACCOUNT_ID, repoCount: synced })
      return {
        synced,
        skipped,
        total: filter.total,
        reasons: filter.reasons,
        repos: this.demo.listMemoryRepos(accountId, perms),
        account,
        lastSyncAt: account.lastSyncAt,
        message: detail,
        demoMode: true,
      }
    }
    const account = await this.findOrThrow(accountId)
    if (account.status !== 'connected') {
      await this.validate(userId, accountId)
    }
    if (body && Object.keys(body).some((k) => body[k as keyof typeof body] != null)) {
      this.demo.setAccountSyncPermissions(accountId, this.demo.resolveSyncPermissions(accountId, perms))
    }
    const filter = this.demo.filterReposForAccount(accountId, perms)
    const synced = await this.demo.populateAccount(accountId, perms)
    const updated = await this.prisma.githubAccount.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date(), status: 'connected' },
    })
    await this.recordDemoEvents(
      userId,
      'github.account.sync',
      `${synced} repositorios sincronizados${filter.skipped ? ` · ${filter.skipped} omitidos por permisos` : ''}`,
      synced,
      accountId,
      { skipped: filter.skipped, reasons: filter.reasons },
    )
    await this.notifications.create(
      userId,
      'in_app',
      'Sincronización GitHub',
      `${synced} repositorios sincronizados para ${account.username}${filter.skipped ? ` (${filter.skipped} no accesibles)` : ''}.`,
    )
    this.realtime.emitGithubSynced({ accountId, repoCount: synced })
    return {
      synced,
      skipped: filter.skipped,
      total: filter.total,
      reasons: filter.reasons,
      repos: this.demo.listMemoryRepos(accountId),
      account: mapAccount(updated),
      lastSyncAt: updated.lastSyncAt?.toISOString(),
      message: `${synced} repositorios sincronizados según permisos del token`,
    }
  }

  async remove(userId: string, accountId: string) {
    if (!this.demo.isDbReady() || accountId === DEMO_GITHUB_ACCOUNT_ID) {
      this.demo.deactivateSession()
      await this.recordDemoEvents(userId, 'github.account.delete', 'Cuenta demo desconectada')
      return { deleted: true, message: 'Cuenta demo desconectada' }
    }
    await this.findOrThrow(accountId)
    await this.prisma.githubAccount.delete({ where: { id: accountId } })
    await this.recordDemoEvents(userId, 'github.account.delete', 'Cuenta eliminada', undefined, accountId)
    return { deleted: true, message: 'Cuenta eliminada' }
  }

  async getLegacyConnection(userId: string) {
    void userId
    if (this.mode.isProMode() && !this.mode.canUseDemoFallback()) {
      try {
        const account = await this.prisma.githubAccount.findFirst({
          where: { status: 'connected' },
          orderBy: { lastSyncAt: 'desc' },
        })
        if (!account) {
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
    if (!this.demo.isSessionActive()) {
      return {
        connected: false,
        username: null,
        avatarUrl: null,
        connectedAt: null,
        lastSyncAt: null,
        repoCount: 0,
        accountId: null,
        demoMode: true,
      }
    }
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
    try {
      const account = await this.prisma.githubAccount.findFirst({
        where: { status: 'connected' },
        orderBy: { lastSyncAt: 'desc' },
      })
      if (!account) {
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
      const repoCount = await this.prisma.githubRepository.count({ where: { accountId: account.id } })
      return {
        connected: true,
        username: account.username,
        avatarUrl: account.avatarUrl,
        connectedAt: account.createdAt.toISOString(),
        lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
        repoCount,
        accountId: account.id,
        demoMode: account.id === DEMO_GITHUB_ACCOUNT_ID,
      }
    } catch {
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
  }

  async legacyConnect(userId: string, body: { token?: string; username?: string }) {
    void body
    return this.connectDemo(userId)
  }

  async legacyDisconnect(userId: string) {
    return this.remove(userId, DEMO_GITHUB_ACCOUNT_ID)
  }

  private async recordDemoEvents(
    userId: string,
    action: string,
    notificationBody: string,
    repoCount?: number,
    resourceId?: string,
    extraMeta?: Record<string, unknown>,
  ) {
    try {
      await this.audit.create({
        userId,
        action,
        resource: 'github',
        resourceId: resourceId ?? DEMO_GITHUB_ACCOUNT_ID,
        metadata: {
          demo: true,
          ...(repoCount != null ? { repoCount } : {}),
          ...(extraMeta ?? {}),
        },
      })
      await this.notifications.create(userId, 'in_app', 'GitHub', notificationBody)
    } catch {
      /* sin BD */
    }
  }

  private async findOrThrow(id: string) {
    const account = await this.prisma.githubAccount.findUnique({ where: { id } })
    if (!account) throw new NotFoundException('Cuenta GitHub no encontrada')
    return account
  }
}
