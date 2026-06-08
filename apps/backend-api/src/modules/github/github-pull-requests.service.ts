import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AppModeService } from '../../common/config/app-mode.service'
import { GithubDemoService } from './github-demo.service'
import { mapPullRequest } from './github-mappers'

@Injectable()
export class GithubPullRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demo: GithubDemoService,
    private readonly mode: AppModeService,
  ) {}

  async listByRepo(repoId: string) {
    const demoAllowed = this.mode.canUseDemoFallback()
    const mem = demoAllowed ? this.demo.getMemoryPullRequests(repoId) : null
    if (mem?.length) return { items: mem, demoMode: true }
    const items = await this.prisma.githubPullRequest.findMany({
      where: { repoId },
      orderBy: { createdAt: 'desc' },
    })
    if (items.length) return { items: items.map(mapPullRequest), demoMode: false }
    if (!demoAllowed) return { items: [], demoMode: false }
    const fallback = this.demo.getMemoryPullRequests(repoId)
    if (fallback) return { items: fallback, demoMode: true }
    throw new NotFoundException('Repositorio no encontrado')
  }
}
