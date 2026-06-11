import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import type { ConnectionProviderId } from '../cloud-accounts/cloud-account-wizard.config'

export type VpsProviderSlug =
  | 'digitalocean'
  | 'hetzner'
  | 'linode'
  | 'ovh'
  | 'ionos'
  | 'vultr'
  | 'scaleway'
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
  ionos: {
    slug: 'ionos',
    connectionId: 'IONOS',
    logo: 'ionos',
    title: 'IONOS Cloud',
    subtitle: 'Servidores cloud, redes privadas y facturación desde la API de IONOS.',
    accent: '#003D8F',
    accentSoft: 'color-mix(in srgb, #003D8F 14%, transparent)',
  },
  vultr: {
    slug: 'vultr',
    connectionId: 'VULTR',
    logo: 'vultr',
    title: 'Vultr',
    subtitle: 'Instancias cloud, block storage y redes privadas en Vultr.',
    accent: '#007BFC',
    accentSoft: 'color-mix(in srgb, #007BFC 14%, transparent)',
  },
  scaleway: {
    slug: 'scaleway',
    connectionId: 'SCALEWAY',
    logo: 'scaleway',
    title: 'Scaleway',
    subtitle: 'Instancias Instances, Elastic Metal y facturación Scaleway.',
    accent: '#4F0599',
    accentSoft: 'color-mix(in srgb, #4F0599 14%, transparent)',
  },
}

type VpsDemoSeed = Pick<
  VpsProviderSnapshot,
  'accountRows' | 'serverRows' | 'monthlyCost' | 'uptimePercent'
>

