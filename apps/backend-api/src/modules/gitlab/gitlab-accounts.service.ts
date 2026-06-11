import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { NotificationsService } from '../notifications/notifications.service'
import { AppModeService } from '../../common/config/app-mode.service'
import { SecretsVaultService } from '../cloud-accounts/secrets-vault.service'
import { connectionRequired } from '../../common/utils/pro-connection.util'
import { GitlabApiClient } from './gitlab-api.client'
import { GitlabResourcesService } from './gitlab-resources.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { mapGitlabAccount, mapGitlabProject } from './gitlab-mappers'

@Injectable()
export class GitlabAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly mode: AppModeService,
    private readonly vault: SecretsVaultService,
    private readonly gitlab: GitlabApiClient,
    private readonly resources: GitlabResourcesService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(userId?: string) {
    const items = await this.prisma.gitlabAccount.findMany({
      where: userId ? { createdById: userId } : undefined,
      orderBy: { createdAt: 'desc' },
    })
    if (this.mode.isProMode() && !this.mode.canUseDemoFallback() && !items.length) {
      return {
        ...connectionRequired('GitLab', 'Conecte una cuenta GitLab con token PAT o OAuth'),
        demoMode: false,
      }
    }
    const mapped = await Promise.all(
      items.map(async (a) => {
        const repoCount = await this.prisma.gitlabProject.count({ where: { accountId: a.id } })
        return mapGitlabAccount(a, repoCount)
      }),
    )
    return { items: mapped, demoMode: false, proMode: this.mode.isProMode() }
  }

  async validatePreview(
    userId: string,
    body: { token: string; baseUrl?: string; authType?: string },
  ) {
    const token = body.token?.trim()
    if (!token) throw new BadRequestException('Token GitLab obligatorio')
    const result = await this.gitlab.validateToken(token, body.baseUrl, body.authType)
    await this.audit.create({
      userId,
      action: result.valid ? 'gitlab.validate_preview' : 'gitlab.validate_preview_failed',
      resource: 'gitlab',
      metadata: { scopes: result.scopes, projectCount: result.projectCount },
    })
    return {
      valid: result.valid,
      username: result.user?.username ?? null,
      avatarUrl: result.user?.avatar_url ?? null,
      scopes: result.scopes,
      repoCount: result.projectCount,
      message: result.valid
        ? `Conexión válida · ${result.projectCount} proyectos accesibles`
        : result.error ?? 'Token inválido',
    }
  }

  async previewProjects(body: {
    token: string
    baseUrl?: string
    excludeArchived?: boolean
    authType?: string
  }) {
    const token = body.token?.trim()
    if (!token) throw new BadRequestException('Token GitLab obligatorio')
    let projects = await this.gitlab.listAllProjects(token, body.baseUrl, 5, body.authType)
    if (body.excludeArchived !== false) projects = projects.filter((p) => !p.archived)
    return {
      items: projects.map((p) => ({
        id: p.id,
        name: p.name,
        fullName: p.path_with_namespace,
        archived: p.archived,
        description: p.description ?? '',
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
    const token = body.token?.trim()
    if (!token) throw new BadRequestException('Token GitLab obligatorio')
    const preview = await this.gitlab.validateToken(token, body.baseUrl, body.authType)
    if (!preview.valid || !preview.user) {
      throw new BadRequestException(preview.error ?? 'No se pudo validar el token GitLab')
    }
    const tokenRef = this.vault.storeSecrets({ token })
    const account = await this.prisma.gitlabAccount.create({
      data: {
        label: body.label?.trim() || 'GitLab',
        connectionName: body.connectionName?.trim() || body.label?.trim() || 'GitLab',
        username: body.username?.trim() || preview.user.username,
        tokenRef,
        status: 'connected',
        authType: body.authType?.trim() || 'pat',
        baseUrl: body.baseUrl?.trim() || 'https://gitlab.com',
        syncFrequency: body.syncFrequency?.trim() || 'manual',
        avatarUrl: preview.user.avatar_url,
        createdById: userId,
        lastValidatedAt: new Date(),
      },
    })
    await this.audit.create({
      userId,
      action: 'gitlab.account.create',
      resource: 'gitlab',
      resourceId: account.id,
      metadata: { username: account.username, authType: account.authType },
    })
    return { ...mapGitlabAccount(account, 0), message: 'Cuenta GitLab añadida' }
  }

  async validate(userId: string, accountId: string) {
    const account = await this.findOrThrow(accountId)
    const token = this.readToken(account.tokenRef)
    const result = await this.gitlab.validateToken(token, account.baseUrl, account.authType)
    const updated = await this.prisma.gitlabAccount.update({
      where: { id: accountId },
      data: {
        status: result.valid ? 'connected' : 'invalid',
        lastValidatedAt: new Date(),
        lastError: result.valid ? null : result.error ?? 'Token inválido',
        avatarUrl: result.user?.avatar_url ?? account.avatarUrl,
        username: result.user?.username ?? account.username,
      },
    })
    await this.audit.create({
      userId,
      action: 'gitlab.account.validate',
      resource: 'gitlab',
      resourceId: accountId,
      metadata: { valid: result.valid, scopes: result.scopes, repoCount: result.projectCount },
    })
    return {
      valid: result.valid,
      account: mapGitlabAccount(updated, await this.prisma.gitlabProject.count({ where: { accountId } })),
      scopes: result.scopes,
      repoCount: result.projectCount,
      message: result.valid ? 'Conexión validada correctamente' : result.error ?? 'Token inválido',
    }
  }

  async sync(
    userId: string,
    accountId: string,
    body?: { selectedProjectIds?: number[]; excludeArchived?: boolean },
  ) {
    const account = await this.findOrThrow(accountId)
    if (account.status !== 'connected') await this.validate(userId, accountId)
    const token = this.readToken(account.tokenRef)
    let projects = await this.gitlab.listAllProjects(token, account.baseUrl, 5, account.authType)
    if (body?.excludeArchived !== false) projects = projects.filter((p) => !p.archived)
    if (body?.selectedProjectIds?.length) {
      const selected = new Set(body.selectedProjectIds)
      projects = projects.filter((p) => selected.has(p.id))
    }
    let synced = 0
    for (const project of projects) {
      await this.prisma.gitlabProject.upsert({
        where: {
          accountId_pathWithNamespace: {
            accountId,
            pathWithNamespace: project.path_with_namespace,
          },
        },
        create: {
          id: `gl-proj-${project.id}`,
          accountId,
          name: project.name,
          pathWithNamespace: project.path_with_namespace,
          description: project.description,
          defaultBranch: project.default_branch || 'main',
          visibility: project.visibility,
          webUrl: project.web_url,
          lastSyncAt: new Date(),
        },
        update: {
          description: project.description,
          defaultBranch: project.default_branch || 'main',
          visibility: project.visibility,
          webUrl: project.web_url,
          lastSyncAt: new Date(),
        },
      })
      synced++
      this.realtime.emitGitlabSyncProgress({
        accountId,
        step: 'project',
        message: `Proyecto ${project.path_with_namespace} sincronizado`,
        percent: Math.round((synced / Math.max(projects.length, 1)) * 100),
      })
    }
    const updated = await this.prisma.gitlabAccount.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date(), status: 'connected', lastError: null },
    })
    this.realtime.emitGitlabSynced({ accountId, projectCount: synced })
    await this.audit.create({
      userId,
      action: 'gitlab.account.sync',
      resource: 'gitlab',
      resourceId: accountId,
      metadata: { synced },
    })
    await this.notifications.create(
      userId,
      'in_app',
      'Sincronización GitLab',
      `${synced} proyectos sincronizados para ${account.username}.`,
    )
    const items = await this.prisma.gitlabProject.findMany({ where: { accountId } })
    const counts = await this.resources.countResourcesForAccount(accountId)
    return {
      synced,
      projects: items.map(mapGitlabProject),
      account: mapGitlabAccount(updated, synced),
      lastSyncAt: updated.lastSyncAt?.toISOString(),
      branchesSynced: counts.branches,
      commitsSynced: counts.commits,
      mergeRequestsSynced: counts.mergeRequests,
      webhooksSynced: counts.webhooks,
      deploymentsSynced: counts.deployments,
      message: `${synced} proyectos sincronizados · ${counts.branches} ramas · ${counts.mergeRequests} MRs`,
    }
  }

  async remove(userId: string, accountId: string) {
    await this.findOrThrow(accountId)
    await this.prisma.gitlabAccount.delete({ where: { id: accountId } })
    await this.audit.create({
      userId,
      action: 'gitlab.account.delete',
      resource: 'gitlab',
      resourceId: accountId,
    })
    return { deleted: true, message: 'Cuenta GitLab eliminada' }
  }

  async getOne(accountId: string) {
    const account = await this.findOrThrow(accountId)
    const repoCount = await this.prisma.gitlabProject.count({ where: { accountId } })
    const projects = await this.prisma.gitlabProject.findMany({
      where: { accountId },
      orderBy: { lastSyncAt: 'desc' },
    })
    return {
      account: mapGitlabAccount(account, repoCount),
      projects: projects.map(mapGitlabProject),
    }
  }

  async listProjects(accountId?: string) {
    const where = accountId ? { accountId } : {}
    const items = await this.prisma.gitlabProject.findMany({ where, orderBy: { name: 'asc' } })
    return { items: items.map(mapGitlabProject) }
  }

  private readToken = (tokenRef: string): string => {
    const secrets = this.vault.readSecrets(tokenRef)
    const token = secrets.token?.trim()
    if (!token) throw new BadRequestException('Token GitLab no disponible')
    return token
  }

  private async findOrThrow(id: string) {
    const account = await this.prisma.gitlabAccount.findUnique({ where: { id } })
    if (!account) throw new NotFoundException('Cuenta GitLab no encontrada')
    return account
  }
}
