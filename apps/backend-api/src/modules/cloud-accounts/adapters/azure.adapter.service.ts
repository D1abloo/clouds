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

const AZURE_REGIONS = [
  { id: 'westeurope', name: 'West Europe', zones: ['1', '2', '3'] },
  { id: 'eastus', name: 'East US', zones: ['1', '2'] },
  { id: 'spaincentral', name: 'Spain Central', zones: ['1'] },
]

const AZURE_PERMS = [
  'Microsoft.Compute/virtualMachines/read',
  'Microsoft.Compute/virtualMachines/start/action',
  'Microsoft.Compute/virtualMachines/powerOff/action',
  'Microsoft.Insights/metrics/read',
  'Microsoft.CostManagement/query/action',
]

@Injectable()
export class AzureAdapterService implements CloudProviderAdapter {
  // TODO: @azure/arm-compute

  async validateConnection(ctx: CloudAdapterContext): Promise<ValidationResult> {
    return buildValidation(ctx, 'Azure', AZURE_PERMS)
  }

  async listRegions(ctx: CloudAdapterContext): Promise<CloudRegion[]> {
    return regionsFor(ctx, AZURE_REGIONS)
  }

  async listNetworks(ctx: CloudAdapterContext, region?: string): Promise<CloudNetwork[]> {
    const r = region ?? ctx.defaultRegion ?? 'westeurope'
    return mockNetworks(ctx, r).map((n) => ({ ...n, type: 'vnet' }))
  }

  async listSecurityGroups(ctx: CloudAdapterContext, region?: string): Promise<CloudSecurityGroup[]> {
    const r = region ?? ctx.defaultRegion ?? 'westeurope'
    return mockSecurityGroups(ctx, r).map((s) => ({ ...s, name: `nsg-${s.name}` }))
  }

  async listImages(ctx: CloudAdapterContext, region: string): Promise<CloudImage[]> {
    return mockImages(ctx, region).map((i) => ({ ...i, id: `/subscriptions/demo/images/${i.id}` }))
  }

  async listInstanceTypes(ctx: CloudAdapterContext, region: string): Promise<CloudInstanceType[]> {
    return mockInstanceTypes(ctx, region).map((t) => ({
      ...t,
      id: `Standard_B${t.vcpus}s`,
      name: `Standard_B${t.vcpus}s`,
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

  async startInstance(ctx: CloudAdapterContext, instanceId: string): Promise<ActionResult> {
    console.log(`[Azure SDK-ready] start ${instanceId} sub=${ctx.config['subscriptionId']}`)
    return { success: true, message: `[Azure] Started ${instanceId}` }
  }

  async stopInstance(ctx: CloudAdapterContext, instanceId: string): Promise<ActionResult> {
    return { success: true, message: `[Azure] Deallocated ${instanceId}` }
  }

  async restartInstance(ctx: CloudAdapterContext, instanceId: string): Promise<ActionResult> {
    return { success: true, message: `[Azure] Restarted ${instanceId}` }
  }

  async launchInstance(ctx: CloudAdapterContext, input: LaunchInstanceInput): Promise<CloudInstance> {
    return {
      id: `vm-${Date.now().toString(36)}`,
      name: input.name,
      region: input.region,
      status: 'PENDING' as InstanceStatus,
      instanceType: input.instanceType,
      provider: ctx.provider,
      metadata: { imageId: input.imageId, resourceGroup: ctx.config['resourceGroup'], isDemo: true },
    }
  }

  async syncInventory(ctx: CloudAdapterContext): Promise<CloudInstance[]> {
    return this.listInstances(ctx)
  }
}
