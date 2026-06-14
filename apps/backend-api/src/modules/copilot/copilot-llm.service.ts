import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { CopilotAiProvider, OrganizationAiSettings } from '@prisma/client'
import { CopilotContextService, CopilotPlatformContext } from './copilot-context.service'
import { CopilotSettingsService } from './copilot-settings.service'

export type LlmChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type LlmChatResult = {
  content: string
  mode: 'llm' | 'fallback'
  provider?: CopilotAiProvider
  model?: string
}

const DEFAULT_SYSTEM_PROMPT = `Eres CloudOps Copilot, asistente de operaciones en español para la plataforma Spendlyx/CloudOps.

REGLAS ESTRICTAS:
- Solo respondes sobre infraestructura, nubes, instancias, costes, alertas, despliegues, Kubernetes, Jenkins, Terraform y configuración del panel.
- Si la pregunta no es sobre operaciones o infraestructura del panel, responde amablemente que solo puedes ayudar con temas de la plataforma.
- Usa los datos de contexto proporcionados; no inventes recursos que no aparezcan en el contexto.
- Puedes orientar al usuario por todas las rutas y capacidades del panel incluidas en "Capacidades del panel y rutas".
- Debes ayudar con lanzamientos, estado de instancias, VPS por SSH, facturas, FinOps, logs, Jenkins, seguridad y cualquier módulo listado en el contexto.
- Responde siempre en español, con formato claro (listas, negritas con **texto**).
- Para lanzar instancias (solo si está permitido), incluye un bloque \`\`\`copilot_action con JSON: {"type":"launch_instance","accountId":"...","name":"...","region":"...","instanceType":"...","imageId":"..."}
- Sé conciso y accionable.`

const PROVIDER_BASE_URL: Record<CopilotAiProvider, string> = {
  OPENAI: 'https://api.openai.com/v1',
  OPENROUTER: 'https://openrouter.ai/api/v1',
  ANTHROPIC: 'https://openrouter.ai/api/v1',
  GOOGLE: 'https://openrouter.ai/api/v1',
}

const DEFAULT_MODELS: Record<CopilotAiProvider, string> = {
  OPENAI: 'gpt-4o-mini',
  OPENROUTER: 'openai/gpt-4o-mini',
  ANTHROPIC: 'anthropic/claude-3.5-sonnet',
  GOOGLE: 'google/gemini-flash-1.5',
}

@Injectable()
export class CopilotLlmService {
  private readonly logger = new Logger(CopilotLlmService.name)

  constructor(
    private readonly settings: CopilotSettingsService,
    private readonly context: CopilotContextService,
  ) {}

  async chat(
    userId: string,
    organizationId: string,
    settings: OrganizationAiSettings,
    userMessage: string,
    history: LlmChatMessage[] = [],
  ): Promise<LlmChatResult> {
    const platformCtx = await this.context.gatherForUser(userId)
    const apiKey = await this.settings.getApiKey(organizationId)

    if (!apiKey || !settings.enabled) {
      return {
        content: this.fallbackResponse(userMessage, platformCtx, settings),
        mode: 'fallback',
      }
    }

    try {
      const content = await this.callLlm(apiKey, settings, platformCtx, userMessage, history)
      return {
        content,
        mode: 'llm',
        provider: settings.provider,
        model: settings.model || DEFAULT_MODELS[settings.provider],
      }
    } catch (err) {
      this.logger.warn(`LLM error, using fallback: ${(err as Error).message}`)
      return {
        content: `${this.fallbackResponse(userMessage, platformCtx, settings)}\n\n_Nota: no se pudo contactar con el proveedor LLM; respuesta generada con datos del panel._`,
        mode: 'fallback',
        provider: settings.provider,
        model: settings.model,
      }
    }
  }

  async testConnection(organizationId: string, settings: OrganizationAiSettings): Promise<{ ok: boolean; message: string }> {
    const apiKey = await this.settings.getApiKey(organizationId)
    if (!apiKey) {
      throw new BadRequestException('No hay clave API configurada')
    }
    const content = await this.callLlm(
      apiKey,
      settings,
      {
        organizationName: 'Test',
        instances: { total: 0, running: 0, stopped: 0, warning: 0 },
        cloudAccounts: { aws: 0, gcp: 0, azure: 0, clouding: 0, total: 0 },
        cloudAccountList: [],
        alerts: { open: 0, critical: 0, warning: 0 },
        billing: { monthlySpend: 0, currency: 'EUR' },
        vpsHosts: 0,
        kubernetesClusters: 0,
        jenkinsServers: 0,
        terraformWorkspaces: 0,
        recentInstances: [],
        vpsList: [],
        jenkinsList: [],
        panelRoutes: [],
        healthScore: 100,
      },
      'Responde solo: OK',
      [],
    )
    return { ok: Boolean(content?.trim()), message: 'Conexión con el proveedor LLM verificada correctamente' }
  }

