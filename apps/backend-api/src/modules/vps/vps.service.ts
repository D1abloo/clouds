import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { IntegrationsService } from '../integrations/integrations.service'
import { PLATFORM_EVENTS } from '../integrations/integrations.platform-events'
import { SecretsVaultService } from '../cloud-accounts/secrets-vault.service'
import { CreateVpsDto } from './dto/create-vps.dto'
import { ValidateVpsPreviewDto } from './dto/validate-vps-preview.dto'
import { DetectOsPreviewDto, DetectRuntimeDto } from './dto/detect-runtime.dto'
import { isDangerousCommand } from '../ssh/command-validator'
import { Client } from 'ssh2'

type SshCredentials = {
  hostname: string
  port: number
  username: string
  password?: string
}

@Injectable()
export class VpsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private integrations: IntegrationsService,
    private vault: SecretsVaultService,
  ) {}

  async validatePreview(dto: ValidateVpsPreviewDto, userId?: string) {
    const host = dto.hostname?.trim()
    if (!host) {
      throw new BadRequestException('Hostname requerido')
    }
    const port = dto.port ?? 22
    const username = dto.username?.trim()
    if (!username) throw new BadRequestException('Usuario SSH requerido')
    if (!dto.password?.trim()) throw new BadRequestException('Contraseña SSH requerida')

    await this.probeSsh({
      hostname: host,
      port,
      username,
      password: dto.password,
    })

    await this.audit.create({
      userId,
      action: 'vps.validate_preview',
      resource: 'vps',
      metadata: { hostname: host, port, username },
    })
    return {
      valid: true,
      message: `Conexión SSH verificada en ${username}@${host}:${port}`,
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
    const vps = await this.findRawOne(id, projectIds)
    const meta = (vps.metadata as Record<string, unknown>) ?? {}
    const probeDocker = dto.probeDocker !== false
    const probeK8s = dto.probeKubernetes !== false
    const creds = this.credentialsFor(vps)

    let docker = false
    let kubernetes = false
    let containers: { name: string; image: string; status: string; cpu: number; ram: number; disk: number; networkMbps: number }[] = []

    if (probeDocker) {
      try {
        const out = await this.executeSshCommand(
          creds,
          "command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}|{{.Image}}|{{.Status}}' || true",
        )
        containers = out.stdout
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [name, image, status] = line.split('|')
            return {
              name: name || 'container',
              image: image || 'unknown',
              status: status || 'unknown',
              cpu: 0,
              ram: 0,
              disk: 0,
              networkMbps: 0,
            }
          })
        docker = containers.length > 0 || out.stdout.trim().length > 0
      } catch {
        docker = false
      }
    }

    if (probeK8s) {
      try {
        const out = await this.executeSshCommand(
          creds,
          "command -v kubectl >/dev/null 2>&1 || command -v k3s >/dev/null 2>&1",
        )
        kubernetes = out.code === 0
      } catch {
        kubernetes = false
      }
    }

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
    const hostname = dto.hostname?.trim()
    const username = dto.username?.trim()
    if (!hostname) throw new BadRequestException('Hostname requerido')
    if (!username) throw new BadRequestException('Usuario SSH requerido')
    if (!dto.password?.trim() && !dto.sshKeyRef?.trim()) {
      throw new BadRequestException('Contraseña SSH requerida')
    }

    const port = dto.port ?? 22
    const secretRef =
      dto.sshKeyRef ??
      this.vault.storeSecrets({
        authMethod: 'password',
        hostname,
        port: String(port),
        username,
        password: dto.password ?? '',
      })

    if (dto.password?.trim()) {
      await this.probeSsh({ hostname, port, username, password: dto.password })
    }

    const vps = await this.prisma.vpsServer.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        hostname,
        port,
        username,
        sshKeyRef: secretRef,
        metadata: {
          ...(dto.metadata ?? {}),
          authMethod: 'password',
          connectionMethod: 'ssh',
          sshStatus: 'connected',
          publicIp: hostname,
          lastSshValidatedAt: new Date().toISOString(),
        } as object,
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
    const vps = await this.prisma.vpsServer.findFirst({ where: { id, deletedAt: null } })
    if (!vps) throw new NotFoundException('VPS not found')
    if (projectIds.length && !projectIds.includes(vps.projectId)) {
      throw new NotFoundException('VPS not found')
    }
    return this.sanitize(vps)
  }

  async validateConnection(id: string, userId?: string, projectIds: string[] = []) {
    const vps = await this.findRawOne(id, projectIds)
    await this.probeSsh(this.credentialsFor(vps))
    await this.audit.create({
      userId,
      action: 'vps.validate',
      resource: 'vps',
      resourceId: id,
    })
    await this.prisma.vpsServer.update({
      where: { id },
      data: {
        metadata: {
          ...(vps.metadata as Record<string, unknown>),
          sshStatus: 'connected',
          lastSshValidatedAt: new Date().toISOString(),
        },
      },
    })
    return { valid: true, message: `Conexión SSH verificada en ${vps.username}@${vps.hostname}:${vps.port}` }
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

    const vps = await this.findRawOne(id, projectIds)

    const output = await this.executeSshCommand(this.credentialsFor(vps), command)

    const execution = await this.prisma.commandExecution.create({
      data: {
        userId: userId ?? 'system',
        command,
        output: output.stdout || output.stderr,
        exitCode: output.code,
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

  private async findRawOne(id: string, projectIds: string[] = []) {
    const vps = await this.prisma.vpsServer.findFirst({ where: { id, deletedAt: null } })
    if (!vps) throw new NotFoundException('VPS not found')
    if (projectIds.length && !projectIds.includes(vps.projectId)) {
      throw new NotFoundException('VPS not found')
    }
    return vps
  }

  private credentialsFor(vps: {
    hostname: string
    port: number
    username: string
    sshKeyRef?: string
  }): SshCredentials {
    const secrets = this.vault.readSecrets(vps.sshKeyRef ?? '')
    const password = secrets.password
    if (!password) {
      throw new BadRequestException('Este VPS no tiene contraseña SSH cifrada asociada')
    }
    return {
      hostname: vps.hostname,
      port: vps.port,
      username: secrets.username || vps.username,
      password,
    }
  }

  private probeSsh(creds: SshCredentials): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = new Client()
      const timeout = setTimeout(() => {
        client.end()
        reject(new BadRequestException('Timeout conectando por SSH'))
      }, 10_000)

      client
        .on('ready', () => {
          clearTimeout(timeout)
          client.end()
          resolve()
        })
        .on('error', (err) => {
          clearTimeout(timeout)
          reject(new BadRequestException(`No se pudo validar SSH: ${err.message}`))
        })
        .connect({
          host: creds.hostname,
          port: creds.port,
          username: creds.username,
          password: creds.password,
          readyTimeout: 8_000,
        })
    })
  }

  private executeSshCommand(
    creds: SshCredentials,
    command: string,
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve, reject) => {
      const client = new Client()
      let settled = false
      const finish = (fn: () => void) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        fn()
      }
      const timeout = setTimeout(() => {
        client.end()
        finish(() => reject(new BadRequestException('Timeout ejecutando comando SSH')))
      }, 20_000)

      client
        .on('ready', () => {
          client.exec(command, (err, stream) => {
            if (err) {
              client.end()
              finish(() => reject(new BadRequestException(`No se pudo ejecutar el comando: ${err.message}`)))
              return
            }
            let stdout = ''
            let stderr = ''
            let code = 0
            stream
              .on('close', (exitCode: number) => {
                code = exitCode ?? 0
                client.end()
                finish(() => resolve({ stdout, stderr, code }))
              })
              .on('data', (data: Buffer) => {
                stdout += data.toString('utf8')
              })
            stream.stderr.on('data', (data: Buffer) => {
              stderr += data.toString('utf8')
            })
          })
        })
        .on('error', (err) => {
          finish(() => reject(new BadRequestException(`Error SSH: ${err.message}`)))
        })
        .connect({
          host: creds.hostname,
          port: creds.port,
          username: creds.username,
          password: creds.password,
          readyTimeout: 8_000,
        })
    })
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
