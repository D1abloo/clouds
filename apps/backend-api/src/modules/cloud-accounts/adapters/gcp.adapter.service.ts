import { Injectable, Logger } from '@nestjs/common'
import { CloudProvider, InstanceStatus } from '@prisma/client'
import {
  ActionResult,
  CloudAdapterContext,
  CloudImage,
  CloudInstance,
  CloudInstanceType,
  CloudNetwork,
  CloudProviderAdapter,
  CloudRegion,
  CloudSecurityGroup,
  LaunchInstanceInput,
  ValidationResult,
} from './cloud-provider.adapter'
import {
  buildValidation,
  mockImages,
  mockInstanceTypes,
  mockNetworks,
  mockSecurityGroups,
  regionsFor,
  synthesizeInstances,
} from './cloud-adapter.helpers'
import {
  createGcpInstancesClient,
  createGcpRegionsClient,
  gcpZoneFromContext,
  resolveGcpProjectId,
} from './sdk/gcp-client.factory'
import { isDemoMode, mapGcpState, parseGcpZone, sdkErrorMessage } from './sdk/adapter-sdk.util'

const GCP_PERMS = [
  'compute.instances.list',
  'compute.instances.start',
  'compute.instances.stop',
  'compute.regions.list',
]

const FALLBACK_REGIONS = [
  { id: 'us-central1', name: 'US Central (Iowa)', zones: ['us-central1-a', 'us-central1-b'] },
  { id: 'europe-west1', name: 'Europe West (Belgium)', zones: ['europe-west1-b'] },
]

@Injectable()
export class GcpAdapterService implements CloudProviderAdapter {
  private readonly logger = new Logger(GcpAdapterService.name)

  async validateConnection(ctx: CloudAdapterContext): Promise<ValidationResult> {
    if (isDemoMode(ctx)) return buildValidation(ctx, 'GCP', GCP_PERMS)
    try {
      const projectId = resolveGcpProjectId(ctx)
      const client = createGcpRegionsClient(ctx)
      const [regions] = await client.list({ project: projectId })
      const count = regions?.length ?? 0
      return {
        valid: count > 0,
        message: `GCP connected — project ${projectId} (${count} regions)`,
        permissions: GCP_PERMS,
        sdkReady: true,
      }
    } catch (err) {
      return {
        valid: false,
        message: sdkErrorMessage(err),
        permissions: GCP_PERMS,
        sdkReady: true,
      }
    }
  }

  async listRegions(ctx: CloudAdapterContext): Promise<CloudRegion[]> {
    if (isDemoMode(ctx)) return regionsFor(ctx, FALLBACK_REGIONS)
    try {
      const projectId = resolveGcpProjectId(ctx)
      const client = createGcpRegionsClient(ctx)
      const [regions] = await client.list({ project: projectId })
      const items =
        regions?.map((r) => ({
          id: String(r.name?.split('/').pop() ?? r.id ?? 'region'),
          name: String(r.description ?? r.name ?? 'region'),
          zones: [] as string[],
        })) ?? []
      return regionsFor(ctx, items.length ? items : FALLBACK_REGIONS)
    } catch (err) {
      this.logger.warn(`GCP listRegions fallback: ${sdkErrorMessage(err)}`)
      return regionsFor(ctx, FALLBACK_REGIONS)
    }
  }

  async listNetworks(ctx: CloudAdapterContext, region?: string): Promise<CloudNetwork[]> {
    const { region: r } = parseGcpZone(region ?? ctx.defaultRegion ?? 'us-central1-a')
    if (isDemoMode(ctx)) return mockNetworks(ctx, r).map((n) => ({ ...n, type: 'vpc-network' }))
    return mockNetworks(ctx, r).map((n) => ({ ...n, type: 'vpc-network' }))
  }

  async listSecurityGroups(ctx: CloudAdapterContext, region?: string): Promise<CloudSecurityGroup[]> {
    const { region: r } = parseGcpZone(region ?? ctx.defaultRegion ?? 'us-central1-a')
    if (isDemoMode(ctx)) return mockSecurityGroups(ctx, r).map((s) => ({ ...s, name: `fw-${s.name}` }))
    return mockSecurityGroups(ctx, r).map((s) => ({ ...s, name: `fw-${s.name}` }))
  }

  async listImages(ctx: CloudAdapterContext, region: string): Promise<CloudImage[]> {
    if (isDemoMode(ctx)) {
      return mockImages(ctx, region).map((i) => ({
        ...i,
        id: `projects/${resolveGcpProjectId(ctx) || 'demo'}/global/images/${i.id}`,
      }))
    }
    return mockImages(ctx, region).map((i) => ({
      ...i,
      id: `projects/${resolveGcpProjectId(ctx)}/global/images/family/ubuntu-2204-lts`,
      name: 'Ubuntu 22.04 LTS (family)',
    }))
  }

  async listInstanceTypes(ctx: CloudAdapterContext, region: string): Promise<CloudInstanceType[]> {
    const { region: r } = parseGcpZone(region)
    if (isDemoMode(ctx)) {
      return mockInstanceTypes(ctx, r).map((t) => ({ ...t, id: `e2-${t.name}`, name: `e2-${t.name}` }))
    }
    return [
      { id: 'e2-micro', name: 'e2-micro', region: r, vcpus: 2, memoryGb: 1, pricePerHour: 0.01 },
      { id: 'e2-small', name: 'e2-small', region: r, vcpus: 2, memoryGb: 2, pricePerHour: 0.02 },
      { id: 'e2-medium', name: 'e2-medium', region: r, vcpus: 2, memoryGb: 4, pricePerHour: 0.04 },
      { id: 'n2-standard-2', name: 'n2-standard-2', region: r, vcpus: 2, memoryGb: 8, pricePerHour: 0.09 },
    ]
  }

