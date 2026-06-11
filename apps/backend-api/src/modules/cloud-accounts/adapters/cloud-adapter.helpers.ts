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
import { awsOnDemandPricePerHour, awsPricePerMinute } from './sdk/aws-pricing.util'

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
    ctx.credentials['managedIdentity']

  return {
    valid: !!hasCreds,
    message: hasCreds
      ? `${providerLabel}: credenciales presentes — validación completa requiere conexión al proveedor`
      : 'Faltan credenciales — completa el formulario de autenticación',
    permissions: requiredPerms,
    sdkReady: true,
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

export const mockImages = (ctx: CloudAdapterContext, region: string): CloudImage[] => {
  const h = hash(ctx.accountId)
  return [
    { id: `ami-0${h}a1b2c3d4`, name: 'Amazon Linux 2023', region, os: 'Linux/UNIX', architecture: 'x86_64', status: 'available' },
    { id: `ami-0${h}b2c3d4e5`, name: 'Amazon Linux 2', region, os: 'Linux/UNIX', architecture: 'x86_64', status: 'available' },
    { id: `ami-0${h}c3d4e5f6`, name: 'Amazon Linux 2023 (arm64)', region, os: 'Linux/UNIX', architecture: 'arm64', status: 'available' },
    { id: `ami-0${h}d4e5f6a7`, name: 'Ubuntu Server 24.04 LTS', region, os: 'Linux/UNIX', architecture: 'x86_64', status: 'available' },
    { id: `ami-0${h}e5f6a7b8`, name: 'Ubuntu Server 22.04 LTS', region, os: 'Linux/UNIX', architecture: 'x86_64', status: 'available' },
    { id: `ami-0${h}f6a7b8c9`, name: 'Ubuntu Pro 22.04 LTS', region, os: 'Linux/UNIX', architecture: 'x86_64', status: 'available' },
    { id: `ami-0${h}a7b8c9d0`, name: 'Debian 12', region, os: 'Linux/UNIX', architecture: 'x86_64', status: 'available' },
    { id: `ami-0${h}b8c9d0e1`, name: 'Red Hat Enterprise Linux 9', region, os: 'Linux/UNIX', architecture: 'x86_64', status: 'available' },
    { id: `ami-0${h}c9d0e1f2`, name: 'SUSE Linux Enterprise 15', region, os: 'Linux/UNIX', architecture: 'x86_64', status: 'available' },
    { id: `ami-0${h}d0e1f2a3`, name: 'Windows Server 2025 Base', region, os: 'Windows', architecture: 'x86_64', status: 'available' },
    { id: `ami-0${h}e1f2a3b4`, name: 'Windows Server 2022 Base', region, os: 'Windows', architecture: 'x86_64', status: 'available' },
    { id: `ami-0${h}f2a3b4c5`, name: 'Windows Server 2019 Base', region, os: 'Windows', architecture: 'x86_64', status: 'available' },
    { id: `ami-0${h}a3b4c5d6`, name: 'macOS Sonoma (Mac instances)', region, os: 'macOS', architecture: 'arm64', status: 'available' },
    { id: `ami-0${h}b4c5d6e7`, name: 'Rocky Linux 9', region, os: 'Linux/UNIX', architecture: 'x86_64', status: 'available' },
    { id: `ami-0${h}c5d6e7f8`, name: 'AlmaLinux 9', region, os: 'Linux/UNIX', architecture: 'x86_64', status: 'available' },
  ]
}

const awsType = (id: string, region: string, vcpus: number, memoryGb: number): CloudInstanceType => {
  const pricePerHour = awsOnDemandPricePerHour(id, region, vcpus, memoryGb)
  return { id, name: id, region, vcpus, memoryGb, pricePerHour, pricePerMinute: awsPricePerMinute(pricePerHour) }
}

export const awsMockInstanceTypes = (region: string): CloudInstanceType[] => [
  awsType('t3.micro', region, 2, 1),
  awsType('t3.small', region, 2, 2),
  awsType('t3.medium', region, 2, 4),
  awsType('t3.large', region, 2, 8),
  awsType('m5.large', region, 2, 8),
  awsType('m5.xlarge', region, 4, 16),
  awsType('c5.large', region, 2, 4),
  awsType('r5.large', region, 2, 16),
]

export const mockInstanceTypes = (ctx: CloudAdapterContext, region: string): CloudInstanceType[] => {
  if (ctx.provider === 'AWS') return awsMockInstanceTypes(region)
  return [
    { id: 'small', name: 'small', region, vcpus: 2, memoryGb: 4, pricePerHour: 0.04 },
    { id: 'medium', name: 'medium', region, vcpus: 4, memoryGb: 8, pricePerHour: 0.08 },
    { id: 'large', name: 'large', region, vcpus: 8, memoryGb: 16, pricePerHour: 0.16 },
  ]
}

/** IDs generados por synthesizeInstances cuando no hay inventario real (solo demo). */
export const isSynthesizedExternalId = (provider: CloudProvider, accountId: string, externalId: string): boolean => {
  const prefix = prefixFor(provider)
  const stem = `${prefix}-${accountId.slice(0, 8)}-`
  if (!externalId.startsWith(stem)) return false
  const suffix = externalId.slice(stem.length)
  return /^[0-3]$/.test(suffix)
}

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
  if (p === 'CLOUDING') return 'cld'
  return 'vm'
}

const defaultRegionFor = (p: CloudProvider): string => {
  if (p === 'AWS') return 'us-east-1'
  if (p === 'GCP') return 'us-central1-a'
  if (p === 'CLOUDING') return 'eu-central'
  return 'westeurope'
}

const altRegion = (p: CloudProvider, primary: string): string => {
  if (p === 'AWS') return primary === 'us-east-1' ? 'eu-west-1' : 'us-east-1'
  if (p === 'GCP') return primary === 'us-central1-a' ? 'europe-west1-b' : 'us-central1-a'
  if (p === 'CLOUDING') return primary === 'eu-central' ? 'us-east' : 'eu-central'
  return primary === 'westeurope' ? 'eastus' : 'westeurope'
}
