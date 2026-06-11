import { Injectable, Logger } from '@nestjs/common'
import { OrganizationAiSettings } from '@prisma/client'
import { CloudAccountsService } from '../cloud-accounts/cloud-accounts.service'
import { LaunchInstanceDto } from '../cloud-accounts/dto/launch-instance.dto'
import { parseGcpZone } from '../cloud-accounts/adapters/sdk/adapter-sdk.util'
import { CopilotPlatformContext } from './copilot-context.service'

export type CopilotActionPayload = {
  type: string
  accountId?: string
  provider?: string
  name?: string
  region?: string
  instanceType?: string
  imageId?: string
  availabilityZone?: string
  [key: string]: unknown
}

export type CopilotLaunchStep = {
  order: number
  label: string
  detail: string
}

export type CopilotActionResult = {
  executed: CopilotActionPayload[]
  skipped: CopilotActionPayload[]
  errors: { action: CopilotActionPayload; error: string }[]
  cleanedContent: string
  launchSteps?: CopilotLaunchStep[]
  launchPlanMessage?: string
}

const ACTION_BLOCK_RE = /```copilot_action\s*([\s\S]*?)```/gi

const LAUNCH_VERBS_RE =
  /\b(lanza|lanzar|crea|crear|despliega|desplegar|provisiona|provisionar|inicia|iniciar)\b/i

const PROVIDER_ALIASES: Record<string, string> = {
  aws: 'AWS',
  amazon: 'AWS',
  gcp: 'GCP',
  google: 'GCP',
  azure: 'AZURE',
  clouding: 'CLOUDING',
}

const PROVIDER_LAUNCH_DEFAULTS: Record<
  string,
  { region: string; instanceType: string; imageId: string; availabilityZone?: string }
> = {
  AWS: {
    region: 'eu-west-1',
    instanceType: 't3.micro',
    imageId: 'ami-latest',
  },
  GCP: {
    region: 'us-central1',
    instanceType: 'e2-micro',
    imageId: 'projects/debian-cloud/global/images/family/debian-12',
    availabilityZone: 'us-central1-a',
  },
  AZURE: {
    region: 'eastus',
    instanceType: 'Standard_B1s',
    imageId: 'Ubuntu-22.04-LTS',
  },
  CLOUDING: {
    region: 'eu-central',
    instanceType: 'cld.standard-2',
    imageId: 'cld-ubuntu-22',
  },
}

@Injectable()
export class CopilotActionsService {
  private readonly logger = new Logger(CopilotActionsService.name)

  constructor(private readonly cloudAccounts: CloudAccountsService) {}

