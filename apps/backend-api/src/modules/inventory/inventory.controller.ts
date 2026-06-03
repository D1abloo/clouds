import { Controller, Get, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CloudProvider } from '@prisma/client'
import { InventoryService } from './inventory.service'

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('dashboard')
  dashboard() {
    return this.service.dashboardOverview()
  }

  @Get('docker')
  docker() {
    return this.service.dockerSummary()
  }

  @Get('kubernetes')
  kubernetes() {
    return this.service.kubernetesSummary()
  }

  @Get('terraform')
  terraform() {
    return this.service.terraformSummary()
  }

  @Get('jenkins')
  jenkins() {
    return this.service.jenkinsSummary()
  }

  @Get('provider/:provider')
  provider(@Param('provider') provider: CloudProvider) {
    return this.service.providerSummary(provider)
  }
}
