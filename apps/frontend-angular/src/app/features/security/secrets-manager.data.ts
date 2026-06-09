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

export const defaultSecrets = (): SecretRecord[] => []

export const defaultRotations = (): SecretRotation[] => []

export const defaultSecretAudit = (): SecretAuditEntry[] => []

export const defaultRotationPolicies = (): RotationPolicy[] => []
