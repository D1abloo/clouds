import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { SecretsVaultService } from '../cloud-accounts/secrets-vault.service'
import { GitlabApiClient } from './gitlab-api.client'
import { gitlabAccountIdsForUser } from './gitlab-user-scope.util'

const MAX_PROJECTS = 25

@Injectable()
export class GitlabResourcesService {
  private readonly logger = new Logger(GitlabResourcesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: SecretsVaultService,
    private readonly gitlab: GitlabApiClient,
  ) {}

  private connectedAccounts = async (userId: string) => {
    const ids = await gitlabAccountIdsForUser(this.prisma, userId)
    if (!ids.length) return []
    return this.prisma.gitlabAccount.findMany({
      where: { id: { in: ids }, status: 'connected' },
    })
  }

  listBranches = async (userId: string) => {
    const items: Record<string, unknown>[] = []
    const accounts = await this.connectedAccounts(userId)
    for (const account of accounts) {
      const token = this.readToken(account.tokenRef)
      const projects = await this.prisma.gitlabProject.findMany({
        where: { accountId: account.id },
        take: MAX_PROJECTS,
      })
      for (const project of projects) {
        const projectId = this.parseProjectId(project.id)
        if (!projectId) continue
        try {
          const branches = await this.gitlab.listBranches(token, projectId, account.baseUrl, account.authType)
          for (const branch of branches) {
            const commit = branch.commit
            const sha = commit?.id ?? ''
            items.push({
              name: branch.name,
              protected: branch.protected,
              lastCommitSha: sha,
              lastCommitMessage: commit?.title ?? commit?.message ?? branch.name,
              lastCommitAt: commit?.committed_date ?? new Date().toISOString(),
              lastCommitAuthor: commit?.author_name ?? '',
              projectId: project.id,
              projectPath: project.pathWithNamespace,
              repoFullName: project.pathWithNamespace,
              provider: 'gitlab',
              default: branch.default === true || branch.name === project.defaultBranch,
            })
          }
        } catch (err) {
          this.logger.warn(`GitLab branches failed for ${project.pathWithNamespace}: ${String(err)}`)
        }
      }
    }
    return { items, demoMode: false }
  }

  listCommits = async (userId: string) => {
    const items: Record<string, unknown>[] = []
    const accounts = await this.connectedAccounts(userId)
    for (const account of accounts) {
      const token = this.readToken(account.tokenRef)
      const projects = await this.prisma.gitlabProject.findMany({
        where: { accountId: account.id },
        take: MAX_PROJECTS,
      })
      for (const project of projects) {
        const projectId = this.parseProjectId(project.id)
        if (!projectId) continue
        try {
          const commits = await this.gitlab.listCommits(
            token,
            projectId,
            account.baseUrl,
            project.defaultBranch,
            account.authType,
          )
          for (const commit of commits) {
            items.push({
              sha: commit.id,
              message: commit.title || commit.message,
              author: commit.author_name,
              date: commit.committed_date,
              branch: project.defaultBranch,
              projectId: project.id,
              projectPath: project.pathWithNamespace,
              repoFullName: project.pathWithNamespace,
              provider: 'gitlab',
            })
          }
        } catch (err) {
          this.logger.warn(`GitLab commits failed for ${project.pathWithNamespace}: ${String(err)}`)
        }
      }
    }
    return { items, demoMode: false }
  }

  listMergeRequests = async (userId: string) => {
    const items: Record<string, unknown>[] = []
    const accounts = await this.connectedAccounts(userId)
    for (const account of accounts) {
      const token = this.readToken(account.tokenRef)
      const projects = await this.prisma.gitlabProject.findMany({
        where: { accountId: account.id },
        take: MAX_PROJECTS,
      })
      for (const project of projects) {
        const projectId = this.parseProjectId(project.id)
        if (!projectId) continue
        try {
          const mrs = await this.gitlab.listMergeRequests(token, projectId, account.baseUrl, account.authType)
          for (const mr of mrs) {
            items.push({
              id: mr.iid,
              number: mr.iid,
              title: mr.title,
              state: mr.state,
              author: mr.author?.username ?? 'unknown',
              base: mr.target_branch,
              head: mr.source_branch,
              createdAt: mr.created_at,
              webUrl: mr.web_url,
              projectId: project.id,
              projectPath: project.pathWithNamespace,
              repoFullName: project.pathWithNamespace,
              provider: 'gitlab',
            })
          }
        } catch (err) {
          this.logger.warn(`GitLab MRs failed for ${project.pathWithNamespace}: ${String(err)}`)
        }
      }
    }
    return { items, demoMode: false }
  }

