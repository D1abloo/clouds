import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { IntegrationsService } from '../integrations/integrations.service'
import { PLATFORM_EVENTS } from '../integrations/integrations.platform-events'

@Injectable()
export class JenkinsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private realtime: RealtimeGateway,
    private integrations: IntegrationsService,
  ) {}

  async createServer(data: { name: string; url: string; secretRef: string }, userId?: string) {
    const server = await this.prisma.jenkinsServer.create({ data })
    await this.audit.create({ userId, action: 'jenkins.server.create', resource: 'jenkins_server', resourceId: server.id })
    return { ...server, secretRef: undefined, hasToken: true }
  }

  async listServers() {
    const servers = await this.prisma.jenkinsServer.findMany({ include: { jobs: true } })
    return servers.map((s) => ({ ...s, secretRef: undefined }))
  }

  async validateConnection(id: string) {
    const server = await this.prisma.jenkinsServer.findUnique({ where: { id } })
    if (!server) throw new NotFoundException('Jenkins server not found')
    return { valid: true, message: `Mock connection to ${server.url} (integrate Jenkins REST API)` }
  }

  async listJobs(serverId: string) {
    // TODO: Jenkins API
    return [
      { id: 'job-1', name: 'deploy-backend', url: '/job/deploy-backend', lastBuild: { number: 42, status: 'SUCCESS' } },
      { id: 'job-2', name: 'terraform-apply', url: '/job/terraform-apply', lastBuild: { number: 15, status: 'FAILURE' } },
    ]
  }

  async triggerBuild(serverId: string, jobName: string, parameters: Record<string, string>, userId?: string) {
    await this.audit.create({
      userId,
      action: 'jenkins.build.trigger',
      resource: 'jenkins_job',
      resourceId: jobName,
      metadata: { serverId, parameters },
    })

    const buildNum = Math.floor(Math.random() * 100) + 1
    const build = { number: buildNum, status: 'RUNNING' as const }
    this.realtime.emitJenkinsBuild(serverId, jobName, build)

    const willFail = jobName.toLowerCase().includes('fail') || jobName === 'terraform-apply'
    setTimeout(() => {
      const status = willFail ? 'FAILURE' : 'SUCCESS'
      this.realtime.emitJenkinsBuild(serverId, jobName, { number: buildNum, status })
      void this.integrations.emitPlatformEvent(
        {
          eventType: willFail ? PLATFORM_EVENTS.DEPLOY_FAILED : PLATFORM_EVENTS.DEPLOY_SUCCESS,
          title: `Jenkins ${jobName} #${buildNum}`,
          body: `Pipeline ${jobName} build #${buildNum} finished with ${status}`,
          severity: willFail ? 'critical' : 'info',
          source: 'Jenkins',
          metadata: { serverId, jobName, buildNum, status, parameters },
        },
        userId,
      )
      void this.integrations.emitPlatformEvent(
        {
          eventType: PLATFORM_EVENTS.WORKFLOW_RUN,
          title: `Workflow ${jobName}`,
          body: `GitHub/Jenkins workflow completed: ${status}`,
          severity: willFail ? 'warning' : 'info',
          source: 'Jenkins',
          metadata: { jobName, buildNum, status },
        },
        userId,
      )
    }, 1500)

    return { queued: true, build }
  }

  async getBuildLogs(_serverId: string, jobName: string, buildNum: number) {
    return {
      jobName,
      buildNum,
      logs: `[Mock Jenkins Log]\nStarted by user cloudops\nBuilding ${jobName} #${buildNum}\nFinished: SUCCESS\n`,
      status: 'SUCCESS',
    }
  }
}
