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

export const SECURITY_ACCENT = '#ec4899'

export const downloadBlob = (content: string, filename: string, mime = 'text/plain'): void => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
