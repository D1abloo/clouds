import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { CopilotAiProvider, CopilotScopeMode, MembershipRole, OrganizationAiSettings } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { OrganizationScopeService } from '../../common/organization/organization-scope.service'
import { SecretsVaultService } from '../cloud-accounts/secrets-vault.service'
import { UpdateCopilotSettingsDto } from './dto/update-copilot-settings.dto'

export type CopilotSettingsView = {
  enabled: boolean
  provider: CopilotAiProvider
  model: string
  apiKeyHint: string | null
  hasApiKey: boolean
  scopeMode: CopilotScopeMode
  allowAutonomous: boolean
  allowLaunch: boolean
  maxTokens: number
  temperature: number
  systemPrompt: string | null
  updatedAt: string
}

const ADMIN_ROLES: MembershipRole[] = ['OWNER', 'ADMIN']

const maskApiKeyHint = (key: string): string => {
  const trimmed = key.trim()
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`
}

const toView = (row: OrganizationAiSettings): CopilotSettingsView => ({
  enabled: row.enabled,
  provider: row.provider,
  model: row.model,
  apiKeyHint: row.apiKeyHint,
  hasApiKey: Boolean(row.apiKeySecretRef),
  scopeMode: row.scopeMode,
  allowAutonomous: row.allowAutonomous,
  allowLaunch: row.allowLaunch,
  maxTokens: row.maxTokens,
  temperature: row.temperature,
  systemPrompt: row.systemPrompt,
  updatedAt: row.updatedAt.toISOString(),
})

@Injectable()
export class CopilotSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgScope: OrganizationScopeService,
    private readonly vault: SecretsVaultService,
  ) {}

  async resolveOrganizationId(userId: string): Promise<string> {
    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { organizationId: true },
    })
    if (!membership) {
      await this.orgScope.ensurePersonalWorkspace(userId)
      const created = await this.prisma.membership.findFirst({
        where: { userId },
        select: { organizationId: true },
      })
      if (!created) throw new NotFoundException('Organización no encontrada')
      return created.organizationId
    }
    return membership.organizationId
  }

  async assertOrgAdmin(userId: string): Promise<string> {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, role: { in: ADMIN_ROLES } },
      orderBy: { createdAt: 'asc' },
      select: { organizationId: true },
    })
    if (!membership) {
      throw new ForbiddenException('Solo administradores pueden configurar el Copilot')
    }
    return membership.organizationId
  }

  async getSettingsForUser(userId: string): Promise<CopilotSettingsView> {
    const organizationId = await this.assertOrgAdmin(userId)
    const row = await this.ensureSettingsRow(organizationId)
    return toView(row)
  }

  async updateSettings(userId: string, dto: UpdateCopilotSettingsDto): Promise<CopilotSettingsView> {
    const organizationId = await this.assertOrgAdmin(userId)
    await this.ensureSettingsRow(organizationId)

    const data: Partial<OrganizationAiSettings> = {}
    if (dto.enabled !== undefined) data.enabled = dto.enabled
    if (dto.provider !== undefined) data.provider = dto.provider
    if (dto.model !== undefined) data.model = dto.model.trim()
    if (dto.scopeMode !== undefined) data.scopeMode = dto.scopeMode
    if (dto.allowAutonomous !== undefined) data.allowAutonomous = dto.allowAutonomous
    if (dto.allowLaunch !== undefined) data.allowLaunch = dto.allowLaunch
    if (dto.maxTokens !== undefined) data.maxTokens = dto.maxTokens
    if (dto.temperature !== undefined) data.temperature = dto.temperature
    if (dto.systemPrompt !== undefined) data.systemPrompt = dto.systemPrompt.trim() || null

    if (dto.apiKey?.trim()) {
      const key = dto.apiKey.trim()
      data.apiKeySecretRef = this.vault.storeSecrets({ apiKey: key })
      data.apiKeyHint = maskApiKeyHint(key)
    }

    const row = await this.prisma.organizationAiSettings.update({
      where: { organizationId },
      data,
    })
    return toView(row)
  }

  async getApiKey(organizationId: string): Promise<string | null> {
    const row = await this.prisma.organizationAiSettings.findUnique({
      where: { organizationId },
    })
    if (!row?.apiKeySecretRef) return null
    const secrets = this.vault.readSecrets(row.apiKeySecretRef)
    return secrets.apiKey ?? null
  }

  async getSettingsRow(organizationId: string): Promise<OrganizationAiSettings> {
    return this.ensureSettingsRow(organizationId)
  }

  private async ensureSettingsRow(organizationId: string): Promise<OrganizationAiSettings> {
    const existing = await this.prisma.organizationAiSettings.findUnique({
      where: { organizationId },
    })
    if (existing) return existing
    return this.prisma.organizationAiSettings.create({
      data: { organizationId },
    })
  }
}
