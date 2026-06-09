import type { AdminPermissionRow, AdminRoleAssignmentRow, AdminRoleRow } from './admin-roles.types'

type ApiRole = {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  permissions?: { permission: { id: string; resource: string; action: string; description: string | null } }[]
}

type ApiUser = {
  id: string
  email: string
  name: string | null
  isActive: boolean
  createdAt: string
  userRoles?: { role: { name: string }; project?: { name: string } | null }[]
}

export const mapApiRoleToRow = (role: ApiRole, usersCount = 0): AdminRoleRow => ({
  id: role.id,
  name: role.name,
  slug: role.name,
  description: role.description ?? '',
  usersCount,
  permissionsCount: role.permissions?.length ?? 0,
  status: 'running',
  builtin: true,
  created: role.createdAt,
  updated: role.updatedAt,
})

export const permissionsFromApiRoles = (roles: ApiRole[]): AdminPermissionRow[] => {
  const byId = new Map<string, AdminPermissionRow>()
  for (const role of roles) {
    const roleSlug = role.name.toLowerCase()
    for (const rp of role.permissions ?? []) {
      const p = rp.permission
      const existing = byId.get(p.id) ?? {
        id: p.id,
        resource: p.resource,
        action: p.action,
        description: p.description ?? '',
        superAdmin: false,
        admin: false,
        operator: false,
        viewer: false,
      }
      if (roleSlug.includes('super')) existing.superAdmin = true
      else if (roleSlug.includes('admin')) existing.admin = true
      else if (roleSlug.includes('oper')) existing.operator = true
      else existing.viewer = true
      byId.set(p.id, existing)
    }
  }
  return [...byId.values()]
}

export const assignmentsFromApiUsers = (users: ApiUser[]): AdminRoleAssignmentRow[] =>
  users.flatMap((user) =>
    (user.userRoles ?? []).map((ur, idx) => ({
      id: `${user.id}-${idx}`,
      user: user.email,
      userName: user.name ?? user.email,
      department: '—',
      role: ur.role.name,
      scope: ur.project?.name ?? 'global',
      assignedBy: 'sistema',
      assignedAt: user.createdAt,
      status: user.isActive ? 'running' : 'stopped',
      mfa: false,
      lastLogin: user.createdAt,
    })),
  )
