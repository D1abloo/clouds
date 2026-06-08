import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AppModeService } from '../../common/config/app-mode.service'
import { GithubDemoService } from './github-demo.service'
import { mapRepo } from './github-mappers'
import { emptyGithubInventorySummary } from '../../common/utils/demo-runtime.util'

@Injectable()
export class GithubSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demo: GithubDemoService,
    private readonly mode: AppModeService,
  ) {}

  demoSummary() {
    return this.demo.demoSummary()
  }

  async summaryForInventory() {
    const demoAllowed = this.mode.canUseDemoFallback()

    if (!this.demo.isDbReady()) {
      return demoAllowed ? this.demo.demoSummary() : emptyGithubInventorySummary()
    }
    try {
      const account = await this.prisma.githubAccount.findFirst({
        orderBy: { lastSyncAt: 'desc' },
      })
      const repos = await this.prisma.githubRepository.findMany({ orderBy: { name: 'asc' } })
      if (!repos.length) {
        return demoAllowed ? this.demo.demoSummary() : emptyGithubInventorySummary()
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
        demoMode: false,
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
      return demoAllowed ? this.demo.demoSummary() : emptyGithubInventorySummary()
    }
  }
}
