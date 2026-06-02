import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { MetricsService } from './metrics.service'

@ApiTags('Metrics')
@ApiBearerAuth()
@Controller('metrics')
export class MetricsController {
  constructor(private service: MetricsService) {}

  @Get('dashboard')
  dashboard() {
    return this.service.getDashboardStats()
  }

  @Get(':resourceId')
  getSamples(@Param('resourceId') resourceId: string, @Query('type') type?: string) {
    return this.service.getSamples(resourceId, type)
  }
}
