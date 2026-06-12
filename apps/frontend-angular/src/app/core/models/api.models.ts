export type CloudProvider = 'AWS' | 'GCP' | 'AZURE' | 'CLOUDING' | 'VPS'

export type ResourceStatus =
  | 'running'
  | 'stopped'
  | 'pending'
  | 'applied'
  | 'error'
  | 'warning'
  | 'unknown'

export interface AuthUser {
  id: string
  email: string
  name: string
  roles: string[]
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export interface CloudAccount {
  id: string
  name: string
  provider: CloudProvider
  accountId?: string
  projectId?: string
  defaultRegion?: string
  hasCredentials?: boolean
  credentialType?: string
  syncStatus?: string
  lastSyncedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface Instance {
  id: string
  name: string
  provider: CloudProvider | string
  externalId?: string
  region?: string
  status?: string
  instanceType?: string
  cloudAccountId?: string
  cloudAccount?: { id?: string; name?: string; provider?: string }
  publicIp?: string
  privateIp?: string
  os?: string
  environment?: string
  health?: string
  isDemo?: boolean
  isVps?: boolean
  cpuCores?: number
  ramGb?: number
  diskGb?: number
  monthlyCost?: number
  mtdCost?: number
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface VpsHost {
  id: string
  name: string
  host: string
  port?: number
  status?: string
  projectId?: string
}

export interface DashboardStats {
  totalInstances?: number
  runningInstances?: number
  cloudAccounts?: number
  vpsHosts?: number
  alertsOpen?: number
  monthlySpend?: number
  [key: string]: unknown
}

export interface AlertItem {
  id: string
  title: string
  severity: string
  status: string
  createdAt: string
  resource?: string
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface AuditLog {
  id: string
  action: string
  resource: string
  userId?: string
  ipAddress?: string
  createdAt: string
}

export interface BillingSummary {
  totalCost?: number
  totalMonthly?: number
  currency?: string
  byProvider?: Record<string, number>
  period?: string
  daily?: number
  weekly?: number
  forecastMonthly?: number
  varianceVsPreviousMonth?: number
}

export interface JenkinsServer {
  id: string
  name: string
  url: string
  status?: string
}

export interface TerraformRun {
  id: string
  status: string
  provider?: CloudProvider
  createdAt?: string
}

export interface TerraformTemplate {
  id: string
  name: string
  provider: CloudProvider
  config?: Record<string, unknown>
}

export interface PaginatedMeta {
  total?: number
  page?: number
  limit?: number
}

export interface IntegrationConfigDto {
  id: string
  label: string
  category: string
  enabled: boolean
  status: string
  config: Record<string, unknown>
  events: string[]
  lastSync: string | null
  createdAt: string
  updatedAt: string
  events24h?: number
  connectRoute?: string | null
  kind?: 'platform' | 'webhook'
  accountConnected?: boolean
  accountSummary?: string
}

export interface IntegrationsStatusDto {
  demoMode: boolean
  liveMode: boolean
  deliveryMode: 'live' | 'simulated'
  enabledCount: number
  message: string
  coreIntegrations: string[]
}

export interface IntegrationDeliveryDto {
  id: string
  integrationId: string
  eventType: string
  title: string
  body: string
  status: 'sent' | 'simulated' | 'failed' | 'routed' | 'logged'
  httpStatus: number | null
  latencyMs: number | null
  error: string | null
  createdAt: string
  integration?: { id: string; label: string }
}

export interface IntegrationTestResultDto {
  integration: IntegrationConfigDto
  result: { status: string; httpStatus?: number; latencyMs?: number; error?: string }
  liveMode: boolean
}

export interface IntegrationPlatformSourceDto {
  id: string
  label: string
  module: string
  events: string[]
  route?: string
  connectRoute?: string
  connected?: boolean
  summary?: string
}

export interface IntegrationSourcesResponseDto {
  sources: IntegrationPlatformSourceDto[]
}

export type CopilotAiProvider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'OPENROUTER'
export type CopilotScopeMode = 'PANEL_ONLY'
export type CopilotTaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface CopilotContextDomain {
  id: string
  label: string
  icon: string
  count: string
  hint: string
}

export interface CopilotStatus {
  configured: boolean
  enabled: boolean
  hasApiKey: boolean
  provider: CopilotAiProvider | null
  model: string | null
  allowAutonomous: boolean
  allowLaunch: boolean
  mode: 'llm' | 'fallback'
  context: {
    domains: CopilotContextDomain[]
    healthScore: number
    instancesTotal: number
  }
}

export interface CopilotSettings {
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

export interface UpdateCopilotSettingsPayload {
  enabled?: boolean
  provider?: CopilotAiProvider
  model?: string
  apiKey?: string
  scopeMode?: CopilotScopeMode
  allowAutonomous?: boolean
  allowLaunch?: boolean
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

export interface CopilotLaunchStep {
  order: number
  label: string
  detail: string
}

export interface CopilotChatResponse {
  threadId: string
  message: string
  mode: 'llm' | 'fallback'
  provider?: string
  model?: string
  actionsExecuted?: number
  actionErrors?: string[]
  launchSteps?: CopilotLaunchStep[]
}

export interface CopilotTask {
  id: string
  prompt: string
  status: CopilotTaskStatus
  result: string | null
  actions: unknown
  createdAt: string
  updatedAt: string
}
