export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export const SECURITY_SEVERITY_LABELS: Record<SecuritySeverity, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
  info: 'Informativo',
}

export const SECURITY_SEVERITY_OPTIONS: SecuritySeverity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
]

export const securitySeverityLabel = (s: string): string =>
  SECURITY_SEVERITY_LABELS[s as SecuritySeverity] ?? s

export type SecurityFindingStatus =
  | 'failed'
  | 'warning'
  | 'pending'
  | 'running'
  | 'completed'
  | 'accepted_risk'
  | 'snoozed'

export const SECURITY_STATUS_LABELS: Record<SecurityFindingStatus, string> = {
  failed: 'Failed',
  warning: 'Unstable',
  pending: 'Pending',
  running: 'Remediando',
  completed: 'Resolved',
  accepted_risk: 'Accepted risk',
  snoozed: 'Ignorado',
}

export const securityStatusLabel = (s: string): string =>
  SECURITY_STATUS_LABELS[s as SecurityFindingStatus] ?? s

export const SECURITY_PROVIDERS = ['AWS', 'VPS', 'Docker', 'Kubernetes', 'Azure', 'GCP'] as const

/** Acento principal del módulo — índigo profesional */
export const SECURITY_ACCENT = '#4f46e5'
export const SECURITY_ACCENT_LIGHT = '#eef2ff'
export const SECURITY_ACCENT_BORDER = '#c7d2fe'

/** Botones de acción compactos — compartidos en páginas del módulo seguridad */
export const SECURITY_ACTION_BTN = `
  display: inline-flex; align-items: center; gap: 0.4rem;
  width: fit-content; height: fit-content; min-height: unset; margin: 0;
  padding: 0.42rem 0.55rem; border-radius: 8px; border: 1px solid #e2e8f0;
  background: #fff; font: inherit; font-size: 0.76rem; font-weight: 600; cursor: pointer; line-height: 1.25; box-sizing: border-box;
`
export const SECURITY_ACTION_BTN_ICON = `
  display: block; margin: 0; padding: 0; font-size: 0.85rem; width: 0.85rem; height: 0.85rem; line-height: 1;
`
export const SECURITY_ACTION_BTN_PRIMARY = `
  background: ${SECURITY_ACCENT}; border-color: #4338ca; color: #fff;
`
export const SECURITY_ACTION_BTN_SM = `
  padding: 0.32rem 0.45rem; font-size: 0.72rem;
`

export const downloadBlob = (content: string, filename: string, mime = 'text/plain'): void => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
