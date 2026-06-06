import type { SecuritySeverity } from './security.config'

const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()

export interface SecurityKpi {
  label: string
  value: string | number
  icon: string
  tone: string
  hint?: string
  subtitle?: string
}

export interface FindingHistoryEntry {
  at: string
  action: string
  user: string
  note?: string
}

export interface SecurityRisk {
  id: string
  finding: string
  description: string
  resource: string
  resourceType: string
  provider: string
  region: string
  severity: SecuritySeverity
  status: string
  category: string
  riskType: string
  detectedAt: string
  recommendation: string
  impact: string
  remediationSteps: string[]
  evidence: string
  evidenceType: string
  cve?: string
  owner: string
  tags: string[]
  relatedResources: string[]
  history: FindingHistoryEntry[]
  remediable: boolean
  remediationAction?: string
}

export interface OpenPort {
  id: string
  host: string
  port: string
  service: string
  exposure: string
  protocol: string
  risk: SecuritySeverity
  provider: string
}

export interface ExposedService {
  id: string
  name: string
  endpoint: string
  auth: string
  exposure: string
  status: string
  provider: string
}

export interface FirewallRule {
  id: string
  name: string
  provider: string
  resource: string
  rules: number
  openPorts: number
  status: string
  egressRestricted: boolean
}

export interface SshKeyRecord {
  id: string
  name: string
  fingerprint: string
  host: string
  ageDays: number
  status: string
  lastUsed: string
  owner: string
}

export interface SecretExposure {
  id: string
  secret: string
  maskedValue: string
  location: string
  type: string
  severity: SecuritySeverity
  status: string
  detectedAt: string
  service: string
  origin: string
}

export interface SecurityRecommendation {
  id: string
  title: string
  impact: string
  effort: string
  status: string
  category: string
  description: string
}

const baseHistory = (mins: number): FindingHistoryEntry[] => [
  { at: ago(mins), action: 'Detectado', user: 'security-scanner', note: 'Hallazgo registrado por escaneo automático' },
  { at: ago(mins + 30), action: 'Clasificado', user: 'policy-engine', note: 'Severidad asignada según reglas de postura' },
]

export const defaultSecurityKpis = (): SecurityKpi[] => [
  {
    label: 'Puntuación de riesgo',
    value: '72/100',
    icon: 'shield',
    tone: 'warn',
    hint: 'Medio',
    subtitle: 'Postura global de la plataforma',
  },
  {
    label: 'Puertos abiertos',
    value: 18,
    icon: 'settings_ethernet',
    tone: 'warn',
    subtitle: '3 expuestos a Internet',
  },
  {
    label: 'Servicios expuestos',
    value: 4,
    icon: 'public_off',
    tone: 'warn',
    subtitle: '1 sin autenticación fuerte',
  },
  {
    label: 'Recomendaciones',
    value: 9,
    icon: 'lightbulb',
    tone: 'pink',
    subtitle: '5 pendientes de aplicar',
  },
]

