import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { connectionRequired } from '../../common/utils/pro-connection.util'
import { mapRepo, isDemoGithubAccount } from './github-mappers'

@Injectable()
export class GithubRepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(accountId?: string) {
    try {
      const accounts = await this.prisma.githubAccount.findMany()
      const liveAccounts = accounts.filter((a) => !isDemoGithubAccount(a))
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
    const repo = await this.prisma.githubRepository.findUnique({ where: { id: repoId } })
    if (!repo) throw new NotFoundException('Repositorio no encontrado')
    const updated = await this.prisma.githubRepository.update({
      where: { id: repoId },
      data: { lastSyncAt: new Date() },
    })
    await this.audit.create({
      userId,
      action: 'github.repository.sync',
      resource: 'github_repo',
      resourceId: repoId,
    })
    return { repo: mapRepo(updated), message: 'Repositorio sincronizado' }
  }
}
