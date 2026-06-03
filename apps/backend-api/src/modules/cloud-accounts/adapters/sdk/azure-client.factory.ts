import { ClientSecretCredential, DefaultAzureCredential } from '@azure/identity'
import { ComputeManagementClient } from '@azure/arm-compute'
import { NetworkManagementClient } from '@azure/arm-network'
import { SubscriptionClient } from '@azure/arm-subscriptions'
import type { TokenCredential } from '@azure/core-auth'
import { CloudAdapterContext } from '../cloud-provider.adapter'

export const resolveAzureSubscriptionId = (ctx: CloudAdapterContext): string =>
  (ctx.config['subscriptionId'] as string) ||
  ctx.accountExternalId ||
  ctx.credentials['subscriptionId'] ||
  ''

export const resolveAzureCredential = (ctx: CloudAdapterContext): TokenCredential => {
  const { tenantId, clientId, clientSecret, managedIdentity } = ctx.credentials
  if (managedIdentity === 'true' || ctx.credentials['credentialType'] === 'managed_identity') {
    return new DefaultAzureCredential()
  }
  if (tenantId && clientId && clientSecret) {
    return new ClientSecretCredential(tenantId, clientId, clientSecret)
  }
  throw new Error('Azure credentials missing: Tenant ID, Client ID and Client Secret (or Managed Identity)')
}

export const createAzureComputeClient = (ctx: CloudAdapterContext): ComputeManagementClient => {
  const subscriptionId = resolveAzureSubscriptionId(ctx)
  if (!subscriptionId) throw new Error('Azure Subscription ID is required')
  return new ComputeManagementClient(resolveAzureCredential(ctx), subscriptionId)
}

export const createAzureNetworkClient = (ctx: CloudAdapterContext): NetworkManagementClient => {
  const subscriptionId = resolveAzureSubscriptionId(ctx)
  return new NetworkManagementClient(resolveAzureCredential(ctx), subscriptionId)
}

export const createAzureSubscriptionClient = (ctx: CloudAdapterContext): SubscriptionClient =>
  new SubscriptionClient(resolveAzureCredential(ctx))
