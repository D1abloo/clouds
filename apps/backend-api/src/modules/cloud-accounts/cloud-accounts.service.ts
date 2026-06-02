import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { CloudProvider } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { CreateCloudAccountDto } from './dto/create-cloud-account.dto'
import { AwsAdapterService } from './adapters/aws.adapter.service'
import { GcpAdapterService } from './adapters/gcp.adapter.service'
import { AzureAdapterService } from './adapters/azure.adapter.service'
import { CloudProviderAdapter } from './adapters/cloud-provider.adapter'

@Injectable()
export class CloudAccountsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private awsAdapter: AwsAdapterService,
    private gcpAdapter: GcpAdapterService,
    private azureAdapter: AzureAdapterService,
  ) {}

  private getAdapter(provider: CloudProvider): CloudProviderAdapter {
    switch (provider) {
      case CloudProvider.AWS: return this.awsAdapter
      case CloudProvider.GCP: return this.gcpAdapter
      case CloudProvider.AZURE: return this.azureAdapter
      default: throw new BadRequestException('Unsupported provider')
    }
  }

  async create(dto: CreateCloudAccountDto, userId?: string) {
    const account = await this.prisma.cloudAccount.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        provider: dto.provider,
        accountId: dto.accountId,
        credentials: dto.credentialType
          ? { create: [{ credentialType: dto.credentialType, secretRef: dto.secretRef ?? 'vault:pending' }] }
          : undefined,
      },
      include: { credentials: true },
    })

    await this.audit.create({
      userId,
      action: 'cloud_account.create',
      resource: 'cloud_account',
      resourceId: account.id,
    })

    return this.sanitizeAccount(account)
  }

  async findAll(projectId?: string) {
    const accounts = await this.prisma.cloudAccount.findMany({
      where: { deletedAt: null, ...(projectId ? { projectId } : {}) },
      include: { credentials: { select: { id: true, credentialType: true, createdAt: true } } },
    })
    return accounts.map((a) => this.sanitizeAccount(a))
  }

  async validateConnection(id: string, userId?: string) {
    const account = await this.prisma.cloudAccount.findUnique({ where: { id } })
    if (!account) throw new NotFoundException('Cloud account not found')

    const result = await this.getAdapter(account.provider).validateCredentials()

    await this.audit.create({
      userId,
      action: 'cloud_account.validate',
      resource: 'cloud_account',
      resourceId: id,
      metadata: { valid: result.valid },
    })

    return result
  }

  async listRegions(id: string) {
    const account = await this.prisma.cloudAccount.findUnique({ where: { id } })
    if (!account) throw new NotFoundException('Cloud account not found')
    return this.getAdapter(account.provider).listRegions()
  }

  async syncInventory(id: string, userId?: string) {
    const account = await this.prisma.cloudAccount.findUnique({ where: { id } })
    if (!account) throw new NotFoundException('Cloud account not found')

    const instances = await this.getAdapter(account.provider).syncInventory()

    for (const inst of instances) {
      const existing = await this.prisma.instance.findFirst({
        where: { cloudAccountId: id, externalId: inst.id },
      })

      if (existing) {
        await this.prisma.instance.update({
          where: { id: existing.id },
          data: {
            name: inst.name,
            status: inst.status,
            instanceType: inst.instanceType,
            metadata: inst.metadata as object | undefined,
          },
        })
      } else {
        await this.prisma.instance.create({
          data: {
            projectId: account.projectId,
            cloudAccountId: id,
            externalId: inst.id,
            name: inst.name,
            provider: inst.provider,
            region: inst.region,
            instanceType: inst.instanceType,
            status: inst.status,
            metadata: inst.metadata as object | undefined,
          },
        })
      }
    }

    await this.audit.create({
      userId,
      action: 'cloud_account.sync',
      resource: 'cloud_account',
      resourceId: id,
      metadata: { count: instances.length },
    })

    return { synced: instances.length }
  }

  private sanitizeAccount<T extends { credentials?: unknown[] }>(account: T) {
    return { ...account, credentials: undefined, hasCredentials: !!(account.credentials?.length) }
  }
}
