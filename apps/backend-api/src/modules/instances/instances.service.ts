import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { CloudProvider } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { AwsAdapterService } from '../cloud-accounts/adapters/aws.adapter.service'
import { GcpAdapterService } from '../cloud-accounts/adapters/gcp.adapter.service'
import { AzureAdapterService } from '../cloud-accounts/adapters/azure.adapter.service'

@Injectable()
export class InstancesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private aws: AwsAdapterService,
    private gcp: GcpAdapterService,
    private azure: AzureAdapterService,
  ) {}

  async findAll(filters?: { projectId?: string; provider?: CloudProvider; cloudAccountId?: string; region?: string }) {
    const rows = await this.prisma.instance.findMany({
      where: {
        deletedAt: null,
        ...(filters?.projectId && { projectId: filters.projectId }),
        ...(filters?.provider && { provider: filters.provider }),
        ...(filters?.cloudAccountId && { cloudAccountId: filters.cloudAccountId }),
        ...(filters?.region && { region: filters.region }),
      },
      include: { cloudAccount: { select: { id: true, name: true, provider: true } } },
      orderBy: [{ provider: 'asc' }, { region: 'asc' }, { name: 'asc' }],
    })
    return rows.map((row) => this.enrichInstance(row))
  }

  async findOne(id: string) {
    const instance = await this.prisma.instance.findUnique({
      where: { id, deletedAt: null },
      include: { cloudAccount: true, project: true },
    })
    if (!instance) throw new NotFoundException('Instance not found')
    return this.enrichInstance(instance)
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

    const row = instance as { externalId: string; region: string; provider: CloudProvider }
    const adapter = this.getAdapter(row.provider)
    if (action === 'start') await adapter.startInstance(row.externalId, row.region)
    if (action === 'stop') await adapter.stopInstance(row.externalId, row.region)
    if (action === 'restart') await adapter.restartInstance(row.externalId, row.region)

    await this.audit.create({
      userId,
      action: `instance.${action}`,
      resource: 'instance',
      resourceId: id,
    })

    return { success: true, action }
  }

  private getAdapter(provider: CloudProvider) {
    switch (provider) {
      case CloudProvider.AWS: return this.aws
      case CloudProvider.GCP: return this.gcp
      case CloudProvider.AZURE: return this.azure
    }
  }
}