  private async callLlm(
    apiKey: string,
    settings: OrganizationAiSettings,
    platformCtx: CopilotPlatformContext,
    userMessage: string,
    history: LlmChatMessage[],
  ): Promise<string> {
    const baseUrl = PROVIDER_BASE_URL[settings.provider]
    const model = settings.model?.trim() || DEFAULT_MODELS[settings.provider]
    const systemContent = [
      settings.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT,
      '',
      '--- CONTEXTO EN VIVO DEL PANEL ---',
      this.context.formatContextForPrompt(platformCtx),
    ].join('\n')

    const messages: LlmChatMessage[] = [
      { role: 'system', content: systemContent },
      ...history.filter((m) => m.role !== 'system'),
      { role: 'user', content: userMessage },
    ]

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }
    if (settings.provider === 'OPENROUTER' || settings.provider === 'ANTHROPIC' || settings.provider === 'GOOGLE') {
      headers['HTTP-Referer'] = 'https://spendlyx.com'
      headers['X-Title'] = 'Spendlyx CloudOps Copilot'
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: settings.maxTokens,
        temperature: settings.temperature,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new BadRequestException(`Proveedor LLM respondió ${res.status}: ${body.slice(0, 200)}`)
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    return json.choices?.[0]?.message?.content?.trim() ?? 'Sin respuesta del modelo.'
  }

  private fallbackResponse(
    question: string,
    ctx: CopilotPlatformContext,
    settings: OrganizationAiSettings,
  ): string {
    const q = question.toLowerCase()

    if (q.includes('instancia') || q.includes('ec2') || q.includes('servidor')) {
      const list = ctx.recentInstances.length
        ? ctx.recentInstances.map((i) => `• **${i.name}** (${i.provider}, ${i.region}) — ${i.status}`).join('\n')
        : '• No hay instancias registradas todavía.'
      return `**Inventario de instancias** (${ctx.organizationName}):\n\n${list}\n\n**Resumen:** ${ctx.instances.running} en ejecución · ${ctx.instances.stopped} detenidas · ${ctx.instances.warning} con aviso.`
    }

    if (q.includes('vps') || q.includes('ssh')) {
      const list = ctx.vpsList.length
        ? ctx.vpsList.map((v) => `• **${v.name}** — ${v.username}@${v.hostname} · ${v.status}`).join('\n')
        : '• No hay VPS registrados por SSH todavía.'
      return `**Servidores VPS por SSH**\n\n${list}\n\nAlta esperada: servidor, usuario y contraseña desde **VPS → Servidores** o **Infraestructura → VPS**.`
    }

    if (q.includes('jenkins') || q.includes('pipeline') || q.includes('desplieg')) {
      const list = ctx.jenkinsList.length
        ? ctx.jenkinsList.map((j) => `• **${j.name}** — ${j.url}`).join('\n')
        : '• No hay controladores Jenkins conectados.'
      return `**Jenkins y despliegues**\n\n${list}\n\nDesde **Jenkins → Jobs** puedes conectar un controlador, listar jobs y encolar builds reales con parámetros.`
    }

    if (q.includes('alerta') || q.includes('incidente')) {
      return `**Alertas abiertas:** ${ctx.alerts.open}\n• Críticas: **${ctx.alerts.critical}**\n• Advertencias: **${ctx.alerts.warning}**\n\nRevisa el módulo Alertas para priorizar acciones.`
    }

    if (q.includes('coste') || q.includes('costo') || q.includes('factur') || q.includes('gasto')) {
      return `**Gasto estimado MTD:** **${ctx.billing.monthlySpend.toFixed(2)} ${ctx.billing.currency}**\n\nCuentas cloud conectadas: ${ctx.cloudAccounts.total} (AWS ${ctx.cloudAccounts.aws}, GCP ${ctx.cloudAccounts.gcp}, Azure ${ctx.cloudAccounts.azure}).`
    }

    if (q.includes('opciones') || q.includes('panel') || q.includes('ruta') || q.includes('módulo') || q.includes('modulo')) {
      return `**Opciones del panel disponibles para asistirte:**\n\n${ctx.panelRoutes
        .map((r) => `• **${r.area}** — ${r.capability} (${r.route})`)
        .join('\n')}`
    }

    if (q.includes('cuenta') || q.includes('cloud') || q.includes('aws') || q.includes('gcp')) {
      return `**Cuentas cloud conectadas:**\n• AWS: **${ctx.cloudAccounts.aws}**\n• GCP: **${ctx.cloudAccounts.gcp}**\n• Azure: **${ctx.cloudAccounts.azure}**\n• Clouding: **${ctx.cloudAccounts.clouding}**`
    }

    if (q.includes('lanzar') || q.includes('crear instancia') || q.includes('deploy')) {
      if (!settings.allowLaunch) {
        return 'El lanzamiento automático de instancias está **desactivado**. Un administrador puede habilitarlo en **Configuración → Copilot IA**.'
      }
      return 'Para lanzar una instancia, indica proveedor, región, tipo y nombre. Ejemplo: "Lanza una instancia t3.micro en eu-west-1 llamada web-01".'
    }

    return `**CloudOps Copilot** (modo asistido con datos del panel)\n\n${this.context.formatContextForPrompt(ctx)}\n\nPregunta sobre instancias, alertas, costes o cuentas cloud. Para respuestas con LLM, configura una clave API en Configuración → Copilot IA.`
  }
}