  parseActions(content: string): CopilotActionPayload[] {
    const actions: CopilotActionPayload[] = []
    let match: RegExpExecArray | null
    const re = new RegExp(ACTION_BLOCK_RE.source, 'gi')
    while ((match = re.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim()) as CopilotActionPayload
        if (parsed?.type) actions.push(parsed)
      } catch {
        this.logger.warn('Bloque copilot_action con JSON inválido')
      }
    }
    return actions
  }

  stripActionBlocks(content: string): string {
    return content.replace(ACTION_BLOCK_RE, '').trim()
  }

  buildLaunchFromIntent(
    message: string,
    ctx: CopilotPlatformContext,
  ): CopilotActionPayload | null {
    if (!LAUNCH_VERBS_RE.test(message)) return null
    if (!ctx.cloudAccountList.length) return null

    const lower = message.toLowerCase()
    let provider: string | undefined
    for (const [alias, code] of Object.entries(PROVIDER_ALIASES)) {
      if (lower.includes(alias)) {
        provider = code
        break
      }
    }

    const account =
      (provider
        ? ctx.cloudAccountList.find((a) => a.provider === provider)
        : null) ?? ctx.cloudAccountList[0]

    const defaults = PROVIDER_LAUNCH_DEFAULTS[account.provider] ?? PROVIDER_LAUNCH_DEFAULTS.AWS

    const nameMatch = message.match(
      /(?:llamad[ao]|nombre|name)\s+[`"']?([a-z0-9][a-z0-9-]{1,62})/i,
    )
    const regionMatch = message.match(
      /\b((?:eu|us|ap|sa|me|af|ca)-[a-z]+(?:-\d+)?(?:-[a-z])?|us-central1(?:-[a-z])?|europe-west\d(?:-[a-z])?|eastus|westeurope|northeurope)\b/i,
    )
    const typeMatch = message.match(
      /\b((?:t3|t2|m5|m6|c5|c6)\.[a-z0-9]+|e2-[a-z]+|Standard_[A-Z0-9_]+|cld\.[a-z0-9-]+)\b/i,
    )

    const suffix = Date.now().toString(36).slice(-4)
    const region = regionMatch?.[1] ?? account.defaultRegion ?? defaults.region

    return {
      type: 'launch_instance',
      accountId: account.id,
      provider: account.provider,
      name: nameMatch?.[1] ?? `copilot-${suffix}`,
      region,
      instanceType: typeMatch?.[1] ?? defaults.instanceType,
      imageId: defaults.imageId,
      availabilityZone: defaults.availabilityZone,
    }
  }

  buildLaunchSteps(action: CopilotActionPayload, ctx: CopilotPlatformContext): CopilotLaunchStep[] {
    const account = ctx.cloudAccountList.find((a) => a.id === this.resolveAccountId(action, ctx))
    const provider = account?.provider ?? String(action.provider ?? 'AWS')
    const defaults = PROVIDER_LAUNCH_DEFAULTS[provider] ?? PROVIDER_LAUNCH_DEFAULTS.AWS
    const dto = this.enrichLaunchDto(action, ctx, defaults)

    return [
      {
        order: 1,
        label: 'Validar imagen y región',
        detail: `image=${dto.imageId} · region=${dto.region}`,
      },
      {
        order: 2,
        label: 'Reservar capacidad compute',
        detail: `type=${dto.instanceType} · provider=${provider}`,
      },
      {
        order: 3,
        label: 'Configurar red y acceso',
        detail: dto.availabilityZone
          ? `zona=${dto.availabilityZone} · IP pública`
          : `subnet por defecto · IP pública`,
      },
      {
        order: 4,
        label: 'Provisionar instancia',
        detail: `nombre=${dto.name}`,
      },
      {
        order: 5,
        label: 'Registrar en inventario',
        detail: 'Sincronización con panel CloudOps',
      },
    ]
  }

  formatLaunchPlanMessage(steps: CopilotLaunchStep[]): string {
    const lines = steps.map((s) => `${s.order}. **${s.label}** — ${s.detail}`)
    return `**Plan de lanzamiento:**\n${lines.join('\n')}\n\n⏳ Ejecutando lanzamiento…`
  }

  async executeFromResponse(
    content: string,
    settings: OrganizationAiSettings,
    userId: string,
    ctx: CopilotPlatformContext,
    prebuiltPlan?: { action: CopilotActionPayload; steps: CopilotLaunchStep[] },
  ): Promise<CopilotActionResult> {
    const actions = prebuiltPlan ? [prebuiltPlan.action] : this.parseActions(content)
    const executed: CopilotActionPayload[] = []
    const skipped: CopilotActionPayload[] = []
    const errors: { action: CopilotActionPayload; error: string }[] = []
    let launchSteps: CopilotLaunchStep[] | undefined
    let launchPlanMessage: string | undefined

    for (const action of actions) {
      if (action.type === 'launch_instance') {
        if (!settings.allowLaunch) {
          skipped.push(action)
          continue
        }
        launchSteps = prebuiltPlan?.steps ?? this.buildLaunchSteps(action, ctx)
        launchPlanMessage = this.formatLaunchPlanMessage(launchSteps)
        try {
          await this.launchInstance(action, userId, ctx)
          executed.push(action)
        } catch (err) {
          errors.push({ action, error: (err as Error).message })
        }
        continue
      }
      skipped.push(action)
    }

    return {
      executed,
      skipped,
      errors,
      cleanedContent: this.stripActionBlocks(content),
      launchSteps,
      launchPlanMessage,
    }
  }

  private enrichLaunchDto(
    action: CopilotActionPayload,
    ctx: CopilotPlatformContext,
    defaults: (typeof PROVIDER_LAUNCH_DEFAULTS)[string],
  ): LaunchInstanceDto {
    const account = ctx.cloudAccountList.find((a) => a.id === this.resolveAccountId(action, ctx))
    const provider = account?.provider ?? String(action.provider ?? 'AWS').toUpperCase()
    const rawRegion = String(action.region ?? account?.defaultRegion ?? defaults.region)
    const rawImage = String(action.imageId ?? defaults.imageId)
    const instanceType = String(action.instanceType ?? defaults.instanceType)

    const dto: LaunchInstanceDto = {
      name: String(action.name ?? 'copilot-instance'),
      region: rawRegion,
      instanceType,
      imageId: rawImage === 'ami-latest' ? defaults.imageId : rawImage,
    }

    if (provider === 'GCP') {
      const fallback = account?.defaultRegion ?? defaults.availabilityZone ?? 'us-central1-a'
      const { region, zone } = parseGcpZone(
        String(action.availabilityZone ?? rawRegion),
        fallback,
      )
      dto.region = region
      dto.availabilityZone = zone
      if (!dto.imageId.includes('/')) {
        dto.imageId = defaults.imageId
      }
    } else if (provider === 'AWS' && dto.imageId === 'ami-latest') {
      dto.imageId = defaults.imageId
    }

    return dto
  }

  private async launchInstance(
    action: CopilotActionPayload,
    userId: string,
    ctx: CopilotPlatformContext,
  ): Promise<void> {
    const accountId = this.resolveAccountId(action, ctx)
    if (!accountId) throw new Error('No hay cuenta cloud disponible para lanzar la instancia')

    const account = ctx.cloudAccountList.find((a) => a.id === accountId)
    const provider = account?.provider ?? 'AWS'
    const defaults = PROVIDER_LAUNCH_DEFAULTS[provider] ?? PROVIDER_LAUNCH_DEFAULTS.AWS
    const dto = this.enrichLaunchDto(action, ctx, defaults)

    await this.cloudAccounts.launchInstance(accountId, dto, userId)
  }

  private resolveAccountId(action: CopilotActionPayload, ctx: CopilotPlatformContext): string {
    const explicit = String(action.accountId ?? '').trim()
    if (explicit) return explicit

    const provider = String(action.provider ?? '').toUpperCase()
    if (provider) {
      const match = ctx.cloudAccountList.find((a) => a.provider === provider)
      if (match) return match.id
    }

    return ctx.cloudAccountList[0]?.id ?? ''
  }
}
