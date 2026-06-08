import { RBAC_SUPER_ROLE_ALIASES } from './rbac.catalog'

export const formatPermissionCode = (resource: string, action: string): string =>
  `${resource}.${action}`

export const isSuperRole = (roleNames: string[] | undefined): boolean =>
  (roleNames ?? []).some((r) => RBAC_SUPER_ROLE_ALIASES.includes(r as (typeof RBAC_SUPER_ROLE_ALIASES)[number]))

export const hasAnyPermission = (
  userPermissions: string[] | undefined,
  userRoles: string[] | undefined,
  required: string[],
): boolean => {
  if (!required.length) return true
  if (isSuperRole(userRoles)) return true
  const perms = userPermissions ?? []
  return required.some((p) => perms.includes(p))
}
