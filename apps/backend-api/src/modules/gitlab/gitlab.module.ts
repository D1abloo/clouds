import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { CloudAccountsModule } from '../cloud-accounts/cloud-accounts.module'
import { GitlabController } from './gitlab.controller'
import { GitlabAccountsService } from './gitlab-accounts.service'
import { GitlabApiClient } from './gitlab-api.client'

@Module({
  imports: [AuditModule, NotificationsModule, CloudAccountsModule],
  controllers: [GitlabController],
  providers: [GitlabAccountsService, GitlabApiClient],
  exports: [GitlabAccountsService],
})
export class GitlabModule {}
