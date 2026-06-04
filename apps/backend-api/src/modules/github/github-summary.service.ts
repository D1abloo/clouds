import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { GithubDemoService } from './github-demo.service'
import { mapRepo } from './github-mappers'

@Injectable()
export class GithubSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demo: GithubDemoService,
  ) {}

  demoSummary() {
    return this.demo.demoSummary()
  }

  async summaryForInventory() {
    if (!this.demo.isDbReady()) {
      return this.demo.demoSummary()
    }
    try {
      const account = await this.prisma.githubAccount.findFirst({
        orderBy: { lastSyncAt: 'desc' },
      })
      const repos = await this.prisma.githubRepository.findMany({ orderBy: { name: 'asc' } })
      if (!repos.length) {
        return this.demo.demoSummary()
      }
      const [branchCount, commitCount, openPrs, webhookCount, deploymentCount] = await Promise.all([
        this.prisma.githubBranch.count(),
        this.prisma.githubCommit.count(),
        this.prisma.githubPullRequest.count({ where: { state: 'open' } }),
        this.prisma.githubWebhook.count(),
        this.prisma.githubDeployment.count(),
      ])
      return {
        connected: account?.status === 'connected',
        username: account?.username ?? null,
        repoCount: repos.length,
        branchCount,
        commitCount,
        openPullRequests: openPrs,
        webhookCount,
        deploymentCount,
        repoItems: repos.map(mapRepo),
        lastSyncAt: account?.lastSyncAt?.toISOString() ?? null,
      }
    } catch {
      return this.demo.demoSummary()
    }
  }
}
