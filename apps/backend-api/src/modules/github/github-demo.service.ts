import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import {
  DEMO_DEPLOYMENTS,
  DEMO_GITHUB_ACCOUNT_ID,
  DEMO_GITHUB_REPOS,
  DEMO_WEBHOOKS,
  demoBranches,
  demoCommits,
  demoPullRequests,
  githubApiRepoId,
  resolveDemoSlugFromRepoId,
  toApiRepoFromDemo,
  type GithubDeploymentDemo,
  type GithubRepoDemo,
} from './github-demo.data'
import { mapDeployment } from './github-mappers'

type MemoryDeployment = ReturnType<typeof mapDeployment> & { logs?: string }

@Injectable()
export class GithubDemoService implements OnModuleInit {
  private readonly logger = new Logger(GithubDemoService.name)
  private readonly memoryDeployments: MemoryDeployment[] = []
  private dbReady = false

  constructor(private readonly prisma: PrismaService) {
    this.seedMemoryDeployments()
  }

  async onModuleInit(): Promise<void> {
    await this.ensureDemoAccountInDatabase()
  }

  isDemoToken(tokenRef?: string | null): boolean {
    if (!tokenRef?.trim()) return true
    return tokenRef.startsWith('demo:') || tokenRef === 'demo'
  }

  listMemoryRepos() {
    return DEMO_GITHUB_REPOS.map((d) => toApiRepoFromDemo(d))
  }

  getMemoryRepo(repoId: string) {
    const slug = resolveDemoSlugFromRepoId(repoId)
    if (!slug) return null
    const demo = DEMO_GITHUB_REPOS.find((r) => r.id === slug)
    return demo ? toApiRepoFromDemo(demo) : null
  }

  getMemoryBranches(repoId: string) {
    const slug = resolveDemoSlugFromRepoId(repoId)
    if (!slug) return null
    return demoBranches(slug).map((b) => ({
      name: b.name,
      protected: b.protected,
      lastCommitSha: b.lastCommitSha,
      lastCommitMessage: b.lastCommitMessage,
    }))
  }

  getMemoryCommits(repoId: string, branch?: string) {
    const slug = resolveDemoSlugFromRepoId(repoId)
    if (!slug) return null
    let items = demoCommits(slug).map((c) => ({
      sha: c.sha,
      message: c.message,
      author: c.author,
      date: c.date,
      branch: c.branch,
    }))
    if (branch) items = items.filter((c) => c.branch === branch)
    return items
  }

  getMemoryPullRequests(repoId: string) {
    const slug = resolveDemoSlugFromRepoId(repoId)
    if (!slug) return null
    return demoPullRequests(slug).map((pr) => ({
      id: pr.number,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.author,
      base: pr.base,
      head: pr.head,
      createdAt: pr.createdAt,
    }))
  }

  listMemoryWebhooks() {
    return DEMO_WEBHOOKS.map((w) => ({
      id: `gh-wh-${w.id}`,
      repoId: this.repoIdByFullName(w.repoFullName),
      repoFullName: w.repoFullName,
      event: w.event,
      url: w.url,
      active: w.active,
    }))
  }

  listMemoryDeployments() {
    return [...this.memoryDeployments]
  }

  pushMemoryDeployment(
    repoFullName: string,
    repoId: string,
    body: {
      branch: string
      targetType: string
      targetId: string
      targetName: string
    },
  ) {
    const repoName = repoFullName.split('/').pop() ?? repoFullName
    const logs = this.buildDeployLogs(repoName, body.branch, body.targetType, body.targetName)
    const dep: MemoryDeployment = {
      ...mapDeployment(
        {
          id: `gh-dep-mem-${Date.now()}`,
          repoId,
          branch: body.branch,
          targetType: body.targetType,
          targetId: body.targetId,
          targetName: body.targetName,
          status: 'running',
          logs,
          createdById: null,
          createdAt: new Date(),
          finishedAt: null,
        },
        repoFullName,
      ),
      logs,
    }
    this.memoryDeployments.unshift(dep)
    setTimeout(() => {
      dep.status = 'success'
      dep.finishedAt = new Date().toISOString()
      dep.logs = `${logs}\n[${new Date().toISOString()}] ✓ Despliegue demo exitoso`
    }, 800)
    return dep
  }

