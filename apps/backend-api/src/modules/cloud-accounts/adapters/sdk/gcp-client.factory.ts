import { InstancesClient, RegionsClient } from '@google-cloud/compute'
import { CloudAdapterContext } from '../cloud-provider.adapter'
import { parseGcpZone } from './adapter-sdk.util'

export const resolveGcpProjectId = (ctx: CloudAdapterContext): string =>
  (ctx.config['projectId'] as string) ||
  ctx.accountExternalId ||
  ctx.credentials['projectId'] ||
  ''

export const createGcpInstancesClient = (ctx: CloudAdapterContext): InstancesClient => {
  const projectId = resolveGcpProjectId(ctx)
  if (!projectId) throw new Error('GCP Project ID is required')

  const json = ctx.credentials['serviceAccountJson']
  if (json) {
    const creds = JSON.parse(json) as Record<string, unknown>
    return new InstancesClient({ projectId, credentials: creds })
  }
  return new InstancesClient({ projectId })
}

export const createGcpRegionsClient = (ctx: CloudAdapterContext): RegionsClient => {
  const projectId = resolveGcpProjectId(ctx)
  const json = ctx.credentials['serviceAccountJson']
  if (json) {
    const creds = JSON.parse(json) as Record<string, unknown>
    return new RegionsClient({ projectId, credentials: creds })
  }
  return new RegionsClient({ projectId })
}

export const gcpZoneFromContext = (ctx: CloudAdapterContext, region?: string): string => {
  const input = region ?? ctx.defaultRegion ?? 'us-central1-a'
  return parseGcpZone(input).zone
}
