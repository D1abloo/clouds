const ts = (secAgo: number) => new Date(Date.now() - secAgo * 1000).toISOString()

export type AdminUserRow = {
  id: string
  email: string
  name: string
  role: string
  department: string
  status: string
  lastLogin: string
  created: string
  mfa: boolean
  ssoProvider?: string
  sessions?: number
}

export type AdminUserAuditRow = {
  id: string
  user: string
  action: string
  resource: string
  ip: string
  at: string
  status: string
}

export type AdminUserSsoRow = {
  id: string
  email: string
  provider: string
  externalId: string
  mappedRole: string
  lastSync: string
  status: string
}

export type AdminUserSessionRow = {
  id: string
  user: string
  device: string
  ip: string
  location: string
  started: string
  lastActive: string
  status: string
}

export const ADMIN_USERS_ACTIVE: AdminUserRow[] = [
  { id: 'u-1', email: 'admin@cloudops.local', name: 'Admin User', role: 'Super Admin', department: 'Plataforma', status: 'running', lastLogin: ts(120), created: ts(86400 * 400), mfa: true, sessions: 2 },
  { id: 'u-2', email: 'ops@cloudops', name: 'María García', role: 'Admin', department: 'Operaciones', status: 'running', lastLogin: ts(600), created: ts(86400 * 300), mfa: true, ssoProvider: 'Okta', sessions: 1 },
  { id: 'u-3', email: 'dev@cloudops', name: 'Carlos Ruiz', role: 'Operator', department: 'Ingeniería', status: 'running', lastLogin: ts(3600), created: ts(86400 * 180), mfa: false, sessions: 1 },
  { id: 'u-4', email: 'platform@cloudops', name: 'Laura Méndez', role: 'Admin', department: 'Plataforma', status: 'running', lastLogin: ts(7200), created: ts(86400 * 250), mfa: true, ssoProvider: 'Azure AD', sessions: 1 },
  { id: 'u-5', email: 'finance@cloudops', name: 'Pedro Sánchez', role: 'Viewer', department: 'Finanzas', status: 'running', lastLogin: ts(86400), created: ts(86400 * 120), mfa: false, sessions: 1 },
  { id: 'u-6', email: 'security@cloudops', name: 'Ana Torres', role: 'Admin', department: 'Seguridad', status: 'running', lastLogin: ts(1800), created: ts(86400 * 200), mfa: true, ssoProvider: 'Okta', sessions: 2 },
  { id: 'u-7', email: 'qa@cloudops', name: 'Diego López', role: 'Operator', department: 'QA', status: 'running', lastLogin: ts(14400), created: ts(86400 * 90), mfa: false, sessions: 1 },
  { id: 'u-8', email: 'sre@cloudops', name: 'Elena Vargas', role: 'Operator', department: 'SRE', status: 'running', lastLogin: ts(900), created: ts(86400 * 150), mfa: true, sessions: 1 },
  { id: 'u-9', email: 'jenkins-ci', name: 'Jenkins CI', role: 'Service Account', department: 'Automatización', status: 'running', lastLogin: ts(60), created: ts(86400 * 365), mfa: false, sessions: 0 },
  { id: 'u-10', email: 'terraform-sa', name: 'Terraform SA', role: 'Service Account', department: 'IaC', status: 'running', lastLogin: ts(300), created: ts(86400 * 300), mfa: false, sessions: 0 },
  { id: 'u-11', email: 'monitor@cloudops', name: 'Monitor Bot', role: 'Service Account', department: 'Observabilidad', status: 'running', lastLogin: ts(30), created: ts(86400 * 200), mfa: false, sessions: 0 },
  { id: 'u-12', email: 'backup-sa', name: 'Backup SA', role: 'Service Account', department: 'Infraestructura', status: 'running', lastLogin: ts(86400), created: ts(86400 * 180), mfa: false, sessions: 0 },
  { id: 'u-13', email: 'partner@acme.com', name: 'Partner ACME', role: 'Viewer', department: 'Externo', status: 'running', lastLogin: ts(86400 * 2), created: ts(86400 * 60), mfa: true, ssoProvider: 'SAML', sessions: 1 },
  { id: 'u-14', email: 'demo@cloudops.local', name: 'Demo User', role: 'Admin', department: 'Demo', status: 'running', lastLogin: ts(450), created: ts(86400 * 30), mfa: false, sessions: 1 },
  { id: 'u-15', email: 'oncall@cloudops', name: 'Guardia On-call', role: 'Operator', department: 'Operaciones', status: 'running', lastLogin: ts(2400), created: ts(86400 * 100), mfa: true, sessions: 1 },
  { id: 'u-16', email: 'dba@cloudops', name: 'Roberto Díaz', role: 'Operator', department: 'Datos', status: 'running', lastLogin: ts(10800), created: ts(86400 * 220), mfa: true, sessions: 1 },
]

