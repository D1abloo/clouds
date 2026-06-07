const ts = (secAgo: number) => new Date(Date.now() - secAgo * 1000).toISOString()

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

export const ADMIN_ROLES: AdminRoleRow[] = [
  {
    id: 'role-1',
    name: 'Super Admin',
    slug: 'super_admin',
    description: 'Acceso completo a la plataforma, gestión de usuarios, roles y configuración global.',
    usersCount: 1,
    permissionsCount: 48,
    status: 'running',
    builtin: true,
    created: ts(86400 * 500),
    updated: ts(86400 * 30),
  },
  {
    id: 'role-2',
    name: 'Admin',
    slug: 'admin',
    description: 'Administración operativa: instancias, despliegues, alertas e integraciones sin cambios de RBAC global.',
    usersCount: 4,
    permissionsCount: 36,
    status: 'running',
    builtin: true,
    created: ts(86400 * 500),
    updated: ts(86400 * 14),
  },
  {
    id: 'role-3',
    name: 'Operator',
    slug: 'operator',
    description: 'Ejecución de runbooks, despliegues, terminal SSH y operaciones de infraestructura acotadas.',
    usersCount: 6,
    permissionsCount: 24,
    status: 'running',
    builtin: true,
    created: ts(86400 * 500),
    updated: ts(86400 * 7),
  },
  {
    id: 'role-4',
    name: 'Viewer',
    slug: 'viewer',
    description: 'Solo lectura: dashboards, métricas, alertas e inventario sin acciones destructivas.',
    usersCount: 5,
    permissionsCount: 12,
    status: 'running',
    builtin: true,
    created: ts(86400 * 500),
    updated: ts(86400 * 60),
  },
  {
    id: 'role-5',
    name: 'Finanzas readonly',
    slug: 'finance_viewer',
    description: 'Rol personalizado: lectura de facturación, costes e informes sin acceso a infraestructura.',
    usersCount: 2,
    permissionsCount: 8,
    status: 'running',
    builtin: false,
    created: ts(86400 * 120),
    updated: ts(86400 * 5),
  },
  {
    id: 'role-6',
    name: 'Partner externo',
    slug: 'partner_readonly',
    description: 'Acceso acotado a recursos compartidos con partners — solo lectura y webhooks de auditoría.',
    usersCount: 1,
    permissionsCount: 6,
    status: 'running',
    builtin: false,
    created: ts(86400 * 60),
    updated: ts(86400 * 2),
  },
]

export const ADMIN_PERMISSIONS: AdminPermissionRow[] = [
  { id: 'p-1', resource: 'cloud.instances', action: 'read', description: 'Ver instancias cloud', superAdmin: true, admin: true, operator: true, viewer: true },
  { id: 'p-2', resource: 'cloud.instances', action: 'write', description: 'Crear, modificar y eliminar instancias', superAdmin: true, admin: true, operator: true, viewer: false },
  { id: 'p-3', resource: 'vps', action: 'manage', description: 'Operaciones VPS: SSH, validación, rotación', superAdmin: true, admin: true, operator: true, viewer: false },
  { id: 'p-4', resource: 'terraform', action: 'apply', description: 'Ejecutar terraform apply en workspaces', superAdmin: true, admin: true, operator: false, viewer: false },
  { id: 'p-5', resource: 'jenkins', action: 'trigger', description: 'Disparar builds y pipelines', superAdmin: true, admin: true, operator: true, viewer: false },
  { id: 'p-6', resource: 'alerts', action: 'acknowledge', description: 'Reconocer y silenciar alertas', superAdmin: true, admin: true, operator: true, viewer: false },
  { id: 'p-7', resource: 'billing', action: 'read', description: 'Ver facturación y costes', superAdmin: true, admin: true, operator: false, viewer: false },
  { id: 'p-8', resource: 'secrets', action: 'read', description: 'Leer metadatos de secretos (no valores)', superAdmin: true, admin: true, operator: false, viewer: false },
  { id: 'p-9', resource: 'users', action: 'manage', description: 'Invitar, suspender y asignar roles', superAdmin: true, admin: false, operator: false, viewer: false },
  { id: 'p-10', resource: 'api-tokens', action: 'manage', description: 'Emitir y revocar tokens API', superAdmin: true, admin: true, operator: false, viewer: false },
  { id: 'p-11', resource: 'audit', action: 'export', description: 'Exportar logs de auditoría', superAdmin: true, admin: true, operator: false, viewer: false },
  { id: 'p-12', resource: 'settings', action: 'write', description: 'Modificar configuración global', superAdmin: true, admin: false, operator: false, viewer: false },
]

