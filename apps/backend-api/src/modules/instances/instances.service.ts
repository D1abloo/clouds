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
    return this.prisma.instance.findMany({
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
  }

  async findOne(id: string) {
    const instance = await this.prisma.instance.findUnique({
      where: { id, deletedAt: null },
      include: { cloudAccount: true, project: true },
    })
    if (!instance) throw new NotFoundException('Instance not found')
    return instance
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
    if (!instance.cloudAccountId) throw new BadRequestException('Instance has no cloud account')

    const adapter = this.getAdapter(instance.provider)
    if (action === 'start') await adapter.startInstance(instance.externalId, instance.region)
    if (action === 'stop') await adapter.stopInstance(instance.externalId, instance.region)
    if (action === 'restart') await adapter.restartInstance(instance.externalId, instance.region)

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
