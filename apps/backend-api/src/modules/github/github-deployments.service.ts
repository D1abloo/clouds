import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { NotificationsService } from '../notifications/notifications.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { IntegrationsService } from '../integrations/integrations.service'
import { PLATFORM_EVENTS } from '../integrations/integrations.platform-events'
import { AppModeService } from '../../common/config/app-mode.service'
import { connectionRequired } from '../../common/utils/pro-connection.util'
import { GithubDemoService } from './github-demo.service'
import { mapDeployment } from './github-mappers'

@Injectable()
export class GithubDeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demo: GithubDemoService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
    private readonly integrations: IntegrationsService,
    private readonly mode: AppModeService,
  ) {}

  async listAll() {
    const demoAllowed = this.mode.canUseDemoFallback()

    if (!this.demo.isDbReady()) {
      if (!demoAllowed) {
        return {
          ...connectionRequired('GitHub', 'Conecte una cuenta GitHub con token OAuth o PAT'),
          demoMode: false,
        }
      }
      return { items: this.demo.listMemoryDeployments(), demoMode: true }
    }
    try {
      const items = await this.prisma.githubDeployment.findMany({
        include: { repo: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      if (items.length) {
        return { items: items.map((d) => mapDeployment(d, d.repo.fullName)), demoMode: false }
      }
      if (!demoAllowed) {
        return {
          ...connectionRequired('GitHub', 'Conecte una cuenta GitHub con token OAuth o PAT'),
          demoMode: false,
        }
      }
    } catch {
      if (!demoAllowed) return { items: [], demoMode: false }
    }
    return { items: this.demo.listMemoryDeployments(), demoMode: true }
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
    const demoAllowed = this.mode.canUseDemoFallback()
    const targetName = body.targetName ?? body.targetId
    const memRepo = demoAllowed ? this.demo.getMemoryRepo(repoId) : null
    if (memRepo && !this.demo.isDbReady()) {
      const deployment = this.demo.pushMemoryDeployment(memRepo.fullName, repoId, {
        ...body,
        targetName,
      })
      await this.audit.create({
        userId,
        action: 'github.deploy',
        resource: 'github_repo',
        resourceId: repoId,
        metadata: body,
      }).catch(() => undefined)
      this.scheduleDeployIntegrationEvents(
        memRepo.fullName,
        body.branch,
        targetName,
        body.targetType,
        deployment.id,
        userId,
        false,
      )
      return {
        queued: true,
        deployment,
        demoMode: true,
        message: `Despliegue demo de ${memRepo.name}@${body.branch} hacia ${body.targetType}`,
      }
    }

    const repo = await this.prisma.githubRepository.findUnique({ where: { id: repoId } })
    if (!repo) {
      if (memRepo && demoAllowed) {
        const deployment = this.demo.pushMemoryDeployment(memRepo.fullName, repoId, {
          ...body,
          targetName,
        })
        this.scheduleDeployIntegrationEvents(
          memRepo.fullName,
          body.branch,
          targetName,
          body.targetType,
          deployment.id,
          userId,
          false,
        )
        return {
          queued: true,
          deployment,
          demoMode: true,
          message: `Despliegue demo de ${memRepo.name}@${body.branch}`,
        }
      }
      throw new NotFoundException('Repositorio no encontrado')
    }

    const logs = this.demo.buildDeployLogs(repo.name, body.branch, body.targetType, targetName)
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

  private scheduleDeployIntegrationEvents(
    repoFullName: string,
    branch: string,
    targetName: string,
    targetType: string,
    deploymentId: string,
    userId: string,
    success: boolean,
  ) {
    setTimeout(() => {
      this.emitDeployIntegrationEvents(repoFullName, branch, targetName, targetType, deploymentId, userId, success)
    }, 1200)
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
    const demoAllowed = this.mode.canUseDemoFallback()
    const mem = demoAllowed ? this.demo.getMemoryDeploymentLogs(deploymentId) : null
    if (mem) return mem
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