export const ADMIN_ROLE_ASSIGNMENTS: AdminRoleAssignmentRow[] = [
  { id: 'as-1', user: 'admin@cloudops.local', userName: 'Admin User', department: 'Plataforma', role: 'Super Admin', scope: 'Global', assignedBy: 'system', assignedAt: ts(86400 * 500), status: 'running', mfa: true, lastLogin: ts(120) },
  { id: 'as-2', user: 'ops@cloudops', userName: 'María García', department: 'Operaciones', role: 'Admin', scope: 'Global', assignedBy: 'admin@cloudops.local', assignedAt: ts(86400 * 300), status: 'running', mfa: true, lastLogin: ts(600) },
  { id: 'as-3', user: 'platform@cloudops', userName: 'Laura Méndez', department: 'Plataforma', role: 'Admin', scope: 'Global', assignedBy: 'admin@cloudops.local', assignedAt: ts(86400 * 250), status: 'running', mfa: true, lastLogin: ts(7200) },
  { id: 'as-4', user: 'security@cloudops', userName: 'Ana Torres', department: 'Seguridad', role: 'Admin', scope: 'Global', assignedBy: 'admin@cloudops.local', assignedAt: ts(86400 * 200), status: 'running', mfa: true, lastLogin: ts(1800) },
  { id: 'as-5', user: 'dev@cloudops', userName: 'Carlos Ruiz', department: 'Ingeniería', role: 'Operator', scope: 'Proyecto: staging', assignedBy: 'ops@cloudops', assignedAt: ts(86400 * 180), status: 'running', mfa: false, lastLogin: ts(3600) },
  { id: 'as-6', user: 'sre@cloudops', userName: 'Elena Vargas', department: 'SRE', role: 'Operator', scope: 'Global', assignedBy: 'ops@cloudops', assignedAt: ts(86400 * 150), status: 'running', mfa: true, lastLogin: ts(900) },
  { id: 'as-7', user: 'finance@cloudops', userName: 'Pedro Sánchez', department: 'Finanzas', role: 'Finanzas readonly', scope: 'Facturación', assignedBy: 'admin@cloudops.local', assignedAt: ts(86400 * 120), status: 'running', mfa: false, lastLogin: ts(86400) },
  { id: 'as-8', user: 'partner@acme.com', userName: 'Partner ACME', department: 'Externo', role: 'Partner externo', scope: 'Tenant: ACME', assignedBy: 'security@cloudops', assignedAt: ts(86400 * 60), status: 'running', mfa: true, lastLogin: ts(86400 * 2) },
  { id: 'as-9', user: 'ex-employee@cloudops', userName: 'Juan Ex-empleado', department: 'Operaciones', role: 'Operator', scope: 'Global', assignedBy: 'ops@cloudops', assignedAt: ts(86400 * 500), status: 'stopped', mfa: false, lastLogin: ts(86400 * 45) },
  { id: 'as-10', user: 'qa@cloudops', userName: 'Diego López', department: 'QA', role: 'Operator', scope: 'Proyecto: qa-lab', assignedBy: 'ops@cloudops', assignedAt: ts(86400 * 90), status: 'running', mfa: false, lastLogin: ts(14400) },
  { id: 'as-11', user: 'demo@cloudops.local', userName: 'Demo User', department: 'Demo', role: 'Admin', scope: 'Global', assignedBy: 'admin@cloudops.local', assignedAt: ts(86400 * 30), status: 'running', mfa: false, lastLogin: ts(450) },
  { id: 'as-12', user: 'dba@cloudops', userName: 'Roberto Díaz', department: 'Datos', role: 'Operator', scope: 'Proyecto: prod-db', assignedBy: 'platform@cloudops', assignedAt: ts(86400 * 220), status: 'running', mfa: true, lastLogin: ts(10800) },
]

