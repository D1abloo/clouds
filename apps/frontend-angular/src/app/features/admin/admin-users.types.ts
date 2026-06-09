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

export type RoleDistribution = { role: string; count: number; color: string }
