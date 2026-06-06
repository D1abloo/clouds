import type { SecuritySeverity } from './security.config'

const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()

export interface ComplianceViolation {
  id: string
  rule: string
  resource: string
  severity: SecuritySeverity
  recommendation: string
  status: string
  framework: string
  detectedAt: string
}

export interface ComplianceRule {
  id: string
  name: string
  scope: string
  violations: number
  status: string
  description: string
}

export interface ComplianceFramework {
  id: string
  name: string
  score: number
  controls: number
  passed: number
  failed: number
  lastAudit: string
}

export interface ComplianceReport {
  id: string
  name: string
  framework: string
  period: string
  status: string
  generatedAt: string
}

export const defaultViolations = (): ComplianceViolation[] => [
  { id: 'vio-1', rule: 'Etiquetas obligatorias', resource: 'i-0a2b3c4d', severity: 'high', recommendation: 'Añadir env, owner y cost-center', status: 'warning', framework: 'SOC2', detectedAt: ago(240) },
  { id: 'vio-2', rule: 'Sin copia de seguridad', resource: 'web-staging-02', severity: 'critical', recommendation: 'Habilitar backup diario', status: 'failed', framework: 'ISO 27001', detectedAt: ago(480) },
  { id: 'vio-3', rule: 'Puerto peligroso abierto', resource: 'vps-bastion-01:22', severity: 'critical', recommendation: 'Restringir SSH a CIDR VPN', status: 'failed', framework: 'SOC2', detectedAt: ago(120) },
  { id: 'vio-4', rule: 'Disco sin cifrar', resource: 'vol-legacy-01', severity: 'critical', recommendation: 'Habilitar cifrado en reposo', status: 'failed', framework: 'GDPR', detectedAt: ago(1440) },
  { id: 'vio-5', rule: 'Sin propietario', resource: 'gcp-temp-vm', severity: 'high', recommendation: 'Asignar owner del recurso', status: 'warning', framework: 'SOC2', detectedAt: ago(720) },
  { id: 'vio-6', rule: 'Presupuesto excedido', resource: 'aws-prod-account', severity: 'high', recommendation: 'Revisar optimizador de costes', status: 'warning', framework: 'FinOps', detectedAt: ago(2880) },
  { id: 'vio-7', rule: 'Security group abierto', resource: 'sg-web-public', severity: 'high', recommendation: 'Endurecer reglas ingress', status: 'warning', framework: 'SOC2', detectedAt: ago(360) },
  { id: 'vio-8', rule: 'Secreto próximo a expirar', resource: 'github-ci-token', severity: 'high', recommendation: 'Rotar en 14 días', status: 'warning', framework: 'ISO 27001', detectedAt: ago(60) },
]

export const defaultRules = (): ComplianceRule[] => [
  { id: 'rule-1', name: 'require-tags', scope: 'Todos los recursos cloud', violations: 4, status: 'running', description: 'Recursos deben tener env, owner y cost-center' },
  { id: 'rule-2', name: 'require-backup', scope: 'Instancias producción', violations: 2, status: 'running', description: 'Backup diario habilitado en prod' },
  { id: 'rule-3', name: 'no-public-ssh', scope: 'VPS e instancias', violations: 1, status: 'running', description: 'SSH no expuesto a 0.0.0.0/0' },
  { id: 'rule-4', name: 'encrypt-at-rest', scope: 'Volúmenes y buckets', violations: 1, status: 'running', description: 'Cifrado en reposo obligatorio' },
]

export const defaultFrameworks = (): ComplianceFramework[] => [
  { id: 'fw-soc2', name: 'SOC 2 Type II', score: 87, controls: 64, passed: 56, failed: 8, lastAudit: ago(43200) },
  { id: 'fw-gdpr', name: 'GDPR', score: 92, controls: 28, passed: 26, failed: 2, lastAudit: ago(86400) },
  { id: 'fw-iso', name: 'ISO 27001', score: 84, controls: 114, passed: 96, failed: 18, lastAudit: ago(129600) },
]

export const defaultComplianceReports = (): ComplianceReport[] => [
  { id: 'crpt-1', name: 'Informe SOC2 Q2 2026', framework: 'SOC2', period: 'Q2 2026', status: 'success', generatedAt: ago(1440) },
  { id: 'crpt-2', name: 'Auditoría GDPR anual', framework: 'GDPR', period: '2026', status: 'success', generatedAt: ago(10080) },
  { id: 'crpt-3', name: 'Gap analysis ISO 27001', framework: 'ISO 27001', period: 'Jun 2026', status: 'warning', generatedAt: ago(4320) },
]
