import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, channel: string, title: string, body: string) {
    return this.prisma.notification.create({ data: { userId, channel, title, body } })
  }

  async findByUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly && { isRead: false }) },
      orderBy: { createdAt: 'desc' },
    })
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } })
  }

  async sendWebhook(url: string, payload: Record<string, unknown>) {
    // TODO: HTTP POST to webhook URL
    console.log(`[Webhook Mock] POST ${url}`, payload)
    return { sent: true, url }
  }

  async sendEmail(to: string, subject: string, body: string) {
    // TODO: Integrate email provider (SES, SendGrid, etc.)
    console.log(`[Email Mock] To: ${to}, Subject: ${subject}`)
    return { sent: true, to, subject, body }
  }
}