export const ADMIN_ROLE_NAMES = ADMIN_ROLES.map((r) => r.name)

export const ADMIN_ROLE_SCOPES = [
  'Global',
  'Proyecto: staging',
  'Proyecto: production',
  'Proyecto: qa-lab',
  'Proyecto: prod-db',
  'Facturación',
  'Tenant: ACME',
  'Tenant: interno',
]

export const getAssignmentsForRole = (roleName: string, assignments: AdminRoleAssignmentRow[]): AdminRoleAssignmentRow[] =>
  assignments.filter((a) => a.role === roleName && a.status === 'running')

export type RoleDistributionBar = { role: string; count: number; color: string; builtin: boolean }

export const adminRolesUserDistribution = (assignments: AdminRoleAssignmentRow[]): RoleDistributionBar[] => {
  const colors = ['#4f46e5', '#6366f1', '#0d9488', '#64748b', '#d97706', '#9333ea']
  const counts = new Map<string, number>()
  for (const a of assignments.filter((x) => x.status === 'running')) {
    counts.set(a.role, (counts.get(a.role) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([role, count], i) => ({
      role,
      count,
      color: colors[i % colors.length],
      builtin: ADMIN_ROLES.find((r) => r.name === role)?.builtin ?? false,
    }))
}

export type PermissionCategorySlice = { label: string; count: number; pct: number; color: string }

export const adminPermissionCategoryMix = (): PermissionCategorySlice[] => {
  const categories = [
    { label: 'Cloud / VPS', match: (r: string) => r.startsWith('cloud') || r.startsWith('vps'), color: '#4f46e5' },
    { label: 'CI / Terraform', match: (r: string) => r.startsWith('jenkins') || r.startsWith('terraform'), color: '#0d9488' },
    { label: 'Seguridad', match: (r: string) => r.startsWith('secrets') || r.startsWith('audit') || r.startsWith('users'), color: '#dc2626' },
    { label: 'Ops / Alertas', match: (r: string) => r.startsWith('alerts') || r.startsWith('api'), color: '#d97706' },
    { label: 'Admin / Billing', match: (r: string) => r.startsWith('billing') || r.startsWith('settings'), color: '#9333ea' },
  ]
  const total = ADMIN_PERMISSIONS.length
  return categories.map((c) => {
    const count = ADMIN_PERMISSIONS.filter((p) => c.match(p.resource)).length
    return { label: c.label, count, pct: total ? Math.round((count / total) * 100) : 0, color: c.color }
  }).filter((s) => s.count > 0)
}

export const permissionDonutSegments = (slices: PermissionCategorySlice[]): { color: string; dash: number; offset: number }[] => {
  const circumference = 302
  let offset = 0
  return slices.map((s) => {
    const dash = (s.pct / 100) * circumference
    const seg = { color: s.color, dash, offset: -offset }
    offset += dash
    return seg
  })
}

export const ASSIGNABLE_USERS = [
  { email: 'dev@cloudops', name: 'Carlos Ruiz', department: 'Ingeniería' },
  { email: 'qa@cloudops', name: 'Diego López', department: 'QA' },
  { email: 'oncall@cloudops', name: 'Guardia On-call', department: 'Operaciones' },
  { email: 'nuevo@cloudops', name: 'Invitación pendiente', department: 'Ingeniería' },
  { email: 'consultor@externo.io', name: 'Consultor externo', department: 'Consultoría' },
]

export const adminRolesKpis = () => ({
  roles: ADMIN_ROLES.length,
  builtin: ADMIN_ROLES.filter((r) => r.builtin).length,
  custom: ADMIN_ROLES.filter((r) => !r.builtin).length,
  assignments: ADMIN_ROLE_ASSIGNMENTS.filter((a) => a.status === 'running').length,
  permissions: ADMIN_PERMISSIONS.length,
})