export const ADMIN_USERS_INVITED: AdminUserRow[] = [
  { id: 'u-17', email: 'nuevo@cloudops', name: 'Invitación pendiente', role: 'Operator', department: 'Ingeniería', status: 'pending', lastLogin: '—', created: ts(86400 * 2), mfa: false },
  { id: 'u-18', email: 'consultor@externo.io', name: 'Invitación pendiente', role: 'Viewer', department: 'Consultoría', status: 'pending', lastLogin: '—', created: ts(86400 * 5), mfa: false },
  { id: 'u-19', email: 'intern@cloudops', name: 'Invitación pendiente', role: 'Viewer', department: 'Formación', status: 'pending', lastLogin: '—', created: ts(86400), mfa: false },
  { id: 'u-20', email: 'vendor@partner.net', name: 'Invitación pendiente', role: 'Viewer', department: 'Externo', status: 'pending', lastLogin: '—', created: ts(86400 * 3), mfa: false },
]

export const ADMIN_USERS_SUSPENDED: AdminUserRow[] = [
  { id: 'u-21', email: 'ex-employee@cloudops', name: 'Juan Ex-empleado', role: 'Operator', department: 'Operaciones', status: 'stopped', lastLogin: ts(86400 * 45), created: ts(86400 * 500), mfa: false },
  { id: 'u-22', email: 'compromised@test.io', name: 'Cuenta comprometida', role: 'Admin', department: 'Legacy', status: 'stopped', lastLogin: ts(86400 * 10), created: ts(86400 * 400), mfa: false },
  { id: 'u-23', email: 'inactive@cloudops', name: 'Usuario inactivo', role: 'Viewer', department: 'Finanzas', status: 'stopped', lastLogin: ts(86400 * 90), created: ts(86400 * 600), mfa: false },
  { id: 'u-24', email: 'trial@cloudops', name: 'Trial expirado', role: 'Viewer', department: 'Demo', status: 'stopped', lastLogin: ts(86400 * 30), created: ts(86400 * 120), mfa: false },
]

export const ADMIN_USERS_AUDIT: AdminUserAuditRow[] = [
  { id: 'ua-1', user: 'admin@cloudops.local', action: 'login.success', resource: 'auth', ip: '10.0.1.42', at: ts(120), status: 'running' },
  { id: 'ua-2', user: 'ops@cloudops', action: 'user.invite', resource: 'nuevo@cloudops', ip: '10.0.1.18', at: ts(86400 * 2), status: 'running' },
  { id: 'ua-3', user: 'security@cloudops', action: 'user.suspend', resource: 'compromised@test.io', ip: '10.0.2.5', at: ts(86400 * 10), status: 'running' },
  { id: 'ua-4', user: 'admin@cloudops.local', action: 'role.assign', resource: 'dev@cloudops → Operator', ip: '10.0.1.42', at: ts(86400 * 5), status: 'running' },
  { id: 'ua-5', user: 'platform@cloudops', action: 'mfa.reset', resource: 'qa@cloudops', ip: '10.0.1.33', at: ts(86400 * 3), status: 'running' },
  { id: 'ua-6', user: 'compromised@test.io', action: 'login.failed', resource: 'auth', ip: '203.0.113.55', at: ts(86400 * 10), status: 'stopped' },
  { id: 'ua-7', user: 'ops@cloudops', action: 'session.revoke', resource: 'ex-employee@cloudops', ip: '10.0.1.18', at: ts(86400 * 45), status: 'running' },
  { id: 'ua-8', user: 'admin@cloudops.local', action: 'sso.sync', resource: 'Okta directory', ip: '10.0.1.42', at: ts(3600), status: 'running' },
]

export const ADMIN_USERS_SSO: AdminUserSsoRow[] = [
  { id: 'sso-1', email: 'ops@cloudops', provider: 'Okta', externalId: '00u1abc2def', mappedRole: 'Admin', lastSync: ts(3600), status: 'running' },
  { id: 'sso-2', email: 'platform@cloudops', provider: 'Azure AD', externalId: 'a1b2c3d4-e5f6', mappedRole: 'Admin', lastSync: ts(7200), status: 'running' },
  { id: 'sso-3', email: 'security@cloudops', provider: 'Okta', externalId: '00u9xyz8wvu', mappedRole: 'Admin', lastSync: ts(1800), status: 'running' },
  { id: 'sso-4', email: 'partner@acme.com', provider: 'SAML (ACME IdP)', externalId: 'acme-user-4421', mappedRole: 'Viewer', lastSync: ts(86400), status: 'running' },
  { id: 'sso-5', email: 'sre@cloudops', provider: 'Google Workspace', externalId: 'sre@cloudops', mappedRole: 'Operator', lastSync: ts(14400), status: 'warning' },
]

