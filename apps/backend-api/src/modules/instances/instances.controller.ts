import { Controller, ForbiddenException, Get, Param, Post, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CloudProvider } from '@prisma/client'
import { InstancesService } from './instances.service'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'
import { OrganizationScopeService } from '../../common/organization/organization-scope.service'

@ApiTags('Instances')
@ApiBearerAuth()
@Controller('instances')
export class InstancesController {
  constructor(
    private service: InstancesService,
    private orgScope: OrganizationScopeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all instances (cloud + VPS)' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('projectId') projectId?: string,
    @Query('provider') provider?: string,
    @Query('cloudAccountId') cloudAccountId?: string,
    @Query('region') region?: string,
  ) {
    const scope = await this.orgScope.resolveForUser(user.sub)
    const scoped = this.orgScope.projectFilter(scope, projectId)
    if (scoped === null) throw new ForbiddenException('Sin acceso a este espacio de trabajo')
    return this.service.findAll({
      projectId: scoped.projectId,
      projectIds: scoped.projectIds,
      provider,
      cloudAccountId,
      region,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get instance by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post(':id/discover')
  @ApiOperation({ summary: 'Discover Docker/Kubernetes on instance host' })
  discover(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.discover(id, user.sub)
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start instance' })
  start(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.start(id, user.sub)
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop instance' })
  stop(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.stop(id, user.sub)
  }

  @Post(':id/restart')
  @ApiOperation({ summary: 'Restart instance' })
  restart(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.restart(id, user.sub)
  }
}
