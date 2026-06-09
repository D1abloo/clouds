const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()

export interface AccessAssignment {
  id: string
  user: string
  role: string
  scope: string
  status: string
  grantedAt: string
  expiresAt?: string
  mfa: boolean
}

export interface IamPolicy {
  id: string
  name: string
  resources: string
  permissions: number
  status: string
  lastReview: string
}

export interface SshAccess {
  id: string
  user: string
  host: string
  key: string
  method: string
  status: string
  lastLogin: string
}

export interface CloudPermission {
  id: string
  principal: string
  provider: string
  service: string
  actions: string
  status: string
}

export interface AccessViolation {
  id: string
  user: string
  violation: string
  resource: string
  severity: string
  status: string
  detectedAt: string
}

export const defaultAssignments = (): AccessAssignment[] => [
  { id: 'asg-1', user: 'admin@cloudops', role: 'Super Admin', scope: 'Global', status: 'running', grantedAt: ago(525600), mfa: true },
  { id: 'asg-2', user: 'dev@cloudops', role: 'Developer', scope: 'Staging', status: 'running', grantedAt: ago(259200), mfa: true },
  { id: 'asg-3', user: 'contractor@ext', role: 'Solo lectura', scope: 'AWS prod', status: 'warning', grantedAt: ago(43200), expiresAt: ago(-20160), mfa: false },
  { id: 'asg-4', user: 'ops@cloudops', role: 'Operador', scope: 'Producción', status: 'running', grantedAt: ago(172800), mfa: true },
]

export const defaultIamPolicies = (): IamPolicy[] => [
  { id: 'iam-1', name: 'terraform-apply-prod', resources: 'Workspaces Terraform', permissions: 12, status: 'running', lastReview: ago(43200) },
  { id: 'iam-2', name: 'ssh-bastion-only', resources: 'VPS SSH', permissions: 4, status: 'running', lastReview: ago(86400) },
  { id: 'iam-3', name: 's3-read-logs', resources: 'Buckets S3 logs', permissions: 2, status: 'running', lastReview: ago(129600) },
  { id: 'iam-4', name: 'k8s-deploy-staging', resources: 'Cluster staging', permissions: 8, status: 'warning', lastReview: ago(259200) },
]

export const defaultSshAccess = (): SshAccess[] => [
  { id: 'ssh-a-1', user: 'ops@cloudops', host: 'vps-bastion-01', key: 'ops-team-ed25519', method: 'Clave pública', status: 'running', lastLogin: ago(60) },
  { id: 'ssh-a-2', user: 'dev@cloudops', host: 'vps-staging-03', key: 'dev-laptop-rsa', method: 'Clave pública', status: 'running', lastLogin: ago(1440) },
  { id: 'ssh-a-3', user: 'contractor@ext', host: 'vps-bastion-01', key: 'contractor-temp', method: 'Clave temporal', status: 'warning', lastLogin: ago(10080) },
]

export const defaultCloudPermissions = (): CloudPermission[] => [
  { id: 'cp-1', principal: 'terraform-sa', provider: 'AWS', service: 'EC2, S3, IAM', actions: 'ec2:*, s3:Get*, iam:PassRole', status: 'running' },
  { id: 'cp-2', principal: 'jenkins-deploy', provider: 'GCP', service: 'GKE, Artifact Registry', actions: 'container.*, artifactregistry.*', status: 'running' },
  { id: 'cp-3', principal: 'readonly-audit', provider: 'Azure', service: 'VM, Storage', actions: 'Microsoft.Compute/*/read', status: 'running' },
  { id: 'cp-4', principal: 'legacy-admin', provider: 'AWS', service: 'IAM', actions: 'iam:*', status: 'failed' },
]

export const defaultAccessViolations = (): AccessViolation[] => [
  { id: 'av-1', user: 'contractor@ext', violation: 'Acceso sin MFA', resource: 'AWS prod', severity: 'high', status: 'warning', detectedAt: ago(120) },
  { id: 'av-2', user: 'legacy-admin', violation: 'Permisos IAM excesivos', resource: 'Cuenta AWS prod', severity: 'critical', status: 'failed', detectedAt: ago(480) },
]
