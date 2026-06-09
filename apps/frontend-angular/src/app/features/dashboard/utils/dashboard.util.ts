import { CloudProvider } from '../../../core/models/api.models'
import { DashboardData, DashboardInstanceRow } from '../dashboard.models'

const mkInstance = (
  id: string,
  name: string,
  provider: string,
  extra: Partial<DashboardInstanceRow> = {},
): DashboardInstanceRow => ({
  id,
  name,
  provider,
  accountName: extra.accountName ?? `${provider.toLowerCase()}-prod`,
  region: extra.region ?? 'us-east-1',
  status: extra.status ?? 'RUNNING',
  instanceType: extra.instanceType ?? 't3.medium',
  os: extra.os ?? 'Ubuntu 22.04',
  publicIp: extra.publicIp ?? '203.0.113.10',
  privateIp: extra.privateIp ?? '10.0.1.10',
  cpuCores: extra.cpuCores ?? 4,
  ramGb: extra.ramGb ?? 16,
  diskGb: extra.diskGb ?? 100,
  monthlyCost: extra.monthlyCost ?? 120,
  hasDocker: extra.hasDocker ?? true,
  hasKubernetes: extra.hasKubernetes ?? false,
  environment: extra.environment ?? 'production',
  alertCount: extra.alertCount ?? 0,
  isVps: extra.isVps ?? false,
  isDemo: true,
  lastSyncedAt: new Date().toISOString(),
})

export const buildDemoDashboard = (): DashboardData => {
  const aws = Array.from({ length: 12 }, (_, i) =>
    mkInstance(`aws-${i + 1}`, `aws-prod-app-${i + 1}`, 'AWS', {
      region: ['us-east-1', 'eu-west-1', 'ap-southeast-1'][i % 3],
      status: i === 2 ? 'WARNING' : 'RUNNING',
      alertCount: i === 2 ? 2 : 0,
    }),
  )
  const gcp = Array.from({ length: 6 }, (_, i) =>
    mkInstance(`gcp-${i + 1}`, `gcp-analytics-${i + 1}`, 'GCP', {
      region: ['us-central1', 'europe-west1'][i % 2],
      instanceType: 'n2-standard-4',
      hasKubernetes: i % 2 === 0,
    }),
  )
  const azure = Array.from({ length: 6 }, (_, i) =>
    mkInstance(`az-${i + 1}`, `azure-db-${i + 1}`, 'AZURE', {
      region: ['eastus', 'westeurope'][i % 2],
      instanceType: 'Standard_D4s_v3',
      status: i === 4 ? 'ERROR' : 'RUNNING',
      alertCount: i === 4 ? 1 : 0,
    }),
  )
  const instanceList = [...aws, ...gcp, ...azure]

  return {
    totalInstances: instanceList.length,
    runningInstances: 23,
    stoppedInstances: instanceList.filter((i) => i.status === 'STOPPED').length,
    warningInstances: instanceList.filter((i) => i.status === 'WARNING').length,
    errorInstances: instanceList.filter((i) => i.status === 'ERROR').length,
    vpsHosts: 0,
    vpsConnected: 0,
    vpsDisconnected: 0,
    alertsOpen: 9,
    monthlySpend: 4820,
    byProvider: { AWS: 12, GCP: 6, AZURE: 6, VPS: 8 },
    byStatus: { running: 22, stopped: 1, warning: 1, error: 1, pending: 1 },
    alertsBySeverity: { CRITICAL: 3, WARNING: 4, INFO: 2 },
    cpuByProvider: { AWS: 62, GCP: 48, AZURE: 55, VPS: 41 },
    ramByProvider: { AWS: 71, GCP: 58, AZURE: 64, VPS: 52 },
    costByAccount: [
      { label: 'aws-prod', value: 1820 },
      { label: 'gcp-analytics', value: 980 },
      { label: 'azure-prod', value: 1240 },
      { label: 'vps-fleet', value: 780 },
    ],
    instanceList,
    recentAlerts: [
      { id: '1', title: 'CPU alta en aws-prod-app-3', severity: 'CRITICAL', status: 'open' },
      { id: '2', title: 'Disco casi lleno azure-db-5', severity: 'WARNING', status: 'open' },
      { id: '3', title: 'Latencia elevada gcp-analytics-2', severity: 'UNKNOWN', status: 'open' },
    ],
    recentActivity: [
      { id: 'gh-1', action: 'github.demo.connect', resource: 'github', createdAt: new Date().toISOString() },
      { id: '1', action: 'instance.sync', resource: 'aws-prod-app-1', createdAt: new Date().toISOString() },
      { id: '2', action: 'terraform.apply', resource: 'demo-aws-ec2', createdAt: new Date().toISOString() },
    ],
    notifications: [
      { id: 'gh-n1', title: 'GitHub', message: 'Cuenta demo conectada — 8 repositorios', severity: 'INFO' },
      { id: '1', title: 'Sync completed', message: 'AWS account synced successfully', severity: 'INFO' },
      { id: '2', title: 'Build failed', message: 'Jenkins terraform-apply #4 failed', severity: 'WARNING' },
    ],
    providers: {
      AWS: { accounts: 2, instances: 6, regions: 3, monthlyCost: 1820, alerts: 3 },
      GCP: { accounts: 1, instances: 6, regions: 2, monthlyCost: 980, alerts: 2 },
      AZURE: { accounts: 1, instances: 6, regions: 2, monthlyCost: 1240, alerts: 2 },
      VPS: { instances: 8, connected: 7, disconnected: 1, dockerDetected: 6, k8sDetected: 3, alerts: 2 },
    },
    docker: { hosts: 4, containers: 24, running: 21, stopped: 3, images: 18, volumes: 12, networks: 6 },
    kubernetes: { clusters: 2, nodes: 6, namespaces: 8, pods: 42, errors: 2, deployments: 14, services: 11 },
    jenkins: { servers: 1, jobs: 12, running: 2, success: 48, failed: 4 },
    terraform: { workspaces: 4, runs: 18, plans: 6, applies: 4, errors: 1, templates: 6 },
    github: {
      connected: true,
      username: 'cloudops-demo',
      organization: 'cloudops-lab',
      repoCount: 12,
      branchCount: 48,
      openPullRequests: 24,
      webhookCount: 4,
      deploymentCount: 4,
      demoMode: true,
    },
    billing: { total: 4820 },
  }
}

export const buildDemoProviderSummary = (provider: CloudProvider): Record<string, unknown> => {
  const dash = buildDemoDashboard()
  const providerKey = provider === 'AZURE' ? 'AZURE' : provider
  const meta = (dash.providers?.[providerKey as keyof typeof dash.providers] ?? {}) as Record<string, unknown>
  const instanceList = (dash.instanceList ?? []).filter((i) => i.provider === providerKey)
  const regions = [...new Set(instanceList.map((i) => i.region).filter(Boolean))]

  return {
    accounts: meta['accounts'] ?? 1,
    instances: instanceList.length,
    regions: regions.length,
    monthlyCost: meta['monthlyCost'] ?? 1200,
    alerts: meta['alerts'] ?? 2,
    instanceList,
    regionList: regions.map((code) => ({ code, name: String(code), enabled: true })),
    accountList: [{ id: `demo-${providerKey.toLowerCase()}`, name: `${providerKey} Demo`, accountId: 'demo-001', status: 'active' }],
    syncStatus: 'Synced',
    lastSyncAt: new Date().toISOString(),
  }
}
