const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()

export interface AuditActivityEntry {
  id: string
  action: string
  resource: string
  userId?: string
  ipAddress?: string
  createdAt: string
  category: string
  module: string
  status: string
  description: string
  userAgent?: string
  sessionId?: string
  correlationId?: string
  metadata?: Record<string, string>
  changes?: { field: string; before: string; after: string }[]
  environment?: string
  duration?: string
  requestMethod?: string
  outcome?: string
  riskLevel?: 'low' | 'medium' | 'high'
  tags?: string[]
  relatedEvents?: number
}

export interface SecurityEvent {
  id: string
  event: string
  source: string
  severity: string
  user: string
  ip: string
  at: string
  status: string
  description: string
  details: string
  correlationId: string
  affectedResources: string[]
  recommendation: string
}

export interface ComplianceTrailEntry {
  id: string
  action: string
  actor: string
  resource: string
  framework: string
  at: string
  outcome: string
  controlId: string
  description: string
  evidence: string
  notes: string
}

export interface AuditExport {
  id: string
  name: string
  format: string
  records: number
  status: string
  generatedAt: string
  requestedBy: string
  period: string
  filters: string
  sizeKb: number
  includes: string[]
}

export const defaultAuditActivities = (): AuditActivityEntry[] => [
  {
    id: 'aud-1', action: 'terraform.apply', resource: 'demo-aws-ec2', userId: 'admin@cloudops.local',
    ipAddress: '203.0.113.10', createdAt: ago(12), category: 'Infraestructura', module: 'Terraform',
    status: 'success', description: 'Apply completado en workspace prod-us-east con 3 recursos modificados.',
    userAgent: 'CloudOps-Web/1.0', sessionId: 'sess-a1b2c3', correlationId: 'corr-tf-8842',
    environment: 'prod', duration: '4m 12s', requestMethod: 'POST', outcome: '3 changed, 0 added, 0 destroyed',
    riskLevel: 'medium', tags: ['iac', 'aws', 'prod'], relatedEvents: 2,
    metadata: { workspace: 'prod-us-east', runId: 'run-4421', duration: '4m 12s' },
    changes: [
      { field: 'instance_type', before: 't3.medium', after: 't3.large' },
      { field: 'tags.Environment', before: 'staging', after: 'prod' },
    ],
  },
  {
    id: 'aud-2', action: 'instance.sync', resource: 'aws-prod-app-1', userId: 'terraform-sa',
    ipAddress: '10.0.1.42', createdAt: ago(45), category: 'Inventario', module: 'Cloud',
    status: 'success', description: 'Sincronización de metadatos EC2 desde cuenta AWS producción.',
    environment: 'prod', duration: '18s', requestMethod: 'GET', outcome: '24 instancias actualizadas',
    riskLevel: 'low', tags: ['sync', 'aws'], relatedEvents: 0,
    correlationId: 'corr-sync-2201',
    metadata: { provider: 'AWS', region: 'us-east-1', instances: '24' },
  },
  {
    id: 'aud-3', action: 'secret.rotate', resource: 'vault/aws/prod#deploy', userId: 'security-bot',
    ipAddress: '10.0.0.5', createdAt: ago(90), category: 'Seguridad', module: 'Secretos',
    status: 'running', description: 'Rotación automática de credencial IAM según política cloud-prod-90d.',
    environment: 'prod', duration: '—', requestMethod: 'POST', outcome: 'En progreso (paso 2/4)',
    riskLevel: 'high', tags: ['vault', 'rotation'], relatedEvents: 3,
    correlationId: 'corr-rot-9910',
    metadata: { policy: 'cloud-prod-90d', method: 'auto' },
  },
  {
    id: 'aud-4', action: 'user.login', resource: 'auth/session', userId: 'ops@cloudops.local',
    ipAddress: '198.51.100.22', createdAt: ago(120), category: 'Acceso', module: 'Auth',
    status: 'success', description: 'Inicio de sesión exitoso con MFA TOTP.',
    userAgent: 'Mozilla/5.0 (Linux)', sessionId: 'sess-x9y8z7',
    environment: 'global', duration: '1.2s', requestMethod: 'POST', outcome: 'Sesión activa',
    riskLevel: 'low', tags: ['auth', 'mfa'],
    metadata: { mfa: 'totp', method: 'password' },
  },
  {
    id: 'aud-5', action: 'jenkins.trigger', resource: 'deploy-api-prod', userId: 'admin@cloudops.local',
    ipAddress: '203.0.113.10', createdAt: ago(180), category: 'CI/CD', module: 'Jenkins',
    status: 'success', description: 'Pipeline deploy-api-prod #847 disparado manualmente.',
    environment: 'prod', duration: '12m 40s', requestMethod: 'POST', outcome: 'Build SUCCESS',
    riskLevel: 'medium', tags: ['ci', 'deploy'], relatedEvents: 5,
    correlationId: 'corr-jk-5512',
    metadata: { build: '#847', branch: 'main', job: 'deploy-api-prod' },
  },
  {
    id: 'aud-6', action: 'policy.update', resource: 'sg-web-prod', userId: 'security@cloudops.local',
    ipAddress: '203.0.113.10', createdAt: ago(360), category: 'Seguridad', module: 'Cumplimiento',
    status: 'warning', description: 'Regla ingress 0.0.0.0/0:22 añadida temporalmente — requiere revisión RFC.',
    environment: 'prod', duration: '—', requestMethod: 'PATCH', outcome: 'Pendiente aprobación RFC-1042',
    riskLevel: 'high', tags: ['security-group', 'compliance'], relatedEvents: 1,
    correlationId: 'corr-pol-3301',
    changes: [{ field: 'ingress[22]', before: 'deny', after: '0.0.0.0/0' }],
  },
  {
    id: 'aud-7', action: 'vps.validate', resource: 'vps-bastion-01', userId: 'ops@cloudops.local',
    ipAddress: '203.0.113.10', createdAt: ago(720), category: 'Infraestructura', module: 'VPS',
    status: 'success', description: 'Validación SSH y chequeo de puertos en bastion producción.',
    environment: 'prod', duration: '6s', requestMethod: 'GET', outcome: '22,443 OK · latencia 42ms',
    riskLevel: 'low', tags: ['bastion', 'healthcheck'],
    metadata: { host: '203.0.113.15', ports: '22,443', latency: '42ms' },
  },
  {
    id: 'aud-8', action: 'export.create', resource: 'audit/activity-logs', userId: 'compliance@cloudops.local',
    ipAddress: '203.0.113.10', createdAt: ago(1440), category: 'Auditoría', module: 'Exportaciones',
    status: 'success', description: 'Exportación CSV de registro de actividad — últimos 30 días.',
    environment: 'global', duration: '8s', requestMethod: 'POST', outcome: '1.240 registros exportados',
    riskLevel: 'low', tags: ['export', 'csv'],
    metadata: { format: 'CSV', records: '1240', period: '30d' },
  },
  {
    id: 'aud-9', action: 'k8s.scale', resource: 'deployment/api-gateway', userId: 'platform-bot',
    ipAddress: '10.0.2.18', createdAt: ago(25), category: 'Orquestación', module: 'Kubernetes',
    status: 'success', description: 'Escalado horizontal de api-gateway de 3 a 6 réplicas por HPA.',
    environment: 'prod', duration: '45s', requestMethod: 'PATCH', outcome: '6/6 pods ready',
    riskLevel: 'medium', tags: ['k8s', 'hpa', 'scale'], relatedEvents: 4,
    correlationId: 'corr-k8s-7720',
    metadata: { cluster: 'prod-eks', namespace: 'platform', replicas: '6' },
  },
  {
    id: 'aud-10', action: 'docker.restart', resource: 'container/nginx-edge', userId: 'ops@cloudops.local',
    ipAddress: '203.0.113.10', createdAt: ago(55), category: 'Contenedores', module: 'Docker',
    status: 'success', description: 'Reinicio controlado del proxy edge tras actualización de certificado TLS.',
    environment: 'staging', duration: '3s', requestMethod: 'POST', outcome: 'Container healthy',
    riskLevel: 'low', tags: ['docker', 'tls'], relatedEvents: 0,
    metadata: { host: 'edge-staging-01', image: 'nginx:1.25-alpine' },
  },
  {
    id: 'aud-11', action: 'terraform.plan', resource: 'network-vpc-prod', userId: 'admin@cloudops.local',
    ipAddress: '203.0.113.10', createdAt: ago(200), category: 'Infraestructura', module: 'Terraform',
    status: 'success', description: 'Plan de cambios en módulo VPC — sin drift detectado.',
    environment: 'prod', duration: '1m 05s', requestMethod: 'POST', outcome: 'No changes',
    riskLevel: 'low', tags: ['iac', 'vpc', 'plan'], relatedEvents: 0,
    correlationId: 'corr-tf-9901',
    metadata: { workspace: 'network-prod', resources: '18' },
  },
  {
    id: 'aud-12', action: 'user.logout', resource: 'auth/session', userId: 'contractor@ext',
    ipAddress: '198.51.100.8', createdAt: ago(300), category: 'Acceso', module: 'Auth',
    status: 'success', description: 'Cierre de sesión voluntario tras ventana de mantenimiento.',
    environment: 'global', duration: '—', requestMethod: 'DELETE', outcome: 'Token revocado',
    riskLevel: 'low', tags: ['auth', 'logout'],
    sessionId: 'sess-contractor-44',
  },
]

