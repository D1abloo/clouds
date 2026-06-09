import type { Instance } from '../../../core/models/api.models'

export type AwsSection = 'overview' | 'accounts' | 'instances' | 'network' | 'billing' | 'metrics'

export const AWS_SECTIONS: { id: AwsSection; label: string; icon: string; route: string }[] = [
  { id: 'overview', label: 'Resumen', icon: 'space_dashboard', route: '/cloud/aws/overview' },
  { id: 'accounts', label: 'Cuentas', icon: 'corporate_fare', route: '/cloud/aws/accounts' },
  { id: 'instances', label: 'EC2', icon: 'dns', route: '/cloud/aws/instances' },
  { id: 'network', label: 'Red', icon: 'device_hub', route: '/cloud/aws/network' },
  { id: 'billing', label: 'Facturación', icon: 'account_balance_wallet', route: '/cloud/aws/billing' },
  { id: 'metrics', label: 'Métricas', icon: 'show_chart', route: '/cloud/aws/metrics' },
]

export interface AwsAccountRow {
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
  rootEmail: string
  tags: string[]
}

export interface AwsEc2Row {
  id: string
  name: string
  instanceId: string
  account: string
  region: string
  az: string
  instanceType: string
  status: string
  publicIp: string
  privateIp: string
  vpc: string
  cpu: number
  ram: number
  disk: number
  monthlyCost: number
  os: string
  launchTime: string
  health: 'healthy' | 'warning' | 'critical'
}

export interface AwsVpcRow {
  id: string
  name: string
  cidr: string
  region: string
  subnets: number
  instances: number
  igw: boolean
  nat: number
  status: string
}

export interface AwsSgRow {
  name: string
  id: string
  vpc: string
  inbound: number
  outbound: number
  attached: number
  risk: 'low' | 'medium' | 'high'
}

export interface AwsLbRow {
  name: string
  type: string
  scheme: string
  region: string
  targets: number
  healthy: number
  status: string
}

export interface AwsBillingService {
  service: string
  cost: number
  share: number
  trend: number
  icon: string
}

export interface AwsMetricCard {
  id: string
  label: string
  value: string
  unit: string
  avg: number
  peak: number
  color: string
  points: number[]
}

export interface AwsActivity {
  time: string
  event: string
  severity: 'info' | 'warning' | 'critical'
  resource: string
}

export interface AwsCloudSnapshot {
  accounts: number
  instances: number
  running: number
  stopped: number
  regions: number
  vpcCount: number
  monthlyCost: number
  forecast: number
  alerts: number
  avgCpu: number
  avgRam: number
  lastSync: string
  accountRows: AwsAccountRow[]
  ec2Rows: AwsEc2Row[]
  vpcList: AwsVpcRow[]
  securityGroups: AwsSgRow[]
  loadBalancers: AwsLbRow[]
  billingByService: AwsBillingService[]
  billingByRegion: { region: string; cost: number; share: number }[]
  metrics: AwsMetricCard[]
  activity: AwsActivity[]
  regionList: { code: string; name: string; instances: number; cost: number }[]
}

