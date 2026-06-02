import { Injectable } from '@nestjs/common'
import { CloudProvider } from '@prisma/client'
import { BaseCloudAdapter } from './base-cloud.adapter'
import { CloudInstance, CloudRegion, CredentialValidationResult } from './cloud-provider.adapter'

const MOCK_REGIONS: CloudRegion[] = [
  { id: 'us-east-1', name: 'US East (N. Virginia)', provider: CloudProvider.AWS },
  { id: 'eu-west-1', name: 'Europe (Ireland)', provider: CloudProvider.AWS },
]

const MOCK_INSTANCES: CloudInstance[] = [
  {
    id: 'i-mock001',
    name: 'web-server-01',
    region: 'us-east-1',
    status: 'RUNNING' as CloudInstance['status'],
    instanceType: 't3.medium',
    provider: CloudProvider.AWS,
  },
  {
    id: 'i-mock002',
    name: 'db-server-01',
    region: 'eu-west-1',
    status: 'STOPPED' as CloudInstance['status'],
    instanceType: 't3.large',
    provider: CloudProvider.AWS,
  },
]

@Injectable()
export class AwsAdapterService extends BaseCloudAdapter {
  // TODO: Integrate AWS SDK (@aws-sdk/client-ec2) with IAM Role / Access Key / OIDC

  async validateCredentials(): Promise<CredentialValidationResult> {
    return { valid: true, message: 'Mock AWS credentials validated (integrate AWS SDK)' }
  }

  async listRegions(): Promise<CloudRegion[]> {
    return MOCK_REGIONS
  }

  async listInstances(region?: string): Promise<CloudInstance[]> {
    if (region) return MOCK_INSTANCES.filter((i) => i.region === region)
    return MOCK_INSTANCES
  }

  async getInstance(instanceId: string, region?: string): Promise<CloudInstance | null> {
    return MOCK_INSTANCES.find((i) => i.id === instanceId && (!region || i.region === region)) ?? null
  }

  async startInstance(instanceId: string, _region?: string): Promise<void> {
    // TODO: ec2.startInstances
    console.log(`[AWS Mock] Starting instance ${instanceId}`)
  }

  async stopInstance(instanceId: string, _region?: string): Promise<void> {
    console.log(`[AWS Mock] Stopping instance ${instanceId}`)
  }

  async restartInstance(instanceId: string, _region?: string): Promise<void> {
    console.log(`[AWS Mock] Restarting instance ${instanceId}`)
  }

  async syncInventory(): Promise<CloudInstance[]> {
    return this.listInstances()
  }
}
