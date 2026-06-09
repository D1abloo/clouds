import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { CloudProvider, InstanceStatus } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { CloudAdapterRegistry } from '../cloud-accounts/cloud-adapter.registry'
import { DockerDiscoveryService } from '../docker-discovery/docker-discovery.service'
import { KubernetesDiscoveryService } from '../kubernetes-discovery/kubernetes-discovery.service'

@Injectable()
export class InstancesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private cloudRegistry: CloudAdapterRegistry,
    private dockerDiscovery: DockerDiscoveryService,
    private k8sDiscovery: KubernetesDiscoveryService,
  ) {}

  async findAll(filters?: {
    projectId?: string
    projectIds?: string[]
    provider?: string
    cloudAccountId?: string
    region?: string
  }) {
    if (filters?.projectIds && !filters.projectIds.length) {
      return []
    }
    if (filters?.provider === 'VPS') {
      return this.findAllVpsAsInstances(filters)
    }

    const rows = await this.prisma.instance.findMany({
      where: {
        deletedAt: null,
        ...(filters?.projectId && { projectId: filters.projectId }),
        ...(filters?.projectIds?.length && { projectId: { in: filters.projectIds } }),
        ...(filters?.provider &&
          filters.provider !== 'VPS' && { provider: filters.provider as CloudProvider }),
        ...(filters?.cloudAccountId && { cloudAccountId: filters.cloudAccountId }),
        ...(filters?.region && { region: filters.region }),
      },
      include: { cloudAccount: { select: { id: true, name: true, provider: true } } },
      orderBy: [{ provider: 'asc' }, { region: 'asc' }, { name: 'asc' }],
    })

    const cloud = rows.map((row) => this.enrichInstance(row))

    if (filters?.provider) {
      return cloud
    }

    const vps = await this.findAllVpsAsInstances(filters)
    return [...cloud, ...vps]
  }

  private async findAllVpsAsInstances(filters?: {
    projectId?: string
    projectIds?: string[]
    region?: string
  }) {
    const vpsRows = await this.prisma.vpsServer.findMany({
      where: {
        deletedAt: null,
        ...(filters?.projectId && { projectId: filters.projectId }),
        ...(filters?.projectIds?.length && { projectId: { in: filters.projectIds } }),
      },
      orderBy: { name: 'asc' },
    })

    return vpsRows
      .filter((v) => !filters?.region || v.hostname === filters.region || (v.metadata as Record<string, unknown>)?.['region'] === filters.region)
      .map((v) => this.enrichVpsAsInstance(v))
  }

  private enrichVpsAsInstance(vps: Record<string, unknown>) {
    const meta = (vps['metadata'] as Record<string, unknown>) ?? {}
    const sshStatus = String(meta['sshStatus'] ?? 'unknown')
    const statusMap: Record<string, string> = {
      connected: 'RUNNING',
      disconnected: 'STOPPED',
      warning: 'WARNING',
      error: 'ERROR',
    }
    return {
      id: vps['id'],
      projectId: vps['projectId'],
      cloudAccountId: null,
      externalId: vps['id'],
      name: vps['name'],
      provider: 'VPS',
      region: String(meta['region'] ?? meta['publicIp'] ?? vps['hostname'] ?? '—'),
      instanceType: 'bare-metal',
      status: statusMap[sshStatus] ?? 'UNKNOWN',
      metadata: meta,
      publicIp: meta['publicIp'] ?? vps['hostname'],
      privateIp: meta['privateIp'] ?? null,
      os: meta['os'] ?? null,
      environment: meta['environment'] ?? null,
      health: meta['health'] ?? sshStatus,
      isDemo: meta['isDemo'] ?? false,
      isVps: true,
      cpuCores: meta['cpuCores'] ?? null,
      ramGb: meta['ramGb'] ?? null,
      diskGb: meta['diskGb'] ?? null,
      monthlyCost: meta['monthlyCost'] ?? null,
      mtdCost: meta['mtdCost'] ?? null,
      tags: meta['tags'] ?? {},
      hasDocker: meta['hasDocker'] ?? false,
      hasKubernetes: meta['hasKubernetes'] ?? false,
    }
  }

  async findOne(id: string) {
    const instance = await this.prisma.instance.findUnique({
      where: { id, deletedAt: null },
      include: { cloudAccount: true, project: true },
    })
    if (instance) return this.enrichInstance(instance)

    const vps = await this.prisma.vpsServer.findUnique({
      where: { id, deletedAt: null },
    })
    if (vps) return this.enrichVpsAsInstance(vps as unknown as Record<string, unknown>)

    throw new NotFoundException('Instance not found')
  }

  private enrichInstance<T extends Record<string, unknown>>(instance: T) {
    const meta = (instance['metadata'] as Record<string, unknown>) ?? {}
    return {
      ...instance,
      publicIp: meta['publicIp'] ?? null,
      privateIp: meta['privateIp'] ?? null,
      os: meta['os'] ?? null,
      environment: meta['environment'] ?? null,
      health: meta['health'] ?? null,
      isDemo: meta['isDemo'] ?? false,
      cpuCores: meta['cpuCores'] ?? null,
      ramGb: meta['ramGb'] ?? null,
      diskGb: meta['diskGb'] ?? null,
      monthlyCost: meta['monthlyCost'] ?? null,
      mtdCost: meta['mtdCost'] ?? null,
      tags: meta['tags'] ?? {},
      systemd: meta['systemd'] ?? [],
      ports: meta['ports'] ?? [],
      hasDocker: meta['hasDocker'] ?? false,
      hasKubernetes: meta['hasKubernetes'] ?? false,
    }
  }

  async start(id: string, userId?: string) {
    return this.runAction(id, 'start', userId)
  }

  async stop(id: string, userId?: string) {
    return this.runAction(id, 'stop', userId)
  }

  async restart(id: string, userId?: string) {
    return this.runAction(id, 'restart', userId)
  }

  async discover(id: string, userId?: string) {
    const instance = await this.findOne(id)
    const meta = (instance as { metadata?: Record<string, unknown> }).metadata ?? {}
    const hostRef = String(
      meta['publicIp'] ?? meta['hostname'] ?? (instance as { name?: string }).name ?? id,
    ).replace(/^https?:\/\//, '')

    const discoveries: Record<string, unknown> = {}

    if (meta['hasDocker'] || (instance as { isVps?: boolean }).isVps) {
      discoveries['docker'] = await this.dockerDiscovery.discover(hostRef)
    }
    if (meta['hasKubernetes']) {
      discoveries['kubernetes'] = await this.k8sDiscovery.discover(hostRef)
    }
    if (Object.keys(discoveries).length === 0) {
      discoveries['docker'] = await this.dockerDiscovery.discover(hostRef)
    }

    await this.audit.create({
      userId,
      action: 'instance.discover',
      resource: 'instance',
      resourceId: id,
      metadata: { hostRef, targets: Object.keys(discoveries) },
    })

    return {
      instanceId: id,
      hostRef,
      discoveries,
      discoveredAt: new Date().toISOString(),
    }
  }

  private async runAction(id: string, action: 'start' | 'stop' | 'restart', userId?: string) {
    const instance = await this.findOne(id)
    const isDemo = Boolean((instance as { isDemo?: unknown }).isDemo === true)
    if (isDemo) {
      await this.audit.create({
        userId,
        action: `instance.${action}.demo`,
        resource: 'instance',
        resourceId: id,
        metadata: { mock: true, blocked: action === 'stop' || action === 'restart' ? false : false },
      })
      return { success: true, action, demo: true, message: `Demo mode: ${action} simulated (no real cloud API call)` }
    }
    if (!instance.cloudAccountId) throw new BadRequestException('Instance has no cloud account')

    const row = instance as { externalId: string; region: string; cloudAccountId: string }
    const accountId = row.cloudAccountId
    let result
    if (action === 'start') result = await this.cloudRegistry.startInstance(accountId, row.externalId, row.region)
    if (action === 'stop') result = await this.cloudRegistry.stopInstance(accountId, row.externalId, row.region)
    if (action === 'restart') result = await this.cloudRegistry.restartInstance(accountId, row.externalId, row.region)

    const statusMap: Record<string, InstanceStatus> = {
      start: 'RUNNING',
      stop: 'STOPPED',
      restart: 'RUNNING',
    }
    await this.prisma.instance.update({
      where: { id },
      data: { status: statusMap[action] },
    })

    await this.audit.create({
      userId,
      action: `instance.${action}`,
      resource: 'instance',
      resourceId: id,
    })

    return { success: true, action, ...result }
  }
}