export const defaultSecurityEvents = (): SecurityEvent[] => [
  {
    id: 'sev-1', event: 'Intento de login fallido', source: 'SSH', severity: 'warning',
    user: 'unknown', ip: '203.0.113.44', at: ago(15), status: 'warning',
    description: 'Tres intentos consecutivos de autenticación SSH fallidos en bastion producción.',
    details: 'Failed password for invalid user admin from 203.0.113.44 port 48291 ssh2',
    correlationId: 'corr-sec-7711', affectedResources: ['vps-bastion-01', '203.0.113.15:22'],
    recommendation: 'Bloquear IP en WAF y revisar reglas fail2ban. Considerar rotación de claves si persisten intentos.',
  },
  {
    id: 'sev-2', event: 'Cambio de política IAM', source: 'AWS', severity: 'info',
    user: 'admin@cloudops', ip: '203.0.113.10', at: ago(120), status: 'running',
    description: 'Política IAM AdministratorAccess adjunta al rol terraform-deploy-prod.',
    details: 'AttachUserPolicy: arn:aws:iam::123456789012:policy/AdministratorAccess → terraform-deploy-prod',
    correlationId: 'corr-sec-8820', affectedResources: ['terraform-deploy-prod', 'AWS IAM'],
    recommendation: 'Verificar que el cambio está aprobado en RFC-1042 y documentado en trail de cumplimiento.',
  },
  {
    id: 'sev-3', event: 'Secreto rotado', source: 'Vault', severity: 'info',
    user: 'security-bot', ip: '10.0.0.5', at: ago(360), status: 'success',
    description: 'Rotación automática completada para aws-prod-deploy.',
    details: 'Version 14 created. Previous version marked deprecated. Jenkins credential store updated.',
    correlationId: 'corr-sec-9933', affectedResources: ['vault/aws/prod#deploy', 'jenkins/aws-prod-cred'],
    recommendation: 'Ninguna acción requerida. Próxima rotación programada en 90 días.',
  },
  {
    id: 'sev-4', event: 'Puerto 22 expuesto detectado', source: 'Escaneo', severity: 'critical',
    user: 'security-scanner', ip: '—', at: ago(480), status: 'failed',
    description: 'Escaneo de superficie detectó SSH (22/tcp) accesible desde Internet en instancia web.',
    details: 'Target: aws-prod-web-2 (54.210.x.x). Open port 22/tcp from 0.0.0.0/0. Severity: CRITICAL.',
    correlationId: 'corr-sec-4401', affectedResources: ['aws-prod-web-2', 'sg-web-prod'],
    recommendation: 'Restringir ingress a bastion/VPN. Remediar de inmediato y abrir incidente de seguridad.',
  },
  {
    id: 'sev-5', event: 'Acceso denegado a recurso prod', source: 'Plataforma', severity: 'warning',
    user: 'contractor@ext', ip: '198.51.100.8', at: ago(60), status: 'warning',
    description: 'Usuario externo intentó acceder a workspace Terraform prod sin permisos RBAC.',
    details: '403 Forbidden: workspace prod-us-east. Required role: terraform-admin. User role: viewer.',
    correlationId: 'corr-sec-5522', affectedResources: ['prod-us-east', 'RBAC/terraform'],
    recommendation: 'Revisar solicitud de acceso. Si legítimo, elevar permisos vía flujo de aprobaciones.',
  },
]