export const defaultSecurityRisks = (): SecurityRisk[] => [
  {
    id: 'risk-1',
    finding: 'Puerto SSH 22 abierto a 0.0.0.0/0',
    description: 'El host bastión acepta conexiones SSH desde cualquier dirección IP pública, aumentando el riesgo de fuerza bruta y acceso no autorizado.',
    resource: 'vps-bastion-01',
    resourceType: 'VPS',
    provider: 'VPS',
    region: 'eu-west-1',
    severity: 'critical',
    status: 'failed',
    category: 'Red',
    riskType: 'Exposición de red',
    detectedAt: ago(120),
    recommendation: 'Restringir SSH al CIDR de la VPN corporativa (10.0.0.0/8)',
    impact: 'Acceso remoto no autorizado al bastión y posible pivot a la red interna',
    remediationSteps: [
      'Actualizar regla UFW/iptables para permitir solo 10.0.0.0/8',
      'Verificar acceso desde VPN corporativa',
      'Habilitar fail2ban en el host',
    ],
    evidence: 'INBOUND tcp/22 ALLOW 0.0.0.0/0\nHost: vps-bastion-01\nFirewall: ufw-bastion\nLast scan: port-audit-2026-06-06',
    evidenceType: 'Regla de firewall',
    cve: 'CWE-284',
    owner: 'infra-team',
    tags: ['ssh', 'bastion', 'internet-facing'],
    relatedResources: ['ufw-bastion', 'vpn-gateway'],
    history: baseHistory(120),
    remediable: true,
    remediationAction: 'Cerrar puerto 22 a 0.0.0.0/0 y restringir a VPN CIDR',
  },
  {
    id: 'risk-2',
    finding: 'Bucket S3 con lectura pública',
    description: 'El bucket de logs permite lectura pública anónima, exponiendo potencialmente datos sensibles de auditoría.',
    resource: 'aws-logs-archive',
    resourceType: 'S3 Bucket',
    provider: 'AWS',
    region: 'us-east-1',
    severity: 'critical',
    status: 'warning',
    category: 'Almacenamiento',
    riskType: 'Exposición de datos',
    detectedAt: ago(360),
    recommendation: 'Deshabilitar ACL pública y habilitar Block Public Access',
    impact: 'Filtración de logs y datos de auditoría a Internet',
    remediationSteps: [
      'Activar Block Public Access a nivel bucket y cuenta',
      'Revisar bucket policy y eliminar Principal: "*"',
      'Habilitar cifrado SSE-KMS',
    ],
    evidence: '{\n  "Effect": "Allow",\n  "Principal": "*",\n  "Action": "s3:GetObject",\n  "Resource": "arn:aws:s3:::aws-logs-archive/*"\n}',
    evidenceType: 'Política S3',
    owner: 'platform-team',
    tags: ['s3', 'public-access', 'logs'],
    relatedResources: ['aws-prod-account', 'cloudtrail-logs'],
    history: baseHistory(360),
    remediable: true,
    remediationAction: 'Eliminar acceso público del bucket S3',
  },
  {
    id: 'risk-3',
    finding: 'Clave IAM admin sin uso > 90 días',
    description: 'Clave de acceso IAM con permisos administrativos no utilizada en más de 90 días.',
    resource: 'aws-root-alt',
    resourceType: 'IAM Access Key',
    provider: 'AWS',
    region: 'global',
    severity: 'high',
    status: 'warning',
    category: 'IAM',
    riskType: 'Credencial obsoleta',
    detectedAt: ago(1440),
    recommendation: 'Rotar o desactivar la clave de acceso',
    impact: 'Clave olvidada con privilegios elevados — vector de compromiso',
    remediationSteps: ['Desactivar clave AKIA************', 'Crear nueva clave con scope mínimo', 'Forzar rotación en 30 días'],
    evidence: 'AccessKeyId: AKIA************\nLastUsed: 2026-02-15\nPermissions: AdministratorAccess\nAge: 112 days',
    evidenceType: 'Política IAM',
    owner: 'security-team',
    tags: ['iam', 'admin', 'stale-key'],
    relatedResources: ['admin-role', 'aws-prod-account'],
    history: baseHistory(1440),
    remediable: true,
    remediationAction: 'Desactivar clave IAM obsoleta',
  },
  {
    id: 'risk-4',
    finding: 'Contenedor con imagen sin escanear',
    description: 'Imagen Docker desplegada en producción sin escaneo de vulnerabilidades en pipeline CI.',
    resource: 'checkout-api:latest',
    resourceType: 'Container Image',
    provider: 'Docker',
    region: 'registry.internal',
    severity: 'high',
    status: 'pending',
    category: 'Contenedores',
    riskType: 'Supply chain',
    detectedAt: ago(720),
    recommendation: 'Integrar escaneo Trivy en pipeline CI',
    impact: 'CVEs no detectadas en imagen de producción',
    remediationSteps: ['Añadir stage Trivy en Jenkins/GitLab CI', 'Bloquear deploy si CVSS > 7', 'Reescanear imagen actual'],
    evidence: 'Image: checkout-api:latest\nDigest: sha256:abc123…\nScan status: NOT_SCANNED\nRegistry: harbor.ops.local',
    evidenceType: 'Metadata contenedor',
    owner: 'devops-team',
    tags: ['docker', 'ci', 'trivy'],
    relatedResources: ['jenkins-deploy-job', 'harbor-registry'],
    history: baseHistory(720),
    remediable: true,
    remediationAction: 'Ejecutar escaneo Trivy y bloquear deploy',
  },
  {
    id: 'risk-5',
    finding: 'TLS 1.0 habilitado en load balancer',
    description: 'El ALB de borde acepta TLS 1.0, protocolo obsoleto con vulnerabilidades conocidas.',
    resource: 'alb-prod-edge',
    resourceType: 'Application Load Balancer',
    provider: 'AWS',
    region: 'eu-west-1',
    severity: 'medium',
    status: 'pending',
    category: 'Cifrado',
    riskType: 'Protocolo obsoleto',
    detectedAt: ago(2880),
    recommendation: 'Forzar TLS 1.2+ en listener HTTPS',
    impact: 'Downgrade attacks y incumplimiento PCI-DSS',
    remediationSteps: ['Actualizar security policy a ELBSecurityPolicy-TLS13-1-2-2021-06', 'Verificar compatibilidad clientes', 'Monitorear handshake failures'],
    evidence: 'Listener: HTTPS:443\nPolicy: ELBSecurityPolicy-2016-08\nProtocols: TLSv1, TLSv1.1, TLSv1.2',
    evidenceType: 'Configuración LB',
    owner: 'network-team',
    tags: ['tls', 'alb', 'encryption'],
    relatedResources: ['api.cloudops.io', 'cert-prod-edge'],
    history: baseHistory(2880),
    remediable: true,
    remediationAction: 'Actualizar policy TLS del ALB',
  },
  {
    id: 'risk-6',
    finding: 'Security group demasiado permisivo',
    description: 'Security group permite tráfico entrante desde 0.0.0.0/0 en puertos de aplicación.',
    resource: 'sg-web-public',
    resourceType: 'Security Group',
    provider: 'AWS',
    region: 'us-east-1',
    severity: 'high',
    status: 'failed',
    category: 'Red',
    riskType: 'Exposición de red',
    detectedAt: ago(200),
    recommendation: 'Restringir ingress al CIDR del load balancer y VPN',
    impact: 'Superficie de ataque ampliada en tier web',
    remediationSteps: ['Eliminar regla 0.0.0.0/0:8080', 'Permitir solo sg-alb-prod', 'Auditar conexiones activas'],
    evidence: 'sg-web-public:\n  - Port 8080 TCP from 0.0.0.0/0\n  - Port 443 TCP from 0.0.0.0/0\nAttached: i-web-prod-01, i-web-prod-02',
    evidenceType: 'Security Group',
    owner: 'infra-team',
    tags: ['sg', 'aws', 'ingress'],
    relatedResources: ['i-web-prod-01', 'alb-prod-edge'],
    history: baseHistory(200),
    remediable: true,
    remediationAction: 'Restringir reglas ingress del security group',
  },
  {
    id: 'risk-7',
    finding: 'Secreto filtrado en variable de entorno',
    description: 'Token de API detectado en variable de entorno de contenedor en texto plano.',
    resource: 'checkout-api-pod-7f2a',
    resourceType: 'Kubernetes Pod',
    provider: 'Kubernetes',
    region: 'cluster-prod',
    severity: 'critical',
    status: 'failed',
    category: 'Secretos',
    riskType: 'Exposición de credencial',
    detectedAt: ago(45),
    recommendation: 'Migrar a Kubernetes Secret o Vault sidecar',
    impact: 'Compromiso de token API y acceso a servicios externos',
    remediationSteps: ['Revocar token ghp_************', 'Inyectar via Vault Agent', 'Escanear historial git'],
    evidence: 'Pod: checkout-api-7f2a\nEnv: GITHUB_TOKEN=ghp_************\nNamespace: production\nDetected by: secret-scanner',
    evidenceType: 'Variable de entorno',
    owner: 'devops-team',
    tags: ['k8s', 'secret', 'github'],
    relatedResources: ['checkout-api-deploy', 'vault-prod'],
    history: baseHistory(45),
    remediable: true,
    remediationAction: 'Revocar token y migrar a Vault',
  },
  {
    id: 'risk-8',
    finding: 'Firewall sin regla de salida restringida',
    description: 'NSG de tier aplicación permite egress completo sin restricciones a destinos externos.',
    resource: 'nsg-app-tier',
    resourceType: 'Network Security Group',
    provider: 'Azure',
    region: 'westeurope',
    severity: 'medium',
    status: 'pending',
    category: 'Red',
    riskType: 'Egress permisivo',
    detectedAt: ago(500),
    recommendation: 'Implementar reglas egress deny-by-default',
    impact: 'Exfiltración de datos y C2 sin restricción',
    remediationSteps: ['Denegar egress 0.0.0.0/0 por defecto', 'Whitelist destinos necesarios', 'Habilitar NSG flow logs'],
    evidence: 'nsg-app-tier:\n  Egress: Allow * * * 0.0.0.0/0\n  Priority: 100\n  No deny rules configured',
    evidenceType: 'Regla de firewall',
    owner: 'network-team',
    tags: ['azure', 'nsg', 'egress'],
    relatedResources: ['rg-prod', 'vnet-app'],
    history: baseHistory(500),
    remediable: true,
    remediationAction: 'Restringir reglas egress del NSG',
  },
]

