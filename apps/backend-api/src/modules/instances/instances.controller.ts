import { Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CloudProvider } from '@prisma/client'
import { InstancesService } from './instances.service'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('Instances')
@ApiBearerAuth()
@Controller('instances')
export class InstancesController {
  constructor(private service: InstancesService) {}

  @Get()
  @ApiOperation({ summary: 'List instances grouped by provider/account/region' })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('provider') provider?: CloudProvider,
    @Query('cloudAccountId') cloudAccountId?: string,
    @Query('region') region?: string,
  ) {
    return this.service.findAll({ projectId, provider, cloudAccountId, region })
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post(':id/start')
  start(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.start(id, user.sub)
  }

  @Post(':id/stop')
  stop(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.stop(id, user.sub)
  }

  @Post(':id/restart')
  restart(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.restart(id, user.sub)
  }
}
