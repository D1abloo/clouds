import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AlertSeverity } from '@prisma/client'
import { AlertsService } from './alerts.service'

@ApiTags('Alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(private service: AlertsService) {}

  @Get()
  listActive() {
    return this.service.listActiveAlerts()
  }

  @Get('rules')
  listRules() {
    return this.service.listRules()
  }

  @Post('rules')
  createRule(@Body() body: { name: string; condition: string; severity: AlertSeverity }) {
    return this.service.createRule(body)
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string) {
    return this.service.resolveAlert(id)
  }
}
