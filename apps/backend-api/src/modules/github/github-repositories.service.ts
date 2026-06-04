import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { GithubDemoService } from './github-demo.service'
import { mapRepo } from './github-mappers'
import { DEMO_GITHUB_REPOS, resolveDemoSlugFromRepoId } from './github-demo.data'

@Injectable()
export class GithubRepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demo: GithubDemoService,
    private readonly audit: AuditService,
  ) {}

  async list(accountId?: string) {
    if (!this.demo.isDbReady()) {
      return {
        connected: true,
        demoMode: true,
        items: this.demo.listMemoryRepos(),
        lastSyncAt: new Date().toISOString(),
      }
    }
    try {
      const accounts = await this.prisma.githubAccount.findMany()
      const connected = accounts.some((a) => a.status === 'connected')
      const items = await this.prisma.githubRepository.findMany({
        where: accountId ? { accountId } : undefined,
        orderBy: { name: 'asc' },
      })
      if (items.length) {
        const lastSync = accounts
          .map((a) => a.lastSyncAt)
          .filter(Boolean)
          .sort((a, b) => (b!.getTime() - a!.getTime()))[0]
        return {
          connected: connected || true,
          items: items.map(mapRepo),
          lastSyncAt: lastSync?.toISOString() ?? null,
        }
      }
    } catch {
      /* fallback memoria */
    }
    return {
      connected: true,
      demoMode: true,
      items: this.demo.listMemoryRepos(),
      lastSyncAt: new Date().toISOString(),
    }
  }

  async getOne(repoId: string) {
    const mem = this.demo.getMemoryRepo(repoId)
    if (mem) return mem
    const repo = await this.prisma.githubRepository.findUnique({ where: { id: repoId } })
    if (!repo) throw new NotFoundException('Repositorio no encontrado')
    return mapRepo(repo)
  }

  async syncOne(userId: string, repoId: string) {
    const slug = resolveDemoSlugFromRepoId(repoId)
    const mem = this.demo.getMemoryRepo(repoId)
    if (mem && slug && !this.demo.isDbReady()) {
      return { repo: mem, message: 'Repositorio sincronizado (demo en memoria)' }
    }
    const repo = await this.prisma.githubRepository.findUnique({ where: { id: repoId } })
    if (!repo) {
      if (mem && slug) {
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
