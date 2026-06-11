import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CloudProvider } from '@prisma/client'
import { CloudAccountsService } from './cloud-accounts.service'
import { CreateCloudAccountDto } from './dto/create-cloud-account.dto'
import { LaunchInstanceDto } from './dto/launch-instance.dto'
import { InstanceSyncWorker } from './instance-sync.worker'
import { MetricsSyncWorker } from './metrics-sync.worker'
import { BillingSyncWorker } from './billing-sync.worker'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'
import { OrganizationScopeService } from '../../common/organization/organization-scope.service'

@ApiTags('Cloud Accounts')
@ApiBearerAuth()
@Controller('cloud-accounts')
export class CloudAccountsController {
  constructor(
    private service: CloudAccountsService,
    private instanceSync: InstanceSyncWorker,
    private metricsSync: MetricsSyncWorker,
    private billingSync: BillingSyncWorker,
    private orgScope: OrganizationScopeService,
  ) {}

  @Get('meta/default-project')
  @ApiOperation({ summary: 'Default project for new accounts' })
  defaultProject(@CurrentUser() user: JwtPayload) {
    return this.service.getDefaultProject(user.sub)
  }

  @Post('validate-preview')
  @ApiOperation({ summary: 'Validate cloud credentials before saving' })
  validatePreview(@Body() dto: CreateCloudAccountDto, @CurrentUser() user: JwtPayload) {
    return this.service.validatePreview(dto, user.sub)
  }

  @Post()
  @ApiOperation({ summary: 'Add cloud account with encrypted credentials' })
  create(@Body() dto: CreateCloudAccountDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub)
  }

  @Get()
  @ApiOperation({ summary: 'List cloud accounts' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('projectId') projectId?: string,
    @Query('provider') provider?: CloudProvider,
  ) {
    const scoped = await this.orgScope.resolveProjectScopeOrThrow(user.sub, projectId)
    return this.service.findAll({
      projectId: scoped.projectId,
      projectIds: scoped.projectIds,
      provider,
    })
  }

  @Post('sync-all')
  @ApiOperation({ summary: 'Sync all active cloud accounts in user workspace' })
  async syncAll(@CurrentUser() user: JwtPayload) {
    const scope = await this.orgScope.resolveForUser(user.sub)
    return this.instanceSync.syncAllActive(scope.projectIds)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cloud account detail' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user.sub)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete cloud account and linked instances' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user.sub)
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate cloud connection' })
  validate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.validateConnection(id, user.sub)
  }

  @Get(':id/instances')
  @ApiOperation({ summary: 'List instances for cloud account' })
  listInstances(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('region') region?: string,
  ) {
    return this.service.listAccountInstances(id, region, user.sub)
  }

  @Get(':id/regions')
  @ApiOperation({ summary: 'List regions for cloud account' })
  listRegions(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.listRegions(id, user.sub)
  }

  @Get(':id/networks')
  @ApiOperation({ summary: 'List VPCs/subnets for cloud account' })
  listNetworks(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('region') region?: string,
  ) {
    return this.service.listNetworks(id, region, user.sub)
  }

  @Get(':id/security-groups')
  @ApiOperation({ summary: 'List security groups / firewalls / NSGs' })
  listSecurityGroups(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('region') region?: string,
  ) {
    return this.service.listSecurityGroups(id, region, user.sub)
  }

  @Get(':id/images')
  @ApiOperation({ summary: 'List machine images / AMIs' })
  listImages(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('region') region?: string,
  ) {
    return this.service.listImages(id, region ?? '', user.sub)
  }

  @Get(':id/instance-types')
  @ApiOperation({ summary: 'List instance types / sizes' })
  listInstanceTypes(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('region') region?: string,
  ) {
    return this.service.listInstanceTypes(id, region ?? '', user.sub)
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Full inventory sync (regions, networks, instances)' })
  sync(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.syncInventory(id, user.sub)
  }

  @Post(':id/instances')
  @ApiOperation({ summary: 'Launch new instance in cloud account' })
  launch(
    @Param('id') id: string,
    @Body() dto: LaunchInstanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.launchInstance(id, dto, user.sub)
  }

  @Post(':id/sync-metrics')
  syncMetrics(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user.sub).then(() => this.metricsSync.syncAccountMetrics(id))
  }

  @Post(':id/sync-billing')
  async syncBilling(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const provider = await this.service.getProvider(id, user.sub)
    return this.billingSync.syncForAccount(provider, id, user.sub)
  }
}
