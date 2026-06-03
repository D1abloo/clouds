import { BadRequestException, Injectable } from '@nestjs/common'
import { CloudProvider } from '@prisma/client'
import { AwsAdapterService } from './adapters/aws.adapter.service'
import { GcpAdapterService } from './adapters/gcp.adapter.service'
import { AzureAdapterService } from './adapters/azure.adapter.service'
import {
  CloudAdapterContext,
  CloudProviderAdapter,
  LaunchInstanceInput,
} from './adapters/cloud-provider.adapter'
import { CloudAdapterContextLoader } from './cloud-adapter.context'

@Injectable()
export class CloudAdapterRegistry {
  constructor(
    private readonly loader: CloudAdapterContextLoader,
    private readonly aws: AwsAdapterService,
    private readonly gcp: GcpAdapterService,
    private readonly azure: AzureAdapterService,
  ) {}

  private pick(provider: CloudProvider): CloudProviderAdapter {
    switch (provider) {
      case CloudProvider.AWS:
        return this.aws
      case CloudProvider.GCP:
        return this.gcp
      case CloudProvider.AZURE:
        return this.azure
      default:
        throw new BadRequestException('Unsupported cloud provider')
    }
  }

  async withContext<T>(accountId: string, fn: (ctx: CloudAdapterContext, adapter: CloudProviderAdapter) => Promise<T>): Promise<T> {
    const ctx = await this.loader.load(accountId)
    return fn(ctx, this.pick(ctx.provider))
  }

  validateConnection = (accountId: string) =>
    this.withContext(accountId, (ctx, a) => a.validateConnection(ctx))

  listRegions = (accountId: string) =>
    this.withContext(accountId, (ctx, a) => a.listRegions(ctx))

  listNetworks = (accountId: string, region?: string) =>
    this.withContext(accountId, (ctx, a) => a.listNetworks(ctx, region))

  listSecurityGroups = (accountId: string, region?: string) =>
    this.withContext(accountId, (ctx, a) => a.listSecurityGroups(ctx, region))

  listImages = (accountId: string, region: string) =>
    this.withContext(accountId, (ctx, a) => a.listImages(ctx, region))

  listInstanceTypes = (accountId: string, region: string) =>
    this.withContext(accountId, (ctx, a) => a.listInstanceTypes(ctx, region))

  listInstances = (accountId: string, region?: string) =>
    this.withContext(accountId, (ctx, a) => a.listInstances(ctx, region))

  getInstance = (accountId: string, instanceId: string, region?: string) =>
    this.withContext(accountId, (ctx, a) => a.getInstance(ctx, instanceId, region))

  startInstance = (accountId: string, instanceId: string, region?: string) =>
    this.withContext(accountId, (ctx, a) => a.startInstance(ctx, instanceId, region))

  stopInstance = (accountId: string, instanceId: string, region?: string) =>
    this.withContext(accountId, (ctx, a) => a.stopInstance(ctx, instanceId, region))

  restartInstance = (accountId: string, instanceId: string, region?: string) =>
    this.withContext(accountId, (ctx, a) => a.restartInstance(ctx, instanceId, region))

  launchInstance = (accountId: string, input: LaunchInstanceInput) =>
    this.withContext(accountId, (ctx, a) => a.launchInstance(ctx, input))

  syncInventory = (accountId: string) =>
    this.withContext(accountId, (ctx, a) => a.syncInventory(ctx))
}
