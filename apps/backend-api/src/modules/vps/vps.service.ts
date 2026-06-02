import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { CreateVpsDto } from './dto/create-vps.dto'
import { isDangerousCommand } from '../ssh/command-validator'

@Injectable()
export class VpsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateVpsDto, userId?: string) {
    const vps = await this.prisma.vpsServer.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        hostname: dto.hostname,
        port: dto.port ?? 22,
        username: dto.username,
        sshKeyRef: dto.sshKeyRef ?? `vault:ssh-key/${dto.name}`,
      },
    })

    await this.audit.create({
      userId,
      action: 'vps.create',
      resource: 'vps',
      resourceId: vps.id,
    })

    return this.sanitize(vps)
  }

  async findAll(projectId?: string) {
    const list = await this.prisma.vpsServer.findMany({
      where: { deletedAt: null, ...(projectId && { projectId }) },
    })
    return list.map((v) => this.sanitize(v))
  }

  async findOne(id: string) {
    const vps = await this.prisma.vpsServer.findUnique({ where: { id, deletedAt: null } })
    if (!vps) throw new NotFoundException('VPS not found')
    return this.sanitize(vps)
  }

  async validateConnection(id: string, userId?: string) {
    const vps = await this.findOne(id)
    // TODO: Real SSH connection via ssh2 library using secret from Vault
    await this.audit.create({
      userId,
      action: 'vps.validate',
      resource: 'vps',
      resourceId: id,
    })
    return { valid: true, message: `Mock SSH connection to ${vps.hostname}:${vps.port} (integrate ssh2 + Vault)` }
  }

  async executeCommand(id: string, command: string, userId?: string, confirmed = false) {
    if (isDangerousCommand(command) && !confirmed) {
      throw new ForbiddenException({
        message: 'Dangerous command requires confirmation',
        command,
        requiresConfirmation: true,
      })
    }

    const vps = await this.findOne(id)

    const execution = await this.prisma.commandExecution.create({
      data: {
        userId: userId ?? 'system',
        command,
        output: `[Mock] Executed on ${vps.hostname}: ${command}`,
        exitCode: 0,
      },
    })

    await this.audit.create({
      userId,
      action: 'vps.command',
      resource: 'vps',
      resourceId: id,
      metadata: { commandId: execution.id },
    })

    return execution
  }

  async getCommandHistory(id: string) {
    await this.findOne(id)
    return this.prisma.commandExecution.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  private sanitize(vps: { id: string; name: string; hostname: string; port: number; username: string; sshKeyRef: string; [key: string]: unknown }) {
    const { sshKeyRef, ...rest } = vps
    return { ...rest, hasSshKey: !!sshKeyRef }
  }
}
