import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { mapBranch } from './github-mappers'

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
}
