import { Module } from '@nestjs/common'
import { VpsService } from './vps.service'
import { VpsController } from './vps.controller'
import { AuditModule } from '../audit/audit.module'
import { IntegrationsModule } from '../integrations/integrations.module'
import { CloudAccountsModule } from '../cloud-accounts/cloud-accounts.module'

@Module({
  imports: [AuditModule, IntegrationsModule, CloudAccountsModule],
  controllers: [VpsController],
  providers: [VpsService],
  exports: [VpsService],
})
export class VpsModule {}
