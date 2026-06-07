import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CloudProvider } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { InstancesService } from '../instances/instances.service'
import { CloudAccountsService } from '../cloud-accounts/cloud-accounts.service'
import { TerraformService } from '../terraform/terraform.service'
import { JenkinsService } from '../jenkins/jenkins.service'
import { VpsService } from '../vps/vps.service'
import { KubernetesService } from '../kubernetes/kubernetes.service'
import { IntegrationsService } from '../integrations/integrations.service'
import { PLATFORM_EVENTS } from '../integrations/integrations.platform-events'
import { CommandCenterActionType, ExecuteActionDto } from './dto/execute-action.dto'

export interface CommandCenterActionResult {
  ok: true
  type: CommandCenterActionType
  resource: string
  message: string
  destinationRoute: string
  destinationLabel: string
  metadata?: Record<string, unknown>
}

const ACTION_DESTINATIONS: Record<CommandCenterActionType, { route: string; label: string }> = {
  [CommandCenterActionType.RESTART_INSTANCE]: {
    route: '/instances/all-instances',
    label: 'Instancias → Todas las instancias',
  },
  [CommandCenterActionType.SCALE_DEPLOYMENT]: {
    route: '/kubernetes/pods',
    label: 'Kubernetes → Pods',
  },
  [CommandCenterActionType.TERRAFORM_PLAN]: {
    route: '/terraform/workspaces',
    label: 'Terraform → Workspaces',
  },
  [CommandCenterActionType.JENKINS_BUILD]: {
    route: '/jenkins/jobs',
    label: 'Jenkins → Jobs',
  },
  [CommandCenterActionType.VPS_BACKUP]: {
    route: '/vps/overview',
    label: 'VPS → Overview',
  },
  [CommandCenterActionType.SYNC_INVENTORY]: {
    route: '/cloud/gcp/instances',
    label: 'Cloud → Instancias',
  },
}

