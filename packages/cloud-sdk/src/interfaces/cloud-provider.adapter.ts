import { CloudProvider, InstanceStatus } from '@cloudops/shared'

export interface CloudRegion {
  id: string
  name: string
  provider: CloudProvider
}

export interface CloudInstance {
  id: string
  name: string
  region: string
  status: InstanceStatus
  instanceType: string
  provider: CloudProvider
  metadata?: Record<string, unknown>
}

export interface CredentialValidationResult {
  valid: boolean
  message?: string
}

export interface CloudProviderAdapter {
  validateCredentials(): Promise<CredentialValidationResult>
  listRegions(): Promise<CloudRegion[]>
  listInstances(region?: string): Promise<CloudInstance[]>
  getInstance(instanceId: string, region?: string): Promise<CloudInstance | null>
  startInstance(instanceId: string, region?: string): Promise<void>
  stopInstance(instanceId: string, region?: string): Promise<void>
  restartInstance(instanceId: string, region?: string): Promise<void>
  syncInventory(): Promise<CloudInstance[]>
}
