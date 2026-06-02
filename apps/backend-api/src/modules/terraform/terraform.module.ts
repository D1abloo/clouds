import { Module, forwardRef } from '@nestjs/common'
import { TerraformService, TerraformRunnerService } from './terraform.service'
import { TerraformController } from './terraform.controller'
import { AuditModule } from '../audit/audit.module'
import { RealtimeModule } from '../realtime/realtime.module'

@Module({
  imports: [AuditModule, forwardRef(() => RealtimeModule)],
  controllers: [TerraformController],
  providers: [TerraformService, TerraformRunnerService],
  exports: [TerraformService],
})
export class TerraformModule {}
