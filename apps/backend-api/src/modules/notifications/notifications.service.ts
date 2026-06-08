import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, channel: string, title: string, body: string, section?: string) {
    return this.prisma.notification.create({
      data: { userId, channel, title, body, section: section ?? null },
    })
  }

  async findByUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly && { isRead: false }) },
      orderBy: { createdAt: 'desc' },
    })
  }

  async unreadSummary(userId: string) {
    const rows = await this.prisma.notification.groupBy({
      by: ['section'],
      where: { userId, isRead: false },
      _count: { _all: true },
    })
    const bySection: Record<string, number> = {}
    let total = 0
    for (const row of rows) {
      const key = row.section ?? 'general'
      const count = row._count?._all ?? 0
      bySection[key] = count
      total += count
    }
    return { total, bySection }
  }

  async markRead(id: string, userId: string) {
    const row = await this.prisma.notification.findFirst({ where: { id, userId } })
    if (!row) return null
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    })
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
    return { updated: result.count }
  }

  async sendWebhook(url: string, payload: Record<string, unknown>) {
    console.log(`[Webhook Mock] POST ${url}`, payload)
    return { sent: true, url }
  }

  async sendEmail(to: string, subject: string, body: string) {
    console.log(`[Email Mock] To: ${to}, Subject: ${subject}`)
    return { sent: true, to, subject, body }
  }
}
