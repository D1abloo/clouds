import { Module } from '@nestjs/common'
import { InstancesService } from './instances.service'
import { InstancesController } from './instances.controller'
import { CloudAccountsModule } from '../cloud-accounts/cloud-accounts.module'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [CloudAccountsModule, AuditModule],
  controllers: [InstancesController],
  providers: [InstancesService],
  exports: [InstancesService],
})
export class InstancesModule {}
