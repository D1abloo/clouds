import { Module, forwardRef } from '@nestjs/common'
import { JenkinsService } from './jenkins.service'
import { JenkinsController } from './jenkins.controller'
import { AuditModule } from '../audit/audit.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { IntegrationsModule } from '../integrations/integrations.module'

@Module({
  imports: [AuditModule, IntegrationsModule, forwardRef(() => RealtimeModule)],
  controllers: [JenkinsController],
  providers: [JenkinsService],
  exports: [JenkinsService],
})
export class JenkinsModule {}
