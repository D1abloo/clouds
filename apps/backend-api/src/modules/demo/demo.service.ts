import { Injectable, ForbiddenException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../common/prisma/prisma.service'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'

const execFileAsync = promisify(execFile)

@Injectable()
export class DemoService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  isDemoMode = (): boolean => this.config.get<string>('DEMO_MODE') === 'true'

  assertDemoMode = (): void => {
    if (!this.isDemoMode()) {
      throw new ForbiddenException('Demo mode is disabled. Set DEMO_MODE=true in .env')
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

  private async runSeedScript(reset: boolean) {
    this.assertDemoMode()
    const apiRoot = join(__dirname, '..', '..', '..')
    const script = reset ? 'prisma:seed:demo:reset' : 'prisma:seed:demo'
    await execFileAsync('npm', ['run', script], { cwd: apiRoot, env: process.env })
    return this.getStatus()
  }

  async seed() {
    return this.runSeedScript(false)
  }

  async reset() {
    return this.runSeedScript(true)
  }
}
