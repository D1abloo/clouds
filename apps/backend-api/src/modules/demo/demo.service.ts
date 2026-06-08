import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../common/prisma/prisma.service'
import { JwtPayload } from '../../common/decorators/current-user.decorator'
import { seedDemoData } from '../../../prisma/seed-demo'

const ADMIN_ROLES = new Set(['superadministrador', 'administrador', 'super_admin', 'admin'])

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  isDemoMode = (): boolean => this.config.get<string>('DEMO_MODE', 'false') === 'true'

  assertDemoMode = (): void => {
    if (!this.isDemoMode()) {
      throw new ForbiddenException('Demo mode is disabled. Set DEMO_MODE=true')
    }
  }

  assertAdminUser = (user?: JwtPayload): void => {
    if (!user) {
      throw new ForbiddenException('Authentication required to manage demo data')
    }
    const roles = user.roles ?? []
    if (!roles.some((r) => ADMIN_ROLES.has(r))) {
      throw new ForbiddenException('Only admin users can load or reset demo data')
    }
  }

  async getStatus() {
    const [instances, vps, alerts, metrics] = await Promise.all([
      this.prisma.instance.count({ where: { deletedAt: null } }),
      this.prisma.vpsServer.count({ where: { deletedAt: null } }),
      this.prisma.alert.count({ where: { isResolved: false } }),
      this.prisma.metricSample.count(),
    ])

    return {
      enabled: this.isDemoMode(),
      instances,
      vps,
      alerts,
      metrics,
      message: this.isDemoMode()
        ? 'Demo mode active — no real cloud resources are used'
        : 'Demo mode disabled',
    }
  }

  private async runSeed(reset: boolean, user?: JwtPayload) {
    this.assertDemoMode()
    this.assertAdminUser(user)

    try {
      this.logger.log(`Demo seed started (reset=${reset}) by ${user?.email ?? 'unknown'}`)
      const result = await seedDemoData({ clearFirst: reset }, this.prisma)
      await this.prisma.auditLog.create({
        data: {
          action: reset ? 'demo.reset' : 'demo.seed',
          resource: 'demo_dataset',
          userId: user?.sub,
          ipAddress: '127.0.0.1',
          metadata: result as object,
        },
      })
      return this.getStatus()
    } catch (err) {
      this.logger.error('Demo seed failed', err instanceof Error ? err.stack : String(err))
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'Demo seed failed — ensure base seed ran (roles/users)',
      )
    }
  }

  seed(user?: JwtPayload) {
    return this.runSeed(false, user)
  }

  reset(user?: JwtPayload) {
    return this.runSeed(true, user)
  }
}
