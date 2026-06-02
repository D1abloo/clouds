import { CloudProviderAdapter, CloudInstance, CloudRegion, CredentialValidationResult } from './cloud-provider.adapter'

export abstract class BaseCloudAdapter implements CloudProviderAdapter {
  abstract validateCredentials(): Promise<CredentialValidationResult>
  abstract listRegions(): Promise<CloudRegion[]>
  abstract listInstances(region?: string): Promise<CloudInstance[]>
  abstract getInstance(instanceId: string, region?: string): Promise<CloudInstance | null>
  abstract startInstance(instanceId: string, region?: string): Promise<void>
  abstract stopInstance(instanceId: string, region?: string): Promise<void>
  abstract restartInstance(instanceId: string, region?: string): Promise<void>
  abstract syncInventory(): Promise<CloudInstance[]>
}
