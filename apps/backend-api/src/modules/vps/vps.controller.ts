import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { VpsService } from './vps.service'
import { CreateVpsDto, ExecuteCommandDto } from './dto/create-vps.dto'
import { ValidateVpsPreviewDto } from './dto/validate-vps-preview.dto'
import { DetectOsPreviewDto, DetectRuntimeDto } from './dto/detect-runtime.dto'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'
import { OrganizationScopeService } from '../../common/organization/organization-scope.service'

@ApiTags('VPS')
@ApiBearerAuth()
@Controller('vps')
export class VpsController {
  constructor(
    private service: VpsService,
    private orgScope: OrganizationScopeService,
  ) {}

  @Post('validate-preview')
  @ApiOperation({ summary: 'Validate VPS SSH connection before saving' })
  validatePreview(@Body() dto: ValidateVpsPreviewDto, @CurrentUser() user: JwtPayload) {
    return this.service.validatePreview(dto, user.sub)
  }

  @Post('detect-os-preview')
  @ApiOperation({ summary: 'Detect OS family via SSH probe (preview)' })
  detectOsPreview(@Body() dto: DetectOsPreviewDto, @CurrentUser() user: JwtPayload) {
    return this.service.detectOsPreview(dto, user.sub)
  }

  @Post()
  async create(@Body() dto: CreateVpsDto, @CurrentUser() user: JwtPayload) {
    await this.orgScope.assertProjectInScope(user.sub, dto.projectId)
    return this.service.create(dto, user.sub)
  }

  @Get()
  async findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string) {
    const scoped = await this.orgScope.resolveProjectScopeOrThrow(user.sub, projectId)
    return this.service.findAll(scoped)
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const scope = await this.orgScope.resolveForUser(user.sub)
    return this.service.findOne(id, scope.projectIds)
  }

  @Post(':id/validate')
  async validate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const scope = await this.orgScope.resolveForUser(user.sub)
    return this.service.validateConnection(id, user.sub, scope.projectIds)
  }

  @Post(':id/detect-runtime')
  @ApiOperation({ summary: 'Probe Docker/Kubernetes runtimes on VPS host' })
  async detectRuntime(
    @Param('id') id: string,
    @Body() dto: DetectRuntimeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const scope = await this.orgScope.resolveForUser(user.sub)
    return this.service.detectRuntime(id, dto, user.sub, scope.projectIds)
  }

  @Post(':id/execute')
  async execute(@Param('id') id: string, @Body() dto: ExecuteCommandDto, @CurrentUser() user: JwtPayload) {
    const scope = await this.orgScope.resolveForUser(user.sub)
    return this.service.executeCommand(id, dto.command, user.sub, dto.confirmed, scope.projectIds)
  }

  @Get(':id/commands')
  async history(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const scope = await this.orgScope.resolveForUser(user.sub)
    return this.service.getCommandHistory(id, scope.projectIds)
  }
}
