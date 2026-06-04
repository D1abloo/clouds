import { Module, forwardRef } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { GithubController } from './github.controller'
import { GithubService } from './github.service'

@Module({
  imports: [AuditModule, forwardRef(() => RealtimeModule)],
  controllers: [GithubController],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
