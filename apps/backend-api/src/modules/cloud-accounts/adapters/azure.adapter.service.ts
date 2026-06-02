import { Injectable } from '@nestjs/common'
import { CloudProvider } from '@prisma/client'
import { BaseCloudAdapter } from './base-cloud.adapter'
import { CloudInstance, CloudRegion, CredentialValidationResult } from './cloud-provider.adapter'

@Injectable()
export class AzureAdapterService extends BaseCloudAdapter {
  // TODO: Integrate @azure/arm-compute with Service Principal / Managed Identity / OIDC

  async validateCredentials(): Promise<CredentialValidationResult> {
    return { valid: true, message: 'Mock Azure credentials validated (integrate Azure SDK)' }
  }

  async listRegions(): Promise<CloudRegion[]> {
    return [
      { id: 'eastus', name: 'East US', provider: CloudProvider.AZURE },
      { id: 'westeurope', name: 'West Europe', provider: CloudProvider.AZURE },
    ]
  }

  async listInstances(region?: string): Promise<CloudInstance[]> {
    const instances: CloudInstance[] = [
      {
        id: 'azure-mock-001',
        name: 'azure-vm-01',
        region: 'eastus',
        status: 'RUNNING' as CloudInstance['status'],
        instanceType: 'Standard_B2s',
        provider: CloudProvider.AZURE,
      },
    ]
    if (region) return instances.filter((i) => i.region === region)
    return instances
  }

  async getInstance(instanceId: string): Promise<CloudInstance | null> {
    const all = await this.listInstances()
    return all.find((i) => i.id === instanceId) ?? null
  }

  async startInstance(instanceId: string, _region?: string): Promise<void> {
    console.log(`[Azure Mock] Starting instance ${instanceId}`)
  }

  async stopInstance(instanceId: string, _region?: string): Promise<void> {
    console.log(`[Azure Mock] Stopping instance ${instanceId}`)
  }

  async restartInstance(instanceId: string, _region?: string): Promise<void> {
    console.log(`[Azure Mock] Restarting instance ${instanceId}`)
  }

  async syncInventory(): Promise<CloudInstance[]> {
    return this.listInstances()
  }
}
