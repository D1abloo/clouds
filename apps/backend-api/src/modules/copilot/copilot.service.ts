import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { CopilotTaskStatus } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { CopilotActionsService } from './copilot-actions.service'
import { CopilotChatDto } from './dto/copilot-chat.dto'
import { CopilotContextService } from './copilot-context.service'
import { CopilotLlmService } from './copilot-llm.service'
import { CopilotSettingsService } from './copilot-settings.service'

export type CopilotStatusDto = {
  configured: boolean
  enabled: boolean
  hasApiKey: boolean
  provider: string | null
  model: string | null
  allowAutonomous: boolean
  allowLaunch: boolean
  mode: 'llm' | 'fallback'
  context: {
    domains: ReturnType<CopilotContextService['toSidebarDomains']>
    healthScore: number
    instancesTotal: number
  }
}

export type CopilotLaunchStepDto = {
  order: number
  label: string
  detail: string
}

export type CopilotChatResponseDto = {
  threadId: string
  message: string
  mode: 'llm' | 'fallback'
  provider?: string
  model?: string
  actionsExecuted?: number
  actionErrors?: string[]
  launchSteps?: CopilotLaunchStepDto[]
}

@Injectable()
export class CopilotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: CopilotSettingsService,
    private readonly llm: CopilotLlmService,
    private readonly actions: CopilotActionsService,
    private readonly context: CopilotContextService,
  ) {}

  async getStatus(userId: string): Promise<CopilotStatusDto> {
    const organizationId = await this.settings.resolveOrganizationId(userId)
    const row = await this.settings.getSettingsRow(organizationId)
    const platformCtx = await this.context.gatherForUser(userId)
    const hasApiKey = Boolean(row.apiKeySecretRef)
    const configured = hasApiKey && row.enabled
    return {
      configured,
      enabled: row.enabled,
      hasApiKey,
      provider: row.provider,
      model: row.model,
      allowAutonomous: row.allowAutonomous,
      allowLaunch: row.allowLaunch,
      mode: configured ? 'llm' : 'fallback',
      context: {
        domains: this.context.toSidebarDomains(platformCtx),
        healthScore: platformCtx.healthScore,
        instancesTotal: platformCtx.instances.total,
      },
    }
  }

  async chat(userId: string, dto: CopilotChatDto): Promise<CopilotChatResponseDto> {
    const organizationId = await this.settings.resolveOrganizationId(userId)
    const settingsRow = await this.settings.getSettingsRow(organizationId)

    let threadId = dto.threadId
    if (threadId) {
      const thread = await this.prisma.assistantThread.findFirst({
        where: { id: threadId, userId },
      })
      if (!thread) throw new NotFoundException('Conversación no encontrada')
    } else {
      const thread = await this.prisma.assistantThread.create({
        data: { userId, title: dto.message.slice(0, 80) },
      })
      threadId = thread.id
    }

    await this.prisma.assistantMessage.create({
      data: { threadId, role: 'user', content: dto.message },
    })

    const historyRows = await this.prisma.assistantMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })
    const history = historyRows.slice(0, -1).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const platformCtx = await this.context.gatherForUser(userId)
    const llmResult = await this.llm.chat(userId, organizationId, settingsRow, dto.message, history)
    let actionResult = await this.actions.executeFromResponse(
      llmResult.content,
      settingsRow,
      userId,
      platformCtx,
    )
    if (!actionResult.executed.length && settingsRow.allowLaunch) {
      const intentAction = this.actions.buildLaunchFromIntent(dto.message, platformCtx)
      if (intentAction) {
        const steps = this.actions.buildLaunchSteps(intentAction, platformCtx)
        const planMessage = this.actions.formatLaunchPlanMessage(steps)
        actionResult = await this.actions.executeFromResponse(
          `\`\`\`copilot_action\n${JSON.stringify(intentAction)}\n\`\`\``,
          settingsRow,
          userId,
          platformCtx,
          { action: intentAction, steps },
        )
        actionResult.launchPlanMessage = planMessage
        actionResult.launchSteps = steps
      }
    }

    let finalMessage = actionResult.cleanedContent
    if (actionResult.launchPlanMessage) {
      finalMessage = actionResult.launchPlanMessage + (finalMessage ? `\n\n${finalMessage}` : '')
    }
    if (actionResult.executed.length) {
      finalMessage += `\n\n✅ **Acciones ejecutadas:** ${actionResult.executed.length}`
    }
    if (actionResult.errors.length) {
      finalMessage += `\n\n⚠️ **Errores en acciones:** ${actionResult.errors.map((e) => e.error).join('; ')}`
    }

    await this.prisma.assistantMessage.create({
      data: { threadId, role: 'assistant', content: finalMessage },
    })

    return {
      threadId,
      message: finalMessage,
      mode: llmResult.mode,
      provider: llmResult.provider,
      model: llmResult.model,
      actionsExecuted: actionResult.executed.length,
      actionErrors: actionResult.errors.map((e) => e.error),
      launchSteps: actionResult.launchSteps,
    }
  }

  async createAutonomousTask(userId: string, prompt: string) {
    const organizationId = await this.settings.resolveOrganizationId(userId)
    const settingsRow = await this.settings.getSettingsRow(organizationId)

    if (!settingsRow.allowAutonomous) {
      throw new ForbiddenException('Las tareas autónomas están desactivadas para esta organización')
    }

    const task = await this.prisma.copilotAutonomousTask.create({
      data: {
        organizationId,
        userId,
        prompt,
        status: 'PENDING',
      },
    })

    void this.runAutonomousTask(task.id, userId, organizationId, prompt, settingsRow)

    return this.toTaskView(task)
  }

  async listTasks(userId: string) {
    const organizationId = await this.settings.resolveOrganizationId(userId)
    const rows = await this.prisma.copilotAutonomousTask.findMany({
      where: { organizationId, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return rows.map((r) => this.toTaskView(r))
  }

  private async runAutonomousTask(
    taskId: string,
    userId: string,
    organizationId: string,
    prompt: string,
    settingsRow: Awaited<ReturnType<CopilotSettingsService['getSettingsRow']>>,
  ): Promise<void> {
    await this.prisma.copilotAutonomousTask.update({
      where: { id: taskId },
      data: { status: 'RUNNING' },
    })

    try {
      const platformCtx = await this.context.gatherForUser(userId)
      const llmResult = await this.llm.chat(userId, organizationId, settingsRow, prompt, [])
      let actionResult = await this.actions.executeFromResponse(
        llmResult.content,
        settingsRow,
        userId,
        platformCtx,
      )
      if (!actionResult.executed.length && settingsRow.allowLaunch) {
        const intentAction = this.actions.buildLaunchFromIntent(prompt, platformCtx)
        if (intentAction) {
          actionResult = await this.actions.executeFromResponse(
            `\`\`\`copilot_action\n${JSON.stringify(intentAction)}\n\`\`\``,
            settingsRow,
            userId,
            platformCtx,
          )
        }
      }

      await this.prisma.copilotAutonomousTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          result: actionResult.cleanedContent,
          actions: [...actionResult.executed, ...actionResult.skipped] as object,
        },
      })
    } catch (err) {
      await this.prisma.copilotAutonomousTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          result: (err as Error).message,
        },
      })
    }
  }

  private toTaskView(row: {
    id: string
    prompt: string
    status: CopilotTaskStatus
    result: string | null
    actions: unknown
    createdAt: Date
    updatedAt: Date
  }) {
    return {
      id: row.id,
      prompt: row.prompt,
      status: row.status,
      result: row.result,
      actions: row.actions,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }
}