export const defaultOpenPorts = (): OpenPort[] => [
  { id: 'port-1', host: 'web-prod-01', port: '443', service: 'https', exposure: 'LB público', protocol: 'TCP', risk: 'low', provider: 'AWS' },
  { id: 'port-2', host: 'vps-bastion', port: '22', service: 'ssh', exposure: '0.0.0.0/0', protocol: 'TCP', risk: 'critical', provider: 'VPS' },
  { id: 'port-3', host: 'api-gateway', port: '8080', service: 'http', exposure: 'VPC interna', protocol: 'TCP', risk: 'medium', provider: 'AWS' },
  { id: 'port-4', host: 'db-replica-02', port: '5432', service: 'postgresql', exposure: 'Subred app', protocol: 'TCP', risk: 'medium', provider: 'AWS' },
  { id: 'port-5', host: 'redis-cache', port: '6379', service: 'redis', exposure: '0.0.0.0/0', protocol: 'TCP', risk: 'critical', provider: 'Docker' },
]

export const defaultExposedServices = (): ExposedService[] => [
  { id: 'svc-1', name: 'API pública checkout', endpoint: 'https://api.cloudops.io', auth: 'JWT', exposure: 'Internet', status: 'running', provider: 'AWS' },
  { id: 'svc-2', name: 'Jenkins UI', endpoint: 'https://jenkins.internal', auth: 'LDAP', exposure: 'VPN', status: 'warning', provider: 'VPS' },
  { id: 'svc-3', name: 'Grafana métricas', endpoint: 'https://grafana.ops.local', auth: 'OAuth', exposure: 'VPC', status: 'running', provider: 'Kubernetes' },
  { id: 'svc-4', name: 'Vault UI', endpoint: 'https://vault.prod', auth: 'MFA', exposure: 'Bastion', status: 'running', provider: 'AWS' },
]

