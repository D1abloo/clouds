import { CloudProvider, InstanceStatus } from '@prisma/client'
import type { CreateSubnetDto, LaunchPreflightResult } from '../dto/launch-preflight.dto'

export interface CloudRegion {
  id: string
  name: string
  provider: CloudProvider
  zones?: string[]
}

export interface CloudNetwork {
  id: string
  name: string
  region: string
  cidr?: string
  type?: string
  availabilityZone?: string
  vpcId?: string
  mapPublicIpOnLaunch?: boolean
  isDefaultForAz?: boolean
}

export interface CloudSecurityGroup {
  id: string
  name: string
  region: string
  vpcId?: string
  rules?: number
}

export interface CloudImage {
  id: string
  name: string
  region: string
  os?: string
  architecture?: string
  status?: string
  description?: string
  category?: string
}

export interface CloudInstanceType {
  id: string
  name: string
  region: string
  vcpus: number
  memoryGb: number
  pricePerHour?: number
  pricePerMinute?: number
}

export interface CloudKeyPair {
  id: string
  name: string
  region: string
  fingerprint?: string
}

export interface CloudInstance {
  id: string
  name: string
  region: string
  status: InstanceStatus
  instanceType: string
  provider: CloudProvider
  metadata?: Record<string, unknown>
}

export interface ValidationResult {
  valid: boolean
  message?: string
  permissions?: string[]
  sdkReady?: boolean
}

export interface ActionResult {
  success: boolean
  message?: string
  requestId?: string
}

export interface SyncResult {
  synced: number
  regions: number
  networks: number
  securityGroups: number
  instances: number
  durationMs: number
}

export interface LaunchInstanceInput {
  name: string
  region: string
  instanceType: string
  imageId: string
  subnetId?: string
  securityGroupIds?: string[]
  tags?: Record<string, string>
  availabilityZone?: string
  resourceGroup?: string
  keyPair?: string
  publicIp?: boolean
  diskGb?: number
  diskType?: string
  userData?: string
  monitoring?: boolean
}

export interface CloudAdapterContext {
  accountId: string
  projectId: string
  provider: CloudProvider
  name: string
  accountExternalId?: string
  defaultRegion?: string
  config: Record<string, unknown>
  credentials: Record<string, string>
}

export interface CloudProviderAdapter {
  validateConnection(ctx: CloudAdapterContext): Promise<ValidationResult>
  listRegions(ctx: CloudAdapterContext): Promise<CloudRegion[]>
  listNetworks(ctx: CloudAdapterContext, region?: string): Promise<CloudNetwork[]>
  listSecurityGroups(ctx: CloudAdapterContext, region?: string): Promise<CloudSecurityGroup[]>
  listImages(ctx: CloudAdapterContext, region: string): Promise<CloudImage[]>
  listInstanceTypes(ctx: CloudAdapterContext, region: string): Promise<CloudInstanceType[]>
  listKeyPairs(ctx: CloudAdapterContext, region?: string): Promise<CloudKeyPair[]>
  listInstances(ctx: CloudAdapterContext, region?: string): Promise<CloudInstance[]>
  getInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<CloudInstance | null>
  startInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult>
  stopInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult>
  restartInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult>
  launchInstance(ctx: CloudAdapterContext, input: LaunchInstanceInput): Promise<CloudInstance>
  validateLaunchPreflight(ctx: CloudAdapterContext, input: LaunchInstanceInput): Promise<LaunchPreflightResult>
  createSubnet(ctx: CloudAdapterContext, input: CreateSubnetDto): Promise<CloudNetwork>
  listAvailabilityZones(ctx: CloudAdapterContext, region: string): Promise<string[]>
  syncInventory(ctx: CloudAdapterContext): Promise<CloudInstance[]>
}
