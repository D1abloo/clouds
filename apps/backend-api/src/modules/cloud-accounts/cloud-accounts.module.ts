import { Module } from '@nestjs/common'
import { CloudAccountsService } from './cloud-accounts.service'
import { CloudAccountsController } from './cloud-accounts.controller'
import { AwsAdapterService } from './adapters/aws.adapter.service'
import { GcpAdapterService } from './adapters/gcp.adapter.service'
import { AzureAdapterService } from './adapters/azure.adapter.service'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [AuditModule],
  controllers: [CloudAccountsController],
  providers: [CloudAccountsService, AwsAdapterService, GcpAdapterService, AzureAdapterService],
  exports: [CloudAccountsService, AwsAdapterService, GcpAdapterService, AzureAdapterService],
})
export class CloudAccountsModule {}