export const ADMIN_USERS_SESSIONS: AdminUserSessionRow[] = [
  { id: 'ses-1', user: 'admin@cloudops.local', device: 'Chrome 124 · Linux', ip: '10.0.1.42', location: 'Madrid, ES', started: ts(7200), lastActive: ts(120), status: 'running' },
  { id: 'ses-2', user: 'admin@cloudops.local', device: 'Safari 17 · macOS', ip: '192.168.1.88', location: 'Madrid, ES', started: ts(86400), lastActive: ts(3600), status: 'running' },
  { id: 'ses-3', user: 'ops@cloudops', device: 'Firefox 125 · Windows', ip: '10.0.1.18', location: 'Barcelona, ES', started: ts(14400), lastActive: ts(600), status: 'running' },
  { id: 'ses-4', user: 'dev@cloudops', device: 'Chrome 124 · Linux', ip: '10.0.3.12', location: 'Valencia, ES', started: ts(28800), lastActive: ts(3600), status: 'running' },
  { id: 'ses-5', user: 'security@cloudops', device: 'Edge 124 · Windows', ip: '10.0.2.5', location: 'Madrid, ES', started: ts(43200), lastActive: ts(1800), status: 'running' },
  { id: 'ses-6', user: 'demo@cloudops.local', device: 'Chrome 124 · Linux', ip: '127.0.0.1', location: 'Local', started: ts(3600), lastActive: ts(450), status: 'running' },
  { id: 'ses-7', user: 'partner@acme.com', device: 'Chrome 123 · macOS', ip: '198.51.100.22', location: 'Remote', started: ts(86400 * 2), lastActive: ts(86400 * 2), status: 'warning' },
]

export const adminUsersKpis = () => ({
  total: ADMIN_USERS_ACTIVE.length + ADMIN_USERS_INVITED.length + ADMIN_USERS_SUSPENDED.length,
  active: ADMIN_USERS_ACTIVE.length,
  invited: ADMIN_USERS_INVITED.length,
  suspended: ADMIN_USERS_SUSPENDED.length,
  mfaEnabled: ADMIN_USERS_ACTIVE.filter((u) => u.mfa).length,
  sessions: ADMIN_USERS_SESSIONS.filter((s) => s.status === 'running').length,
})

export type AdminUserActivitySlice = { label: string; pct: number; color: string }

export type AdminUserProfile = AdminUserRow & {
  title: string
  phone: string
  timezone: string
  location: string
  permissions: string[]
  loginSpark: number[]
  activityMix: AdminUserActivitySlice[]
  apiTokensCount: number
  failedLogins24h: number
  lastPasswordChange: string
  invitedBy?: string
  mfaMethod?: string
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high'
  suspendedAt?: string
  suspendReason?: string
  loginCount30d: number
  groups: string[]
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin': ['admin.*', 'cloud.*', 'vps.*', 'terraform.*', 'jenkins.*', 'users.*', 'audit.read'],
  Admin: ['cloud.read', 'cloud.write', 'vps.*', 'terraform.apply', 'jenkins.read', 'users.read', 'audit.read'],
  Operator: ['cloud.read', 'vps.read', 'vps.restart', 'jenkins.trigger', 'terraform.plan', 'logs.read'],
  Viewer: ['cloud.read', 'vps.read', 'dashboard.read', 'metrics.read', 'logs.read'],
  'Service Account': ['api.tokens', 'metrics.push', 'webhooks.receive'],
}

const seedFromId = (id: string): number => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

