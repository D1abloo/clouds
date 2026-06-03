import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'

@Injectable()
export class MetricsSyncWorker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  syncAccountMetrics = async (accountId: string): Promise<{ samples: number }> => {
    const instances = await this.prisma.instance.findMany({
      where: { cloudAccountId: accountId, deletedAt: null },
      take: 20,
    })
    let samples = 0
    for (const inst of instances) {
      const cpu = Math.round(20 + Math.random() * 60)
      const ram = Math.round(30 + Math.random() * 50)
      await this.prisma.metricSample.create({
        data: {
          resourceId: inst.id,
          metricType: 'cpu_percent',
          value: cpu,
          unit: 'percent',
        },
      })
      await this.prisma.metricSample.create({
        data: {
          resourceId: inst.id,
          metricType: 'ram_percent',
          value: ram,
          unit: 'percent',
        },
      })
      samples += 2
      this.realtime.emitMetricUpdate(inst.id, { cpu, ram, syncedAt: new Date().toISOString() })
    }
    return { samples }
  }
}
