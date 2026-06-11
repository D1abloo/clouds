import { Body, Controller, Get, Post, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'
import { CopilotSettingsService } from './copilot-settings.service'
import { CopilotService } from './copilot.service'
import { UpdateCopilotSettingsDto } from './dto/update-copilot-settings.dto'
import { CopilotChatDto } from './dto/copilot-chat.dto'
import { CreateCopilotTaskDto } from './dto/copilot-task.dto'
import { CopilotLlmService } from './copilot-llm.service'

@ApiTags('Copilot')
@ApiBearerAuth()
@Controller('copilot')
export class CopilotController {
  constructor(
    private readonly copilot: CopilotService,
    private readonly settings: CopilotSettingsService,
    private readonly llm: CopilotLlmService,
  ) {}

  @Get('status')
  status(@CurrentUser() user: JwtPayload) {
    return this.copilot.getStatus(user.sub)
  }

  @Get('settings')
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.settings.getSettingsForUser(user.sub)
  }

  @Put('settings')
  updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateCopilotSettingsDto) {
    return this.settings.updateSettings(user.sub, dto)
  }

  @Post('settings/test')
  async testSettings(@CurrentUser() user: JwtPayload) {
    const organizationId = await this.settings.assertOrgAdmin(user.sub)
    const row = await this.settings.getSettingsRow(organizationId)
    return this.llm.testConnection(organizationId, row)
  }

  @Post('chat')
  chat(@CurrentUser() user: JwtPayload, @Body() dto: CopilotChatDto) {
    return this.copilot.chat(user.sub, dto)
  }

  @Post('tasks')
  createTask(@CurrentUser() user: JwtPayload, @Body() dto: CreateCopilotTaskDto) {
    return this.copilot.createAutonomousTask(user.sub, dto.prompt)
  }

  @Get('tasks')
  listTasks(@CurrentUser() user: JwtPayload) {
    return this.copilot.listTasks(user.sub)
  }
}
