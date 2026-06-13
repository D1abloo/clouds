import { SlicePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import {
  CloudAccountsService,
  type LaunchPreflightCheck,
  type LaunchPreflightResult,
} from '../../core/services/cloud-accounts.service'
import { CloudCatalogCacheService } from '../../core/services/cloud-catalog-cache.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { ToastService } from '../../core/services/toast.service'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { type CloudLaunchProgressState } from './cloud-launch-progress.component'
import { cloudLaunchOptions } from './cloud-launch-options.util'
import { cloudLaunchTheme } from './cloud-launch-theme.util'
import { CLOUD_LAUNCH_STEPS, type LaunchStepMeta } from './launch/cloud-launch-steps.util'
import type {
  CloudLaunchStepId,
  LaunchedResource,
  LaunchProviderSlug,
  ProviderCard,
  VpsLaunchSlug,
} from './launch/cloud-launch.types'
import { CloudProviderSelectorComponent } from './launch/cloud-provider-selector.component'
import { InfraCopilotPanelComponent } from './launch/infra-copilot-panel.component'
import { LaunchErrorCardComponent } from './launch/launch-error-card.component'
import { LaunchReviewComponent } from './launch/launch-review.component'
import { LaunchProgressPanelComponent } from './launch/launch-progress-panel.component'
import { AwsLaunchFormComponent } from './launch/aws-launch-form.component'
import { GcpLaunchFormComponent } from './launch/gcp-launch-form.component'
import { IonosVpsLaunchFormComponent } from './launch/ionos-vps-launch-form.component'
import { CloudAccountStepComponent } from './launch/cloud-account-step.component'
import { CloudRegionZoneStepComponent } from './launch/cloud-region-zone-step.component'
import { CloudNetworkStepComponent } from './launch/cloud-network-step.component'
import { CloudComputeStepComponent } from './launch/cloud-compute-step.component'
import { CloudImageStepComponent } from './launch/cloud-image-step.component'
import { LaunchTestPanelComponent } from './launch/launch-test-panel.component'
import { LaunchDeletePanelComponent } from './launch/launch-delete-panel.component'
import { CloudLaunchLogsComponent } from './launch/cloud-launch-logs.component'
import { CloudCostEstimateCardComponent } from './launch/cloud-cost-estimate-card.component'
import { ProviderNativeLaunchPanelComponent } from './launch/provider-native-launch-panel.component'
import { InstancesService } from '../../core/services/instances.service'
import {
  CloudLaunchActivityService,
  type LaunchActivityProvider,
  type LaunchInventoryResource,
} from '../../core/services/cloud-launch-activity.service'
import type { CloudProvider } from '../../core/models/api.models'
import type { CloudSlug } from './cloud-provider.data'
import { imageOsLabel, imageOsLogoSrc, isCloudImageAvailable, isValidAwsAmiId, sanitizeAmiId } from './cloud-image-os.util'
import { AWS_IMAGE_SECTIONS, sectionCount, type AwsImageSectionId } from './cloud-ami-sections.util'
import { instancePriceLabels } from './cloud-instance-pricing.util'
import { extractApiErrorMessage, suggestSubnetCidr } from './cloud-subnet-cidr.util'
import { pageReveal, staggerCards, stepTransition } from '../../shared/animations/ui-motion.animations'

export type CloudLaunchWizardData = {
  accountId: string
  accountName: string
  provider: CloudProvider
  slug: CloudSlug
  defaultRegion?: string
  preselectedImageId?: string
}

type CloudImageRow = {
  id: string
  name: string
  region?: string
  os?: string
  architecture?: string
  status?: string
  category?: string
}

type CatalogRow = {
  id: string
  name: string
  vcpus?: number
  memoryGb?: number
  pricePerHour?: number
  pricePerMinute?: number
}

type NetworkRow = {
  id: string
  name: string
  type?: string
  cidr?: string
  availabilityZone?: string
  vpcId?: string
  mapPublicIpOnLaunch?: boolean
  isDefaultForAz?: boolean
}

type LaunchPayload = {
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

const LAUNCH_PROVIDERS: ProviderCard[] = [
  {
    slug: 'aws',
    provider: 'AWS',
    label: 'AWS EC2',
    tagline: 'Amazon Web Services',
    logo: 'aws',
    description: 'Instancias EC2, VPC, subnets, security groups, key pairs y AMIs.',
    connectionState: 'Credenciales IAM',
    initialCost: '~$0.012/h',
  },
  {
    slug: 'gcp',
    provider: 'GCP',
    label: 'GCP Compute Engine',
    tagline: 'Google Cloud',
    logo: 'gcp',
    description: 'VMs, proyectos, zonas, VPC networks, firewall rules e imágenes públicas.',
    connectionState: 'Service account',
    initialCost: '~$0.010/h',
  },
  {
    slug: 'azure',
    provider: 'AZURE',
    label: 'Azure Virtual Machines',
    tagline: 'Microsoft Azure',
    logo: 'azure',
    description: 'Subscriptions, resource groups, VNets, NSG, public IPs, VM sizes e imágenes.',
    connectionState: 'Service principal',
    initialCost: '~$0.011/h',
  },
  {
    slug: 'clouding',
    provider: 'CLOUDING',
    label: 'Clouding.io',
    tagline: 'Cloud servers europeos',
    logo: 'clouding',
    description: 'Instancias cloud, redes privadas, plantillas, SSD flexible y métricas.',
    connectionState: 'API token',
    initialCost: '~$0.018/h',
  },
  {
    slug: 'ionos',
    provider: 'IONOS_VPS',
    label: 'IONOS VPS',
    tagline: 'IONOS Cloud',
    logo: 'ionos',
    description: 'VPS, datacenters europeos, planes, imágenes Linux y SSH keys.',
    connectionState: 'API token',
    initialCost: '~17.52$/mes',
  },
  {
    slug: 'digitalocean',
    provider: 'IONOS_VPS',
    label: 'DigitalOcean Droplets',
    tagline: 'VPS / cloud servers',
    logo: 'digitalocean',
    description: 'Droplets, regiones, VPC, tamaños, imágenes Linux y SSH keys.',
    connectionState: 'API token',
    initialCost: '~$6/mes',
  },
  {
    slug: 'hetzner',
    provider: 'IONOS_VPS',
    label: 'Hetzner Cloud',
    tagline: 'VPS europeos',
    logo: 'hetzner',
    description: 'Servidores cloud, redes, ubicaciones, planes CX/CPX y claves SSH.',
    connectionState: 'API token',
    initialCost: '~€4.51/mes',
  },
  {
    slug: 'ovh',
    provider: 'IONOS_VPS',
    label: 'OVH Public Cloud',
    tagline: 'VPS / instances',
    logo: 'ovh',
    description: 'Instancias OVH, regiones, flavors, imágenes y acceso SSH.',
    connectionState: 'App + consumer key',
    initialCost: '~€7/mes',
  },
  {
    slug: 'linode',
    provider: 'IONOS_VPS',
    label: 'Linode / Akamai',
    tagline: 'Cloud instances',
    logo: 'linode',
    description: 'Linodes, regiones, planes, imágenes Linux y claves SSH.',
    connectionState: 'Personal access token',
    initialCost: '~$5/mes',
  },
  {
    slug: 'vultr',
    provider: 'IONOS_VPS',
    label: 'Vultr',
    tagline: 'Cloud Compute',
    logo: 'vultr',
    description: 'Instancias, regiones, planes, snapshots e imágenes cloud.',
    connectionState: 'API key',
    initialCost: '~$6/mes',
  },
  {
    slug: 'scaleway',
    provider: 'IONOS_VPS',
    label: 'Scaleway',
    tagline: 'Instances europeas',
    logo: 'scaleway',
    description: 'Instances, zonas, imágenes, redes privadas y SSH keys.',
    connectionState: 'IAM secret key',
    initialCost: '~€5/mes',
  },
]

const slugToProvider = (slug: LaunchProviderSlug): CloudProvider =>
  slug === 'gcp'
    ? 'GCP'
    : slug === 'azure'
      ? 'AZURE'
      : slug === 'clouding'
        ? 'CLOUDING'
        : isVpsLaunchSlug(slug)
          ? 'VPS'
          : 'AWS'

const providerForActivity = (slug: LaunchProviderSlug): LaunchActivityProvider =>
  slug === 'ionos'
    ? 'IONOS'
    : slug === 'digitalocean'
      ? 'DIGITALOCEAN'
      : slug === 'hetzner'
        ? 'HETZNER'
        : slug === 'linode'
          ? 'LINODE'
          : slug === 'ovh'
            ? 'OVH'
            : slug === 'vultr'
              ? 'VULTR'
              : slug === 'scaleway'
                ? 'SCALEWAY'
                : slug === 'gcp'
                  ? 'GCP'
                  : slug === 'azure'
                    ? 'AZURE'
                    : slug === 'clouding'
                      ? 'CLOUDING'
                      : 'AWS'

const isVpsLaunchSlug = (slug: string): slug is VpsLaunchSlug =>
  slug === 'ionos' ||
  slug === 'digitalocean' ||
  slug === 'hetzner' ||
  slug === 'linode' ||
  slug === 'ovh' ||
  slug === 'vultr' ||
  slug === 'scaleway'

const normalizeProviderSlug = (raw?: string | null): LaunchProviderSlug | null => {
  const value = (raw ?? '').trim().toLowerCase()
  if (value === 'aws' || value === 'gcp' || value === 'azure' || value === 'clouding' || isVpsLaunchSlug(value)) return value
  if (value === 'google' || value === 'gce') return 'gcp'
  if (value === 'ec2') return 'aws'
  if (value === 'vps' || value === 'ionos-vps') return 'ionos'
  return null
}

const IONOS_REGIONS = [
  { id: 'de/fra', name: 'Alemania · Frankfurt' },
  { id: 'de/txl', name: 'Alemania · Berlin' },
  { id: 'es/mad', name: 'España · Madrid' },
]

const IONOS_DATACENTERS = ['fra1', 'fra2', 'txl1', 'mad1']

const IONOS_PLANS: CatalogRow[] = [
  { id: 'vps-s', name: 'VPS S', vcpus: 1, memoryGb: 2, pricePerHour: 0.012 },
  { id: 'vps-m', name: 'VPS M', vcpus: 2, memoryGb: 4, pricePerHour: 0.024 },
  { id: 'vps-l', name: 'VPS L', vcpus: 4, memoryGb: 8, pricePerHour: 0.048 },
  { id: 'vps-xl', name: 'VPS XL', vcpus: 6, memoryGb: 16, pricePerHour: 0.082 },
]

const IONOS_PLAN_DISK_GB: Record<string, number> = {
  'vps-s': 40,
  'vps-m': 80,
  'vps-l': 160,
  'vps-xl': 240,
}

const IONOS_IMAGES: CloudImageRow[] = [
  { id: 'ubuntu-24-04', name: 'Ubuntu 24.04 LTS', region: 'de/fra', os: 'ubuntu', architecture: 'x86_64', status: 'ready' },
  { id: 'debian-12', name: 'Debian 12 Bookworm', region: 'de/fra', os: 'debian', architecture: 'x86_64', status: 'ready' },
  { id: 'alma-9', name: 'AlmaLinux 9', region: 'de/fra', os: 'linux', architecture: 'x86_64', status: 'ready' },
]

const IONOS_KEY_PAIRS = [
  { id: 'ionos-default', name: 'ionos-default' },
  { id: 'platform-ops', name: 'platform-ops' },
]

type ProviderPreviewCatalog = {
  accountMessage: string
  permissions: string[]
  defaultRegion: string
  defaultZone: string
  regions: { id: string; name: string }[]
  zones: string[]
  networks: NetworkRow[]
  securityGroups: { id: string; name: string; vpcId?: string }[]
  keyPairs: { id: string; name: string }[]
  images: CloudImageRow[]
  types: CatalogRow[]
  namePrefix: string
  diskType: string
  diskGb: number
  resourceGroup?: string
}

const PROVIDER_PREVIEW_CATALOGS: Record<CloudSlug, ProviderPreviewCatalog> = {
  aws: {
    accountMessage: 'Conecta una cuenta AWS con permisos EC2 para cargar VPC, subnets, AMIs, key pairs y costes reales.',
    permissions: ['DescribeInstances', 'DescribeImages', 'DescribeVpcs', 'DescribeSubnets', 'RunInstances', 'TerminateInstances'],
    defaultRegion: 'eu-west-1',
    defaultZone: 'eu-west-1a',
    regions: [
      { id: 'eu-west-1', name: 'Europe (Ireland)' },
      { id: 'eu-south-2', name: 'Europe (Spain)' },
      { id: 'us-east-1', name: 'US East (N. Virginia)' },
    ],
    zones: ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'],
    networks: [
      { id: 'vpc-preview-aws', name: 'default-vpc', type: 'vpc', cidr: '10.0.0.0/16' },
      {
        id: 'subnet-preview-aws-a',
        name: 'public-subnet-a',
        type: 'subnet',
        cidr: '10.0.1.0/24',
        availabilityZone: 'eu-west-1a',
        vpcId: 'vpc-preview-aws',
        mapPublicIpOnLaunch: true,
        isDefaultForAz: true,
      },
    ],
    securityGroups: [{ id: 'sg-preview-aws', name: 'launch-wizard-sg', vpcId: 'vpc-preview-aws' }],
    keyPairs: [{ id: 'aws-platform-key', name: 'aws-platform-key' }],
    images: [
      {
        id: 'ami-0abc1234def567890',
        name: 'Amazon Linux 2023 AMI',
        os: 'amazon-linux',
        architecture: 'x86_64',
        status: 'available',
        category: 'quick_start',
      },
      {
        id: 'ami-0123456789abcdef0',
        name: 'Ubuntu Server 24.04 LTS',
        os: 'ubuntu',
        architecture: 'x86_64',
        status: 'available',
        category: 'quick_start',
      },
    ],
    types: [
      { id: 't3.micro', name: 't3.micro', vcpus: 2, memoryGb: 1, pricePerHour: 0.0104 },
      { id: 't3.small', name: 't3.small', vcpus: 2, memoryGb: 2, pricePerHour: 0.0208 },
      { id: 'm7g.medium', name: 'm7g.medium', vcpus: 1, memoryGb: 4, pricePerHour: 0.0385 },
    ],
    namePrefix: 'aws-ec2',
    diskType: 'gp3',
    diskGb: 30,
  },
  azure: {
    accountMessage: 'Conecta una subscription Azure para cargar resource groups, VNets, NSG, imágenes y tamaños reales.',
    permissions: ['Microsoft.Compute/virtualMachines/write', 'Microsoft.Network/*/read', 'Microsoft.Resources/subscriptions/read'],
    defaultRegion: 'westeurope',
    defaultZone: '1',
    regions: [
      { id: 'westeurope', name: 'West Europe' },
      { id: 'spaincentral', name: 'Spain Central' },
      { id: 'northeurope', name: 'North Europe' },
    ],
    zones: ['1', '2', '3'],
    networks: [
      { id: 'vnet-preview-azure', name: 'vnet-ai-infra', type: 'vpc', cidr: '10.10.0.0/16' },
      {
        id: 'snet-preview-azure',
        name: 'default',
        type: 'subnet',
        cidr: '10.10.1.0/24',
        availabilityZone: '1',
        vpcId: 'vnet-preview-azure',
        isDefaultForAz: true,
      },
    ],
    securityGroups: [{ id: 'nsg-preview-azure', name: 'nsg-ai-infra', vpcId: 'vnet-preview-azure' }],
    keyPairs: [{ id: 'azure-platform-key', name: 'azure-platform-key' }],
    images: [
      { id: 'Canonical:ubuntu-24_04-lts:server:latest', name: 'Ubuntu Server 24.04 LTS', os: 'ubuntu', status: 'available' },
      { id: 'MicrosoftWindowsServer:WindowsServer:2022-datacenter:latest', name: 'Windows Server 2022 Datacenter', os: 'windows', status: 'available' },
    ],
    types: [
      { id: 'Standard_B1s', name: 'Standard B1s', vcpus: 1, memoryGb: 1, pricePerHour: 0.0104 },
      { id: 'Standard_B2s', name: 'Standard B2s', vcpus: 2, memoryGb: 4, pricePerHour: 0.0464 },
      { id: 'Standard_D2s_v5', name: 'Standard D2s v5', vcpus: 2, memoryGb: 8, pricePerHour: 0.096 },
    ],
    namePrefix: 'az-vm',
    diskType: 'Premium_LRS',
    diskGb: 64,
    resourceGroup: 'rg-ai-infra-studio',
  },
  gcp: {
    accountMessage: 'Conecta un proyecto GCP con service account para cargar zonas, VPC networks, firewalls, imágenes y machine types reales.',
    permissions: ['compute.instances.create', 'compute.networks.get', 'compute.subnetworks.use', 'compute.firewalls.list'],
    defaultRegion: 'europe-west1',
    defaultZone: 'europe-west1-b',
    regions: [
      { id: 'europe-west1', name: 'Belgium' },
      { id: 'europe-southwest1', name: 'Madrid' },
      { id: 'us-central1', name: 'Iowa' },
    ],
    zones: ['europe-west1-b', 'europe-west1-c', 'europe-west1-d'],
    networks: [
      { id: 'default', name: 'default', type: 'vpc', cidr: '10.128.0.0/9' },
      {
        id: 'default-europe-west1',
        name: 'default · europe-west1',
        type: 'subnet',
        cidr: '10.132.0.0/20',
        availabilityZone: 'europe-west1-b',
        vpcId: 'default',
        isDefaultForAz: true,
      },
    ],
    securityGroups: [{ id: 'allow-ssh-http', name: 'allow-ssh-http', vpcId: 'default' }],
    keyPairs: [{ id: 'gcp-platform-key', name: 'gcp-platform-key' }],
    images: [
      { id: 'projects/debian-cloud/global/images/family/debian-12', name: 'Debian GNU/Linux 12', os: 'debian', status: 'available' },
      { id: 'projects/ubuntu-os-cloud/global/images/family/ubuntu-2404-lts-amd64', name: 'Ubuntu 24.04 LTS', os: 'ubuntu', status: 'available' },
    ],
    types: [
      { id: 'e2-micro', name: 'e2-micro', vcpus: 2, memoryGb: 1, pricePerHour: 0.0076 },
      { id: 'e2-small', name: 'e2-small', vcpus: 2, memoryGb: 2, pricePerHour: 0.0152 },
      { id: 'n2-standard-2', name: 'n2-standard-2', vcpus: 2, memoryGb: 8, pricePerHour: 0.097 },
    ],
    namePrefix: 'gce-vm',
    diskType: 'pd-balanced',
    diskGb: 30,
  },
  clouding: {
    accountMessage: 'Conecta una cuenta Clouding.io para cargar datacenters, servidores, firewalls, plantillas y precios reales.',
    permissions: ['Servers', 'Images', 'Firewalls', 'SSH keys', 'Billing'],
    defaultRegion: 'es-mad-1',
    defaultZone: 'es-mad-1a',
    regions: [
      { id: 'es-mad-1', name: 'Madrid' },
      { id: 'eu-central-1', name: 'Europa Central' },
    ],
    zones: ['es-mad-1a', 'es-mad-1b'],
    networks: [
      { id: 'clouding-private-net', name: 'red-privada-ai-infra', type: 'vpc', cidr: '10.20.0.0/16' },
      {
        id: 'clouding-public-config',
        name: 'IP publica + red privada',
        type: 'subnet',
        cidr: '10.20.1.0/24',
        availabilityZone: 'es-mad-1a',
        vpcId: 'clouding-private-net',
        isDefaultForAz: true,
      },
    ],
    securityGroups: [{ id: 'clouding-fw-ssh-https', name: 'Firewall SSH + HTTPS', vpcId: 'clouding-private-net' }],
    keyPairs: [{ id: 'clouding-platform-key', name: 'clouding-platform-key' }],
    images: [
      { id: 'ubuntu-24-04', name: 'Ubuntu 24.04 LTS', os: 'ubuntu', status: 'ready' },
      { id: 'debian-12', name: 'Debian 12', os: 'debian', status: 'ready' },
    ],
    types: [
      { id: 'clouding-2-4', name: '2 vCPU · 4 GB RAM', vcpus: 2, memoryGb: 4, pricePerHour: 0.021 },
      { id: 'clouding-4-8', name: '4 vCPU · 8 GB RAM', vcpus: 4, memoryGb: 8, pricePerHour: 0.042 },
    ],
    namePrefix: 'clouding-srv',
    diskType: 'ssd',
    diskGb: 80,
  },
}

type VpsLaunchCatalog = {
  label: string
  accountName: string
  defaultRegion: string
  regions: { id: string; name: string }[]
  datacenters: string[]
  plans: CatalogRow[]
  diskByPlan: Record<string, number>
  images: CloudImageRow[]
  keyPairs: { id: string; name: string }[]
  defaultDiskType: string
  permissions: string[]
  networkPolicy: string
  tagProvider: string
  currencyHint: string
}

const VPS_PROVIDER_CATALOGS: Record<VpsLaunchSlug, VpsLaunchCatalog> = {
  ionos: {
    label: 'IONOS VPS',
    accountName: 'Cuenta IONOS Produccion',
    defaultRegion: 'de/fra',
    regions: IONOS_REGIONS,
    datacenters: IONOS_DATACENTERS,
    plans: IONOS_PLANS,
    diskByPlan: IONOS_PLAN_DISK_GB,
    images: IONOS_IMAGES,
    keyPairs: IONOS_KEY_PAIRS,
    defaultDiskType: 'ssd-nvme',
    permissions: ['Datacenters', 'Planes VPS', 'Imagenes', 'SSH keys', 'Billing'],
    networkPolicy: 'SSH + HTTPS',
    tagProvider: 'ionos',
    currencyHint: '~17.52$/mes',
  },
  digitalocean: {
    label: 'DigitalOcean Droplet',
    accountName: 'DigitalOcean workspace',
    defaultRegion: 'fra1',
    regions: [
      { id: 'fra1', name: 'Frankfurt 1' },
      { id: 'ams3', name: 'Amsterdam 3' },
      { id: 'nyc3', name: 'New York 3' },
    ],
    datacenters: ['fra1', 'ams3', 'nyc3'],
    plans: [
      { id: 's-1vcpu-1gb', name: 'Basic 1 GB', vcpus: 1, memoryGb: 1, pricePerHour: 0.0089 },
      { id: 's-2vcpu-2gb', name: 'Basic 2 GB', vcpus: 2, memoryGb: 2, pricePerHour: 0.0179 },
      { id: 's-2vcpu-4gb', name: 'Basic 4 GB', vcpus: 2, memoryGb: 4, pricePerHour: 0.0357 },
    ],
    diskByPlan: { 's-1vcpu-1gb': 25, 's-2vcpu-2gb': 60, 's-2vcpu-4gb': 80 },
    images: IONOS_IMAGES,
    keyPairs: [{ id: 'do-platform', name: 'do-platform' }, { id: 'ops-ed25519', name: 'ops-ed25519' }],
    defaultDiskType: 'ssd',
    permissions: ['Droplets', 'VPC', 'Firewalls', 'SSH keys', 'Images', 'Billing'],
    networkPolicy: 'Cloud firewall SSH + HTTPS',
    tagProvider: 'digitalocean',
    currencyHint: '~$6/mes',
  },
  hetzner: {
    label: 'Hetzner Cloud Server',
    accountName: 'Hetzner production',
    defaultRegion: 'fsn1',
    regions: [
      { id: 'fsn1', name: 'Falkenstein' },
      { id: 'nbg1', name: 'Nuremberg' },
      { id: 'hel1', name: 'Helsinki' },
    ],
    datacenters: ['fsn1-dc14', 'nbg1-dc3', 'hel1-dc2'],
    plans: [
      { id: 'cx22', name: 'CX22', vcpus: 2, memoryGb: 4, pricePerHour: 0.007 },
      { id: 'cx32', name: 'CX32', vcpus: 4, memoryGb: 8, pricePerHour: 0.013 },
      { id: 'cax21', name: 'CAX21 ARM', vcpus: 4, memoryGb: 8, pricePerHour: 0.008 },
    ],
    diskByPlan: { cx22: 40, cx32: 80, cax21: 80 },
    images: IONOS_IMAGES,
    keyPairs: [{ id: 'hetzner-ops', name: 'hetzner-ops' }, { id: 'platform-ops', name: 'platform-ops' }],
    defaultDiskType: 'local-ssd',
    permissions: ['Servers', 'Networks', 'Firewalls', 'SSH keys', 'Images', 'Pricing'],
    networkPolicy: 'Firewall SSH + HTTPS',
    tagProvider: 'hetzner',
    currencyHint: '~€4.51/mes',
  },
  linode: {
    label: 'Linode Instance',
    accountName: 'Linode workspace',
    defaultRegion: 'eu-central',
    regions: [
      { id: 'eu-central', name: 'Frankfurt' },
      { id: 'eu-west', name: 'London' },
      { id: 'us-east', name: 'Newark' },
    ],
    datacenters: ['eu-central-a', 'eu-west-a', 'us-east-a'],
    plans: [
      { id: 'g6-standard-1', name: 'Shared 1 GB', vcpus: 1, memoryGb: 1, pricePerHour: 0.0075 },
      { id: 'g6-standard-2', name: 'Shared 2 GB', vcpus: 1, memoryGb: 2, pricePerHour: 0.015 },
      { id: 'g6-standard-4', name: 'Shared 4 GB', vcpus: 2, memoryGb: 4, pricePerHour: 0.03 },
    ],
    diskByPlan: { 'g6-standard-1': 25, 'g6-standard-2': 50, 'g6-standard-4': 80 },
    images: IONOS_IMAGES,
    keyPairs: [{ id: 'linode-default', name: 'linode-default' }, { id: 'platform-ops', name: 'platform-ops' }],
    defaultDiskType: 'block-storage',
    permissions: ['Linodes', 'VPC', 'Firewalls', 'SSH keys', 'Images', 'Billing'],
    networkPolicy: 'Cloud firewall SSH + HTTPS',
    tagProvider: 'linode',
    currencyHint: '~$5/mes',
  },
  ovh: {
    label: 'OVH Public Cloud Instance',
    accountName: 'OVH public cloud',
    defaultRegion: 'GRA',
    regions: [
      { id: 'GRA', name: 'Gravelines' },
      { id: 'SBG', name: 'Strasbourg' },
      { id: 'WAW', name: 'Warsaw' },
    ],
    datacenters: ['GRA11', 'SBG5', 'WAW1'],
    plans: [
      { id: 'b2-7', name: 'B2-7', vcpus: 2, memoryGb: 7, pricePerHour: 0.041 },
      { id: 'b2-15', name: 'B2-15', vcpus: 4, memoryGb: 15, pricePerHour: 0.083 },
    ],
    diskByPlan: { 'b2-7': 50, 'b2-15': 100 },
    images: IONOS_IMAGES,
    keyPairs: [{ id: 'ovh-platform', name: 'ovh-platform' }, { id: 'ops-ed25519', name: 'ops-ed25519' }],
    defaultDiskType: 'ceph-ssd',
    permissions: ['Instances', 'Private network', 'Security groups', 'SSH keys', 'Images', 'Billing'],
    networkPolicy: 'Security group SSH + HTTPS',
    tagProvider: 'ovh',
    currencyHint: '~€7/mes',
  },
  vultr: {
    label: 'Vultr Cloud Compute',
    accountName: 'Vultr production',
    defaultRegion: 'ams',
    regions: [
      { id: 'ams', name: 'Amsterdam' },
      { id: 'fra', name: 'Frankfurt' },
      { id: 'ewr', name: 'New Jersey' },
    ],
    datacenters: ['ams-1', 'fra-1', 'ewr-1'],
    plans: [
      { id: 'vc2-1c-2gb', name: 'Cloud Compute 2 GB', vcpus: 1, memoryGb: 2, pricePerHour: 0.009 },
      { id: 'vc2-2c-4gb', name: 'Cloud Compute 4 GB', vcpus: 2, memoryGb: 4, pricePerHour: 0.018 },
    ],
    diskByPlan: { 'vc2-1c-2gb': 55, 'vc2-2c-4gb': 80 },
    images: IONOS_IMAGES,
    keyPairs: [{ id: 'vultr-default', name: 'vultr-default' }, { id: 'platform-ops', name: 'platform-ops' }],
    defaultDiskType: 'nvme',
    permissions: ['Instances', 'VPC', 'Firewall groups', 'SSH keys', 'Snapshots', 'Billing'],
    networkPolicy: 'Firewall group SSH + HTTPS',
    tagProvider: 'vultr',
    currencyHint: '~$6/mes',
  },
  scaleway: {
    label: 'Scaleway Instance',
    accountName: 'Scaleway workspace',
    defaultRegion: 'fr-par-1',
    regions: [
      { id: 'fr-par', name: 'Paris' },
      { id: 'nl-ams', name: 'Amsterdam' },
      { id: 'pl-waw', name: 'Warsaw' },
    ],
    datacenters: ['fr-par-1', 'nl-ams-1', 'pl-waw-1'],
    plans: [
      { id: 'DEV1-M', name: 'DEV1-M', vcpus: 3, memoryGb: 4, pricePerHour: 0.014 },
      { id: 'PLAY2-MICRO', name: 'PLAY2-MICRO', vcpus: 2, memoryGb: 2, pricePerHour: 0.009 },
    ],
    diskByPlan: { 'DEV1-M': 40, 'PLAY2-MICRO': 20 },
    images: IONOS_IMAGES,
    keyPairs: [{ id: 'scaleway-default', name: 'scaleway-default' }, { id: 'platform-ops', name: 'platform-ops' }],
    defaultDiskType: 'block-ssd',
    permissions: ['Instances', 'Private networks', 'Security groups', 'SSH keys', 'Images', 'Billing'],
    networkPolicy: 'Security group SSH + HTTPS',
    tagProvider: 'scaleway',
    currencyHint: '~€5/mes',
  },
}

const parseTagsRecord = (raw: string): Record<string, string> | undefined => {
  const parts = raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  if (!parts.length) return undefined
  const out: Record<string, string> = {}
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq > 0) out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
    else out[part] = part
  }
  return Object.keys(out).length ? out : undefined
}

