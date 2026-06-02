import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { PrismaService } from '../../common/prisma/prisma.service'
import { RedisService } from '../../common/redis/redis.service'
import { Public } from '../../common/decorators/auth.decorators'

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    let dbStatus = 'ok'
    let redisStatus = 'ok'

    try {
      await this.prisma.$queryRaw`SELECT 1`
    } catch {
      dbStatus = 'error'
    }

    try {
      await this.redis.getClient().ping()
    } catch {
      redisStatus = 'error'
    }

    const status = dbStatus === 'ok' && redisStatus === 'ok' ? 'healthy' : 'degraded'

    return {
      status,
      timestamp: new Date().toISOString(),
      services: { database: dbStatus, redis: redisStatus },
    }
  }
}