@Injectable()
export class CommandCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly instances: InstancesService,
    private readonly cloudAccounts: CloudAccountsService,
    private readonly terraform: TerraformService,
    private readonly jenkins: JenkinsService,
    private readonly vps: VpsService,
    private readonly kubernetes: KubernetesService,
    private readonly integrations: IntegrationsService,
  ) {}

  async execute(dto: ExecuteActionDto, userId?: string): Promise<CommandCenterActionResult> {
    switch (dto.type) {
      case CommandCenterActionType.RESTART_INSTANCE:
        return this.restartInstance(dto, userId)
      case CommandCenterActionType.SCALE_DEPLOYMENT:
        return this.scaleDeployment(dto, userId)
      case CommandCenterActionType.TERRAFORM_PLAN:
        return this.terraformPlan(dto, userId)
      case CommandCenterActionType.JENKINS_BUILD:
        return this.jenkinsBuild(dto, userId)
      case CommandCenterActionType.VPS_BACKUP:
        return this.vpsBackup(dto, userId)
      case CommandCenterActionType.SYNC_INVENTORY:
        return this.syncInventory(dto, userId)
      default:
        throw new BadRequestException(`Unsupported action type: ${dto.type as string}`)
    }
  }

  async recentActions(limit = 20) {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        action: { startsWith: 'command-center.' },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((row) => {
      const meta = (row.metadata as Record<string, unknown>) ?? {}
      return {
        id: row.id,
        action: String(meta['label'] ?? row.action),
        resource: String(meta['resource'] ?? row.resourceId ?? '—'),
        provider: String(meta['provider'] ?? '—'),
        region: String(meta['region'] ?? '—'),
        status: String(meta['status'] ?? 'success'),
        actor: row.userId ?? 'system',
        when: row.createdAt.toISOString(),
        detail: String(meta['detail'] ?? row.action),
        destinationRoute: String(meta['destinationRoute'] ?? ''),
        destinationLabel: String(meta['destinationLabel'] ?? ''),
      }
    })
  }

  private wrapResult(
    type: CommandCenterActionType,
    resource: string,
    message: string,
    userId: string | undefined,
    label: string,
    extra?: Record<string, unknown>,
  ): CommandCenterActionResult {
    const dest = ACTION_DESTINATIONS[type]
    const providerRoute =
      type === CommandCenterActionType.SYNC_INVENTORY && extra?.['providerRoute']
        ? String(extra['providerRoute'])
        : dest.route
    const providerLabel =
      type === CommandCenterActionType.SYNC_INVENTORY && extra?.['providerLabel']
        ? String(extra['providerLabel'])
        : dest.label

    void this.audit.create({
      userId,
      action: `command-center.${type}`,
      resource: 'command_center_action',
      resourceId: resource,
      metadata: {
        label,
        resource,
        provider: extra?.['provider'],
        region: extra?.['region'],
        status: 'success',
        detail: message,
        destinationRoute: providerRoute,
        destinationLabel: providerLabel,
        ...extra,
      },
    })

    return {
      ok: true,
      type,
      resource,
      message,
      destinationRoute: providerRoute,
      destinationLabel: providerLabel,
      metadata: extra,
    }
  }

  private async resolveInstanceId(nameOrId: string): Promise<string> {
    const direct = await this.prisma.instance.findFirst({
      where: { OR: [{ id: nameOrId }, { name: nameOrId }], deletedAt: null },
    })
    if (direct) return direct.id

    const partial = await this.prisma.instance.findFirst({
      where: { name: { contains: nameOrId, mode: 'insensitive' }, deletedAt: null },
    })
    if (partial) return partial.id

    throw new NotFoundException(`Instancia no encontrada: ${nameOrId}`)
  }

  private async resolveCloudAccountId(nameOrId: string, provider?: string) {
    const account = await this.prisma.cloudAccount.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: nameOrId }, { name: nameOrId }, { name: { contains: nameOrId, mode: 'insensitive' } }],
        ...(provider ? { provider: provider as CloudProvider } : {}),
      },
    })
    if (!account) throw new NotFoundException(`Cuenta cloud no encontrada: ${nameOrId}`)
    return account
  }

  private emitCommandCenterEvent(
    eventType: string,
    title: string,
    body: string,
    severity: 'info' | 'warning' | 'critical',
    userId: string | undefined,
    metadata?: Record<string, unknown>,
  ) {
    void this.integrations.emitPlatformEvent(
      {
        eventType,
        title,
        body,
        severity,
        source: 'Command Center',
        metadata,
      },
      userId,
    )
  }

  private async restartInstance(dto: ExecuteActionDto, userId?: string): Promise<CommandCenterActionResult> {
    const resource = dto.resource?.trim()
    if (!resource) throw new BadRequestException('resource is required')
    const instanceId = await this.resolveInstanceId(resource)
    const instance = await this.instances.restart(instanceId, userId)
    const name = String((instance as { name?: string }).name ?? resource)
    const result = this.wrapResult(
      CommandCenterActionType.RESTART_INSTANCE,
      name,
      `Reinicio solicitado para ${name}`,
      userId,
      'Reiniciar instancia',
      { provider: 'AWS', region: dto.region ?? '—' },
    )
    this.emitCommandCenterEvent(
      PLATFORM_EVENTS.OPS_COMPLETED,
      `Reinicio instancia — ${name}`,
      result.message,
      'info',
      userId,
      { action: CommandCenterActionType.RESTART_INSTANCE, resource: name },
    )
    return result
  }

  private async scaleDeployment(dto: ExecuteActionDto, userId?: string): Promise<CommandCenterActionResult> {
    const name = dto.resource?.trim()
    if (!name) throw new BadRequestException('resource (deployment name) is required')
    const namespace = dto.namespace ?? 'checkout'
    const replicas = dto.replicas ?? 5
    const result_k8s = await this.kubernetes.scaleDeployment(name, namespace, replicas, userId)
    const result = this.wrapResult(
      CommandCenterActionType.SCALE_DEPLOYMENT,
      name,
      `Deployment ${name} escalado a ${replicas} réplicas`,
      userId,
      'Escalar K8s',
      { provider: 'Kubernetes', region: dto.region ?? result_k8s.clusterName, namespace, replicas },
    )
    this.emitCommandCenterEvent(
      PLATFORM_EVENTS.OPS_COMPLETED,
      `Escalado K8s — ${name}`,
      result.message,
      'info',
      userId,
      { action: CommandCenterActionType.SCALE_DEPLOYMENT, deployment: name, replicas, namespace },
    )
    return result
  }

  private async terraformPlan(dto: ExecuteActionDto, userId?: string): Promise<CommandCenterActionResult> {
    const workspaceName = dto.resource?.trim() ?? 'aws-production'
    const provider = (dto.provider ?? 'AWS') as CloudProvider
    const run = await this.terraform.createRun({ provider, workspaceName, config: {} }, userId)
    await this.terraform.init(run.id, userId)
    const planned = await this.terraform.plan(run.id, userId)
    return this.wrapResult(
      CommandCenterActionType.TERRAFORM_PLAN,
      workspaceName,
      `Plan Terraform completado en workspace ${workspaceName}`,
      userId,
      'Plan Terraform',
      { provider: 'Terraform', region: 'global', runId: planned.id, status: planned.status },
    )
  }

  private async jenkinsBuild(dto: ExecuteActionDto, userId?: string): Promise<CommandCenterActionResult> {
    const jobName = dto.jobName ?? dto.resource?.trim()
    if (!jobName) throw new BadRequestException('jobName or resource is required')

    let serverId = dto.jenkinsServerId
    if (!serverId) {
      const server = await this.prisma.jenkinsServer.findFirst({ orderBy: { createdAt: 'asc' } })
      if (!server) throw new NotFoundException('No hay servidores Jenkins configurados')
      serverId = server.id
    }

    const build = await this.jenkins.triggerBuild(serverId, jobName, {}, userId)
    return this.wrapResult(
      CommandCenterActionType.JENKINS_BUILD,
      jobName,
      `Pipeline ${jobName} encolado (build #${build.build.number})`,
      userId,
      'Pipeline Jenkins',
      { provider: 'Jenkins', region: dto.region ?? 'ci-01', build: build.build },
    )
  }

  private async vpsBackup(dto: ExecuteActionDto, userId?: string): Promise<CommandCenterActionResult> {
    const fleet = dto.resource?.trim() ?? 'vps-fleet'
    const result = await this.vps.createFleetBackup(dto.region, userId)
    return this.wrapResult(
      CommandCenterActionType.VPS_BACKUP,
      fleet,
      `Backup completado en ${result.hosts} hosts VPS`,
      userId,
      'Backup VPS',
      { provider: 'VPS', region: dto.region ?? result.region, hosts: result.hosts },
    )
  }

  private async syncInventory(dto: ExecuteActionDto, userId?: string): Promise<CommandCenterActionResult> {
    const accountRef = dto.cloudAccountId ?? dto.resource?.trim()
    if (!accountRef) throw new BadRequestException('cloudAccountId or resource (account name) is required')

    const account = await this.resolveCloudAccountId(accountRef, dto.provider)
    const sync = await this.cloudAccounts.syncInventory(account.id, userId)
    const providerSlug = account.provider.toLowerCase()
    const result = this.wrapResult(
      CommandCenterActionType.SYNC_INVENTORY,
      account.name,
      `Inventario sincronizado: ${sync.instances} instancias en ${sync.regions} regiones`,
      userId,
      'Sync inventario',
      {
        provider: account.provider,
        region: dto.region ?? account.defaultRegion ?? 'global',
        synced: sync.instances,
        providerRoute: `/cloud/${providerSlug}/instances`,
        providerLabel: `Cloud ${account.provider} → Instancias`,
      },
    )
    this.emitCommandCenterEvent(
      PLATFORM_EVENTS.CHANGE_CREATE,
      `Sync inventario — ${account.name}`,
      result.message,
      'info',
      userId,
      { action: CommandCenterActionType.SYNC_INVENTORY, account: account.name, instances: sync.instances },
    )
    return result
  }
}
