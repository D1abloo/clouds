import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { AppModeService } from '../../common/config/app-mode.service'
import { connectionRequired } from '../../common/utils/pro-connection.util'
import { GithubDemoService } from './github-demo.service'
import { mapRepo, isDemoGithubAccount } from './github-mappers'
import { DEMO_GITHUB_REPOS, resolveDemoSlugFromRepoId } from './github-demo.data'

@Injectable()
export class GithubRepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demo: GithubDemoService,
    private readonly audit: AuditService,
    private readonly mode: AppModeService,
  ) {}

  async list(accountId?: string) {
    const demoAllowed = this.mode.canUseDemoFallback()

    if (!this.demo.isDbReady()) {
      if (!demoAllowed) {
        return {
          ...connectionRequired('GitHub', 'Conecte una cuenta GitHub con token OAuth o PAT'),
          connected: false,
          demoMode: false,
          lastSyncAt: null,
        }
      }
      return {
        connected: true,
        demoMode: true,
        items: this.demo.listMemoryRepos(),
        lastSyncAt: new Date().toISOString(),
      }
    }
    try {
      const accounts = await this.prisma.githubAccount.findMany()
      const liveAccounts = demoAllowed
        ? accounts
        : accounts.filter((a) => !isDemoGithubAccount(a))
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
      if (!demoAllowed) {
        return {
          ...connectionRequired('GitHub', 'Conecte una cuenta GitHub con token OAuth o PAT'),
          connected: false,
          demoMode: false,
          lastSyncAt: null,
        }
      }
    } catch {
      if (!demoAllowed) {
        return {
          connected: false,
          demoMode: false,
          items: [],
          lastSyncAt: null,
        }
      }
    }
    return {
      connected: true,
      demoMode: true,
      items: this.demo.listMemoryRepos(),
      lastSyncAt: new Date().toISOString(),
    }
  }

  async getOne(repoId: string) {
    const demoAllowed = this.mode.canUseDemoFallback()
    const mem = demoAllowed ? this.demo.getMemoryRepo(repoId) : null
    if (mem) return mem
    const repo = await this.prisma.githubRepository.findUnique({ where: { id: repoId } })
    if (!repo) throw new NotFoundException('Repositorio no encontrado')
    return mapRepo(repo)
  }

  async syncOne(userId: string, repoId: string) {
    const demoAllowed = this.mode.canUseDemoFallback()
    const slug = resolveDemoSlugFromRepoId(repoId)
    const mem = demoAllowed ? this.demo.getMemoryRepo(repoId) : null
    if (mem && slug && !this.demo.isDbReady()) {
      return { repo: mem, message: 'Repositorio sincronizado (demo en memoria)' }
    }
    const repo = await this.prisma.githubRepository.findUnique({ where: { id: repoId } })
    if (!repo) {
      if (mem && slug && demoAllowed) {
        await this.demo.syncRepoChildren(repoId, slug).catch(() => undefined)
        return { repo: mem, message: 'Repositorio sincronizado (demo)' }
      }
      throw new NotFoundException('Repositorio no encontrado')
    }
    const demoKey =
      DEMO_GITHUB_REPOS.find((d) => d.fullName === repo.fullName)?.id ??
      repo.name.replace(/-/g, '')
    await this.demo.syncRepoChildren(repo.id, demoKey)
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
