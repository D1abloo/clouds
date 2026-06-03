import { CloudProvider, InstanceStatus } from '@prisma/client'
import {
  CloudAdapterContext,
  CloudImage,
  CloudInstance,
  CloudInstanceType,
  CloudNetwork,
  CloudRegion,
  CloudSecurityGroup,
  ValidationResult,
} from './cloud-provider.adapter'

const hash = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
  return Math.abs(h)
}

export const buildValidation = (
  ctx: CloudAdapterContext,
  providerLabel: string,
  requiredPerms: string[],
): ValidationResult => {
  const hasCreds =
    ctx.credentials['accessKeyId'] ||
    ctx.credentials['roleArn'] ||
    ctx.credentials['serviceAccountJson'] ||
    ctx.credentials['clientId'] ||
    ctx.credentials['demoMode'] === 'true'

  return {
    valid: !!hasCreds,
    message: hasCreds
      ? `${providerLabel} connection validated (demo/SDK-ready)`
      : 'Missing credentials — configure auth in account form',
    permissions: requiredPerms,
    sdkReady: ctx.credentials['demoMode'] !== 'true',
  }
}

export const regionsFor = (ctx: CloudAdapterContext, items: Omit<CloudRegion, 'provider'>[]): CloudRegion[] =>
  items.map((r) => ({ ...r, provider: ctx.provider }))

export const mockNetworks = (ctx: CloudAdapterContext, region: string): CloudNetwork[] => [
  { id: `net-${region}-main`, name: `${ctx.name}-vpc`, region, cidr: '10.0.0.0/16', type: 'vpc' },
  { id: `net-${region}-pub`, name: `${ctx.name}-public`, region, cidr: '10.1.0.0/24', type: 'subnet' },
]

export const mockSecurityGroups = (ctx: CloudAdapterContext, region: string): CloudSecurityGroup[] => [
  { id: `sg-${region}-web`, name: `${ctx.name}-web`, region, vpcId: `net-${region}-main`, rules: 4 },
  { id: `sg-${region}-db`, name: `${ctx.name}-db`, region, vpcId: `net-${region}-main`, rules: 2 },
]

export const mockImages = (ctx: CloudAdapterContext, region: string): CloudImage[] => [
  { id: `ami-${hash(ctx.accountId)}-ubuntu`, name: 'Ubuntu 22.04 LTS', region, os: 'linux', architecture: 'x86_64' },
  { id: `ami-${hash(ctx.accountId)}-debian`, name: 'Debian 12', region, os: 'linux', architecture: 'x86_64' },
]

export const mockInstanceTypes = (_ctx: CloudAdapterContext, region: string): CloudInstanceType[] => [
  { id: 'small', name: 'small', region, vcpus: 2, memoryGb: 4, pricePerHour: 0.04 },
  { id: 'medium', name: 'medium', region, vcpus: 4, memoryGb: 8, pricePerHour: 0.08 },
  { id: 'large', name: 'large', region, vcpus: 8, memoryGb: 16, pricePerHour: 0.16 },
]

export const synthesizeInstances = (ctx: CloudAdapterContext): CloudInstance[] => {
  const region = ctx.defaultRegion ?? defaultRegionFor(ctx.provider)
  const base = hash(ctx.accountId)
  const statuses: InstanceStatus[] = ['RUNNING', 'RUNNING', 'STOPPED', 'WARNING']
  return [0, 1, 2, 3].map((i) => ({
    id: `${prefixFor(ctx.provider)}-${ctx.accountId.slice(0, 8)}-${i}`,
    name: `${ctx.name.toLowerCase().replace(/\s+/g, '-')}-vm-${i + 1}`,
    region: i % 2 === 0 ? region : altRegion(ctx.provider, region),
    status: statuses[i] ?? 'RUNNING',
    instanceType: i < 2 ? 'medium' : 'small',
    provider: ctx.provider,
    metadata: {
      publicIp: `203.0.113.${(base + i) % 200 + 10}`,
      privateIp: `10.0.${i}.10`,
      environment: i === 0 ? 'prod' : 'staging',
      monthlyCost: 40 + i * 15,
      isDemo: ctx.credentials['demoMode'] === 'true',
      syncedAt: new Date().toISOString(),
    },
  }))
}

const prefixFor = (p: CloudProvider): string => {
  if (p === 'AWS') return 'i'
  if (p === 'GCP') return 'gce'
  return 'vm'
}

const defaultRegionFor = (p: CloudProvider): string => {
  if (p === 'AWS') return 'us-east-1'
  if (p === 'GCP') return 'us-central1-a'
  return 'westeurope'
}

const altRegion = (p: CloudProvider, primary: string): string => {
  if (p === 'AWS') return primary === 'us-east-1' ? 'eu-west-1' : 'us-east-1'
  if (p === 'GCP') return primary === 'us-central1-a' ? 'europe-west1-b' : 'us-central1-a'
  return primary === 'westeurope' ? 'eastus' : 'westeurope'
}
