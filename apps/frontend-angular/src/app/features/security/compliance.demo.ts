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
  description: string
  impact: string
  controlId: string
  owner: string
  evidence: string
  remediationSteps: string[]
  affectedResources: string[]
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

export interface ComplianceReportSection {
  title: string
  paragraphs: string[]
}

export interface ComplianceReport {
  id: string
  name: string
  framework: string
  period: string
  status: string
  generatedAt: string
  score: number
  violationsCount: number
  passedControls: number
  failedControls: number
  executiveSummary: string
  sections: ComplianceReportSection[]
  recommendations: string[]
  appendix?: string[]
}

export const defaultViolations = (): ComplianceViolation[] => [
  {
    id: 'vio-1', rule: 'Etiquetas obligatorias', resource: 'i-0a2b3c4d', severity: 'high',
    recommendation: 'Añadir env, owner y cost-center', status: 'warning', framework: 'SOC2', detectedAt: ago(240),
    description: 'Recurso EC2 sin etiquetas obligatorias de gobernanza cloud.',
    impact: 'Imposibilita trazabilidad de costes y responsabilidad operativa.',
    controlId: 'CC6.1', owner: 'platform-team',
    evidence: 'Tags actuales: Name=web-prod\nFaltan: env, owner, cost-center',
    remediationSteps: ['Aplicar tags desde Terraform', 'Validar con policy-as-code', 'Re-escanear en 24h'],
    affectedResources: ['i-0a2b3c4d', 'vol-web-prod-01'],
  },
  {
    id: 'vio-2', rule: 'Sin copia de seguridad', resource: 'web-staging-02', severity: 'critical',
    recommendation: 'Habilitar backup diario', status: 'failed', framework: 'ISO 27001', detectedAt: ago(480),
    description: 'Instancia de staging sin política de backup automatizado.',
    impact: 'Pérdida potencial de datos ante incidente o borrado accidental.',
    controlId: 'A.12.3.1', owner: 'ops-team',
    evidence: 'BackupPolicy: none\nLastSnapshot: —',
    remediationSteps: ['Activar AWS Backup', 'Definir retención 30 días', 'Probar restore'],
    affectedResources: ['web-staging-02'],
  },
  {
    id: 'vio-3', rule: 'Puerto peligroso abierto', resource: 'vps-bastion-01:22', severity: 'critical',
    recommendation: 'Restringir SSH a CIDR VPN', status: 'failed', framework: 'SOC2', detectedAt: ago(120),
    description: 'SSH expuesto a Internet en host bastión.',
    impact: 'Superficie de ataque directa y riesgo de acceso no autorizado.',
    controlId: 'CC6.6', owner: 'security-team',
    evidence: 'Port 22/tcp OPEN 0.0.0.0/0\nAuth: key-only',
    remediationSteps: ['Restringir SG a VPN CIDR', 'Habilitar fail2ban', 'Auditar claves activas'],
    affectedResources: ['vps-bastion-01'],
  },
  {
    id: 'vio-4', rule: 'Disco sin cifrar', resource: 'vol-legacy-01', severity: 'critical',
    recommendation: 'Habilitar cifrado en reposo', status: 'failed', framework: 'GDPR', detectedAt: ago(1440),
    description: 'Volumen EBS legacy sin cifrado KMS.',
    impact: 'Incumplimiento de protección de datos personales en reposo.',
    controlId: 'Art. 32', owner: 'data-team',
    evidence: 'Encrypted: false\nContains: PII logs',
    remediationSteps: ['Snapshot y recrear volumen cifrado', 'Migrar datos', 'Validar aplicaciones'],
    affectedResources: ['vol-legacy-01', 'i-legacy-app'],
  },
  {
    id: 'vio-5', rule: 'Sin propietario', resource: 'gcp-temp-vm', severity: 'high',
    recommendation: 'Asignar owner del recurso', status: 'warning', framework: 'SOC2', detectedAt: ago(720),
    description: 'VM temporal sin owner ni etiqueta de equipo responsable.',
    impact: 'Recursos huérfanos sin accountability ni revisión periódica.',
    controlId: 'CC1.2', owner: '—',
    evidence: 'labels.owner: missing\nCreated: 45 days ago',
    remediationSteps: ['Identificar equipo solicitante', 'Asignar owner', 'Programar decomisión'],
    affectedResources: ['gcp-temp-vm'],
  },
  {
    id: 'vio-6', rule: 'Presupuesto excedido', resource: 'aws-prod-account', severity: 'high',
    recommendation: 'Revisar optimizador de costes', status: 'warning', framework: 'FinOps', detectedAt: ago(2880),
    description: 'Cuenta producción supera umbral mensual en 18%.',
    impact: 'Desviación presupuestaria sin plan de contención.',
    controlId: 'FIN-02', owner: 'finops-team',
    evidence: 'Budget: $12,000\nActual: $14,160 (+18%)',
    remediationSteps: ['Revisar instancias idle', 'Aplicar rightsizing', 'Alertas Budget 90%'],
    affectedResources: ['aws-prod-account'],
  },
  {
    id: 'vio-7', rule: 'Security group abierto', resource: 'sg-web-public', severity: 'high',
    recommendation: 'Endurecer reglas ingress', status: 'warning', framework: 'SOC2', detectedAt: ago(360),
    description: 'Security group permite tráfico HTTP desde cualquier origen sin WAF.',
    impact: 'Exposición a escaneos y posibles explotaciones web.',
    controlId: 'CC6.7', owner: 'platform-team',
    evidence: 'Rule: 0.0.0.0/0:80 ALLOW\nWAF: disabled',
    remediationSteps: ['Restringir a CDN/WAF', 'Habilitar AWS WAF', 'Revisar logs ALB'],
    affectedResources: ['sg-web-public', 'alb-web-prod'],
  },
  {
    id: 'vio-8', rule: 'Secreto próximo a expirar', resource: 'github-ci-token', severity: 'high',
    recommendation: 'Rotar en 14 días', status: 'warning', framework: 'ISO 27001', detectedAt: ago(60),
    description: 'Token CI expira en 14 días sin rotación programada.',
    impact: 'Interrupción de pipelines y posible uso de credencial caducada.',
    controlId: 'A.9.4.3', owner: 'devops-team',
    evidence: 'Expires: 2026-06-20\nAuto-rotate: false',
    remediationSteps: ['Generar nuevo token', 'Actualizar Jenkins', 'Revocar token anterior'],
    affectedResources: ['github-ci-token', 'jenkins-prod'],
  },
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
  {
    id: 'crpt-1', name: 'Informe SOC2 Q2 2026', framework: 'SOC2', period: 'Q2 2026', status: 'success', generatedAt: ago(1440),
    score: 87, violationsCount: 5, passedControls: 56, failedControls: 8,
    executiveSummary: 'La postura SOC 2 Type II se mantiene en nivel aceptable con 87% de controles aprobados. Persisten hallazgos en etiquetado, exposición de red y gobernanza de recursos huérfanos.',
    sections: [
      { title: 'Controles de acceso (CC6)', paragraphs: ['Se detectaron 3 violaciones relacionadas con acceso de red y autenticación. La mayoría de hosts prod cumplen MFA y segmentación.'] },
      { title: 'Gobernanza y etiquetado (CC1)', paragraphs: ['4 recursos sin etiquetas obligatorias. Se recomienda enforcement via Terraform y OPA.'] },
    ],
    recommendations: ['Endurecer security groups públicos', 'Completar etiquetado en EC2 prod', 'Cerrar SSH en bastiones'],
    appendix: ['Auditor externo: Deloitte (demo)', 'Alcance: cuentas AWS prod y VPS edge'],
  },
  {
    id: 'crpt-2', name: 'Auditoría GDPR anual', framework: 'GDPR', period: '2026', status: 'success', generatedAt: ago(10080),
    score: 92, violationsCount: 2, passedControls: 26, failedControls: 2,
    executiveSummary: 'Cumplimiento GDPR sólido al 92%. Los hallazgos se concentran en cifrado de volúmenes legacy con datos personales.',
    sections: [
      { title: 'Protección de datos (Art. 32)', paragraphs: ['Un volumen legacy sin cifrado contiene logs con PII. Plan de migración en curso.'] },
      { title: 'Registro de actividades', paragraphs: ['Trazabilidad de accesos a datos personales operativa en el 95% de sistemas críticos.'] },
    ],
    recommendations: ['Cifrar vol-legacy-01', 'Actualizar ROPA', 'Revisar DPA con proveedores cloud'],
    appendix: ['DPO: dpo@cloudops.io', 'Base legal documentada para procesamiento demo'],
  },
  {
    id: 'crpt-3', name: 'Gap analysis ISO 27001', framework: 'ISO 27001', period: 'Jun 2026', status: 'warning', generatedAt: ago(4320),
    score: 84, violationsCount: 4, passedControls: 96, failedControls: 18,
    executiveSummary: 'Análisis de brechas ISO 27001: 84% de madurez. Priorizar backup, rotación de secretos y controles de acceso privilegiado.',
    sections: [
      { title: 'Continuidad (A.12)', paragraphs: ['Backup ausente en staging. RTO/RPO definidos pero no validados trimestralmente.'] },
      { title: 'Gestión de secretos (A.9)', paragraphs: ['Tokens CI sin rotación automática. Vault operativo en prod.'] },
    ],
    recommendations: ['Implementar backup staging', 'Automatizar rotación CI tokens', 'Simulacro restore Q3'],
    appendix: ['Certificación objetivo: Q4 2026', 'Alcance ISMS: plataforma CloudOps demo'],
  },
]
