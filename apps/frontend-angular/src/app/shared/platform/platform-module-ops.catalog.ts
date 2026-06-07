export interface PlatformOperation {
  id: string
  label: string
  icon: string
  disabled?: boolean
  disabledReason?: string
}

const op = (base: PlatformOperation, disabled = false, reason?: string): PlatformOperation =>
  disabled ? { ...base, disabled: true, disabledReason: reason } : base

const detail = (): PlatformOperation => ({ id: 'detail', label: 'Ver detalle', icon: 'visibility' })
const exportRow = (): PlatformOperation => ({ id: 'export', label: 'Exportar fila', icon: 'download' })

const headerActionId = (label: string): string => {
  const map: Record<string, string> = {
    'Live tail': 'live-tail',
    'Tail en vivo': 'live-tail',
    Export: 'export',
    Exportar: 'export',
    'Save query': 'save-query',
    'Guardar consulta': 'save-query',
    'Run scan': 'scan',
    'Ejecutar escaneo': 'scan',
    'Export report': 'export',
    'Exportar informe': 'export',
    Remediate: 'remediate',
    Remediar: 'remediate',
    'Add secret': 'add',
    'Añadir secreto': 'add',
    'Rotate selected': 'rotate',
    'Rotar seleccionados': 'rotate',
    'Audit log': 'audit-log',
    'Registro auditoría': 'audit-log',
    'Declare incident': 'declare',
    'Declarar incidente': 'declare',
    'Post update': 'post-update',
    'Publicar actualización': 'post-update',
    Resolve: 'resolve',
    Resolver: 'resolve',
    'Apply recommendation': 'apply',
    'Aplicar recomendación': 'apply',
    'Refresh analysis': 'refresh',
    'Actualizar análisis': 'refresh',
    'Generate report': 'generate',
    'Generar informe': 'generate',
    Schedule: 'schedule',
    Programar: 'schedule',
    'Download PDF': 'download',
    'Descargar PDF': 'download',
    'Export changelog': 'export',
    'Exportar changelog': 'export',
    'Filter critical': 'filter',
    'Filtrar críticos': 'filter',
    Subscribe: 'subscribe',
    Suscribirse: 'subscribe',
    'Grant access': 'grant',
    'Conceder acceso': 'grant',
    'Review policies': 'review',
    'Revisar políticas': 'review',
    'Invite user': 'invite',
    'Invitar usuario': 'invite',
    'Sync SSO': 'sync-sso',
    'Crear token': 'create',
    'Rotar token': 'rotate',
    Revocar: 'revoke',
    'Crear webhook': 'create',
    'Probar entrega': 'test',
    'Reintentar fallidos': 'retry',
    Desactivar: 'disable',
    Refresh: 'refresh',
    Actualizar: 'refresh',
    'Remediate all': 'remediate-all',
    'Remediar todo': 'remediate-all',
  }
  return map[label] ?? label.toLowerCase().replace(/[^\w]+/g, '-').slice(0, 32)
}

export const resolveHeaderActionId = (label: string): string => headerActionId(label)

const logsOps = (tab: string, _row: Record<string, unknown>): PlatformOperation[] => {
  if (tab === 'Errores' || tab === 'Errors') {
    return [
      detail(),
      { id: 'live-tail', label: 'Tail en vivo', icon: 'stream' },
      { id: 'create-rule', label: 'Crear regla de alerta', icon: 'rule' },
      exportRow(),
    ]
  }
  return [
    detail(),
    { id: 'live-tail', label: 'Ver contexto', icon: 'article' },
    { id: 'export', label: 'Exportar línea', icon: 'download' },
  ]
}

const incidentsOps = (tab: string): PlatformOperation[] => {
  if (tab === 'Abiertos' || tab === 'Open' || tab === 'Activas') {
    return [
      detail(),
      { id: 'post-update', label: 'Publicar actualización', icon: 'campaign' },
      { id: 'resolve', label: 'Resolver incidente', icon: 'check_circle' },
      { id: 'escalate', label: 'Escalar', icon: 'priority_high' },
    ]
  }
  if (tab === 'Resueltos' || tab === 'Resolved') {
    return [detail(), { id: 'export', label: 'Exportar post-mortem', icon: 'description' }]
  }
  return [detail(), { id: 'export', label: 'Exportar evento', icon: 'download' }]
}

const securityOps = (tab: string, row: Record<string, unknown>): PlatformOperation[] => {
  if (tab === 'Riesgos' || tab === 'Risks') {
    const crit = String(row['severity'] ?? '').toLowerCase() === 'critical'
    return [
      detail(),
      { id: 'remediate', label: 'Remediar hallazgo', icon: 'healing' },
      op({ id: 'ignore', label: 'Ignorar (30 días)', icon: 'block' }, crit, 'Los hallazgos críticos requieren remediación'),
      exportRow(),
    ]
  }
  if (tab === 'Puertos abiertos' || tab === 'Open ports') {
    return [
      detail(),
      { id: 'remediate', label: 'Restringir acceso', icon: 'security' },
      { id: 'scan', label: 'Re-escanear puerto', icon: 'radar' },
    ]
  }
  return [detail(), { id: 'remediate', label: 'Aplicar recomendación', icon: 'task_alt' }, exportRow()]
}

const secretsOps = (tab: string): PlatformOperation[] => {
  if (tab === 'Rotación' || tab === 'Rotation') {
    return [
      detail(),
      { id: 'rotate', label: 'Rotar ahora', icon: 'autorenew' },
      { id: 'audit-log', label: 'Ver auditoría', icon: 'history' },
    ]
  }
  if (tab === 'Auditoría' || tab === 'Audit') {
    return [detail(), exportRow()]
  }
  return [
    detail(),
    { id: 'rotate', label: 'Rotar secreto', icon: 'sync' },
    { id: 'revoke', label: 'Revocar acceso', icon: 'block' },
    exportRow(),
  ]
}

