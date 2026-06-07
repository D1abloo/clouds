import { Module, forwardRef } from '@nestjs/common'
import { TerraformService, TerraformRunnerService } from './terraform.service'
import { TerraformController } from './terraform.controller'
import { AuditModule } from '../audit/audit.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { IntegrationsModule } from '../integrations/integrations.module'

@Module({
  imports: [AuditModule, IntegrationsModule, forwardRef(() => RealtimeModule)],
  controllers: [TerraformController],
  providers: [TerraformService, TerraformRunnerService],
  exports: [TerraformService, TerraformRunnerService],
})
export class TerraformModule {}
