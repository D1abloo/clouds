import type { CloudProvider, Instance } from '../../core/models/api.models'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export type CloudSection = 'overview' | 'accounts' | 'instances' | 'network' | 'billing' | 'metrics'
export type CloudSlug = 'aws' | 'gcp' | 'azure'

export interface CloudSectionTab {
  id: CloudSection
  label: string
  icon: string
  route: string
}

export interface CloudProviderUiConfig {
  slug: CloudSlug
  provider: CloudProvider
  logo: NavLogoKey
  title: string
  subtitle: string
  accent: string
  accentSoft: string
  accountsLabel: string
  instancesLabel: string
  networkTitle: string
  sgLabel: string
  lbLabel: string
  billingCurrency: string
}

export interface CloudAccountRow {
  id: string
  name: string
  accountId: string
  orgUnit: string
  environment: string
  regions: number
  instances: number
  monthlyCost: number
  status: string
  syncStatus: string
  lastSync: string
  hasCredentials: boolean
  contact: string
  tags: string[]
  primaryRegion?: string
  iamRoles?: number
  policies?: number
  savingsPlan?: string
  credentialExpires?: string
  billingExport?: string
  reservedInstances?: number
}

export interface CloudComputeRow {
  id: string
  name: string
  resourceId: string
  account: string
  region: string
  zone: string
  instanceType: string
  status: string
  publicIp: string
  privateIp: string
  network: string
  cpu: number
  ram: number
  disk: number
  monthlyCost: number
  os: string
  launchTime: string
  health: 'healthy' | 'warning' | 'critical'
  vcpus?: number
  memoryGb?: number
  storageGb?: number
  uptime?: string
  autoScaling?: boolean
  monitoring?: boolean
  tags?: string[]
  securityGroups?: string[]
  amiId?: string
  keyName?: string
  tenancy?: string
  iamRole?: string
  elasticIp?: string
  volumeType?: string
  volumeIops?: number
  networkInterfaceId?: string
  patchLevel?: string
  lastReboot?: string
  spotInstance?: boolean
  placementGroup?: string
  hypervisor?: string
  architecture?: string
  ebsOptimized?: boolean
  cloudWatchAgent?: boolean
  recentEvents?: { time: string; event: string; severity: 'info' | 'warning' | 'critical' }[]
  volumes?: CloudComputeVolume[]
  securityGroupDetails?: CloudComputeSecurityGroupDetail[]
  alarms?: CloudComputeAlarm[]
  statusChecks?: CloudComputeStatusCheck[]
  cpuHistory?: number[]
  ramHistory?: number[]
  diskHistory?: number[]
  networkHistory?: number[]
  subnetId?: string
  subnetName?: string
  subnetCidr?: string
  autoScalingGroup?: string
  loadBalancer?: string
  targetGroup?: string
  hourlyCost?: number
  complianceScore?: number
  backupPolicy?: string
  lastSnapshot?: string
  virtualizationType?: string
  sourceDestCheck?: boolean
  metadataOptions?: string
}

export interface CloudComputeVolume {
  id: string
  name: string
  sizeGb: number
  type: string
  iops: number
  throughput?: number
  encrypted: boolean
  attached: string
  device: string
  status: string
}

export interface CloudComputeSecurityGroupDetail {
  id: string
  name: string
  description: string
  inbound: number
  outbound: number
  risk: 'low' | 'medium' | 'high'
  rules: string[]
}

export interface CloudComputeAlarm {
  id: string
  name: string
  metric: string
  threshold: string
  state: 'OK' | 'ALARM' | 'INSUFFICIENT_DATA'
  since: string
}

export interface CloudComputeStatusCheck {
  id: string
  label: string
  status: 'passed' | 'failed' | 'initializing'
  detail: string
}

export interface CloudSubnetDetail {
  id: string
  name: string
  cidr: string
  zone: string
  type: 'public' | 'private' | 'isolated'
  availableIps: number
  instances: number
  routeTable: string
  mapPublicIp?: boolean
}

export interface CloudRouteTableDetail {
  id: string
  name: string
  routes: number
  associations: number
  main: boolean
  defaultRoute: string
}

export interface CloudGatewayDetail {
  id: string
  name: string
  type: string
  status: string
  attached: string
}

export interface CloudPeeringDetail {
  id: string
  name: string
  peerNetwork: string
  peerCidr: string
  status: string
}

export interface CloudNetworkRow {
  id: string
  name: string
  cidr: string
  region: string
  subnets: number
  instances: number
  publicAccess: boolean
  gateways: number
  status: string
  dnsEnabled?: boolean
  flowLogs?: boolean
  peerings?: number
  natGateways?: number
  routeTables?: number
  availabilityZones?: number
  tenancy?: string
  account?: string
  ipv6Cidr?: string
  dhcpOptions?: string
  isDefault?: boolean
  tags?: string[]
  dnsHostnames?: boolean
  dnsResolution?: boolean
  vpcEndpoints?: number
  networkAcls?: number
  subnetDetails?: CloudSubnetDetail[]
  routeTableDetails?: CloudRouteTableDetail[]
  gatewayDetails?: CloudGatewayDetail[]
  peeringDetails?: CloudPeeringDetail[]
}

export interface CloudSecurityRow {
  name: string
  id: string
  network: string
  inbound: number
  outbound: number
  attached: number
  risk: 'low' | 'medium' | 'high'
  description?: string
  lastAudit?: string
  vpcLink?: string
}

export interface CloudLbRow {
  name: string
  type: string
  scheme: string
  region: string
  targets: number
  healthy: number
  status: string
  dnsName?: string
  requestsPerSec?: number
  listenerPorts?: string
  sslCert?: string
  idleTimeout?: string
}

export interface CloudBillingLineItem {
  id: string
  description: string
  region: string
  quantity: string
  unitPrice: number
  amount: number
  usageType?: string
  resourceId?: string
  chargeCategory?: string
}

export interface CloudBillingRow {
  service: string
  cost: number
  share: number
  trend: number
  icon: string
  description?: string
  sku?: string
  id?: string
  invoiceId?: string
  period?: string
  lineItems?: CloudBillingLineItem[]
  subtotal?: number
  credits?: number
  tax?: number
  total?: number
  invoiceStatus?: 'paid' | 'pending' | 'open'
  issuedAt?: string
  dueAt?: string
  accountName?: string
  billingContact?: string
  paymentMethod?: string
  costCenter?: string
  linkedAccount?: string
  currency?: string
  notes?: string
  discount?: number
}

export interface CloudMetricCard {
  id: string
  label: string
  value: string
  unit: string
  avg: number
  peak: number
  color: string
  points: number[]
  description?: string
  threshold?: number
  status?: 'ok' | 'warning' | 'critical'
  p95?: number
  source?: string
}

export interface CloudActivity {
  time: string
  event: string
  severity: 'info' | 'warning' | 'critical'
  resource: string
  actor?: string
  region?: string
  account?: string
}

export interface CloudOverviewSummary {
  complianceScore: number
  uptimePercent: number
  openIncidents: number
  monitoringCoverage: number
  costVariance: number
  lastAudit: string
  managedResources: number
  backupCoverage: number
}

export interface CloudBillingSummary {
  budget: number
  credits: number
  previousMonth: number
  dailyAverage: number
  topAccount: string
  anomalies: number
  reservedSavings: number
  invoiceDate: string
}

export type CloudBillingPeriod = 'day' | 'week' | 'month' | 'year'

export interface CloudBillingPeriodBucket {
  label: string
  amount: number
}

export interface CloudBillingPeriodView {
  total: number
  previous: number
  average: number
  forecast?: number
  buckets: CloudBillingPeriodBucket[]
  topServices: { name: string; amount: number; share: number }[]
  label: string
  comparisonLabel: string
}

export interface CloudBillingTrends {
  day: CloudBillingPeriodView
  week: CloudBillingPeriodView
  month: CloudBillingPeriodView
  year: CloudBillingPeriodView
}

export interface CloudNetworkSummary {
  totalSubnets: number
  totalSgRules: number
  publicExposure: number
  peeringCount: number
  natGateways: number
  dnsZones: number
}

export interface CloudComputeSummary {
  healthy: number
  warning: number
  critical: number
  totalVcpus: number
  totalMemoryGb: number
  avgUptime: string
  spotInstances: number
  onDemandCost: number
}

export interface CloudAlertItem {
  id: string
  title: string
  severity: 'info' | 'warning' | 'critical'
  source: string
  since: string
  region: string
}

export interface CloudRegionRow {
  code: string
  name: string
  instances: number
  cost: number
  zones?: number
  utilization?: number
  latencyMs?: number
}

export interface CloudSnapshot {
  accounts: number
  instances: number
  running: number
  stopped: number
  regions: number
  networkCount: number
  monthlyCost: number
  forecast: number
  alerts: number
  avgCpu: number
  avgRam: number
  lastSync: string
  accountRows: CloudAccountRow[]
  computeRows: CloudComputeRow[]
  networkList: CloudNetworkRow[]
  securityGroups: CloudSecurityRow[]
  loadBalancers: CloudLbRow[]
  billingByService: CloudBillingRow[]
  billingByRegion: { region: string; cost: number; share: number }[]
  metrics: CloudMetricCard[]
  activity: CloudActivity[]
  regionList: CloudRegionRow[]
  overview: CloudOverviewSummary
  billingSummary: CloudBillingSummary
  networkSummary: CloudNetworkSummary
  computeSummary: CloudComputeSummary
  alertItems: CloudAlertItem[]
  billingTrends: CloudBillingTrends
}

