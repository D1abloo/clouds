const ADMIN_ROLE_ALIASES = new Set([
  'superadministrador',
  'super_admin',
  'administrador',
  'admin',
])

export const isAdminUser = (roles: string[] | undefined): boolean =>
  (roles ?? []).some((r) => ADMIN_ROLE_ALIASES.has(r.toLowerCase()))

export const canManageRoles = (roles: string[] | undefined): boolean => isAdminUser(roles)
