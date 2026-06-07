import { CloudProvider } from '../models/api.models'
import type {
  AlertItem,
  AuditLog,
  BillingSummary,
  CloudAccount,
  Instance,
  NotificationItem,
  VpsHost,
} from '../models/api.models'
import { buildDemoDashboard } from '../../features/dashboard/utils/dashboard-demo.util'

export const demoAlerts = (): AlertItem[] => [
  { id: '1', title: 'CPU alta en aws-prod-app-3', severity: 'CRITICAL', status: 'active', createdAt: new Date().toISOString(), resource: 'aws-prod-app-3' },
  { id: '2', title: 'Disco casi lleno azure-db-5', severity: 'WARNING', status: 'active', createdAt: new Date(Date.now() - 3600000).toISOString(), resource: 'azure-db-5' },
  { id: '3', title: 'Jenkins build failed', severity: 'WARNING', status: 'active', createdAt: new Date(Date.now() - 7200000).toISOString(), resource: 'jenkins/terraform-apply' },
  { id: '4', title: 'VPS disconnected', severity: 'INFO', status: 'resolved', createdAt: new Date(Date.now() - 86400000).toISOString(), resource: 'vps-monitoring-8' },
]

export const demoNotifications = (): NotificationItem[] => [
  { id: '1', title: 'Sync completed', message: 'AWS account synced successfully', read: false, createdAt: new Date().toISOString() },
  { id: '2', title: 'Build failed', message: 'Jenkins terraform-apply #4 failed', read: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: '3', title: 'Backup scheduled', message: 'Daily snapshot enabled for prod cluster', read: true, createdAt: new Date(Date.now() - 3600000).toISOString() },
]

export const demoAuditLogs = (): AuditLog[] => [
  { id: '1', action: 'instance.sync', resource: 'aws-prod-app-1', userId: 'admin@cloudops.local', ipAddress: '203.0.113.1', createdAt: new Date().toISOString() },
  { id: '2', action: 'terraform.apply', resource: 'demo-aws-ec2', userId: 'admin@cloudops.local', ipAddress: '203.0.113.1', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', action: 'vps.validate', resource: 'vps-monitoring-2', userId: 'admin@cloudops.local', ipAddress: '203.0.113.1', createdAt: new Date(Date.now() - 7200000).toISOString() },
]

export const demoBillingSummary = (): BillingSummary => {
  const dash = buildDemoDashboard()
  const byProvider = dash.byProvider ?? {}
  return {
    totalCost: dash.monthlySpend ?? 4820,
    totalMonthly: dash.monthlySpend ?? 4820,
    byProvider: {
      AWS: (byProvider['AWS'] ?? 6) * 303,
      GCP: (byProvider['GCP'] ?? 6) * 163,
      AZURE: (byProvider['AZURE'] ?? 6) * 207,
      VPS: (byProvider['VPS'] ?? 8) * 98,
    },
    currency: 'USD',
    period: 'Current month',
    daily: 161,
    weekly: 1127,
    forecastMonthly: 5100,
    varianceVsPreviousMonth: -4.2,
  }
}

export const demoVpsHosts = (): VpsHost[] =>
  Array.from({ length: 8 }, (_, i) => ({
    id: `vps-${i + 1}`,
    name: `vps-monitoring-${i + 1}`,
    host: `203.0.113.${10 + i}`,
    port: 22,
    status: i === 7 ? 'disconnected' : 'connected',
    projectId: 'demo-project',
  }))

export const demoInstances = (): Instance[] => {
  const dash = buildDemoDashboard()
  return (dash.instanceList ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    provider: row.provider,
    region: row.region,
    status: row.status,
    instanceType: row.instanceType,
    publicIp: row.publicIp,
    privateIp: row.privateIp,
    os: row.os,
    environment: row.environment,
    isDemo: true,
    isVps: row.isVps,
    cpuCores: row.cpuCores ?? undefined,
    ramGb: row.ramGb ?? undefined,
    diskGb: row.diskGb ?? undefined,
    monthlyCost: row.monthlyCost ?? undefined,
  }))
}

export { demoJenkinsInventory } from '../../features/jenkins/jenkins.demo'

export const demoCloudAccounts = (provider?: CloudProvider): CloudAccount[] => {
  const providers: CloudProvider[] = provider ? [provider] : ['AWS', 'GCP', 'AZURE']
  return providers.flatMap((p, pi) =>
    Array.from({ length: p === 'AWS' ? 2 : 1 }, (_, i) => ({
      id: `demo-${p.toLowerCase()}-${i + 1}`,
      name: `${p} ${i === 0 ? 'Production' : 'Staging'}`,
      provider: p,
      accountId: `${p.toLowerCase()}-demo-${100 + pi * 10 + i}`,
      projectId: 'demo-project',
      defaultRegion: p === 'GCP' ? 'us-central1' : p === 'AZURE' ? 'eastus' : 'us-east-1',
      hasCredentials: true,
      credentialType: 'demo',
      syncStatus: 'synced',
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })),
  )
}
