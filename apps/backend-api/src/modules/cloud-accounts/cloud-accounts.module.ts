import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { BillingModule } from '../billing/billing.module'
import { CloudAccountsController } from './cloud-accounts.controller'
import { CloudAccountsService } from './cloud-accounts.service'
import { AwsAdapterService } from './adapters/aws.adapter.service'
import { GcpAdapterService } from './adapters/gcp.adapter.service'
import { AzureAdapterService } from './adapters/azure.adapter.service'
import { SecretsVaultService } from './secrets-vault.service'
import { CloudAdapterContextLoader } from './cloud-adapter.context'
import { CloudAdapterRegistry } from './cloud-adapter.registry'
import { CloudSyncService } from './cloud-sync.service'
import { InstanceSyncWorker } from './instance-sync.worker'
import { MetricsSyncWorker } from './metrics-sync.worker'
import { BillingSyncWorker } from './billing-sync.worker'

@Module({
  imports: [AuditModule, RealtimeModule, BillingModule],
  controllers: [CloudAccountsController],
  providers: [
    CloudAccountsService,
    SecretsVaultService,
    CloudAdapterContextLoader,
    CloudAdapterRegistry,
    CloudSyncService,
    InstanceSyncWorker,
    MetricsSyncWorker,
    BillingSyncWorker,
    AwsAdapterService,
    GcpAdapterService,
    AzureAdapterService,
  ],
  exports: [
    CloudAccountsService,
    CloudAdapterRegistry,
    CloudSyncService,
    AwsAdapterService,
    GcpAdapterService,
    AzureAdapterService,
  ],
})
export class CloudAccountsModule {}