const costOps = (tab: string): PlatformOperation[] => {
  if (tab === 'Recomendaciones' || tab === 'Recommendations') {
    return [
      detail(),
      { id: 'apply', label: 'Aplicar ahorro', icon: 'savings' },
      { id: 'dismiss', label: 'Descartar', icon: 'close' },
      exportRow(),
    ]
  }
  return [detail(), { id: 'export', label: 'Exportar proyección', icon: 'download' }]
}

const reportsOps = (): PlatformOperation[] => [
  detail(),
  { id: 'download', label: 'Descargar PDF', icon: 'picture_as_pdf' },
  { id: 'schedule', label: 'Programar envío', icon: 'event' },
  exportRow(),
]

const changeOps = (): PlatformOperation[] => [
  detail(),
  { id: 'subscribe', label: 'Suscribirse al cambio', icon: 'notifications' },
  { id: 'export', label: 'Exportar diff', icon: 'difference' },
]

const complianceOps = (): PlatformOperation[] => [
  detail(),
  { id: 'remediate', label: 'Remediar violación', icon: 'healing' },
  { id: 'waive', label: 'Excepción temporal', icon: 'gavel' },
  exportRow(),
]

const accessOps = (tab: string): PlatformOperation[] => {
  if (tab === 'Políticas' || tab === 'Policies') {
    return [detail(), { id: 'review', label: 'Revisar política', icon: 'policy' }, exportRow()]
  }
  return [
    detail(),
    { id: 'grant', label: 'Modificar acceso', icon: 'edit' },
    { id: 'revoke', label: 'Revocar acceso', icon: 'person_remove' },
    exportRow(),
  ]
}

const usersOps = (): PlatformOperation[] => [
  detail(),
  { id: 'reset-mfa', label: 'Restablecer MFA', icon: 'security' },
  op({ id: 'disable', label: 'Desactivar usuario', icon: 'person_off' }),
  exportRow(),
]

const apiTokensOps = (tab: string): PlatformOperation[] => {
  if (tab === 'Revocados' || tab === 'Revoked') {
    return [detail(), exportRow()]
  }
  if (tab === 'Auditoría de uso' || tab === 'Audit') {
    return [detail(), { id: 'block-ip', label: 'Bloquear IP', icon: 'shield' }]
  }
  return [
    detail(),
    { id: 'rotate', label: 'Rotar token', icon: 'autorenew' },
    { id: 'revoke', label: 'Revocar token', icon: 'block' },
    { id: 'copy', label: 'Copiar prefijo', icon: 'content_copy' },
  ]
}

const webhooksOps = (tab: string): PlatformOperation[] => {
  if (tab === 'Entregas' || tab === 'Deliveries') {
    return [detail(), { id: 'retry', label: 'Reintentar entrega', icon: 'replay' }, { id: 'payload', label: 'Ver payload', icon: 'code' }]
  }
  if (tab === 'Fallos' || tab === 'Failures') {
    return [detail(), { id: 'retry', label: 'Reintentar ahora', icon: 'replay' }]
  }
  if (tab === 'Payloads') {
    return [{ id: 'payload', label: 'Ver payload completo', icon: 'data_object' }, { id: 'copy', label: 'Copiar JSON', icon: 'content_copy' }]
  }
  return [
    detail(),
    { id: 'test', label: 'Probar envío', icon: 'send' },
    { id: 'regenerate', label: 'Regenerar secreto', icon: 'key' },
    op({ id: 'disable', label: 'Desactivar webhook', icon: 'pause' }),
  ]
}

const SCOPE_MODULES = new Set([
  'logs', 'incidents', 'cost-optimizer', 'reports', 'change-management',
  'security-center', 'secrets-manager', 'compliance', 'access-control', 'users',
  'api-tokens', 'admin-webhooks',
])

export const isPlatformScopeModule = (moduleId: string): boolean => SCOPE_MODULES.has(moduleId)

export const getPlatformRowOps = (
  moduleId: string,
  tabLabel: string,
  row: Record<string, unknown>,
): PlatformOperation[] => {
  switch (moduleId) {
    case 'logs': return logsOps(tabLabel, row)
    case 'incidents': return incidentsOps(tabLabel)
    case 'security-center': return securityOps(tabLabel, row)
    case 'secrets-manager': return secretsOps(tabLabel)
    case 'cost-optimizer': return costOps(tabLabel)
    case 'reports': return reportsOps()
    case 'change-management': return changeOps()
    case 'compliance': return complianceOps()
    case 'access-control': return accessOps(tabLabel)
    case 'users': return usersOps()
    case 'api-tokens': return apiTokensOps(tabLabel)
    case 'admin-webhooks': return webhooksOps(tabLabel)
    default:
      return [detail(), { id: 'run', label: 'Ejecutar acción', icon: 'play_arrow' }, exportRow()]
  }
}

export const getPlatformQuickActionId = (label: string): string =>
  label.toLowerCase().includes('copiar') ? 'copy'
    : label.toLowerCase().includes('auditor') ? 'audit-log'
    : label.toLowerCase().includes('scope') || label.toLowerCase().includes('alcance') ? 'review'
    : label.toLowerCase().includes('payload') ? 'payload'
    : label.toLowerCase().includes('historial') ? 'audit-log'
    : label.toLowerCase().includes('secreto') ? 'regenerate'
    : 'quick'
