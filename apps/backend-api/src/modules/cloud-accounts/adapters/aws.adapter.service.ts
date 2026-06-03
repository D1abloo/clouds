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

const AWS_REGIONS = [
  { id: 'us-east-1', name: 'US East (N. Virginia)', zones: ['us-east-1a', 'us-east-1b'] },
  { id: 'eu-west-1', name: 'Europe (Ireland)', zones: ['eu-west-1a', 'eu-west-1b'] },
  { id: 'eu-south-2', name: 'Europe (Spain)', zones: ['eu-south-2a', 'eu-south-2b'] },
]

const AWS_PERMS = [
  'ec2:DescribeInstances',
  'ec2:StartInstances',
  'ec2:StopInstances',
  'ec2:RebootInstances',
  'cloudwatch:GetMetricData',
  'ce:GetCostAndUsage',
  'ec2:DescribeVpcs',
  'ec2:DescribeSecurityGroups',
]

@Injectable()
export class AwsAdapterService implements CloudProviderAdapter {
  // TODO: @aws-sdk/client-ec2, STS AssumeRole, OIDC web identity

  async validateConnection(ctx: CloudAdapterContext): Promise<ValidationResult> {
    return buildValidation(ctx, 'AWS', AWS_PERMS)
  }

  async listRegions(ctx: CloudAdapterContext): Promise<CloudRegion[]> {
    return regionsFor(ctx, AWS_REGIONS)
  }

  async listNetworks(ctx: CloudAdapterContext, region?: string): Promise<CloudNetwork[]> {
    const r = region ?? ctx.defaultRegion ?? 'us-east-1'
    return mockNetworks(ctx, r)
  }

  async listSecurityGroups(ctx: CloudAdapterContext, region?: string): Promise<CloudSecurityGroup[]> {
    const r = region ?? ctx.defaultRegion ?? 'us-east-1'
    return mockSecurityGroups(ctx, r)
  }

  async listImages(ctx: CloudAdapterContext, region: string): Promise<CloudImage[]> {
    return mockImages(ctx, region)
  }

  async listInstanceTypes(ctx: CloudAdapterContext, region: string): Promise<CloudInstanceType[]> {
    return mockInstanceTypes(ctx, region).map((t) => ({
      ...t,
      id: `t3.${t.name}`,
      name: `t3.${t.name}`,
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

  async startInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    await this.simulateLifecycle(ctx, instanceId, region, 'RUNNING')
    return { success: true, message: `[AWS] Started ${instanceId}`, requestId: `aws-req-${Date.now()}` }
  }

  async stopInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    await this.simulateLifecycle(ctx, instanceId, region, 'STOPPED')
    return { success: true, message: `[AWS] Stopped ${instanceId}` }
  }

  async restartInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    await this.simulateLifecycle(ctx, instanceId, region, 'RUNNING')
    return { success: true, message: `[AWS] Rebooted ${instanceId}` }
  }

  async launchInstance(ctx: CloudAdapterContext, input: LaunchInstanceInput): Promise<CloudInstance> {
    const id = `i-${Date.now().toString(36)}`
    return {
      id,
      name: input.name,
      region: input.region,
      status: 'PENDING' as InstanceStatus,
      instanceType: input.instanceType,
      provider: ctx.provider,
      metadata: {
        imageId: input.imageId,
        subnetId: input.subnetId,
        securityGroupIds: input.securityGroupIds,
        launchedAt: new Date().toISOString(),
        isDemo: true,
      },
    }
  }

  async syncInventory(ctx: CloudAdapterContext): Promise<CloudInstance[]> {
    return this.listInstances(ctx)
  }

  private simulateLifecycle = async (
    _ctx: CloudAdapterContext,
    instanceId: string,
    _region: string | undefined,
    action: string,
  ): Promise<void> => {
    console.log(`[AWS SDK-ready] ${action} ${instanceId}`)
  }
}
