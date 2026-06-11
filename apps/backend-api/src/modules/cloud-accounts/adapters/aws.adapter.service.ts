import { Injectable, Logger } from '@nestjs/common'
import { CloudProvider, InstanceStatus } from '@prisma/client'
import {
  DescribeImagesCommand,
  DescribeInstancesCommand,
  DescribeInstanceTypesCommand,
  DescribeRegionsCommand,
  DescribeSecurityGroupsCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand,
  RebootInstancesCommand,
  RunInstancesCommand,
  type RunInstancesCommandInput,
  StartInstancesCommand,
  StopInstancesCommand,
} from '@aws-sdk/client-ec2'
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
import { createEc2Client, validateAwsSts } from './sdk/aws-client.factory'
import {
  instancesOnSyncError,
  isDemoMode,
  mapAwsState,
  resolveSyncedInstances,
  sdkErrorMessage,
} from './sdk/adapter-sdk.util'

const AWS_PERMS = [
  'ec2:DescribeInstances',
  'ec2:StartInstances',
  'ec2:StopInstances',
  'ec2:RebootInstances',
  'sts:GetCallerIdentity',
  'ec2:DescribeVpcs',
  'ec2:DescribeSecurityGroups',
]

const FALLBACK_REGIONS = [
  { id: 'us-east-1', name: 'US East (N. Virginia)', zones: ['us-east-1a'] },
  { id: 'eu-west-1', name: 'Europe (Ireland)', zones: ['eu-west-1a'] },
  { id: 'eu-south-2', name: 'Europe (Spain)', zones: ['eu-south-2a'] },
]

@Injectable()
export class AwsAdapterService implements CloudProviderAdapter {
  private readonly logger = new Logger(AwsAdapterService.name)

  async validateConnection(ctx: CloudAdapterContext): Promise<ValidationResult> {
    if (isDemoMode(ctx)) return buildValidation(ctx, 'AWS', AWS_PERMS)
    try {
      const account = await validateAwsSts(ctx)
      return {
        valid: true,
        message: `AWS connected — account ${account}`,
        permissions: AWS_PERMS,
        sdkReady: true,
      }
    } catch (err) {
      return {
        valid: false,
        message: sdkErrorMessage(err),
        permissions: AWS_PERMS,
        sdkReady: true,
      }
    }
  }

  async listRegions(ctx: CloudAdapterContext): Promise<CloudRegion[]> {
    if (isDemoMode(ctx)) return regionsFor(ctx, FALLBACK_REGIONS)
    try {
      const ec2 = await createEc2Client(ctx, 'us-east-1')
      const res = await ec2.send(new DescribeRegionsCommand({ AllRegions: false }))
      const items =
        res.Regions?.filter((r) => r.RegionName).map((r) => ({
          id: r.RegionName!,
          name: r.RegionName!,
          zones: [] as string[],
        })) ?? []
      return regionsFor(ctx, items.length ? items : FALLBACK_REGIONS)
    } catch (err) {
      this.logger.warn(`AWS listRegions fallback: ${sdkErrorMessage(err)}`)
      return regionsFor(ctx, FALLBACK_REGIONS)
    }
  }

  async listNetworks(ctx: CloudAdapterContext, region?: string): Promise<CloudNetwork[]> {
    const r = region ?? ctx.defaultRegion ?? 'us-east-1'
    if (isDemoMode(ctx)) return mockNetworks(ctx, r)
    try {
      const ec2 = await createEc2Client(ctx, r)
      const [vpcs, subnets] = await Promise.all([
        ec2.send(new DescribeVpcsCommand({})),
        ec2.send(new DescribeSubnetsCommand({})),
      ])
      const networks: CloudNetwork[] =
        vpcs.Vpcs?.map((v) => ({
          id: v.VpcId ?? '',
          name: v.Tags?.find((t) => t.Key === 'Name')?.Value ?? v.VpcId ?? 'vpc',
          region: r,
          cidr: v.CidrBlock,
          type: 'vpc',
        })) ?? []
      subnets.Subnets?.forEach((s) => {
        networks.push({
          id: s.SubnetId ?? '',
          name: s.Tags?.find((t) => t.Key === 'Name')?.Value ?? s.SubnetId ?? 'subnet',
          region: r,
          cidr: s.CidrBlock,
          type: 'subnet',
        })
      })
      return networks.length ? networks : mockNetworks(ctx, r)
    } catch (err) {
      this.logger.warn(`AWS listNetworks fallback: ${sdkErrorMessage(err)}`)
      return mockNetworks(ctx, r)
    }
  }

