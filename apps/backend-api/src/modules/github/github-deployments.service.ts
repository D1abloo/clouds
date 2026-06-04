import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { NotificationsService } from '../notifications/notifications.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
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
  ) {}

  async listAll() {
    if (!this.demo.isDbReady()) {
      return { items: this.demo.listMemoryDeployments(), demoMode: true }
    }
    try {
      const items = await this.prisma.githubDeployment.findMany({
        include: { repo: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      if (items.length) {
        return { items: items.map((d) => mapDeployment(d, d.repo.fullName)) }
      }
    } catch {
      /* memoria */
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
    const targetName = body.targetName ?? body.targetId
    const memRepo = this.demo.getMemoryRepo(repoId)
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
      return {
        queued: true,
        deployment,
        demoMode: true,
        message: `Despliegue demo de ${memRepo.name}@${body.branch} hacia ${body.targetType}`,
      }
    }

    const repo = await this.prisma.githubRepository.findUnique({ where: { id: repoId } })
    if (!repo) {
      if (memRepo) {
        const deployment = this.demo.pushMemoryDeployment(memRepo.fullName, repoId, {
          ...body,
          targetName,
        })
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
    }, 1200)
    return {
      queued: true,
      deployment: mapped,
      message: `Despliegue de ${repo.name}@${body.branch} iniciado hacia ${body.targetType}`,
    }
  }

  async getLogs(deploymentId: string) {
    const mem = this.demo.getMemoryDeploymentLogs(deploymentId)
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
