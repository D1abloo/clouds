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

    await this.audit.create({
      userId,
      action: 'cloud_account.sync_started',
      resource: 'cloud_account',
      resourceId: accountId,
    })

    const validation = await this.registry.validateConnection(accountId)
    if (!validation.valid) {
      await this.setSyncStatus(accountId, 'error')
      this.realtime.emitSyncProgress(accountId, { status: 'error', message: validation.message })
      await this.audit.create({
        userId,
        action: 'cloud_account.sync_failed',
        resource: 'cloud_account',
        resourceId: accountId,
        metadata: { reason: validation.message ?? 'validation_failed' },
      })
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
      action: 'cloud_account.sync_completed',
      resource: 'cloud_account',
      resourceId: accountId,
      metadata: { ...result } as Record<string, unknown>,
    })

    this.realtime.emitInventoryUpdate(accountId, result)
    this.realtime.emitSyncProgress(accountId, { status: 'completed', ...result })
    return result
  }

  private emitLaunchStep = async (
    accountId: string,
    percent: number,
    step: string,
    log: string,
    status: 'running' | 'success' | 'error' = 'running',
  ) => {
    this.realtime.emitInstanceLaunchProgress({ accountId, percent, step, log, status })
    await new Promise((r) => setTimeout(r, 350))
  }

  async launchInstance(accountId: string, dto: LaunchInstanceDto, userId?: string) {
    await this.emitLaunchStep(accountId, 12, 'Validando imagen y región', `image=${dto.imageId} region=${dto.region}`)
    await this.emitLaunchStep(accountId, 28, 'Reservando capacidad compute', `type=${dto.instanceType}`)
    await this.emitLaunchStep(
      accountId,
      45,
      'Configurando red y seguridad',
      `subnet=${dto.subnetId ?? 'auto'} sg=${dto.securityGroupIds?.join(',') ?? 'default'} publicIp=${dto.publicIp ?? true}`,
    )
    await this.emitLaunchStep(
      accountId,
      62,
      'Creando volumen raíz',
      `Disco ${dto.diskType ?? 'default'} ${dto.diskGb ?? 30} GB · key=${dto.keyPair ?? 'none'}`,
    )
    if (dto.userData) {
      await this.emitLaunchStep(accountId, 70, 'Aplicando user data', `${dto.userData.length} bytes`)
    }
    await this.emitLaunchStep(
      accountId,
      78,
      'Provisionando instancia',
      `name=${dto.name} monitoring=${dto.monitoring ?? false}`,
    )

    const launched = await this.registry.launchInstance(accountId, dto)

    await this.emitLaunchStep(accountId, 92, 'Registrando en inventario', `externalId=${launched.id}`)
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
    this.realtime.emitInstanceLaunchProgress({
      accountId,
      percent: 100,
      step: 'Instancia operativa',
      log: `${launched.name} (${launched.id}) en ${launched.region}`,
      status: 'success',
    })
    return { ...launched, dbId: row.id }
  }

  private async persistInstances(accountId: string, instances: Awaited<ReturnType<CloudAdapterRegistry['syncInventory']>>) {
    const account = await this.prisma.cloudAccount.findUnique({ where: { id: accountId } })
    if (!account) return 0

    const syncedExternalIds = new Set<string>()

    for (const inst of instances) {
      syncedExternalIds.add(inst.id)
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
            deletedAt: null,
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

    const externalIdList = [...syncedExternalIds]
    await this.prisma.instance.updateMany({
      where: {
        cloudAccountId: accountId,
        ...(externalIdList.length > 0 && { externalId: { notIn: externalIdList } }),
        deletedAt: null,
        status: { not: 'TERMINATED' },
      },
      data: {
        status: 'TERMINATED',
        deletedAt: new Date(),
      },
    })

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
