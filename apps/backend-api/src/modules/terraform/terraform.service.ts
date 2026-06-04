import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { CloudProvider, TerraformStatus } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'

export interface TerraformPlanRequest {
  provider: CloudProvider
  workspaceName: string
  config: Record<string, unknown>
}

@Injectable()
export class TerraformRunnerService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private realtime: RealtimeGateway,
  ) {}

  async createRun(dto: TerraformPlanRequest, userId?: string) {
    const workspace = await this.prisma.terraformWorkspace.create({
      data: { name: dto.workspaceName, provider: dto.provider },
    })

    const run = await this.prisma.terraformRun.create({
      data: { workspaceId: workspace.id, status: TerraformStatus.PENDING },
    })

    await this.audit.create({
      userId,
      action: 'terraform.run.create',
      resource: 'terraform_run',
      resourceId: run.id,
    })

    return run
  }

  async init(runId: string, userId?: string) {
    const run = await this.getRun(runId)
    this.realtime.emitTerraformLog(runId, 'terraform init')
    this.realtime.emitTerraformProgress(runId, 'Initializing', 15, 'Initializing provider plugins…')
    await this.prisma.terraformRunLog.create({
      data: { runId, level: 'info', message: 'terraform init completed' },
    })
    await this.audit.create({ userId, action: 'terraform.init', resource: 'terraform_run', resourceId: runId })
    return { runId, status: run.status, message: 'init complete' }
  }

  async plan(runId: string, userId?: string) {
    const run = await this.getRun(runId)
    this.realtime.emitTerraformProgress(runId, 'Plan', 45, 'terraform plan -out=tfplan')
    this.realtime.emitTerraformLog(runId, 'Refreshing state…')
    const planOutput = this.generateMockPlan(run.workspace.provider)
    this.realtime.emitTerraformLog(runId, planOutput)
    this.realtime.emitTerraformProgress(runId, 'Plan', 70, 'Plan complete')

    const updated = await this.prisma.terraformRun.update({
      where: { id: runId },
      data: { status: TerraformStatus.PLANNED, planOutput },
    })

    await this.prisma.terraformRunLog.create({
      data: { runId, level: 'info', message: 'Terraform plan completed successfully' },
    })

    await this.audit.create({ userId, action: 'terraform.plan', resource: 'terraform_run', resourceId: runId })
    this.realtime.emitTerraformUpdate(runId, { status: 'PLANNED', planOutput })

    return updated
  }

  async apply(runId: string, userId?: string, confirmed = false) {
    if (!confirmed) throw new BadRequestException('Apply requires explicit confirmation')

    const run = await this.getRun(runId)
    if (run.status !== TerraformStatus.PLANNED) {
      throw new BadRequestException('Run must be in PLANNED status before apply')
    }

    this.realtime.emitTerraformProgress(runId, 'Apply', 85, 'terraform apply -auto-approve')
    this.realtime.emitTerraformLog(runId, '+ aws_instance.web will be created')

    const updated = await this.prisma.terraformRun.update({
      where: { id: runId },
      data: { status: TerraformStatus.APPLIED },
    })

    await this.prisma.terraformRunLog.create({
      data: { runId, level: 'info', message: 'Terraform apply completed - resources created' },
    })

    await this.audit.create({ userId, action: 'terraform.apply', resource: 'terraform_run', resourceId: runId })
    this.realtime.emitTerraformProgress(runId, 'Done', 100, 'Apply complete')
    this.realtime.emitTerraformUpdate(runId, { status: 'APPLIED' })

    return updated
  }

  async destroy(runId: string, userId?: string, confirmed = false, reinforced = false) {
    if (!confirmed || !reinforced) {
      throw new BadRequestException('Destroy requires double confirmation (confirmed + reinforced)')
    }

    const updated = await this.prisma.terraformRun.update({
      where: { id: runId },
      data: { status: TerraformStatus.DESTROYED },
    })

    await this.audit.create({ userId, action: 'terraform.destroy', resource: 'terraform_run', resourceId: runId })
    return updated
  }

  async getRunLogs(runId: string) {
    return this.prisma.terraformRunLog.findMany({ where: { runId }, orderBy: { createdAt: 'asc' } })
  }

  private async getRun(runId: string) {
    const run = await this.prisma.terraformRun.findUnique({ where: { id: runId }, include: { workspace: true } })
    if (!run) throw new NotFoundException('Terraform run not found')
    return run
  }

  private generateMockPlan(provider: CloudProvider): string {
    return `# Terraform Plan (Mock) - ${provider}\n\n+ aws_instance.web (or equivalent)\n  instance_type = "t3.medium"\n  ami           = "ami-12345678"\n\nPlan: 1 to add, 0 to change, 0 to destroy.`
  }
}