export const CLOUD_PROVIDER_CONFIGS: Record<CloudSlug, CloudProviderUiConfig> = {
  aws: {
    slug: 'aws',
    provider: 'AWS',
    logo: 'aws',
    title: 'Amazon Web Services',
    subtitle: 'Plano de control AWS · Organizations, EC2, VPC, CUR y CloudWatch',
    accent: '#ff9900',
    accentSoft: '#c2410c',
    accountsLabel: 'Cuentas',
    instancesLabel: 'EC2',
    networkTitle: 'VPCs',
    sgLabel: 'Security Groups',
    lbLabel: 'Load Balancers',
    billingCurrency: 'USD',
  },
  gcp: {
    slug: 'gcp',
    provider: 'GCP',
    logo: 'gcp',
    title: 'Google Cloud Platform',
    subtitle: 'Plano de control GCP · proyectos, Compute Engine, VPC, Billing y Monitoring',
    accent: '#4285f4',
    accentSoft: '#1d4ed8',
    accountsLabel: 'Proyectos',
    instancesLabel: 'Compute',
    networkTitle: 'VPC Networks',
    sgLabel: 'Firewall rules',
    lbLabel: 'Cloud Load Balancing',
    billingCurrency: 'USD',
  },
  azure: {
    slug: 'azure',
    provider: 'AZURE',
    logo: 'azure',
    title: 'Microsoft Azure',
    subtitle: 'Plano de control Azure · suscripciones, VMs, VNet, Cost Management y Monitor',
    accent: '#0078d4',
    accentSoft: '#0369a1',
    accountsLabel: 'Suscripciones',
    instancesLabel: 'Máquinas virtuales',
    networkTitle: 'VNets',
    sgLabel: 'Network Security Groups',
    lbLabel: 'Application Gateway',
    billingCurrency: 'USD',
  },
}

export const cloudSectionsFor = (slug: CloudSlug): CloudSectionTab[] => {
  const cfg = CLOUD_PROVIDER_CONFIGS[slug]
  const base = `/cloud/${slug}`
  return [
    { id: 'overview', label: 'Resumen', icon: 'space_dashboard', route: `${base}/overview` },
    { id: 'accounts', label: cfg.accountsLabel, icon: 'corporate_fare', route: `${base}/accounts` },
    { id: 'instances', label: cfg.instancesLabel, icon: 'dns', route: `${base}/instances` },
    { id: 'network', label: 'Red', icon: 'device_hub', route: `${base}/network` },
    { id: 'billing', label: 'Facturación', icon: 'account_balance_wallet', route: `${base}/billing` },
    { id: 'metrics', label: 'Métricas', icon: 'show_chart', route: `${base}/metrics` },
  ]
}

