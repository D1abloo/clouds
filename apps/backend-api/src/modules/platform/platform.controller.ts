import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/auth.decorators'
import { AppModeService } from '../../common/config/app-mode.service'
import { PLATFORM_SETTINGS_PRO } from '../../common/rbac/rbac.catalog'
import { PrismaService } from '../../common/prisma/prisma.service'

@ApiTags('Platform')
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly mode: AppModeService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Modo demo/PRO, OAuth y salud de PostgreSQL' })
  async status() {
    const mode = this.mode.getStatus()
    let database: { connected: boolean; latencyMs: number | null; error?: string } = {
      connected: false,
      latencyMs: null,
    }
    const started = Date.now()
    try {
      await this.prisma.$queryRaw`SELECT 1`
      database = { connected: true, latencyMs: Date.now() - started }
    } catch (e) {
      database = {
        connected: false,
        latencyMs: null,
        error: e instanceof Error ? e.message : 'Database unreachable',
      }
    }

    const [users, instances, alerts, organizations, memberships] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }).catch(() => 0),
      this.prisma.instance.count({ where: { deletedAt: null } }).catch(() => 0),
      this.prisma.alert.count({ where: { isResolved: false } }).catch(() => 0),
      this.prisma.organization.count({ where: { deletedAt: null } }).catch(() => 0),
      this.prisma.membership.count().catch(() => 0),
    ])

    const settingsRows = await this.prisma.platformSetting
      .findMany({
        where: { key: { in: Object.keys(PLATFORM_SETTINGS_PRO) } },
      })
      .catch(() => [])

    const settingsFromDb = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]))
    const settings = { ...PLATFORM_SETTINGS_PRO, ...settingsFromDb }

    const isProd = process.env.NODE_ENV === 'production' || mode.proMode

    return {
      ...mode,
      database,
      counts: { users, instances, alerts, organizations, memberships },
      multiUser: { organizations, memberships, workspaceScoping: true },
      security: {
        tls: isProd,
        credentialsEncryption: 'AES-256-GCM',
        passwordHashing: 'bcrypt',
        workspaceIsolation: true,
        jwtSessions: true,
      },
      settings,
    }
  }

  @Public()
  @Get('server-time')
  @ApiOperation({ summary: 'Hora del servidor y zona horaria' })
  serverTime() {
    const now = new Date()
    return {
      serverTime: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  }
}
