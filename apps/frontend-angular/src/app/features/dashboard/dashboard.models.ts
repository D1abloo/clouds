export interface DashboardInstanceRow {
  id: string
  name: string
  provider: string
  accountName?: string
  region?: string
  status?: string
  instanceType?: string
  os?: string
  publicIp?: string
  privateIp?: string
  cpuCores?: number | null
  ramGb?: number | null
  diskGb?: number | null
  monthlyCost?: number | null
  hasDocker?: boolean
  hasKubernetes?: boolean
  environment?: string
  lastSyncedAt?: string | Date
  alertCount?: number
  isVps?: boolean
  isDemo?: boolean
}

export interface DashboardData {
  totalInstances?: number
  runningInstances?: number
  stoppedInstances?: number
  warningInstances?: number
  errorInstances?: number
  vpsHosts?: number
  vpsConnected?: number
  vpsDisconnected?: number
  alertsOpen?: number
  monthlySpend?: number
  byProvider?: Record<string, number>
  byStatus?: Record<string, number>
  alertsBySeverity?: Record<string, number>
  cpuByProvider?: Record<string, number>
  ramByProvider?: Record<string, number>
  costByAccount?: { label: string; value: number }[]
  instanceList?: DashboardInstanceRow[]
  recentAlerts?: Record<string, unknown>[]
  recentActivity?: Record<string, unknown>[]
  notifications?: Record<string, unknown>[]
  providers?: Record<string, Record<string, unknown>>
  docker?: Record<string, unknown>
  kubernetes?: Record<string, unknown>
  jenkins?: Record<string, unknown>
  terraform?: Record<string, unknown>
  github?: Record<string, unknown>
  billing?: Record<string, unknown>
}
