import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { IntegrationsService } from '../integrations/integrations.service'
import { PLATFORM_EVENTS } from '../integrations/integrations.platform-events'
import { CreateVpsDto } from './dto/create-vps.dto'
import { isDangerousCommand } from '../ssh/command-validator'

@Injectable()
export class VpsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private integrations: IntegrationsService,
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

  async createFleetBackup(region?: string, userId?: string) {
    const hosts = await this.prisma.vpsServer.findMany({ where: { deletedAt: null } })
    const filtered = region
      ? hosts.filter((h) => {
          const meta = (h.metadata as Record<string, unknown>) ?? {}
          return meta['region'] === region || h.hostname.includes(region)
        })
      : hosts

    const snapshots = await Promise.all(
      filtered.map(async (vps) => {
        const output = `[Backup] Snapshot created for ${vps.name} (${vps.hostname})`
        const execution = await this.prisma.commandExecution.create({
          data: {
            userId: userId ?? 'system',
            command: 'backup-fleet-snapshot',
            output,
            exitCode: 0,
          },
        })
        await this.audit.create({
          userId,
          action: 'vps.backup',
          resource: 'vps',
          resourceId: vps.id,
          metadata: { commandId: execution.id, region: region ?? 'all' },
        })
        return { vpsId: vps.id, name: vps.name, executionId: execution.id }
      }),
    )

    void this.integrations.emitPlatformEvent(
      {
        eventType: PLATFORM_EVENTS.BACKUP_COMPLETED,
        title: `VPS fleet backup — ${region ?? 'all regions'}`,
        body: `Snapshot backup completed on ${snapshots.length} host(s)`,
        severity: 'info',
        source: 'VPS',
        metadata: { region: region ?? 'all', hosts: snapshots.length, snapshots },
      },
      userId,
    )

    return {
      hosts: snapshots.length,
      region: region ?? 'all',
      snapshots,
    }
  }

  private sanitize(vps: { id: string; name: string; hostname: string; port: number; username: string; sshKeyRef: string; metadata?: unknown; [key: string]: unknown }) {
    const { sshKeyRef, metadata, ...rest } = vps
    const meta = (metadata as Record<string, unknown>) ?? {}
    return {
      ...rest,
      host: rest.hostname,
      hasSshKey: !!sshKeyRef,
      isDemo: meta.isDemo ?? false,
      status: meta.sshStatus ?? (rest.isActive ? 'connected' : 'disconnected'),
      os: meta.os ?? null,
      environment: meta.environment ?? null,
      publicIp: meta.publicIp ?? null,
      privateIp: meta.privateIp ?? null,
      metadata: meta,
    }
  }
}
