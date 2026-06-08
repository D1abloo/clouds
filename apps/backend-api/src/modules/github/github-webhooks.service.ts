import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { AppModeService } from '../../common/config/app-mode.service'
import { connectionRequired } from '../../common/utils/pro-connection.util'
import { GithubDemoService } from './github-demo.service'
import { mapWebhook } from './github-mappers'

@Injectable()
export class GithubWebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demo: GithubDemoService,
    private readonly audit: AuditService,
    private readonly mode: AppModeService,
  ) {}

  async listAll(): Promise<{ items: ReturnType<typeof mapWebhook>[]; demoMode: boolean }> {
    const demoAllowed = this.mode.canUseDemoFallback()

    if (!this.demo.isDbReady()) {
      if (!demoAllowed) return { items: [], demoMode: false }
      return { items: this.demo.listMemoryWebhooks(), demoMode: true }
    }
    try {
      const items = await this.prisma.githubWebhook.findMany({
        include: { repo: true },
        orderBy: { createdAt: 'desc' },
      })
      if (items.length) {
        return { items: items.map((w) => mapWebhook(w, w.repo?.fullName)), demoMode: false }
      }
      if (!demoAllowed) return { items: [], demoMode: false }
    } catch {
      if (!demoAllowed) return { items: [], demoMode: false }
    }
    return { items: this.demo.listMemoryWebhooks(), demoMode: true }
  }

  async listByRepo(repoId: string) {
    const all = await this.listAll()
    return {
      items: all.items.filter((w) => w.repoId === repoId),
      demoMode: all.demoMode,
    }
  }

  async create(
    userId: string,
    body: { repoId?: string; accountId?: string; event: string; url: string; secret?: string },
  ) {
    const demoAllowed = this.mode.canUseDemoFallback()
    if (!this.demo.isDbReady()) {
      if (!demoAllowed) {
        return connectionRequired('GitHub', 'Conecte una cuenta GitHub con token OAuth o PAT')
      }
      return {
        id: `gh-wh-mem-${Date.now()}`,
        repoId: body.repoId,
        repoFullName: '',
        event: body.event,
        url: body.url,
        active: true,
        demoMode: true,
      }
    }
    const webhook = await this.prisma.githubWebhook.create({
      data: {
        repoId: body.repoId,
        accountId: body.accountId,
        event: body.event,
        url: body.url,
        secretRef: body.secret ?? 'demo:secret',
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
    if (webhookId.startsWith('gh-wh-mem-')) {
      return { deleted: true, message: 'Webhook eliminado (demo)' }
    }
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
