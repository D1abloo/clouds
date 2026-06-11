import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import type { ConnectionProviderId } from '../cloud-accounts/cloud-account-wizard.config'

export type VpsProviderSlug = 'digitalocean' | 'hetzner' | 'linode' | 'ovh'
export type VpsSection = 'overview' | 'servers' | 'metrics'

export interface VpsProviderUiConfig {
  slug: VpsProviderSlug
  connectionId: ConnectionProviderId
  logo: NavLogoKey
  title: string
  subtitle: string
  accent: string
  accentSoft: string
}

export interface VpsSectionTab {
  id: VpsSection
  label: string
  icon: string
  route: string
}

export interface VpsAccountRow {
  id: string
  name: string
  status: string
  servers: number
  monthlyCost: number
  lastSync: string
  region: string
}

export interface VpsServerRow {
  id: string
  name: string
  region: string
  plan: string
  status: string
  ipv4: string
  monthlyCost: number
}

export interface VpsProviderSnapshot {
  lastSync: string
  accounts: number
  servers: number
  monthlyCost: number
  uptimePercent: number
  accountRows: VpsAccountRow[]
  serverRows: VpsServerRow[]
}

const VPS_PROVIDER_CONFIGS: Record<VpsProviderSlug, VpsProviderUiConfig> = {
  digitalocean: {
    slug: 'digitalocean',
    connectionId: 'DIGITALOCEAN',
    logo: 'digitalocean',
    title: 'DigitalOcean',
    subtitle: 'Droplets, VPC, balanceadores y facturación desde la API de DigitalOcean.',
    accent: '#0080FF',
    accentSoft: 'color-mix(in srgb, #0080FF 14%, transparent)',
  },
  hetzner: {
    slug: 'hetzner',
    connectionId: 'HETZNER',
    logo: 'hetzner',
    title: 'Hetzner Cloud',
    subtitle: 'Servidores cloud, redes privadas y volúmenes en Hetzner Cloud.',
    accent: '#D50C2D',
    accentSoft: 'color-mix(in srgb, #D50C2D 14%, transparent)',
  },
  linode: {
    slug: 'linode',
    connectionId: 'LINODE',
    logo: 'linode',
    title: 'Linode / Akamai',
    subtitle: 'Instancias Linode, volúmenes, balanceadores y facturación.',
    accent: '#00B3A4',
    accentSoft: 'color-mix(in srgb, #00B3A4 14%, transparent)',
  },
  ovh: {
    slug: 'ovh',
    connectionId: 'OVH',
    logo: 'ovh',
    title: 'OVHcloud',
    subtitle: 'Instancias Public Cloud, vRack y facturación OVH.',
    accent: '#123F6D',
    accentSoft: 'color-mix(in srgb, #123F6D 14%, transparent)',
  },
}

export const vpsProviderConfig = (slug: string): VpsProviderUiConfig => {
  const key = slug.toLowerCase() as VpsProviderSlug
  return VPS_PROVIDER_CONFIGS[key] ?? VPS_PROVIDER_CONFIGS.digitalocean
}

export const vpsSlugFromParam = (slug: string | null): VpsProviderSlug => {
  const s = (slug ?? 'digitalocean').toLowerCase()
  if (s === 'hetzner' || s === 'linode' || s === 'ovh') return s
  return 'digitalocean'
}

export const vpsSectionFromSlug = (section: string | null): VpsSection => {
  const s = (section ?? 'overview').toLowerCase()
  if (s === 'accounts' || s === 'billing') return 'overview'
  if (s === 'servers' || s === 'metrics') return s
  return 'overview'
}

export const vpsSectionsFor = (slug: VpsProviderSlug): VpsSectionTab[] => {
  const base = `/vps/${slug}`
  return [
    { id: 'overview', label: 'Resumen', icon: 'space_dashboard', route: `${base}/overview` },
    { id: 'servers', label: 'Servidores', icon: 'dns', route: `${base}/servers` },
    { id: 'metrics', label: 'Métricas', icon: 'show_chart', route: `${base}/metrics` },
  ]
}

export const buildVpsSnapshot = (_slug: VpsProviderSlug): VpsProviderSnapshot => ({
  lastSync: '—',
  accounts: 0,
  servers: 0,
  monthlyCost: 0,
  uptimePercent: 0,
  accountRows: [],
  serverRows: [],
})

export const fmtUsd = (n: number): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
