import { Injectable } from '@nestjs/common'
import { AlertSeverity } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'

@Injectable()
export class AlertsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private realtime: RealtimeGateway,
  ) {}

  async createRule(data: { name: string; condition: string; severity: AlertSeverity }) {
    return this.prisma.alertRule.create({ data })
  }

  async listRules() {
    return this.prisma.alertRule.findMany({ where: { isActive: true } })
  }

  async listActiveAlerts() {
    return this.prisma.alert.findMany({
      where: { isResolved: false },
      include: { rule: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async fireAlert(ruleId: string, message: string, userId?: string) {
    const rule = await this.prisma.alertRule.findUnique({ where: { id: ruleId } })
    if (!rule) return

    const alert = await this.prisma.alert.create({
      data: { ruleId, message, severity: rule.severity },
    })

    if (userId) {
      await this.notifications.create(userId, 'in-app', `Alert: ${rule.name}`, message)
    }

    this.realtime.emitAlert(alert)
    return alert
  }

  async resolveAlert(id: string) {
    return this.prisma.alert.update({ where: { id }, data: { isResolved: true } })
  }

  async evaluateMetrics(resourceId: string, cpu: number, ram: number, disk: number) {
    const rules = await this.prisma.alertRule.findMany({ where: { isActive: true } })
    for (const rule of rules) {
      if (rule.condition.includes('cpu_high') && cpu > 90) {
        await this.fireAlert(rule.id, `CPU high on ${resourceId}: ${cpu}%`)
      }
      if (rule.condition.includes('ram_high') && ram > 90) {
        await this.fireAlert(rule.id, `RAM high on ${resourceId}: ${ram}%`)
      }
      if (rule.condition.includes('disk_full') && disk > 95) {
        await this.fireAlert(rule.id, `Disk almost full on ${resourceId}: ${disk}%`)
      }
    }
  }
}
