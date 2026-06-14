import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { OrganizationScopeService } from '../../common/organization/organization-scope.service'

export type CopilotCloudAccountRef = {
  id: string
  name: string
  provider: string
  defaultRegion: string | null
}

export type CopilotSidebarDomain = {
  id: string
  label: string
  icon: string
  count: string
  hint: string
}

export type CopilotPlatformContext = {
  organizationName: string
  instances: { total: number; running: number; stopped: number; warning: number }
  cloudAccounts: { aws: number; gcp: number; azure: number; clouding: number; total: number }
  cloudAccountList: CopilotCloudAccountRef[]
  alerts: { open: number; critical: number; warning: number }
  billing: { monthlySpend: number; currency: string }
  vpsHosts: number
  kubernetesClusters: number
  jenkinsServers: number
  terraformWorkspaces: number
  recentInstances: { name: string; provider: string; region: string; status: string }[]
  vpsList: { name: string; hostname: string; username: string; status: string }[]
  jenkinsList: { name: string; url: string }[]
  panelRoutes: { area: string; route: string; capability: string }[]
  healthScore: number
}

@Injectable()
export class CopilotContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgScope: OrganizationScopeService,
  ) {}

  async gatherForUser(userId: string): Promise<CopilotPlatformContext> {
    const scope = await this.orgScope.resolveForUser(userId)
    const projectIds = scope.projectIds.length ? scope.projectIds : ['__none__']
    const instanceScope: Prisma.InstanceWhereInput = { projectId: { in: projectIds } }
    const cloudAccountScope: Prisma.CloudAccountWhereInput = { projectId: { in: projectIds } }
    const vpsScope: Prisma.VpsServerWhereInput = { projectId: { in: projectIds } }

    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { organization: true },
    })
    const organizationName = membership?.organization.name ?? 'Tu organización'

    const instanceBase: Prisma.InstanceWhereInput = {
      deletedAt: null,
      ...instanceScope,
    }

    const [
      totalInstances,
      runningInstances,
      stoppedInstances,
      warningInstances,
      awsAccounts,
      gcpAccounts,
      azureAccounts,
      cloudingAccounts,
      openAlerts,
      criticalAlerts,
      warningAlerts,
      billingAgg,
      vpsHosts,
      k8sClusters,
      jenkinsServers,
      tfWorkspaces,
      recentInstances,
      cloudAccountList,
      vpsList,
      jenkinsList,
    ] = await Promise.all([
      this.prisma.instance.count({ where: instanceBase }),
      this.prisma.instance.count({ where: { ...instanceBase, status: 'RUNNING' } }),
      this.prisma.instance.count({ where: { ...instanceBase, status: 'STOPPED' } }),
      this.prisma.instance.count({ where: { ...instanceBase, status: 'WARNING' } }),
      this.prisma.cloudAccount.count({
        where: { deletedAt: null, isActive: true, provider: 'AWS', ...cloudAccountScope },
      }),
      this.prisma.cloudAccount.count({
        where: { deletedAt: null, isActive: true, provider: 'GCP', ...cloudAccountScope },
      }),
      this.prisma.cloudAccount.count({
        where: { deletedAt: null, isActive: true, provider: 'AZURE', ...cloudAccountScope },
      }),
      this.prisma.cloudAccount.count({
        where: { deletedAt: null, isActive: true, provider: 'CLOUDING', ...cloudAccountScope },
      }),
      this.prisma.alert.count({ where: { isResolved: false } }),
      this.prisma.alert.count({ where: { isResolved: false, severity: 'CRITICAL' } }),
      this.prisma.alert.count({ where: { isResolved: false, severity: 'WARNING' } }),
      this.prisma.billingRecord.aggregate({
        _sum: { amount: true },
      }),
      this.prisma.vpsServer.count({ where: { ...vpsScope } }),
      this.prisma.kubernetesCluster.count(),
      this.prisma.jenkinsServer.count(),
      this.prisma.terraformWorkspace.count(),
      this.prisma.instance.findMany({
        where: instanceBase,
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { name: true, provider: true, region: true, status: true },
      }),
      this.prisma.cloudAccount.findMany({
        where: { deletedAt: null, isActive: true, ...cloudAccountScope },
        orderBy: { updatedAt: 'desc' },
        take: 24,
        select: { id: true, name: true, provider: true, defaultRegion: true },
      }),
      this.prisma.vpsServer.findMany({
        where: { deletedAt: null, ...vpsScope },
        orderBy: { updatedAt: 'desc' },
        take: 12,
        select: { name: true, hostname: true, username: true, metadata: true },
      }),
      this.prisma.jenkinsServer.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { name: true, url: true },
      }),
    ])

    const healthScore = this.computeHealthScore({
      instances: totalInstances,
      running: runningInstances,
      warning: warningInstances,
      criticalAlerts: criticalAlerts,
      openAlerts: openAlerts,
    })

    return {
      organizationName,
      instances: {
        total: totalInstances,
        running: runningInstances,
        stopped: stoppedInstances,
        warning: warningInstances,
      },
      cloudAccounts: {
        aws: awsAccounts,
        gcp: gcpAccounts,
        azure: azureAccounts,
        clouding: cloudingAccounts,
        total: awsAccounts + gcpAccounts + azureAccounts + cloudingAccounts,
      },
      cloudAccountList: cloudAccountList.map((a) => ({
        id: a.id,
        name: a.name,
        provider: a.provider,
        defaultRegion: a.defaultRegion,
      })),
      alerts: {
        open: openAlerts,
        critical: criticalAlerts,
        warning: warningAlerts,
      },
      billing: {
        monthlySpend: Number(billingAgg._sum.amount ?? 0),
        currency: 'EUR',
      },
      vpsHosts,
      kubernetesClusters: k8sClusters,
      jenkinsServers,
      terraformWorkspaces: tfWorkspaces,
      recentInstances: recentInstances.map((i) => ({
        name: i.name,
        provider: i.provider,
        region: i.region ?? '—',
        status: i.status,
      })),
      vpsList: vpsList.map((v) => {
        const meta = (v.metadata as Record<string, unknown>) ?? {}
        return {
          name: v.name,
          hostname: v.hostname,
          username: v.username,
          status: String(meta['sshStatus'] ?? 'connected'),
        }
      }),
      jenkinsList,
      panelRoutes: this.panelRoutes(),
      healthScore,
    }
  }

  toSidebarDomains(ctx: CopilotPlatformContext): CopilotSidebarDomain[] {
    const spend =
      ctx.billing.monthlySpend >= 1000
        ? `$${(ctx.billing.monthlySpend / 1000).toFixed(1)}k`
        : `${ctx.billing.monthlySpend.toFixed(0)} ${ctx.billing.currency}`

    return [
      {
        id: 'instances',
        label: 'Instancias',
        icon: 'dns',
        count: String(ctx.instances.total),
        hint: `${ctx.instances.running} en ejecución · cloud y VPS`,
      },
      {
        id: 'alerts',
        label: 'Alertas',
        icon: 'warning',
        count: String(ctx.alerts.open),
        hint:
          ctx.alerts.open === 0
            ? 'Sin alertas abiertas'
            : `${ctx.alerts.critical} críticas · ${ctx.alerts.warning} warning`,
      },
      {
        id: 'costs',
        label: 'Costes',
        icon: 'payments',
        count: spend,
        hint: 'Gasto acumulado en panel',
      },
      {
        id: 'kubernetes',
        label: 'Kubernetes',
        icon: 'hub',
        count: `${ctx.kubernetesClusters} clúster${ctx.kubernetesClusters === 1 ? '' : 'es'}`,
        hint: ctx.kubernetesClusters ? 'Clusters registrados' : 'Sin clusters conectados',
      },
      {
        id: 'approvals',
        label: 'Cuentas cloud',
        icon: 'rule',
        count: String(ctx.cloudAccounts.total),
        hint: `AWS ${ctx.cloudAccounts.aws} · GCP ${ctx.cloudAccounts.gcp} · Azure ${ctx.cloudAccounts.azure}`,
      },
      {
        id: 'security',
        label: 'Seguridad',
        icon: 'shield',
        count: String(ctx.healthScore),
        hint: 'Score de postura estimado',
      },
    ]
  }

  private computeHealthScore(input: {
    instances: number
    running: number
    warning: number
    criticalAlerts: number
    openAlerts: number
  }): number {
    if (input.instances === 0 && input.openAlerts === 0) return 100
    let score = 100
    score -= input.criticalAlerts * 12
    score -= Math.max(0, input.openAlerts - input.criticalAlerts) * 4
    score -= input.warning * 3
    if (input.instances > 0) {
      const unhealthyRatio = (input.instances - input.running) / input.instances
      score -= Math.round(unhealthyRatio * 20)
    }
    return Math.max(0, Math.min(100, score))
  }

  formatContextForPrompt(ctx: CopilotPlatformContext): string {
    const lines = [
      `Organización: ${ctx.organizationName}`,
      `Instancias: ${ctx.instances.total} total (${ctx.instances.running} en ejecución, ${ctx.instances.stopped} detenidas, ${ctx.instances.warning} con aviso)`,
      `Cuentas cloud: AWS ${ctx.cloudAccounts.aws}, GCP ${ctx.cloudAccounts.gcp}, Azure ${ctx.cloudAccounts.azure}, Clouding ${ctx.cloudAccounts.clouding}`,
      `Alertas abiertas: ${ctx.alerts.open} (${ctx.alerts.critical} críticas, ${ctx.alerts.warning} advertencias)`,
      `Gasto estimado MTD: ${ctx.billing.monthlySpend.toFixed(2)} ${ctx.billing.currency}`,
      `VPS: ${ctx.vpsHosts} · Kubernetes: ${ctx.kubernetesClusters} · Jenkins: ${ctx.jenkinsServers} · Terraform: ${ctx.terraformWorkspaces}`,
    ]
    if (ctx.recentInstances.length) {
      lines.push('Instancias recientes:')
      ctx.recentInstances.forEach((i) => {
        lines.push(`- ${i.name} (${i.provider}, ${i.region}) — ${i.status}`)
      })
    }
    if (ctx.cloudAccountList.length) {
      lines.push('Cuentas cloud (usa accountId al lanzar instancias):')
      ctx.cloudAccountList.forEach((a) => {
        lines.push(
          `- accountId="${a.id}" · ${a.provider} · ${a.name} · región por defecto: ${a.defaultRegion ?? '—'}`,
        )
      })
    }
    if (ctx.vpsList.length) {
      lines.push('Servidores VPS por SSH:')
      ctx.vpsList.forEach((v) => {
        lines.push(`- ${v.name} · ${v.username}@${v.hostname} · ${v.status}`)
      })
    }
    if (ctx.jenkinsList.length) {
      lines.push('Controladores Jenkins:')
      ctx.jenkinsList.forEach((j) => {
        lines.push(`- ${j.name} · ${j.url}`)
      })
    }
    lines.push('Capacidades del panel y rutas:')
    ctx.panelRoutes.forEach((r) => {
      lines.push(`- ${r.area}: ${r.capability} → ${r.route}`)
    })
    lines.push(`Salud global estimada: ${ctx.healthScore}%`)
    return lines.join('\n')
  }

  private panelRoutes(): { area: string; route: string; capability: string }[] {
    return [
      { area: 'Tablero', route: '/dashboard', capability: 'estado global, instancias cloud y VPS visibles' },
      { area: 'AI Infra Studio', route: '/automation/ai-infra-studio', capability: 'lanzar, probar y eliminar instancias AWS, GCP e IONOS' },
      { area: 'AWS EC2', route: '/cloud/aws/ec2', capability: 'lanzar instancia AWS con cuenta, region, VPC, subnet, SG, key pair, AMI y tipo' },
      { area: 'GCP', route: '/cloud/gcp/overview', capability: 'lanzar Compute Engine con proyecto, region, zona, VPC, subnet, firewall, imagen y machine type' },
      { area: 'VPS Servidores', route: '/vps/ionos/servers', capability: 'agregar servidor por SSH con servidor, usuario y contraseña' },
      { area: 'Infraestructura Instancias', route: '/instances/all-instances', capability: 'ver, probar y eliminar instancias y VPS' },
      { area: 'Observabilidad Logs', route: '/observability/logs', capability: 'revisar logs de lanzamiento, prueba y eliminación' },
      { area: 'FinOps Facturación', route: '/finops/billing', capability: 'analizar facturas y coste estimado' },
      { area: 'FinOps Instancias', route: '/finops/instances', capability: 'coste por recurso, proveedor, region y etiquetas' },
      { area: 'Jenkins', route: '/jenkins/jobs', capability: 'conectar controlador, listar jobs y desplegar apps con build real' },
      { area: 'Seguridad', route: '/security-center', capability: 'postura, secretos, auditoria y cumplimiento' },
    ]
  }
}
