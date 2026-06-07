/** Acento Tokens API — violeta */
export const ADMIN_TOKENS_ACCENT = '#7c3aed'
export const ADMIN_TOKENS_ACCENT_LIGHT = '#f5f3ff'
export const ADMIN_TOKENS_ACCENT_BORDER = '#ddd6fe'

/** Acento Webhooks — teal */
export const ADMIN_WEBHOOKS_ACCENT = '#0d9488'
export const ADMIN_WEBHOOKS_ACCENT_LIGHT = '#f0fdfa'
export const ADMIN_WEBHOOKS_ACCENT_BORDER = '#99f6e4'

/** Acento Usuarios — azul */
export const ADMIN_USERS_ACCENT = '#2563eb'
export const ADMIN_USERS_ACCENT_LIGHT = '#eff6ff'
export const ADMIN_USERS_ACCENT_BORDER = '#bfdbfe'

/** Acento Roles — índigo */
export const ADMIN_ROLES_ACCENT = '#4f46e5'
export const ADMIN_ROLES_ACCENT_LIGHT = '#eef2ff'
export const ADMIN_ROLES_ACCENT_BORDER = '#c7d2fe'

/** Acento Configuración — slate */
export const ADMIN_SETTINGS_ACCENT = '#475569'
export const ADMIN_SETTINGS_ACCENT_LIGHT = '#f8fafc'
export const ADMIN_SETTINGS_ACCENT_BORDER = '#cbd5e1'

/** Acento Modo demo — ámbar */
export const ADMIN_DEMO_ACCENT = '#d97706'
export const ADMIN_DEMO_ACCENT_LIGHT = '#fffbeb'
export const ADMIN_DEMO_ACCENT_BORDER = '#fde68a'

/** Acento Copilot — púrpura */
export const ADMIN_COPILOT_ACCENT = '#9333ea'
export const ADMIN_COPILOT_ACCENT_LIGHT = '#faf5ff'
export const ADMIN_COPILOT_ACCENT_BORDER = '#e9d5ff'

export const adminRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

export const adminScopeLabel = (scope: string): string => {
  const map: Record<string, string> = {
    'read:instances': 'Lectura instancias',
    'write:jenkins': 'Escritura Jenkins',
    'read:metrics': 'Lectura métricas',
    'read:alerts': 'Lectura alertas',
    'write:terraform': 'Escritura Terraform',
    'read:inventory': 'Lectura inventario',
    'read:dashboard': 'Lectura dashboard',
    'read:logs': 'Lectura logs',
    'read:*': 'Lectura global',
    full: 'Acceso completo',
  }
  return scope.split(',').map((s) => map[s.trim()] ?? s.trim()).join(' · ')
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
