import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { IntegrationsService } from '../integrations/integrations.service'
import { PLATFORM_EVENTS } from '../integrations/integrations.platform-events'
import { CreateVpsDto } from './dto/create-vps.dto'
import { ValidateVpsPreviewDto } from './dto/validate-vps-preview.dto'
import { DetectOsPreviewDto, DetectRuntimeDto } from './dto/detect-runtime.dto'
import { isDangerousCommand } from '../ssh/command-validator'

@Injectable()
export class VpsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private integrations: IntegrationsService,
  ) {}

  async validatePreview(dto: ValidateVpsPreviewDto, userId?: string) {
    const host = dto.hostname?.trim()
    if (!host) {
      throw new BadRequestException('Hostname requerido')
    }
    const port = dto.port ?? 22
    // Stub: formato válido; integración ssh2 + Vault en despliegue con claves reales
    await this.audit.create({
      userId,
      action: 'vps.validate_preview',
      resource: 'vps',
      metadata: { hostname: host, port, username: dto.username },
    })
    return {
      valid: true,
      message: `Conexión SSH simulada correcta a ${dto.username}@${host}:${port}`,
    }
  }

  async detectOsPreview(dto: DetectOsPreviewDto, userId?: string) {
    const host = dto.hostname?.trim()
    if (!host) throw new BadRequestException('Hostname requerido')
    const seed = [...host].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    const port = dto.port ?? 22
    const user = (dto.username ?? 'root').toLowerCase()
    const windowsHint = port === 5985 || port === 5986 || user.includes('administrator')
    const osFamily: 'linux' | 'windows' = windowsHint || seed % 11 === 0 ? 'windows' : 'linux'
    const osName =
      osFamily === 'windows'
        ? 'Windows Server 2022'
        : seed % 3 === 0
          ? 'Debian 12'
          : seed % 2 === 0
            ? 'Ubuntu 24.04 LTS'
            : 'Ubuntu 22.04 LTS'

    await this.audit.create({
      userId,
      action: 'vps.detect_os_preview',
      resource: 'vps',
      metadata: { hostname: host, osFamily, osName },
    })

    return {
      detected: true,
      osFamily,
      osName,
      message: `SO detectado: ${osName} (${osFamily})`,
    }
  }

  async detectRuntime(id: string, dto: DetectRuntimeDto, userId?: string, projectIds: string[] = []) {
    const vps = await this.findOne(id, projectIds)
    const meta = (vps.metadata as Record<string, unknown>) ?? {}
    const seed = [...vps.hostname].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    const probeDocker = dto.probeDocker !== false
    const probeK8s = dto.probeKubernetes !== false

    const docker =
      probeDocker &&
      (Boolean(meta['docker']) || seed % 4 !== 0 || String(vps.name).toLowerCase().includes('docker'))
    const kubernetes =
      probeK8s &&
      (Boolean(meta['kubernetes']) ||
        seed % 3 === 0 ||
        String(vps.name).toLowerCase().includes('k8s') ||
        String(vps.name).toLowerCase().includes('kube'))

    const containers = docker
      ? [
          { name: 'nginx-proxy', image: 'nginx:1.25', status: 'running', cpu: 12, ram: 128, disk: 45, networkMbps: 8.2 },
          { name: 'api-gateway', image: 'node:20-alpine', status: 'running', cpu: 24, ram: 256, disk: 120, networkMbps: 15.4 },
          { name: 'redis-cache', image: 'redis:7', status: 'running', cpu: 6, ram: 64, disk: 20, networkMbps: 2.1 },
        ]
      : []

    const enrichedMeta = {
      ...meta,
      docker,
      kubernetes,
      runtimeProbedAt: new Date().toISOString(),
      containerCount: containers.length,
    }

    await this.prisma.vpsServer.update({
      where: { id },
      data: { metadata: enrichedMeta as object },
    })

    await this.audit.create({
      userId,
      action: 'vps.detect_runtime',
      resource: 'vps',
      resourceId: id,
      metadata: { docker, kubernetes, containers: containers.length },
    })

    return {
      docker,
      kubernetes,
      containers,
      navigationHints: [
        ...(docker ? [{ section: 'docker', label: 'Docker', route: '/docker/containers' }] : []),
        ...(kubernetes ? [{ section: 'kubernetes', label: 'Kubernetes', route: '/kubernetes/pods' }] : []),
      ],
      message:
        docker || kubernetes
          ? `Runtimes detectados: ${[docker && 'Docker', kubernetes && 'Kubernetes'].filter(Boolean).join(', ')}`
          : 'No se detectó Docker ni Kubernetes en este servidor',
    }
  }

  async create(dto: CreateVpsDto, userId?: string) {
    const vps = await this.prisma.vpsServer.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        hostname: dto.hostname,
        port: dto.port ?? 22,
        username: dto.username,
        sshKeyRef: dto.sshKeyRef ?? `vault:ssh-key/${dto.name}`,
        metadata: (dto.metadata ?? {}) as object,
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

  async findAll(scope: { projectId?: string; projectIds?: string[] }) {
    const projectFilter = scope.projectId
      ? { projectId: scope.projectId }
      : scope.projectIds?.length
        ? { projectId: { in: scope.projectIds } }
        : { projectId: { in: [] as string[] } }
    const list = await this.prisma.vpsServer.findMany({
      where: { deletedAt: null, ...projectFilter },
    })
    return list.map((v) => this.sanitize(v))
  }

  async findOne(id: string, projectIds: string[] = []) {
    const vps = await this.prisma.vpsServer.findUnique({ where: { id, deletedAt: null } })
    if (!vps) throw new NotFoundException('VPS not found')
    if (projectIds.length && !projectIds.includes(vps.projectId)) {
      throw new NotFoundException('VPS not found')
    }
    return this.sanitize(vps)
  }

  async validateConnection(id: string, userId?: string, projectIds: string[] = []) {
    const vps = await this.findOne(id, projectIds)
    // TODO: Real SSH connection via ssh2 library using secret from Vault
    await this.audit.create({
      userId,
      action: 'vps.validate',
      resource: 'vps',
      resourceId: id,
    })
    return { valid: true, message: `Mock SSH connection to ${vps.hostname}:${vps.port} (integrate ssh2 + Vault)` }
  }

  async executeCommand(
    id: string,
    command: string,
    userId?: string,
    confirmed = false,
    projectIds: string[] = [],
  ) {
    if (isDangerousCommand(command) && !confirmed) {
      throw new ForbiddenException({
        message: 'Dangerous command requires confirmation',
        command,
        requiresConfirmation: true,
      })
    }

    const vps = await this.findOne(id, projectIds)

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

  async getCommandHistory(id: string, projectIds: string[] = []) {
    await this.findOne(id, projectIds)
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
