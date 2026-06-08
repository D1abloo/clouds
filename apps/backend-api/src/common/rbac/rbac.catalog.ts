/** Códigos de permiso: recurso.acción (p. ej. usuarios.leer) */
export const RBAC_PERMISSIONS = [
  { resource: 'usuarios', action: 'leer', description: 'Ver usuarios y perfiles' },
  { resource: 'usuarios', action: 'crear', description: 'Crear usuarios' },
  { resource: 'usuarios', action: 'editar', description: 'Editar usuarios' },
  { resource: 'usuarios', action: 'eliminar', description: 'Eliminar usuarios' },
  { resource: 'roles', action: 'gestionar', description: 'Gestionar roles y asignaciones' },
  { resource: 'infraestructura', action: 'leer', description: 'Ver infraestructura e inventario' },
  { resource: 'infraestructura', action: 'gestionar', description: 'Operar y modificar infraestructura' },
  { resource: 'nubes', action: 'conectar', description: 'Conectar cuentas cloud' },
  { resource: 'repositorios', action: 'conectar', description: 'Conectar repositorios Git' },
  { resource: 'seguridad', action: 'leer', description: 'Ver políticas y postura de seguridad' },
  { resource: 'seguridad', action: 'gestionar', description: 'Gestionar seguridad y secretos' },
  { resource: 'auditoria', action: 'leer', description: 'Consultar registros de auditoría' },
  { resource: 'configuracion', action: 'gestionar', description: 'Gestionar configuración de la plataforma' },
] as const

export type RbacPermissionCode = `${(typeof RBAC_PERMISSIONS)[number]['resource']}.${(typeof RBAC_PERMISSIONS)[number]['action']}`

export const rbacPermissionCode = (resource: string, action: string): string => `${resource}.${action}`

export const RBAC_ROLES = [
  { name: 'superadministrador', description: 'Superadministrador — acceso total' },
  { name: 'administrador', description: 'Administrador — gestión operativa y configuración' },
  { name: 'operador', description: 'Operador — ejecución de infraestructura y repositorios' },
  { name: 'auditor', description: 'Auditor — lectura de auditoría y cumplimiento' },
  { name: 'solo_lectura', description: 'Solo lectura — consulta sin cambios' },
] as const

export type RbacRoleName = (typeof RBAC_ROLES)[number]['name']

export const RBAC_SUPER_ROLES: RbacRoleName[] = ['superadministrador']

/** Alias legacy para instalaciones previas al cutover PRO */
export const RBAC_SUPER_ROLE_ALIASES = ['super_admin', 'superadministrador'] as const

const ALL_CODES = RBAC_PERMISSIONS.map((p) => rbacPermissionCode(p.resource, p.action))

export const RBAC_ROLE_PERMISSIONS: Record<RbacRoleName, readonly string[]> = {
  superadministrador: ALL_CODES,
  administrador: [
    'usuarios.leer',
    'usuarios.crear',
    'usuarios.editar',
    'usuarios.eliminar',
    'roles.gestionar',
    'infraestructura.leer',
    'infraestructura.gestionar',
    'nubes.conectar',
    'repositorios.conectar',
    'seguridad.leer',
    'seguridad.gestionar',
    'auditoria.leer',
    'configuracion.gestionar',
  ],
  operador: [
    'infraestructura.leer',
    'infraestructura.gestionar',
    'repositorios.conectar',
    'seguridad.leer',
  ],
  auditor: [
    'usuarios.leer',
    'infraestructura.leer',
    'seguridad.leer',
    'auditoria.leer',
  ],
  solo_lectura: [
    'usuarios.leer',
    'infraestructura.leer',
    'seguridad.leer',
    'auditoria.leer',
  ],
}

export const PLATFORM_SETTINGS_PRO = {
  nombre_app: 'Spendlyx',
  modo: 'PRO',
  dominio: 'https://spendlyx.com',
  idioma: 'es',
} as const
