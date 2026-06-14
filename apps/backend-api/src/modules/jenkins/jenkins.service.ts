import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { SecretsVaultService } from '../cloud-accounts/secrets-vault.service'

@Injectable()
export class JenkinsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private realtime: RealtimeGateway,
    private vault: SecretsVaultService,
  ) {}

  async createServer(
    data: { name: string; url: string; secretRef?: string; username?: string; apiToken?: string },
    userId?: string,
  ) {
    const secretRef = this.persistCredentials(data)
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

    const creds = this.readCredentials(server.secretRef)

    const base = server.url.replace(/\/$/, '')
    const auth =
      creds.username && creds.apiToken
        ? Buffer.from(`${creds.username}:${creds.apiToken}`).toString('base64')
        : null

    if (!auth) {
      return { valid: false, message: 'Jenkins requiere usuario y API token para validar y desplegar apps' }
    }

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

  async listJobs(serverId: string) {
    const server = await this.prisma.jenkinsServer.findUnique({ where: { id: serverId } })
    if (!server) throw new NotFoundException('Jenkins server not found')

    const jobs = await this.prisma.jenkinsJob.findMany({
      where: { serverId },
      include: { builds: { orderBy: { buildNum: 'desc' }, take: 1 } },
      orderBy: { name: 'asc' },
    })
    if (jobs.length) return jobs.map((j) => ({
      id: j.id,
      name: j.name,
      url: j.url ?? `/job/${j.name}`,
      lastBuild: j.builds[0]
        ? { number: j.builds[0].buildNum, status: j.builds[0].status }
        : null,
    }))

    const liveJobs = await this.fetchJenkinsJobs(server)
    return liveJobs
  }

  async triggerBuild(serverId: string, jobName: string, parameters: Record<string, string>, userId?: string) {
    const server = await this.prisma.jenkinsServer.findUnique({ where: { id: serverId } })
    if (!server) throw new NotFoundException('Jenkins server not found')

    await this.audit.create({
      userId,
      action: 'jenkins.build.trigger',
      resource: 'jenkins_job',
      resourceId: jobName,
      metadata: { serverId, parameters },
    })

    const queued = await this.queueJenkinsBuild(server, jobName, parameters)
    const buildNum = queued.queueId ?? Date.now()
    const build = { number: buildNum, status: 'RUNNING' as const, queueUrl: queued.queueUrl }
    this.realtime.emitJenkinsBuild(serverId, jobName, build)

    return { queued: true, build }
  }

  async getBuildLogs(serverId: string, jobName: string, buildNum: number) {
    const server = await this.prisma.jenkinsServer.findUnique({ where: { id: serverId } })
    if (!server) throw new NotFoundException('Jenkins server not found')
    const base = server.url.replace(/\/$/, '')
    const auth = this.authHeader(server.secretRef)
    const path = this.jobPath(jobName)
    const res = await fetch(`${base}/${path}/${buildNum}/consoleText`, {
      headers: { ...(auth ? { Authorization: auth } : {}) },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) throw new BadRequestException(`Jenkins respondió HTTP ${res.status} al leer logs`)
    return {
      jobName,
      buildNum,
      logs: await res.text(),
      status: 'LIVE',
    }
  }

  private readCredentials(secretRef: string): { username?: string; apiToken?: string } {
    const fromVault = this.vault.readSecrets(secretRef)
    if (fromVault.username || fromVault.apiToken) return fromVault
    try {
      return JSON.parse(secretRef) as { username?: string; apiToken?: string }
    } catch {
      return {}
    }
  }

  private authHeader(secretRef: string): string | null {
    const creds = this.readCredentials(secretRef)
    return creds.username && creds.apiToken
      ? `Basic ${Buffer.from(`${creds.username}:${creds.apiToken}`).toString('base64')}`
      : null
  }

  private async fetchCrumb(server: { url: string; secretRef: string }): Promise<Record<string, string>> {
    const base = server.url.replace(/\/$/, '')
    const auth = this.authHeader(server.secretRef)
    const res = await fetch(`${base}/crumbIssuer/api/json`, {
      headers: { ...(auth ? { Authorization: auth } : {}), Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    }).catch(() => null)
    if (!res?.ok) return {}
    const crumb = (await res.json()) as { crumbRequestField?: string; crumb?: string }
    return crumb.crumbRequestField && crumb.crumb ? { [crumb.crumbRequestField]: crumb.crumb } : {}
  }

  private jobPath(jobName: string): string {
    return jobName
      .split('/')
      .filter(Boolean)
      .map((part) => `job/${encodeURIComponent(part)}`)
      .join('/')
  }

  private async fetchJenkinsJobs(server: { id: string; url: string; secretRef: string }) {
    const base = server.url.replace(/\/$/, '')
    const auth = this.authHeader(server.secretRef)
    if (!auth) throw new BadRequestException('Jenkins requiere usuario y API token para listar jobs')
    const res = await fetch(`${base}/api/json?tree=jobs[name,url,color,lastBuild[number,result]]`, {
      headers: { Authorization: auth, Accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) throw new BadRequestException(`Jenkins respondió HTTP ${res.status} al listar jobs`)
    const payload = (await res.json()) as {
      jobs?: { name: string; url?: string; color?: string; lastBuild?: { number?: number; result?: string | null } }[]
    }
    return (payload.jobs ?? []).map((j) => ({
      id: `${server.id}:${j.name}`,
      name: j.name,
      serverId: server.id,
      server: base,
      url: j.url ?? `${base}/${this.jobPath(j.name)}`,
      lastBuild: j.lastBuild
        ? { number: j.lastBuild.number ?? 0, status: j.lastBuild.result ?? (j.color?.includes('anime') ? 'RUNNING' : 'UNKNOWN') }
        : null,
    }))
  }

  private persistCredentials(data: {
    secretRef?: string
    username?: string
    apiToken?: string
  }): string {
    if (data.secretRef?.startsWith('vault:enc:v1:')) return data.secretRef

    if (data.secretRef) {
      const parsed = this.readCredentials(data.secretRef)
      if (parsed.username && parsed.apiToken) {
        return this.vault.storeSecrets(parsed)
      }
    }

    if (!data.username?.trim() || !data.apiToken?.trim()) {
      throw new BadRequestException('Jenkins requiere usuario y API token')
    }

    return this.vault.storeSecrets({
      username: data.username.trim(),
      apiToken: data.apiToken.trim(),
    })
  }

  private async queueJenkinsBuild(
    server: { url: string; secretRef: string },
    jobName: string,
    parameters: Record<string, string>,
  ): Promise<{ queueId?: number; queueUrl?: string }> {
    const base = server.url.replace(/\/$/, '')
    const auth = this.authHeader(server.secretRef)
    if (!auth) throw new BadRequestException('Jenkins requiere usuario y API token para desplegar apps')
    const crumb = await this.fetchCrumb(server)
    const hasParameters = Object.keys(parameters).length > 0
    const body = hasParameters ? new URLSearchParams(parameters) : undefined
    const endpoint = hasParameters ? 'buildWithParameters' : 'build'
    const res = await fetch(`${base}/${this.jobPath(jobName)}/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        ...crumb,
        ...(hasParameters ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body,
      signal: AbortSignal.timeout(12_000),
    })
    if (res.status !== 200 && res.status !== 201 && res.status !== 202) {
      const text = await res.text().catch(() => '')
      throw new BadRequestException(`Jenkins respondió HTTP ${res.status} al desplegar: ${text.slice(0, 180)}`)
    }
    const queueUrl = res.headers.get('location') ?? undefined
    const queueId = queueUrl?.match(/queue\/item\/(\d+)/)?.[1]
    return { queueUrl, queueId: queueId ? Number(queueId) : undefined }
  }
}
