import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { SecretsVaultService } from '../cloud-accounts/secrets-vault.service'
import { connectionRequired } from '../../common/utils/pro-connection.util'
import { mapRepo, isDemoGithubAccount } from './github-mappers'
import { GithubRepoResourcesService } from './github-repo-resources.service'

@Injectable()
export class GithubRepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly vault: SecretsVaultService,
    private readonly repoResources: GithubRepoResourcesService,
  ) {}

  async list(accountId?: string, userId?: string) {
    try {
      const accounts = await this.prisma.githubAccount.findMany({
        where: userId ? { createdById: userId } : undefined,
      })
      const liveAccounts = accounts.filter((a) => !isDemoGithubAccount(a))
      if (accountId && userId && !liveAccounts.some((a) => a.id === accountId)) {
        throw new ForbiddenException('Sin acceso a esta cuenta GitHub')
      }
      const connected = liveAccounts.some((a) => a.status === 'connected')
      const liveAccountIds = liveAccounts.map((a) => a.id)
      const items = await this.prisma.githubRepository.findMany({
        where: accountId
          ? { accountId }
          : liveAccountIds.length
            ? { accountId: { in: liveAccountIds } }
            : { accountId: '__none__' },
        orderBy: { name: 'asc' },
      })
      if (items.length) {
        const lastSync = liveAccounts
          .map((a) => a.lastSyncAt)
          .filter(Boolean)
          .sort((a, b) => (b!.getTime() - a!.getTime()))[0]
        return {
          connected: connected || true,
          demoMode: false,
          items: items.map(mapRepo),
          lastSyncAt: lastSync?.toISOString() ?? null,
        }
      }
      return {
        ...connectionRequired('GitHub', 'Conecte una cuenta GitHub con token OAuth o PAT'),
        connected: false,
        demoMode: false,
        lastSyncAt: null,
      }
    } catch {
      return {
        connected: false,
        demoMode: false,
        items: [],
        lastSyncAt: null,
      }
    }
  }

  async getOne(repoId: string) {
    const repo = await this.prisma.githubRepository.findUnique({ where: { id: repoId } })
    if (!repo) throw new NotFoundException('Repositorio no encontrado')
    return mapRepo(repo)
  }

  async syncOne(userId: string, repoId: string) {
    const repo = await this.prisma.githubRepository.findUnique({
      where: { id: repoId },
      include: { account: true },
    })
    if (!repo) throw new NotFoundException('Repositorio no encontrado')
    const secrets = this.vault.readSecrets(repo.account.tokenRef)
    const token = secrets.token ?? repo.account.tokenRef
    const resources = await this.repoResources.syncRepoResources(
      token,
      repo.account.baseUrl,
      repo.accountId,
      repoId,
      repo.fullName,
      repo.defaultBranch,
    )
    const updated = await this.prisma.githubRepository.update({
      where: { id: repoId },
      data: { lastSyncAt: new Date() },
    })
    await this.audit.create({
      userId,
      action: 'github.repository.sync',
      resource: 'github_repo',
      resourceId: repoId,
      metadata: resources,
    })
    return {
      repo: mapRepo(updated),
      resources,
      message: `Repositorio sincronizado · ${resources.branches} ramas · ${resources.commits} commits · ${resources.pullRequests} PRs`,
    }
  }
}
