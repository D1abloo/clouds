import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'
import { IntegrationsService } from './integrations.service'
import { PLATFORM_EVENT_SOURCES } from './integrations.platform-events'
import { UpdateIntegrationDto } from './dto/update-integration.dto'
import { DispatchIntegrationEventDto } from './dto/dispatch-integration-event.dto'

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get('status')
  getStatus() {
    return this.service.getStatus()
  }

  @Get('sources')
  listSources() {
    return { sources: PLATFORM_EVENT_SOURCES }
  }

  @Get()
  list() {
    return this.service.list()
  }

  @Get('deliveries')
  listDeliveries(
    @Query('limit') limit?: string,
    @Query('integrationId') integrationId?: string,
  ) {
    return this.service.listDeliveries(limit ? parseInt(limit, 10) : 30, integrationId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateIntegrationDto, @CurrentUser() user: JwtPayload) {
    return this.service.update(id, body, user.sub)
  }

  @Post(':id/test')
  test(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.testConnection(id, user.sub)
  }

  @Post(':id/disconnect')
  disconnect(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.disconnect(id, user.sub)
  }

  @Post('dispatch')
  dispatch(@Body() body: DispatchIntegrationEventDto, @CurrentUser() user: JwtPayload) {
    return this.service.dispatch(body, user.sub)
  }
}
