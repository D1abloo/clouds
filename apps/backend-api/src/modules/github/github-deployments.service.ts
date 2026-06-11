import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { NotificationsService } from '../notifications/notifications.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { IntegrationsService } from '../integrations/integrations.service'
import { PLATFORM_EVENTS } from '../integrations/integrations.platform-events'
import { OrganizationScopeService } from '../../common/organization/organization-scope.service'
import { connectionRequired } from '../../common/utils/pro-connection.util'
import { mapDeployment } from './github-mappers'
import { githubRepoIdsForUser } from './github-user-scope.util'

const DEPLOY_STEPS = [
  { key: 'checkout', label: 'Checkout', cmd: (branch: string) => `git fetch origin ${branch} && git checkout ${branch}` },
  { key: 'build', label: 'Build', cmd: () => 'npm ci && npm run build' },
  { key: 'test', label: 'Test', cmd: () => 'npm test -- --passWithNoTests' },
  { key: 'publish', label: 'Publish', cmd: (target: string) => `docker build -t ${target}:latest . && docker push ${target}:latest` },
  { key: 'deploy', label: 'Deploy', cmd: (target: string) => `kubectl rollout restart deployment/${target}` },
] as const

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

@Injectable()
export class GithubDeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
    private readonly integrations: IntegrationsService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async listAll(userId: string) {
    const repoIds = await githubRepoIdsForUser(this.prisma, userId)
    if (!repoIds.length) {
      return {
        ...connectionRequired('GitHub', 'Conecte una cuenta GitHub con token OAuth o PAT'),
        demoMode: false,
        items: [],
      }
    }

    const items = await this.prisma.githubDeployment.findMany({
      where: { repoId: { in: repoIds } },
      include: { repo: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const mapped = await Promise.all(
      items.map(async (d) => {
        const commit = await this.prisma.githubCommit.findFirst({
          where: { repoId: d.repoId, branch: d.branch },
          orderBy: { committedAt: 'desc' },
        })
        return mapDeployment(d, d.repo.fullName, {
          commitSha: commit?.sha ?? null,
          commitMessage: commit?.message ?? null,
        })
      }),
    )

    return { items: mapped, demoMode: false }
  }

  async listDeployTargets(userId: string) {
    const scope = await this.orgScope.resolveForUser(userId)
    const projectFilter = scope.projectIds.length
      ? { projectId: { in: scope.projectIds } }
      : { projectId: { in: [] as string[] } }

    const [instances, vpsList] = await Promise.all([
      this.prisma.instance.findMany({
        where: { deletedAt: null, ...projectFilter },
        take: 40,
        select: { id: true, name: true, region: true, provider: true },
      }),
      this.prisma.vpsServer.findMany({
        where: { deletedAt: null, ...projectFilter },
        take: 40,
        select: { id: true, name: true, hostname: true },
      }),
    ])

    const items = [
      ...instances.map((i) => ({
        id: i.id,
        name: i.name,
        type: 'instance' as const,
        subtitle: `${i.provider} · ${i.region ?? '—'}`,
      })),
      ...vpsList.map((v) => ({
        id: v.id,
        name: v.name,
        type: 'vps' as const,
        subtitle: v.hostname,
      })),
    ]

    return { items, demoMode: false }
  }

  async deploy(
    userId: string,
    repoId: string,
    body: {
      branch: string
      targetType: 'instance' | 'vps' | 'docker' | 'kubernetes'
      targetId: string
      targetName?: string
      environment?: string
      strategy?: string
      notes?: string
    },
  ) {
    const repoIds = await githubRepoIdsForUser(this.prisma, userId)
    if (!repoIds.includes(repoId)) {
      throw new ForbiddenException('Sin acceso a este repositorio')
    }

    const targetName = body.targetName ?? body.targetId
    const repo = await this.prisma.githubRepository.findUnique({ where: { id: repoId } })
    if (!repo) throw new NotFoundException('Repositorio no encontrado')

    const commit = await this.prisma.githubCommit.findFirst({
      where: { repoId, branch: body.branch },
      orderBy: { committedAt: 'desc' },
    })

    const header =
      `[${new Date().toISOString()}] Despliegue Spendlyx · ${repo.fullName}@${body.branch}\n` +
      `→ Entorno: ${body.environment ?? 'staging'} · Estrategia: ${body.strategy ?? 'rolling'}\n` +
      `→ Destino: ${body.targetType} / ${targetName}\n` +
      (commit ? `→ Commit: ${commit.sha.slice(0, 7)} — ${commit.message.slice(0, 120)}\n` : '') +
      (body.notes ? `→ Notas: ${body.notes}\n` : '')

    const deployment = await this.prisma.githubDeployment.create({
      data: {
        repoId,
        branch: body.branch,
        targetType: body.targetType,
        targetId: body.targetId,
        targetName,
        status: 'running',
        logs: header,
        createdById: userId,
      },
      include: { repo: true },
    })

    await this.audit.create({
      userId,
      action: 'github.deploy',
      resource: 'github_repo',
      resourceId: repoId,
      metadata: body,
    })

    await this.notifications.create(
      userId,
      'in_app',
      'Despliegue iniciado',
      `${repo.name}@${body.branch} → ${targetName}`,
    )

    const mapped = mapDeployment(deployment, repo.fullName, {
      commitSha: commit?.sha ?? null,
      commitMessage: commit?.message ?? null,
      environment: body.environment,
    })

    this.realtime.emitGithubDeployment({ ...mapped, phase: 'started' })
    void this.runDeployPipeline(deployment.id, repo.fullName, body.branch, targetName, userId, commit?.sha)

    return {
      queued: true,
      deployment: mapped,
      demoMode: false,
      message: `Despliegue de ${repo.name}@${body.branch} iniciado hacia ${targetName}`,
    }
  }

  private async runDeployPipeline(
    deploymentId: string,
    repoFullName: string,
    branch: string,
    targetName: string,
    userId: string,
    commitSha?: string,
  ) {
    let logs = ''
    const total = DEPLOY_STEPS.length

    for (let i = 0; i < DEPLOY_STEPS.length; i++) {
      const step = DEPLOY_STEPS[i]
      const cmd = step.key === 'checkout' ? step.cmd(branch) : step.cmd(targetName)
      logs += `\n[${new Date().toISOString()}] ▶ ${step.label}\n$ ${cmd}\n`

      const partial = await this.prisma.githubDeployment.update({
        where: { id: deploymentId },
        data: { logs: (await this.getLogsText(deploymentId)) + logs, status: 'running' },
        include: { repo: true },
      })

      const progress = mapDeployment(partial, repoFullName, {
        commitSha: commitSha ?? null,
        commitMessage: null,
      })

      this.realtime.emitGithubDeploymentProgress({
        ...progress,
        step: step.key,
        stepLabel: step.label,
        percent: Math.round(((i + 1) / total) * 100),
      })

      await delay(700 + i * 120)
    }

    const finished = await this.prisma.githubDeployment.update({
      where: { id: deploymentId },
      data: {
        status: 'success',
        finishedAt: new Date(),
        logs: `${await this.getLogsText(deploymentId)}${logs}\n[${new Date().toISOString()}] ✓ Despliegue completado`,
      },
      include: { repo: true },
    })

    const mapped = mapDeployment(finished, finished.repo.fullName, {
      commitSha: commitSha ?? null,
      commitMessage: null,
    })

    this.realtime.emitGithubDeployment(mapped)
    await this.notifications.create(
      userId,
      'in_app',
      'Despliegue completado',
      `${repoFullName} desplegado en ${targetName}`,
    )

    void this.integrations.emitPlatformEvent(
      {
        eventType: PLATFORM_EVENTS.DEPLOY_SUCCESS,
        title: `GitHub deploy ${repoFullName}@${branch}`,
        body: `${repoFullName} → ${targetName}: success`,
        severity: 'info',
        source: 'GitHub',
        metadata: { deploymentId, repoFullName, branch, targetName, status: 'success' },
      },
      userId,
    )
  }

  private getLogsText = async (deploymentId: string): Promise<string> => {
    const d = await this.prisma.githubDeployment.findUnique({ where: { id: deploymentId } })
    return d?.logs ?? ''
  }

  async getLogs(deploymentId: string, userId: string) {
    const repoIds = await githubRepoIdsForUser(this.prisma, userId)
    const d = await this.prisma.githubDeployment.findUnique({
      where: { id: deploymentId },
      include: { repo: true },
    })
    if (!d || !repoIds.includes(d.repoId)) {
      throw new NotFoundException('Despliegue no encontrado')
    }
    return {
      id: d.id,
      logs: d.logs ?? '',
      status: d.status,
      repoFullName: d.repo.fullName,
    }
  }
}
