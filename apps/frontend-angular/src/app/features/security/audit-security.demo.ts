const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()

export interface SecurityEvent {
  id: string
  event: string
  source: string
  severity: string
  user: string
  ip: string
  at: string
  status: string
}

export interface ComplianceTrailEntry {
  id: string
  action: string
  actor: string
  resource: string
  framework: string
  at: string
  outcome: string
}

export interface AuditExport {
  id: string
  name: string
  format: string
  records: number
  status: string
  generatedAt: string
  requestedBy: string
}

export const defaultSecurityEvents = (): SecurityEvent[] => [
  { id: 'sev-1', event: 'Intento de login fallido', source: 'SSH', severity: 'warning', user: 'unknown', ip: '203.0.113.44', at: ago(15), status: 'warning' },
  { id: 'sev-2', event: 'Cambio de política IAM', source: 'AWS', severity: 'info', user: 'admin@cloudops', ip: '203.0.113.10', at: ago(120), status: 'running' },
  { id: 'sev-3', event: 'Secreto rotado', source: 'Vault', severity: 'info', user: 'security-bot', ip: '10.0.0.5', at: ago(360), status: 'success' },
  { id: 'sev-4', event: 'Puerto 22 expuesto detectado', source: 'Escaneo', severity: 'critical', user: 'security-scanner', ip: '—', at: ago(480), status: 'failed' },
  { id: 'sev-5', event: 'Acceso denegado a recurso prod', source: 'Plataforma', severity: 'warning', user: 'contractor@ext', ip: '198.51.100.8', at: ago(60), status: 'warning' },
]

export const defaultComplianceTrail = (): ComplianceTrailEntry[] => [
  { id: 'ct-1', action: 'Aprobación cambio RFC-1042', actor: 'security@cloudops', resource: 'sg-web-prod', framework: 'SOC2', at: ago(240), outcome: 'Aprobado' },
  { id: 'ct-2', action: 'Violación remediada', actor: 'ops@cloudops', resource: 'vps-bastion-01', framework: 'ISO 27001', at: ago(720), outcome: 'Cerrado' },
  { id: 'ct-3', action: 'Export informe GDPR', actor: 'compliance@cloudops', resource: 'Informe anual', framework: 'GDPR', at: ago(1440), outcome: 'Completado' },
  { id: 'ct-4', action: 'Revisión política IAM', actor: 'admin@cloudops', resource: 'legacy-admin', framework: 'SOC2', at: ago(2880), outcome: 'Pendiente' },
]

export const defaultAuditExports = (): AuditExport[] => [
  { id: 'exp-1', name: 'Registro actividad — Jun 2026', format: 'CSV', records: 1240, status: 'success', generatedAt: ago(60), requestedBy: 'admin@cloudops' },
  { id: 'exp-2', name: 'Eventos seguridad — 7 días', format: 'JSON', records: 89, status: 'success', generatedAt: ago(360), requestedBy: 'security@cloudops' },
  { id: 'exp-3', name: 'Trail cumplimiento Q2', format: 'PDF', records: 42, status: 'running', generatedAt: ago(10), requestedBy: 'compliance@cloudops' },
]
