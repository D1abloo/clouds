import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import type { CloudAccount, Instance } from '../../core/models/api.models'

export type TopologyNodeKind =
  | 'cloud'
  | 'account'
  | 'region'
  | 'network'
  | 'instance'
  | 'vps'
  | 'docker'
  | 'k8s'
  | 'service'

export type TopologyStatus = 'healthy' | 'warning' | 'critical'

export interface TopologyVolume {
  id: string
  size: string
  type: string
  attached: boolean
}

export interface TopologyNodeEvent {
  time: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

export interface TopologyNodeDetail {
  subtitle: string
  resourceId: string
  region?: string
  zone?: string
  account?: string
  instanceType?: string
  vcpu?: number
  memoryGb?: number
  diskGb?: number
  privateIp?: string
  publicIp?: string
  subnet?: string
  vpc?: string
  securityGroups?: string[]
  volumes?: TopologyVolume[]
  tags?: Record<string, string>
  uptime?: string
  monthlyCost?: number
  cpuPercent?: number
  memoryPercent?: number
  networkInMbps?: number
  networkOutMbps?: number
  os?: string
  platform?: string
  owner?: string
  team?: string
  environment?: string
  lastSync?: string
  syncSource?: string
  compliance?: string
  moduleRoute?: string
  metricsRoute?: string
  runbookId?: string
  alertsActive?: number
  healthScore?: number
  openPorts?: string
  events?: TopologyNodeEvent[]
  description?: string
}

export interface TopologyNode {
  id: string
  label: string
  kind: TopologyNodeKind
  provider: string
  status: TopologyStatus
  x: number
  y: number
  w: number
  h: number
  detail: TopologyNodeDetail
  /** Logo de marca oficial (Simple Icons / press kit) */
  logoKey?: NavLogoKey
}

export interface TopologyEdge {
  from: string
  to: string
  label?: string
}

export const TOPOLOGY_VIEWBOX = { width: 1280, height: 680 }

export const TOPOLOGY_LANES = [
  { id: 'aws', label: 'Producción AWS · eu-west-1', y: 52, height: 300, accent: '#ff9900' },
  { id: 'hybrid', label: 'Plataforma híbrida · GCP · K8s · Edge', y: 388, height: 268, accent: '#4285f4' },
] as const

export const TOPOLOGY_COLUMNS = [
  { x: 72, label: 'Proveedor' },
  { x: 272, label: 'Cuenta / Proyecto' },
  { x: 452, label: 'Región / Cluster' },
  { x: 632, label: 'Red / Servicio' },
  { x: 872, label: 'Compute' },
] as const

export const KIND_THEME: Record<
  TopologyNodeKind,
  { accent: string; soft: string; iconBg: string }
> = {
  cloud: { accent: '#64748b', soft: '#f1f5f9', iconBg: '#e2e8f0' },
  account: { accent: '#8b5cf6', soft: '#f5f3ff', iconBg: '#ede9fe' },
  region: { accent: '#0ea5e9', soft: '#f0f9ff', iconBg: '#e0f2fe' },
  network: { accent: '#14b8a6', soft: '#f0fdfa', iconBg: '#ccfbf1' },
  instance: { accent: '#3b82f6', soft: '#eff6ff', iconBg: '#dbeafe' },
  vps: { accent: '#f97316', soft: '#fff7ed', iconBg: '#ffedd5' },
  docker: { accent: '#06b6d4', soft: '#ecfeff', iconBg: '#cffafe' },
  k8s: { accent: '#326ce5', soft: '#eef2ff', iconBg: '#e0e7ff' },
  service: { accent: '#ec4899', soft: '#fdf2f8', iconBg: '#fce7f3' },
}

export const TOPOLOGY_NODES: TopologyNode[] = [
  {
    id: 'aws',
    label: 'Amazon Web Services',
    kind: 'cloud',
    provider: 'AWS',
    status: 'healthy',
    x: 72,
    y: 148,
    w: 128,
    h: 80,
    detail: {
      subtitle: 'Proveedor cloud',
      resourceId: 'provider:aws',
      region: 'global',
      tags: { entorno: 'multi', tier: 'producción' },
    },
  },
  {
    id: 'acc-aws',
    label: 'aws-prod',
    kind: 'account',
    provider: 'AWS',
    status: 'healthy',
    x: 272,
    y: 144,
    w: 144,
    h: 88,
    detail: {
      subtitle: 'Cuenta · 123456789012',
      resourceId: 'account:aws-prod',
      account: '123456789012',
      region: 'multi-region',
      monthlyCost: 4820,
      tags: { owner: 'platform-team', 'cost-center': 'CC-4401' },
    },
  },
  {
    id: 'reg-eu',
    label: 'eu-west-1',
    kind: 'region',
    provider: 'AWS',
    status: 'healthy',
    x: 452,
    y: 144,
    w: 136,
    h: 88,
    detail: {
      subtitle: 'Región · Irlanda',
      resourceId: 'region:eu-west-1',
      region: 'eu-west-1',
      account: 'aws-prod',
      tags: { dr: 'primary-eu' },
    },
  },
  {
    id: 'vpc-main',
    label: 'vpc-main-prod',
    kind: 'network',
    provider: 'AWS',
    status: 'healthy',
    x: 632,
    y: 140,
    w: 152,
    h: 96,
    detail: {
      subtitle: 'VPC · 10.20.0.0/16',
      resourceId: 'vpc-0a2b3c4d5e6f',
      region: 'eu-west-1',
      vpc: 'vpc-main-prod',
      subnet: '3 subnets (public/private)',
      privateIp: '10.20.0.0/16',
      securityGroups: ['sg-default', 'sg-app-tier'],
      tags: { Name: 'vpc-main-prod', Tier: 'production' },
    },
  },
  {
    id: 'web-01',
    label: 'web-prod-01',
    kind: 'instance',
    provider: 'AWS',
    status: 'warning',
    x: 872,
    y: 108,
    w: 180,
    h: 108,
    detail: {
      subtitle: 'EC2 · t3.large',
      resourceId: 'i-0a8f2c91d4e7b6031',
      region: 'eu-west-1',
      zone: 'eu-west-1a',
      account: 'aws-prod',
      instanceType: 't3.large',
      vcpu: 2,
      memoryGb: 8,
      diskGb: 80,
      privateIp: '10.20.12.44',
      publicIp: '54.171.22.18',
      subnet: 'subnet-app-private-1a',
      vpc: 'vpc-main-prod',
      securityGroups: ['sg-web-prod', 'sg-ssh-bastion'],
      volumes: [
        { id: 'vol-0ab12', size: '80 GiB', type: 'gp3', attached: true },
        { id: 'vol-0ef34', size: '100 GiB', type: 'gp3', attached: true },
      ],
      os: 'Amazon Linux 2023',
      platform: 'x86_64',
      uptime: '14d 6h 22m',
      monthlyCost: 142.5,
      cpuPercent: 78,
      memoryPercent: 64,
      networkInMbps: 12.4,
      networkOutMbps: 8.1,
      openPorts: '22, 443, 8080',
      owner: 'frontend@cloudops',
      team: 'Frontend',
      moduleRoute: '/instances/all-instances',
      runbookId: 'rb-cpu',
      events: [
        { time: '14:28', message: 'CPU > 75% durante 10 min', severity: 'warning' },
        { time: '13:05', message: 'Parche de seguridad aplicado', severity: 'info' },
        { time: '09:12', message: 'Health check ALB OK', severity: 'info' },
      ],
      tags: { Name: 'web-prod-01', Role: 'frontend', Env: 'production' },
    },
  },
  {
    id: 'db-01',
    label: 'db-primary',
    kind: 'instance',
    provider: 'AWS',
    status: 'healthy',
    x: 872,
    y: 248,
    w: 180,
    h: 108,
    logoKey: 'postgresql',
    detail: {
      subtitle: 'EC2 · r6g.xlarge',
      resourceId: 'i-0f91e2a8b3c4d5012',
      region: 'eu-west-1',
      zone: 'eu-west-1b',
      account: 'aws-prod',
      instanceType: 'r6g.xlarge',
      vcpu: 4,
      memoryGb: 32,
      diskGb: 500,
      privateIp: '10.20.48.12',
      publicIp: '—',
      subnet: 'subnet-db-private-1b',
      vpc: 'vpc-main-prod',
      securityGroups: ['sg-db-primary'],
      volumes: [{ id: 'vol-db01', size: '500 GiB', type: 'io2', attached: true }],
      os: 'Ubuntu 22.04 LTS',
      platform: 'arm64',
      uptime: '32d 1h 05m',
      monthlyCost: 318.2,
      cpuPercent: 34,
      memoryPercent: 71,
      networkInMbps: 2.1,
      networkOutMbps: 1.8,
      runbookId: 'rb-pg-backup',
      moduleRoute: '/instances/all-instances',
      tags: { Name: 'db-primary', Role: 'database', Env: 'production' },
    },
  },
  {
    id: 'gcp',
    label: 'Google Cloud',
    kind: 'cloud',
    provider: 'GCP',
    status: 'healthy',
    x: 72,
    y: 468,
    w: 128,
    h: 80,
    detail: {
      subtitle: 'Proveedor cloud',
      resourceId: 'provider:gcp',
      region: 'global',
      tags: { org: 'cloudops-analytics' },
    },
  },
  {
    id: 'k8s',
    label: 'prod-cluster',
    kind: 'k8s',
    provider: 'K8s',
    status: 'warning',
    x: 272,
    y: 460,
    w: 160,
    h: 96,
    detail: {
      subtitle: 'GKE · 1.29',
      resourceId: 'gke-prod-cluster-01',
      region: 'europe-west1',
      zone: 'multi-zonal',
      account: 'gcp-analytics',
      vcpu: 48,
      memoryGb: 192,
      uptime: '8d 12h',
      monthlyCost: 1240,
      cpuPercent: 62,
      memoryPercent: 58,
      moduleRoute: '/kubernetes/pods',
      metricsRoute: '/kubernetes/metrics',
      runbookId: 'rb-k8s-pods',
      tags: { cluster: 'prod', version: '1.29.2' },
    },
  },
  {
    id: 'svc-api',
    label: 'checkout-api',
    kind: 'service',
    provider: 'K8s',
    status: 'critical',
    x: 472,
    y: 464,
    w: 172,
    h: 100,
    detail: {
      subtitle: 'Deployment · 3 réplicas',
      resourceId: 'deploy/checkout-api',
      region: 'europe-west1',
      account: 'gcp-analytics',
      vcpu: 3,
      memoryGb: 6,
      uptime: '2d 4h',
      monthlyCost: 186,
      cpuPercent: 91,
      memoryPercent: 88,
      networkInMbps: 45,
      networkOutMbps: 38,
      owner: 'payments@cloudops',
      team: 'Checkout',
      moduleRoute: '/kubernetes/pods',
      metricsRoute: '/kubernetes/metrics',
      runbookId: 'rb-k8s-pods',
      description: 'Deployment checkout-api · namespace payments · HPA activo',
      events: [
        { time: '14:31', message: 'CPU 91% · HPA evaluando scale-out', severity: 'critical' },
        { time: '14:15', message: 'Memoria 88% · cerca del límite', severity: 'warning' },
        { time: '12:00', message: 'Rolling update v2.4.1 completado', severity: 'info' },
      ],
      tags: { app: 'checkout', tier: 'api', ns: 'payments' },
    },
  },
  {
    id: 'vps-01',
    label: 'vps-bastion',
    kind: 'vps',
    provider: 'VPS',
    status: 'healthy',
    x: 872,
    y: 468,
    w: 164,
    h: 96,
    detail: {
      subtitle: 'VPS · Bare metal edge',
      resourceId: 'vps-bastion-01',
      region: 'mad-es',
      instanceType: 'cx42',
      vcpu: 4,
      memoryGb: 16,
      diskGb: 160,
      privateIp: '10.99.0.5',
      publicIp: '185.220.14.8',
      os: 'Debian 12',
      uptime: '67d 3h',
      monthlyCost: 49.9,
      cpuPercent: 12,
      memoryPercent: 28,
      moduleRoute: '/vps/overview',
      runbookId: 'rb-disk',
      securityGroups: ['ufw-ssh-restricted'],
      tags: { Role: 'bastion', Env: 'ops' },
    },
  },
  {
    id: 'docker-01',
    label: 'docker-host',
    kind: 'docker',
    provider: 'Docker',
    status: 'healthy',
    x: 1088,
    y: 468,
    w: 148,
    h: 92,
    detail: {
      subtitle: 'Host Docker · 12 contenedores',
      resourceId: 'host/docker-prod-02',
      region: 'on-prem',
      privateIp: '10.99.0.12',
      vcpu: 8,
      memoryGb: 32,
      uptime: '21d',
      cpuPercent: 41,
      memoryPercent: 55,
      moduleRoute: '/docker/containers',
      metricsRoute: '/docker/metrics',
      runbookId: 'rb-nginx',
      tags: { runtime: 'docker', compose: 'observability' },
    },
  },
  {
    id: 'azure',
    label: 'Microsoft Azure',
    kind: 'cloud',
    provider: 'AZURE',
    status: 'healthy',
    x: 72,
    y: 148,
    w: 128,
    h: 80,
    detail: {
      subtitle: 'Proveedor cloud',
      resourceId: 'provider:azure',
      region: 'global',
      tags: { entorno: 'core' },
    },
  },
  {
    id: 'acc-azure',
    label: 'azure-core',
    kind: 'account',
    provider: 'AZURE',
    status: 'healthy',
    x: 272,
    y: 144,
    w: 144,
    h: 88,
    detail: {
      subtitle: 'Suscripción · 8a2b3c4d-5e6f-7890',
      resourceId: 'account:azure-core',
      account: 'azure-core',
      region: 'multi-region',
      monthlyCost: 2140,
      tags: { owner: 'platform-team' },
    },
  },
  {
    id: 'reg-we',
    label: 'westeurope',
    kind: 'region',
    provider: 'AZURE',
    status: 'healthy',
    x: 452,
    y: 144,
    w: 136,
    h: 88,
    detail: {
      subtitle: 'Región · Europa Occidental',
      resourceId: 'region:westeurope',
      region: 'westeurope',
      account: 'azure-core',
      tags: { dr: 'primary-eu' },
    },
  },
  {
    id: 'vm-app',
    label: 'app-vm-01',
    kind: 'instance',
    provider: 'AZURE',
    status: 'healthy',
    x: 872,
    y: 148,
    w: 180,
    h: 108,
    detail: {
      subtitle: 'VM · Standard_D2s_v5',
      resourceId: 'vm-app-01',
      region: 'westeurope',
      zone: '1',
      account: 'azure-core',
      instanceType: 'Standard_D2s_v5',
      vcpu: 2,
      memoryGb: 8,
      diskGb: 128,
      privateIp: '10.30.12.8',
      publicIp: '20.50.18.44',
      os: 'Ubuntu 22.04 LTS',
      uptime: '9d 2h',
      monthlyCost: 186.4,
      cpuPercent: 28,
      memoryPercent: 52,
      tags: { Name: 'app-vm-01', Role: 'application', Env: 'production' },
    },
  },
]

export const TOPOLOGY_EDGES: TopologyEdge[] = [
  { from: 'aws', to: 'acc-aws', label: 'cuenta' },
  { from: 'acc-aws', to: 'reg-eu', label: 'región' },
  { from: 'reg-eu', to: 'vpc-main', label: 'VPC' },
  { from: 'vpc-main', to: 'web-01', label: 'subnet app' },
  { from: 'vpc-main', to: 'db-01', label: 'subnet db' },
  { from: 'gcp', to: 'k8s', label: 'proyecto' },
  { from: 'k8s', to: 'svc-api', label: 'expone' },
  { from: 'vps-01', to: 'docker-01', label: 'host' },
  { from: 'web-01', to: 'db-01', label: 'TCP 5432' },
  { from: 'azure', to: 'acc-azure', label: 'suscripción' },
  { from: 'acc-azure', to: 'reg-we', label: 'región' },
  { from: 'reg-we', to: 'vm-app', label: 'VNet app' },
]

export type TopologyScopeId = 'aws-prod' | 'gcp-analytics' | 'azure-core' | 'edge-ops'

export interface TopologyScopeMeta {
  id: TopologyScopeId
  title: string
  providers: string[]
  nodeIds: string[]
  lane: { label: string; accent: string }
}

export const TOPOLOGY_SCOPES: Record<TopologyScopeId, TopologyScopeMeta> = {
  'aws-prod': {
    id: 'aws-prod',
    title: 'Producción AWS',
    providers: ['AWS'],
    nodeIds: ['aws', 'acc-aws', 'reg-eu', 'vpc-main', 'web-01', 'db-01'],
    lane: { label: 'Cuenta AWS · eu-west-1', accent: '#ff9900' },
  },
  'gcp-analytics': {
    id: 'gcp-analytics',
    title: 'GCP Analytics',
    providers: ['GCP'],
    nodeIds: ['gcp', 'k8s', 'svc-api'],
    lane: { label: 'Proyecto GCP · europe-west1', accent: '#4285f4' },
  },
  'azure-core': {
    id: 'azure-core',
    title: 'Azure Core',
    providers: ['AZURE'],
    nodeIds: ['azure', 'acc-azure', 'reg-we', 'vm-app'],
    lane: { label: 'Suscripción Azure · westeurope', accent: '#0078d4' },
  },
  'edge-ops': {
    id: 'edge-ops',
    title: 'Edge / On-prem',
    providers: ['VPS', 'Docker'],
    nodeIds: ['vps-01', 'docker-01'],
    lane: { label: 'Infraestructura edge', accent: '#64748b' },
  },
}

/** Asocia cada cuenta cloud conectada con un árbol de topología demo */
export const resolveScopeForCloudAccount = (account: {
  id: string
  provider: string
  name?: string
}): TopologyScopeId | null => {
  const provider = account.provider.toUpperCase()
  if (provider === 'AWS') return 'aws-prod'
  if (provider === 'GCP') return 'gcp-analytics'
  if (provider === 'AZURE') return 'azure-core'
  return null
}

export interface ScopedTopologyLayout {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  width: number
  height: number
  accent: string
  columns: TopologyColumnMeta[]
  headerHeight: number
}

export interface TopologyColumnMeta {
  depth: number
  x: number
  width: number
  label: string
  nodeCount: number
}

const NODE_W = 158
const NODE_H = 132
const COL_GAP = 96
const ROW_GAP = 20
const PAD = 56
const LANE_HEADER = 52
const PIPELINE_ROW_Y = LANE_HEADER + 54

const KIND_SORT_ORDER: TopologyNodeKind[] = [
  'cloud',
  'account',
  'region',
  'network',
  'instance',
  'k8s',
  'service',
  'docker',
  'vps',
]

const COLUMN_KIND_LABELS: Record<TopologyNodeKind, string> = {
  cloud: 'Proveedor',
  account: 'Cuenta',
  region: 'Región',
  network: 'Red / VPC',
  instance: 'Instancias',
  vps: 'Edge / VPS',
  docker: 'Contenedores',
  k8s: 'Kubernetes',
  service: 'Servicios',
}

const columnLabelFor = (nodes: TopologyNode[]): string => {
  for (const kind of KIND_SORT_ORDER) {
    if (nodes.some((n) => n.kind === kind)) return COLUMN_KIND_LABELS[kind]
  }
  return 'Recursos'
}

const depthOfNodes = (
  nodeIds: string[],
  edges: TopologyEdge[],
): Map<string, number> => {
  const depth = new Map<string, number>()
  const incoming = new Map<string, string[]>()
  for (const id of nodeIds) incoming.set(id, [])
  for (const e of edges) {
    if (!incoming.has(e.to)) incoming.set(e.to, [])
    incoming.get(e.to)!.push(e.from)
  }
  const roots = nodeIds.filter((id) => (incoming.get(id)?.length ?? 0) === 0)
  const queue = roots.map((id) => ({ id, d: 0 }))
  const seen = new Set<string>()
  while (queue.length) {
    const { id, d } = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    depth.set(id, d)
    for (const e of edges.filter((x) => x.from === id)) {
      if (!seen.has(e.to)) queue.push({ id: e.to, d: d + 1 })
    }
  }
  for (const id of nodeIds) {
    if (!depth.has(id)) depth.set(id, 0)
  }
  return depth
}

/** Nodos seleccionables como «instancia» en el filtro del mapa */
export const TOPOLOGY_FOCUS_KINDS: TopologyNodeKind[] = ['instance', 'service', 'vps', 'docker']

export const focusTargetsForScope = (
  scope: TopologyScopeMeta,
  allNodes: TopologyNode[],
): TopologyNode[] =>
  scope.nodeIds
    .map((id) => allNodes.find((n) => n.id === id))
    .filter((n): n is TopologyNode => !!n && TOPOLOGY_FOCUS_KINDS.includes(n.kind))

/** Cadena proveedor → … → instancia elegida */
export const nodeIdsOnPathToFocus = (
  focusId: string,
  scopeNodeIds: string[],
  allNodes: TopologyNode[],
  allEdges: TopologyEdge[],
): string[] => {
  const scopeNodes = allNodes.filter((n) => scopeNodeIds.includes(n.id))
  const scopeEdges = allEdges.filter(
    (e) => scopeNodeIds.includes(e.from) && scopeNodeIds.includes(e.to),
  )
  const ancestors = buildAncestorChain(focusId, scopeNodes, scopeEdges)
  return [...ancestors.map((n) => n.id), focusId]
}

/** Flujo horizontal simple: columnas por profundidad, ramas apiladas */
export const layoutScopedTopology = (
  scope: TopologyScopeMeta,
  allNodes: TopologyNode[],
  allEdges: TopologyEdge[],
  focusNodeId: string | null = null,
): ScopedTopologyLayout => {
  let activeIds = [...scope.nodeIds]
  if (focusNodeId && activeIds.includes(focusNodeId)) {
    activeIds = nodeIdsOnPathToFocus(focusNodeId, scope.nodeIds, allNodes, allEdges)
  }

  const idSet = new Set(activeIds)
  const sourceNodes = allNodes.filter((n) => idSet.has(n.id))
  const edges = allEdges.filter((e) => idSet.has(e.from) && idSet.has(e.to))
  const depths = depthOfNodes(activeIds, edges)

  const byDepth = new Map<number, TopologyNode[]>()
  for (const n of sourceNodes) {
    const d = depths.get(n.id) ?? 0
    const list = byDepth.get(d) ?? []
    list.push(n)
    byDepth.set(d, list)
  }

  const depthKeys = [...byDepth.keys()].sort((a, b) => a - b)
  const positioned: TopologyNode[] = []
  const columns: TopologyColumnMeta[] = []
  const maxColSize = Math.max(...depthKeys.map((d) => (byDepth.get(d)?.length ?? 0)), 0)
  const isPipeline = maxColSize === 1
  let x = PAD

  for (const d of depthKeys) {
    const colNodes = [...(byDepth.get(d) ?? [])].sort(
      (a, b) => KIND_SORT_ORDER.indexOf(a.kind) - KIND_SORT_ORDER.indexOf(b.kind),
    )
    columns.push({
      depth: d,
      x,
      width: NODE_W,
      label: columnLabelFor(colNodes),
      nodeCount: colNodes.length,
    })

    if (isPipeline) {
      for (const n of colNodes) {
        positioned.push({ ...n, x, y: PIPELINE_ROW_Y, w: NODE_W, h: NODE_H })
      }
    } else {
      const totalH = colNodes.length * NODE_H + (colNodes.length - 1) * ROW_GAP
      const startY = LANE_HEADER + PAD + Math.max(0, (200 - totalH) / 2)
      let y = startY
      for (const n of colNodes) {
        positioned.push({ ...n, x, y, w: NODE_W, h: NODE_H })
        y += NODE_H + ROW_GAP
      }
    }
    x += NODE_W + COL_GAP
  }

  const width = Math.max(720, x + PAD)
  const maxBottom = isPipeline
    ? PIPELINE_ROW_Y + NODE_H
    : Math.max(...positioned.map((n) => n.y + n.h), NODE_H + LANE_HEADER)
  const height = Math.max(260, maxBottom + PAD)

  return {
    nodes: positioned,
    edges,
    width,
    height,
    accent: scope.lane.accent,
    columns,
    headerHeight: LANE_HEADER,
  }
}

export const patchAccountNodeLabel = (
  nodes: TopologyNode[],
  accountNodeId: string,
  accountName: string,
): TopologyNode[] =>
  nodes.map((n) => {
    if (n.id !== accountNodeId) return n
    const subtitle =
      n.kind === 'account'
        ? `Cuenta · ${accountName}`
        : n.kind === 'cloud'
          ? `Proyecto · ${accountName}`
          : n.detail.subtitle
    return { ...n, label: accountName, detail: { ...n.detail, subtitle } }
  })

export const accountNodeIdForScope = (scopeId: TopologyScopeId): string | null => {
  if (scopeId === 'aws-prod') return 'acc-aws'
  if (scopeId === 'gcp-analytics') return 'gcp'
  if (scopeId === 'azure-core') return 'acc-azure'
  return null
}

export const KIND_LABELS: Record<TopologyNodeKind, string> = {
  cloud: 'Proveedor',
  account: 'Cuenta',
  region: 'Región',
  network: 'Red / VPC',
  instance: 'Instancia',
  vps: 'VPS',
  docker: 'Docker',
  k8s: 'Kubernetes',
  service: 'Servicio',
}

export const KIND_ICONS: Record<TopologyNodeKind, string> = {
  cloud: 'cloud',
  account: 'account_balance',
  region: 'public',
  network: 'lan',
  instance: 'dns',
  vps: 'computer',
  docker: 'view_in_ar',
  k8s: 'hub',
  service: 'settings_ethernet',
}

export const STATUS_LABELS: Record<TopologyStatus, string> = {
  healthy: 'Saludable',
  warning: 'Advertencia',
  critical: 'Crítico',
}

export const providerLogo = (provider: string): NavLogoKey | null => {
  const p = provider.toUpperCase()
  if (p === 'AWS') return 'aws'
  if (p === 'GCP') return 'gcp'
  if (p === 'AZURE') return 'azure'
  if (p === 'DOCKER') return 'docker'
  if (p === 'K8S') return 'kubernetes'
  return null
}

/** Logo oficial por nodo (proveedor, K8s, Docker, DB, etc.) */
export const nodeLogoKey = (node: TopologyNode): NavLogoKey | null => {
  if (node.logoKey) return node.logoKey
  const brand = providerLogo(node.provider)
  if (brand && ['cloud', 'account', 'network', 'instance'].includes(node.kind)) return brand
  if (node.kind === 'k8s' || node.kind === 'service') return 'kubernetes'
  if (node.kind === 'docker') return 'docker'
  return null
}

export const resolveNodeModuleRoute = (node: TopologyNode): string | null => {
  if (node.detail.moduleRoute) return node.detail.moduleRoute
  const p = node.provider.toUpperCase()
  switch (node.kind) {
    case 'cloud':
    case 'account':
      if (p === 'AWS') return '/cloud/aws/overview'
      if (p === 'GCP') return '/cloud/gcp/overview'
      if (p === 'AZURE') return '/cloud/azure/overview'
      return null
    case 'region':
      if (p === 'AWS') return '/cloud/aws/instances'
      if (p === 'GCP') return '/cloud/gcp/instances'
      if (p === 'AZURE') return '/cloud/azure/instances'
      return '/network'
    case 'network':
      return '/network'
    case 'instance':
      return '/instances/all-instances'
    case 'k8s':
      return '/kubernetes/pods'
    case 'service':
      return '/kubernetes/pods'
    case 'docker':
      return '/docker/containers'
    case 'vps':
      return '/vps/overview'
    default:
      return null
  }
}

export const resolveNodeMetricsRoute = (node: TopologyNode): string => {
  if (node.detail.metricsRoute) return node.detail.metricsRoute
  if (node.kind === 'docker') return '/docker/metrics'
  if (node.kind === 'k8s' || node.kind === 'service') return '/kubernetes/metrics'
  return '/health-center'
}

export const resolveRunbookIdForNode = (node: TopologyNode): string => {
  if (node.detail.runbookId) return node.detail.runbookId
  if (node.logoKey === 'postgresql' || node.label.toLowerCase().includes('db')) return 'rb-pg-backup'
  if (node.kind === 'k8s' || node.kind === 'service' || node.status === 'critical') return 'rb-k8s-pods'
  if ((node.detail.cpuPercent ?? 0) >= 70 || node.status === 'warning') return 'rb-cpu'
  if (node.kind === 'docker' || node.label.toLowerCase().includes('nginx')) return 'rb-nginx'
  return 'rb-cpu'
}

export const scopeMetricAverages = (
  nodes: TopologyNode[],
): { avgCpu: number | null; avgMemory: number | null; avgHealth: number | null } => ({
  avgCpu: metricAverage(nodes.map((n) => n.detail.cpuPercent)),
  avgMemory: metricAverage(nodes.map((n) => n.detail.memoryPercent)),
  avgHealth: metricAverage(nodes.map((n) => n.detail.healthScore)),
})

export const buildAncestorChain = (
  nodeId: string,
  nodes: TopologyNode[],
  edges: TopologyEdge[],
): TopologyNode[] => {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const chain: TopologyNode[] = []
  let current = nodeId
  const visited = new Set<string>()
  while (current && !visited.has(current)) {
    visited.add(current)
    const parentEdge = edges.find((e) => e.to === current)
    if (!parentEdge) break
    const parent = byId.get(parentEdge.from)
    if (!parent) break
    chain.unshift(parent)
    current = parent.id
  }
  return chain
}

export const nodeAnchor = (
  node: TopologyNode,
  side: 'left' | 'right' | 'top' | 'bottom',
): { x: number; y: number } => {
  switch (side) {
    case 'left':
      return { x: node.x, y: node.y + node.h / 2 }
    case 'right':
      return { x: node.x + node.w, y: node.y + node.h / 2 }
    case 'top':
      return { x: node.x + node.w / 2, y: node.y }
    case 'bottom':
      return { x: node.x + node.w / 2, y: node.y + node.h }
  }
}

/** Conector ortogonal estilo draw.io con esquinas redondeadas */
export const edgePath = (from: TopologyNode, to: TopologyNode, radius = 12): string => {
  const start = nodeAnchor(from, 'right')
  const end = nodeAnchor(to, 'left')
  const midX = (start.x + end.x) / 2

  if (Math.abs(start.y - end.y) < 1) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
  }

