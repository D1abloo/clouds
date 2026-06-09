const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()

export interface AccessAssignment {
  id: string
  user: string
  role: string
  scope: string
  status: string
  grantedAt: string
  expiresAt?: string
  mfa: boolean
}

export interface IamPolicy {
  id: string
  name: string
  resources: string
  permissions: number
  status: string
  lastReview: string
}

export interface SshAccess {
  id: string
  user: string
  host: string
  key: string
  method: string
  status: string
  lastLogin: string
}

export interface CloudPermission {
  id: string
  principal: string
  provider: string
  service: string
  actions: string
  status: string
}

export interface AccessViolation {
  id: string
  user: string
  violation: string
  resource: string
  severity: string
  status: string
  detectedAt: string
}

export const defaultAssignments = (): AccessAssignment[] => []

export const defaultIamPolicies = (): IamPolicy[] => []

export const defaultSshAccess = (): SshAccess[] => []

export const defaultCloudPermissions = (): CloudPermission[] => []

export const defaultAccessViolations = (): AccessViolation[] => []
