import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { mapPullRequest } from './github-mappers'

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
}
