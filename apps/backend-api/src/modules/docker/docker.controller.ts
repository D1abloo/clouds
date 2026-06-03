import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { DockerService } from './docker.service'

@ApiTags('Docker')
@ApiBearerAuth()
@Controller('docker')
export class DockerController {
  constructor(private readonly service: DockerService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Docker platform overview' })
  overview() {
    return this.service.getOverview()
  }

  @Get('hosts')
  @ApiOperation({ summary: 'List Docker hosts' })
  hosts() {
    return this.service.getHosts()
  }

  @Get('containers')
  @ApiOperation({ summary: 'List Docker containers' })
  containers(@Query('hostId') hostId?: string) {
    return this.service.getContainers(hostId)
  }

  @Get('images')
  @ApiOperation({ summary: 'List Docker images' })
  images() {
    return this.service.getImages()
  }

  @Get('networks')
  @ApiOperation({ summary: 'List Docker networks' })
  networks() {
    return this.service.getNetworks()
  }

  @Get('volumes')
  @ApiOperation({ summary: 'List Docker volumes' })
  volumes() {
    return this.service.getVolumes()
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Docker resource metrics' })
  metrics() {
    return this.service.getMetrics()
  }
}
