import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { CloudProvider } from '@prisma/client'
import {
  DEMO_DEPLOYMENTS,
  DEMO_GITHUB_REPOS,
  DEMO_WEBHOOKS,
} from '../github/github-demo.data'

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

  async githubSummary() {
    return {
      connected: false,
      username: null,
      repoCount: DEMO_GITHUB_REPOS.length,
      branchCount: DEMO_GITHUB_REPOS.length * 3,
      commitCount: DEMO_GITHUB_REPOS.length * 3,
      openPullRequests: 4,
      webhookCount: DEMO_WEBHOOKS.length,
      deploymentCount: DEMO_DEPLOYMENTS.length,
      repoItems: DEMO_GITHUB_REPOS,
      lastSyncAt: null,
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

    const cloudWithAccounts = await this.prisma.instance.findMany({
      where: { deletedAt: null },
      include: { cloudAccount: { select: { id: true, name: true, provider: true } } },
      orderBy: [{ provider: 'asc' }, { name: 'asc' }],
    })

    const mapCloudInstance = (i: (typeof cloudWithAccounts)[0]) => {
      const meta = (i.metadata as Record<string, unknown>) ?? {}
      return {
        id: i.id,
        name: i.name,
        provider: i.provider,
        accountName: i.cloudAccount?.name ?? '—',
        region: i.region,
        status: i.status,
        instanceType: i.instanceType,
        os: meta['os'] ?? meta['osType'] ?? '—',
        publicIp: meta['publicIp'] ?? '—',
        privateIp: meta['privateIp'] ?? '—',
        cpuCores: meta['cpuCores'] ?? null,
        ramGb: meta['ramGb'] ?? null,
        diskGb: meta['diskGb'] ?? null,
        monthlyCost: meta['monthlyCost'] ?? null,
        hasDocker: Boolean(meta['hasDocker']),
        hasKubernetes: Boolean(meta['hasKubernetes']),
        environment: meta['environment'] ?? '—',
        lastSyncedAt: i.updatedAt,
        alertCount: alerts.filter((a) => String(a.message ?? '').includes(i.name)).length,
        isVps: false,
        isDemo: Boolean(meta['isDemo']),
      }
    }

    const vpsMapped = vps.map((v) => {
      const meta = (v.metadata as Record<string, unknown>) ?? {}
      const sshStatus = String(meta['sshStatus'] ?? 'unknown')
      const statusMap: Record<string, string> = {
        connected: 'RUNNING',
        disconnected: 'STOPPED',
        warning: 'WARNING',
        error: 'ERROR',
      }
      return {
        id: v.id,
        name: v.name,
        provider: 'VPS',
        accountName: 'Bare Metal',
        region: String(meta['region'] ?? v.hostname ?? '—'),
        status: statusMap[sshStatus] ?? 'UNKNOWN',
        instanceType: 'bare-metal',
        os: meta['os'] ?? 'Linux',
        publicIp: meta['publicIp'] ?? v.hostname,
        privateIp: meta['privateIp'] ?? '—',
        cpuCores: meta['cpuCores'] ?? null,
        ramGb: meta['ramGb'] ?? null,
        diskGb: meta['diskGb'] ?? null,
        monthlyCost: meta['monthlyCost'] ?? null,
        hasDocker: Boolean(meta['hasDocker']),
        hasKubernetes: Boolean(meta['hasKubernetes']),
        environment: meta['environment'] ?? '—',
        lastSyncedAt: v.updatedAt,
        alertCount: 0,
        isVps: true,
        isDemo: Boolean(meta['isDemo']),
      }
    })

    const instanceList = [...cloudWithAccounts.map(mapCloudInstance), ...vpsMapped]

    const alertsBySeverity = alerts.reduce(
      (acc, a) => {
        const s = String(a.severity ?? 'INFO').toUpperCase()
        acc[s] = (acc[s] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const [awsSummary, gcpSummary, azureSummary] = await Promise.all([
      this.providerSummary('AWS' as CloudProvider),
      this.providerSummary('GCP' as CloudProvider),
      this.providerSummary('AZURE' as CloudProvider),
    ])

    const vpsConnected = vps.filter((v) => (v.metadata as Record<string, unknown>)?.['sshStatus'] === 'connected').length

    return {
      totalInstances: instances.length + vps.length,
      runningInstances: instances.filter((i) => i.status === 'RUNNING').length + vpsConnected,
      stoppedInstances: instances.filter((i) => i.status === 'STOPPED').length,
      warningInstances: instances.filter((i) => i.status === 'WARNING').length,
      errorInstances: instances.filter((i) => i.status === 'ERROR').length,
      vpsHosts: vps.length,
      vpsConnected,
      vpsDisconnected: vps.length - vpsConnected,
      alertsOpen: alerts.length,
      monthlySpend,
      byProvider,
      byStatus,
      alertsBySeverity,
      cpuByProvider: {
        AWS: 62,
        GCP: 48,
        AZURE: 55,
        VPS: 41,
      },
      ramByProvider: {
        AWS: 71,
        GCP: 58,
        AZURE: 64,
        VPS: 52,
      },
      costByAccount: billing.slice(0, 6).map((b) => ({
        label: b.billingAccount?.accountId ?? b.service ?? 'Account',
        value: Math.round(b.amount),
      })),
      instanceList,
      recentAlerts: alerts.map((a) => ({
        id: a.id,
        title: a.message,
        message: a.message,
        severity: a.severity,
        status: a.isResolved ? 'resolved' : 'open',
      })),
      recentActivity: audit.map((ev) => ({
        id: ev.id,
        action: ev.action,
        eventType: ev.action,
        resource: ev.resource,
        entityType: ev.resource,
        createdAt: ev.createdAt,
        user: ev.user?.email,
      })),
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.body,
        severity: n.channel ?? 'INFO',
        type: n.channel,
      })),
      providers: {
        AWS: awsSummary,
        GCP: gcpSummary,
        AZURE: azureSummary,
        VPS: {
          accounts: 0,
          instances: vps.length,
          regions: [...new Set(vps.map((v) => (v.metadata as Record<string, unknown>)?.['region']).filter(Boolean))].length,
          monthlyCost: vps.reduce((s, v) => s + Number((v.metadata as Record<string, unknown>)?.['monthlyCost'] ?? 0), 0),
          alerts: alerts.length,
          connected: vpsConnected,
          disconnected: vps.length - vpsConnected,
          dockerDetected: vps.filter((v) => (v.metadata as Record<string, unknown>)?.['hasDocker']).length,
          k8sDetected: vps.filter((v) => (v.metadata as Record<string, unknown>)?.['hasKubernetes']).length,
          instanceList: vpsMapped,
        },
      },
      docker: {
        hosts: docker.hosts,
        containers: docker.containers,
        running: docker.running,
        stopped: docker.stopped,
        images: docker.images,
        volumes: docker.volumes,
        networks: docker.networks,
        items: docker.items,
      },
      kubernetes: {
        clusters: k8s.clusters,
        pods: k8s.podCount,
        errors: k8s.podsWithError,
        nodes: k8s.resources?.filter((r: { kind: string }) => r.kind === 'Node').length ?? 3,
        namespaces: k8s.namespaceCount,
        deployments: k8s.deployments,
        services: k8s.services,
        podItems: k8s.podItems,
      },
      jenkins: {
        servers: jenkins.serverCount,
        jobs: jenkins.jobCount,
        running: jenkins.buildsRunning,
        success: jenkins.buildsSuccess,
        failed: jenkins.buildsFailed,
        jobItems: jenkins.jobItems,
        builds: jenkins.builds?.slice(0, 5),
      },
      terraform: {
        workspaces: terraform.workspaces,
        runs: terraform.runs,
        plans: terraform.plans,
        applies: terraform.applies,
        errors: terraform.errors,
        templates: terraform.templates?.length ?? 0,
        items: terraform.items?.slice(0, 5),
      },
      billing: {
        total: monthlySpend,
        records: billing.slice(0, 8).map((b) => ({
          service: b.service,
          amount: b.amount,
          account: b.billingAccount?.accountId,
          provider: b.billingAccount?.provider,
        })),
      },
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
