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

  async plan(runId: string, userId?: string) {
    const run = await this.getRun(runId)
    const planOutput = this.generateMockPlan(run.workspace.provider)

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

    const updated = await this.prisma.terraformRun.update({
      where: { id: runId },
      data: { status: TerraformStatus.APPLIED },
    })

    await this.prisma.terraformRunLog.create({
      data: { runId, level: 'info', message: 'Terraform apply completed - resources created' },
    })

    await this.audit.create({ userId, action: 'terraform.apply', resource: 'terraform_run', resourceId: runId })
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
  constructor(private runner: TerraformRunnerService, private prisma: PrismaService) {}

  createRun = (dto: TerraformPlanRequest, userId?: string) => this.runner.createRun(dto, userId)
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
}