  getMemoryDeploymentLogs(deploymentId: string) {
    const d = this.memoryDeployments.find((x) => x.id === deploymentId)
    if (!d) return null
    return { id: d.id, logs: d.logs ?? '', status: d.status, repoFullName: d.repoFullName }
  }

  isDbReady(): boolean {
    return this.dbReady
  }

  async ensureDemoAccountInDatabase(): Promise<void> {
    try {
      const account = await this.prisma.githubAccount.upsert({
        where: { id: DEMO_GITHUB_ACCOUNT_ID },
        create: {
          id: DEMO_GITHUB_ACCOUNT_ID,
          label: 'GitHub Demo',
          username: 'cloudops-demo',
          tokenRef: 'demo:cloudops',
          status: 'connected',
          avatarUrl: 'https://github.com/cloudops-demo.png',
          lastValidatedAt: new Date(),
          lastSyncAt: new Date(),
        },
        update: { status: 'connected', lastSyncAt: new Date() },
      })
      const repoCount = await this.prisma.githubRepository.count({
        where: { accountId: account.id },
      })
      if (repoCount < DEMO_GITHUB_REPOS.length) {
        await this.populateAccount(account.id)
      }
      this.dbReady = true
      this.logger.log(`GitHub demo: ${DEMO_GITHUB_REPOS.length} repos listos en BD`)
    } catch (err) {
      this.dbReady = false
      this.logger.warn(
        `GitHub demo: BD no disponible, catálogo en memoria (${DEMO_GITHUB_REPOS.length} repos)`,
      )
      void err
    }
  }

  async populateAccount(accountId: string): Promise<number> {
    let count = 0
    for (const demo of DEMO_GITHUB_REPOS) {
      const repo = await this.prisma.githubRepository.upsert({
        where: { accountId_fullName: { accountId, fullName: demo.fullName } },
        create: {
          id: githubApiRepoId(demo.id),
          accountId,
          name: demo.name,
          fullName: demo.fullName,
          description: demo.description,
          defaultBranch: demo.defaultBranch,
          language: demo.language,
          stars: demo.stars,
          visibility: demo.visibility,
          htmlUrl: `https://github.com/${demo.fullName}`,
          lastSyncAt: new Date(),
        },
        update: {
          description: demo.description,
          stars: demo.stars,
          lastSyncAt: new Date(),
        },
      })
      count++
      await this.syncRepoChildren(repo.id, demo.id)
    }
    await this.ensureGlobalWebhooks(accountId)
    await this.ensureDemoDeployments()
    return count
  }

  async syncRepoChildren(repoId: string, demoRepoKey: string): Promise<void> {
    await this.prisma.githubBranch.deleteMany({ where: { repoId } })
    await this.prisma.githubCommit.deleteMany({ where: { repoId } })
    await this.prisma.githubPullRequest.deleteMany({ where: { repoId } })

    for (const b of demoBranches(demoRepoKey)) {
      await this.prisma.githubBranch.create({
        data: {
          repoId,
          name: b.name,
          isProtected: b.protected,
          lastSha: b.lastCommitSha,
          lastMessage: b.lastCommitMessage,
        },
      })
    }
    for (const c of demoCommits(demoRepoKey)) {
      await this.prisma.githubCommit.create({
        data: {
          repoId,
          sha: c.sha,
          message: c.message,
          author: c.author,
          branch: c.branch,
          committedAt: new Date(c.date),
        },
      })
    }
    for (const pr of demoPullRequests(demoRepoKey)) {
      await this.prisma.githubPullRequest.create({
        data: {
          repoId,
          number: pr.number,
          title: pr.title,
          state: pr.state,
          author: pr.author,
          baseBranch: pr.base,
          headBranch: pr.head,
          createdAt: new Date(pr.createdAt),
        },
      })
    }
  }

