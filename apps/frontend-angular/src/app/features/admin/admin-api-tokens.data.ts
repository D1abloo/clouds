const ts = (secAgo: number) => new Date(Date.now() - secAgo * 1000).toISOString()

export type ApiTokenRow = {
  id: string
  name: string
  prefix: string
  scope: string
  owner: string
  created: string
  lastUsed: string
  expires?: string
  status: string
  revokedBy?: string
  revokedAt?: string
  reason?: string
  endpoint?: string
  ip?: string
  method?: string
  environment?: string
  calls24h?: number
  userAgent?: string
  responseMs?: number
  httpStatus?: number
}

export type ApiTokenRotationPolicy = {
  id: string
  name: string
  intervalDays: number
  scope: string
  tokensCount: number
  status: string
  lastRun: string
  nextRun: string
  description: string
}

export const API_TOKENS_ACTIVE: ApiTokenRow[] = [
  {
    id: 'tok-1',
    name: 'CI Jenkins',
    prefix: 'co_live_••••••••4f2a',
    scope: 'read:instances, write:jenkins',
    owner: 'jenkins-ci',
    created: ts(86400 * 30),
    lastUsed: ts(120),
    status: 'running',
    environment: 'production',
    calls24h: 842,
    userAgent: 'Jenkins/2.426 CloudOps-Plugin/1.4',
  },
  {
    id: 'tok-2',
    name: 'Monitorización',
    prefix: 'co_live_••••••••9b1c',
    scope: 'read:metrics, read:alerts',
    owner: 'ops@cloudops',
    created: ts(86400 * 60),
    lastUsed: ts(45),
    status: 'running',
    environment: 'production',
    calls24h: 1240,
    userAgent: 'Prometheus-Exporter/0.9',
  },
  {
    id: 'tok-3',
    name: 'Terraform SA',
    prefix: 'co_live_••••••••2d8e',
    scope: 'write:terraform, read:inventory',
    owner: 'terraform-sa',
    created: ts(86400 * 90),
    lastUsed: ts(600),
    status: 'running',
    environment: 'production',
    calls24h: 156,
    userAgent: 'Terraform/1.7.5',
  },
  {
    id: 'tok-4',
    name: 'App móvil',
    prefix: 'co_live_••••••••7c3a',
    scope: 'read:dashboard',
    owner: 'dev@cloudops',
    created: ts(86400 * 14),
    lastUsed: ts(3600),
    status: 'running',
    environment: 'staging',
    calls24h: 89,
    userAgent: 'CloudOps-Mobile/2.1 (iOS)',
  },
  {
    id: 'tok-9',
    name: 'Backup nocturno',
    prefix: 'co_live_••••••••3e91',
    scope: 'read:instances, read:inventory',
    owner: 'backup-sa',
    created: ts(86400 * 45),
    lastUsed: ts(86400),
    status: 'running',
    environment: 'production',
    calls24h: 12,
    userAgent: 'Velero/1.12',
  },
  {
    id: 'tok-11',
    name: 'SIEM export',
    prefix: 'co_live_••••••••6f77',
    scope: 'read:logs, read:alerts',
    owner: 'security@cloudops',
    created: ts(86400 * 20),
    lastUsed: ts(300),
    status: 'running',
    environment: 'production',
    calls24h: 420,
    userAgent: 'Splunk-HEC/1.0',
  },
]

export const API_TOKENS_EXPIRING: ApiTokenRow[] = [
  {
    id: 'tok-5',
    name: 'Integración legacy',
    prefix: 'co_live_••••••••1a0f',
    scope: 'full',
    owner: 'partner-legacy',
    created: ts(86400 * 400),
    lastUsed: ts(86400),
    expires: ts(-86400 * 14),
    status: 'warning',
    environment: 'production',
    calls24h: 3,
  },
  {
    id: 'tok-6',
    name: 'Partner readonly',
    prefix: 'co_live_••••••••8e22',
    scope: 'read:*',
    owner: 'acme-corp',
    created: ts(86400 * 200),
    lastUsed: ts(86400 * 2),
    expires: ts(-86400 * 30),
    status: 'warning',
    environment: 'production',
    calls24h: 28,
  },
  {
    id: 'tok-10',
    name: 'Staging E2E',
    prefix: 'co_live_••••••••5c44',
    scope: 'read:dashboard, read:metrics',
    owner: 'qa@cloudops',
    created: ts(86400 * 80),
    lastUsed: ts(86400 * 5),
    expires: ts(-86400 * 7),
    status: 'warning',
    environment: 'staging',
    calls24h: 0,
  },
]

