import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { mapPullRequest } from './github-mappers'
import { githubRepoIdsForUser } from './github-user-scope.util'

@Injectable()
export class GithubPullRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByRepo(repoId: string) {
    const items = await this.prisma.githubPullRequest.findMany({
      where: { repoId },
      orderBy: { createdAt: 'desc' },
    })
    if (!items.length) {
      const repo = await this.prisma.githubRepository.findUnique({ where: { id: repoId } })
      if (!repo) throw new NotFoundException('Repositorio no encontrado')
      return { items: [], demoMode: false }
    }
    return { items: items.map(mapPullRequest), demoMode: false }
  }

  async listAll(userId?: string) {
    const repoIds = userId ? await githubRepoIdsForUser(this.prisma, userId) : undefined
    const items = await this.prisma.githubPullRequest.findMany({
      where: repoIds ? { repoId: { in: repoIds.length ? repoIds : ['__none__'] } } : undefined,
      include: { repo: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return {
      items: items.map((pr) => ({
        ...mapPullRequest(pr),
        repoId: pr.repoId,
        repoFullName: pr.repo.fullName,
        provider: 'github' as const,
      })),
      demoMode: false,
    }
  }
}
