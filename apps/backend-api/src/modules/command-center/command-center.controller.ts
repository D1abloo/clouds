import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'
import { CommandCenterService } from './command-center.service'
import { ExecuteActionDto } from './dto/execute-action.dto'

@ApiTags('Command Center')
@ApiBearerAuth()
@Controller('command-center')
export class CommandCenterController {
  constructor(private readonly service: CommandCenterService) {}

  @Post('actions/execute')
  @ApiOperation({ summary: 'Execute a command-center operational action' })
  execute(@Body() dto: ExecuteActionDto, @CurrentUser() user: JwtPayload) {
    return this.service.execute(dto, user.sub)
  }

  @Get('actions/recent')
  @ApiOperation({ summary: 'Recent command-center actions from audit log' })
  recent(@Query('limit') limit?: string) {
    return this.service.recentActions(limit ? +limit : 20)
  }
}