export const defaultFirewalls = (): FirewallRule[] => [
  { id: 'fw-1', name: 'sg-web-prod', provider: 'AWS', resource: 'vpc-prod', rules: 12, openPorts: 2, status: 'warning', egressRestricted: false },
  { id: 'fw-2', name: 'sg-db-tier', provider: 'AWS', resource: 'vpc-prod', rules: 6, openPorts: 0, status: 'running', egressRestricted: true },
  { id: 'fw-3', name: 'ufw-bastion', provider: 'VPS', resource: 'vps-bastion-01', rules: 8, openPorts: 1, status: 'failed', egressRestricted: false },
  { id: 'fw-4', name: 'nsg-app-tier', provider: 'Azure', resource: 'rg-prod', rules: 10, openPorts: 1, status: 'running', egressRestricted: false },
]

export const defaultSshKeys = (): SshKeyRecord[] => [
  { id: 'ssh-1', name: 'ops-team-ed25519', fingerprint: 'SHA256:ab12…f9e0', host: 'vps-bastion-01', ageDays: 45, status: 'running', lastUsed: ago(30), owner: 'ops-team' },
  { id: 'ssh-2', name: 'ci-deploy-rsa', fingerprint: 'SHA256:cd34…a1b2', host: 'jenkins-runner', ageDays: 180, status: 'warning', lastUsed: ago(1440), owner: 'ci-bot' },
  { id: 'ssh-3', name: 'contractor-temp', fingerprint: 'SHA256:ef56…c3d4', host: 'vps-staging-03', ageDays: 92, status: 'failed', lastUsed: ago(10080), owner: 'contractor@ext' },
]

