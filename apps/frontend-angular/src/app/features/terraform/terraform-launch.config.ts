import { CloudProvider } from '../../core/models/api.models'

export type LaunchCloudProvider = Exclude<CloudProvider, 'VPS'>

export interface ProviderLaunchMeta {
  id: LaunchCloudProvider
  label: string
  subtitle: string
  icon: string
  accent: string
  defaultRegion: string
  instanceTypeLabel: string
  imageLabel: string
  networkLabel: string
}

export const PROVIDER_LAUNCH_META: Record<LaunchCloudProvider, ProviderLaunchMeta> = {
  AWS: {
    id: 'AWS',
    label: 'AWS EC2',
    subtitle: 'Elastic Compute Cloud',
    icon: 'cloud',
    accent: '#ff9900',
    defaultRegion: 'us-east-1',
    instanceTypeLabel: 'Instance type',
    imageLabel: 'AMI',
    networkLabel: 'VPC',
  },
  GCP: {
    id: 'GCP',
    label: 'GCP Compute Engine',
    subtitle: 'Virtual machines on Google Cloud',
    icon: 'cloud_circle',
    accent: '#4285f4',
    defaultRegion: 'us-central1-a',
    instanceTypeLabel: 'Machine type',
    imageLabel: 'Boot image',
    networkLabel: 'Network',
  },
  AZURE: {
    id: 'AZURE',
    label: 'Azure Virtual Machine',
    subtitle: 'Microsoft Azure compute',
    icon: 'cloud_queue',
    accent: '#0078d4',
    defaultRegion: 'westeurope',
    instanceTypeLabel: 'VM size',
    imageLabel: 'Image SKU',
    networkLabel: 'Virtual Network',
  },
}

export const ENVIRONMENT_OPTIONS = ['dev', 'staging', 'prod'] as const
export const DISK_TYPES = ['gp3', 'gp2', 'io1', 'pd-ssd', 'pd-standard', 'Premium_LRS', 'Standard_LRS'] as const

export const WIZARD_STEPS = [
  { id: 0, label: 'Provider', icon: 'hub' },
  { id: 1, label: 'Account & location', icon: 'place' },
  { id: 2, label: 'Instance', icon: 'memory' },
  { id: 3, label: 'Cloud options', icon: 'tune' },
  { id: 4, label: 'Plan & apply', icon: 'rocket_launch' },
] as const
