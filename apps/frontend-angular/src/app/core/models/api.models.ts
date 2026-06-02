export type CloudProvider = 'AWS' | 'GCP' | 'AZURE'

export type ResourceStatus =
  | 'running'
  | 'stopped'
  | 'pending'
  | 'error'
  | 'warning'
  | 'unknown'

export interface AuthUser {
  id: string
  email: string
  name: string
  roles: string[]
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export interface CloudAccount {
  id: string
  name: string
  provider: CloudProvider
  accountId?: string
  projectId?: string
  createdAt?: string
  updatedAt?: string
}

export interface Instance {
  id: string
  name: string
  provider: CloudProvider
  region?: string
  status?: string
  instanceType?: string
  cloudAccountId?: string
  publicIp?: string
  privateIp?: string
}

export interface VpsHost {
  id: string
  name: string
  host: string
  port?: number
  status?: string
  projectId?: string
}

export interface DashboardStats {
  totalInstances?: number
  runningInstances?: number
  cloudAccounts?: number
  vpsHosts?: number
  alertsOpen?: number
  monthlySpend?: number
  [key: string]: unknown
}

export interface AlertItem {
  id: string
  title: string
  severity: string
  status: string
  createdAt: string
  resource?: string
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface AuditLog {
  id: string
  action: string
  resource: string
  userId?: string
  ipAddress?: string
  createdAt: string
}

export interface BillingSummary {
  totalCost?: number
  currency?: string
  byProvider?: Record<string, number>
  period?: string
}

export interface JenkinsServer {
  id: string
  name: string
  url: string
  status?: string
}

export interface TerraformRun {
  id: string
  status: string
  provider?: CloudProvider
  createdAt?: string
}

export interface TerraformTemplate {
  id: string
  name: string
  provider: CloudProvider
}

export interface PaginatedMeta {
  total?: number
  page?: number
  limit?: number
}
