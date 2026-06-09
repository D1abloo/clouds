import { InstanceStatus } from '@prisma/client'
import { CloudAdapterContext } from '../cloud-provider.adapter'

export const isDemoMode = (ctx: CloudAdapterContext): boolean =>
  ctx.credentials['demoMode'] === 'true' ||
  ctx.credentials['credentialType'] === 'demo' ||
  process.env.FORCE_CLOUD_DEMO === 'true'

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
  if (s === 'TERMINATED' || s === 'STOPPING') return 'STOPPED'
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

export const parseGcpZone = (zoneOrRegion: string): { region: string; zone: string } => {
  const input = zoneOrRegion.trim()
  if (input.includes('/')) {
    const zone = input.split('/').pop() ?? input
    const region = zone.replace(/-[a-z]$/, '')
    return { region, zone }
  }
  // Zona completa: europe-west1-b, us-central1-a
  if (/^[a-z]+-[a-z]+\d+-[a-z]$/.test(input)) {
    return { region: input.replace(/-[a-z]$/, ''), zone: input }
  }
  // Solo región: europe-west1, us-central1
  if (/^[a-z]+-[a-z]+\d+$/.test(input)) {
    return { region: input, zone: `${input}-b` }
  }
  return { region: input, zone: `${input}-b` }
}

export const parseAzureResourceIds = (resourceId: string) => {
  const parts = resourceId.split('/')
  return {
    subscriptionId: parts[2],
    resourceGroup: parts[4],
    name: parts[parts.length - 1],
  }
}