  const r = Math.min(
    radius,
    Math.abs(end.y - start.y) / 2 - 0.5,
    (midX - start.x) / 2 - 0.5,
    (end.x - midX) / 2 - 0.5,
  )

  if (r < 2) {
    return `M ${start.x} ${start.y} H ${midX} V ${end.y} H ${end.x}`
  }

  const sy = start.y
  const ey = end.y
  const goingDown = ey > sy

  if (goingDown) {
    return [
      `M ${start.x} ${sy}`,
      `H ${midX - r}`,
      `Q ${midX} ${sy} ${midX} ${sy + r}`,
      `V ${ey - r}`,
      `Q ${midX} ${ey} ${midX + r} ${ey}`,
      `H ${end.x}`,
    ].join(' ')
  }

  return [
    `M ${start.x} ${sy}`,
    `H ${midX - r}`,
    `Q ${midX} ${sy} ${midX} ${sy - r}`,
    `V ${ey + r}`,
    `Q ${midX} ${ey} ${midX + r} ${ey}`,
    `H ${end.x}`,
  ].join(' ')
}

export interface TopologyEdgeGeometry {
  path: string
  labelX: number
  labelY: number
  label?: string
}

export const buildEdgeGeometry = (
  from: TopologyNode,
  to: TopologyNode,
  label?: string,
): TopologyEdgeGeometry => {
  const start = nodeAnchor(from, 'right')
  const end = nodeAnchor(to, 'left')
  const midX = (start.x + end.x) / 2
  return {
    path: edgePath(from, to),
    labelX: midX,
    labelY: (start.y + end.y) / 2 - 5,
    label,
  }
}

