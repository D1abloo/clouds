import { Module, forwardRef } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { CloudAccountsModule } from '../cloud-accounts/cloud-accounts.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { GitlabController } from './gitlab.controller'
import { GitlabAccountsService } from './gitlab-accounts.service'
import { GitlabApiClient } from './gitlab-api.client'
import { GitlabResourcesService } from './gitlab-resources.service'
import { GitlabDeploymentsService } from './gitlab-deployments.service'
import { GitlabOAuthService } from './gitlab-oauth.service'
import { RepoOAuthModule } from '../../common/oauth/repo-oauth.module'

@Module({
  imports: [RepoOAuthModule, AuditModule, NotificationsModule, CloudAccountsModule, forwardRef(() => RealtimeModule)],
  controllers: [GitlabController],
  providers: [GitlabOAuthService, GitlabAccountsService, GitlabApiClient, GitlabResourcesService, GitlabDeploymentsService],
  exports: [GitlabOAuthService, GitlabAccountsService],
})
export class GitlabModule {}