  listWebhooks = async (userId: string) => {
    const items: Record<string, unknown>[] = []
    const accounts = await this.connectedAccounts(userId)
    for (const account of accounts) {
      const token = this.readToken(account.tokenRef)
      const projects = await this.prisma.gitlabProject.findMany({
        where: { accountId: account.id },
        take: MAX_PROJECTS,
      })
      for (const project of projects) {
        const projectId = this.parseProjectId(project.id)
        if (!projectId) continue
        try {
          const hooks = await this.gitlab.listProjectHooks(token, projectId, account.baseUrl, account.authType)
          for (const hook of hooks) {
            const events: string[] = []
            if (hook.push_events) events.push('push')
            if (hook.merge_requests_events) events.push('merge_request')
            if (hook.pipeline_events) events.push('pipeline')
            items.push({
              id: `gl-hook-${project.id}-${hook.id}`,
              projectId: project.id,
              projectPath: project.pathWithNamespace,
              repoFullName: project.pathWithNamespace,
              event: events.join(',') || 'push',
              url: hook.url,
              active: true,
              provider: 'gitlab',
            })
          }
        } catch (err) {
          this.logger.warn(`GitLab hooks failed for ${project.pathWithNamespace}: ${String(err)}`)
        }
      }
    }
    return { items, demoMode: false }
  }

  listDeployments = async (userId: string) => {
    const items: Record<string, unknown>[] = []
    const accounts = await this.connectedAccounts(userId)
    for (const account of accounts) {
      const token = this.readToken(account.tokenRef)
      const projects = await this.prisma.gitlabProject.findMany({
        where: { accountId: account.id },
        take: MAX_PROJECTS,
      })
      for (const project of projects) {
        const projectId = this.parseProjectId(project.id)
        if (!projectId) continue
        try {
          const deployments = await this.gitlab.listDeployments(token, projectId, account.baseUrl, account.authType)
          for (const dep of deployments) {
            items.push({
              id: `gl-dep-${project.id}-${dep.id}`,
              projectId: project.id,
              projectPath: project.pathWithNamespace,
              repoFullName: project.pathWithNamespace,
              branch: dep.ref,
              commitSha: dep.sha,
              status: dep.status,
              targetName: dep.environment?.name ?? dep.ref,
              targetType: 'gitlab',
              targetId: String(dep.id),
              createdAt: dep.created_at,
              finishedAt: dep.updated_at,
              provider: 'gitlab',
            })
          }
        } catch (err) {
          this.logger.warn(`GitLab deployments failed for ${project.pathWithNamespace}: ${String(err)}`)
        }
      }
    }
    return { items, demoMode: false }
  }

  countResourcesForAccount = async (accountId: string) => {
    const account = await this.prisma.gitlabAccount.findUnique({ where: { id: accountId } })
    if (!account) return { branches: 0, commits: 0, mergeRequests: 0, webhooks: 0, deployments: 0 }
    const token = this.readToken(account.tokenRef)
    const projects = await this.prisma.gitlabProject.findMany({
      where: { accountId },
      take: MAX_PROJECTS,
    })
    let branches = 0
    let commits = 0
    let mergeRequests = 0
    let webhooks = 0
    let deployments = 0
    for (const project of projects) {
      const projectId = this.parseProjectId(project.id)
      if (!projectId) continue
      try {
        branches += (await this.gitlab.listBranches(token, projectId, account.baseUrl, account.authType)).length
      } catch {
        /* skip */
      }
      try {
        commits += (
          await this.gitlab.listCommits(token, projectId, account.baseUrl, project.defaultBranch, account.authType)
        ).length
      } catch {
        /* skip */
      }
      try {
        mergeRequests += (
          await this.gitlab.listMergeRequests(token, projectId, account.baseUrl, account.authType)
        ).length
      } catch {
        /* skip */
      }
      try {
        webhooks += (await this.gitlab.listProjectHooks(token, projectId, account.baseUrl, account.authType)).length
      } catch {
        /* skip */
      }
      try {
        deployments += (await this.gitlab.listDeployments(token, projectId, account.baseUrl, account.authType)).length
      } catch {
        /* skip */
      }
    }
    return { branches, commits, mergeRequests, webhooks, deployments }
  }

  private readToken = (tokenRef: string): string => {
    const secrets = this.vault.readSecrets(tokenRef)
    return secrets.token?.trim() ?? tokenRef
  }

  private parseProjectId = (id: string): number | null => {
    const match = id.match(/(\d+)$/)
    return match ? parseInt(match[1], 10) : null
  }
}