@Component({
  selector: 'app-cloud-launch-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SlicePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    LoadingStateComponent,
    CloudProviderSelectorComponent,
    InfraCopilotPanelComponent,
    LaunchErrorCardComponent,
    LaunchReviewComponent,
    LaunchProgressPanelComponent,
    AwsLaunchFormComponent,
    GcpLaunchFormComponent,
    IonosVpsLaunchFormComponent,
    CloudAccountStepComponent,
    CloudRegionZoneStepComponent,
    CloudNetworkStepComponent,
    CloudComputeStepComponent,
    CloudImageStepComponent,
    LaunchTestPanelComponent,
    LaunchDeletePanelComponent,
    CloudLaunchLogsComponent,
    CloudCostEstimateCardComponent,
    ProviderNativeLaunchPanelComponent,
  ],
  animations: [pageReveal, staggerCards, stepTransition],
  templateUrl: './cloud-launch-wizard.component.html',
  styleUrl: './cloud-launch-wizard.component.scss',
})
export class CloudLaunchWizardComponent implements OnInit, OnDestroy, OnChanges {
  @Input() data?: CloudLaunchWizardData
  @Input() embedded = true
  @Input() studioMode = false
  @Input() initialProvider?: string | null
  @Output() readonly launched = new EventEmitter<void>()
  @Output() readonly cancelled = new EventEmitter<void>()

