const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()
const ahead = (days: number): string => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

export type SecretType = 'ssh' | 'cloud' | 'api' | 'vault' | 'db'

export interface SecretRecord {
  id: string
  name: string
  type: SecretType
  reference: string
  expires: string
  status: string
  owner: string
  lastRotated: string
  environments: string[]
  description?: string
  rotationPolicy?: string
  accessCount30d?: number
  lastAccess?: string
  tags?: string[]
}

export interface SecretRotation {
  id: string
  secret: string
  policy: string
  lastRotated: string
  nextRotation: string
  status: string
  autoRotate: boolean
  method: string
  window: string
  secretsAffected: number
}

export interface SecretAuditEntry {
  id: string
  action: string
  secret: string
  user: string
  at: string
  ip: string
}

export interface RotationPolicy {
  id: string
  name: string
  intervalDays: number
  scope: string
  secretsCount: number
  status: string
  description: string
  rules: string[]
  lastRun: string
  nextRun: string
  complianceNotes: string
}

export const SECRET_TYPE_LABELS: Record<SecretType, string> = {
  ssh: 'SSH',
  cloud: 'Cloud',
  api: 'API',
  vault: 'Vault',
  db: 'Base de datos',
}

export const defaultSecrets = (): SecretRecord[] => [
  {
    id: 'sec-1', name: 'aws-prod-deploy', type: 'cloud', reference: 'vault/aws/prod#deploy', expires: '2026-09-01',
    status: 'running', owner: 'terraform-sa', lastRotated: ago(43200), environments: ['prod'],
    description: 'Credenciales IAM para despliegues Terraform en producción AWS.',
    rotationPolicy: 'cloud-prod-90d', accessCount30d: 142, lastAccess: ago(30), tags: ['aws', 'prod', 'deploy'],
  },
  {
    id: 'sec-2', name: 'ssh-ops-team', type: 'ssh', reference: 'vault/ssh/ops', expires: '2026-07-15',
    status: 'running', owner: 'ops@cloudops', lastRotated: ago(86400), environments: ['prod', 'staging'],
    description: 'Clave SSH compartida del equipo de operaciones para acceso bastion.',
    rotationPolicy: 'ssh-keys-45d', accessCount30d: 89, lastAccess: ago(120), tags: ['ssh', 'bastion'],
  },
  {
    id: 'sec-3', name: 'github-ci-token', type: 'api', reference: 'vault/ci/github', expires: '2026-06-10',
    status: 'warning', owner: 'jenkins', lastRotated: ago(129600), environments: ['ci'],
    description: 'Token PAT de GitHub para pipelines CI/CD. Expira en menos de 30 días.',
    rotationPolicy: 'api-tokens-60d', accessCount30d: 312, lastAccess: ago(15), tags: ['github', 'ci'],
  },
  {
    id: 'sec-4', name: 'gcp-sa-deploy', type: 'cloud', reference: 'vault/gcp/prod#sa', expires: '2026-11-20',
    status: 'running', owner: 'terraform-sa', lastRotated: ago(20160), environments: ['prod'],
    description: 'Service account JSON para despliegues en GCP producción.',
    rotationPolicy: 'cloud-prod-90d', accessCount30d: 67, lastAccess: ago(3600), tags: ['gcp', 'prod'],
  },
  {
    id: 'sec-5', name: 'postgres-prod', type: 'db', reference: 'vault/db/postgres-prod', expires: '2026-08-01',
    status: 'running', owner: 'dba@cloudops', lastRotated: ago(57600), environments: ['prod'],
    description: 'Credenciales de conexión PostgreSQL producción (usuario app_rw).',
    rotationPolicy: 'cloud-prod-90d', accessCount30d: 2048, lastAccess: ago(5), tags: ['postgres', 'prod'],
  },
  {
    id: 'sec-6', name: 'vault-unseal-key', type: 'vault', reference: 'vault/meta/unseal', expires: '—',
    status: 'running', owner: 'security@cloudops', lastRotated: ago(259200), environments: ['global'],
    description: 'Fragmento de clave de unseal de Vault (Shamir 3/5). Rotación manual trimestral.',
    rotationPolicy: 'manual-quarterly', accessCount30d: 2, lastAccess: ago(43200), tags: ['vault', 'critical'],
  },
]

