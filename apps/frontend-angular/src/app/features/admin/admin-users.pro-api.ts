import type { AdminUserProfile, AdminUserRow, RoleDistribution } from './admin-users.types'

type ApiUser = {
  id: string
  email: string
  name: string | null
  isActive: boolean
  createdAt: string
  userRoles?: { role: { name: string } }[]
}

export const mapApiUserToRow = (user: ApiUser): AdminUserRow => {
  const role = user.userRoles?.[0]?.role?.name ?? 'sin_rol'
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    role,
    department: '—',
    status: user.isActive ? 'running' : 'stopped',
    lastLogin: user.createdAt,
    created: user.createdAt,
    mfa: false,
    sessions: 0,
  }
}

export const roleDistributionFromUsers = (users: AdminUserRow[]): RoleDistribution[] => {
  const colors = ['#2563eb', '#4f46e5', '#0d9488', '#64748b', '#9333ea']
  const counts = new Map<string, number>()
  for (const u of users) counts.set(u.role, (counts.get(u.role) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([role, count], i) => ({ role, count, color: colors[i % colors.length] }))
}

export const mfaDonutFromUsers = (users: AdminUserRow[]) => {
  const withMfa = users.filter((u) => u.mfa).length
  const without = users.length - withMfa
  const total = users.length
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

export const enrichUserProfilePro = (user: AdminUserRow): AdminUserProfile => ({
  ...user,
  title: user.role,
  phone: '—',
  timezone: 'Europe/Madrid (UTC+1)',
  location: '—',
  permissions: [],
  loginSpark: [0, 0, 0, 0, 0, 0, 0],
  activityMix: [
    { label: 'Web UI', pct: 100, color: '#2563eb' },
    { label: 'API / CLI', pct: 0, color: '#0d9488' },
    { label: 'Móvil', pct: 0, color: '#9333ea' },
  ],
  apiTokensCount: 0,
  failedLogins24h: 0,
  lastPasswordChange: user.created,
  riskLevel: 'low',
  riskScore: 15,
  mfaMethod: user.mfa ? 'TOTP' : undefined,
  groups: user.department !== '—' ? [user.department] : [],
  loginCount30d: 0,
})

export const activityDonutSegmentsPro = (
  mix: AdminUserProfile['activityMix'],
): { color: string; dash: number; offset: number }[] => {
  const circumference = 302
  let offset = 0
  return mix.map((s) => {
    const dash = (s.pct / 100) * circumference
    const seg = { color: s.color, dash, offset: -offset }
    offset += dash
    return seg
  })
}

export const loginSparkPathPro = (values: number[]): string => {
  if (!values.length) return ''
  const max = Math.max(...values, 1)
  const w = 120
  const h = 32
  return values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w
      const y = h - (v / max) * h
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
