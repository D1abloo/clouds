export type CommandCenterActionType =
  | 'restart-instance'
  | 'scale-deployment'
  | 'terraform-plan'
  | 'jenkins-build'
  | 'vps-backup'
  | 'sync-inventory'

export interface ExecuteActionPayload {
  type: CommandCenterActionType
  resource?: string
  region?: string
  namespace?: string
  replicas?: number
  provider?: string
  cloudAccountId?: string
  jenkinsServerId?: string
  jobName?: string
}

export interface CommandCenterActionResult {
  ok: true
  type: CommandCenterActionType
  resource: string
  message: string
  destinationRoute: string
  destinationLabel: string
  metadata?: Record<string, unknown>
}

export interface CommandCenterPlatformStatApi {
  logo: string
  label: string
  provider: string
  tasks: number
  successRate: number
  lastAction: string
  connected: boolean
}

export interface CommandCenterRecentApiRow {
  id: string
  action: string
  resource: string
  provider: string
  region: string
  status: string
  actor: string
  when: string
  detail: string
  destinationRoute: string
  destinationLabel: string
}
