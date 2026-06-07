import type { CloudAccount, CloudProvider, Instance, VpsHost } from '../../core/models/api.models'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export interface RunbookTargetInstance {
  id: string
  name: string
  provider: CloudProvider | string
  region?: string
  status?: string
  publicIp?: string
  privateIp?: string
  cloudAccountId?: string
  accountName?: string
  instanceType?: string
  os?: string
  isVps?: boolean
  hostAddress?: string
}

export const PROVIDER_LABELS: Record<string, string> = {
  AWS: 'AWS',
  GCP: 'GCP',
  AZURE: 'Azure',
  VPS: 'VPS / SSH',
}

export const PROVIDER_ICON: Record<string, string> = {
  AWS: 'cloud',
  GCP: 'cloud',
  AZURE: 'cloud',
  VPS: 'dns',
}

/** Logos de marca oficiales (SVG) para AWS, GCP y Azure. */
export const providerBrandLogo = (provider: string): NavLogoKey | null => {
  const p = String(provider).toUpperCase()
  if (p === 'GCP') return 'gcp'
  if (p === 'AZURE') return 'azure'
  if (p === 'AWS') return 'aws'
  return null
}

export const buildRunbookTargets = (
  instances: Instance[],
  accounts: CloudAccount[],
  vpsHosts: VpsHost[],
): RunbookTargetInstance[] => {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]))
  const cloudTargets = instances.map((inst) => mapCloudInstance(inst, accountMap))
  const vpsTargets = vpsHosts.map(mapVpsHost)
  return [...cloudTargets, ...vpsTargets].sort((a, b) =>
    `${a.provider}-${a.name}`.localeCompare(`${b.provider}-${b.name}`),
  )
}

export const mapCloudInstance = (
  inst: Instance,
  accountMap: Map<string, string>,
): RunbookTargetInstance => ({
  id: inst.id,
  name: inst.name,
  provider: (inst.provider as CloudProvider) ?? 'AWS',
  region: inst.region,
  status: inst.status,
  publicIp: inst.publicIp,
  privateIp: inst.privateIp,
  cloudAccountId: inst.cloudAccountId,
  accountName: inst.cloudAccountId ? accountMap.get(inst.cloudAccountId) : undefined,
  instanceType: inst.instanceType,
  os: inst.os,
  isVps: inst.isVps,
  hostAddress: inst.publicIp ?? inst.privateIp,
})

export const mapVpsHost = (host: VpsHost): RunbookTargetInstance => ({
  id: host.id,
  name: host.name,
  provider: 'VPS',
  region: `SSH :${host.port ?? 22}`,
  status: host.status ?? 'connected',
  hostAddress: host.host,
  isVps: true,
  accountName: 'VPS directo',
})

export const formatRunbookTargetLabel = (t: RunbookTargetInstance): string => {
  const ip = t.publicIp ?? t.privateIp ?? t.hostAddress
  const parts = [t.name, t.provider]
  if (t.region) parts.push(t.region)
  if (ip) parts.push(ip)
  return parts.join(' · ')
}

export const matchInstancesForRunbook = (
  instances: RunbookTargetInstance[],
  linkedTo: string,
): RunbookTargetInstance[] => {
  const term = linkedTo.toLowerCase().trim()
  if (!term) return []
  return instances.filter((i) => {
    const hay = [i.name, i.accountName, i.region, i.hostAddress, i.publicIp, i.privateIp]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(term) || term.includes(i.name.toLowerCase())
  })
}
