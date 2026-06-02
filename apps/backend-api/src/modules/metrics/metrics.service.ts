import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'

@Injectable()
export class MetricsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  async recordSample(resourceId: string, metricType: string, value: number, unit?: string) {
    const sample = await this.prisma.metricSample.create({
      data: { resourceId, metricType, value, unit },
    })
    this.realtime.emitMetricUpdate(resourceId, { metricType, value, unit })
    return sample
  }

  async getSamples(resourceId: string, metricType?: string, limit = 100) {
    return this.prisma.metricSample.findMany({
      where: { resourceId, ...(metricType && { metricType }) },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    })
  }

  async getDashboardStats() {
    const [instances, vps, alerts, samples] = await Promise.all([
      this.prisma.instance.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } }),
      this.prisma.vpsServer.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.alert.count({ where: { isResolved: false } }),
      this.prisma.metricSample.findMany({ orderBy: { recordedAt: 'desc' }, take: 50 }),
    ])

    const running = instances.find((i) => i.status === 'RUNNING')?._count ?? 0
    const stopped = instances.find((i) => i.status === 'STOPPED')?._count ?? 0
    const total = instances.reduce((s, i) => s + i._count, 0)

    const cpuSamples = samples.filter((s) => s.metricType === 'cpu')
    const ramSamples = samples.filter((s) => s.metricType === 'ram')
    const avgCpu = cpuSamples.length ? cpuSamples.reduce((s, x) => s + x.value, 0) / cpuSamples.length : 0
    const avgRam = ramSamples.length ? ramSamples.reduce((s, x) => s + x.value, 0) / ramSamples.length : 0

    return {
      totalInstances: total,
      runningInstances: running,
      stoppedInstances: stopped,
      activeVps: vps,
      activeAlerts: alerts,
      avgCpu,
      avgRam,
      dockerHosts: await this.prisma.dockerHost.count(),
      k8sClusters: await this.prisma.kubernetesCluster.count(),
    }
  }
}
