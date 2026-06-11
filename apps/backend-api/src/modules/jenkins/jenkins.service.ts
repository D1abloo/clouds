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

  async createServer(
    data: { name: string; url: string; secretRef?: string; username?: string; apiToken?: string },
    userId?: string,
  ) {
    const secretRef =
      data.secretRef ??
      JSON.stringify({ username: data.username ?? '', apiToken: data.apiToken ?? '' })
    const server = await this.prisma.jenkinsServer.create({
      data: { name: data.name, url: data.url, secretRef },
    })
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

    let creds: { username?: string; apiToken?: string } = {}
    try {
      creds = JSON.parse(server.secretRef) as { username?: string; apiToken?: string }
    } catch {
      creds = {}
    }

    const base = server.url.replace(/\/$/, '')
    const auth =
      creds.username && creds.apiToken
        ? Buffer.from(`${creds.username}:${creds.apiToken}`).toString('base64')
        : null

    if (auth) {
      try {
        const res = await fetch(`${base}/api/json`, {
          headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        })
        if (res.ok) {
          const payload = (await res.json()) as { mode?: string }
          return {
            valid: true,
            message: `Conexión OK — Jenkins ${payload.mode ?? 'online'} en ${base}`,
          }
        }
        return { valid: false, message: `Jenkins respondió HTTP ${res.status}` }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error de red'
        return { valid: false, message: `No se pudo contactar Jenkins: ${msg}` }
      }
    }

    return { valid: true, message: `Servidor registrado en ${server.url}` }
  }

  async listJobs(serverId: string) {
    const jobs = await this.prisma.jenkinsJob.findMany({
      where: { serverId },
      include: { builds: { orderBy: { buildNum: 'desc' }, take: 1 } },
      orderBy: { name: 'asc' },
    })
    return jobs.map((j) => ({
      id: j.id,
      name: j.name,
      url: j.url ?? `/job/${j.name}`,
      lastBuild: j.builds[0]
        ? { number: j.builds[0].buildNum, status: j.builds[0].status }
        : null,
    }))
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