@Injectable()
export class TerraformService {
  constructor(
    private runner: TerraformRunnerService,
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  createRun = (dto: TerraformPlanRequest, userId?: string) => this.runner.createRun(dto, userId)
  init = (runId: string, userId?: string) => this.runner.init(runId, userId)
  plan = (runId: string, userId?: string) => this.runner.plan(runId, userId)
  apply = (runId: string, userId?: string, confirmed?: boolean) => this.runner.apply(runId, userId, confirmed)
  destroy = (runId: string, userId?: string, confirmed?: boolean, reinforced?: boolean) =>
    this.runner.destroy(runId, userId, confirmed, reinforced)
  getLogs = (runId: string) => this.runner.getRunLogs(runId)

  async saveTemplate(name: string, provider: CloudProvider, config: Record<string, unknown>) {
    return this.prisma.instanceTemplate.create({ data: { name, provider, config: config as object } })
  }

  async listTemplates() {
    return this.prisma.instanceTemplate.findMany()
  }

  async previewLaunch(dto: {
    provider: CloudProvider
    region: string
    instanceType: string
    name?: string
    config?: Record<string, unknown>
  }) {
    const name = dto.name ?? `tf-${dto.provider.toLowerCase()}-vm`
    const hcl = this.generateHcl(dto.provider, { ...dto.config, region: dto.region, instanceType: dto.instanceType, name })
    const plan = `# Terraform Plan — ${dto.provider}\n\n+ compute_instance.${name}\n  instance_type = "${dto.instanceType}"\n  region        = "${dto.region}"\n\nPlan: 1 to add, 0 to change, 0 to destroy.`
    return { hcl, plan }
  }

  private generateHcl(provider: CloudProvider, cfg: Record<string, unknown>): string {
    const region = String(cfg['region'] ?? 'us-east-1')
    const instanceType = String(cfg['instanceType'] ?? 't3.medium')
    const name = String(cfg['name'] ?? 'web-prod-01')
    if (provider === 'GCP') {
      return `module "app_instance" {\n  source       = "../../modules/gcp/compute-instance"\n  name         = "${name}"\n  zone         = "${region}"\n  machine_type = "${instanceType}"\n}\n`
    }
    if (provider === 'AZURE') {
      return `module "vm_instance" {\n  source   = "../../modules/azure/virtual-machine"\n  name     = "${name}"\n  location = "${region}"\n  vm_size  = "${instanceType}"\n}\n`
    }
    return `module "web_instance" {\n  source        = "../../modules/aws/instance"\n  name          = "${name}"\n  region        = "${region}"\n  instance_type = "${instanceType}"\n}\n`
  }

  async estimateLaunchInstance(dto: {
    provider: CloudProvider
    region: string
    instanceType: string
    name?: string
    config?: Record<string, unknown>
  }) {
    const hourly = dto.instanceType.includes('large') ? 0.16 : dto.instanceType.includes('small') ? 0.04 : 0.08
    const monthly = Math.round(hourly * 730 * 100) / 100
    return {
      provider: dto.provider,
      region: dto.region,
      instanceType: dto.instanceType,
      name: dto.name ?? `tf-${dto.provider.toLowerCase()}-vm`,
      estimatedHourlyUsd: hourly,
      estimatedMonthlyUsd: monthly,
      resources: [
        { type: 'compute_instance', name: dto.name ?? 'vm', change: 'create' },
        { type: 'security_group', name: 'sg-web', change: 'create' },
        { type: 'network', name: 'subnet-main', change: 'create' },
      ],
      currency: 'USD',
    }
  }

  async planLaunchInstance(
    dto: {
      provider: CloudProvider
      region: string
      instanceType: string
      name?: string
      workspaceName?: string
      config?: Record<string, unknown>
    },
    userId?: string,
  ) {
    const workspaceName = dto.workspaceName ?? `launch-${dto.name ?? dto.region}`
    const run = await this.runner.createRun(
      {
        provider: dto.provider,
        workspaceName,
        config: { ...dto.config, region: dto.region, instanceType: dto.instanceType, name: dto.name },
      },
      userId,
    )
    const planned = await this.runner.plan(run.id, userId)
    return {
      runId: run.id,
      workspaceName,
      status: planned.status,
      planOutput: planned.planOutput,
      estimate: await this.estimateLaunchInstance(dto),
    }
  }

  async applyLaunchInstance(runId: string, userId?: string, confirmed = false) {
    this.realtime.emitTerraformProgress(runId, 'Initializing', 10, 'Starting launch pipeline…')
    this.realtime.emitTerraformProgress(runId, 'Terraform init', 25, 'terraform init')
    this.realtime.emitTerraformProgress(runId, 'Plan', 50, 'terraform plan')
    this.realtime.emitTerraformProgress(runId, 'Apply', 80, 'terraform apply')
    const applied = await this.runner.apply(runId, userId, confirmed)
    this.realtime.emitTerraformProgress(runId, 'Syncing', 95, 'Syncing inventory…')
    this.realtime.emitTerraformProgress(runId, 'Done', 100, 'Launch complete')
    return {
      runId: applied.id,
      status: applied.status,
      message: 'Terraform apply completed — instance resources provisioned',
    }
  }
}