  async listInstances(ctx: CloudAdapterContext, region?: string): Promise<CloudInstance[]> {
    if (isDemoMode(ctx)) {
      const all = synthesizeInstances(ctx)
      return region ? all.filter((i) => i.region === region || i.region.startsWith(region)) : all
    }
    try {
      const projectId = resolveGcpProjectId(ctx)
      const client = createGcpInstancesClient(ctx)
      const items: CloudInstance[] = []
      type GcpInst = {
        id?: string | number
        name?: string
        status?: string
        zone?: string
        machineType?: string
        networkInterfaces?: { networkIP?: string; accessConfigs?: { natIP?: string }[] }[]
      }
      for await (const [, scoped] of client.aggregatedListAsync({ project: projectId })) {
        const zoneScoped = scoped as { instances?: GcpInst[] }
        for (const inst of zoneScoped.instances ?? []) {
          if (!inst.id || !inst.name) continue
          const zoneUrl = inst.zone ?? ''
          const zone = zoneUrl.split('/').pop() ?? gcpZoneFromContext(ctx)
          const { region: reg } = parseGcpZone(zone)
          if (region && reg !== region && !zone.startsWith(region)) continue
          items.push({
            id: String(inst.id),
            name: inst.name,
            region: reg,
            status: mapGcpState(inst.status),
            instanceType: inst.machineType?.split('/').pop() ?? 'unknown',
            provider: CloudProvider.GCP,
            metadata: {
              zone,
              publicIp: inst.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP,
              privateIp: inst.networkInterfaces?.[0]?.networkIP,
              isDemo: false,
              syncedAt: new Date().toISOString(),
            },
          })
        }
      }
      return items.length ? items : synthesizeInstances(ctx)
    } catch (err) {
      this.logger.warn(`GCP listInstances fallback: ${sdkErrorMessage(err)}`)
      return synthesizeInstances(ctx)
    }
  }

  async getInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<CloudInstance | null> {
    return (await this.listInstances(ctx, region)).find((i) => i.id === instanceId || i.name === instanceId) ?? null
  }

  async startInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    if (isDemoMode(ctx)) return { success: true, message: `[GCP Demo] Started ${instanceId}` }
    const projectId = resolveGcpProjectId(ctx)
    const zone = gcpZoneFromContext(ctx, region)
    const client = createGcpInstancesClient(ctx)
    await client.start({ project: projectId, zone, instance: instanceId })
    return { success: true, message: `[GCP] Started ${instanceId}` }
  }

  async stopInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    if (isDemoMode(ctx)) return { success: true, message: `[GCP Demo] Stopped ${instanceId}` }
    const projectId = resolveGcpProjectId(ctx)
    const zone = gcpZoneFromContext(ctx, region)
    const client = createGcpInstancesClient(ctx)
    await client.stop({ project: projectId, zone, instance: instanceId })
    return { success: true, message: `[GCP] Stopped ${instanceId}` }
  }

  async restartInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    if (isDemoMode(ctx)) return { success: true, message: `[GCP Demo] Reset ${instanceId}` }
    await this.stopInstance(ctx, instanceId, region)
    await this.startInstance(ctx, instanceId, region)
    return { success: true, message: `[GCP] Restarted ${instanceId}` }
  }

  async launchInstance(ctx: CloudAdapterContext, input: LaunchInstanceInput): Promise<CloudInstance> {
    if (isDemoMode(ctx)) {
      return {
        id: `gce-${Date.now().toString(36)}`,
        name: input.name,
        region: input.region,
        status: 'PENDING' as InstanceStatus,
        instanceType: input.instanceType,
        provider: ctx.provider,
        metadata: { imageId: input.imageId, isDemo: true },
      }
    }
    const projectId = resolveGcpProjectId(ctx)
    const zone = gcpZoneFromContext(ctx, input.region)
    const client = createGcpInstancesClient(ctx)
    const [operation] = await client.insert({
      project: projectId,
      zone,
      instanceResource: {
        name: input.name.replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 63),
        machineType: `zones/${zone}/machineTypes/${input.instanceType}`,
        disks: [
          {
            boot: true,
            autoDelete: true,
            initializeParams: {
              sourceImage: input.imageId.includes('/') ? input.imageId : `projects/debian-cloud/global/images/${input.imageId}`,
            },
          },
        ],
        networkInterfaces: [{ network: 'global/networks/default', accessConfigs: [{ type: 'ONE_TO_ONE_NAT', name: 'External NAT' }] }],
      },
    })
    const vmName = input.name.replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 63)
    return {
      id: vmName,
      name: vmName,
      region: parseGcpZone(zone).region,
      status: 'PENDING',
      instanceType: input.instanceType,
      provider: CloudProvider.GCP,
      metadata: { zone, operation: operation?.latestResponse?.name, isDemo: false },
    }
  }

  async syncInventory(ctx: CloudAdapterContext): Promise<CloudInstance[]> {
    return this.listInstances(ctx)
  }
}
