import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { mapWebhook } from './github-mappers'

@Injectable()
export class GithubWebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listAll() {
    const items = await this.prisma.githubWebhook.findMany({
      include: { repo: true },
      orderBy: { createdAt: 'desc' },
    })
    return { items: items.map((w) => mapWebhook(w, w.repo?.fullName)), demoMode: false }
  }

  async listByRepo(repoId: string) {
    const all = await this.listAll()
    return {
      items: all.items.filter((w) => w.repoId === repoId),
      demoMode: false,
    }
  }

  async create(
    userId: string,
    body: { repoId?: string; accountId?: string; event: string; url: string; secret?: string },
  ) {
    const webhook = await this.prisma.githubWebhook.create({
      data: {
        repoId: body.repoId,
        accountId: body.accountId,
        event: body.event,
        url: body.url,
        secretRef: body.secret ?? '',
        isActive: true,
      },
      include: { repo: true },
    })
    await this.audit.create({
      userId,
      action: 'github.webhook.create',
      resource: 'github_webhook',
      resourceId: webhook.id,
      metadata: body,
    })
    return mapWebhook(webhook, webhook.repo?.fullName)
  }

  async remove(userId: string, webhookId: string) {
    const existing = await this.prisma.githubWebhook.findUnique({ where: { id: webhookId } })
    if (!existing) throw new NotFoundException('Webhook no encontrado')
    await this.prisma.githubWebhook.delete({ where: { id: webhookId } })
    await this.audit.create({
      userId,
      action: 'github.webhook.delete',
      resource: 'github_webhook',
      resourceId: webhookId,
    })
    return { deleted: true, message: 'Webhook eliminado' }
  }
}
