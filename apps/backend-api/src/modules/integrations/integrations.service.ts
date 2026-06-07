import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { sendJira, sendPagerDuty, sendSlack } from './integrations.providers'
import {
  CORE_INTEGRATION_IDS,
  DEFAULT_INTEGRATIONS,
  type IntegrationDispatchPayload,
  type IntegrationId,
  type IntegrationSendResult,
} from './integrations.types'

type UpdateIntegrationInput = {
  enabled?: boolean
  status?: string
  config?: Record<string, unknown>
  events?: string[]
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  isDemoMode = (): boolean => this.config.get<string>('DEMO_MODE', 'true') === 'true'

  isLiveMode = (): boolean => {
    const forceLive = this.config.get<string>('INTEGRATIONS_LIVE', 'false') === 'true'
    return forceLive || !this.isDemoMode()
  }

  async getStatus() {
    await this.ensureDefaults()
    const enabled = await this.prisma.integrationConfig.count({ where: { enabled: true } })
    const liveMode = this.isLiveMode()
    return {
      demoMode: this.isDemoMode(),
      liveMode,
      deliveryMode: liveMode ? 'live' : 'simulated',
      enabledCount: enabled,
      message: liveMode
        ? 'Entrega en vivo activa — Slack, PagerDuty y Jira recibirán HTTP real si hay credenciales.'
        : 'Modo simulación — las entregas se registran en el log. Activa INTEGRATIONS_LIVE=true en PRO.',
      coreIntegrations: CORE_INTEGRATION_IDS,
    }
  }

  async list() {
    await this.ensureDefaults()
    return this.prisma.integrationConfig.findMany({ orderBy: { label: 'asc' } })
  }

  async findOne(id: string) {
    await this.ensureDefaults()
    const row = await this.prisma.integrationConfig.findUnique({ where: { id } })
    if (!row) throw new NotFoundException(`Integration ${id} not found`)
    return row
  }

  async update(id: string, input: UpdateIntegrationInput, userId?: string) {
    await this.ensureDefaults()
    const existing = await this.findOne(id)
    const wasEnabled = existing.enabled

    const events = input.events ?? (existing.events as string[])
    const config = { ...(existing.config as Record<string, unknown>), ...(input.config ?? {}) }
    let status = input.status ?? existing.status
    const enabled = input.enabled ?? existing.enabled

    if (enabled && !wasEnabled) {
      status = CORE_INTEGRATION_IDS.includes(id as IntegrationId) ? 'connected' : status
    }
    if (!enabled) {
      status = 'disconnected'
    }

    const updated = await this.prisma.integrationConfig.update({
      where: { id },
      data: {
        enabled,
        status,
        config: config as Prisma.InputJsonValue,
        events: events as Prisma.InputJsonValue,
        lastSync: enabled ? new Date() : existing.lastSync,
      },
    })

    if (enabled && !wasEnabled) {
      await this.dispatch(
        {
          eventType: 'integration.enabled',
          title: `${updated.label} activada`,
          body: `La integración ${updated.label} está activa y recibirá eventos suscritos.`,
          severity: 'info',
          source: 'CloudOps Settings',
        },
        userId,
        id,
      )
    }

    return updated
  }

  async disconnect(id: string, userId?: string) {
    const updated = await this.update(id, { enabled: false, status: 'disconnected' }, userId)
    if (userId) {
      await this.notifications.create(userId, 'in_app', 'Integración desconectada', `${updated.label} desactivada`)
    }
    return updated
  }

  async testConnection(id: string, userId?: string) {
    const integration = await this.findOne(id)
    const result = await this.deliverToIntegration(integration.id, {
      eventType: 'integration.test',
      title: `Prueba de conexión — ${integration.label}`,
      body: `Ping de CloudOps (${this.isLiveMode() ? 'PRO / live' : 'simulación demo'})`,
      severity: 'info',
      source: 'CloudOps',
    })

    await this.recordDelivery(integration.id, 'integration.test', result, {
      eventType: 'integration.test',
      title: `Test ${integration.label}`,
      body: 'Connection test',
    })

    if (userId) {
      const msg =
        result.status === 'sent'
          ? `${integration.label}: conexión OK (${result.latencyMs} ms)`
          : result.status === 'simulated'
            ? `${integration.label}: simulación OK — activa INTEGRATIONS_LIVE en PRO`
            : `${integration.label}: error — ${result.error}`
      await this.notifications.create(userId, 'in_app', 'Test integración', msg)
    }

    await this.prisma.integrationConfig.update({
      where: { id },
      data: { lastSync: new Date(), status: result.status === 'failed' ? 'error' : 'connected' },
    })

    return { integration: await this.findOne(id), result, liveMode: this.isLiveMode() }
  }

  async listDeliveries(limit = 30, integrationId?: string) {
    return this.prisma.integrationDelivery.findMany({
      where: integrationId ? { integrationId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      include: { integration: { select: { id: true, label: true } } },
    })
  }

  async dispatch(event: IntegrationDispatchPayload, userId?: string, onlyIntegrationId?: string) {
    await this.ensureDefaults()
    const integrations = await this.prisma.integrationConfig.findMany({
      where: {
        enabled: true,
        ...(onlyIntegrationId ? { id: onlyIntegrationId } : {}),
      },
    })

    const results: Array<{ integrationId: string; result: IntegrationSendResult }> = []

    for (const integration of integrations) {
      const subscribed = (integration.events as string[]) ?? []
      if (!subscribed.includes(event.eventType) && !onlyIntegrationId) continue

      const result = await this.deliverToIntegration(integration.id, event)
      await this.recordDelivery(integration.id, event.eventType, result, event)
      results.push({ integrationId: integration.id, result })

      if (userId) {
        await this.notifications.create(
          userId,
          'in_app',
          `${integration.label}: ${event.title}`,
          `[${result.status}] ${event.body}`.slice(0, 500),
        )
      }
    }

    this.logger.log(
      `Dispatch ${event.eventType} → ${results.length} integration(s) (${this.isLiveMode() ? 'live' : 'simulated'})`,
    )

    return { event: event.eventType, liveMode: this.isLiveMode(), results }
  }

  /** Fan-out platform events (Jenkins, Terraform, GitHub, alerts, …) to enabled integrations. */
  emitPlatformEvent = (
    event: IntegrationDispatchPayload,
    userId?: string,
  ) => this.dispatch(event, userId)

  private async deliverToIntegration(
    integrationId: string,
    event: IntegrationDispatchPayload,
  ): Promise<IntegrationSendResult> {
    const integration = await this.findOne(integrationId)
    const config = (integration.config ?? {}) as Record<string, unknown>
    const live = this.isLiveMode()

    switch (integrationId) {
      case 'slack':
        return sendSlack(config, event, live)
      case 'pagerduty':
        return sendPagerDuty(config, event, live)
      case 'jira':
        return sendJira(config, event, live)
      default:
        await new Promise((r) => setTimeout(r, 30))
        return {
          status: live ? 'failed' : 'simulated',
          latencyMs: 30,
          error: live ? `Provider not implemented for ${integrationId}` : undefined,
          responsePreview: `${integration.label}: event logged`,
        }
    }
  }

  private async recordDelivery(
    integrationId: string,
    eventType: string,
    result: IntegrationSendResult,
    event: IntegrationDispatchPayload,
  ) {
    return this.prisma.integrationDelivery.create({
      data: {
        integrationId,
        eventType,
        title: event.title,
        body: event.body,
        status: result.status,
        httpStatus: result.httpStatus,
        latencyMs: result.latencyMs,
        error: result.error,
        payload: { ...event, responsePreview: result.responsePreview } as Prisma.InputJsonValue,
      },
    })
  }

  private async ensureDefaults() {
    for (const def of DEFAULT_INTEGRATIONS) {
      const existing = await this.prisma.integrationConfig.findUnique({ where: { id: def.id } })
      if (existing) continue
      await this.prisma.integrationConfig.create({
        data: {
          id: def.id,
          label: def.label,
          category: def.category,
          enabled: def.id === 'slack' || def.id === 'pagerduty',
          status: def.id === 'slack' || def.id === 'pagerduty' ? 'connected' : 'disconnected',
          config: def.config as Prisma.InputJsonValue,
          events: def.events as Prisma.InputJsonValue,
          lastSync: def.id === 'slack' || def.id === 'pagerduty' ? new Date() : null,
        },
      })
    }
  }
}
