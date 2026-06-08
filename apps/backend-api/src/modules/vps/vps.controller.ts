import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { VpsService } from './vps.service'
import { CreateVpsDto, ExecuteCommandDto } from './dto/create-vps.dto'
import { ValidateVpsPreviewDto } from './dto/validate-vps-preview.dto'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('VPS')
@ApiBearerAuth()
@Controller('vps')
export class VpsController {
  constructor(private service: VpsService) {}

  @Post('validate-preview')
  @ApiOperation({ summary: 'Validate VPS SSH connection before saving' })
  validatePreview(@Body() dto: ValidateVpsPreviewDto, @CurrentUser() user: JwtPayload) {
    return this.service.validatePreview(dto, user.sub)
  }

  @Post()
  create(@Body() dto: CreateVpsDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub)
  }

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    return this.service.findAll(projectId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post(':id/validate')
  validate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.validateConnection(id, user.sub)
  }

  @Post(':id/execute')
  execute(@Param('id') id: string, @Body() dto: ExecuteCommandDto, @CurrentUser() user: JwtPayload) {
    return this.service.executeCommand(id, dto.command, user.sub, dto.confirmed)
  }

  @Get(':id/commands')
  history(@Param('id') id: string) {
    return this.service.getCommandHistory(id)
  }
}
