import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { GithubDemoService } from './github-demo.service'
import { mapCommit } from './github-mappers'

@Injectable()
export class GithubCommitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demo: GithubDemoService,
  ) {}

  async listByRepo(repoId: string, branch?: string) {
    const mem = this.demo.getMemoryCommits(repoId, branch)
    if (mem?.length) return { items: mem, demoMode: true }
    const items = await this.prisma.githubCommit.findMany({
      where: { repoId, ...(branch ? { branch } : {}) },
      orderBy: { committedAt: 'desc' },
      take: 50,
    })
    if (items.length) return { items: items.map(mapCommit) }
    const fallback = this.demo.getMemoryCommits(repoId, branch)
    if (fallback) return { items: fallback, demoMode: true }
    throw new NotFoundException('Repositorio no encontrado')
  }
}
