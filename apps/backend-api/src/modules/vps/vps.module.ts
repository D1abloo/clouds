import { Module } from '@nestjs/common'
import { VpsService } from './vps.service'
import { VpsController } from './vps.controller'
import { AuditModule } from '../audit/audit.module'
import { IntegrationsModule } from '../integrations/integrations.module'

@Module({
  imports: [AuditModule, IntegrationsModule],
  controllers: [VpsController],
  providers: [VpsService],
  exports: [VpsService],
})
export class VpsModule {}