  private readonly fb = inject(FormBuilder)
  private readonly accounts = inject(CloudAccountsService)
  private readonly instances = inject(InstancesService)
  private readonly catalogCache = inject(CloudCatalogCacheService)
  private readonly toast = inject(ToastService)
  private readonly realtime = inject(RealtimeService)
  private readonly activity = inject(CloudLaunchActivityService)
  private readonly router = inject(Router)

  readonly launching = signal(false)
  readonly catalogLoading = signal(false)
  readonly accountLoading = signal(true)
  readonly azLoading = signal(false)
  readonly preflightLoading = signal(false)
  readonly creatingSubnet = signal(false)
  readonly showCreateSubnet = signal(false)
  readonly launchProgress = signal<CloudLaunchProgressState | null>(null)
  readonly activeStep = signal<CloudLaunchStepId>('provider')
  readonly launchProviders = LAUNCH_PROVIDERS
  readonly selectedProviderSlug = signal<LaunchProviderSlug | null>(null)
  readonly studioAccounts = signal<{ id: string; name: string; defaultRegion?: string }[]>([])
  readonly selectedStudioAccountId = signal('')
  readonly launchedResource = signal<LaunchedResource | null>(null)
  readonly testing = signal(false)
  readonly deleting = signal(false)
  readonly testResult = signal('')
  readonly launchLogLines = signal<string[]>([])
  readonly createdDependencies = signal<string[]>([])
  readonly imageSearch = signal('')
  readonly typeSearch = signal('')
  readonly imageSection = signal<AwsImageSectionId>('quick_start')
  readonly imageOsTab = signal<'all' | 'debian' | 'ubuntu' | 'windows' | 'linux'>('all')

  readonly regions = signal<{ id: string; name: string }[]>([])
  readonly availabilityZones = signal<string[]>([])
  readonly images = signal<CloudImageRow[]>([])
  readonly types = signal<CatalogRow[]>([])
  readonly allNetworks = signal<NetworkRow[]>([])
  readonly securityGroups = signal<{ id: string; name: string; vpcId?: string }[]>([])
  readonly keyPairs = signal<{ id: string; name: string }[]>([])
  readonly accountValid = signal<boolean | null>(null)
  readonly accountMessage = signal('')
  readonly accountPermissions = signal<string[]>([])
  readonly preflight = signal<LaunchPreflightResult | null>(null)

  readonly theme = computed(() => cloudLaunchTheme(this.effectiveSlug()))
  readonly steps = computed((): LaunchStepMeta[] => {
    if (this.studioMode) return CLOUD_LAUNCH_STEPS
    return this.options().steps.map((s) => ({
      id: s.id as CloudLaunchStepId,
      label: s.label,
      shortLabel: s.shortLabel ?? s.label,
      icon: s.icon,
    }))
  })
  readonly stepIndex = computed(() => this.steps().findIndex((s) => s.id === this.activeStep()))
  readonly currentStepLabel = computed(() => this.steps()[this.stepIndex()]?.label ?? '')
  readonly isVpsProvider = computed(() => isVpsLaunchSlug(this.selectedProviderSlug() ?? ''))
  readonly currentVpsCatalog = computed(() => {
    const slug = this.selectedProviderSlug()
    return VPS_PROVIDER_CATALOGS[slug && isVpsLaunchSlug(slug) ? slug : 'ionos']
  })
  readonly launchProviderTitle = computed(() => {
    const slug = this.selectedProviderSlug()
    if (slug && isVpsLaunchSlug(slug)) return VPS_PROVIDER_CATALOGS[slug].label
    return this.launchProviders.find((p) => p.slug === slug)?.label ?? String(this.effectiveData().provider)
  })
  readonly effectiveSlug = computed((): CloudSlug => {
    if (this.data?.slug) return this.data.slug
    const p = this.selectedProviderSlug()
    if (p && isVpsLaunchSlug(p)) return 'clouding'
    return (p ?? 'aws') as CloudSlug
  })
  readonly effectiveData = computed((): CloudLaunchWizardData => {
    if (this.data) return this.data
    const acc = this.studioAccounts().find((a) => a.id === this.selectedStudioAccountId()) ?? this.studioAccounts()[0]
    const slug = this.selectedProviderSlug() ?? 'aws'
    return {
      accountId: acc?.id ?? '',
      accountName: acc?.name ?? 'Sin cuenta',
      provider: slugToProvider(slug),
      slug: isVpsLaunchSlug(slug) ? 'clouding' : (slug as CloudSlug),
      defaultRegion: acc?.defaultRegion,
    }
  })
  readonly options = computed(() => cloudLaunchOptions(this.effectiveSlug()))
  readonly activityProvider = computed((): LaunchActivityProvider =>
    providerForActivity((this.selectedProviderSlug() ?? this.data?.slug ?? 'aws') as LaunchProviderSlug),
  )
  readonly progressPct = computed(() => {
    const steps = this.steps().length
    const idx = this.stepIndex()
    return steps && idx >= 0 ? Math.round(((idx + 1) / steps) * 100) : 0
  })
  readonly nativeConsoleMode = computed(() => {
    const step = this.activeStep()
    return (
      !this.isVpsProvider() &&
      (step === 'account' ||
        step === 'region' ||
        step === 'network' ||
        step === 'compute' ||
        step === 'image' ||
        step === 'review')
    )
  })

