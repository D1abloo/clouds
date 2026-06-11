import { Module, forwardRef } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { IntegrationsModule } from '../integrations/integrations.module'
import { CloudAccountsModule } from '../cloud-accounts/cloud-accounts.module'
import { GithubController } from './github.controller'
import { GithubAccountsService } from './github-accounts.service'
import { GithubRepositoriesService } from './github-repositories.service'
import { GithubBranchesService } from './github-branches.service'
import { GithubCommitsService } from './github-commits.service'
import { GithubPullRequestsService } from './github-pull-requests.service'
import { GithubWebhooksService } from './github-webhooks.service'
import { GithubDeploymentsService } from './github-deployments.service'
import { GithubSummaryService } from './github-summary.service'
import { GithubApiClient } from './github-api.client'
import { GithubRepoResourcesService } from './github-repo-resources.service'
import { GithubOAuthService } from './github-oauth.service'
import { GithubWorkflowsService } from './github-workflows.service'
import { OrganizationScopeModule } from '../../common/organization/organization-scope.module'
import { RepoOAuthModule } from '../../common/oauth/repo-oauth.module'

@Module({
  imports: [
    RepoOAuthModule,
    AuditModule,
    NotificationsModule,
    IntegrationsModule,
    CloudAccountsModule,
    OrganizationScopeModule,
    forwardRef(() => RealtimeModule),
  ],
  controllers: [GithubController],
  providers: [
    GithubOAuthService,
    GithubApiClient,
    GithubRepoResourcesService,
    GithubAccountsService,
    GithubRepositoriesService,
    GithubBranchesService,
    GithubCommitsService,
    GithubPullRequestsService,
    GithubWebhooksService,
    GithubDeploymentsService,
    GithubWorkflowsService,
    GithubSummaryService,
  ],
  exports: [GithubOAuthService, GithubSummaryService, GithubAccountsService],
})
export class GithubModule {}
