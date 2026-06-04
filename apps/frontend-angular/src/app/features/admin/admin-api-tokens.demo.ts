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
    expires: ts(86400 * 14),
    status: 'warning',
  },
  {
    id: 'tok-6',
    name: 'Partner readonly',
    prefix: 'co_live_••••••••8e22',
    scope: 'read:*',
    owner: 'acme-corp',
    created: ts(86400 * 200),
    lastUsed: ts(86400 * 2),
    expires: ts(86400 * 30),
    status: 'warning',
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
  },
]

export const API_TOKEN_SCOPES = [
  { scope: 'read:instances', description: 'Listar y ver instancias cloud/VPS' },
  { scope: 'write:jenkins', description: 'Disparar jobs y pipelines Jenkins' },
  { scope: 'read:metrics', description: 'Consultar métricas y dashboards' },
  { scope: 'write:terraform', description: 'Ejecutar planes y applies Terraform' },
  { scope: 'read:dashboard', description: 'Solo lectura del panel principal' },
  { scope: 'full', description: 'Acceso completo (solo administradores)' },
]