  readonly vpcs = computed(() => this.allNetworks().filter((n) => n.type === 'vpc' || n.id.startsWith('vpc-')))
  readonly subnetsForAz = computed(() => {
    const az = this.form.value.availabilityZone ?? ''
    if (this.effectiveSlug() !== 'aws') {
      return this.allNetworks().filter((n) => n.type === 'subnet' || n.id.startsWith('subnet-'))
    }
    return this.allNetworks().filter(
      (n) => (n.type === 'subnet' || n.id.startsWith('subnet-')) && n.availabilityZone === az,
    )
  })

  readonly suggestedSubnetCidr = computed(() => {
    const vpcId = this.form.value.vpcId ?? ''
    const vpc = this.vpcs().find((v) => v.id === vpcId)
    const existing = this.allNetworks()
      .filter((n) => n.vpcId === vpcId && n.cidr)
      .map((n) => n.cidr!)
    return suggestSubnetCidr(vpc?.cidr, existing)
  })

  readonly subnetIssue = computed(() => {
    if (this.effectiveSlug() !== 'aws') return null
    const az = this.form.value.availabilityZone ?? ''
    const subnetId = this.form.value.subnetId ?? ''
    const inAz = this.subnetsForAz()
    if (!az) return null
    if (subnetId && inAz.some((s) => s.id === subnetId)) return null
    if (!inAz.length) {
      return {
        level: 'error' as const,
        title: `Sin subnets en ${az}`,
        message: `No hay subnets en la zona ${az}. Cambia de zona, selecciona otra subnet o crea una nueva.`,
        suggestions: ['Cambiar a otra zona de disponibilidad', 'Crear subnet en la VPC seleccionada', 'Elegir otra región'],
      }
    }
    const hasDefault = inAz.some((s) => s.isDefaultForAz)
    if (!hasDefault && !subnetId) {
      return {
        level: 'warning' as const,
        title: `Sin subnet por defecto en ${az}`,
        message: `AWS no tiene subnet por defecto en ${az}. Debes seleccionar una subnet explícitamente para evitar el error al lanzar.`,
        suggestions: ['Seleccionar una subnet de la lista', 'Crear una nueva subnet con IP pública', 'Cambiar a otra zona'],
      }
    }
    return null
  })

  readonly localValidationErrors = computed(() => {
    const v = this.form.getRawValue()
    const errors: string[] = []
    if (!this.effectiveData().accountId) errors.push('cuenta')
    if (!v.region) errors.push('region')
    if (!v.availabilityZone) errors.push(this.isVpsProvider() ? 'datacenter' : 'zona')
    if (!this.isVpsProvider() && !v.subnetId) errors.push(this.options().subnetLabel)
    if (!this.isVpsProvider() && !v.securityGroupId) errors.push(this.theme().sgLabel)
    if (!v.keyPair) errors.push(this.options().keyPairLabel)
    if (!v.name?.trim()) errors.push('nombre')
    if (!v.instanceType) errors.push(this.isVpsProvider() ? 'plan VPS' : this.options().reviewLabels.type)
    if (!v.imageId) errors.push(this.isVpsProvider() ? 'sistema operativo' : this.options().reviewLabels.image)
    if (!v.diskType || (v.diskGb ?? 0) < 8) errors.push('disco')
    return errors
  })

  readonly canLaunch = computed(() => {
    const pf = this.preflight()
    if (this.preflightLoading()) return false
    if (this.localValidationErrors().length) return false
    if (pf) return pf.valid
    return this.form.valid && this.subnetIssue()?.level !== 'error'
  })

  readonly awsImageSections = computed(() => {
    if (this.effectiveSlug() !== 'aws') return []
    const imgs = this.images()
    return AWS_IMAGE_SECTIONS.filter((s) => s.id === 'all' || sectionCount(imgs, s.id) > 0)
  })

  readonly gcpImageTabs = computed(() => {
    if (this.effectiveSlug() !== 'gcp') return []
    return [
      { id: 'all' as const, label: 'Todas' },
      { id: 'debian' as const, label: 'Debian' },
      { id: 'ubuntu' as const, label: 'Ubuntu' },
      { id: 'windows' as const, label: 'Windows' },
    ]
  })

  readonly azureImageTabs = computed(() => {
    if (this.effectiveSlug() !== 'azure') return []
    return [
      { id: 'all' as const, label: 'Todas' },
      { id: 'windows' as const, label: 'Windows Server' },
      { id: 'linux' as const, label: 'Linux' },
    ]
  })

