import { Module } from '@nestjs/common'
import { OrganizationScopeModule } from '../../common/organization/organization-scope.module'
import { CloudAccountsModule } from '../cloud-accounts/cloud-accounts.module'
import { CopilotActionsService } from './copilot-actions.service'
import { CopilotContextService } from './copilot-context.service'
import { CopilotController } from './copilot.controller'
import { CopilotLlmService } from './copilot-llm.service'
import { CopilotSettingsService } from './copilot-settings.service'
import { CopilotService } from './copilot.service'

@Module({
  imports: [OrganizationScopeModule, CloudAccountsModule],
  controllers: [CopilotController],
  providers: [
    CopilotSettingsService,
    CopilotContextService,
    CopilotLlmService,
    CopilotActionsService,
    CopilotService,
  ],
  exports: [CopilotService, CopilotSettingsService],
})
export class CopilotModule {}
