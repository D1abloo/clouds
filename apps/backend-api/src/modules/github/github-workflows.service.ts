import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { SecretsVaultService } from '../cloud-accounts/secrets-vault.service'
import { GithubApiClient } from './github-api.client'
import { mapWorkflowRun } from './github-mappers'
import { githubRepoIdsForUser } from './github-user-scope.util'

const MAX_REPOS = 12

@Injectable()
export class GithubWorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: SecretsVaultService,
    private readonly githubApi: GithubApiClient,
  ) {}

  async listForUser(userId: string) {
    const repoIds = await githubRepoIdsForUser(this.prisma, userId)
    if (!repoIds.length) return { items: [], demoMode: false }

    const repos = await this.prisma.githubRepository.findMany({
      where: { id: { in: repoIds.slice(0, MAX_REPOS) } },
      include: { account: true },
      orderBy: { lastSyncAt: 'desc' },
    })

    const items: ReturnType<typeof mapWorkflowRun>[] = []
    for (const repo of repos) {
      if (repo.account.status !== 'connected') continue
      try {
        const token = this.readToken(repo.account.tokenRef)
        const [owner, name] = repo.fullName.split('/')
        const runs = await this.githubApi.listWorkflowRuns(token, owner, name, repo.account.baseUrl)
        for (const run of runs) {
          items.push(mapWorkflowRun(run, repo.fullName))
        }
      } catch {
        /* skip repo */
      }
    }

    items.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    return { items: items.slice(0, 50), demoMode: false }
  }

  private readToken = (tokenRef: string): string => {
    const secrets = this.vault.readSecrets(tokenRef)
    return secrets.token?.trim() ?? tokenRef
  }
}
