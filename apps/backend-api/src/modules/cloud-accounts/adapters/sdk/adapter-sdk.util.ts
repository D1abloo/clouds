import { InstanceStatus } from '@prisma/client'
import { CloudAdapterContext, CloudInstance } from '../cloud-provider.adapter'

export const isDemoMode = (ctx: CloudAdapterContext): boolean =>
  ctx.credentials['demoMode'] === 'true' ||
  ctx.credentials['credentialType'] === 'demo' ||
  process.env.FORCE_CLOUD_DEMO === 'true'

/** En PRO sin demo: inventario vacío si el proveedor no devuelve instancias reales. */
export const resolveSyncedInstances = (
  ctx: CloudAdapterContext,
  instances: CloudInstance[],
  synthesize: () => CloudInstance[],
): CloudInstance[] => {
  if (isDemoMode(ctx)) return instances.length ? instances : synthesize()
  return instances
}

export const instancesOnSyncError = (
  ctx: CloudAdapterContext,
  synthesize: () => CloudInstance[],
): CloudInstance[] => (isDemoMode(ctx) ? synthesize() : [])

export const sdkErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err)

export const mapAwsState = (state?: string): InstanceStatus => {
  const s = (state ?? '').toLowerCase()
  if (s === 'running') return 'RUNNING'
  if (s === 'stopped') return 'STOPPED'
  if (s === 'pending') return 'PENDING'
  if (s === 'terminated' || s === 'shutting-down') return 'TERMINATED'
  if (s === 'stopping') return 'PENDING'
  return 'UNKNOWN'
}

export const mapGcpState = (status?: string): InstanceStatus => {
  const s = (status ?? '').toUpperCase()
  if (s === 'RUNNING') return 'RUNNING'
  if (s === 'TERMINATED') return 'TERMINATED'
  if (s === 'STOPPING') return 'PENDING'
  if (s === 'PROVISIONING' || s === 'STAGING') return 'PENDING'
  if (s === 'SUSPENDED') return 'STOPPED'
  return 'UNKNOWN'
}

export const mapAzurePowerState = (code?: string): InstanceStatus => {
  const s = (code ?? '').toLowerCase()
  if (s.includes('running')) return 'RUNNING'
  if (s.includes('deallocated') || s.includes('stopped')) return 'STOPPED'
  if (s.includes('starting') || s.includes('creating')) return 'PENDING'
  return 'UNKNOWN'
}

/** Maps AWS-style region codes to GCP region names (e.g. eu-west-1 → europe-west1). */
export const AWS_TO_GCP_REGION: Record<string, string> = {
  'us-east-1': 'us-east1',
  'us-east-2': 'us-east2',
  'us-west-1': 'us-west1',
  'us-west-2': 'us-west2',
  'eu-west-1': 'europe-west1',
  'eu-west-2': 'europe-west2',
  'eu-west-3': 'europe-west3',
  'eu-central-1': 'europe-west3',
  'eu-north-1': 'europe-north1',
  'ap-southeast-1': 'asia-southeast1',
  'ap-southeast-2': 'asia-southeast2',
  'ap-northeast-1': 'asia-northeast1',
  'ap-northeast-2': 'asia-northeast2',
  'ap-south-1': 'asia-south1',
  'sa-east-1': 'southamerica-east1',
  'ca-central-1': 'northamerica-northeast1',
}

const isGcpRegion = (value: string): boolean => /^[a-z]+-[a-z]+\d+(-[a-z])?$/.test(value)

const mapAwsToGcp = (input: string): { region: string; zone: string } | null => {
  const lower = input.toLowerCase()
  const awsZoneMatch = lower.match(/^(us|eu|ap|sa|me|af|ca)-[a-z]+-\d+-([a-z])$/)
  if (awsZoneMatch) {
    const awsRegion = lower.replace(/-[a-z]$/, '')
    const gcpRegion = AWS_TO_GCP_REGION[awsRegion]
    if (gcpRegion) return { region: gcpRegion, zone: `${gcpRegion}-${awsZoneMatch[2]}` }
  }
  if (/^(us|eu|ap|sa|me|af|ca)-[a-z]+-\d+$/.test(lower)) {
    const gcpRegion = AWS_TO_GCP_REGION[lower]
    if (gcpRegion) return { region: gcpRegion, zone: `${gcpRegion}-b` }
  }
  return null
}

export const parseGcpZone = (zoneOrRegion: string, fallback?: string): { region: string; zone: string } => {
  const input = zoneOrRegion.trim()
  if (!input && fallback) return parseGcpZone(fallback)

  if (input.includes('/')) {
    const zone = input.split('/').pop() ?? input
    const region = zone.replace(/-[a-z]$/, '')
    if (isGcpRegion(zone) || isGcpRegion(region)) return { region, zone }
    const mapped = mapAwsToGcp(zone)
    if (mapped) return mapped
  }

  const awsMapped = mapAwsToGcp(input)
  if (awsMapped) return awsMapped

  // Zona completa GCP: europe-west1-b, us-central1-a
  if (/^[a-z]+-[a-z]+\d+-[a-z]$/.test(input)) {
    return { region: input.replace(/-[a-z]$/, ''), zone: input }
  }
  // Solo región GCP: europe-west1, us-central1
  if (/^[a-z]+-[a-z]+\d+$/.test(input)) {
    return { region: input, zone: `${input}-b` }
  }

  if (fallback) {
    const fb = parseGcpZone(fallback)
    if (isGcpRegion(fb.region)) return fb
  }
  return { region: 'us-central1', zone: 'us-central1-a' }
}

export const parseAzureResourceIds = (resourceId: string) => {
  const parts = resourceId.split('/')
  return {
    subscriptionId: parts[2],
    resourceGroup: parts[4],
    name: parts[parts.length - 1],
  }
}
