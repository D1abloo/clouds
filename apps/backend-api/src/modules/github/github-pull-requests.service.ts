import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { GithubDemoService } from './github-demo.service'
import { mapPullRequest } from './github-mappers'

@Injectable()
export class GithubPullRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demo: GithubDemoService,
  ) {}

  async listByRepo(repoId: string) {
    const mem = this.demo.getMemoryPullRequests(repoId)
    if (mem?.length) return { items: mem, demoMode: true }
    const items = await this.prisma.githubPullRequest.findMany({
      where: { repoId },
      orderBy: { createdAt: 'desc' },
    })
    if (items.length) return { items: items.map(mapPullRequest) }
    const fallback = this.demo.getMemoryPullRequests(repoId)
    if (fallback) return { items: fallback, demoMode: true }
    throw new NotFoundException('Repositorio no encontrado')
  }
}