export const sparkPath = (points: number[], w = 140, h = 36): string => {
  const pad = 2
  const max = Math.max(...points, 1)
  return points
    .map((p, i) => {
      const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2)
      const y = pad + (1 - p / max) * (h - pad * 2)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export const enrichUserProfile = (user: AdminUserRow): AdminUserProfile => {
  const seed = seedFromId(user.id)
  const permissions = ROLE_PERMISSIONS[user.role] ?? ['dashboard.read']
  const loginSpark = Array.from({ length: 7 }, (_, i) => 15 + ((seed + i * 17) % 85))
  const webPct = 40 + (seed % 35)
  const apiPct = user.role === 'Service Account' ? 55 : 15 + (seed % 25)
  const mobilePct = Math.max(0, 100 - webPct - apiPct)
  const activityMix: AdminUserActivitySlice[] = [
    { label: 'Web UI', pct: webPct, color: '#2563eb' },
    { label: 'API / CLI', pct: apiPct, color: '#0d9488' },
    { label: 'Móvil', pct: mobilePct, color: '#9333ea' },
  ]
  const riskScore = user.status === 'stopped' ? 78 : user.mfa ? 12 + (seed % 20) : 45 + (seed % 30)
  const riskLevel: AdminUserProfile['riskLevel'] =
    riskScore >= 60 ? 'high' : riskScore >= 35 ? 'medium' : 'low'

  return {
    ...user,
    title: user.role === 'Service Account' ? 'Cuenta de servicio' : ['Lead', 'Senior', 'Engineer', 'Analyst'][seed % 4],
    phone: user.role === 'Service Account' ? '—' : `+34 6${String(10000000 + (seed % 89999999)).slice(0, 8)}`,
    timezone: 'Europe/Madrid (UTC+1)',
    location: ['Madrid, ES', 'Barcelona, ES', 'Valencia, ES', 'Remote'][seed % 4],
    permissions,
    loginSpark,
    activityMix,
    apiTokensCount: user.role === 'Service Account' ? 1 + (seed % 3) : seed % 2,
    failedLogins24h: user.status === 'stopped' ? 3 + (seed % 8) : seed % 3,
    lastPasswordChange: ts(86400 * (30 + (seed % 120))),
    invitedBy: user.status === 'pending' ? 'ops@cloudops' : undefined,
    mfaMethod: user.mfa ? (seed % 2 === 0 ? 'TOTP (Authenticator)' : 'WebAuthn (Passkey)') : undefined,
    riskScore,
    riskLevel,
    suspendedAt: user.status === 'stopped' ? ts(86400 * (10 + (seed % 40))) : undefined,
    suspendReason:
      user.status === 'stopped'
        ? ['Cuenta comprometida', 'Baja del empleado', 'Inactividad prolongada', 'Trial expirado'][seed % 4]
        : undefined,
    loginCount30d: user.status === 'pending' ? 0 : 8 + (seed % 120),
    groups: [user.department, user.role === 'Admin' ? 'on-call' : 'all-staff'].filter(Boolean),
  }
}

export const getUserSessions = (email: string): AdminUserSessionRow[] =>
  ADMIN_USERS_SESSIONS.filter((s) => s.user === email)

export const getUserAudit = (email: string): AdminUserAuditRow[] =>
  ADMIN_USERS_AUDIT.filter((a) => a.user === email || a.resource.includes(email)).slice(0, 6)

export const getUserSso = (email: string): AdminUserSsoRow | undefined =>
  ADMIN_USERS_SSO.find((s) => s.email === email)

export type RoleDistribution = { role: string; count: number; color: string }

export const adminUsersRoleDistribution = (): RoleDistribution[] => {
  const all = [...ADMIN_USERS_ACTIVE, ...ADMIN_USERS_INVITED, ...ADMIN_USERS_SUSPENDED]
  const colors = ['#2563eb', '#4f46e5', '#0d9488', '#64748b', '#9333ea']
  const counts = new Map<string, number>()
  for (const u of all) counts.set(u.role, (counts.get(u.role) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([role, count], i) => ({ role, count, color: colors[i % colors.length] }))
}

export const adminUsersMfaDonut = () => {
  const active = ADMIN_USERS_ACTIVE
  const withMfa = active.filter((u) => u.mfa).length
  const without = active.length - withMfa
  const total = active.length
  return {
    withMfa,
    without,
    total,
    pct: total ? Math.round((withMfa / total) * 100) : 0,
    segments: [
      { label: 'MFA activo', count: withMfa, color: '#15803d', pct: total ? Math.round((withMfa / total) * 100) : 0 },
      { label: 'Sin MFA', count: without, color: '#f59e0b', pct: total ? Math.round((without / total) * 100) : 0 },
    ],
  }
}

export const activityDonutSegments = (mix: AdminUserActivitySlice[]): { color: string; dash: number; offset: number }[] => {
  const circumference = 302
  let offset = 0
  return mix.map((s) => {
    const dash = (s.pct / 100) * circumference
    const seg = { color: s.color, dash, offset: -offset }
    offset += dash
    return seg
  })
}