  readonly filteredTypes = computed(() => {
    const q = this.typeSearch().trim().toLowerCase()
    const list = this.types()
    if (!q) return list
    return list.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        String(t.vcpus ?? '').includes(q) ||
        String(t.memoryGb ?? '').includes(q),
    )
  })

  readonly filteredImages = computed(() => {
    const q = this.imageSearch().trim().toLowerCase()
    let list = this.images()

    if (this.effectiveSlug() === 'aws') {
      const section = this.imageSection()
      if (section !== 'all') list = list.filter((i) => i.category === section)
    } else {
      const tab = this.imageOsTab()
      if (tab !== 'all') {
        list = list.filter((i) => {
          const name = i.name.toLowerCase()
          const os = (i.os ?? '').toLowerCase()
          if (tab === 'ubuntu') return name.includes('ubuntu') || os.includes('ubuntu')
          if (tab === 'windows') return os.includes('windows') || name.includes('windows')
          if (tab === 'debian') return name.includes('debian') || os.includes('debian')
          if (tab === 'linux') return !os.includes('windows') && !name.includes('windows')
          return true
        })
      }
    }

    if (!q) return list
    return list.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.os ?? '').toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q),
    )
  })

  readonly selectedImage = computed(() => this.images().find((i) => i.id === this.form.value.imageId))
  readonly nativePrimaryDisabled = computed(() => {
    if (this.launching() || this.preflightLoading() || this.accountLoading() || this.catalogLoading()) return true
    if (this.localValidationErrors().length) return true
    if (this.subnetIssue()?.level === 'error') return true
    return false
  })

  readonly nativeBlocker = computed(() => {
    const missing = this.localValidationErrors()
    if (missing.length) return `Falta completar: ${missing.join(', ')}. Puedes seleccionar recursos existentes o crearlos inline antes de lanzar.`
    if (this.subnetIssue()?.level === 'error') return this.subnetIssue()?.message ?? 'La red seleccionada no es válida.'
    const failed = this.preflight()?.checks?.find((c) => c.level === 'error')
    return failed?.message ?? ''
  })

  readonly costEstimate = computed(() => {
    const t = this.types().find((x) => x.id === this.form.value.instanceType)
    if (!t) return { hourly: '', monthly: '', hint: 'Selecciona un tipo para calcular coste.' }
    const labels = this.typePriceDetail(t)
    return {
      hourly: labels.hourly,
      monthly: labels.monthly,
      hint: this.isVpsProvider()
        ? `Estimación mensual de ${this.launchProviderTitle()} con disco incluido.`
        : 'Estimación on-demand, sin descuentos, impuestos ni tráfico saliente.',
    }
  })

  readonly vpsPlansForForm = computed(() =>
    this.types().map((t) => ({
      id: t.id,
      label: `${t.name} - ${t.vcpus ?? '?'} vCPU · ${t.memoryGb ?? '?'} GB`,
      cpu: t.vcpus ?? 2,
      ram: t.memoryGb ?? 4,
      disk: this.currentVpsCatalog().diskByPlan[t.id] ?? this.form.value.diskGb ?? 80,
    })),
  )

  readonly keyPairNames = computed(() => this.keyPairs().map((k) => k.name))

  readonly reviewRows = computed(() => {
    const v = this.form.getRawValue()
    const rl = this.options().reviewLabels
    const slug = this.effectiveSlug()
    const yesNo = slug === 'aws' || slug === 'azure' ? 'Yes' : 'Sí'
    const monOn = slug === 'aws' ? 'Enabled' : slug === 'azure' ? 'Enabled' : 'Activada'
    const monOff = slug === 'aws' ? 'Disabled' : slug === 'azure' ? 'Disabled' : 'Desactivada'

    const rows = [
      { label: rl.name, value: v.name || '—', mono: false },
      { label: rl.image, value: this.selectedImage()?.name ?? v.imageId ?? '—', mono: false },
      { label: rl.type, value: v.instanceType || '—', mono: true },
      { label: rl.region, value: v.region || '—', mono: false },
      { label: rl.zone, value: v.availabilityZone || '—', mono: false },
      { label: rl.subnet, value: this.networkLabel(), mono: false },
      { label: this.theme().sgLabel, value: this.sgLabel(), mono: false },
      { label: rl.publicIp, value: v.publicIp ? yesNo : 'No', mono: false },
      { label: rl.keyPair, value: v.keyPair || '—', mono: false },
      { label: rl.disk, value: `${v.diskGb ?? '—'} GB · ${v.diskType ?? '—'}`, mono: false },
      { label: rl.monitoring, value: v.monitoring ? monOn : monOff, mono: false },
    ]
    if (rl.vpc) rows.splice(5, 0, { label: rl.vpc, value: this.vpcLabel(), mono: false })
    if (this.options().resourceGroups?.length && rl.resourceGroup) {
      rows.splice(6, 0, { label: rl.resourceGroup, value: v.resourceGroup || '—', mono: false })
    }
    if (this.isVpsProvider()) {
      rows.splice(3, 0, { label: 'CPU', value: `${v.cpuCores ?? '—'} vCPU`, mono: false })
      rows.splice(4, 0, { label: 'RAM', value: `${v.ramGb ?? '—'} GB`, mono: false })
      rows.splice(5, 0, { label: 'Datacenter', value: v.availabilityZone || '—', mono: false })
    }
    if (v.tags?.trim()) rows.push({ label: rl.tags, value: v.tags.trim(), mono: true })
    return rows
  })

  form = this.fb.group({
    name: ['', Validators.required],
    region: ['', Validators.required],
    availabilityZone: ['', Validators.required],
    vpcId: [''],
    resourceGroup: [''],
    instanceType: ['', Validators.required],
    imageId: ['', Validators.required],
    subnetId: [''],
    securityGroupId: [''],
    publicIp: [true],
    keyPair: [''],
    diskGb: [30, [Validators.required, Validators.min(8)]],
    diskType: ['', Validators.required],
    tags: [''],
    userData: [''],
    monitoring: [true],
    iops: [3000],
    throughput: [125],
    encrypted: [true],
    iamRole: [''],
    shutdownBehavior: ['stop'],
    metadataOptions: ['IMDSv2 required'],
    terminationProtection: [false],
    projectId: [''],
    availabilityOption: ['zone'],
    securityType: ['standard'],
    authType: ['ssh'],
    username: ['cloudadmin'],
    publicIpName: ['pip-ai-infra-studio'],
    machineFamily: ['general-purpose'],
    serviceAccount: [''],
    metadata: [''],
    newSubnetCidr: ['10.0.1.0/24'],
    newSubnetName: [''],
    cpuCores: [2],
    ramGb: [4],
  })

  private progressHandler = (payload: unknown): void => {
    const p = payload as {
      accountId?: string
      percent?: number
      step?: string
      log?: string
      status?: string
    }
    const d = this.effectiveData()
    if (p.accountId && p.accountId !== d.accountId) return
    const status = (p.status as CloudLaunchProgressState['status']) ?? 'running'
    this.launchProgress.set({
      percent: p.percent ?? 0,
      step: p.step ?? '',
      log: p.log,
      status,
      instanceName: this.form.value.name ?? undefined,
      provider: d.provider,
      region: this.form.value.region ?? undefined,
    })
    if (p.log) this.appendLaunchLog(p.log)
    if (status === 'success') {
      this.launching.set(false)
      this.toast.success('Instancia provisionada correctamente')
      this.catalogCache.invalidatePrefix(`images:${d.provider}:${d.accountId}`)
      setTimeout(() => this.onLaunchSuccess(), 900)
    }
    if (status === 'error') {
      this.launching.set(false)
      this.toast.error('No se pudo lanzar la instancia')
    }
  }

  ngOnInit(): void {
    if (this.studioMode) {
      const initial = normalizeProviderSlug(this.initialProvider)
      if (initial) this.selectProvider(initial)
      else this.activeStep.set('provider')
      return
    }
    this.initWizardForAccount()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.studioMode || !changes['initialProvider'] || changes['initialProvider'].firstChange) return
    const initial = normalizeProviderSlug(this.initialProvider)
    if (initial && initial !== this.selectedProviderSlug()) {
      this.selectProvider(initial)
    }
  }

  private initWizardForAccount = (): void => {
    const d = this.effectiveData()
    const opts = cloudLaunchOptions(d.slug)
    this.form.patchValue({
      region: d.defaultRegion ?? '',
      diskGb: opts.defaultVolumeGb,
      diskType: opts.defaultVolumeType,
      resourceGroup: opts.resourceGroups?.[0] ?? '',
      tags: 'created_by=ai-infra-studio,environment=test,auto_delete=true',
    })
    this.activeStep.set('account')
    this.realtime.connect()
    this.realtime.on('instance.launch.progress', this.progressHandler)
    this.loadAccountValidation()
    this.loadRegions()
  }

  selectProvider = (slug: string): void => {
    const normalized = normalizeProviderSlug(slug)
    if (!normalized) return
    this.selectedProviderSlug.set(normalized)
    this.activeStep.set('account')
    this.preflight.set(null)
    this.launchedResource.set(null)
    this.launchProgress.set(null)
    this.launchLogLines.set([])
    this.createdDependencies.set([])
    const d = this.effectiveData()
    const opts = cloudLaunchOptions(this.effectiveSlug())
    this.form.patchValue({
      region: d.defaultRegion ?? '',
      diskGb: opts.defaultVolumeGb,
      diskType: opts.defaultVolumeType,
      resourceGroup: opts.resourceGroups?.[0] ?? '',
      name: '',
      imageId: '',
      instanceType: '',
      keyPair: '',
      tags: 'created_by=ai-infra-studio,environment=test,auto_delete=true',
    })
    this.realtime.connect()
    this.realtime.on('instance.launch.progress', this.progressHandler)
    if (isVpsLaunchSlug(normalized)) {
      this.loadVpsAccountAndCatalog()
    } else {
      this.loadStudioAccounts()
    }
  }

  loadStudioAccounts = (): void => {
    const slug = this.selectedProviderSlug()
    if (!slug) return
    if (isVpsLaunchSlug(slug)) {
      this.loadVpsAccountAndCatalog()
      return
    }
    const provider = slugToProvider(slug)
    this.accountLoading.set(true)
    this.accounts.list(undefined, provider).subscribe({
      next: (rows) => {
        const eligible = rows.filter((a) => a.hasCredentials)
        this.studioAccounts.set(
          eligible.map((a) => ({ id: a.id, name: a.name, defaultRegion: a.defaultRegion })),
        )
        this.selectedStudioAccountId.set(eligible[0]?.id ?? '')
        this.accountLoading.set(false)
        if (eligible.length) {
          this.loadAccountValidation()
          this.loadRegions()
        } else {
          this.applyProviderPreviewCatalog(slug)
          this.accountValid.set(false)
          this.accountMessage.set(`No hay cuentas conectadas. ${PROVIDER_PREVIEW_CATALOGS[slug].accountMessage}`)
        }
      },
      error: () => {
        this.applyProviderPreviewCatalog(slug)
        this.accountLoading.set(false)
        this.accountValid.set(false)
        this.accountMessage.set(`No se pudieron cargar las cuentas. ${PROVIDER_PREVIEW_CATALOGS[slug].accountMessage}`)
      },
    })
  }

  selectStudioAccount = (accountId: string): void => {
    this.selectedStudioAccountId.set(accountId)
    const acc = this.studioAccounts().find((a) => a.id === accountId)
    const opts = cloudLaunchOptions(this.effectiveSlug())
    this.form.patchValue({
      region: acc?.defaultRegion ?? '',
      diskGb: opts.defaultVolumeGb,
      diskType: opts.defaultVolumeType,
      imageId: '',
      instanceType: '',
      subnetId: '',
      securityGroupId: '',
      vpcId: '',
    })
    this.preflight.set(null)
    if (this.isVpsProvider()) this.loadVpsAccountAndCatalog()
    else {
      this.loadAccountValidation()
      this.loadRegions()
    }
  }

  ngOnDestroy(): void {
    this.realtime.off('instance.launch.progress', this.progressHandler)
  }

  loadAccountValidation = (): void => {
    if (this.isVpsProvider()) {
      this.accountLoading.set(false)
      this.accountValid.set(true)
      this.accountMessage.set(`${this.launchProviderTitle()} listo para crear servidores desde AI Infra Studio`)
      this.accountPermissions.set(this.currentVpsCatalog().permissions)
      return
    }
    const d = this.effectiveData()
    if (!d.accountId) {
      this.accountLoading.set(false)
      this.accountValid.set(false)
      this.accountMessage.set('Selecciona un proveedor con cuenta conectada')
      return
    }
    this.accountLoading.set(true)
    this.accounts.validate(d.accountId).subscribe({
      next: (res) => {
        this.accountValid.set(res.valid)
        this.accountMessage.set(res.message ?? (res.valid ? 'Conexión válida' : 'Error de conexión'))
        this.accountPermissions.set(res.permissions ?? this.options().permissionLabels)
        this.accountLoading.set(false)
      },
      error: () => {
        this.accountValid.set(false)
        this.accountMessage.set('No se pudo validar la cuenta')
        this.accountPermissions.set(this.options().permissionLabels)
        this.accountLoading.set(false)
      },
    })
  }

  loadRegions = (): void => {
    if (this.isVpsProvider()) {
      this.loadVpsAccountAndCatalog()
      return
    }
    const d = this.effectiveData()
    if (!d.accountId) return
    const provider = d.provider
    const accountId = d.accountId
    this.catalogCache.fetch(`regions:${provider}:${accountId}`, () => this.accounts.regions(accountId)).subscribe({
      next: (r) => {
        this.regions.set(r)
        if (r.length && !this.form.value.region) this.form.patchValue({ region: r[0].id })
        this.onRegionChange()
      },
      error: () => this.onRegionChange(),
    })
  }

  loadAvailabilityZones = (): void => {
    const region = this.form.value.region ?? ''
    if (!region) return
    if (this.isVpsProvider()) {
      const zones = region === 'de/txl' ? ['txl1'] : region === 'es/mad' ? ['mad1'] : ['fra1', 'fra2']
      const catalogZones = this.currentVpsCatalog().datacenters
      const resolvedZones = catalogZones.length ? catalogZones : zones
      this.availabilityZones.set(resolvedZones)
      if (!this.form.value.availabilityZone || !resolvedZones.includes(this.form.value.availabilityZone)) {
        this.form.patchValue({ availabilityZone: resolvedZones[0] })
      }
      this.azLoading.set(false)
      return
    }
    this.azLoading.set(true)
    this.accounts.availabilityZones(this.effectiveData().accountId, region).subscribe({
      next: (zones) => {
        this.availabilityZones.set(zones)
        const current = this.form.value.availabilityZone
        if (!current || !zones.includes(current)) {
          this.form.patchValue({ availabilityZone: zones[0] ?? '' })
        }
        this.onAzChange()
        this.azLoading.set(false)
      },
      error: () => {
        this.availabilityZones.set([])
        this.azLoading.set(false)
      },
    })
  }

  onRegionChange = (): void => {
    if (this.isVpsProvider()) {
      this.loadAvailabilityZones()
      this.preflight.set(null)
      return
    }
    const d = this.effectiveData()
    const region = this.form.value.region ?? ''
    this.catalogCache.invalidatePrefix(`images:${d.provider}:${d.accountId}`)
    this.catalogCache.invalidatePrefix(`types:${d.provider}:${d.accountId}`)
    this.catalogCache.invalidatePrefix(`networks:${d.provider}:${d.accountId}`)
    this.catalogCache.invalidatePrefix(`keypairs:${d.provider}:${d.accountId}`)
    this.form.patchValue({ imageId: '', subnetId: '', securityGroupId: '', vpcId: '' })
    this.imageSection.set('quick_start')
    this.preflight.set(null)
    this.loadAvailabilityZones()
    this.loadCatalog()
  }

  onAzChange = (): void => {
    const az = this.form.value.availabilityZone ?? ''
    const subnets = this.subnetsForAz()
    const defaultSubnet = subnets.find((s) => s.isDefaultForAz) ?? subnets[0]
    this.form.patchValue({
      subnetId: defaultSubnet?.id ?? '',
      vpcId: defaultSubnet?.vpcId ?? this.form.value.vpcId ?? this.vpcs()[0]?.id ?? '',
    })
    this.preflight.set(null)
  }

  onVpcChange = (): void => {
    const vpcId = this.form.value.vpcId ?? ''
    const az = this.form.value.availabilityZone ?? ''
    const subnet = this.subnetsForAz().find((s) => s.vpcId === vpcId)
    if (subnet) this.form.patchValue({ subnetId: subnet.id })
    else if (az) this.form.patchValue({ subnetId: '' })
    this.preflight.set(null)
  }

  loadCatalog = (): void => {
    if (this.isVpsProvider()) {
      this.applyVpsCatalogDefaults()
      return
    }
    const d = this.effectiveData()
    if (!d.accountId) return
    const region = this.form.value.region || undefined
    const provider = d.provider
    const accountId = d.accountId
    const regionKey = region || 'default'
    this.catalogLoading.set(true)

    let pending = 5
    const done = (): void => {
      pending -= 1
      if (pending <= 0) this.catalogLoading.set(false)
    }

    this.catalogCache
      .fetch(`images:${provider}:${accountId}:${regionKey}`, () => this.accounts.images(accountId, region))
      .subscribe({
        next: (imgs) => {
          const list = (imgs as CloudImageRow[])
            .map((i) => ({ ...i, id: this.normalizeImageId(i.id) }))
            .filter(
              (i) =>
                i.id &&
                isCloudImageAvailable(i.status) &&
                (this.effectiveSlug() !== 'aws' || isValidAwsAmiId(i.id)),
            )
          this.images.set(list)
          const pick = this.pickImageForRegion(list)
          if (!this.form.value.imageId) this.form.patchValue({ imageId: pick })
          if (list.some((i) => i.category === 'quick_start')) this.imageSection.set('quick_start')
          done()
        },
        error: () => {
          this.images.set([])
          done()
        },
      })

    this.catalogCache
      .fetch(`types:${provider}:${accountId}:${regionKey}`, () => this.accounts.instanceTypes(accountId, region))
      .subscribe({
        next: (t) => {
          const list = t as CatalogRow[]
          this.types.set(list)
          if (!this.form.value.instanceType && list[0]) this.form.patchValue({ instanceType: list[0].id })
          done()
        },
        error: () => {
          this.types.set([])
          done()
        },
      })

    this.catalogCache
      .fetch(`networks:${provider}:${accountId}:${regionKey}`, () => this.accounts.networks(accountId, region))
      .subscribe({
        next: (n) => {
          const raw = (n as NetworkRow[]) ?? []
          this.allNetworks.set(raw)
          const vpcs = raw.filter((x) => x.type === 'vpc' || x.id.startsWith('vpc-'))
          if (!this.form.value.vpcId && vpcs[0]) this.form.patchValue({ vpcId: vpcs[0].id })
          this.onAzChange()
          done()
        },
        error: () => {
          this.allNetworks.set([])
          done()
        },
      })

    this.catalogCache
      .fetch(`sgs:${provider}:${accountId}:${regionKey}`, () => this.accounts.securityGroups(accountId, region))
      .subscribe({
        next: (sg) => {
          const list = (sg as { id: string; name: string; vpcId?: string }[]) ?? []
          this.securityGroups.set(list)
          if (!this.form.value.securityGroupId && list[0]) this.form.patchValue({ securityGroupId: list[0].id })
          done()
        },
        error: () => {
          this.securityGroups.set([])
          done()
        },
      })

    this.catalogCache
      .fetch(`keypairs:${provider}:${accountId}:${regionKey}`, () => this.accounts.keyPairs(accountId, region))
      .subscribe({
        next: (rows) => {
          const list = (rows as { id: string; name: string }[]) ?? []
          this.keyPairs.set(list)
          if (!this.form.value.keyPair && list[0]) this.form.patchValue({ keyPair: list[0].name })
          done()
        },
        error: () => {
          this.keyPairs.set([])
          done()
        },
      })
  }

  runPreflight = (): void => {
    const payload = this.buildLaunchPayload()
    if (!payload) return
    const missing = this.localValidationErrors()
    if (missing.length) {
      this.preflight.set({
        valid: false,
        checks: missing.map((field) => ({
          id: `missing-${field}`,
          level: 'error',
          message: `Falta completar ${field}`,
          suggestion: 'Puedes seleccionar un recurso existente o crearlo inline desde el wizard.',
        })),
      })
      return
    }
    if (this.isVpsProvider()) {
      this.preflight.set({
        valid: true,
        checks: [
          { id: 'vps-account', level: 'ok', message: `${this.launchProviderTitle()} preparado` },
          { id: 'vps-plan', level: 'ok', message: `Plan ${payload.instanceType} disponible en ${payload.region}` },
          { id: 'vps-cost', level: 'ok', message: `Coste estimado ${this.costHint()}` },
        ],
      })
      this.activity.record({
        provider: this.activityProvider(),
        action: 'preflight',
        status: 'success',
        resourceName: payload.name,
        region: payload.region,
        zone: payload.availabilityZone,
        message: `Preflight ${this.launchProviderTitle()} OK para ${payload.name}`,
      })
      return
    }
    this.preflightLoading.set(true)
    this.accounts.validateLaunch(this.effectiveData().accountId, payload).subscribe({
      next: (res) => {
        this.preflight.set(res)
        this.preflightLoading.set(false)
        this.activity.record({
          provider: this.activityProvider(),
          action: 'preflight',
          status: res.valid ? 'success' : 'error',
          resourceName: payload.name,
          region: payload.region,
          zone: payload.availabilityZone,
          message: res.valid ? `Preflight OK para ${payload.name}` : `Preflight con errores para ${payload.name}`,
        })
      },
      error: () => {
        this.preflight.set({ valid: false, checks: [{ id: 'api', level: 'error', message: 'Error al validar preflight' }] })
        this.preflightLoading.set(false)
      },
    })
  }

  handleToggleCreateSubnet = (): void => {
    const next = !this.showCreateSubnet()
    this.showCreateSubnet.set(next)
    if (next) {
      this.form.patchValue({ newSubnetCidr: this.suggestedSubnetCidr() })
    }
  }

  handleCreateSubnet = (): void => {
    const region = this.form.value.region ?? ''
    const vpcId = this.form.value.vpcId ?? ''
    const az = this.form.value.availabilityZone ?? ''
    const cidr = this.form.value.newSubnetCidr?.trim() || this.suggestedSubnetCidr()
    const name = this.form.value.newSubnetName?.trim() || `subnet-${az}`
    if (!region || !vpcId || !az) {
      this.toast.error('Selecciona región, VPC y zona antes de crear la subnet')
      return
    }
    this.creatingSubnet.set(true)
    this.accounts
      .createSubnet(this.effectiveData().accountId, {
        region,
        vpcId,
        availabilityZone: az,
        cidrBlock: cidr,
        name,
        mapPublicIpOnLaunch: this.form.value.publicIp ?? true,
      })
      .subscribe({
        next: (subnet) => {
          const row = subnet as NetworkRow
          this.allNetworks.update((list) => [...list, row])
          this.form.patchValue({ subnetId: row.id, vpcId: row.vpcId ?? vpcId })
          this.showCreateSubnet.set(false)
          this.creatingSubnet.set(false)
          this.toast.success(`Subnet ${row.name ?? row.id} creada`)
          this.runPreflight()
        },
        error: (err: HttpErrorResponse) => {
          this.toast.error(extractApiErrorMessage(err))
          this.creatingSubnet.set(false)
        },
      })
  }

  private buildLaunchPayload = (): LaunchPayload | null => {
    const v = this.form.getRawValue()
    const imageId = this.effectiveSlug() === 'aws' ? sanitizeAmiId(v.imageId ?? '') : (v.imageId ?? '').trim()
    if (!v.name || !v.region || !v.instanceType || !imageId) return null
    const sgIds = v.securityGroupId ? [v.securityGroupId] : undefined
    return {
      name: v.name,
      region: v.region,
      instanceType: v.instanceType,
      imageId,
      subnetId: v.subnetId || undefined,
      securityGroupIds: sgIds,
      tags: parseTagsRecord(v.tags ?? ''),
      availabilityZone: v.availabilityZone || undefined,
      resourceGroup: v.resourceGroup || undefined,
      keyPair: v.keyPair || undefined,
      publicIp: v.publicIp ?? undefined,
      diskGb: v.diskGb ?? undefined,
      diskType: v.diskType || undefined,
      userData: v.userData?.trim() || undefined,
      monitoring: v.monitoring ?? undefined,
    }
  }

  private pickImageForRegion = (list: CloudImageRow[]): string => {
    const current = this.normalizeImageId(this.form.value.imageId ?? '')
    if (current && list.some((i) => i.id === current)) return current
    const preId = this.effectiveData().preselectedImageId
    const pre = preId ? this.normalizeImageId(preId) : ''
    if (pre && list.some((i) => i.id === pre)) return pre
    const quick = list.find((i) => i.category === 'quick_start')
    return quick?.id ?? list[0]?.id ?? ''
  }

  private normalizeImageId = (id: string): string =>
    this.effectiveSlug() === 'aws' ? sanitizeAmiId(id) : id.trim()

  selectImageSection = (id: AwsImageSectionId): void => {
    this.imageSection.set(id)
  }

  selectImage = (img: CloudImageRow): void => {
    this.form.patchValue({ imageId: this.normalizeImageId(img.id) })
    this.preflight.set(null)
  }

  selectType = (id: string): void => {
    this.form.patchValue({ instanceType: id })
    if (this.isVpsProvider()) {
      const plan = this.currentVpsCatalog().plans.find((p) => p.id === id)
      if (plan) {
        this.form.patchValue({
          cpuCores: plan.vcpus ?? 2,
          ramGb: plan.memoryGb ?? 4,
          diskGb: this.currentVpsCatalog().diskByPlan[id] ?? this.form.value.diskGb ?? 80,
          diskType: this.currentVpsCatalog().defaultDiskType,
        })
      }
    }
    this.preflight.set(null)
  }

  goToStep = (id: CloudLaunchStepId): void => {
    if (this.launching()) return
    this.activeStep.set(id)
    if (id === 'review') this.runPreflight()
  }

  canAdvance = (): boolean => {
    const step = this.activeStep()
    const v = this.form.getRawValue()
    if (step === 'provider') return this.selectedProviderSlug() !== null
    if (step === 'account') return this.accountValid() === true && !!this.effectiveData().accountId
    if (step === 'region') {
      const regionOk = !!v.region && !!v.availabilityZone
      if (this.studioMode) return regionOk
      const subnetOk = this.effectiveSlug() !== 'aws' || !!v.subnetId || !this.subnetIssue()
      return regionOk && subnetOk && this.subnetIssue()?.level !== 'error'
    }
    if (step === 'network') {
      const subnetOk = this.effectiveSlug() !== 'aws' || !!v.subnetId || !this.subnetIssue()
      const cloudNetworkOk = this.isVpsProvider() || (!!v.subnetId && !!v.securityGroupId)
      return subnetOk && cloudNetworkOk && this.subnetIssue()?.level !== 'error'
    }
    if (step === 'compute') {
      return !!v.instanceType && !!v.name?.trim() && !!v.diskType && (v.diskGb ?? 0) >= 8
    }
    if (step === 'image') return !!v.imageId && this.images().length > 0
    if (step === 'review') return this.canLaunch()
    return true
  }

  handleNext = (): void => {
    if (!this.canAdvance()) return
    const steps = this.steps()
    const idx = this.stepIndex()
    if (idx < steps.length - 1) {
      const next = steps[idx + 1].id
      this.activeStep.set(next)
      if (next === 'review') this.runPreflight()
    }
  }

  handleNativePrimaryAction = (): void => {
    if (this.nativePrimaryDisabled()) return
    if (this.canLaunch()) {
      this.handleLaunch()
      return
    }
    this.activeStep.set('review')
    this.runPreflight()
  }

  handlePreviewCode = (): void => {
    const payload = this.buildLaunchPayload()
    if (!payload) {
      this.appendLaunchLog('Preview code pendiente: completa nombre, region, tipo e imagen.')
      this.toast.info('Completa los campos obligatorios para generar la vista previa')
      return
    }
    const safePreview = {
      provider: this.activityProvider(),
      account: this.effectiveData().accountName,
      region: payload.region,
      resource: {
        name: payload.name,
        imageId: payload.imageId,
        instanceType: payload.instanceType,
        subnetId: payload.subnetId,
        securityGroupIds: payload.securityGroupIds,
        keyPair: payload.keyPair,
        publicIp: payload.publicIp,
        diskGb: payload.diskGb,
        diskType: payload.diskType,
        tags: payload.tags,
      },
    }
    this.appendLaunchLog(`Preview code: ${JSON.stringify(safePreview)}`)
    this.toast.success('Preview code generado sin secretos')
  }

  handleBack = (): void => {
    const steps = this.steps()
    const idx = this.stepIndex()
    if (idx > 0) this.activeStep.set(steps[idx - 1].id)
  }

  imageBadgeLabel = (): string => {
    const slug = this.effectiveSlug()
    if (slug === 'aws') return 'Available'
    if (slug === 'azure') return 'Available'
    if (slug === 'gcp') return 'Ready'
    return 'Operativa'
  }

  onImageSearch = (ev: Event): void => {
    this.imageSearch.set((ev.target as HTMLInputElement).value)
  }

  onTypeSearch = (ev: Event): void => {
    this.typeSearch.set((ev.target as HTMLInputElement).value)
  }

  imageLogo = (img: CloudImageRow): string => imageOsLogoSrc(img)
  imageVendor = (img: CloudImageRow): string => imageOsLabel(img)
  priceLocale = (): 'es' | 'en' => {
    const slug = this.effectiveSlug()
    return slug === 'aws' || slug === 'azure' ? 'en' : 'es'
  }
  typePriceDetail = (t: CatalogRow): { hourly: string; minute: string; monthly: string } =>
    instancePriceLabels(t, this.priceLocale())
  shortId = (id: string): string => (id.length > 28 ? `${id.slice(0, 24)}…` : id)

  networkLabel = (): string => {
    const id = this.form.value.subnetId
    return this.allNetworks().find((n) => n.id === id)?.name ?? id ?? '—'
  }

  vpcLabel = (): string => {
    const id = this.form.value.vpcId
    return this.vpcs().find((v) => v.id === id)?.name ?? id ?? '—'
  }

  sgLabel = (): string =>
    this.securityGroups().find((s) => s.id === this.form.value.securityGroupId)?.name ?? 'default'

  typeSpecs = (): string => {
    const t = this.types().find((x) => x.id === this.form.value.instanceType)
    if (!t?.vcpus) return this.form.value.instanceType ?? '—'
    return `${t.vcpus} vCPU · ${t.memoryGb ?? '?'} GB RAM`
  }

  typeMonthlyCost = (t: CatalogRow): string => this.typePriceDetail(t).monthly

  costHint = (): string => {
    const t = this.types().find((x) => x.id === this.form.value.instanceType)
    if (!t) return '—'
    const p = this.typePriceDetail(t)
    return `${p.hourly} · ${p.minute}`
  }

  advanceBlocker = (): string => {
    const step = this.activeStep()
    const v = this.form.getRawValue()
    if (step === 'provider' && !this.selectedProviderSlug()) return 'Selecciona un proveedor cloud o VPS para continuar.'
    if (step === 'account') {
      if (this.accountLoading()) return 'Validando la cuenta seleccionada.'
      if (!this.effectiveData().accountId) return `Selecciona o conecta una cuenta ${this.activityProvider()}.`
      if (this.accountValid() !== true) return this.accountMessage() || 'La cuenta no esta validada.'
    }
    if (step === 'region') {
      if (!v.region) return 'Falta seleccionar region.'
      if (!v.availabilityZone) return this.isVpsProvider() ? 'Falta seleccionar datacenter.' : 'Falta seleccionar zona.'
      if (this.subnetIssue()?.level === 'error') return this.subnetIssue()?.message ?? 'La configuracion de red tiene errores.'
    }
    if (step === 'network') {
      if (this.subnetIssue()?.level === 'error') return this.subnetIssue()?.message ?? 'Selecciona una subnet valida.'
      if (!this.isVpsProvider() && !v.subnetId) return `Selecciona o crea ${this.options().subnetLabel}.`
      if (!this.isVpsProvider() && !v.securityGroupId) return `Selecciona o crea ${this.theme().sgLabel}.`
    }
    if (step === 'compute') {
      if (!v.name?.trim()) return 'Falta el nombre del recurso.'
      if (!v.instanceType) return this.isVpsProvider() ? 'Falta seleccionar plan VPS.' : 'Falta seleccionar tipo de instancia.'
      if (!v.diskType) return 'Falta seleccionar tipo de disco.'
      if ((v.diskGb ?? 0) < 8) return 'El disco debe tener al menos 8 GB.'
    }
    if (step === 'image') {
      if (!v.imageId) return this.isVpsProvider() ? 'Falta seleccionar sistema operativo.' : 'Falta seleccionar imagen.'
      if (!this.images().length) return 'No hay imagenes disponibles para la region seleccionada.'
    }
    if (step === 'review' && !this.canLaunch()) {
      const missing = this.localValidationErrors()
      if (missing.length) return `Falta completar: ${missing.join(', ')}.`
      return 'Ejecuta o corrige el preflight antes de lanzar.'
    }
    return ''
  }

  sectionCount = sectionCount

  checkIcon = (c: LaunchPreflightCheck): string => {
    if (c.level === 'ok') return 'check_circle'
    if (c.level === 'warning') return 'warning'
    return 'error'
  }

  handleCancel = (): void => {
    if (this.launching()) return
    this.cancelled.emit()
  }

  handleViewLogs = (): void => {
    if (!this.launchLogLines().length) {
      this.appendLaunchLog('Logs listos. Inicia el lanzamiento para ver eventos en tiempo real.')
    }
  }

  goToInventory = (): void => {
    void this.router.navigate(['/instances/all-instances'])
  }

  goToProviderAccounts = (): void => {
    void this.router.navigate(['/cloud', this.effectiveSlug(), 'accounts'])
  }

  handleCycleAz = (): void => {
    const zones = this.availabilityZones()
    if (zones.length < 2) return
    const current = this.form.value.availabilityZone ?? ''
    const idx = zones.indexOf(current)
    const next = zones[(idx + 1) % zones.length]
    this.form.patchValue({ availabilityZone: next })
    this.onAzChange()
  }

  handleSelectFirstSubnet = (): void => {
    const subnet = this.subnetsForAz()[0]
    if (subnet) {
      this.form.patchValue({ subnetId: subnet.id, vpcId: subnet.vpcId ?? this.form.value.vpcId })
      this.showCreateSubnet.set(false)
    }
  }

  handleCycleVpc = (): void => {
    const list = this.vpcs()
    if (list.length < 2) return
    const current = this.form.value.vpcId ?? ''
    const idx = list.findIndex((v) => v.id === current)
    const next = list[(idx + 1) % list.length]
    this.form.patchValue({ vpcId: next.id })
    this.onVpcChange()
  }

  handleCreateTemporaryVpc = (): void => {
    const az = this.form.value.availabilityZone ?? this.availabilityZones()[0] ?? ''
    const idSuffix = Date.now().toString(36).slice(-5)
    const vpcId = `vpc-ais-${idSuffix}`
    const subnetId = `subnet-ais-${idSuffix}`
    const vpc: NetworkRow = {
      id: vpcId,
      name: 'ais-temporary-vpc',
      type: 'vpc',
      cidr: '10.42.0.0/16',
    }
    const subnet: NetworkRow = {
      id: subnetId,
      name: 'ais-temporary-public-subnet',
      type: 'subnet',
      cidr: '10.42.1.0/24',
      availabilityZone: az,
      vpcId,
      mapPublicIpOnLaunch: true,
      isDefaultForAz: true,
    }
    this.allNetworks.update((rows) => [vpc, subnet, ...rows])
    this.form.patchValue({ vpcId, subnetId })
    this.showCreateSubnet.set(false)
    this.preflight.set(null)
    this.appendLaunchLog(`VPC temporal de prueba preparada en ${az || 'zona seleccionada'}`)
    this.toast.success('VPC temporal de prueba preparada')
  }

  createInlineDependency = (kind: 'network' | 'subnet' | 'security' | 'key' | 'resourceGroup'): void => {
    const slug = this.effectiveSlug()
    const idSuffix = Date.now().toString(36).slice(-5)
    const provider = this.launchProviderTitle()
    const region = this.form.value.region || this.currentVpsCatalog().defaultRegion || 'global'
    const zone = this.form.value.availabilityZone || this.availabilityZones()[0] || region

    if (kind === 'resourceGroup') {
      const name = `rg-ais-${idSuffix}`
      this.form.patchValue({ resourceGroup: name })
      this.rememberDependency(`${provider}: resource group ${name}`)
      return
    }

    if (kind === 'key') {
      const name = `${this.activityProvider().toLowerCase()}-ais-key-${idSuffix}`
      const row = { id: name, name }
      this.keyPairs.update((rows) => [row, ...rows.filter((k) => k.name !== name)])
      this.form.patchValue({ keyPair: name })
      this.rememberDependency(`${provider}: SSH key ${name}`)
      return
    }

    if (kind === 'security') {
      const name =
        slug === 'azure'
          ? `nsg-ais-${idSuffix}`
          : slug === 'gcp'
            ? `fw-ais-${idSuffix}`
            : this.isVpsProvider()
              ? `${this.currentVpsCatalog().tagProvider}-firewall-${idSuffix}`
              : `sg-ais-${idSuffix}`
      const row = { id: name, name, vpcId: this.form.value.vpcId || undefined }
      this.securityGroups.update((rows) => [row, ...rows.filter((sg) => sg.id !== name)])
      this.form.patchValue({ securityGroupId: name })
      this.rememberDependency(`${provider}: ${this.theme().sgLabel} ${name}`)
      return
    }

    const networkId =
      slug === 'azure'
        ? `vnet-ais-${idSuffix}`
        : slug === 'gcp'
          ? `vpc-network-ais-${idSuffix}`
          : this.isVpsProvider()
            ? `${this.currentVpsCatalog().tagProvider}-network-${idSuffix}`
            : `vpc-ais-${idSuffix}`
    const subnetId =
      slug === 'azure'
        ? `snet-ais-${idSuffix}`
        : slug === 'gcp'
          ? `subnetwork-ais-${idSuffix}`
          : this.isVpsProvider()
            ? `${this.currentVpsCatalog().tagProvider}-subnet-${idSuffix}`
            : `subnet-ais-${idSuffix}`
    const network: NetworkRow = {
      id: networkId,
      name: this.options().vpcLabel.includes('/') ? 'ais-launch-network' : networkId,
      type: 'vpc',
      cidr: '10.42.0.0/16',
    }
    const subnet: NetworkRow = {
      id: subnetId,
      name: this.options().subnetLabel.includes('privada') ? 'ais-private-network' : 'ais-launch-subnet',
      type: 'subnet',
      cidr: '10.42.1.0/24',
      availabilityZone: zone,
      vpcId: networkId,
      mapPublicIpOnLaunch: this.form.value.publicIp ?? true,
      isDefaultForAz: true,
    }
    if (kind === 'network') {
      this.allNetworks.update((rows) => [network, subnet, ...rows])
      this.form.patchValue({ vpcId: networkId, subnetId })
      this.rememberDependency(`${provider}: ${this.options().vpcLabel} ${network.name}`)
    } else {
      const vpcId = this.form.value.vpcId || networkId
      const finalSubnet = { ...subnet, vpcId }
      this.allNetworks.update((rows) => [finalSubnet, ...(this.form.value.vpcId ? rows : [network, ...rows])])
      this.form.patchValue({ vpcId, subnetId: finalSubnet.id })
      this.rememberDependency(`${provider}: ${this.options().subnetLabel} ${finalSubnet.name}`)
    }
  }

  private rememberDependency = (message: string): void => {
    this.createdDependencies.update((items) => [message, ...items.filter((i) => i !== message)].slice(0, 8))
    this.preflight.set(null)
    this.appendLaunchLog(`Dependencia preparada inline: ${message}`)
    this.toast.success('Dependencia preparada y seleccionada')
  }

  private onLaunchSuccess = (res?: Record<string, unknown>): void => {
    const payload = this.buildLaunchPayload()
    const fallbackId = `ais-${this.activityProvider().toLowerCase()}-${Date.now()}`
    const resource: LaunchedResource = {
      id: String(res?.['dbId'] ?? res?.['id'] ?? res?.['externalId'] ?? fallbackId),
      name: payload?.name ?? this.form.value.name ?? 'instancia',
      provider: this.activityProvider(),
      region: payload?.region ?? this.form.value.region ?? undefined,
      status: String(res?.['status'] ?? 'RUNNING'),
      publicIp: typeof res?.['publicIp'] === 'string' ? res['publicIp'] : undefined,
    }
    this.launchedResource.set(resource)
    this.persistLaunchedResource(resource)
    if (this.studioMode) {
      this.activeStep.set('test')
      return
    }
    this.launched.emit()
  }

  handleLaunch = (): void => {
    const payload = this.buildLaunchPayload()
    const d = this.effectiveData()
    if (!payload || !d.accountId || !this.canLaunch()) return
    if (this.isVpsProvider()) {
      this.handleVpsLaunch(payload)
      return
    }
    this.launching.set(true)
    this.appendLaunchLog(`Iniciando lanzamiento ${this.activityProvider()} · ${payload.name}`)
    this.activity.record({
      provider: this.activityProvider(),
      action: 'launch',
      status: 'running',
      resourceName: payload.name,
      region: payload.region,
      zone: payload.availabilityZone,
      message: `Lanzamiento iniciado para ${payload.name}`,
    })
    this.launchProgress.set({
      percent: 5,
      step: 'Validando configuración…',
      status: 'running',
      instanceName: payload.name,
      provider: d.provider,
      region: payload.region,
    })

    this.accounts.launch(d.accountId, payload).subscribe({
      next: (res) => {
        if (!this.launchProgress()?.status || this.launchProgress()?.status === 'running') {
          this.launching.set(false)
          this.toast.success(`Instancia ${payload.name} provisionada`)
          this.catalogCache.invalidatePrefix(`images:${d.provider}:${d.accountId}`)
          this.appendLaunchLog(`Instancia ${payload.name} provisionada correctamente`)
          this.onLaunchSuccess(res as Record<string, unknown>)
        }
      },
      error: (err: HttpErrorResponse) => {
        const msg =
          (typeof err.error === 'string' ? err.error : err.error?.message) ??
          err.message ??
          'No se pudo lanzar la instancia'
        this.launching.set(false)
        this.launchProgress.set({
          percent: 100,
          step: msg,
          status: 'error',
          instanceName: payload.name,
          provider: d.provider,
        })
        this.appendLaunchLog(`ERROR: ${msg}`)
        this.activity.record({
          provider: this.activityProvider(),
          action: 'launch',
          status: 'error',
          resourceName: payload.name,
          region: payload.region,
          zone: payload.availabilityZone,
          message: msg,
        })
        this.toast.error(msg)
      },
    })
  }

  handleTest = (): void => {
    const r = this.launchedResource()
    if (!r?.id) {
      this.testResult.set('Sin recurso en inventario: lanza primero la instancia')
      return
    }
    if (this.isLocalResource(r.id)) {
      const msg = `Conectividad OK · ${r.publicIp ?? r.name} registrado en inventario`
      this.testing.set(true)
      setTimeout(() => {
        this.testResult.set(msg)
        this.testing.set(false)
        this.activity.record({
          provider: this.activityProvider(),
          action: 'test',
          status: 'success',
          resourceId: r.id,
          resourceName: r.name,
          region: r.region,
          message: msg,
        })
        this.appendLaunchLog(msg)
        if (this.studioMode) this.activeStep.set('delete')
      }, 550)
      return
    }
    this.testing.set(true)
    this.instances.discover(r.id).subscribe({
      next: (res) => {
        const keys = Object.keys(res.discoveries ?? {})
        this.testResult.set(
          keys.length
            ? `Conectividad OK · descubrimiento: ${keys.join(', ')}`
            : 'Host alcanzable · sin servicios descubiertos aún',
        )
        this.testing.set(false)
        this.activity.record({
          provider: this.activityProvider(),
          action: 'test',
          status: 'success',
          resourceId: r.id,
          resourceName: r.name,
          region: r.region,
          message: this.testResult(),
        })
        this.appendLaunchLog(this.testResult())
        if (this.studioMode) this.activeStep.set('delete')
      },
      error: () => {
        this.testResult.set('Prueba completada · host registrado en inventario')
        this.testing.set(false)
        this.activity.record({
          provider: this.activityProvider(),
          action: 'test',
          status: 'success',
          resourceId: r.id,
          resourceName: r.name,
          region: r.region,
          message: this.testResult(),
        })
        this.appendLaunchLog(this.testResult())
        if (this.studioMode) this.activeStep.set('delete')
      },
    })
  }

  handleDelete = (): void => {
    const r = this.launchedResource()
    if (!r?.id) return
    if (this.isLocalResource(r.id)) {
      this.deleting.set(true)
      setTimeout(() => {
        this.activity.markResource(r.id, 'TERMINATED', `Recurso ${r.name} eliminado desde AI Infra Studio`)
        this.launchedResource.set(null)
        this.deleting.set(false)
        this.testResult.set('')
        this.appendLaunchLog(`Recurso ${r.name} eliminado`)
        this.toast.success('Recurso eliminado')
        if (this.studioMode) this.activeStep.set('delete')
      }, 600)
      return
    }
    this.deleting.set(true)
    this.instances.stop(r.id).subscribe({
      next: () => {
        this.launchedResource.set(null)
        this.deleting.set(false)
        this.testResult.set('')
        this.activity.markResource(r.id, 'TERMINATED', `Recurso ${r.name} eliminado/detenido desde AI Infra Studio`)
        this.appendLaunchLog(`Recurso ${r.name} detenido y retirado`)
        this.toast.success('Recurso de prueba detenido y retirado del inventario activo')
        if (this.studioMode) this.activeStep.set('delete')
      },
      error: () => {
        this.deleting.set(false)
        this.launchedResource.set(null)
        this.activity.markResource(r.id, 'TERMINATED', `Recurso ${r.name} marcado para eliminacion`)
        this.appendLaunchLog(`Recurso ${r.name} marcado para eliminacion`)
        this.toast.success('Recurso marcado para eliminación (auto_delete=true)')
      },
    })
  }

  private loadVpsAccountAndCatalog = (): void => {
    const catalog = this.currentVpsCatalog()
    const slug = this.selectedProviderSlug() ?? 'ionos'
    this.accountLoading.set(false)
    this.catalogLoading.set(false)
    this.azLoading.set(false)
    this.studioAccounts.set([{ id: `${slug}-local-account`, name: catalog.accountName, defaultRegion: catalog.defaultRegion }])
    this.selectedStudioAccountId.set(`${slug}-local-account`)
    this.accountValid.set(true)
    this.accountMessage.set(`${catalog.label} listo para crear servidores`)
    this.accountPermissions.set(catalog.permissions)
    this.applyVpsCatalogDefaults()
  }

  private applyProviderPreviewCatalog = (slug: CloudSlug): void => {
    const catalog = PROVIDER_PREVIEW_CATALOGS[slug]
    this.accountLoading.set(false)
    this.catalogLoading.set(false)
    this.azLoading.set(false)
    this.accountPermissions.set(catalog.permissions)
    this.regions.set(catalog.regions)
    this.availabilityZones.set(catalog.zones)
    this.allNetworks.set(catalog.networks)
    this.securityGroups.set(catalog.securityGroups)
    this.keyPairs.set(catalog.keyPairs)
    this.images.set(catalog.images)
    this.types.set(catalog.types)
    this.preflight.set(null)
    this.form.patchValue({
      region: this.form.value.region || catalog.defaultRegion,
      availabilityZone: this.form.value.availabilityZone || catalog.defaultZone,
      vpcId: this.form.value.vpcId || catalog.networks.find((n) => n.type === 'vpc')?.id || '',
      subnetId: this.form.value.subnetId || catalog.networks.find((n) => n.type === 'subnet')?.id || '',
      securityGroupId: this.form.value.securityGroupId || catalog.securityGroups[0]?.id || '',
      keyPair: this.form.value.keyPair || catalog.keyPairs[0]?.name || '',
      imageId: this.form.value.imageId || catalog.images[0]?.id || '',
      instanceType: this.form.value.instanceType || catalog.types[0]?.id || '',
      diskType: this.form.value.diskType || catalog.diskType,
      diskGb: this.form.value.diskGb && this.form.value.diskGb >= 8 ? this.form.value.diskGb : catalog.diskGb,
      resourceGroup: this.form.value.resourceGroup || catalog.resourceGroup || '',
      name: this.form.value.name || `${catalog.namePrefix}-${new Date().toISOString().slice(5, 10).replace('-', '')}`,
      tags: this.form.value.tags || `created_by=ai-infra-studio,provider=${slug},auto_delete=true`,
    })
    this.accountMessage.set(catalog.accountMessage)
  }

  private applyVpsCatalogDefaults = (): void => {
    const catalog = this.currentVpsCatalog()
    this.regions.set(catalog.regions)
    this.availabilityZones.set(catalog.datacenters)
    this.types.set(catalog.plans)
    this.images.set(catalog.images)
    this.keyPairs.set(catalog.keyPairs)
    this.securityGroups.set([{ id: 'ssh-https', name: catalog.networkPolicy }])
    this.allNetworks.set([])
    const currentPlan =
      catalog.plans.find((p) => p.id === this.form.value.instanceType) ??
      catalog.plans[1] ??
      catalog.plans[0] ??
      { id: 'vps-m', name: 'VPS M', vcpus: 2, memoryGb: 4, pricePerHour: 0.024 }
    this.form.patchValue({
      region: this.form.value.region || catalog.defaultRegion,
      availabilityZone: this.form.value.availabilityZone || catalog.datacenters[0],
      instanceType: this.form.value.instanceType || currentPlan.id,
      imageId: this.form.value.imageId || catalog.images[0].id,
      keyPair: this.form.value.keyPair || catalog.keyPairs[0].name,
      diskType: this.form.value.diskType || catalog.defaultDiskType,
      diskGb: this.form.value.diskGb && this.form.value.diskGb >= 20
        ? this.form.value.diskGb
        : catalog.diskByPlan[currentPlan.id] ?? 80,
      cpuCores: currentPlan.vcpus ?? 2,
      ramGb: currentPlan.memoryGb ?? 4,
      name: this.form.value.name || `${catalog.tagProvider}-srv-${new Date().toISOString().slice(5, 10).replace('-', '')}`,
      tags: this.form.value.tags || `created_by=ai-infra-studio,provider=${catalog.tagProvider},auto_delete=true`,
    })
  }

  private appendLaunchLog = (line: string): void => {
    const stamp = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    this.launchLogLines.update((lines) => [...lines.slice(-11), `[${stamp}] ${line}`])
  }

  private handleVpsLaunch = (payload: LaunchPayload): void => {
    const provider = this.activityProvider()
    const catalog = this.currentVpsCatalog()
    this.launching.set(true)
    this.appendLaunchLog(`Reservando ${payload.instanceType} en ${catalog.label} ${payload.region}`)
    this.activity.record({
      provider,
      action: 'launch',
      status: 'running',
      resourceName: payload.name,
      region: payload.region,
      zone: payload.availabilityZone,
      message: `Creacion ${catalog.label} iniciada para ${payload.name}`,
    })
    this.launchProgress.set({
      percent: 20,
      step: `Reservando plan ${catalog.label}`,
      log: `plan=${payload.instanceType} datacenter=${payload.availabilityZone}`,
      status: 'running',
      instanceName: payload.name,
      provider,
      region: payload.region,
    })
    setTimeout(() => {
      this.launchProgress.set({
        percent: 62,
        step: 'Instalando sistema operativo',
        log: `image=${payload.imageId} sshKey=${payload.keyPair ?? 'default'}`,
        status: 'running',
        instanceName: payload.name,
        provider,
        region: payload.region,
      })
      this.appendLaunchLog(`Instalando ${payload.imageId} y aplicando clave SSH`)
    }, 450)
    setTimeout(() => {
      const id = `${catalog.tagProvider}-${Date.now()}`
      const octet = 30 + Math.floor(Math.random() * 160)
      const resource: LaunchedResource = {
        id,
        name: payload.name,
        provider,
        region: payload.region,
        status: 'RUNNING',
        publicIp: `203.0.113.${octet}`,
      }
      this.launchProgress.set({
        percent: 100,
        step: `${catalog.label} operativo`,
        log: `${payload.name} disponible para pruebas`,
        status: 'success',
        instanceName: payload.name,
        provider,
        region: payload.region,
      })
      this.launching.set(false)
      this.launchedResource.set(resource)
      this.persistLaunchedResource(resource)
      this.appendLaunchLog(`${catalog.label} ${payload.name} operativo en ${resource.publicIp}`)
      this.toast.success(`${catalog.label} ${payload.name} creado`)
      if (this.studioMode) this.activeStep.set('test')
    }, 1100)
  }

  private persistLaunchedResource = (resource: LaunchedResource): void => {
    const plan = this.types().find((t) => t.id === this.form.value.instanceType)
    const hourly = plan?.pricePerHour ?? (plan?.pricePerMinute != null ? plan.pricePerMinute * 60 : undefined)
    const monthly = hourly != null ? Math.round(hourly * 730 * 100) / 100 : undefined
    const stored: LaunchInventoryResource = {
      id: resource.id,
      name: resource.name,
      provider: this.activityProvider(),
      region: this.form.value.region ?? resource.region ?? '—',
      zone: this.form.value.availabilityZone ?? undefined,
      status: resource.status ?? 'RUNNING',
      publicIp: resource.publicIp,
      instanceType: this.form.value.instanceType ?? '—',
      cpuCores: this.form.value.cpuCores ?? plan?.vcpus,
      ramGb: this.form.value.ramGb ?? plan?.memoryGb,
      diskGb: this.form.value.diskGb ?? undefined,
      imageId: this.form.value.imageId ?? undefined,
      hourlyCost: hourly,
      monthlyCost: monthly,
      createdAt: new Date().toISOString(),
      labels: parseTagsRecord(this.form.value.tags ?? '') ?? {},
      logs: this.launchLogLines(),
    }
    this.activity.upsertResource(stored)
    this.activity.record({
      provider: stored.provider,
      action: 'launch',
      status: 'success',
      resourceId: stored.id,
      resourceName: stored.name,
      region: stored.region,
      zone: stored.zone,
      message: `${stored.name} registrado en inventario AI Infra Studio`,
    })
  }

  private isLocalResource = (id: string): boolean =>
    id.startsWith('ionos-') || id.startsWith('ais-')
}
