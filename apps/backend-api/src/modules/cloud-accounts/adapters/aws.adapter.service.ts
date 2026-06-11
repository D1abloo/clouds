import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { CloudProvider, InstanceStatus } from '@prisma/client'
import {
  DescribeInstancesCommand,
  DescribeKeyPairsCommand,
  DescribeRegionsCommand,
  DescribeSecurityGroupsCommand,
  RebootInstancesCommand,
  RunInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
} from '@aws-sdk/client-ec2'
import type { CreateSubnetDto } from '../dto/launch-preflight.dto'
import type { LaunchPreflightResult } from '../dto/launch-preflight.dto'
import {
  ActionResult,
  CloudAdapterContext,
  CloudImage,
  CloudInstance,
  CloudInstanceType,
  CloudKeyPair,
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
import { fetchAllAwsAmisBySection, sanitizeAmiId, verifyAmiInRegion, isValidAwsAmiId } from './sdk/aws-ami-sections.util'
import {
  buildRunInput,
  createAwsSubnet,
  fetchAwsNetworks,
  listAwsAvailabilityZones,
  pickSubnetForLaunch,
  validateAwsLaunchPreflight,
  validateSubnetCidrForVpc,
} from './sdk/aws-network.util'
import { AWS_STATIC_INSTANCE_CATALOG } from './sdk/aws-static-instance-catalog'
import { fetchAllAwsInstanceTypes } from './sdk/aws-instance-types.util'
import { awsOnDemandPricePerHour, awsPricePerMinute } from './sdk/aws-pricing.util'
import {
  instancesOnSyncError,
  isDemoMode,
  mapAwsState,
  resolveSyncedInstances,
  sdkErrorMessage,
} from './sdk/adapter-sdk.util'

const AWS_PERMS = [
  'ec2:DescribeInstances',
  'ec2:DescribeInstanceTypes',
  'ec2:DescribeImages',
  'ec2:DescribeKeyPairs',
  'ec2:RunInstances',
  'ec2:StartInstances',
  'ec2:StopInstances',
  'ec2:RebootInstances',
  'sts:GetCallerIdentity',
  'ec2:DescribeVpcs',
  'ec2:DescribeSubnets',
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
      const networks = await fetchAwsNetworks(ec2, r)
      return networks.length ? networks : mockNetworks(ctx, r)
    } catch (err) {
      this.logger.warn(`AWS listNetworks fallback: ${sdkErrorMessage(err)}`)
      return mockNetworks(ctx, r)
    }
  }

  async listAvailabilityZones(ctx: CloudAdapterContext, region: string): Promise<string[]> {
    if (isDemoMode(ctx)) return [`${region}a`, `${region}b`, `${region}c`]
    try {
      const ec2 = await createEc2Client(ctx, region)
      const zones = await listAwsAvailabilityZones(ec2, region)
      return zones.length ? zones : [`${region}a`, `${region}b`, `${region}c`]
    } catch (err) {
      this.logger.warn(`AWS listAvailabilityZones fallback: ${sdkErrorMessage(err)}`)
      return [`${region}a`, `${region}b`, `${region}c`]
    }
  }

  async createSubnet(ctx: CloudAdapterContext, input: CreateSubnetDto): Promise<CloudNetwork> {
    if (isDemoMode(ctx)) {
      return {
        id: `subnet-demo-${Date.now()}`,
        name: input.name ?? 'demo-subnet',
        region: input.region,
        cidr: input.cidrBlock,
        type: 'subnet',
        availabilityZone: input.availabilityZone,
        vpcId: input.vpcId,
        mapPublicIpOnLaunch: input.mapPublicIpOnLaunch,
      }
    }
    const ec2 = await createEc2Client(ctx, input.region)
    const networks = await fetchAwsNetworks(ec2, input.region)
    const vpc = networks.find((n) => n.id === input.vpcId && n.type === 'vpc')
    const existing = networks
      .filter((n) => n.vpcId === input.vpcId && n.cidr)
      .map((n) => n.cidr!)
    const cidrCheck = validateSubnetCidrForVpc(input.cidrBlock, vpc?.cidr, existing)
    if (!cidrCheck.ok) {
      throw new BadRequestException(
        cidrCheck.suggestion
          ? `${cidrCheck.message} Prueba con ${cidrCheck.suggestion}.`
          : (cidrCheck.message ?? 'CIDR de subnet inválido'),
      )
    }
    try {
      return await createAwsSubnet(ec2, input.region, input)
    } catch (err) {
      throw new BadRequestException(sdkErrorMessage(err))
    }
  }

  async validateLaunchPreflight(ctx: CloudAdapterContext, input: LaunchInstanceInput): Promise<LaunchPreflightResult> {
    if (isDemoMode(ctx)) {
      return { valid: true, checks: [{ id: 'demo', level: 'ok', message: 'Demo mode — validación simulada' }] }
    }
    try {
      const ec2 = await createEc2Client(ctx, input.region)
      const networks = await fetchAwsNetworks(ec2, input.region)
      const sgs = await this.listSecurityGroups(ctx, input.region)
      return await validateAwsLaunchPreflight(ec2, input, networks, sgs)
    } catch (err) {
      return {
        valid: false,
        checks: [{ id: 'preflight', level: 'error', message: sdkErrorMessage(err) }],
      }
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
      const items = await fetchAllAwsAmisBySection(ec2, region)
      if (items.length) return items
      throw new Error(`No AMIs resolved in ${region}`)
    } catch (err) {
      this.logger.warn(`AWS listImages fallback: ${sdkErrorMessage(err)}`)
      return []
    }
  }

  async listInstanceTypes(ctx: CloudAdapterContext, region: string): Promise<CloudInstanceType[]> {
    if (isDemoMode(ctx)) return mockInstanceTypes(ctx, region)
    const enrich = (t: CloudInstanceType): CloudInstanceType => {
      const hourly = awsOnDemandPricePerHour(t.id, region, t.vcpus ?? 2, t.memoryGb ?? 4)
      return { ...t, pricePerHour: hourly, pricePerMinute: awsPricePerMinute(hourly) }
    }
    const fromStatic = (): CloudInstanceType[] =>
      AWS_STATIC_INSTANCE_CATALOG.map((t) =>
        enrich({ id: t.id, name: t.id, region, vcpus: t.vcpus, memoryGb: t.memoryGb }),
      )

    try {
      const ec2 = await createEc2Client(ctx, region)
      const rows = await fetchAllAwsInstanceTypes(ec2)
      if (rows.length) {
        return rows.map((t) =>
          enrich({
            id: t.InstanceType ?? '',
            name: t.InstanceType ?? '',
            region,
            vcpus: t.VCpuInfo?.DefaultVCpus ?? 2,
            memoryGb: Math.round(((t.MemoryInfo?.SizeInMiB ?? 4096) / 1024) * 10) / 10,
          }),
        )
      }
    } catch (err) {
      this.logger.warn(`AWS listInstanceTypes fallback: ${sdkErrorMessage(err)}`)
    }

    const staticCatalog = fromStatic()
    return staticCatalog.length ? staticCatalog : mockInstanceTypes(ctx, region).map(enrich)
  }

  async listKeyPairs(ctx: CloudAdapterContext, region?: string): Promise<CloudKeyPair[]> {
    const r = region ?? ctx.defaultRegion ?? 'us-east-1'
    if (isDemoMode(ctx)) {
      return [
        { id: 'kp-demo-1', name: 'cloudops-ec2-prod', region: r },
        { id: 'kp-demo-2', name: 'cloudops-ec2-staging', region: r },
      ]
    }
    try {
      const ec2 = await createEc2Client(ctx, r)
      const res = await ec2.send(new DescribeKeyPairsCommand({}))
      const items =
        res.KeyPairs?.filter((kp) => kp.KeyName)
          .map((kp) => ({
            id: kp.KeyPairId ?? kp.KeyName!,
            name: kp.KeyName!,
            region: r,
            fingerprint: kp.KeyFingerprint,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)) ?? []
      return items
    } catch (err) {
      this.logger.warn(`AWS listKeyPairs fallback: ${sdkErrorMessage(err)}`)
      return []
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

    const imageId = sanitizeAmiId(input.imageId)
    if (!isValidAwsAmiId(imageId)) {
      throw new BadRequestException(
        `AMI inválida (${input.imageId}). Elige una imagen del catálogo en la región ${input.region}.`,
      )
    }

    const ec2 = await createEc2Client(ctx, input.region)
    const preflight = await this.validateLaunchPreflight(ctx, input)
    if (!preflight.valid) {
      const err = preflight.checks.find((c) => c.level === 'error')
      throw new BadRequestException(err?.message ?? 'Validación de lanzamiento fallida')
    }

    const subnetId = preflight.resolvedSubnetId ?? input.subnetId
    const runInput = buildRunInput(input, imageId, subnetId, input.securityGroupIds?.filter(Boolean))

    let res
    try {
      res = await ec2.send(new RunInstancesCommand(runInput))
    } catch (err) {
      throw new BadRequestException(sdkErrorMessage(err))
    }
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
