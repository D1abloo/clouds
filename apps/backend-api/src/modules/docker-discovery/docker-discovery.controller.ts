import { Controller, Post, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { DockerDiscoveryService } from './docker-discovery.service'

@ApiTags('Docker Discovery')
@ApiBearerAuth()
@Controller('discovery/docker')
export class DockerDiscoveryController {
  constructor(private service: DockerDiscoveryService) {}

  @Post(':hostRef')
  @ApiOperation({ summary: 'Discover Docker on host' })
  discover(@Param('hostRef') hostRef: string) {
    return this.service.discover(hostRef)
  }
}