export const edgeMidpoint = (
  from: TopologyNode,
  to: TopologyNode,
): { x: number; y: number } => {
  const a = nodeAnchor(from, 'right')
  const b = nodeAnchor(to, 'left')
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

const ts = (): string =>
  new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

export interface TopologyConnection {
  node: TopologyNode
  edgeLabel?: string
  direction: 'in' | 'out'
}

export const getNodeConnections = (
  nodeId: string,
  nodes: TopologyNode[],
  edges: TopologyEdge[],
): TopologyConnection[] => {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const out: TopologyConnection[] = []
  for (const e of edges) {
    if (e.from === nodeId) {
      const n = byId.get(e.to)
      if (n) out.push({ node: n, edgeLabel: e.label, direction: 'out' })
    }
    if (e.to === nodeId) {
      const n = byId.get(e.from)
      if (n) out.push({ node: n, edgeLabel: e.label, direction: 'in' })
    }
  }
  return out
}

export const supplementNodeDetail = (node: TopologyNode): TopologyNode => {
  const d = node.detail
  const healthScore =
    d.healthScore ??
    (node.status === 'healthy' ? 96 : node.status === 'warning' ? 71 : 38)
  const alertsActive =
    d.alertsActive ?? (node.status === 'critical' ? 2 : node.status === 'warning' ? 1 : 0)

  const defaultEvents: TopologyNodeEvent[] =
    node.status === 'critical'
      ? [
          { time: ts(), message: 'Umbral crítico superado', severity: 'critical' },
          { time: ts(), message: 'Alerta activa sin ack', severity: 'warning' },
        ]
      : node.status === 'warning'
        ? [{ time: ts(), message: 'Métrica fuera de rango objetivo', severity: 'warning' }]
        : [{ time: ts(), message: 'Sync inventario completado', severity: 'info' }]

  return {
    ...node,
    detail: {
      ...d,
      owner: d.owner ?? 'platform@cloudops',
      team: d.team ?? 'Platform',
      environment: d.environment ?? 'production',
      lastSync: d.lastSync ?? ts(),
      syncSource: d.syncSource ?? `${node.provider} · inventario`,
      compliance: d.compliance ?? 'SOC2 · cifrado activo',
      healthScore,
      alertsActive,
      events: d.events ?? defaultEvents,
      description:
        d.description ??
        `${KIND_LABELS[node.kind]} · ${d.subtitle} · gestionado desde CloudOps`,
      moduleRoute: d.moduleRoute ?? resolveNodeModuleRoute(node) ?? undefined,
      metricsRoute: d.metricsRoute ?? resolveNodeMetricsRoute(node),
      runbookId: d.runbookId ?? resolveRunbookIdForNode(node),
    },
  }
}

export const enrichTopologyNodes = (nodes: TopologyNode[]): TopologyNode[] =>
  nodes.map(supplementNodeDetail)

export const topologyCostTotal = (nodes: TopologyNode[]): number =>
  nodes.reduce((sum, n) => sum + (n.detail.monthlyCost ?? 0), 0)

export const metricAverage = (values: (number | undefined)[]): number | null => {
  const nums = values.filter((v): v is number => v != null)
  if (!nums.length) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

/** Subtítulo corto bajo el nombre en la tarjeta del diagrama */
export const nodeCardFact = (node: TopologyNode): string | null => {
  const d = node.detail
  if (d.privateIp && d.privateIp !== '—') return d.privateIp
  if (d.region) return d.region
  if (d.vpc) return d.vpc
  if (d.instanceType) return d.instanceType
  if (d.account) return d.account
  return null
}

/** Etiquetas compactas para tarjetas del pipeline */
export const nodeCardTags = (node: TopologyNode): string[] => {
  const d = node.detail
  const tags: string[] = []
  if (d.environment) tags.push(d.environment)
  if (d.zone) tags.push(d.zone)
  if (d.monthlyCost != null) tags.push(`${Math.round(d.monthlyCost)} €`)
  if (d.healthScore != null) tags.push(`Salud ${d.healthScore}%`)
  return tags.slice(0, 2)
}

export interface TopologyInstanceOption {
  id: string
  label: string
}

const INSTANCE_PLACEHOLDER_IDS: Record<TopologyScopeId, string[]> = {
  'aws-prod': ['web-01', 'db-01'],
  'gcp-analytics': ['svc-api'],
  'azure-core': ['vm-app'],
  'edge-ops': ['docker-01'],
}

const INSTANCE_PARENT_ID: Record<TopologyScopeId, string> = {
  'aws-prod': 'vpc-main',
  'gcp-analytics': 'k8s',
  'azure-core': 'reg-we',
  'edge-ops': 'vps-01',
}

export const REGION_NODE_ID: Partial<Record<TopologyScopeId, string>> = {
  'aws-prod': 'reg-eu',
  'azure-core': 'reg-we',
}

export const instanceStatusToTopology = (status?: string): TopologyStatus => {
  const s = (status ?? 'RUNNING').toUpperCase()
  if (['ERROR', 'CRITICAL', 'FAILED', 'STOPPED', 'TERMINATED'].includes(s)) return 'critical'
  if (['WARNING', 'DEGRADED', 'PENDING', 'STOPPING', 'STARTING'].includes(s)) return 'warning'
  return 'healthy'
}

export const normalizeCloudInstanceRow = (
  raw: unknown,
  account: Pick<CloudAccount, 'id' | 'name' | 'provider' | 'defaultRegion'>,
): Instance | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = String(r['id'] ?? '')
  if (!id) return null
  const meta = (r['metadata'] ?? {}) as Record<string, unknown>
  return {
    id,
    name: String(r['name'] ?? id),
    provider: String(r['provider'] ?? account.provider),
    region: r['region'] != null ? String(r['region']) : account.defaultRegion,
    status: r['status'] != null ? String(r['status']) : 'RUNNING',
    instanceType: r['instanceType'] != null ? String(r['instanceType']) : undefined,
    cloudAccountId: account.id,
    publicIp: meta['publicIp'] != null ? String(meta['publicIp']) : undefined,
    privateIp: meta['privateIp'] != null ? String(meta['privateIp']) : undefined,
    os: meta['os'] != null ? String(meta['os']) : undefined,
    environment: meta['environment'] != null ? String(meta['environment']) : undefined,
    cpuCores: typeof meta['vcpus'] === 'number' ? meta['vcpus'] : undefined,
    ramGb: typeof meta['memoryGb'] === 'number' ? meta['memoryGb'] : undefined,
    monthlyCost: typeof meta['monthlyCost'] === 'number' ? meta['monthlyCost'] : undefined,
    isDemo: meta['isDemo'] === true,
  }
}

/** Reparte instancias demo sin cloudAccountId entre cuentas del mismo proveedor */
export const filterInstancesForAccount = (
  instances: Instance[],
  account: CloudAccount,
  allAccounts: CloudAccount[],
): Instance[] => {
  const byAccount = instances.filter((i) => i.cloudAccountId === account.id)
  if (byAccount.length) return byAccount

  const provider = account.provider.toUpperCase()
  const byProvider = instances.filter(
    (i) => String(i.provider).toUpperCase() === provider && !i.isVps,
  )
  if (!byProvider.length) return []

  const siblings = allAccounts.filter((a) => a.provider.toUpperCase() === provider)
  if (siblings.length <= 1) return byProvider

  const idx = siblings.findIndex((a) => a.id === account.id)
  if (idx < 0) return byProvider
  const perAccount = Math.max(1, Math.ceil(byProvider.length / siblings.length))
  return byProvider.slice(idx * perAccount, (idx + 1) * perAccount)
}

export const topologyNodeFromInstance = (
  inst: Instance,
  account: Pick<CloudAccount, 'name' | 'provider'>,
  parentNetwork?: TopologyNodeDetail,
): TopologyNode => {
  const status = instanceStatusToTopology(inst.status)
  const provider = String(inst.provider ?? account.provider).toUpperCase()
  const typeLabel =
    provider === 'AWS' ? 'EC2' : provider === 'GCP' ? 'GCE' : provider === 'AZURE' ? 'VM' : 'Compute'

  return {
    id: `inst-${inst.id}`,
    label: inst.name,
    kind: 'instance',
    provider: account.provider,
    status,
    x: 0,
    y: 0,
    w: NODE_W,
    h: NODE_H,
    detail: {
      subtitle: `${typeLabel} · ${inst.instanceType ?? '—'}`,
      resourceId: inst.id,
      region: inst.region,
      account: account.name,
      instanceType: inst.instanceType,
      vcpu: inst.cpuCores,
      memoryGb: inst.ramGb,
      diskGb: inst.diskGb,
      privateIp: inst.privateIp,
      publicIp: inst.publicIp,
      os: inst.os,
      environment: inst.environment,
      vpc: parentNetwork?.vpc,
      subnet: parentNetwork?.subnet,
      monthlyCost: inst.monthlyCost,
      cpuPercent:
        status === 'warning' ? 76 : status === 'critical' ? 12 : 34 + (inst.name.length % 28),
      memoryPercent:
        status === 'warning' ? 68 : status === 'critical' ? 8 : 40 + (inst.id.length % 22),
      moduleRoute: `/instances/all-instances`,
      metricsRoute: '/health-center',
    },
  }
}

export const mergeAccountInstancesIntoScope = (
  scope: TopologyScopeMeta,
  allNodes: TopologyNode[],
  allEdges: TopologyEdge[],
  instances: Instance[],
  account: CloudAccount,
): { nodes: TopologyNode[]; edges: TopologyEdge[]; scope: TopologyScopeMeta } => {
  if (!instances.length) {
    return { nodes: allNodes, edges: allEdges, scope }
  }

  const placeholders = new Set(INSTANCE_PLACEHOLDER_IDS[scope.id] ?? [])
  const parentId = INSTANCE_PARENT_ID[scope.id]
  const parentNode = allNodes.find((n) => n.id === parentId)
  const parentNetwork = parentNode?.kind === 'network' ? parentNode.detail : undefined

  const scopeNodeIds = scope.nodeIds.filter((id) => !placeholders.has(id))
  const extraNodes: TopologyNode[] = []
  const extraEdges: TopologyEdge[] = []

  for (const inst of instances) {
    const nodeId = `inst-${inst.id}`
    scopeNodeIds.push(nodeId)
    extraNodes.push(topologyNodeFromInstance(inst, account, parentNetwork))
    extraEdges.push({
      from: parentId,
      to: nodeId,
      label: inst.region ?? inst.instanceType ?? 'compute',
    })
  }

  const filteredEdges = allEdges.filter((e) => !placeholders.has(e.from) && !placeholders.has(e.to))

  return {
    nodes: [...allNodes.filter((n) => !placeholders.has(n.id)), ...extraNodes],
    edges: [...filteredEdges, ...extraEdges],
    scope: { ...scope, nodeIds: scopeNodeIds },
  }
}

export const patchRegionNodeLabel = (
  nodes: TopologyNode[],
  regionNodeId: string,
  region: string,
): TopologyNode[] =>
  nodes.map((n) => {
    if (n.id !== regionNodeId) return n
    return {
      ...n,
      label: region,
      detail: {
        ...n.detail,
        subtitle: `Región · ${region}`,
        region,
      },
    }
  })

export const instanceOptionsFromScope = (
  scope: TopologyScopeMeta,
  allNodes: TopologyNode[],
  accountInstances: Instance[],
): TopologyInstanceOption[] => {
  if (accountInstances.length) {
    return accountInstances.map((inst) => ({
      id: `inst-${inst.id}`,
      label: inst.name,
    }))
  }
  return focusTargetsForScope(scope, allNodes).map((n) => ({ id: n.id, label: n.label }))
}

export const primaryRegionForInstances = (
  instances: Instance[],
  fallback?: string,
): string | undefined => {
  if (!instances.length) return fallback
  const counts = new Map<string, number>()
  for (const inst of instances) {
    const r = inst.region ?? fallback
    if (!r) continue
    counts.set(r, (counts.get(r) ?? 0) + 1)
  }
  if (!counts.size) return fallback
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}
