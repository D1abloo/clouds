export type AdminRoleRow = {
  id: string
  name: string
  slug: string
  description: string
  usersCount: number
  permissionsCount: number
  status: string
  builtin: boolean
  created: string
  updated: string
}

export type AdminPermissionRow = {
  id: string
  resource: string
  action: string
  description: string
  superAdmin: boolean
  admin: boolean
  operator: boolean
  viewer: boolean
}

export type AdminRoleAssignmentRow = {
  id: string
  user: string
  userName: string
  department: string
  role: string
  scope: string
  assignedBy: string
  assignedAt: string
  status: string
  mfa?: boolean
  lastLogin?: string
}