  async listSecurityGroups(ctx: CloudAdapterContext, region?: string): Promise<CloudSecurityGroup[]> {
    const r = region ?? ctx.defaultRegion ?? 'us-east-1'
    if (isDemoMode(ctx)) return mockSecurityGroups(ctx, r)
    try {
      const ec2 = await createEc2Client(ctx, r)
      const res = await ec2.send(new DescribeSecurityGroupsCommand({}))
      const items =
        res.SecurityGroups?.map((sg) => ({
          id: sg.GroupId ?? '',
          name: sg.GroupName ?? sg.GroupId ?? 'sg',
          region: r,
          vpcId: sg.VpcId,
          rules: (sg.IpPermissions?.length ?? 0) + (sg.IpPermissionsEgress?.length ?? 0),
        })) ?? []
      return items.length ? items : mockSecurityGroups(ctx, r)
    } catch (err) {
      this.logger.warn(`AWS listSecurityGroups fallback: ${sdkErrorMessage(err)}`)
      return mockSecurityGroups(ctx, r)
    }
  }

  async listImages(ctx: CloudAdapterContext, region: string): Promise<CloudImage[]> {
    if (isDemoMode(ctx)) return mockImages(ctx, region)
    try {
      const ec2 = await createEc2Client(ctx, region)
      const res = await ec2.send(
        new DescribeImagesCommand({
          Owners: ['amazon'],
          Filters: [{ Name: 'state', Values: ['available'] }],
        }),
      )
      const items =
        res.Images?.filter((img) => (img.State ?? 'available') === 'available')
          .slice(0, 30)
          .map((img) => ({
            id: img.ImageId ?? '',
            name: img.Name ?? img.ImageId ?? 'ami',
            region,
            os: img.PlatformDetails ?? img.Platform ?? 'Linux/UNIX',
            architecture: img.Architecture ?? 'x86_64',
            status: 'available',
            description: img.Description,
          })) ?? []
      return items.length ? items : mockImages(ctx, region)
    } catch (err) {
      this.logger.warn(`AWS listImages fallback: ${sdkErrorMessage(err)}`)
      return mockImages(ctx, region)
    }
  }

  async listInstanceTypes(ctx: CloudAdapterContext, region: string): Promise<CloudInstanceType[]> {
    if (isDemoMode(ctx)) {
      return mockInstanceTypes(ctx, region).map((t) => ({ ...t, id: `t3.${t.name}`, name: `t3.${t.name}` }))
    }
    try {
      const ec2 = await createEc2Client(ctx, region)
      const res = await ec2.send(new DescribeInstanceTypesCommand({ MaxResults: 50 }))
      const items =
        res.InstanceTypes?.slice(0, 30).map((t) => ({
          id: t.InstanceType ?? '',
          name: t.InstanceType ?? '',
          region,
          vcpus: t.VCpuInfo?.DefaultVCpus ?? 2,
          memoryGb: (t.MemoryInfo?.SizeInMiB ?? 4096) / 1024,
        })) ?? []
      return items.length
        ? items
        : mockInstanceTypes(ctx, region).map((t) => ({ ...t, id: `t3.${t.name}`, name: `t3.${t.name}` }))
    } catch (err) {
      this.logger.warn(`AWS listInstanceTypes fallback: ${sdkErrorMessage(err)}`)
      return mockInstanceTypes(ctx, region).map((t) => ({ ...t, id: `t3.${t.name}`, name: `t3.${t.name}` }))
    }
  }

  async listInstances(ctx: CloudAdapterContext, region?: string): Promise<CloudInstance[]> {
    if (isDemoMode(ctx)) {
      const all = synthesizeInstances(ctx)
      return region ? all.filter((i) => i.region === region) : all
    }
    try {
      const regionIds = region
        ? [region]
        : (await this.listRegions(ctx)).slice(0, 8).map((r) => r.id)
      const instances: CloudInstance[] = []
      for (const reg of regionIds) {
        const ec2 = await createEc2Client(ctx, reg)
        const res = await ec2.send(new DescribeInstancesCommand({}))
        for (const reservation of res.Reservations ?? []) {
          for (const inst of reservation.Instances ?? []) {
            if (!inst.InstanceId) continue
            const stateName = (inst.State?.Name ?? '').toLowerCase()
            if (stateName === 'terminated' || stateName === 'shutting-down') continue
            const nameTag = inst.Tags?.find((t) => t.Key === 'Name')?.Value
            instances.push({
              id: inst.InstanceId,
              name: nameTag ?? inst.InstanceId,
              region: reg,
              status: mapAwsState(inst.State?.Name),
              instanceType: inst.InstanceType ?? 'unknown',
              provider: CloudProvider.AWS,
              metadata: {
                publicIp: inst.PublicIpAddress,
                privateIp: inst.PrivateIpAddress,
                isDemo: false,
                syncedAt: new Date().toISOString(),
              },
            })
          }
        }
      }
      return resolveSyncedInstances(ctx, instances, () => synthesizeInstances(ctx))
    } catch (err) {
      this.logger.warn(`AWS listInstances fallback: ${sdkErrorMessage(err)}`)
      return instancesOnSyncError(ctx, () => synthesizeInstances(ctx))
    }
  }

