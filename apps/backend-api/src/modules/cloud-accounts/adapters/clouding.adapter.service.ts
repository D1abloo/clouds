import { Injectable } from '@nestjs/common'
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

const CLOUDING_PERMS = [
  'instances.list',
  'instances.create',
  'networks.read',
  'images.read',
  'billing.read',
]

const REGIONS = [
  { id: 'eu-central', name: 'EU Central (Frankfurt)', zones: ['eu-central-a', 'eu-central-b'] },
  { id: 'us-east', name: 'US East (Virginia)', zones: ['us-east-a', 'us-east-b'] },
  { id: 'ap-south', name: 'AP South (Singapore)', zones: ['ap-south-a'] },
]

const OPERATIONAL_IMAGES = (region: string): CloudImage[] => [
  { id: `cld-img-ubuntu-2204-${region}`, name: 'Ubuntu 22.04 LTS', region, os: 'linux', architecture: 'x86_64', status: 'available' },
  { id: `cld-img-debian-12-${region}`, name: 'Debian 12', region, os: 'linux', architecture: 'x86_64', status: 'available' },
  { id: `cld-img-rocky-9-${region}`, name: 'Rocky Linux 9', region, os: 'linux', architecture: 'x86_64', status: 'available' },
  { id: `cld-img-alma-9-${region}`, name: 'AlmaLinux 9', region, os: 'linux', architecture: 'x86_64', status: 'available' },
  { id: `cld-img-win-2022-${region}`, name: 'Windows Server 2022', region, os: 'windows', architecture: 'x86_64', status: 'available' },
]

@Injectable()
export class CloudingAdapterService implements CloudProviderAdapter {
  async validateConnection(ctx: CloudAdapterContext): Promise<ValidationResult> {
    return buildValidation(ctx, 'Clouding', CLOUDING_PERMS)
  }

  async listRegions(ctx: CloudAdapterContext): Promise<CloudRegion[]> {
    return regionsFor(ctx, REGIONS)
  }

  async listNetworks(ctx: CloudAdapterContext, region?: string): Promise<CloudNetwork[]> {
    const r = region ?? ctx.defaultRegion ?? 'eu-central'
    return mockNetworks(ctx, r).map((n) => ({ ...n, name: n.name.replace('vpc', 'network') }))
  }

  async listSecurityGroups(ctx: CloudAdapterContext, region?: string): Promise<CloudSecurityGroup[]> {
    const r = region ?? ctx.defaultRegion ?? 'eu-central'
    return mockSecurityGroups(ctx, r).map((s) => ({ ...s, name: `policy-${s.name}` }))
  }

  async listImages(ctx: CloudAdapterContext, region: string): Promise<CloudImage[]> {
    const items = OPERATIONAL_IMAGES(region)
    return items.length ? items : mockImages(ctx, region)
  }

  async listInstanceTypes(ctx: CloudAdapterContext, region: string): Promise<CloudInstanceType[]> {
    return [
      { id: 'cld.standard-2', name: 'standard-2', region, vcpus: 2, memoryGb: 4, pricePerHour: 0.045 },
      { id: 'cld.standard-4', name: 'standard-4', region, vcpus: 4, memoryGb: 8, pricePerHour: 0.089 },
      { id: 'cld.performance-8', name: 'performance-8', region, vcpus: 8, memoryGb: 16, pricePerHour: 0.168 },
      { id: 'cld.arm-4', name: 'arm-4', region, vcpus: 4, memoryGb: 8, pricePerHour: 0.072 },
    ]
  }

  async listInstances(ctx: CloudAdapterContext, _region?: string): Promise<CloudInstance[]> {
    return synthesizeInstances(ctx)
  }

  async getInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<CloudInstance | null> {
    const list = await this.listInstances(ctx, region)
    return list.find((i) => i.id === instanceId) ?? null
  }

  async startInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    const inst = await this.getInstance(ctx, instanceId, region)
    if (!inst) return { success: false, message: 'Instance not found' }
    return { success: true, message: `Started ${instanceId}` }
  }

  async stopInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    const inst = await this.getInstance(ctx, instanceId, region)
    if (!inst) return { success: false, message: 'Instance not found' }
    return { success: true, message: `Stopped ${instanceId}` }
  }

  async restartInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    const inst = await this.getInstance(ctx, instanceId, region)
    if (!inst) return { success: false, message: 'Instance not found' }
    return { success: true, message: `Restarted ${instanceId}` }
  }

  async launchInstance(ctx: CloudAdapterContext, input: LaunchInstanceInput): Promise<CloudInstance> {
    return {
      id: `cld-${Date.now().toString(36)}`,
      name: input.name,
      region: input.region,
      status: 'RUNNING' as InstanceStatus,
      instanceType: input.instanceType,
      provider: CloudProvider.CLOUDING,
      metadata: {
        imageId: input.imageId,
        subnetId: input.subnetId,
        securityGroupIds: input.securityGroupIds,
        availabilityZone: input.availabilityZone,
        resourceGroup: input.resourceGroup,
        keyPair: input.keyPair,
        publicIp: input.publicIp,
        diskGb: input.diskGb,
        diskType: input.diskType,
        userData: input.userData,
        monitoring: input.monitoring,
        tags: input.tags,
        launchedAt: new Date().toISOString(),
      },
    }
  }

  async syncInventory(ctx: CloudAdapterContext): Promise<CloudInstance[]> {
    return synthesizeInstances(ctx)
  }
}
