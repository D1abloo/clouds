import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AppModeService } from '../../common/config/app-mode.service'
import { GithubDemoService } from './github-demo.service'
import { mapBranch } from './github-mappers'

@Injectable()
export class GithubBranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demo: GithubDemoService,
    private readonly mode: AppModeService,
  ) {}

  async listByRepo(repoId: string) {
    const demoAllowed = this.mode.canUseDemoFallback()
    const mem = demoAllowed ? this.demo.getMemoryBranches(repoId) : null
    if (mem?.length) return { items: mem, demoMode: true }
    const items = await this.prisma.githubBranch.findMany({
      where: { repoId },
      orderBy: { name: 'asc' },
    })
    if (items.length) return { items: items.map(mapBranch), demoMode: false }
    if (!demoAllowed) return { items: [], demoMode: false }
    const fallback = this.demo.getMemoryBranches(repoId)
    if (fallback) return { items: fallback, demoMode: true }
    throw new NotFoundException('Repositorio no encontrado')
  }
}
