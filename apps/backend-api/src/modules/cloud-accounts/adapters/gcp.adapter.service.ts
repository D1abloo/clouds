import { Injectable } from '@nestjs/common'
import { InstanceStatus } from '@prisma/client'
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

const GCP_REGIONS = [
  { id: 'us-central1-a', name: 'US Central (Iowa)', zones: ['us-central1-a', 'us-central1-b'] },
  { id: 'europe-west1-b', name: 'Europe West (Belgium)', zones: ['europe-west1-b', 'europe-west1-c'] },
]

const GCP_PERMS = [
  'compute.instances.list',
  'compute.instances.start',
  'compute.instances.stop',
  'monitoring.timeSeries.list',
  'billing.accounts.get',
]

@Injectable()
export class GcpAdapterService implements CloudProviderAdapter {
  // TODO: @google-cloud/compute

  async validateConnection(ctx: CloudAdapterContext): Promise<ValidationResult> {
    return buildValidation(ctx, 'GCP', GCP_PERMS)
  }

  async listRegions(ctx: CloudAdapterContext): Promise<CloudRegion[]> {
    return regionsFor(ctx, GCP_REGIONS)
  }

  async listNetworks(ctx: CloudAdapterContext, region?: string): Promise<CloudNetwork[]> {
    const r = region ?? ctx.defaultRegion ?? 'us-central1-a'
    return mockNetworks(ctx, r).map((n) => ({ ...n, type: 'vpc-network' }))
  }

  async listSecurityGroups(ctx: CloudAdapterContext, region?: string): Promise<CloudSecurityGroup[]> {
    const r = region ?? ctx.defaultRegion ?? 'us-central1-a'
    return mockSecurityGroups(ctx, r).map((s) => ({ ...s, name: `fw-${s.name}` }))
  }

  async listImages(ctx: CloudAdapterContext, region: string): Promise<CloudImage[]> {
    return mockImages(ctx, region).map((i) => ({ ...i, id: `projects/demo/global/images/${i.id}` }))
  }

  async listInstanceTypes(ctx: CloudAdapterContext, region: string): Promise<CloudInstanceType[]> {
    return mockInstanceTypes(ctx, region).map((t) => ({
      ...t,
      id: `e2-${t.name}`,
      name: `e2-${t.name}`,
    }))
  }

  async listInstances(ctx: CloudAdapterContext, region?: string): Promise<CloudInstance[]> {
    const all = synthesizeInstances(ctx)
    if (region) return all.filter((i) => i.region === region)
    return all
  }

  async getInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<CloudInstance | null> {
    return (await this.listInstances(ctx, region)).find((i) => i.id === instanceId) ?? null
  }

  async startInstance(ctx: CloudAdapterContext, instanceId: string, _region?: string): Promise<ActionResult> {
    console.log(`[GCP SDK-ready] start ${instanceId} project=${ctx.config['projectId']}`)
    return { success: true, message: `[GCP] Started ${instanceId}` }
  }

  async stopInstance(ctx: CloudAdapterContext, instanceId: string): Promise<ActionResult> {
    console.log(`[GCP SDK-ready] stop ${instanceId}`)
    return { success: true, message: `[GCP] Stopped ${instanceId}` }
  }

  async restartInstance(ctx: CloudAdapterContext, instanceId: string): Promise<ActionResult> {
    return { success: true, message: `[GCP] Reset ${instanceId}` }
  }

  async launchInstance(ctx: CloudAdapterContext, input: LaunchInstanceInput): Promise<CloudInstance> {
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

  async syncInventory(ctx: CloudAdapterContext): Promise<CloudInstance[]> {
    return this.listInstances(ctx)
  }
}