export const API_TOKENS_REVOKED: ApiTokenRow[] = [
  {
    id: 'tok-7',
    name: 'CI antiguo',
    prefix: 'co_rev_••••••••',
    scope: 'write:jenkins',
    owner: 'jenkins-ci',
    created: ts(86400 * 500),
    lastUsed: ts(86400 * 40),
    status: 'stopped',
    revokedBy: 'admin@cloudops',
    revokedAt: ts(86400 * 10),
    reason: 'Rotación programada',
    environment: 'production',
  },
  {
    id: 'tok-8',
    name: 'Debug temporal',
    prefix: 'co_rev_••••••••',
    scope: 'read:logs',
    owner: 'ops@cloudops',
    created: ts(86400 * 5),
    lastUsed: ts(86400 * 4),
    status: 'stopped',
    revokedBy: 'ops@cloudops',
    revokedAt: ts(86400 * 3),
    reason: 'Acceso temporal finalizado',
    environment: 'staging',
  },
  {
    id: 'tok-11',
    name: 'Consultor externo',
    prefix: 'co_rev_••••••••',
    scope: 'read:instances',
    owner: 'consultant@ext.io',
    created: ts(86400 * 60),
    lastUsed: ts(86400 * 25),
    status: 'stopped',
    revokedBy: 'security@cloudops',
    revokedAt: ts(86400 * 20),
    reason: 'Fin de proyecto — offboarding',
    environment: 'production',
  },
]

export const API_TOKENS_AUDIT: ApiTokenRow[] = [
  {
    id: 'aud-1',
    name: 'CI Jenkins',
    prefix: 'co_live_••••4f2a',
    scope: 'write:jenkins',
    owner: 'jenkins-ci',
    created: ts(0),
    lastUsed: ts(8),
    endpoint: 'POST /api/v1/jenkins/trigger',
    method: 'POST',
    ip: '10.0.4.12',
    status: 'success',
    responseMs: 142,
    httpStatus: 200,
    userAgent: 'Jenkins/2.426 CloudOps-Plugin/1.4',
  },
  {
    id: 'aud-2',
    name: 'Monitorización',
    prefix: 'co_live_••••9b1c',
    scope: 'read:metrics',
    owner: 'ops@cloudops',
    created: ts(0),
    lastUsed: ts(22),
    endpoint: 'GET /api/v1/metrics/summary',
    method: 'GET',
    ip: '10.0.2.5',
    status: 'success',
    responseMs: 38,
    httpStatus: 200,
    userAgent: 'Prometheus-Exporter/0.9',
  },
  {
    id: 'aud-3',
    name: 'Integración legacy',
    prefix: 'co_live_••••1a0f',
    scope: 'read:instances',
    owner: 'partner-legacy',
    created: ts(0),
    lastUsed: ts(55),
    endpoint: 'GET /api/v1/instances',
    method: 'GET',
    ip: '203.0.113.8',
    status: 'failed',
    responseMs: 1200,
    httpStatus: 403,
    userAgent: 'curl/8.4.0',
  },
  {
    id: 'aud-4',
    name: 'Terraform SA',
    prefix: 'co_live_••••2d8e',
    scope: 'write:terraform',
    owner: 'terraform-sa',
    created: ts(0),
    lastUsed: ts(180),
    endpoint: 'POST /api/v1/terraform/runs',
    method: 'POST',
    ip: '10.0.8.22',
    status: 'success',
    responseMs: 890,
    httpStatus: 201,
    userAgent: 'Terraform/1.7.5',
  },
  {
    id: 'aud-5',
    name: 'App móvil',
    prefix: 'co_live_••••7c3a',
    scope: 'read:dashboard',
    owner: 'dev@cloudops',
    created: ts(0),
    lastUsed: ts(420),
    endpoint: 'GET /api/v1/dashboard/kpis',
    method: 'GET',
    ip: '192.168.1.44',
    status: 'success',
    responseMs: 95,
    httpStatus: 200,
    userAgent: 'CloudOps-Mobile/2.1 (iOS)',
  },
  {
    id: 'aud-6',
    name: 'Integración legacy',
    prefix: 'co_live_••••1a0f',
    scope: 'read:instances',
    owner: 'partner-legacy',
    created: ts(0),
    lastUsed: ts(720),
    endpoint: 'GET /api/v1/instances/i-0a2b3c',
    method: 'GET',
    ip: '203.0.113.8',
    status: 'failed',
    responseMs: 45,
    httpStatus: 429,
    userAgent: 'curl/8.4.0',
  },
]

export const API_TOKEN_SCOPES = []

