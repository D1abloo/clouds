import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { mapCommit } from './github-mappers'

@Injectable()
export class GithubCommitsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByRepo(repoId: string, branch?: string) {
    const items = await this.prisma.githubCommit.findMany({
      where: { repoId, ...(branch ? { branch } : {}) },
      orderBy: { committedAt: 'desc' },
      take: 50,
    })
    if (!items.length) {
      const repo = await this.prisma.githubRepository.findUnique({ where: { id: repoId } })
      if (!repo) throw new NotFoundException('Repositorio no encontrado')
      return { items: [], demoMode: false }
    }
    return { items: items.map(mapCommit), demoMode: false }
  }
}
