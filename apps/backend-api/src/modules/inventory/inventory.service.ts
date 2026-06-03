import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { CloudProvider } from '@prisma/client'

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async dockerSummary() {
    const [hosts, containers] = await Promise.all([
      this.prisma.dockerHost.findMany({ include: { containers: true } }),
      this.prisma.dockerContainer.findMany({ include: { dockerHost: true } }),
    ])
    const running = containers.filter((c) => c.status === 'running').length
    const stopped = containers.filter((c) => c.status !== 'running').length
    const images = [...new Set(containers.map((c) => c.image))]
    return {
      hosts: hosts.length,
      containers: containers.length,
      running,
      stopped,
      images: images.length,
      volumes: 4,
      networks: 3,
      items: containers.map((c) => ({
        id: c.id,
        name: c.name,
        image: c.image,
        host: c.dockerHost.hostRef,
        status: c.status,
        ports: c.name.includes('nginx') ? '80:80' : c.name.includes('api') ? '3000:3000' : '—',
        cpu: Math.round(10 + Math.random() * 40),
        ram: Math.round(20 + Math.random() * 50),
      })),
    }
  }

  async kubernetesSummary() {
    const clusters = await this.prisma.kubernetesCluster.findMany({
      include: { resources: true },
    })
    const resources = clusters.flatMap((c) =>
      c.resources.map((r) => ({ ...r, clusterName: c.name })),
    )
    const pods = resources.filter((r) => r.kind === 'Pod')
    const errors = pods.filter((p) => p.status?.includes('Error') || p.status?.includes('Crash')).length
    return {
      clusters: clusters.length,
      namespaceCount: resources.filter((r) => r.kind === 'Namespace').length,
      podCount: pods.length,
      deployments: resources.filter((r) => r.kind === 'Deployment').length,
      services: resources.filter((r) => r.kind === 'Service').length,
      podsWithError: errors,
      resources,
      podItems: pods.map((p) => ({
        id: p.id,
        name: p.name,
        namespace: p.namespace ?? 'default',
        status: p.status ?? 'Unknown',
        node: 'demo-node-01',
        restarts: p.status === 'CrashLoopBackOff' ? 12 : 0,
        cpu: Math.round(5 + Math.random() * 60),
        ram: Math.round(10 + Math.random() * 70),
        clusterName: p.clusterName,
      })),
    }
  }

  async terraformSummary() {
    const workspaces = await this.prisma.terraformWorkspace.findMany({
      include: { runs: { include: { logs: true }, orderBy: { createdAt: 'desc' } } },
    })
    const runs = workspaces.flatMap((w) => w.runs.map((r) => ({ ...r, workspaceName: w.name, provider: w.provider })))
    return {
      workspaces: workspaces.length,
      runs: runs.length,
      plans: runs.filter((r) => r.status === 'PLANNED' || r.status === 'PLANNING').length,
      applies: runs.filter((r) => r.status === 'APPLIED' || r.status === 'APPLYING').length,
      errors: runs.filter((r) => r.status === 'FAILED').length,
      items: runs,
      templates: await this.prisma.instanceTemplate.findMany(),
    }
  }

  async jenkinsSummary() {
    const servers = await this.prisma.jenkinsServer.findMany({
      include: { jobs: { include: { builds: true } } },
    })
    const jobs = servers.flatMap((s) => s.jobs.map((j) => ({ ...j, serverName: s.name, serverUrl: s.url })))
    const builds = jobs.flatMap((j) => j.builds.map((b) => ({ ...b, jobName: j.name, serverName: j.serverName })))
    return {
      serverCount: servers.length,
      jobCount: jobs.length,
      buildsRunning: builds.filter((b) => b.status === 'RUNNING').length,
      buildsSuccess: builds.filter((b) => b.status === 'SUCCESS').length,
      buildsFailed: builds.filter((b) => b.status === 'FAILURE').length,
      jobItems: jobs.map((j) => ({
        id: j.id,
        name: j.name,
        server: j.serverName,
        url: j.url,
        status: j.builds[0]?.status ?? 'IDLE',
        lastRun: j.builds[0] ? `#${j.builds[0].buildNum}` : '—',
        duration: `${Math.round(30 + Math.random() * 300)}s`,
      })),
      builds,
    }
  }

  async dashboardOverview() {
    const [instances, vps, alerts, billing, notifications, audit, docker, k8s, jenkins, terraform] =
      await Promise.all([
        this.prisma.instance.findMany({ where: { deletedAt: null } }),
        this.prisma.vpsServer.findMany({ where: { deletedAt: null } }),
        this.prisma.alert.findMany({ where: { isResolved: false }, include: { rule: true }, take: 10 }),
        this.prisma.billingRecord.findMany({ include: { billingAccount: true }, take: 20 }),
        this.prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
        this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: true } }),
        this.dockerSummary(),
        this.kubernetesSummary(),
        this.jenkinsSummary(),
        this.terraformSummary(),
      ])

    const byProvider = instances.reduce(
      (acc, i) => {
        acc[i.provider] = (acc[i.provider] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const byStatus = instances.reduce(
      (acc, i) => {
        const s = i.status.toLowerCase()
        acc[s] = (acc[s] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const monthlySpend = billing
      .filter((b) => b.service !== 'daily' && b.service !== 'total')
      .reduce((s, b) => s + b.amount, 0)

    return {
      totalInstances: instances.length,
      runningInstances: instances.filter((i) => i.status === 'RUNNING').length,
      stoppedInstances: instances.filter((i) => i.status === 'STOPPED').length,
      warningInstances: instances.filter((i) => i.status === 'WARNING').length,
      errorInstances: instances.filter((i) => i.status === 'ERROR').length,
      vpsHosts: vps.length,
      alertsOpen: alerts.length,
      monthlySpend,
      byProvider,
      byStatus,
      recentAlerts: alerts,
      recentActivity: audit,
      notifications,
      docker: { hosts: docker.hosts, containers: docker.containers, running: docker.running },
      kubernetes: { clusters: k8s.clusters, pods: k8s.podCount, errors: k8s.podsWithError },
      jenkins: { jobs: jenkins.jobCount, running: jenkins.buildsRunning, failed: jenkins.buildsFailed },
      terraform: { runs: terraform.runs, errors: terraform.errors },
    }
  }

  async providerSummary(provider: CloudProvider) {
    const accounts = await this.prisma.cloudAccount.findMany({
      where: { provider, deletedAt: null },
      include: { regions: true, instances: { where: { deletedAt: null } } },
    })
    const instances = accounts.flatMap((a) =>
      a.instances.map((i) => {
        const meta = (i.metadata as Record<string, unknown>) ?? {}
        return {
          ...i,
          accountName: a.name,
          publicIp: meta.publicIp,
          privateIp: meta.privateIp,
          cpu: meta.cpuCores,
          ram: meta.ramGb,
          monthlyCost: meta.monthlyCost,
          environment: meta.environment,
          isDemo: meta.isDemo,
        }
      }),
    )
    const billing = await this.prisma.billingRecord.findMany({
      where: { billingAccount: { provider } },
      include: { billingAccount: true },
    })
    const monthlyCost = billing.reduce((s, b) => s + b.amount, 0)
    const alertCount = await this.prisma.alert.count({ where: { isResolved: false } })

    return {
      accounts: accounts.length,
      instances: instances.length,
      regions: [...new Set(instances.map((i) => i.region))].length,
      monthlyCost,
      alerts: alertCount,
      accountList: accounts,
      instanceList: instances,
      regionList: accounts.flatMap((a) => a.regions),
    }
  }
}