export const defaultComplianceTrail = (): ComplianceTrailEntry[] => [
  {
    id: 'ct-1', action: 'Aprobación cambio RFC-1042', actor: 'security@cloudops', resource: 'sg-web-prod',
    framework: 'SOC2', at: ago(240), outcome: 'Aprobado', controlId: 'CC6.1',
    description: 'Cambio de reglas security group aprobado tras revisión de impacto.',
    evidence: 'RFC-1042 signed by security@cloudops and ops-lead@cloudops. Peer review completed.',
    notes: 'Ventana de mantenimiento: dom 03:00–05:00 UTC. Rollback plan documentado.',
  },
  {
    id: 'ct-2', action: 'Violación remediada', actor: 'ops@cloudops', resource: 'vps-bastion-01',
    framework: 'ISO 27001', at: ago(720), outcome: 'Cerrado', controlId: 'A.9.4.2',
    description: 'Puerto 22 restringido a rangos VPN corporativos tras hallazgo de escaneo.',
    evidence: 'iptables -L snapshot attached. Nessus rescan: PASS. Ticket INC-8842 closed.',
    notes: 'Remediación verificada por security-scanner. Sin regresiones detectadas.',
  },
  {
    id: 'ct-3', action: 'Export informe GDPR', actor: 'compliance@cloudops', resource: 'Informe anual 2026',
    framework: 'GDPR', at: ago(1440), outcome: 'Completado', controlId: 'Art. 30',
    description: 'Registro de actividades de tratamiento exportado para auditoría externa.',
    evidence: 'PDF firmado digitalmente. Hash SHA-256: a3f2…9c1b. Retención: 7 años.',
    notes: 'Entregado a auditor externo DPO Consulting. Copia archivada en vault/compliance.',
  },
  {
    id: 'ct-4', action: 'Revisión política IAM', actor: 'admin@cloudops', resource: 'legacy-admin',
    framework: 'SOC2', at: ago(2880), outcome: 'Pendiente', controlId: 'CC6.3',
    description: 'Revisión trimestral de usuarios con privilegios elevados pendiente de cierre.',
    evidence: 'Lista de 12 usuarios con AdministratorAccess. 3 sin actividad >90 días.',
    notes: 'Acción requerida: desactivar cuentas inactivas antes del 15 Jun 2026.',
  },
]

export const defaultAuditExports = (): AuditExport[] => [
  {
    id: 'exp-1', name: 'Registro actividad — Jun 2026', format: 'CSV', records: 1240,
    status: 'success', generatedAt: ago(60), requestedBy: 'admin@cloudops',
    period: '01 Jun – 07 Jun 2026', filters: 'Todos los módulos · 30 días',
    sizeKb: 842, includes: ['action', 'resource', 'user', 'ip', 'timestamp', 'metadata'],
  },
  {
    id: 'exp-2', name: 'Eventos seguridad — 7 días', format: 'JSON', records: 89,
    status: 'success', generatedAt: ago(360), requestedBy: 'security@cloudops',
    period: 'Últimos 7 días', filters: 'Severidad ≥ warning',
    sizeKb: 156, includes: ['event', 'severity', 'source', 'details', 'correlationId'],
  },
  {
    id: 'exp-3', name: 'Trail cumplimiento Q2', format: 'PDF', records: 42,
    status: 'running', generatedAt: ago(10), requestedBy: 'compliance@cloudops',
    period: 'Q2 2026', filters: 'SOC2 + ISO 27001 + GDPR',
    sizeKb: 0, includes: ['action', 'framework', 'controlId', 'evidence', 'outcome'],
  },
]
