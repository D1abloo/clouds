import type { DashboardData } from '../../features/dashboard/dashboard.models'
import type { AlertItem, AuditLog, BillingSummary, Instance, NotificationItem } from '../models/api.models'
import { CloudProvider } from '../models/api.models'

export const PRO_EMPTY_MSG = 'Sin datos todavía'
export const PRO_CONFIG_MSG = 'Sin cuentas conectadas. Añade una cuenta para comenzar.'

export const emptyDashboard = (): DashboardData => ({
  totalInstances: 0,
  runningInstances: 0,
  stoppedInstances: 0,
  warningInstances: 0,
  errorInstances: 0,
  vpsHosts: 0,
  vpsConnected: 0,
  vpsDisconnected: 0,
  alertsOpen: 0,
  monthlySpend: 0,
  byProvider: {},
  byStatus: {},
  alertsBySeverity: {},
  cpuByProvider: {},
  ramByProvider: {},
  costByAccount: [],
  instanceList: [],
  recentAlerts: [],
  recentActivity: [],
  notifications: [],
  providers: {},
})

export const emptyProviderSummary = (_p: CloudProvider): Record<string, unknown> => ({
  connected: false,
  instanceCount: 0,
  items: [],
  message: PRO_CONFIG_MSG,
})

export const emptyGithubInventory = (): Record<string, unknown> => ({
  connected: false,
  username: null,
  demoMode: false,
  repoCount: 0,
  branchCount: 0,
  commitCount: 0,
  openPullRequests: 0,
  webhookCount: 0,
  deploymentCount: 0,
  repoItems: [],
  message: PRO_CONFIG_MSG,
})

export const emptyJenkinsInventory = (): Record<string, unknown> => ({
  demoMode: false,
  serverCount: 0,
  jobCount: 0,
  buildsRunning: 0,
  buildsSuccess: 0,
  buildsFailed: 0,
  queueSize: 0,
  executorBusy: 0,
  executorTotal: 0,
  diskUsagePercent: 0,
  version: 'live',
  servers: [],
  agents: [],
  queue: [],
  folders: [],
  jobItems: [],
  builds: [],
  logsByJob: {},
  plugins: [],
  message: PRO_CONFIG_MSG,
})

export const emptyAlerts = (): AlertItem[] => []
export const emptyNotifications = (): NotificationItem[] => []
export const emptyAuditLogs = (): AuditLog[] => []
export const emptyInstances = (): Instance[] => []

export const emptyBillingSummary = (): BillingSummary => ({
  totalCost: 0,
  totalMonthly: 0,
  byProvider: {},
  currency: 'USD',
  period: 'Mes actual',
})