export const API_TOKEN_ROTATION_POLICIES: ApiTokenRotationPolicy[] = [
  {
    id: 'pol-1',
    name: 'CI/CD tokens — 90 días',
    intervalDays: 90,
    scope: 'write:jenkins, write:terraform',
    tokensCount: 3,
    status: 'running',
    lastRun: ts(86400 * 10),
    nextRun: ts(-86400 * 80),
    description: 'Rotación automática de tokens de pipelines con ventana de gracia de 7 días.',
  },
  {
    id: 'pol-2',
    name: 'Partner readonly — 180 días',
    intervalDays: 180,
    scope: 'read:*, read:instances',
    tokensCount: 2,
    status: 'running',
    lastRun: ts(86400 * 45),
    nextRun: ts(-86400 * 135),
    description: 'Revisión manual obligatoria antes de emitir el nuevo token al partner.',
  },
  {
    id: 'pol-3',
    name: 'Full access — 30 días',
    intervalDays: 30,
    scope: 'full',
    tokensCount: 1,
    status: 'warning',
    lastRun: ts(86400 * 28),
    nextRun: ts(-86400 * 2),
    description: 'Tokens de acceso completo con aprobación dual y alerta 14 días antes.',
  },
]

export const apiTokenKpis = () => ({
  active: API_TOKENS_ACTIVE.length,
  expiring: API_TOKENS_EXPIRING.length,
  calls24h: API_TOKENS_AUDIT.length + 1847,
  revoked30d: API_TOKENS_REVOKED.length,
})

export type ApiTokenProfile = ApiTokenRow & {
  rotationPolicy: string
  daysUntilExpiry: number | null
  rateLimit: string
  lastEndpoints: string[]
  integrations: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

const tokenSeed = (id: string): number => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

export const enrichTokenProfile = (token: ApiTokenRow): ApiTokenProfile => {
  const seed = tokenSeed(token.id)
  const policies = ['CI/CD tokens — 90 días', 'Partner readonly — 180 días', 'Full access — 30 días', 'Sin política automática']
  const endpoints = token.endpoint
    ? [token.endpoint]
    : [
        'GET /api/v1/instances',
        'POST /api/v1/jenkins/trigger',
        'GET /api/v1/metrics/summary',
      ].slice(0, 1 + (seed % 3))
  const daysUntilExpiry = token.expires
    ? Math.ceil((new Date(token.expires).getTime() - Date.now()) / 86_400_000)
    : null
  const riskLevel: ApiTokenProfile['riskLevel'] =
    token.scope.includes('full') ? 'high' : token.status === 'warning' ? 'medium' : 'low'

  return {
    ...token,
    rotationPolicy: token.scope.includes('full') ? policies[2] : policies[seed % policies.length],
    daysUntilExpiry,
    rateLimit: `${500 + (seed % 1500)} req/h`,
    lastEndpoints: endpoints,
    integrations: [token.owner, token.name.split(' ')[0]].filter(Boolean),
    riskLevel,
  }
}

export type ApiTokenAuditProfile = ApiTokenRow & {
  requestId: string
  region: string
  threatLevel: 'low' | 'medium' | 'high'
  callsFromIp24h: number
  payloadSize: string
  cacheHit: boolean
  authMethod: string
  latencyBucket: 'fast' | 'normal' | 'slow'
  relatedFromIp: number
}

export const enrichAuditEntry = (entry: ApiTokenRow): ApiTokenAuditProfile => {
  const seed = tokenSeed(entry.id)
  const isPrivateIp = entry.ip?.startsWith('10.') || entry.ip?.startsWith('192.168.')
  const isFailed = entry.status === 'failed' || (entry.httpStatus != null && entry.httpStatus >= 400)
  const isExternal = entry.ip?.startsWith('203.') || entry.ip?.startsWith('185.')
  const threatLevel: ApiTokenAuditProfile['threatLevel'] =
    isFailed && isExternal ? 'high' : isFailed ? 'medium' : isExternal ? 'medium' : 'low'
  const responseMs = entry.responseMs ?? 100
  const latencyBucket: ApiTokenAuditProfile['latencyBucket'] =
    responseMs < 100 ? 'fast' : responseMs < 500 ? 'normal' : 'slow'

  return {
    ...entry,
    requestId: `req_${entry.id.replace('aud-', '')}${(seed % 9999).toString().padStart(4, '0')}`,
    region: isPrivateIp ? 'VPC interna (eu-west-1)' : seed % 2 === 0 ? 'Internet — EU' : 'Internet — US',
    threatLevel,
    callsFromIp24h: isFailed ? 12 + (seed % 40) : 2 + (seed % 8),
    payloadSize: `${(seed % 48) + 1} KB`,
    cacheHit: entry.method === 'GET' && seed % 3 === 0,
    authMethod: 'Bearer token (header)',
    latencyBucket,
    relatedFromIp: API_TOKENS_AUDIT.filter((a) => a.ip === entry.ip).length,
  }
}

export const findTokenForAudit = (entry: ApiTokenRow): ApiTokenRow | undefined => {
  const prefixKey = entry.prefix.replace(/•/g, '').slice(0, 12)
  return [...API_TOKENS_ACTIVE, ...API_TOKENS_EXPIRING].find((t) =>
    t.prefix.replace(/•/g, '').startsWith(prefixKey.slice(0, 8)),
  )
}