export const defaultRotations = (): SecretRotation[] => [
  {
    id: 'rot-1', secret: 'aws-prod-deploy', policy: 'cloud-prod-90d', lastRotated: ago(43200),
    nextRotation: ahead(45), status: 'running', autoRotate: true,
    method: 'Generación automática IAM + invalidación anterior', window: 'Dom 03:00–05:00 UTC', secretsAffected: 4,
  },
  {
    id: 'rot-2', secret: 'github-ci-token', policy: 'api-tokens-60d', lastRotated: ago(129600),
    nextRotation: ahead(12), status: 'warning', autoRotate: true,
    method: 'Nuevo PAT GitHub + actualización Jenkins credential store', window: 'Sáb 02:00–04:00 UTC', secretsAffected: 3,
  },
  {
    id: 'rot-3', secret: 'ssh-ops-team', policy: 'ssh-keys-45d', lastRotated: ago(86400),
    nextRotation: ahead(28), status: 'running', autoRotate: false,
    method: 'Generación ed25519 + distribución manual a bastion', window: 'Ventana acordada con ops', secretsAffected: 2,
  },
]

export const defaultSecretAudit = (): SecretAuditEntry[] => [
  { id: 'aud-1', action: 'READ', secret: 'aws-prod-deploy', user: 'terraform-sa', at: ago(30), ip: '10.0.1.42' },
  { id: 'aud-2', action: 'ROTATE', secret: 'ssh-ops-team', user: 'admin@cloudops', at: ago(3600), ip: '203.0.113.10' },
  { id: 'aud-3', action: 'CREATE', secret: 'gcp-sa-deploy', user: 'admin@cloudops', at: ago(7200), ip: '203.0.113.10' },
  { id: 'aud-4', action: 'READ', secret: 'github-ci-token', user: 'jenkins-runner', at: ago(120), ip: '10.0.2.18' },
  { id: 'aud-5', action: 'DELETE', secret: 'leaked-token-2024', user: 'security-bot', at: ago(14400), ip: '10.0.0.5' },
]

export const defaultRotationPolicies = (): RotationPolicy[] => [
  {
    id: 'pol-1', name: 'cloud-prod-90d', intervalDays: 90, scope: 'Credenciales cloud producción', secretsCount: 4, status: 'running',
    description: 'Rotación automática cada 90 días para credenciales cloud en entorno producción (AWS, GCP, Azure).',
    rules: [
      'Generar credencial nueva antes de invalidar la anterior',
      'Notificar a propietarios 7 días antes del vencimiento',
      'Registrar rotación en auditoría con trazabilidad completa',
      'Validar conectividad post-rotación antes de cerrar ventana',
    ],
    lastRun: ago(43200), nextRun: ahead(45),
    complianceNotes: 'Cumple SOC2 CC6.1 y ISO 27001 A.9.4.3 — rotación periódica de credenciales privilegiadas.',
  },
  {
    id: 'pol-2', name: 'api-tokens-60d', intervalDays: 60, scope: 'Tokens API CI/CD', secretsCount: 3, status: 'running',
    description: 'Rotación de tokens API usados en pipelines CI/CD y integraciones externas.',
    rules: [
      'Rotación en ventana de bajo tráfico (fin de semana)',
      'Actualizar stores de credenciales (Jenkins, GitHub Actions)',
      'Revocar token anterior tras validación exitosa',
    ],
    lastRun: ago(129600), nextRun: ahead(12),
    complianceNotes: 'Alineado con GDPR Art. 32 — medidas técnicas para protección de accesos automatizados.',
  },
  {
    id: 'pol-3', name: 'ssh-keys-45d', intervalDays: 45, scope: 'Claves SSH operaciones', secretsCount: 2, status: 'warning',
    description: 'Rotación de claves SSH del equipo de operaciones. Requiere coordinación manual con bastion hosts.',
    rules: [
      'Generar par ed25519 nuevo',
      'Distribuir clave pública a bastion y jump hosts',
      'Período de gracia de 48h con clave anterior activa',
      'Confirmar acceso del equipo antes de revocar clave antigua',
    ],
    lastRun: ago(86400), nextRun: ahead(28),
    complianceNotes: 'Pendiente revisión — última rotación manual retrasada 5 días. Requiere aprobación de security lead.',
  },
]