const VPS_DEMO_SEEDS: Record<VpsProviderSlug, VpsDemoSeed> = {
  digitalocean: {
    accountRows: [
      { id: 'do-acc-1', name: 'do-production', status: 'connected', servers: 3, monthlyCost: 84, lastSync: 'hace 2 min', region: 'nyc3' },
    ],
    serverRows: [
      { id: 'do-srv-1', name: 'api-droplet-01', region: 'nyc3', plan: 's-2vcpu-4gb', status: 'running', ipv4: '164.92.10.12', monthlyCost: 28 },
      { id: 'do-srv-2', name: 'worker-droplet-02', region: 'fra1', plan: 's-4vcpu-8gb', status: 'running', ipv4: '188.166.4.55', monthlyCost: 42 },
      { id: 'do-srv-3', name: 'staging-droplet', region: 'nyc3', plan: 's-1vcpu-2gb', status: 'stopped', ipv4: '164.92.11.88', monthlyCost: 14 },
    ],
    monthlyCost: 84,
    uptimePercent: 99.7,
  },
  hetzner: {
    accountRows: [
      { id: 'hz-acc-1', name: 'hetzner-prod', status: 'connected', servers: 2, monthlyCost: 62, lastSync: 'hace 5 min', region: 'fsn1' },
    ],
    serverRows: [
      { id: 'hz-srv-1', name: 'hz-app-01', region: 'fsn1', plan: 'cx32', status: 'running', ipv4: '49.12.88.21', monthlyCost: 32 },
      { id: 'hz-srv-2', name: 'hz-db-01', region: 'nbg1', plan: 'cx42', status: 'running', ipv4: '168.119.44.9', monthlyCost: 30 },
    ],
    monthlyCost: 62,
    uptimePercent: 99.9,
  },
  linode: {
    accountRows: [
      { id: 'ln-acc-1', name: 'linode-main', status: 'connected', servers: 2, monthlyCost: 48, lastSync: 'hace 8 min', region: 'eu-central' },
    ],
    serverRows: [
      { id: 'ln-srv-1', name: 'linode-web-01', region: 'eu-central', plan: 'g6-standard-2', status: 'running', ipv4: '172.104.22.18', monthlyCost: 24 },
      { id: 'ln-srv-2', name: 'linode-cache-01', region: 'us-east', plan: 'g6-standard-2', status: 'running', ipv4: '45.79.130.44', monthlyCost: 24 },
    ],
    monthlyCost: 48,
    uptimePercent: 99.5,
  },
  ovh: {
    accountRows: [
      { id: 'ovh-acc-1', name: 'ovh-public-cloud', status: 'connected', servers: 2, monthlyCost: 76, lastSync: 'hace 12 min', region: 'GRA' },
    ],
    serverRows: [
      { id: 'ovh-srv-1', name: 'ovh-app-gra', region: 'GRA', plan: 'b2-7', status: 'running', ipv4: '51.68.120.33', monthlyCost: 38 },
      { id: 'ovh-srv-2', name: 'ovh-worker-sbg', region: 'SBG', plan: 'b2-7', status: 'running', ipv4: '51.75.88.14', monthlyCost: 38 },
    ],
    monthlyCost: 76,
    uptimePercent: 99.4,
  },
  ionos: {
    accountRows: [
      { id: 'ion-acc-1', name: 'ionos-production', status: 'connected', servers: 2, monthlyCost: 58, lastSync: 'hace 4 min', region: 'de/fra' },
    ],
    serverRows: [
      { id: 'ion-srv-1', name: 'ionos-api-fra', region: 'de/fra', plan: 'CUBE M', status: 'running', ipv4: '85.214.12.44', monthlyCost: 29 },
      { id: 'ion-srv-2', name: 'ionos-worker-ber', region: 'de/txl', plan: 'CUBE M', status: 'running', ipv4: '217.160.88.71', monthlyCost: 29 },
    ],
    monthlyCost: 58,
    uptimePercent: 99.6,
  },
  vultr: {
    accountRows: [
      { id: 'vlt-acc-1', name: 'vultr-prod', status: 'connected', servers: 3, monthlyCost: 72, lastSync: 'hace 6 min', region: 'ewr' },
    ],
    serverRows: [
      { id: 'vlt-srv-1', name: 'vultr-api-ewr', region: 'ewr', plan: 'vc2-2c-4gb', status: 'running', ipv4: '45.76.88.12', monthlyCost: 24 },
      { id: 'vlt-srv-2', name: 'vultr-worker-ams', region: 'ams', plan: 'vc2-2c-4gb', status: 'running', ipv4: '95.179.210.44', monthlyCost: 24 },
      { id: 'vlt-srv-3', name: 'vultr-staging', region: 'ewr', plan: 'vc2-1c-2gb', status: 'stopped', ipv4: '45.76.89.55', monthlyCost: 24 },
    ],
    monthlyCost: 72,
    uptimePercent: 99.8,
  },
  scaleway: {
    accountRows: [
      { id: 'scw-acc-1', name: 'scaleway-main', status: 'connected', servers: 2, monthlyCost: 54, lastSync: 'hace 3 min', region: 'fr-par-1' },
    ],
    serverRows: [
      { id: 'scw-srv-1', name: 'scw-app-par', region: 'fr-par-1', plan: 'DEV1-M', status: 'running', ipv4: '51.15.88.22', monthlyCost: 27 },
      { id: 'scw-srv-2', name: 'scw-worker-ams', region: 'nl-ams-1', plan: 'DEV1-M', status: 'running', ipv4: '51.158.44.91', monthlyCost: 27 },
    ],
    monthlyCost: 54,
    uptimePercent: 99.7,
  },
}

const EMPTY_SNAPSHOT: VpsProviderSnapshot = {
  lastSync: '—',
  accounts: 0,
  servers: 0,
  monthlyCost: 0,
  uptimePercent: 0,
  accountRows: [],
  serverRows: [],
}

export const vpsProviderConfig = (slug: string): VpsProviderUiConfig => {
  const key = slug.toLowerCase() as VpsProviderSlug
  return VPS_PROVIDER_CONFIGS[key] ?? VPS_PROVIDER_CONFIGS.digitalocean
}

export const vpsSlugFromParam = (slug: string | null): VpsProviderSlug => {
  const s = (slug ?? 'digitalocean').toLowerCase()
  if (
    s === 'hetzner' ||
    s === 'linode' ||
    s === 'ovh' ||
    s === 'ionos' ||
    s === 'vultr' ||
    s === 'scaleway'
  ) {
    return s
  }
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

export const buildVpsSnapshot = (slug: VpsProviderSlug, allowDemo = false): VpsProviderSnapshot => {
  if (!allowDemo) return { ...EMPTY_SNAPSHOT }
  const seed = VPS_DEMO_SEEDS[slug] ?? VPS_DEMO_SEEDS.digitalocean
  return {
    lastSync: 'hace 2 min',
    accounts: seed.accountRows.length,
    servers: seed.serverRows.length,
    monthlyCost: seed.monthlyCost,
    uptimePercent: seed.uptimePercent,
    accountRows: seed.accountRows,
    serverRows: seed.serverRows,
  }
}

export const fmtUsd = (n: number): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
