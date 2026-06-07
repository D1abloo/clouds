export const AUDIT_ACCENT = '#0891b2'
export const AUDIT_ACCENT_LIGHT = '#ecfeff'
export const AUDIT_ACCENT_BORDER = '#a5f3fc'

export const auditSeverityLabel = (s: string): string => {
  const map: Record<string, string> = {
    critical: 'Crítico',
    warning: 'Advertencia',
    info: 'Informativo',
    high: 'Alto',
    medium: 'Medio',
    low: 'Bajo',
  }
  return map[s] ?? s
}

export const auditActionLabel = (action: string): string => {
  const map: Record<string, string> = {
    'instance.sync': 'Sincronización instancia',
    'terraform.apply': 'Terraform apply',
    'terraform.plan': 'Terraform plan',
    'vps.validate': 'Validación VPS',
    'secret.rotate': 'Rotación secreto',
    'secret.read': 'Lectura secreto',
    'user.login': 'Inicio de sesión',
    'user.logout': 'Cierre de sesión',
    'policy.update': 'Actualización política',
    'export.create': 'Creación exportación',
    'jenkins.trigger': 'Disparo Jenkins',
    'k8s.scale': 'Escalado Kubernetes',
    'k8s.deploy': 'Despliegue Kubernetes',
    'docker.restart': 'Reinicio contenedor',
    'billing.export': 'Exportación billing',
  }
  return map[action] ?? action
}

export const auditModuleIcon = (module: string): string => {
  const map: Record<string, string> = {
    Terraform: 'deployed_code',
    Cloud: 'cloud',
    Secretos: 'vpn_key',
    Auth: 'login',
    Jenkins: 'build',
    Cumplimiento: 'gavel',
    VPS: 'dns',
    Exportaciones: 'download',
    Kubernetes: 'hub',
    Docker: 'layers',
    Billing: 'payments',
    Auditoría: 'manage_search',
  }
  return map[module] ?? 'receipt_long'
}

export const auditUserInitials = (userId?: string): string => {
  if (!userId) return '?'
  const local = userId.split('@')[0] ?? userId
  const parts = local.split(/[._-]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export const auditRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

export const auditRiskLabel = (level?: string): string => {
  const map: Record<string, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto' }
  return level ? (map[level] ?? level) : '—'
}

export const downloadBlob = (content: string, filename: string, mime = 'text/plain'): void => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