  async getInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<CloudInstance | null> {
    return (await this.listInstances(ctx, region)).find((i) => i.id === instanceId) ?? null
  }

  async startInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    if (isDemoMode(ctx)) {
      return { success: true, message: `[AWS Demo] Started ${instanceId}` }
    }
    const reg = region ?? ctx.defaultRegion ?? 'us-east-1'
    const ec2 = await createEc2Client(ctx, reg)
    await ec2.send(new StartInstancesCommand({ InstanceIds: [instanceId] }))
    return { success: true, message: `[AWS] Started ${instanceId}` }
  }

  async stopInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    if (isDemoMode(ctx)) {
      return { success: true, message: `[AWS Demo] Stopped ${instanceId}` }
    }
    const reg = region ?? ctx.defaultRegion ?? 'us-east-1'
    const ec2 = await createEc2Client(ctx, reg)
    await ec2.send(new StopInstancesCommand({ InstanceIds: [instanceId] }))
    return { success: true, message: `[AWS] Stopped ${instanceId}` }
  }

  async restartInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    if (isDemoMode(ctx)) {
      return { success: true, message: `[AWS Demo] Rebooted ${instanceId}` }
    }
    const reg = region ?? ctx.defaultRegion ?? 'us-east-1'
    const ec2 = await createEc2Client(ctx, reg)
    await ec2.send(new RebootInstancesCommand({ InstanceIds: [instanceId] }))
    return { success: true, message: `[AWS] Rebooted ${instanceId}` }
  }

  async launchInstance(ctx: CloudAdapterContext, input: LaunchInstanceInput): Promise<CloudInstance> {
    const launchMeta = {
      imageId: input.imageId,
      subnetId: input.subnetId,
      securityGroupIds: input.securityGroupIds,
      availabilityZone: input.availabilityZone,
      keyPair: input.keyPair,
      publicIp: input.publicIp,
      diskGb: input.diskGb,
      diskType: input.diskType,
      userData: input.userData ? true : false,
      monitoring: input.monitoring,
      tags: input.tags,
    }

    if (isDemoMode(ctx)) {
      return {
        id: `i-${Date.now().toString(36)}`,
        name: input.name,
        region: input.region,
        status: 'PENDING' as InstanceStatus,
        instanceType: input.instanceType,
        provider: ctx.provider,
        metadata: { ...launchMeta, isDemo: true },
      }
    }
    const ec2 = await createEc2Client(ctx, input.region)
    const tagEntries = [{ Key: 'Name', Value: input.name }]
    if (input.tags) {
      for (const [key, value] of Object.entries(input.tags)) {
        if (key !== 'Name') tagEntries.push({ Key: key, Value: value })
      }
    }

    const runInput: RunInstancesCommandInput = {
      ImageId: input.imageId,
      InstanceType: input.instanceType as RunInstancesCommandInput['InstanceType'],
      MinCount: 1,
      MaxCount: 1,
      KeyName: input.keyPair,
      UserData: input.userData ? Buffer.from(input.userData, 'utf8').toString('base64') : undefined,
      Monitoring: { Enabled: input.monitoring ?? false },
      TagSpecifications: [{ ResourceType: 'instance', Tags: tagEntries }],
    }

    if (input.diskGb || input.diskType) {
      runInput.BlockDeviceMappings = [
        {
          DeviceName: '/dev/xvda',
          Ebs: {
            VolumeSize: input.diskGb ?? 30,
            VolumeType: (input.diskType ?? 'gp3') as never,
            DeleteOnTermination: true,
          },
        },
      ]
    }

    if (input.subnetId) {
      runInput.NetworkInterfaces = [
        {
          DeviceIndex: 0,
          SubnetId: input.subnetId,
          Groups: input.securityGroupIds,
          AssociatePublicIpAddress: input.publicIp !== false,
        },
      ]
    } else {
      runInput.SecurityGroupIds = input.securityGroupIds
      runInput.SubnetId = input.subnetId
      if (input.availabilityZone) {
        runInput.Placement = { AvailabilityZone: input.availabilityZone }
      }
    }

    const res = await ec2.send(new RunInstancesCommand(runInput))
    const inst = res.Instances?.[0]
    return {
      id: inst?.InstanceId ?? `i-pending-${Date.now()}`,
      name: input.name,
      region: input.region,
      status: mapAwsState(inst?.State?.Name ?? 'pending'),
      instanceType: input.instanceType,
      provider: CloudProvider.AWS,
      metadata: { ...launchMeta, isDemo: false },
    }
  }

  async syncInventory(ctx: CloudAdapterContext): Promise<CloudInstance[]> {
    return this.listInstances(ctx)
  }
}