const fmtTime = (minsAgo: number): string => {
  const d = new Date(Date.now() - minsAgo * 60_000)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const genPoints = (seed: number, end: number, n = 12): number[] => {
  const pts: number[] = []
  for (let i = 0; i < n; i++) {
    const wave = Math.sin((i + seed) * 0.7) * 12
    pts.push(Math.max(4, Math.min(98, Math.round(end + wave + ((seed * (i + 1)) % 9) - 4))))
  }
  pts[n - 1] = end
  return pts
}

const demoAccounts = (): AwsAccountRow[] => [
  {
    id: 'acc-prod',
    name: 'aws-production',
    accountId: '123456789012',
    orgUnit: 'Production',
    environment: 'Producción',
    regions: 4,
    instances: 28,
    monthlyCost: 1240,
    status: 'active',
    syncStatus: 'synced',
    lastSync: fmtTime(8),
    hasCredentials: true,
    rootEmail: 'cloud-admin@cloudops.io',
    tags: ['env:production', 'cost-center:platform', 'compliance:soc2'],
  },
  {
    id: 'acc-stg',
    name: 'aws-staging',
    accountId: '210987654321',
    orgUnit: 'Non-Production',
    environment: 'Staging',
    regions: 2,
    instances: 12,
    monthlyCost: 380,
    status: 'active',
    syncStatus: 'synced',
    lastSync: fmtTime(22),
    hasCredentials: true,
    rootEmail: 'staging-admin@cloudops.io',
    tags: ['env:staging', 'auto-shutdown:enabled'],
  },
  {
    id: 'acc-dev',
    name: 'aws-development',
    accountId: '345678901234',
    orgUnit: 'Sandbox',
    environment: 'Desarrollo',
    regions: 1,
    instances: 8,
    monthlyCost: 200,
    status: 'active',
    syncStatus: 'warning',
    lastSync: fmtTime(180),
    hasCredentials: true,
    rootEmail: 'dev-leads@cloudops.io',
    tags: ['env:dev', 'ttl:30d'],
  },
]

const instanceToEc2 = (inst: Instance, idx: number): AwsEc2Row => ({
  id: inst.id,
  name: inst.name,
  instanceId: `i-0${inst.id.replace(/\D/g, '').slice(0, 8).padEnd(8, 'a')}`,
  account: inst.cloudAccountId ?? 'aws-production',
  region: inst.region ?? 'us-east-1',
  az: `${inst.region ?? 'us-east-1'}${['a', 'b', 'c'][idx % 3]}`,
  instanceType: inst.instanceType ?? 't3.medium',
  status: inst.status ?? 'RUNNING',
  publicIp: inst.publicIp ?? '—',
  privateIp: inst.privateIp ?? '10.0.1.10',
  vpc: 'vpc-prod-main',
  cpu: 35 + (idx % 40),
  ram: 45 + (idx % 30),
  disk: 28 + (idx % 50),
  monthlyCost: inst.monthlyCost ?? 85,
  os: inst.os ?? 'Ubuntu 22.04 LTS',
  launchTime: '2024-03-12',
  health: inst.status === 'WARNING' ? 'warning' : inst.status === 'ERROR' ? 'critical' : 'healthy',
})

const demoEc2Extras = (): AwsEc2Row[] => [
  {
    id: 'ec2-extra-1',
    name: 'api-gateway-prod',
    instanceId: 'i-0a1b2c3d4e5f6789',
    account: 'aws-production',
    region: 'eu-west-1',
    az: 'eu-west-1a',
    instanceType: 'm6i.xlarge',
    status: 'RUNNING',
    publicIp: '52.31.18.44',
    privateIp: '10.10.2.15',
    vpc: 'vpc-prod-eu',
    cpu: 72,
    ram: 68,
    disk: 41,
    monthlyCost: 210,
    os: 'Amazon Linux 2023',
    launchTime: '2023-11-02',
    health: 'warning',
  },
  {
    id: 'ec2-extra-2',
    name: 'batch-worker-01',
    instanceId: 'i-09f8e7d6c5b4a3210',
    account: 'aws-staging',
    region: 'us-east-1',
    az: 'us-east-1c',
    instanceType: 'c6i.2xlarge',
    status: 'STOPPED',
    publicIp: '—',
    privateIp: '10.20.4.8',
    vpc: 'vpc-stg-main',
    cpu: 0,
    ram: 0,
    disk: 62,
    monthlyCost: 45,
    os: 'Ubuntu 22.04 LTS',
    launchTime: '2024-01-20',
    health: 'healthy',
  },
]

export const buildAwsCloudSnapshot = (
  apiInstances: Instance[] = [],
  apiAccounts: Record<string, unknown>[] = [],
): AwsCloudSnapshot => {
  const awsInstances = apiInstances.filter((i) => i.provider === 'AWS')
  const ec2FromApi = awsInstances.map(instanceToEc2)
  const ec2Rows = ec2FromApi.length ? [...ec2FromApi, ...demoEc2Extras()] : [...demoEc2Extras(), ...buildFallbackEc2()]

  let accountRows = demoAccounts()
  if (apiAccounts.length) {
    accountRows = apiAccounts.map((a, i) => ({
      id: String(a['id'] ?? `acc-${i}`),
      name: String(a['name'] ?? 'AWS Account'),
      accountId: String(a['accountId'] ?? '—'),
      orgUnit: i === 0 ? 'Production' : 'Non-Production',
      environment: i === 0 ? 'Producción' : 'Staging',
      regions: 2 + (i % 3),
      instances: ec2Rows.filter((e) => e.account === String(a['name'])).length || 8 + i * 4,
      monthlyCost: 400 + i * 320,
      status: String(a['status'] ?? 'active'),
      syncStatus: String(a['syncStatus'] ?? 'synced'),
      lastSync: fmtTime(10 + i * 15),
      hasCredentials: Boolean(a['hasCredentials'] ?? true),
      rootEmail: `admin-${i}@cloudops.io`,
      tags: [`env:${i === 0 ? 'production' : 'staging'}`],
    }))
  }

  const running = ec2Rows.filter((e) => e.status === 'RUNNING').length
  const stopped = ec2Rows.filter((e) => e.status === 'STOPPED').length
  const regions = [...new Set(ec2Rows.map((e) => e.region))]
  const monthlyCost = ec2Rows.reduce((s, e) => s + e.monthlyCost, 0) + 420

  const vpcList: AwsVpcRow[] = [
    { id: 'vpc-0a1b2c3', name: 'vpc-prod-main', cidr: '10.0.0.0/16', region: 'us-east-1', subnets: 6, instances: 18, igw: true, nat: 2, status: 'available' },
    { id: 'vpc-9f8e7d6', name: 'vpc-prod-eu', cidr: '10.10.0.0/16', region: 'eu-west-1', subnets: 4, instances: 10, igw: true, nat: 1, status: 'available' },
    { id: 'vpc-stg01', name: 'vpc-stg-main', cidr: '10.20.0.0/16', region: 'us-east-1', subnets: 3, instances: 8, igw: true, nat: 1, status: 'available' },
    { id: 'vpc-dev01', name: 'vpc-dev-sandbox', cidr: '172.16.0.0/20', region: 'us-west-2', subnets: 2, instances: 4, igw: false, nat: 0, status: 'available' },
  ]

  const securityGroups: AwsSgRow[] = [
    { name: 'sg-web-public', id: 'sg-0abc123', vpc: 'vpc-prod-main', inbound: 4, outbound: 2, attached: 6, risk: 'medium' },
    { name: 'sg-app-internal', id: 'sg-0def456', vpc: 'vpc-prod-main', inbound: 8, outbound: 3, attached: 12, risk: 'low' },
    { name: 'sg-db-restricted', id: 'sg-0ghi789', vpc: 'vpc-prod-main', inbound: 2, outbound: 1, attached: 3, risk: 'low' },
    { name: 'sg-bastion', id: 'sg-0jkl012', vpc: 'vpc-prod-eu', inbound: 1, outbound: 2, attached: 1, risk: 'high' },
  ]

  const loadBalancers: AwsLbRow[] = [
    { name: 'alb-checkout-prod', type: 'ALB', scheme: 'internet-facing', region: 'us-east-1', targets: 4, healthy: 4, status: 'active' },
    { name: 'nlb-api-internal', type: 'NLB', scheme: 'internal', region: 'eu-west-1', targets: 3, healthy: 3, status: 'active' },
    { name: 'alb-stg-apps', type: 'ALB', scheme: 'internal', region: 'us-east-1', targets: 2, healthy: 1, status: 'warning' },
  ]

  const billingByService: AwsBillingService[] = [
    { service: 'Amazon EC2', cost: 980, share: 42, trend: 4.2, icon: 'dns' },
    { service: 'Amazon RDS', cost: 420, share: 18, trend: -1.1, icon: 'storage' },
    { service: 'Elastic Load Balancing', cost: 180, share: 8, trend: 0.5, icon: 'hub' },
    { service: 'Amazon S3', cost: 210, share: 9, trend: 2.8, icon: 'inventory_2' },
    { service: 'AWS Lambda', cost: 95, share: 4, trend: 12.4, icon: 'bolt' },
    { service: 'CloudWatch', cost: 68, share: 3, trend: 1.2, icon: 'monitoring' },
    { service: 'Data transfer', cost: 240, share: 10, trend: 6.1, icon: 'swap_horiz' },
    { service: 'Otros servicios', cost: 147, share: 6, trend: 0.8, icon: 'more_horiz' },
  ]

  const billingByRegion = regions.map((r, i) => ({
    region: r,
    cost: Math.round(monthlyCost * ([0.45, 0.32, 0.23][i] ?? 0.2)),
    share: Math.round(([45, 32, 23][i] ?? 20)),
  }))

  const metrics: AwsMetricCard[] = [
    { id: 'cpu', label: 'CPU EC2', value: '58', unit: '%', avg: 52, peak: 89, color: '#ff9900', points: genPoints(1, 58) },
    { id: 'ram', label: 'Memoria', value: '64', unit: '%', avg: 61, peak: 82, color: '#3b82f6', points: genPoints(2, 64) },
    { id: 'net-in', label: 'Red entrante', value: '1.2', unit: 'Gbps', avg: 0.9, peak: 2.1, color: '#10b981', points: genPoints(3, 72) },
    { id: 'net-out', label: 'Red saliente', value: '840', unit: 'Mbps', avg: 620, peak: 1200, color: '#8b5cf6', points: genPoints(4, 55) },
    { id: 'ebs-iops', label: 'EBS IOPS', value: '12.4', unit: 'k', avg: 10.2, peak: 18.6, color: '#f59e0b', points: genPoints(5, 48) },
    { id: 'latency', label: 'Latencia ALB', value: '42', unit: 'ms', avg: 38, peak: 98, color: '#ef4444', points: genPoints(6, 42) },
  ]

  const activity: AwsActivity[] = [
    { time: fmtTime(5), event: 'Auto Scaling añadió 2 instancias en us-east-1', severity: 'info', resource: 'asg-checkout' },
    { time: fmtTime(18), event: 'CPU > 85% en api-gateway-prod · 18 min', severity: 'warning', resource: 'i-0a1b2c3d' },
    { time: fmtTime(45), event: 'Sync inventario aws-production completado', severity: 'info', resource: '123456789012' },
    { time: fmtTime(90), event: 'Security Group sg-bastion expuesto a 0.0.0.0/0', severity: 'critical', resource: 'sg-0jkl012' },
    { time: fmtTime(120), event: 'Snapshot EBS vol-db-primary completado', severity: 'info', resource: 'snap-0abc789' },
  ]

  const regionList = [
    { code: 'us-east-1', name: 'N. Virginia', instances: ec2Rows.filter((e) => e.region === 'us-east-1').length || 14, cost: 820 },
    { code: 'eu-west-1', name: 'Irlanda', instances: ec2Rows.filter((e) => e.region === 'eu-west-1').length || 10, cost: 540 },
    { code: 'ap-southeast-1', name: 'Singapur', instances: ec2Rows.filter((e) => e.region === 'ap-southeast-1').length || 4, cost: 280 },
    { code: 'us-west-2', name: 'Oregón', instances: ec2Rows.filter((e) => e.region === 'us-west-2').length || 4, cost: 180 },
  ]

  return {
    accounts: accountRows.length,
    instances: ec2Rows.length,
    running,
    stopped,
    regions: regionList.length,
    vpcCount: vpcList.length,
    monthlyCost,
    forecast: Math.round(monthlyCost * 1.08),
    alerts: 5,
    avgCpu: Math.round(ec2Rows.reduce((s, e) => s + e.cpu, 0) / Math.max(ec2Rows.length, 1)),
    avgRam: Math.round(ec2Rows.reduce((s, e) => s + e.ram, 0) / Math.max(ec2Rows.length, 1)),
    lastSync: fmtTime(8),
    accountRows,
    ec2Rows,
    vpcList,
    securityGroups,
    loadBalancers,
    billingByService,
    billingByRegion,
    metrics,
    activity,
    regionList,
  }
}

const buildFallbackEc2 = (): AwsEc2Row[] =>
  Array.from({ length: 10 }, (_, i) => ({
    id: `aws-fallback-${i}`,
    name: `aws-prod-app-${i + 1}`,
    instanceId: `i-0${String(i).padStart(8, '0')}abc1234`,
    account: i < 6 ? 'aws-production' : 'aws-staging',
    region: ['us-east-1', 'eu-west-1', 'ap-southeast-1'][i % 3],
    az: `${['us-east-1', 'eu-west-1', 'ap-southeast-1'][i % 3]}${['a', 'b'][i % 2]}`,
    instanceType: ['t3.medium', 'm6i.large', 'c6i.xlarge'][i % 3],
    status: i === 2 ? 'WARNING' : i === 7 ? 'STOPPED' : 'RUNNING',
    publicIp: i === 7 ? '—' : `203.0.113.${10 + i}`,
    privateIp: `10.${i % 2 ? 10 : 0}.${i + 1}.${10 + i}`,
    vpc: i % 3 === 1 ? 'vpc-prod-eu' : 'vpc-prod-main',
    cpu: i === 7 ? 0 : 30 + i * 5,
    ram: i === 7 ? 0 : 40 + i * 3,
    disk: 25 + i * 4,
    monthlyCost: 75 + i * 12,
    os: 'Ubuntu 22.04 LTS',
    launchTime: '2024-02-15',
    health: i === 2 ? 'warning' : i === 7 ? 'healthy' : 'healthy',
  }))

export const awsSectionFromSlug = (slug: string | null): AwsSection => {
  const map: Record<string, AwsSection> = {
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
  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2)
    const y = pad + (1 - p / 100) * (h - pad * 2)
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  })
  return coords.join(' ')
}
