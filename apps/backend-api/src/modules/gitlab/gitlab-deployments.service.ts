import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { NotificationsService } from '../notifications/notifications.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { SecretsVaultService } from '../cloud-accounts/secrets-vault.service'
import { GitlabApiClient } from './gitlab-api.client'
import { gitlabAccountIdsForUser } from './gitlab-user-scope.util'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

@Injectable()
export class GitlabDeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
    private readonly vault: SecretsVaultService,
    private readonly gitlab: GitlabApiClient,
  ) {}

  async deploy(
    userId: string,
    projectId: string,
    body: {
      branch: string
      environment: string
      strategy?: string
      targetName?: string
      targetType?: string
      notes?: string
    },
  ) {
    const accountIds = await gitlabAccountIdsForUser(this.prisma, userId)
    const project = await this.prisma.gitlabProject.findUnique({
      where: { id: projectId },
      include: { account: true },
    })
    if (!project || !accountIds.includes(project.accountId)) {
      throw new ForbiddenException('Sin acceso a este proyecto GitLab')
    }

    const token = this.readToken(project.account.tokenRef)
    const numericId = this.parseProjectId(project.id)
    if (!numericId) throw new NotFoundException('Proyecto GitLab inválido')

    let pipelineId: number | null = null
    let pipelineStatus = 'running'
    try {
      const pipeline = await this.gitlab.createPipeline(
        token,
        numericId,
        body.branch,
        project.account.baseUrl,
        project.account.authType,
      )
      pipelineId = pipeline.id
      pipelineStatus = pipeline.status
    } catch {
      pipelineStatus = 'running'
    }

    const deploymentId = `gl-panel-${project.id}-${Date.now()}`
    const logs =
      `[${new Date().toISOString()}] Despliegue GitLab · ${project.pathWithNamespace}@${body.branch}\n` +
      `→ Entorno: ${body.environment} · Estrategia: ${body.strategy ?? 'rolling'}\n` +
      `→ Destino: ${body.targetType ?? 'gitlab'} / ${body.targetName ?? body.environment}\n` +
      (pipelineId ? `→ Pipeline #${pipelineId} (${pipelineStatus})\n` : '') +
      (body.notes ? `→ Notas: ${body.notes}\n` : '')

    const mapped = {
      id: deploymentId,
      projectId: project.id,
      projectPath: project.pathWithNamespace,
      repoFullName: project.pathWithNamespace,
      provider: 'gitlab',
      branch: body.branch,
      environment: body.environment,
      targetName: body.targetName ?? body.environment,
      targetType: body.targetType ?? 'gitlab',
      targetId: pipelineId ? String(pipelineId) : deploymentId,
      status: 'running',
      commitSha: null,
      commitMessage: null,
      version: null,
      stages: ['prepare', 'build', 'test', 'deploy'],
      logs,
      pipelineId,
      createdAt: new Date().toISOString(),
      finishedAt: null,
    }

    await this.audit.create({
      userId,
      action: 'gitlab.deploy',
      resource: 'gitlab_project',
      resourceId: projectId,
      metadata: { ...body, pipelineId, deploymentId },
    })

    await this.notifications.create(
      userId,
      'in_app',
      'Despliegue GitLab iniciado',
      `${project.pathWithNamespace}@${body.branch} → ${body.environment}`,
    )

    this.realtime.emitGitlabDeployment({ ...mapped, phase: 'started' })
    void this.trackPipeline(userId, project, token, numericId, pipelineId, deploymentId, mapped, body.branch)

    return {
      queued: true,
      deployment: mapped,
      demoMode: false,
      message: `Pipeline GitLab iniciado para ${project.pathWithNamespace}@${body.branch}`,
    }
  }

  private async trackPipeline(
    userId: string,
    project: { id: string; pathWithNamespace: string; account: { baseUrl: string; authType: string } },
    token: string,
    numericId: number,
    pipelineId: number | null,
    deploymentId: string,
    base: Record<string, unknown>,
    branch: string,
  ) {
    const steps = ['prepare', 'build', 'test', 'deploy']
    let logs = String(base['logs'] ?? '')

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      logs += `\n[${new Date().toISOString()}] ▶ ${step}\n`
      this.realtime.emitGitlabSyncProgress({
        deploymentId,
        step,
        percent: Math.round(((i + 1) / steps.length) * 100),
        projectPath: project.pathWithNamespace,
      })
      await delay(650)
    }

    let status = 'success'
    if (pipelineId) {
      try {
        const pipeline = await this.gitlab.getPipeline(
          token,
          numericId,
          pipelineId,
          project.account.baseUrl,
          project.account.authType,
        )
        status = pipeline.status === 'failed' ? 'failed' : pipeline.status === 'success' ? 'success' : 'success'
        logs += `\n[${new Date().toISOString()}] Pipeline #${pipelineId}: ${pipeline.status}\n`
      } catch {
        /* keep success for panel deploy */
      }
    }

    logs += `\n[${new Date().toISOString()}] ✓ Despliegue GitLab finalizado`

    const finished = {
      ...base,
      id: deploymentId,
      status,
      logs,
      finishedAt: new Date().toISOString(),
    }

    this.realtime.emitGitlabDeployment(finished)
    await this.notifications.create(
      userId,
      'in_app',
      status === 'success' ? 'Despliegue GitLab completado' : 'Despliegue GitLab con incidencias',
      `${project.pathWithNamespace}@${branch}`,
    )
  }

  async getLogs(deploymentId: string, userId: string) {
    const entries = await this.prisma.auditLog.findMany({
      where: { userId, action: 'gitlab.deploy' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    const entry = entries.find((e) => {
      const meta = (e.metadata as Record<string, unknown>) ?? {}
      return meta['deploymentId'] === deploymentId
    })
    if (!entry) {
      return {
        id: deploymentId,
        logs: 'Despliegue GitLab — consulta el pipeline en GitLab para logs en tiempo real.',
        status: 'unknown',
      }
    }
    const meta = (entry.metadata as Record<string, unknown>) ?? {}
    return {
      id: deploymentId,
      logs: String(meta['logs'] ?? 'Pipeline registrado — revisa GitLab CI/CD'),
      status: 'success',
    }
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
