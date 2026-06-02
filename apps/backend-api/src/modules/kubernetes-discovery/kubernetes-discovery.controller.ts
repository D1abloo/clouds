import { Controller, Post, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { KubernetesDiscoveryService, SystemDiscoveryService } from './kubernetes-discovery.service'

@ApiTags('Kubernetes Discovery')
@ApiBearerAuth()
@Controller('discovery')
export class KubernetesDiscoveryController {
  constructor(
    private k8sService: KubernetesDiscoveryService,
    private systemService: SystemDiscoveryService,
  ) {}

  @Post('kubernetes/:hostRef')
  @ApiOperation({ summary: 'Discover Kubernetes on host' })
  discoverK8s(@Param('hostRef') hostRef: string) {
    return this.k8sService.discover(hostRef)
  }

  @Post('system/:hostRef')
  @ApiOperation({ summary: 'Full system discovery (OS, services, ports, metrics)' })
  discoverSystem(@Param('hostRef') hostRef: string) {
    return this.systemService.discover(hostRef)
  }
}