const fmtTime = (minsAgo: number): string =>
  new Date(Date.now() - minsAgo * 60_000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

const genPoints = (seed: number, end: number, n = 12): number[] => {
  const pts: number[] = []
  for (let i = 0; i < n; i++) {
    const wave = Math.sin((i + seed) * 0.7) * 12
    pts.push(Math.max(4, Math.min(98, Math.round(end + wave + ((seed * (i + 1)) % 9) - 4))))
  }
  pts[n - 1] = end
  return pts
}

const slugFromProvider = (p: CloudProvider): CloudSlug =>
  p === 'GCP' ? 'gcp' : p === 'AZURE' ? 'azure' : 'aws'

export const cloudSlugFromParam = (slug: string | null): CloudSlug => {
  if (slug === 'gcp' || slug === 'azure') return slug
  return 'aws'
}

export const cloudSectionFromSlug = (slug: string | null): CloudSection => {
  const map: Record<string, CloudSection> = {
    overview: 'overview',
    accounts: 'accounts',
    instances: 'instances',
    network: 'network',
    billing: 'billing',
    metrics: 'metrics',
  }
  return map[slug ?? ''] ?? 'overview'
}

export const fmtUsd = (v: number): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

export const sparkPath = (points: number[], w = 120, h = 32): string => {
  const pad = 2
  return points
    .map((p, i) => {
      const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2)
      const y = pad + (1 - p / 100) * (h - pad * 2)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

const instanceToRow = (inst: Instance, idx: number, slug: CloudSlug): CloudComputeRow => {
  const region = inst.region ?? (slug === 'gcp' ? 'us-central1' : slug === 'azure' ? 'eastus' : 'us-east-1')
  const zoneSuffix = slug === 'gcp' ? ['-a', '-b', '-c'] : slug === 'azure' ? ['-1', '-2', '-3'] : ['a', 'b', 'c']
  const zone =
    slug === 'gcp'
      ? `${region}${zoneSuffix[idx % 3]}`
      : slug === 'azure'
        ? `${region}${zoneSuffix[idx % 3]}`
        : `${region}${zoneSuffix[idx % 3]}`

  const idPrefix = slug === 'gcp' ? 'gce-' : slug === 'azure' ? 'vm-' : 'i-0'
  return {
    id: inst.id,
    name: inst.name,
    resourceId: `${idPrefix}${inst.id.replace(/\D/g, '').slice(0, 8).padEnd(8, 'a')}`,
    account: inst.cloudAccountId ?? `${slug}-production`,
    region,
    zone,
    instanceType: inst.instanceType ?? (slug === 'gcp' ? 'n2-standard-4' : slug === 'azure' ? 'Standard_D4s_v3' : 't3.medium'),
    status: inst.status ?? 'RUNNING',
    publicIp: inst.publicIp ?? '—',
    privateIp: inst.privateIp ?? '10.0.1.10',
    network: slug === 'gcp' ? 'vpc-analytics-prod' : slug === 'azure' ? 'vnet-prod-main' : 'vpc-prod-main',
    cpu: 35 + (idx % 40),
    ram: 45 + (idx % 30),
    disk: 28 + (idx % 50),
    monthlyCost: inst.monthlyCost ?? 85,
    os: inst.os ?? 'Ubuntu 22.04 LTS',
    launchTime: '2024-03-12',
    health: inst.status === 'WARNING' ? 'warning' : inst.status === 'ERROR' ? 'critical' : 'healthy',
    vcpus: 2 + (idx % 4),
    memoryGb: 8 + (idx % 3) * 8,
    storageGb: 80 + idx * 15,
    uptime: `99.${90 + (idx % 9)}%`,
    autoScaling: idx % 2 === 0,
    monitoring: true,
    tags: [`env:production`, `team:platform`],
    securityGroups: ['sg-default'],
  }
}

const getComputeProviderMeta = (slug: CloudSlug) => {
  if (slug === 'gcp') {
    return {
      monitorAgent: 'Ops Agent heartbeat OK',
      snapshotEvent: 'Snapshot Persistent Disk pd-root completado',
      alarmPrefix: 'gcp-mon',
      imageId: (idx: number) => `projects/ubuntu-os-cloud/global/images/ubuntu-2204-${8000 + idx}`,
      keyName: (idx: number) => `gcp-ops-${idx % 2 === 0 ? 'prod' : 'stg'}-key`,
      iamRole: (idx: number) => `gce-app-sa-${idx % 3}@gcp-production.iam`,
      nicPrefix: 'nic',
      volTypes: ['pd-balanced', 'pd-ssd'] as const,
      sgNames: ['fw-app-internal', 'fw-web-public'],
      lbName: 'lb-checkout-prod',
      asgPrefix: 'mig',
      hypervisor: 'KVM',
      metadata: 'Metadata server · block project SSH keys',
      device: '/dev/sda',
      placement: 'pg-app-cluster-01',
      virtualization: 'hvm',
    }
  }
  if (slug === 'azure') {
    return {
      monitorAgent: 'Azure Monitor agent heartbeat OK',
      snapshotEvent: 'Snapshot Managed Disk disk-root completado',
      alarmPrefix: 'az-mon',
      imageId: (idx: number) => `/subscriptions/.../images/WinServer2022-${8000 + idx}`,
      keyName: (idx: number) => `azure-ops-${idx % 2 === 0 ? 'prod' : 'stg'}-key`,
      iamRole: (idx: number) => `vm-app-identity-${idx % 3}`,
      nicPrefix: 'nic',
      volTypes: ['Premium_LRS', 'PremiumV2_LRS'] as const,
      sgNames: ['nsg-app-internal', 'nsg-web-public'],
      lbName: 'appgw-checkout-prod',
      asgPrefix: 'vmss',
      hypervisor: 'Hyper-V',
      metadata: 'IMDS · identity · Azure Instance Metadata',
      device: '/dev/sda1',
      placement: 'pg-app-cluster-01',
      virtualization: 'hvm',
    }
  }
  return {
    monitorAgent: 'CloudWatch agent heartbeat OK',
    snapshotEvent: 'Snapshot EBS vol-root completado',
    alarmPrefix: 'cw',
    imageId: (idx: number) => `ami-0${String(8000 + idx).padStart(4, '0')}f2a1b9c`,
    keyName: (idx: number) => `cloudops-${idx % 2 === 0 ? 'prod' : 'stg'}-key`,
    iamRole: (idx: number) => `ec2-app-role-${idx % 3}`,
    nicPrefix: 'eni',
    volTypes: ['gp3', 'io2'] as const,
    sgNames: ['sg-app-internal', 'sg-web-public'],
    lbName: 'alb-checkout-prod',
    asgPrefix: 'asg',
    hypervisor: 'xen',
    metadata: 'IMDSv2 required · hop limit 1',
    device: '/dev/xvda',
    placement: 'pg-app-cluster-01',
    virtualization: 'hvm',
  }
}

const enrichComputeRow = (row: CloudComputeRow, idx: number, slug: CloudSlug = 'aws'): CloudComputeRow => {
  const meta = getComputeProviderMeta(slug)
  const events = [
    { time: '14:32', event: 'Status check passed · system + instance', severity: 'info' as const },
    { time: '12:05', event: meta.monitorAgent, severity: 'info' as const },
    { time: '09:18', event: row.health === 'warning' ? `CPU threshold exceeded 85% · alarm ${meta.alarmPrefix}-high-cpu` : 'Patch compliance scan OK', severity: row.health === 'warning' ? ('warning' as const) : ('info' as const) },
    { time: '08:40', event: 'Startup script ejecutado sin errores', severity: 'info' as const },
    { time: 'Ayer 22:10', event: meta.snapshotEvent, severity: 'info' as const },
    { time: 'Ayer 18:00', event: row.status === 'STOPPED' ? 'Instancia detenida por schedule' : 'Registrada en target group healthy', severity: 'info' as const },
  ]
  const volPrefix = slug === 'gcp' ? 'pd-' : slug === 'azure' ? 'disk-' : 'vol-'
  const sgPrefix = slug === 'gcp' ? 'fw-' : slug === 'azure' ? 'nsg-' : 'sg-'
  const hourly = Math.round((row.monthlyCost / 720) * 100) / 100
  const volType = row.volumeType ?? meta.volTypes[idx % 2 === 0 ? 0 : 1]
  return {
    ...row,
    vcpus: row.vcpus ?? [2, 4, 8][idx % 3],
    memoryGb: row.memoryGb ?? [8, 16, 32][idx % 3],
    storageGb: row.storageGb ?? 80 + idx * 20,
    uptime: row.uptime ?? `99.${90 + (idx % 9)}%`,
    autoScaling: row.autoScaling ?? idx % 2 === 0,
    monitoring: row.monitoring ?? true,
    tags: row.tags ?? [`env:${idx < 4 ? 'production' : 'staging'}`, `tier:app`, `owner:platform`, `cost-center:eng`],
    securityGroups: row.securityGroups ?? meta.sgNames.slice(0, idx % 2 === 0 ? 2 : 1),
    amiId: row.amiId ?? meta.imageId(idx),
    keyName: row.keyName ?? meta.keyName(idx),
    tenancy: row.tenancy ?? (idx % 5 === 0 ? 'dedicated' : 'default'),
    iamRole: row.iamRole ?? meta.iamRole(idx),
    elasticIp: row.elasticIp ?? (row.publicIp !== '—' ? row.publicIp : '—'),
    volumeType: volType,
    volumeIops: row.volumeIops ?? (idx % 2 === 0 ? 3000 : 12000),
    networkInterfaceId: row.networkInterfaceId ?? `${meta.nicPrefix}-0${String(idx).padStart(8, '0')}abc`,
    patchLevel: row.patchLevel ?? '2026-05-28',
    lastReboot: row.lastReboot ?? (idx % 3 === 0 ? '2026-05-20 03:00 UTC' : 'Sin reinicio reciente'),
    spotInstance: row.spotInstance ?? idx % 5 === 0,
    placementGroup: row.placementGroup ?? (idx % 4 === 0 ? meta.placement : '—'),
    hypervisor: row.hypervisor ?? meta.hypervisor,
    architecture: row.architecture ?? 'x86_64',
    ebsOptimized: row.ebsOptimized ?? true,
    cloudWatchAgent: row.cloudWatchAgent ?? true,
    recentEvents: row.recentEvents ?? events,
    cpuHistory: row.cpuHistory ?? genPoints(idx + 1, row.cpu),
    ramHistory: row.ramHistory ?? genPoints(idx + 2, row.ram),
    diskHistory: row.diskHistory ?? genPoints(idx + 3, row.disk),
    networkHistory: row.networkHistory ?? genPoints(idx + 4, 35 + idx * 3),
    subnetId: row.subnetId ?? `subnet-${row.network.split('-').pop() ?? 'main'}-${['a', 'b'][idx % 2]}`,
    subnetName: row.subnetName ?? `${row.network}-private-${['a', 'b'][idx % 2]}`,
    subnetCidr: row.subnetCidr ?? `10.${idx + 1}.0.0/24`,
    autoScalingGroup: row.autoScalingGroup ?? (row.autoScaling ? `${meta.asgPrefix}-${row.name.split('-').slice(0, 2).join('-')}-prod` : '—'),
    loadBalancer: row.loadBalancer ?? (idx % 3 !== 2 ? meta.lbName : '—'),
    targetGroup: row.targetGroup ?? (idx % 3 !== 2 ? `tg-${row.name}-443` : '—'),
    hourlyCost: row.hourlyCost ?? hourly,
    complianceScore: row.complianceScore ?? (row.health === 'critical' ? 72 : row.health === 'warning' ? 86 : 96),
    backupPolicy: row.backupPolicy ?? 'Daily · retención 14d · cross-region',
    lastSnapshot: row.lastSnapshot ?? '2026-06-01 04:00 UTC',
    virtualizationType: row.virtualizationType ?? meta.virtualization,
    sourceDestCheck: row.sourceDestCheck ?? true,
    metadataOptions: row.metadataOptions ?? meta.metadata,
    volumes: row.volumes ?? [
      {
        id: `${volPrefix}0${String(idx).padStart(6, '0')}root`,
        name: 'vol-root',
        sizeGb: row.storageGb ?? 80 + idx * 20,
        type: volType,
        iops: row.volumeIops ?? 3000,
        throughput: 125,
        encrypted: true,
        attached: row.resourceId,
        device: meta.device,
        status: 'in-use',
      },
      ...(idx % 2 === 0
        ? [{
            id: `${volPrefix}0${String(idx).padStart(6, '0')}data`,
            name: 'vol-data',
            sizeGb: 200 + idx * 50,
            type: volType,
            iops: 6000,
            throughput: 250,
            encrypted: true,
            attached: row.resourceId,
            device: slug === 'azure' ? '/dev/sdb1' : slug === 'gcp' ? '/dev/sdb' : '/dev/xvdf',
            status: 'in-use',
          }]
        : []),
    ],
    securityGroupDetails: row.securityGroupDetails ?? [
      {
        id: `${sgPrefix}0abc${idx}`,
        name: meta.sgNames[0],
        description: 'Tráfico interno entre servicios de aplicación',
        inbound: 8,
        outbound: 3,
        risk: 'low',
        rules: [`TCP 443 ← ${meta.sgNames[1]}`, 'TCP 8080 ← 10.0.0.0/16', `ICMP ← ${row.network}`],
      },
      ...(idx % 2 === 0
        ? [{
            id: `${sgPrefix}0def${idx}`,
            name: meta.sgNames[1],
            description: 'Acceso HTTPS desde Internet vía load balancer',
            inbound: 4,
            outbound: 2,
            risk: 'medium' as const,
            rules: ['TCP 443 ← 0.0.0.0/0', 'TCP 80 ← 0.0.0.0/0 (redirect)'],
          }]
        : []),
    ],
    alarms: row.alarms ?? [
      {
        id: `${meta.alarmPrefix}-${idx}-cpu`,
        name: 'HighCPUUtilization',
        metric: 'CPUUtilization',
        threshold: '> 85% · 5 min',
        state: row.health === 'warning' ? 'ALARM' : 'OK',
        since: row.health === 'warning' ? '09:18 hoy' : '14 días OK',
      },
      {
        id: `${meta.alarmPrefix}-${idx}-status`,
        name: 'StatusCheckFailed',
        metric: 'StatusCheckFailed',
        threshold: '>= 1',
        state: row.health === 'critical' ? 'ALARM' : 'OK',
        since: '30 días OK',
      },
      {
        id: `${meta.alarmPrefix}-${idx}-disk`,
        name: 'DiskQueueDepth',
        metric: 'DiskQueueDepth',
        threshold: '> 10',
        state: 'OK',
        since: '7 días OK',
      },
    ],
    statusChecks: row.statusChecks ?? [
      { id: 'system', label: 'System status check', status: row.health === 'critical' ? 'failed' : 'passed', detail: row.health === 'critical' ? 'Hardware failure detectado' : 'Reachability OK' },
      { id: 'instance', label: 'Instance status check', status: row.health === 'warning' ? 'failed' : 'passed', detail: row.health === 'warning' ? 'Aplicación no responde en puerto 443' : 'Aplicación respondiendo' },
    ],
  }
}

const zoneForNetwork = (slug: CloudSlug, region: string, i: number): string => {
  const sfx = ['a', 'b', 'c'][i % 3]
  if (slug === 'gcp') return `${region}-${sfx}`
  if (slug === 'azure') return `${region}-${(i % 3) + 1}`
  return `${region}${sfx}`
}

const subnetCidrFromBase = (base: string, i: number): string => {
  const [ip] = base.split('/')
  const octets = ip.split('.').map(Number)
  return `${octets[0]}.${octets[1]}.${i + 1}.0/24`
}

const buildSubnetDetails = (vpc: CloudNetworkRow, idx: number, slug: CloudSlug): CloudSubnetDetail[] =>
  Array.from({ length: vpc.subnets }, (_, i) => {
    const isPublic = vpc.publicAccess && i % 2 === 0
    const type: CloudSubnetDetail['type'] = !vpc.publicAccess ? 'private' : isPublic ? 'public' : 'private'
    return {
      id: `${vpc.id}-subnet-${i}`,
      name: `${vpc.name}-${type === 'public' ? 'public' : 'private'}-${['a', 'b', 'c'][i % 3]}`,
      cidr: subnetCidrFromBase(vpc.cidr, i),
      zone: zoneForNetwork(slug, vpc.region, i),
      type,
      availableIps: 251 - i * 12,
      instances: Math.max(1, Math.floor(vpc.instances / Math.max(vpc.subnets, 1))),
      routeTable: type === 'public' ? `rtb-${vpc.name}-public` : `rtb-${vpc.name}-private`,
      mapPublicIp: type === 'public',
    }
  })

const buildRouteTables = (vpc: CloudNetworkRow, slug: CloudSlug): CloudRouteTableDetail[] => {
  const gw =
    slug === 'gcp' ? 'default-internet-gateway' : slug === 'azure' ? '0.0.0.0/0 → Azure Firewall' : '0.0.0.0/0 → igw'
  const natRoute =
    slug === 'gcp' ? '0.0.0.0/0 → Cloud NAT' : slug === 'azure' ? '0.0.0.0/0 → NAT Gateway' : '0.0.0.0/0 → nat-gw'
  return [
    {
      id: `rtb-${vpc.id}-main`,
      name: `${vpc.name}-main`,
      routes: 4 + (vpc.peerings ?? 0),
      associations: vpc.subnets,
      main: true,
      defaultRoute: vpc.publicAccess ? gw : 'local',
    },
    {
      id: `rtb-${vpc.id}-private`,
      name: `${vpc.name}-private`,
      routes: 3,
      associations: Math.max(1, Math.floor(vpc.subnets / 2)),
      main: false,
      defaultRoute: natRoute,
    },
  ]
}

const buildGateways = (vpc: CloudNetworkRow, slug: CloudSlug): CloudGatewayDetail[] => {
  const items: CloudGatewayDetail[] = []
  if (vpc.publicAccess) {
    items.push({
      id: `gw-${vpc.id}-igw`,
      name: slug === 'gcp' ? 'internet-gateway' : slug === 'azure' ? 'vnet-internet' : `${vpc.name}-igw`,
      type: slug === 'gcp' ? 'Cloud Router' : slug === 'azure' ? 'Internet' : 'Internet Gateway',
      status: 'attached',
      attached: vpc.id,
    })
  }
  if ((vpc.natGateways ?? 0) > 0) {
    items.push({
      id: `gw-${vpc.id}-nat`,
      name: `${vpc.name}-nat`,
      type: slug === 'gcp' ? 'Cloud NAT' : slug === 'azure' ? 'NAT Gateway' : 'NAT Gateway',
      status: 'available',
      attached: vpc.subnetDetails?.find((s) => s.type === 'public')?.name ?? vpc.name,
    })
  }
  return items
}

const buildPeerings = (vpc: CloudNetworkRow, idx: number): CloudPeeringDetail[] => {
  if (!vpc.peerings || vpc.peerings === 0) return []
  return Array.from({ length: vpc.peerings }, (_, i) => ({
    id: `peer-${vpc.id}-${i}`,
    name: `pcx-${vpc.name}-${i + 1}`,
    peerNetwork: i === 0 ? 'vpc-shared-services' : 'vpc-data-lake',
    peerCidr: i === 0 ? '10.100.0.0/16' : '10.130.0.0/16',
    status: 'active',
  }))
}

const enrichNetworkRow = (row: CloudNetworkRow, idx: number, slug: CloudSlug): CloudNetworkRow => {
  const base: CloudNetworkRow = {
    ...row,
    dnsEnabled: row.dnsEnabled ?? true,
    flowLogs: row.flowLogs ?? idx === 0,
    peerings: row.peerings ?? idx,
    natGateways: row.natGateways ?? (row.publicAccess ? 1 : 0),
    routeTables: row.routeTables ?? row.subnets + 1,
    availabilityZones: row.availabilityZones ?? 3,
    tenancy: row.tenancy ?? 'default',
    account: row.account ?? (slug === 'aws' ? 'aws-production' : slug === 'gcp' ? 'gcp-production' : 'azure-production'),
    ipv6Cidr: row.ipv6Cidr ?? (idx === 0 ? '2600:1f18:...::/56' : undefined),
    dhcpOptions: row.dhcpOptions ?? (slug === 'aws' ? 'dopt-default · domain-name: ec2.internal' : slug === 'gcp' ? 'default · domain: c.internal' : 'default · domain: cloudapp.azure.com'),
    isDefault: row.isDefault ?? false,
    tags: row.tags ?? [`env:${idx === 0 ? 'production' : 'staging'}`, `network:${row.name}`],
    dnsHostnames: row.dnsHostnames ?? true,
    dnsResolution: row.dnsResolution ?? true,
    vpcEndpoints: row.vpcEndpoints ?? (idx === 0 ? 4 : 1),
    networkAcls: row.networkAcls ?? row.subnets,
  }
  const subnetDetails = row.subnetDetails ?? buildSubnetDetails(base, idx, slug)
  return {
    ...base,
    subnetDetails,
    routeTableDetails: row.routeTableDetails ?? buildRouteTables(base, slug),
    gatewayDetails: row.gatewayDetails ?? buildGateways({ ...base, subnetDetails }, slug),
    peeringDetails: row.peeringDetails ?? buildPeerings(base, idx),
  }
}

const enrichSecurityRow = (row: CloudSecurityRow): CloudSecurityRow => ({
  ...row,
  description: row.description ?? `${row.inbound} reglas entrantes · ${row.outbound} salientes`,
  lastAudit: row.lastAudit ?? fmtTime(60 + row.inbound * 10),
  vpcLink: row.vpcLink ?? row.network,
})

const enrichLbRow = (row: CloudLbRow): CloudLbRow => ({
  ...row,
  dnsName: row.dnsName ?? `${row.name}.${row.region}.cloud.local`,
  requestsPerSec: row.requestsPerSec ?? row.targets * 120,
  listenerPorts: row.listenerPorts ?? '443, 80',
  sslCert: row.sslCert ?? 'ACM · válido 180d',
  idleTimeout: row.idleTimeout ?? '60s',
})

const buildBillingTrends = (
  monthlyCost: number,
  forecast: number,
  previousMonth: number,
  dailyAverage: number,
  services: CloudBillingRow[],
): CloudBillingTrends => {
  const top = services.slice(0, 4).map((s) => ({
    name: s.service,
    amount: s.total ?? s.cost,
    share: s.share,
  }))

  const dayHours = Array.from({ length: 24 }, (_, h) => {
    const wave = Math.sin((h - 6) * 0.45) * 0.35 + 0.65
    const amount = Math.round((dailyAverage / 24) * wave * (h >= 8 && h <= 22 ? 1.4 : 0.6))
    return { label: `${String(h).padStart(2, '0')}h`, amount }
  })
  const dayTotal = dayHours.reduce((s, b) => s + b.amount, 0)

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const weekBuckets = weekDays.map((label, i) => ({
    label,
    amount: Math.round(dailyAverage * (i < 5 ? 1.05 + i * 0.02 : 0.72)),
  }))
  const weekTotal = weekBuckets.reduce((s, b) => s + b.amount, 0)

  const monthWeeks = ['S1', 'S2', 'S3', 'S4']
  const monthBuckets = monthWeeks.map((label, i) => ({
    label,
    amount: Math.round(monthlyCost * [0.22, 0.26, 0.28, 0.24][i]),
  }))

  const yearMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const yearBase = monthlyCost * 12 * 0.92
  const yearBuckets = yearMonths.map((label, i) => ({
    label,
    amount: Math.round(yearBase / 12 * (0.85 + Math.sin(i * 0.8) * 0.15 + i * 0.01)),
  }))
  const yearTotal = yearBuckets.reduce((s, b) => s + b.amount, 0)

  return {
    day: {
      total: dayTotal,
      previous: Math.round(dayTotal * 0.94),
      average: Math.round(dayTotal / 24),
      buckets: dayHours.filter((_, i) => i % 3 === 0),
      topServices: top.map((s) => ({ ...s, amount: Math.round(s.amount / 30) })),
      label: 'Hoy',
      comparisonLabel: 'vs ayer',
    },
    week: {
      total: weekTotal,
      previous: Math.round(weekTotal * 0.97),
      average: Math.round(weekTotal / 7),
      buckets: weekBuckets,
      topServices: top.map((s) => ({ ...s, amount: Math.round(s.amount / 4) })),
      label: 'Esta semana',
      comparisonLabel: 'vs semana anterior',
    },
    month: {
      total: monthlyCost,
      previous: previousMonth,
      average: dailyAverage,
      forecast,
      buckets: monthBuckets,
      topServices: top,
      label: 'Este mes',
      comparisonLabel: 'vs mes anterior',
    },
    year: {
      total: yearTotal,
      previous: Math.round(yearTotal * 0.91),
      average: Math.round(yearTotal / 12),
      forecast: Math.round(yearTotal * 1.06),
      buckets: yearBuckets,
      topServices: top.map((s) => ({ ...s, amount: s.amount * 12 })),
      label: 'Este año',
      comparisonLabel: 'vs año anterior',
    },
  }
}

const enrichBillingRow = (row: CloudBillingRow, idx: number, slug: CloudSlug): CloudBillingRow => {
  const regions =
    slug === 'gcp'
      ? ['us-central1', 'europe-west1', 'asia-southeast1']
      : slug === 'azure'
        ? ['eastus', 'westeurope', 'southeastasia']
        : ['us-east-1', 'eu-west-1', 'ap-southeast-1']
  const splits = [0.38, 0.22, 0.16, 0.12, 0.08, 0.04]
  const lineMeta = [
    { label: 'Uso compute / instancias On-Demand', category: 'Compute', usageType: slug === 'aws' ? 'BoxUsage:t3.medium' : slug === 'gcp' ? 'Compute Engine Core' : 'Virtual Machines', qty: '720 h', resourcePrefix: slug === 'aws' ? 'i-0' : slug === 'gcp' ? 'gce-' : 'vm-' },
    { label: 'Almacenamiento persistente', category: 'Storage', usageType: slug === 'aws' ? 'EBS:VolumeUsage.gp3' : slug === 'gcp' ? 'PD Capacity' : 'Managed Disks', qty: '2.400 GB-mo', resourcePrefix: slug === 'aws' ? 'vol-' : 'disk-' },
    { label: 'Transferencia de datos saliente', category: 'Networking', usageType: 'DataTransfer-Out-Bytes', qty: '186 GB', resourcePrefix: '—' },
    { label: 'Snapshots y backups', category: 'Storage', usageType: slug === 'aws' ? 'EBS:SnapshotUsage' : 'Snapshot Storage', qty: '840 GB-mo', resourcePrefix: 'snap-' },
    { label: 'Direcciones IP / endpoints', category: 'Networking', usageType: slug === 'aws' ? 'ElasticIP:Address' : 'Public IP', qty: '720 h', resourcePrefix: 'eip-' },
    { label: 'Otros cargos y ajustes', category: 'Other', usageType: 'Miscellaneous', qty: '—', resourcePrefix: '—' },
  ]
  const lineItems: CloudBillingLineItem[] =
    row.lineItems ??
    splits.map((pct, i) => {
      const meta = lineMeta[i]
      const amount = Math.round(row.cost * pct)
      const divisor = i === 0 ? 720 : i === 1 || i === 3 ? 2400 : i === 2 ? 186 : 1
      return {
        id: `${row.service}-line-${i}`,
        description: `${row.service} · ${meta.label}`,
        region: regions[i % regions.length],
        quantity: meta.qty,
        unitPrice: Math.max(0.01, Math.round((amount / Math.max(divisor, 1)) * 100) / 100),
        amount,
        usageType: meta.usageType,
        resourceId: meta.resourcePrefix === '—' ? '—' : `${meta.resourcePrefix}${String(idx + 1).padStart(4, '0')}${String(i + 1).padStart(2, '0')}`,
        chargeCategory: meta.category,
      }
    })
  const credits = idx === 0 ? Math.round(row.cost * 0.04) : idx === 1 ? Math.round(row.cost * 0.02) : 0
  const discount = idx < 2 ? Math.round(row.cost * 0.06) : 0
  const subtotal = row.cost
  const tax = Math.round((subtotal - discount - credits) * 0.0)
  const topAccount = SEEDS[slug].billingSummary.topAccount
  return {
    ...row,
    id: row.id ?? `bill-svc-${slug}-${idx}`,
    invoiceId: row.invoiceId ?? `INV-${slug.toUpperCase()}-202606-${String(idx + 1).padStart(3, '0')}`,
    period: row.period ?? 'Jun 2026 · MTD (01–02 Jun)',
    lineItems,
    subtotal,
    credits,
    discount,
    tax,
    total: subtotal - discount - credits + tax,
    description: row.description ?? `Factura consolidada de ${row.service} para la cuenta ${topAccount}. Incluye uso On-Demand, almacenamiento y transferencia de datos del periodo MTD.`,
    sku: row.sku ?? row.service.split(' ').pop()?.toLowerCase() ?? 'core',
    invoiceStatus: idx === 0 ? 'open' : idx === 1 ? 'pending' : 'paid',
    issuedAt: row.issuedAt ?? '2026-06-01',
    dueAt: row.dueAt ?? '2026-06-15',
    accountName: row.accountName ?? topAccount,
    billingContact: row.billingContact ?? 'cloud-billing@cloudops.io',
    paymentMethod: row.paymentMethod ?? (slug === 'aws' ? 'Tarjeta corporativa · **** 4821' : slug === 'gcp' ? 'Facturación consolidada GCP' : 'Azure EA · PO-88421'),
    costCenter: row.costCenter ?? 'platform-engineering',
    linkedAccount: row.linkedAccount ?? (slug === 'aws' ? '123456789012' : slug === 'gcp' ? 'gcp-prod-482910' : 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
    currency: row.currency ?? 'USD',
    notes: row.notes ?? 'Los importes reflejan el uso acumulado MTD. Los créditos RI/SP se aplican en la factura consolidada mensual.',
  }
}

const enrichMetric = (row: CloudMetricCard, slug: CloudSlug): CloudMetricCard => {
  const threshold = row.threshold ?? 85
  const val = parseFloat(row.value) || row.avg
  const status: CloudMetricCard['status'] =
    row.status ?? (val >= threshold ? 'critical' : val >= threshold * 0.85 ? 'warning' : 'ok')
  const source =
    slug === 'gcp' ? 'Cloud Monitoring' : slug === 'azure' ? 'Azure Monitor' : 'CloudWatch'
  return {
    ...row,
    description: row.description ?? 'Agregado multi-cuenta · ventana 6h',
    threshold,
    status,
    p95: row.p95 ?? Math.round(row.peak * 0.92),
    source: row.source ?? source,
  }
}

const enrichActivity = (row: CloudActivity): CloudActivity => ({
  ...row,
  actor: row.actor ?? 'system',
  region: row.region ?? 'global',
  account: row.account ?? '—',
})

const enrichRegion = (row: CloudRegionRow, idx: number): CloudRegionRow => ({
  ...row,
  zones: row.zones ?? 3,
  utilization: row.utilization ?? 45 + idx * 12,
  latencyMs: row.latencyMs ?? 18 + idx * 8,
})

const enrichAccount = (row: CloudAccountRow, idx: number, slug: CloudSlug): CloudAccountRow => {
  const primaryRegion =
    slug === 'gcp' ? 'us-central1' : slug === 'azure' ? 'eastus' : 'us-east-1'
  const billingExport =
    slug === 'gcp'
      ? 'BigQuery billing export · GCS'
      : slug === 'azure'
        ? 'Cost Management export · Storage'
        : 'CUR diario · S3'
  const savingsPlan =
    slug === 'gcp' ? 'CUD · 1y · $420/mes' : slug === 'azure' ? 'RI · 3y · $420/mes' : 'Compute SP · 1y · $420/mes'
  return {
    ...row,
    primaryRegion: row.primaryRegion ?? primaryRegion,
    iamRoles: row.iamRoles ?? 12 + idx * 4,
    policies: row.policies ?? 28 + idx * 6,
    savingsPlan: row.savingsPlan ?? (idx === 0 ? savingsPlan : '—'),
    credentialExpires: row.credentialExpires ?? '2026-09-15',
    billingExport: row.billingExport ?? billingExport,
    reservedInstances: row.reservedInstances ?? idx * 2,
  }
}

const OVERVIEW_BY_SLUG: Record<CloudSlug, CloudOverviewSummary> = {
  aws: { complianceScore: 94, uptimePercent: 99.92, openIncidents: 2, monitoringCoverage: 96, costVariance: 8, lastAudit: '2026-05-28', managedResources: 148, backupCoverage: 88 },
  gcp: { complianceScore: 94, uptimePercent: 99.92, openIncidents: 2, monitoringCoverage: 96, costVariance: 8, lastAudit: '2026-05-28', managedResources: 148, backupCoverage: 88 },
  azure: { complianceScore: 94, uptimePercent: 99.92, openIncidents: 2, monitoringCoverage: 96, costVariance: 8, lastAudit: '2026-05-28', managedResources: 148, backupCoverage: 88 },
}

const ALERTS_BY_SLUG: Record<CloudSlug, CloudAlertItem[]> = {
  aws: [
    { id: 'a1', title: 'CPU sostenida > 85% en api-gateway', severity: 'warning', source: 'CloudWatch', since: fmtTime(18), region: 'us-east-1' },
    { id: 'a2', title: 'SG sg-bastion expuesto a 0.0.0.0/0', severity: 'critical', source: 'Security Hub', since: fmtTime(90), region: 'eu-west-1' },
    { id: 'a3', title: 'Forecast supera presupuesto mensual', severity: 'warning', source: 'Cost Explorer', since: fmtTime(120), region: 'global' },
  ],
  gcp: [
    { id: 'g1', title: 'CPU sostenida > 85% en api-gateway', severity: 'warning', source: 'Cloud Monitoring', since: fmtTime(18), region: 'us-central1' },
    { id: 'g2', title: 'Firewall allow-ssh expuesto a Internet', severity: 'critical', source: 'Security Command Center', since: fmtTime(90), region: 'europe-west1' },
    { id: 'g3', title: 'Forecast supera presupuesto mensual', severity: 'warning', source: 'Billing', since: fmtTime(120), region: 'global' },
  ],
  azure: [
    { id: 'z1', title: 'CPU sostenida > 85% en api-gateway', severity: 'warning', source: 'Azure Monitor', since: fmtTime(18), region: 'eastus' },
    { id: 'z2', title: 'NSG permite RDP desde Internet', severity: 'critical', source: 'Defender for Cloud', since: fmtTime(90), region: 'westeurope' },
    { id: 'z3', title: 'Forecast supera presupuesto mensual', severity: 'warning', source: 'Cost Management', since: fmtTime(120), region: 'global' },
  ],
}

type SeedBundle = Pick<
  CloudSnapshot,
  | 'accountRows'
  | 'computeRows'
  | 'networkList'
  | 'securityGroups'
  | 'loadBalancers'
  | 'billingByService'
  | 'metrics'
  | 'activity'
  | 'regionList'
  | 'billingSummary'
>

const AWS_SEED: SeedBundle = {
  accountRows: [
    { id: 'acc-aws-prod', name: 'aws-production', accountId: '123456789012', orgUnit: 'Production', environment: 'Producción', regions: 4, instances: 28, monthlyCost: 1240, status: 'active', syncStatus: 'synced', lastSync: fmtTime(8), hasCredentials: true, contact: 'cloud-admin@cloudops.io', tags: ['env:production', 'cost-center:platform'], primaryRegion: 'us-east-1', iamRoles: 24, policies: 48, savingsPlan: 'Compute SP · 1y · $420/mes', credentialExpires: '2026-11-20', billingExport: 'CUR diario · s3://billing-cur/', reservedInstances: 6 },
    { id: 'acc-aws-stg', name: 'aws-staging', accountId: '210987654321', orgUnit: 'Non-Production', environment: 'Staging', regions: 2, instances: 12, monthlyCost: 380, status: 'active', syncStatus: 'synced', lastSync: fmtTime(22), hasCredentials: true, contact: 'staging@cloudops.io', tags: ['env:staging'], primaryRegion: 'eu-west-1', iamRoles: 14, policies: 32, savingsPlan: '—', credentialExpires: '2026-08-01', billingExport: 'CUR diario · S3', reservedInstances: 0 },
    { id: 'acc-aws-dev', name: 'aws-development', accountId: '345678901234', orgUnit: 'Sandbox', environment: 'Desarrollo', regions: 1, instances: 8, monthlyCost: 200, status: 'active', syncStatus: 'warning', lastSync: fmtTime(180), hasCredentials: true, contact: 'dev@cloudops.io', tags: ['env:dev', 'ttl:30d'], primaryRegion: 'us-east-1', iamRoles: 8, policies: 18, savingsPlan: '—', credentialExpires: '2026-06-15', billingExport: 'Cost Explorer API', reservedInstances: 0 },
  ],
  computeRows: Array.from({ length: 10 }, (_, i) => ({
    id: `aws-ec2-${i}`,
    name: `aws-prod-app-${i + 1}`,
    resourceId: `i-0${String(i).padStart(8, '0')}abc1234`,
    account: i < 6 ? 'aws-production' : 'aws-staging',
    region: ['us-east-1', 'eu-west-1', 'ap-southeast-1'][i % 3],
    zone: `${['us-east-1', 'eu-west-1', 'ap-southeast-1'][i % 3]}${['a', 'b'][i % 2]}`,
    instanceType: ['t3.medium', 'm6i.large', 'c6i.xlarge'][i % 3],
    status: i === 2 ? 'WARNING' : i === 7 ? 'STOPPED' : 'RUNNING',
    publicIp: i === 7 ? '—' : `203.0.113.${10 + i}`,
    privateIp: `10.0.${i + 1}.${10 + i}`,
    network: 'vpc-prod-main',
    cpu: i === 7 ? 0 : 30 + i * 5,
    ram: i === 7 ? 0 : 40 + i * 3,
    disk: 25 + i * 4,
    monthlyCost: 75 + i * 12,
    os: 'Ubuntu 22.04 LTS',
    launchTime: '2024-02-15',
    health: i === 2 ? 'warning' : 'healthy',
  })),
  networkList: [
    { id: 'vpc-0a1b2c3', name: 'vpc-prod-main', cidr: '10.0.0.0/16', region: 'us-east-1', subnets: 6, instances: 18, publicAccess: true, gateways: 2, status: 'available' },
    { id: 'vpc-9f8e7d6', name: 'vpc-prod-eu', cidr: '10.10.0.0/16', region: 'eu-west-1', subnets: 4, instances: 10, publicAccess: true, gateways: 1, status: 'available' },
    { id: 'vpc-stg01', name: 'vpc-stg-main', cidr: '10.20.0.0/16', region: 'us-east-1', subnets: 3, instances: 8, publicAccess: true, gateways: 1, status: 'available' },
  ],
  securityGroups: [
    { name: 'sg-web-public', id: 'sg-0abc123', network: 'vpc-prod-main', inbound: 4, outbound: 2, attached: 6, risk: 'medium' },
    { name: 'sg-app-internal', id: 'sg-0def456', network: 'vpc-prod-main', inbound: 8, outbound: 3, attached: 12, risk: 'low' },
    { name: 'sg-bastion', id: 'sg-0jkl012', network: 'vpc-prod-eu', inbound: 1, outbound: 2, attached: 1, risk: 'high' },
  ],
  loadBalancers: [
    { name: 'alb-checkout-prod', type: 'ALB', scheme: 'internet-facing', region: 'us-east-1', targets: 4, healthy: 4, status: 'active' },
    { name: 'nlb-api-internal', type: 'NLB', scheme: 'internal', region: 'eu-west-1', targets: 3, healthy: 3, status: 'active' },
  ],
  billingByService: [
    { service: 'Amazon EC2', cost: 980, share: 42, trend: 4.2, icon: 'dns' },
    { service: 'Amazon RDS', cost: 420, share: 18, trend: -1.1, icon: 'storage' },
    { service: 'Elastic Load Balancing', cost: 180, share: 8, trend: 0.5, icon: 'hub' },
    { service: 'Amazon S3', cost: 210, share: 9, trend: 2.8, icon: 'inventory_2' },
    { service: 'AWS Lambda', cost: 95, share: 4, trend: 12.4, icon: 'bolt' },
    { service: 'CloudWatch', cost: 68, share: 3, trend: 1.2, icon: 'monitoring' },
  ],
  metrics: [
    { id: 'cpu', label: 'CPU EC2', value: '58', unit: '%', avg: 52, peak: 89, color: '#ff9900', points: genPoints(1, 58) },
    { id: 'ram', label: 'Memoria', value: '64', unit: '%', avg: 61, peak: 82, color: '#3b82f6', points: genPoints(2, 64) },
    { id: 'net-in', label: 'Red entrante', value: '1.2', unit: 'Gbps', avg: 0.9, peak: 2.1, color: '#10b981', points: genPoints(3, 72) },
    { id: 'ebs', label: 'EBS IOPS', value: '12.4', unit: 'k', avg: 10.2, peak: 18.6, color: '#f59e0b', points: genPoints(5, 48) },
    { id: 'latency', label: 'Latencia ALB', value: '42', unit: 'ms', avg: 38, peak: 98, color: '#ef4444', points: genPoints(6, 42) },
    { id: 'lambda', label: 'Lambda invoc.', value: '24', unit: 'k/min', avg: 18, peak: 42, color: '#8b5cf6', points: genPoints(7, 55) },
  ],
  activity: [
    { time: fmtTime(5), event: 'Auto Scaling añadió 2 instancias en us-east-1', severity: 'info', resource: 'asg-checkout' },
    { time: fmtTime(18), event: 'CPU > 85% en api-gateway-prod', severity: 'warning', resource: 'i-0a1b2c3d' },
    { time: fmtTime(45), event: 'Sync inventario aws-production completado', severity: 'info', resource: '123456789012' },
    { time: fmtTime(90), event: 'Security Group sg-bastion expuesto a 0.0.0.0/0', severity: 'critical', resource: 'sg-0jkl012' },
  ],
  regionList: [
    { code: 'us-east-1', name: 'N. Virginia', instances: 14, cost: 820, zones: 6, utilization: 72, latencyMs: 12 },
    { code: 'eu-west-1', name: 'Irlanda', instances: 10, cost: 540, zones: 3, utilization: 58, latencyMs: 28 },
    { code: 'ap-southeast-1', name: 'Singapur', instances: 4, cost: 280, zones: 3, utilization: 41, latencyMs: 186 },
  ],
  billingSummary: { budget: 2100, credits: 120, previousMonth: 1980, dailyAverage: 68, topAccount: 'aws-production', anomalies: 2, reservedSavings: 420, invoiceDate: '2026-06-01' },
}

const GCP_SEED: SeedBundle = {
  accountRows: [
    { id: 'acc-gcp-prod', name: 'gcp-production', accountId: 'gcp-prod-482910', orgUnit: 'Production', environment: 'Producción', regions: 4, instances: 28, monthlyCost: 1240, status: 'active', syncStatus: 'synced', lastSync: fmtTime(8), hasCredentials: true, contact: 'cloud-admin@cloudops.io', tags: ['env:production', 'cost-center:platform'], primaryRegion: 'us-central1', iamRoles: 24, policies: 48, savingsPlan: 'CUD · 1y · $420/mes', credentialExpires: '2026-11-20', billingExport: 'BigQuery billing export · GCS', reservedInstances: 6 },
    { id: 'acc-gcp-stg', name: 'gcp-staging', accountId: 'gcp-stg-773821', orgUnit: 'Non-Production', environment: 'Staging', regions: 2, instances: 12, monthlyCost: 380, status: 'active', syncStatus: 'synced', lastSync: fmtTime(22), hasCredentials: true, contact: 'staging@cloudops.io', tags: ['env:staging'], primaryRegion: 'europe-west1', iamRoles: 14, policies: 32, savingsPlan: '—', credentialExpires: '2026-08-01', billingExport: 'BigQuery billing export · GCS', reservedInstances: 0 },
    { id: 'acc-gcp-dev', name: 'gcp-development', accountId: 'gcp-dev-119203', orgUnit: 'Sandbox', environment: 'Desarrollo', regions: 1, instances: 8, monthlyCost: 200, status: 'active', syncStatus: 'warning', lastSync: fmtTime(180), hasCredentials: true, contact: 'dev@cloudops.io', tags: ['env:dev', 'ttl:30d'], primaryRegion: 'us-central1', iamRoles: 8, policies: 18, savingsPlan: '—', credentialExpires: '2026-06-15', billingExport: 'Billing API', reservedInstances: 0 },
  ],
  computeRows: Array.from({ length: 10 }, (_, i) => ({
    id: `gcp-gce-${i}`,
    name: `gcp-prod-app-${i + 1}`,
    resourceId: `gce-${String(i).padStart(8, '0')}abc1234`,
    account: i < 6 ? 'gcp-production' : 'gcp-staging',
    region: ['us-central1', 'europe-west1', 'asia-southeast1'][i % 3],
    zone: `${['us-central1', 'europe-west1', 'asia-southeast1'][i % 3]}-${['a', 'b'][i % 2]}`,
    instanceType: ['e2-medium', 'n2-standard-2', 'c3-highcpu-8'][i % 3],
    status: i === 2 ? 'WARNING' : i === 7 ? 'STOPPED' : 'RUNNING',
    publicIp: i === 7 ? '—' : `34.${120 + i}.${10 + i}.${20 + i}`,
    privateIp: `10.0.${i + 1}.${10 + i}`,
    network: 'vpc-prod-main',
    cpu: i === 7 ? 0 : 30 + i * 5,
    ram: i === 7 ? 0 : 40 + i * 3,
    disk: 25 + i * 4,
    monthlyCost: 75 + i * 12,
    os: 'Ubuntu 22.04 LTS',
    launchTime: '2024-02-15',
    health: i === 2 ? 'warning' : 'healthy',
  })),
  networkList: [
    { id: 'vpc-0a1b2c3', name: 'vpc-prod-main', cidr: '10.0.0.0/16', region: 'us-central1', subnets: 6, instances: 18, publicAccess: true, gateways: 2, status: 'available' },
    { id: 'vpc-9f8e7d6', name: 'vpc-prod-eu', cidr: '10.10.0.0/16', region: 'europe-west1', subnets: 4, instances: 10, publicAccess: true, gateways: 1, status: 'available' },
    { id: 'vpc-stg01', name: 'vpc-stg-main', cidr: '10.20.0.0/16', region: 'us-central1', subnets: 3, instances: 8, publicAccess: true, gateways: 1, status: 'available' },
  ],
  securityGroups: [
    { name: 'fw-web-public', id: 'fw-0abc123', network: 'vpc-prod-main', inbound: 4, outbound: 2, attached: 6, risk: 'medium' },
    { name: 'fw-app-internal', id: 'fw-0def456', network: 'vpc-prod-main', inbound: 8, outbound: 3, attached: 12, risk: 'low' },
    { name: 'fw-bastion', id: 'fw-0jkl012', network: 'vpc-prod-eu', inbound: 1, outbound: 2, attached: 1, risk: 'high' },
  ],
  loadBalancers: [
    { name: 'lb-checkout-prod', type: 'HTTP(S)', scheme: 'external', region: 'us-central1', targets: 4, healthy: 4, status: 'active' },
    { name: 'lb-api-internal', type: 'TCP/SSL', scheme: 'internal', region: 'europe-west1', targets: 3, healthy: 3, status: 'active' },
  ],
  billingByService: [
    { service: 'Compute Engine', cost: 980, share: 42, trend: 4.2, icon: 'dns' },
    { service: 'Cloud SQL', cost: 420, share: 18, trend: -1.1, icon: 'storage' },
    { service: 'Cloud Load Balancing', cost: 180, share: 8, trend: 0.5, icon: 'hub' },
    { service: 'Cloud Storage', cost: 210, share: 9, trend: 2.8, icon: 'inventory_2' },
    { service: 'Cloud Functions', cost: 95, share: 4, trend: 12.4, icon: 'bolt' },
    { service: 'Cloud Monitoring', cost: 68, share: 3, trend: 1.2, icon: 'monitoring' },
  ],
  metrics: [
    { id: 'cpu', label: 'CPU GCE', value: '58', unit: '%', avg: 52, peak: 89, color: '#4285f4', points: genPoints(1, 58) },
    { id: 'ram', label: 'Memoria', value: '64', unit: '%', avg: 61, peak: 82, color: '#34a853', points: genPoints(2, 64) },
    { id: 'net-in', label: 'Red entrante', value: '1.2', unit: 'Gbps', avg: 0.9, peak: 2.1, color: '#10b981', points: genPoints(3, 72) },
    { id: 'pd', label: 'Persistent Disk IOPS', value: '12.4', unit: 'k', avg: 10.2, peak: 18.6, color: '#f59e0b', points: genPoints(5, 48) },
    { id: 'latency', label: 'Latencia LB', value: '42', unit: 'ms', avg: 38, peak: 98, color: '#ef4444', points: genPoints(6, 42) },
    { id: 'functions', label: 'Cloud Functions invoc.', value: '24', unit: 'k/min', avg: 18, peak: 42, color: '#8b5cf6', points: genPoints(7, 55) },
  ],
  activity: [
    { time: fmtTime(5), event: 'MIG añadió 2 instancias en us-central1', severity: 'info', resource: 'mig-checkout' },
    { time: fmtTime(18), event: 'CPU > 85% en api-gateway-prod', severity: 'warning', resource: 'gce-0a1b2c3d' },
    { time: fmtTime(45), event: 'Sync inventario gcp-production completado', severity: 'info', resource: 'gcp-prod-482910' },
    { time: fmtTime(90), event: 'Firewall fw-bastion expuesto a 0.0.0.0/0', severity: 'critical', resource: 'fw-0jkl012' },
  ],
  regionList: [
    { code: 'us-central1', name: 'Iowa', instances: 14, cost: 820, zones: 4, utilization: 72, latencyMs: 12 },
    { code: 'europe-west1', name: 'Bélgica', instances: 10, cost: 540, zones: 3, utilization: 58, latencyMs: 28 },
    { code: 'asia-southeast1', name: 'Singapur', instances: 4, cost: 280, zones: 3, utilization: 41, latencyMs: 186 },
  ],
  billingSummary: { budget: 2100, credits: 120, previousMonth: 1980, dailyAverage: 68, topAccount: 'gcp-production', anomalies: 2, reservedSavings: 420, invoiceDate: '2026-06-01' },
}

const AZURE_SEED: SeedBundle = {
  accountRows: [
    { id: 'acc-az-prod', name: 'azure-production', accountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', orgUnit: 'Production', environment: 'Producción', regions: 4, instances: 28, monthlyCost: 1240, status: 'active', syncStatus: 'synced', lastSync: fmtTime(8), hasCredentials: true, contact: 'cloud-admin@cloudops.io', tags: ['env:production', 'cost-center:platform'], primaryRegion: 'eastus', iamRoles: 24, policies: 48, savingsPlan: 'RI · 3y · $420/mes', credentialExpires: '2026-11-20', billingExport: 'Cost Management export · Storage', reservedInstances: 6 },
    { id: 'acc-az-stg', name: 'azure-staging', accountId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', orgUnit: 'Non-Production', environment: 'Staging', regions: 2, instances: 12, monthlyCost: 380, status: 'active', syncStatus: 'synced', lastSync: fmtTime(22), hasCredentials: true, contact: 'staging@cloudops.io', tags: ['env:staging'], primaryRegion: 'westeurope', iamRoles: 14, policies: 32, savingsPlan: '—', credentialExpires: '2026-08-01', billingExport: 'Cost Management export · Storage', reservedInstances: 0 },
    { id: 'acc-az-dev', name: 'azure-development', accountId: 'c3d4e5f6-a7b8-9012-cdef-123456789012', orgUnit: 'Sandbox', environment: 'Desarrollo', regions: 1, instances: 8, monthlyCost: 200, status: 'active', syncStatus: 'warning', lastSync: fmtTime(180), hasCredentials: true, contact: 'dev@cloudops.io', tags: ['env:dev', 'ttl:30d'], primaryRegion: 'eastus', iamRoles: 8, policies: 18, savingsPlan: '—', credentialExpires: '2026-06-15', billingExport: 'Cost Management API', reservedInstances: 0 },
  ],
  computeRows: Array.from({ length: 10 }, (_, i) => ({
    id: `az-vm-${i}`,
    name: `azure-prod-app-${i + 1}`,
    resourceId: `/subscriptions/.../virtualMachines/vm-${String(i).padStart(4, '0')}`,
    account: i < 6 ? 'azure-production' : 'azure-staging',
    region: ['eastus', 'westeurope', 'southeastasia'][i % 3],
    zone: `${['eastus', 'westeurope', 'southeastasia'][i % 3]}-${(i % 3) + 1}`,
    instanceType: ['Standard_B2ms', 'Standard_D4s_v3', 'Standard_F8s_v2'][i % 3],
    status: i === 2 ? 'WARNING' : i === 7 ? 'STOPPED' : 'RUNNING',
    publicIp: i === 7 ? '—' : `20.${50 + i}.${10 + i}.${5 + i}`,
    privateIp: `10.0.${i + 1}.${10 + i}`,
    network: 'vnet-prod-main',
    cpu: i === 7 ? 0 : 30 + i * 5,
    ram: i === 7 ? 0 : 40 + i * 3,
    disk: 25 + i * 4,
    monthlyCost: 75 + i * 12,
    os: 'Ubuntu 22.04 LTS',
    launchTime: '2024-02-15',
    health: i === 2 ? 'warning' : 'healthy',
  })),
  networkList: [
    { id: 'vnet-prod', name: 'vnet-prod-main', cidr: '10.0.0.0/16', region: 'eastus', subnets: 6, instances: 18, publicAccess: true, gateways: 2, status: 'available' },
    { id: 'vnet-eu', name: 'vnet-prod-eu', cidr: '10.10.0.0/16', region: 'westeurope', subnets: 4, instances: 10, publicAccess: true, gateways: 1, status: 'available' },
    { id: 'vnet-stg', name: 'vnet-stg-main', cidr: '10.20.0.0/16', region: 'eastus', subnets: 3, instances: 8, publicAccess: true, gateways: 1, status: 'available' },
  ],
  securityGroups: [
    { name: 'nsg-web-public', id: 'nsg-0abc123', network: 'vnet-prod-main', inbound: 4, outbound: 2, attached: 6, risk: 'medium' },
    { name: 'nsg-app-internal', id: 'nsg-0def456', network: 'vnet-prod-main', inbound: 8, outbound: 3, attached: 12, risk: 'low' },
    { name: 'nsg-bastion', id: 'nsg-0jkl012', network: 'vnet-prod-eu', inbound: 1, outbound: 2, attached: 1, risk: 'high' },
  ],
  loadBalancers: [
    { name: 'appgw-checkout-prod', type: 'Application Gateway', scheme: 'public', region: 'eastus', targets: 4, healthy: 4, status: 'active' },
    { name: 'lb-api-internal', type: 'Internal LB', scheme: 'internal', region: 'westeurope', targets: 3, healthy: 3, status: 'active' },
  ],
  billingByService: [
    { service: 'Virtual Machines', cost: 980, share: 42, trend: 4.2, icon: 'dns' },
    { service: 'Azure SQL', cost: 420, share: 18, trend: -1.1, icon: 'storage' },
    { service: 'Load Balancer', cost: 180, share: 8, trend: 0.5, icon: 'hub' },
    { service: 'Storage Accounts', cost: 210, share: 9, trend: 2.8, icon: 'inventory_2' },
    { service: 'Azure Functions', cost: 95, share: 4, trend: 12.4, icon: 'bolt' },
    { service: 'Azure Monitor', cost: 68, share: 3, trend: 1.2, icon: 'monitoring' },
  ],
  metrics: [
    { id: 'cpu', label: 'CPU VM', value: '58', unit: '%', avg: 52, peak: 89, color: '#0078d4', points: genPoints(1, 58) },
    { id: 'ram', label: 'Memoria', value: '64', unit: '%', avg: 61, peak: 82, color: '#50e6ff', points: genPoints(2, 64) },
    { id: 'net-in', label: 'Red entrante', value: '1.2', unit: 'Gbps', avg: 0.9, peak: 2.1, color: '#10b981', points: genPoints(3, 72) },
    { id: 'disk', label: 'Disk IOPS', value: '12.4', unit: 'k', avg: 10.2, peak: 18.6, color: '#f59e0b', points: genPoints(5, 48) },
    { id: 'latency', label: 'Latencia App Gateway', value: '42', unit: 'ms', avg: 38, peak: 98, color: '#ef4444', points: genPoints(6, 42) },
    { id: 'functions', label: 'Functions invoc.', value: '24', unit: 'k/min', avg: 18, peak: 42, color: '#8b5cf6', points: genPoints(7, 55) },
  ],
  activity: [
    { time: fmtTime(5), event: 'VMSS añadió 2 instancias en eastus', severity: 'info', resource: 'vmss-checkout' },
    { time: fmtTime(18), event: 'CPU > 85% en api-gateway-prod', severity: 'warning', resource: 'vm-0a1b2c3d' },
    { time: fmtTime(45), event: 'Sync inventario azure-production completado', severity: 'info', resource: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
    { time: fmtTime(90), event: 'NSG nsg-bastion expuesto a 0.0.0.0/0', severity: 'critical', resource: 'nsg-0jkl012' },
  ],
  regionList: [
    { code: 'eastus', name: 'East US', instances: 14, cost: 820, zones: 3, utilization: 72, latencyMs: 12 },
    { code: 'westeurope', name: 'West Europe', instances: 10, cost: 540, zones: 3, utilization: 58, latencyMs: 28 },
    { code: 'southeastasia', name: 'Southeast Asia', instances: 4, cost: 280, zones: 3, utilization: 41, latencyMs: 186 },
  ],
  billingSummary: { budget: 2100, credits: 120, previousMonth: 1980, dailyAverage: 68, topAccount: 'azure-production', anomalies: 2, reservedSavings: 420, invoiceDate: '2026-06-01' },
}

const SEEDS: Record<CloudSlug, SeedBundle> = { aws: AWS_SEED, gcp: GCP_SEED, azure: AZURE_SEED }

export const buildCloudSnapshot = (
  slug: CloudSlug,
  apiInstances: Instance[] = [],
  apiAccounts: CloudAccountRow[] = [],
): CloudSnapshot => {
  const cfg = CLOUD_PROVIDER_CONFIGS[slug]
  const seed = SEEDS[slug]
  const provider = cfg.provider

  const fromApi = apiInstances.filter((i) => i.provider === provider).map((inst, idx) => instanceToRow(inst, idx, slug))
  const computeRows = fromApi.length ? [...fromApi, ...seed.computeRows.slice(0, 2)] : seed.computeRows

  let accountRows = seed.accountRows
  if (apiAccounts.length) {
    accountRows = apiAccounts.map((a, i) => ({
      ...seed.accountRows[i % seed.accountRows.length],
      ...a,
      id: a.id || seed.accountRows[i]?.id || `acc-${i}`,
      instances: computeRows.filter((c) => c.account === a.name).length || a.instances,
    }))
  }

  const enrichedCompute = computeRows.map((r, i) => enrichComputeRow(r, i, slug))

  const running = enrichedCompute.filter((e) => e.status === 'RUNNING').length
  const stopped = enrichedCompute.filter((e) => e.status === 'STOPPED').length
  const monthlyCost =
    enrichedCompute.reduce((s, e) => s + e.monthlyCost, 0) +
    seed.billingByService.reduce((s, b) => s + b.cost, 0) * 0.15

  const billingByRegion = seed.regionList.map((r) => ({
    region: r.code,
    cost: r.cost,
    share: Math.round((r.cost / Math.max(seed.regionList.reduce((s, x) => s + x.cost, 0), 1)) * 100),
  }))

  const roundedMonthly = Math.round(monthlyCost)
  const roundedForecast = Math.round(monthlyCost * 1.08)
  const dailyAvg = Math.round(monthlyCost / 30)
  const billingByService = seed.billingByService.map((r, i) => enrichBillingRow(r, i, slug))

  return {
    accounts: accountRows.length,
    instances: computeRows.length,
    running,
    stopped,
    regions: seed.regionList.length,
    networkCount: seed.networkList.length,
    monthlyCost: roundedMonthly,
    forecast: roundedForecast,
    alerts: ALERTS_BY_SLUG[slug].length,
    avgCpu: Math.round(enrichedCompute.reduce((s, e) => s + e.cpu, 0) / Math.max(enrichedCompute.length, 1)),
    avgRam: Math.round(enrichedCompute.reduce((s, e) => s + e.ram, 0) / Math.max(enrichedCompute.length, 1)),
    lastSync: fmtTime(8),
    accountRows: accountRows.map((a, i) => enrichAccount(a, i, slug)),
    computeRows: enrichedCompute,
    networkList: seed.networkList.map((n, i) => enrichNetworkRow(n, i, slug)),
    securityGroups: seed.securityGroups.map(enrichSecurityRow),
    loadBalancers: seed.loadBalancers.map(enrichLbRow),
    billingByService,
    billingByRegion,
    billingTrends: buildBillingTrends(
      roundedMonthly,
      roundedForecast,
      seed.billingSummary.previousMonth,
      dailyAvg,
      billingByService,
    ),
    metrics: seed.metrics.map((m) => enrichMetric(m, slug)),
    activity: seed.activity.map(enrichActivity),
    regionList: seed.regionList.map((r, i) =>
      enrichRegion(
        {
          ...r,
          instances: enrichedCompute.filter((c) => c.region === r.code).length || r.instances,
        },
        i,
      ),
    ),
    overview: OVERVIEW_BY_SLUG[slug],
    billingSummary: {
      ...seed.billingSummary,
      previousMonth: seed.billingSummary.previousMonth,
      dailyAverage: dailyAvg,
    },
    networkSummary: {
      totalSubnets: seed.networkList.reduce((s, n) => s + n.subnets, 0),
      totalSgRules: seed.securityGroups.reduce((s, g) => s + g.inbound + g.outbound, 0),
      publicExposure: seed.securityGroups.filter((g) => g.risk === 'high').length,
      peeringCount: seed.networkList.reduce((s, n) => s + (n.peerings ?? 0), 0),
      natGateways: seed.networkList.reduce((s, n) => s + (n.natGateways ?? 0), 0),
      dnsZones: 4,
    },
    computeSummary: {
      healthy: enrichedCompute.filter((e) => e.health === 'healthy').length,
      warning: enrichedCompute.filter((e) => e.health === 'warning').length,
      critical: enrichedCompute.filter((e) => e.health === 'critical').length,
      totalVcpus: enrichedCompute.reduce((s, e) => s + (e.vcpus ?? 0), 0),
      totalMemoryGb: enrichedCompute.reduce((s, e) => s + (e.memoryGb ?? 0), 0),
      avgUptime: '99.91%',
      spotInstances: enrichedCompute.filter((_, i) => i % 5 === 0).length,
      onDemandCost: Math.round(monthlyCost * 0.62),
    },
    alertItems: ALERTS_BY_SLUG[slug],
  }
}

export const mapApiAccounts = (
  slug: CloudSlug,
  rows: { id: string; name: string; accountId?: string; projectId?: string; syncStatus?: string; hasCredentials?: boolean }[],
): CloudAccountRow[] => {
  const seed = SEEDS[slug].accountRows[0]
  return rows.map((a, i) => enrichAccount({
    id: a.id,
    name: a.name,
    accountId: a.accountId ?? a.projectId ?? '—',
    orgUnit: seed.orgUnit,
    environment: i === 0 ? 'Producción' : 'Staging',
    regions: 2 + (i % 2),
    instances: 6 + i * 4,
    monthlyCost: 300 + i * 250,
    status: 'active',
    syncStatus: a.syncStatus ?? 'synced',
    lastSync: fmtTime(10 + i * 20),
    hasCredentials: a.hasCredentials ?? true,
    contact: `admin-${i}@cloudops.io`,
    tags: [`provider:${slug}`],
    primaryRegion: seed.primaryRegion,
    iamRoles: seed.iamRoles,
    policies: seed.policies,
    savingsPlan: seed.savingsPlan,
    credentialExpires: seed.credentialExpires,
    billingExport: seed.billingExport,
    reservedInstances: seed.reservedInstances,
  }, i, slug))
}

export { slugFromProvider }
