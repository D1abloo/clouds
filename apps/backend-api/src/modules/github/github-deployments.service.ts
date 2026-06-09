import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { NotificationsService } from '../notifications/notifications.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { IntegrationsService } from '../integrations/integrations.service'
import { PLATFORM_EVENTS } from '../integrations/integrations.platform-events'
import { connectionRequired } from '../../common/utils/pro-connection.util'
import { mapDeployment } from './github-mappers'

const buildDeployLogs = (repoName: string, branch: string, targetType: string, targetName: string): string =>
  `[${new Date().toISOString()}] Iniciando despliegue de ${repoName}@${branch}\n` +
  `→ Destino: ${targetType} / ${targetName}\n` +
  `[Pipeline] Checkout ${branch}\n` +
  `[Pipeline] Build artifact\n` +
  `[Pipeline] Deploy to ${targetName}\n`

@Injectable()
export class GithubDeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
    private readonly integrations: IntegrationsService,
  ) {}

  async listAll() {
    const items = await this.prisma.githubDeployment.findMany({
      include: { repo: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    if (!items.length) {
      return {
        ...connectionRequired('GitHub', 'Conecte una cuenta GitHub con token OAuth o PAT'),
        demoMode: false,
      }
    }
    return { items: items.map((d) => mapDeployment(d, d.repo.fullName)), demoMode: false }
  }

  async deploy(
    userId: string,
    repoId: string,
    body: {
      branch: string
      targetType: 'instance' | 'vps' | 'docker' | 'kubernetes'
      targetId: string
      targetName?: string
    },
  ) {
    const targetName = body.targetName ?? body.targetId
    const repo = await this.prisma.githubRepository.findUnique({ where: { id: repoId } })
    if (!repo) throw new NotFoundException('Repositorio no encontrado')

    const logs = buildDeployLogs(repo.name, body.branch, body.targetType, targetName)
    const deployment = await this.prisma.githubDeployment.create({
      data: {
        repoId,
        branch: body.branch,
        targetType: body.targetType,
        targetId: body.targetId,
        targetName,
        status: 'running',
        logs,
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
    const mapped = mapDeployment(deployment, repo.fullName)
    setTimeout(async () => {
      const finished = await this.prisma.githubDeployment.update({
        where: { id: deployment.id },
        data: {
          status: 'success',
          finishedAt: new Date(),
          logs: `${logs}\n[${new Date().toISOString()}] ✓ Despliegue exitoso`,
        },
        include: { repo: true },
      })
      this.realtime.emitGithubDeployment(mapDeployment(finished, finished.repo.fullName))
      await this.notifications.create(
        userId,
        'in_app',
        'Despliegue completado',
        `${repo.fullName} desplegado en ${targetName}`,
      )
      this.emitDeployIntegrationEvents(
        repo.fullName,
        body.branch,
        targetName,
        body.targetType,
        deployment.id,
        userId,
        true,
      )
    }, 1200)
    return {
      queued: true,
      deployment: mapped,
      demoMode: false,
      message: `Despliegue de ${repo.name}@${body.branch} iniciado hacia ${body.targetType}`,
    }
  }

  private emitDeployIntegrationEvents(
    repoFullName: string,
    branch: string,
    targetName: string,
    targetType: string,
    deploymentId: string,
    userId: string | undefined,
    success: boolean,
  ) {
    const status = success ? 'success' : 'failed'
    void this.integrations.emitPlatformEvent(
      {
        eventType: success ? PLATFORM_EVENTS.DEPLOY_SUCCESS : PLATFORM_EVENTS.DEPLOY_FAILED,
        title: `GitHub deploy ${repoFullName}@${branch}`,
        body: `${repoFullName} → ${targetName} (${targetType}): ${status}`,
        severity: success ? 'info' : 'critical',
        source: 'GitHub',
        metadata: { deploymentId, repoFullName, branch, targetName, targetType, status },
      },
      userId,
    )
    void this.integrations.emitPlatformEvent(
      {
        eventType: PLATFORM_EVENTS.WORKFLOW_RUN,
        title: `Workflow ${repoFullName}`,
        body: `Deploy workflow ${status} for ${branch} → ${targetName}`,
        severity: success ? 'info' : 'warning',
        source: 'GitHub',
        metadata: { deploymentId, repoFullName, branch, status },
      },
      userId,
    )
  }

  async getLogs(deploymentId: string) {
    const d = await this.prisma.githubDeployment.findUnique({
      where: { id: deploymentId },
      include: { repo: true },
    })
    if (!d) throw new NotFoundException('Despliegue no encontrado')
    return {
      id: d.id,
      logs: d.logs ?? '',
      status: d.status,
      repoFullName: d.repo.fullName,
    }
  }
}
