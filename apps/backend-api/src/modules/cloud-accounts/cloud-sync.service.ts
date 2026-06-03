import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { CloudAdapterRegistry } from './cloud-adapter.registry'
import { SyncResult } from './adapters/cloud-provider.adapter'
import { LaunchInstanceDto } from './dto/launch-instance.dto'

@Injectable()
export class CloudSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: CloudAdapterRegistry,
    private readonly realtime: RealtimeGateway,
    private readonly audit: AuditService,
  ) {}

  async fullSync(accountId: string, userId?: string): Promise<SyncResult> {
    const started = Date.now()
    await this.setSyncStatus(accountId, 'syncing')
    this.realtime.emitSyncProgress(accountId, { status: 'syncing', step: 'validate' })

    const validation = await this.registry.validateConnection(accountId)
    if (!validation.valid) {
      await this.setSyncStatus(accountId, 'error')
      this.realtime.emitSyncProgress(accountId, { status: 'error', message: validation.message })
      return { synced: 0, regions: 0, networks: 0, securityGroups: 0, instances: 0, durationMs: Date.now() - started }
    }

    const regions = await this.registry.listRegions(accountId)
    const defaultRegion = regions[0]?.id
    for (const region of regions) {
      await this.prisma.cloudRegion.upsert({
        where: { cloudAccountId_regionId: { cloudAccountId: accountId, regionId: region.id } },
        create: { cloudAccountId: accountId, regionId: region.id, name: region.name },
        update: { name: region.name },
      })
    }

    this.realtime.emitSyncProgress(accountId, { status: 'syncing', step: 'networks', regions: regions.length })
    const networks = await this.registry.listNetworks(accountId, defaultRegion)
    const securityGroups = await this.registry.listSecurityGroups(accountId, defaultRegion)

    const snapshot = {
      networks,
      securityGroups,
      syncedAt: new Date().toISOString(),
    }
    await this.prisma.cloudAccount.update({
      where: { id: accountId },
      data: {
        config: {
          ...(await this.getConfig(accountId)),
          lastSyncSnapshot: JSON.parse(JSON.stringify(snapshot)),
        } as object,
      },
    })

    this.realtime.emitSyncProgress(accountId, { status: 'syncing', step: 'instances' })
    const instances = await this.registry.syncInventory(accountId)
    const synced = await this.persistInstances(accountId, instances)

    await this.prisma.cloudAccount.update({
      where: { id: accountId },
      data: { lastSyncedAt: new Date(), syncStatus: 'idle', defaultRegion: defaultRegion ?? undefined },
    })

    const result: SyncResult = {
      synced,
      regions: regions.length,
      networks: networks.length,
      securityGroups: securityGroups.length,
      instances: synced,
      durationMs: Date.now() - started,
    }

    await this.audit.create({
      userId,
      action: 'cloud_account.sync',
      resource: 'cloud_account',
      resourceId: accountId,
      metadata: { ...result } as Record<string, unknown>,
    })

    this.realtime.emitInventoryUpdate(accountId, result)
    this.realtime.emitSyncProgress(accountId, { status: 'completed', ...result })
    return result
  }

  async launchInstance(accountId: string, dto: LaunchInstanceDto, userId?: string) {
    const launched = await this.registry.launchInstance(accountId, dto)
    const account = await this.prisma.cloudAccount.findUnique({ where: { id: accountId } })
    if (!account) return launched

    const row = await this.prisma.instance.create({
      data: {
        projectId: account.projectId,
        cloudAccountId: accountId,
        externalId: launched.id,
        name: launched.name,
        provider: launched.provider,
        region: launched.region,
        instanceType: launched.instanceType,
        status: launched.status,
        metadata: launched.metadata as object,
      },
    })

    await this.audit.create({
      userId,
      action: 'instance.launch',
      resource: 'instance',
      resourceId: row.id,
      metadata: { cloudAccountId: accountId, externalId: launched.id },
    })

    this.realtime.emitInventoryUpdate(accountId, { launched: 1, instanceId: row.id })
    return { ...launched, dbId: row.id }
  }

  private async persistInstances(accountId: string, instances: Awaited<ReturnType<CloudAdapterRegistry['syncInventory']>>) {
    const account = await this.prisma.cloudAccount.findUnique({ where: { id: accountId } })
    if (!account) return 0

    for (const inst of instances) {
      const existing = await this.prisma.instance.findFirst({
        where: { cloudAccountId: accountId, externalId: inst.id },
      })
      if (existing) {
        await this.prisma.instance.update({
          where: { id: existing.id },
          data: {
            name: inst.name,
            status: inst.status,
            instanceType: inst.instanceType,
            region: inst.region,
            metadata: inst.metadata as object,
          },
        })
      } else {
        await this.prisma.instance.create({
          data: {
            projectId: account.projectId,
            cloudAccountId: accountId,
            externalId: inst.id,
            name: inst.name,
            provider: inst.provider,
            region: inst.region,
            instanceType: inst.instanceType,
            status: inst.status,
            metadata: inst.metadata as object,
          },
        })
      }
    }
    return instances.length
  }

  private setSyncStatus = async (accountId: string, status: string) => {
    await this.prisma.cloudAccount.update({ where: { id: accountId }, data: { syncStatus: status } })
    this.realtime.emitAccountUpdate(accountId, { syncStatus: status })
  }

  private getConfig = async (accountId: string) => {
    const acc = await this.prisma.cloudAccount.findUnique({ where: { id: accountId } })
    return (acc?.config as Record<string, unknown>) ?? {}
  }
}
