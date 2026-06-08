import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CloudProvider } from '@prisma/client'
import { CloudAccountsService } from './cloud-accounts.service'
import { CreateCloudAccountDto } from './dto/create-cloud-account.dto'
import { LaunchInstanceDto } from './dto/launch-instance.dto'
import { InstanceSyncWorker } from './instance-sync.worker'
import { MetricsSyncWorker } from './metrics-sync.worker'
import { BillingSyncWorker } from './billing-sync.worker'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('Cloud Accounts')
@ApiBearerAuth()
@Controller('cloud-accounts')
export class CloudAccountsController {
  constructor(
    private service: CloudAccountsService,
    private instanceSync: InstanceSyncWorker,
    private metricsSync: MetricsSyncWorker,
    private billingSync: BillingSyncWorker,
  ) {}

  @Get('meta/default-project')
  @ApiOperation({ summary: 'Default project for new accounts' })
  defaultProject() {
    return this.service.getDefaultProject()
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
  findAll(@Query('projectId') projectId?: string, @Query('provider') provider?: CloudProvider) {
    return this.service.findAll(projectId, provider)
  }

  @Post('sync-all')
  @ApiOperation({ summary: 'Sync all active cloud accounts' })
  syncAll() {
    return this.instanceSync.syncAllActive()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cloud account detail' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate cloud connection' })
  validate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.validateConnection(id, user.sub)
  }

  @Get(':id/instances')
  @ApiOperation({ summary: 'List instances for cloud account' })
  listInstances(@Param('id') id: string, @Query('region') region?: string) {
    return this.service.listAccountInstances(id, region)
  }

  @Get(':id/regions')
  @ApiOperation({ summary: 'List regions for cloud account' })
  listRegions(@Param('id') id: string) {
    return this.service.listRegions(id)
  }

  @Get(':id/networks')
  @ApiOperation({ summary: 'List VPCs/subnets for cloud account' })
  listNetworks(@Param('id') id: string, @Query('region') region?: string) {
    return this.service.listNetworks(id, region)
  }

  @Get(':id/security-groups')
  @ApiOperation({ summary: 'List security groups / firewalls / NSGs' })
  listSecurityGroups(@Param('id') id: string, @Query('region') region?: string) {
    return this.service.listSecurityGroups(id, region)
  }

  @Get(':id/images')
  @ApiOperation({ summary: 'List machine images / AMIs' })
  listImages(@Param('id') id: string, @Query('region') region?: string) {
    return this.service.listImages(id, region ?? '')
  }

  @Get(':id/instance-types')
  @ApiOperation({ summary: 'List instance types / sizes' })
  listInstanceTypes(@Param('id') id: string, @Query('region') region?: string) {
    return this.service.listInstanceTypes(id, region ?? '')
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Full inventory sync (regions, networks, instances)' })
  sync(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.syncInventory(id, user.sub)
  }

  @Post(':id/instances')
  @ApiOperation({ summary: 'Launch new instance in cloud account' })
  launch(@Param('id') id: string, @Body() dto: LaunchInstanceDto, @CurrentUser() user: JwtPayload) {
    return this.service.launchInstance(id, dto, user.sub)
  }

  @Post(':id/sync-metrics')
  syncMetrics(@Param('id') id: string) {
    return this.metricsSync.syncAccountMetrics(id)
  }

  @Post(':id/sync-billing')
  async syncBilling(@Param('id') id: string) {
    const provider = await this.service.getProvider(id)
    return this.billingSync.syncForAccount(provider, id)
  }
}