  demoSummary() {
    const openPrs = DEMO_GITHUB_REPOS.length * 2
    return {
      connected: true,
      username: 'cloudops-demo',
      demoMode: true,
      repoCount: DEMO_GITHUB_REPOS.length,
      branchCount: DEMO_GITHUB_REPOS.length * 4,
      commitCount: DEMO_GITHUB_REPOS.length * 4,
      openPullRequests: openPrs,
      webhookCount: DEMO_WEBHOOKS.length,
      deploymentCount: this.memoryDeployments.length,
      repoItems: this.listMemoryRepos(),
      lastSyncAt: new Date().toISOString(),
    }
  }

  buildDeployLogs(repoName: string, branch: string, targetType: string, targetName: string): string {
    const lines = [
      `[${new Date().toISOString()}] Iniciando despliegue de ${repoName}@${branch}`,
      `[${new Date().toISOString()}] Destino: ${targetType} → ${targetName}`,
      `[${new Date().toISOString()}] Clonando repositorio (demo)…`,
      `[${new Date().toISOString()}] Construyendo artefacto…`,
      `[${new Date().toISOString()}] Aplicando manifiesto / reiniciando servicio…`,
      `[${new Date().toISOString()}] Despliegue finalizado correctamente`,
    ]
    return lines.join('\n')
  }

  private repoIdByFullName(fullName: string): string | null {
    const demo = DEMO_GITHUB_REPOS.find((r) => r.fullName === fullName)
    return demo ? githubApiRepoId(demo.id) : null
  }

  private seedMemoryDeployments() {
    for (const d of DEMO_DEPLOYMENTS) {
      const repoId = this.repoIdByFullName(d.repoFullName)
      if (!repoId) continue
      this.memoryDeployments.push({
        ...mapDeployment(
          {
            id: `gh-dep-${d.id}`,
            repoId,
            branch: d.branch,
            targetType: d.targetType,
            targetId: d.targetName,
            targetName: d.targetName,
            status: d.status,
            logs: `[demo] Despliegue ${d.repoFullName}@${d.branch}`,
            createdById: null,
            createdAt: new Date(d.createdAt),
            finishedAt: d.status === 'success' ? new Date(d.createdAt) : null,
          },
          d.repoFullName,
        ),
        logs: `[demo] Despliegue ${d.repoFullName}@${d.branch}`,
      })
    }
  }

  private async ensureGlobalWebhooks(accountId: string): Promise<void> {
    const existing = await this.prisma.githubWebhook.count({ where: { accountId } })
    if (existing >= DEMO_WEBHOOKS.length) return
    for (const wh of DEMO_WEBHOOKS) {
      const repo = await this.prisma.githubRepository.findFirst({
        where: { accountId, fullName: wh.repoFullName },
      })
      await this.prisma.githubWebhook.upsert({
        where: { id: `gh-wh-${wh.id}` },
        create: {
          id: `gh-wh-${wh.id}`,
          accountId,
          repoId: repo?.id,
          event: wh.event,
          url: wh.url,
          secretRef: 'demo:secret',
          isActive: wh.active,
        },
        update: { isActive: wh.active, url: wh.url },
      })
    }
  }

  private async ensureDemoDeployments(): Promise<void> {
    for (const d of DEMO_DEPLOYMENTS) {
      const repo = await this.prisma.githubRepository.findFirst({
        where: { fullName: d.repoFullName },
      })
      if (!repo) continue
      await this.prisma.githubDeployment.upsert({
        where: { id: `gh-dep-${d.id}` },
        create: {
          id: `gh-dep-${d.id}`,
          repoId: repo.id,
          branch: d.branch,
          targetType: d.targetType,
          targetId: d.targetName,
          targetName: d.targetName,
          status: d.status,
          logs: `[demo] Despliegue ${d.repoFullName}@${d.branch} completado`,
          finishedAt: d.status === 'success' ? new Date(d.createdAt) : null,
          createdAt: new Date(d.createdAt),
        },
        update: { status: d.status },
      })
    }
  }
}
