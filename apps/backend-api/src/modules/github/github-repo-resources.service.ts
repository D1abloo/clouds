import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { GithubApiClient } from './github-api.client'

export type RepoResourceSyncResult = {
  branches: number
  commits: number
  pullRequests: number
  webhooks: number
}

@Injectable()
export class GithubRepoResourcesService {
  private readonly logger = new Logger(GithubRepoResourcesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubApi: GithubApiClient,
  ) {}

  syncRepoResources = async (
    token: string,
    baseUrl: string | null | undefined,
    accountId: string,
    repoId: string,
    fullName: string,
    defaultBranch: string,
  ): Promise<RepoResourceSyncResult> => {
    const [owner, repo] = this.parseFullName(fullName)
    const result: RepoResourceSyncResult = { branches: 0, commits: 0, pullRequests: 0, webhooks: 0 }

    try {
      const branches = await this.githubApi.listBranches(token, owner, repo, baseUrl)
      for (const branch of branches) {
        const sha = branch.commit?.sha ?? null
        const message =
          branch.commit?.commit?.message?.slice(0, 500) ??
          (sha ? `HEAD ${sha.slice(0, 7)}` : branch.name)
        await this.prisma.githubBranch.upsert({
          where: { repoId_name: { repoId, name: branch.name } },
          create: {
            repoId,
            name: branch.name,
            isProtected: branch.protected,
            lastSha: sha,
            lastMessage: message,
          },
          update: {
            isProtected: branch.protected,
            lastSha: sha,
            lastMessage: message,
          },
        })
        result.branches++
      }
    } catch (err) {
      this.logger.warn(`Branches sync failed for ${fullName}: ${String(err)}`)
    }

    try {
      const commits = await this.githubApi.listCommits(token, owner, repo, baseUrl, defaultBranch)
      for (const commit of commits) {
        const data = {
          message: commit.commit.message?.slice(0, 500) ?? '',
          author: commit.commit.author?.name ?? 'unknown',
          branch: defaultBranch,
          committedAt: new Date(commit.commit.author?.date ?? Date.now()),
        }
        const existing = await this.prisma.githubCommit.findFirst({
          where: { repoId, sha: commit.sha },
        })
        if (existing) {
          await this.prisma.githubCommit.update({ where: { id: existing.id }, data })
        } else {
          await this.prisma.githubCommit.create({
            data: { repoId, sha: commit.sha, ...data },
          })
        }
        result.commits++
      }
    } catch (err) {
      this.logger.warn(`Commits sync failed for ${fullName}: ${String(err)}`)
    }

    try {
      const prs = await this.githubApi.listPullRequests(token, owner, repo, baseUrl)
      for (const pr of prs) {
        await this.prisma.githubPullRequest.upsert({
          where: { repoId_number: { repoId, number: pr.number } },
          create: {
            repoId,
            number: pr.number,
            title: pr.title,
            state: pr.state,
            author: pr.user?.login ?? 'unknown',
            baseBranch: pr.base.ref,
            headBranch: pr.head.ref,
            createdAt: new Date(pr.created_at),
          },
          update: {
            title: pr.title,
            state: pr.state,
            author: pr.user?.login ?? 'unknown',
            baseBranch: pr.base.ref,
            headBranch: pr.head.ref,
          },
        })
        result.pullRequests++
      }
    } catch (err) {
      this.logger.warn(`PRs sync failed for ${fullName}: ${String(err)}`)
    }

    try {
      const hooks = await this.githubApi.listRepoHooks(token, owner, repo, baseUrl)
      await this.prisma.githubWebhook.deleteMany({
        where: { repoId, event: { startsWith: 'remote:' } },
      })
      for (const hook of hooks) {
        const event = hook.events.length ? `remote:${hook.events.join(',')}` : 'remote:push'
        await this.prisma.githubWebhook.create({
          data: {
            accountId,
            repoId,
            event,
            url: hook.config.url,
            secretRef: '',
            isActive: hook.active,
          },
        })
        result.webhooks++
      }
    } catch (err) {
      this.logger.warn(`Webhooks sync failed for ${fullName}: ${String(err)}`)
    }

    return result
  }

  private parseFullName = (fullName: string): [string, string] => {
    const idx = fullName.indexOf('/')
    if (idx < 0) return [fullName, fullName]
    return [fullName.slice(0, idx), fullName.slice(idx + 1)]
  }
}
