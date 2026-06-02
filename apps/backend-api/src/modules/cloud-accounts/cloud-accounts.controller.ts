import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CloudAccountsService } from './cloud-accounts.service'
import { CreateCloudAccountDto } from './dto/create-cloud-account.dto'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('Cloud Accounts')
@ApiBearerAuth()
@Controller('cloud-accounts')
export class CloudAccountsController {
  constructor(private service: CloudAccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Add cloud account' })
  create(@Body() dto: CreateCloudAccountDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub)
  }

  @Get()
  @ApiOperation({ summary: 'List cloud accounts' })
  findAll(@Query('projectId') projectId?: string) {
    return this.service.findAll(projectId)
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate cloud connection' })
  validate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.validateConnection(id, user.sub)
  }

  @Get(':id/regions')
  @ApiOperation({ summary: 'List regions for account' })
  listRegions(@Param('id') id: string) {
    return this.service.listRegions(id)
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync instance inventory' })
  sync(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.syncInventory(id, user.sub)
  }
}
