import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/auth.decorators'
import { AppModeService } from '../../common/config/app-mode.service'
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

    const [users, instances, alerts] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }).catch(() => 0),
      this.prisma.instance.count({ where: { deletedAt: null } }).catch(() => 0),
      this.prisma.alert.count({ where: { isResolved: false } }).catch(() => 0),
    ])

    return {
      ...mode,
      database,
      counts: { users, instances, alerts },
    }
  }
}
