import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { mapBranch } from './github-mappers'
import { githubRepoIdsForUser } from './github-user-scope.util'

@Injectable()
export class GithubBranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByRepo(repoId: string) {
    const items = await this.prisma.githubBranch.findMany({
      where: { repoId },
      orderBy: { name: 'asc' },
    })
    if (!items.length) {
      const repo = await this.prisma.githubRepository.findUnique({ where: { id: repoId } })
      if (!repo) throw new NotFoundException('Repositorio no encontrado')
      return { items: [], demoMode: false }
    }
    return { items: items.map(mapBranch), demoMode: false }
  }

  async listAll(userId?: string) {
    const repoIds = userId ? await githubRepoIdsForUser(this.prisma, userId) : undefined
    const items = await this.prisma.githubBranch.findMany({
      where: repoIds ? { repoId: { in: repoIds.length ? repoIds : ['__none__'] } } : undefined,
      include: { repo: true },
      orderBy: [{ repo: { fullName: 'asc' } }, { name: 'asc' }],
    })
    return {
      items: items.map((b) => ({
        ...mapBranch(b),
        repoId: b.repoId,
        repoFullName: b.repo.fullName,
        provider: 'github' as const,
        default: b.name === b.repo.defaultBranch,
        lastCommitAt: b.repo.lastSyncAt?.toISOString() ?? b.repo.createdAt.toISOString(),
      })),
      demoMode: false,
    }
  }
}
