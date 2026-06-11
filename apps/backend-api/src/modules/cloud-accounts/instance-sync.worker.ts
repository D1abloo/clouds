import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { CloudSyncService } from './cloud-sync.service'

@Injectable()
export class InstanceSyncWorker {
  private readonly logger = new Logger(InstanceSyncWorker.name)
  private running = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: CloudSyncService,
  ) {}

  /** Sync all active cloud accounts (callable on interval or manually). */
  syncAllActive = async (
    projectIds?: string[],
  ): Promise<{ accounts: number; instances: number }> => {
    if (this.running) {
      this.logger.warn('Instance sync already running, skipping')
      return { accounts: 0, instances: 0 }
    }
    this.running = true
    try {
      const projectScope = projectIds?.length
        ? { projectId: { in: projectIds } }
        : { projectId: { in: [] as string[] } }
      const accounts = await this.prisma.cloudAccount.findMany({
        where: { deletedAt: null, isActive: true, ...projectScope },
      })
      let total = 0
      for (const acc of accounts) {
        const res = await this.sync.fullSync(acc.id)
        total += res.instances
      }
      return { accounts: accounts.length, instances: total }
    } finally {
      this.running = false
    }
  }
}
