const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()

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
}

export interface SecretRotation {
  id: string
  secret: string
  policy: string
  lastRotated: string
  nextRotation: string
  status: string
  autoRotate: boolean
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
}

export const SECRET_TYPE_LABELS: Record<SecretType, string> = {
  ssh: 'SSH',
  cloud: 'Cloud',
  api: 'API',
  vault: 'Vault',
  db: 'Base de datos',
}

export const defaultSecrets = (): SecretRecord[] => [
  { id: 'sec-1', name: 'aws-prod-deploy', type: 'cloud', reference: 'vault/aws/prod#deploy', expires: '2026-09-01', status: 'running', owner: 'terraform-sa', lastRotated: ago(43200), environments: ['prod'] },
  { id: 'sec-2', name: 'ssh-ops-team', type: 'ssh', reference: 'vault/ssh/ops', expires: '2026-07-15', status: 'running', owner: 'ops@cloudops', lastRotated: ago(86400), environments: ['prod', 'staging'] },
  { id: 'sec-3', name: 'github-ci-token', type: 'api', reference: 'vault/ci/github', expires: '2026-06-10', status: 'warning', owner: 'jenkins', lastRotated: ago(129600), environments: ['ci'] },
  { id: 'sec-4', name: 'gcp-sa-deploy', type: 'cloud', reference: 'vault/gcp/prod#sa', expires: '2026-11-20', status: 'running', owner: 'terraform-sa', lastRotated: ago(20160), environments: ['prod'] },
  { id: 'sec-5', name: 'postgres-prod', type: 'db', reference: 'vault/db/postgres-prod', expires: '2026-08-01', status: 'running', owner: 'dba@cloudops', lastRotated: ago(57600), environments: ['prod'] },
  { id: 'sec-6', name: 'vault-unseal-key', type: 'vault', reference: 'vault/meta/unseal', expires: '—', status: 'running', owner: 'security@cloudops', lastRotated: ago(259200), environments: ['global'] },
]

export const defaultRotations = (): SecretRotation[] => [
  { id: 'rot-1', secret: 'aws-prod-deploy', policy: 'Cada 90 días', lastRotated: ago(43200), nextRotation: '2026-09-01', status: 'running', autoRotate: true },
  { id: 'rot-2', secret: 'github-ci-token', policy: 'Cada 60 días', lastRotated: ago(129600), nextRotation: '2026-06-10', status: 'warning', autoRotate: true },
  { id: 'rot-3', secret: 'ssh-ops-team', policy: 'Cada 45 días', lastRotated: ago(86400), nextRotation: '2026-07-15', status: 'running', autoRotate: false },
]

export const defaultSecretAudit = (): SecretAuditEntry[] => [
  { id: 'aud-1', action: 'READ', secret: 'aws-prod-deploy', user: 'terraform-sa', at: ago(30), ip: '10.0.1.42' },
  { id: 'aud-2', action: 'ROTATE', secret: 'ssh-ops-team', user: 'admin@cloudops', at: ago(3600), ip: '203.0.113.10' },
  { id: 'aud-3', action: 'CREATE', secret: 'gcp-sa-deploy', user: 'admin@cloudops', at: ago(7200), ip: '203.0.113.10' },
  { id: 'aud-4', action: 'READ', secret: 'github-ci-token', user: 'jenkins-runner', at: ago(120), ip: '10.0.2.18' },
  { id: 'aud-5', action: 'DELETE', secret: 'leaked-token-2024', user: 'security-bot', at: ago(14400), ip: '10.0.0.5' },
]

export const defaultRotationPolicies = (): RotationPolicy[] => [
  { id: 'pol-1', name: 'cloud-prod-90d', intervalDays: 90, scope: 'Credenciales cloud producción', secretsCount: 4, status: 'running' },
  { id: 'pol-2', name: 'api-tokens-60d', intervalDays: 60, scope: 'Tokens API CI/CD', secretsCount: 3, status: 'running' },
  { id: 'pol-3', name: 'ssh-keys-45d', intervalDays: 45, scope: 'Claves SSH operaciones', secretsCount: 2, status: 'warning' },
]
