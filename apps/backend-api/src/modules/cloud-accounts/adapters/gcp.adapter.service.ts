import { Injectable } from '@nestjs/common'
import { CloudProvider } from '@prisma/client'
import { BaseCloudAdapter } from './base-cloud.adapter'
import { CloudInstance, CloudRegion, CredentialValidationResult } from './cloud-provider.adapter'

@Injectable()
export class GcpAdapterService extends BaseCloudAdapter {
  // TODO: Integrate @google-cloud/compute with Service Account / OIDC

  async validateCredentials(): Promise<CredentialValidationResult> {
    return { valid: true, message: 'Mock GCP credentials validated (integrate Google Cloud SDK)' }
  }

  async listRegions(): Promise<CloudRegion[]> {
    return [
      { id: 'us-central1', name: 'Iowa', provider: CloudProvider.GCP },
      { id: 'europe-west1', name: 'Belgium', provider: CloudProvider.GCP },
    ]
  }

  async listInstances(region?: string): Promise<CloudInstance[]> {
    const instances: CloudInstance[] = [
      {
        id: 'gcp-mock-001',
        name: 'gcp-app-01',
        region: 'us-central1',
        status: 'RUNNING' as CloudInstance['status'],
        instanceType: 'e2-medium',
        provider: CloudProvider.GCP,
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
    console.log(`[GCP Mock] Starting instance ${instanceId}`)
  }

  async stopInstance(instanceId: string, _region?: string): Promise<void> {
    console.log(`[GCP Mock] Stopping instance ${instanceId}`)
  }

  async restartInstance(instanceId: string, _region?: string): Promise<void> {
    console.log(`[GCP Mock] Restarting instance ${instanceId}`)
  }

  async syncInventory(): Promise<CloudInstance[]> {
    return this.listInstances()
  }
}