export const defaultSecretExposures = (): SecretExposure[] => [
  { id: 'exp-1', secret: 'AWS_ACCESS_KEY', maskedValue: 'AKIA************', location: 'repo/monorepo/.env.example', type: 'Credencial cloud', severity: 'critical', status: 'failed', detectedAt: ago(60), service: 'checkout-api', origin: 'Git commit' },
  { id: 'exp-2', secret: 'GITHUB_TOKEN', maskedValue: 'ghp_************', location: 'jenkins/job/deploy/config.xml', type: 'Token API', severity: 'high', status: 'warning', detectedAt: ago(480), service: 'jenkins-deploy', origin: 'CI config' },
  { id: 'exp-3', secret: 'OPENAI_API_KEY', maskedValue: 'sk-************', location: 'k8s/secret/ai-assistant', type: 'Token API', severity: 'medium', status: 'running', detectedAt: ago(2880), service: 'ai-assistant', origin: 'K8s Secret' },
]

export const defaultRecommendations = (): SecurityRecommendation[] => [
  { id: 'rec-1', title: 'Restringir SSH a CIDR VPN', impact: 'Alto', effort: 'Bajo', status: 'pending', category: 'Red', description: 'Limitar acceso SSH del bastión a la red corporativa.' },
  { id: 'rec-2', title: 'Habilitar MFA para admins', impact: 'Alto', effort: 'Medio', status: 'running', category: 'IAM', description: 'Forzar MFA en cuentas con rol administrador.' },
  { id: 'rec-3', title: 'Rotar tokens API > 90 días', impact: 'Medio', effort: 'Bajo', status: 'pending', category: 'Secretos', description: 'Automatizar rotación de tokens de larga duración.' },
  { id: 'rec-4', title: 'Cerrar puerto Redis público', impact: 'Alto', effort: 'Bajo', status: 'pending', category: 'Red', description: 'Eliminar exposición 0.0.0.0/0 en Redis cache.' },
  { id: 'rec-5', title: 'Escanear imágenes Docker en CI', impact: 'Medio', effort: 'Medio', status: 'running', category: 'Contenedores', description: 'Integrar Trivy en pipeline de build.' },
]

export const buildResourceInspect = (risk: SecurityRisk) => ({
  name: risk.resource,
  type: risk.resourceType,
  provider: risk.provider,
  region: risk.region,
  status: risk.status,
  owner: risk.owner,
  tags: risk.tags,
  relatedResources: risk.relatedResources,
  config: risk.evidence.split('\n').slice(0, 4).join('\n'),
  risks: [risk.finding],
})
